package com.airflix

import android.util.Log
import fi.iki.elonen.NanoHTTPD
import org.libtorrent4j.TorrentHandle
import org.libtorrent4j.Sha1Hash
import org.libtorrent4j.Priority
import java.io.File
import java.io.InputStream
import java.io.RandomAccessFile

class TorrentStreamServer : NanoHTTPD(0) {

    companion object {
        private const val TAG = "TorrentStreamServer"
        private const val PIECE_WAIT_INTERVAL_MS = 100L
        private const val PIECE_WAIT_MAX_ITERATIONS = 600 // 60 seconds
        private const val INITIAL_PIECE_WAIT_MAX = 300 // 30 seconds for initial response
    }

    var sessionManager: org.libtorrent4j.SessionManager? = null

    private data class TorrentEntry(val saveDir: File)
    private val torrents = mutableMapOf<String, TorrentEntry>()

    fun registerTorrent(infoHash: String, saveDir: File) {
        torrents[infoHash] = TorrentEntry(saveDir)
        Log.d(TAG, "Registered torrent $infoHash, saveDir=$saveDir")
    }

    fun unregisterTorrent(infoHash: String) {
        torrents.remove(infoHash)
    }

    private fun freshHandle(infoHash: String): TorrentHandle? {
        return try {
            sessionManager?.find(Sha1Hash.parseHex(infoHash))?.takeIf { it.isValid }
        } catch (e: Exception) {
            Log.w(TAG, "freshHandle($infoHash) failed: ${e.message}")
            null
        }
    }

    private fun waitForPieceAvailable(infoHash: String, pieceIndex: Int, maxWait: Int = PIECE_WAIT_MAX_ITERATIONS): Boolean {
        var waitCount = 0
        while (waitCount < maxWait) {
            val th = freshHandle(infoHash) ?: return false
            try {
                if (th.havePiece(pieceIndex)) return true
                if (waitCount == 0) {
                    th.piecePriority(pieceIndex, Priority.TOP_PRIORITY)
                    th.setPieceDeadline(pieceIndex, 1000)
                }
            } catch (e: Exception) {
                Log.w(TAG, "waitForPiece error: ${e.message}")
                return false
            }
            Thread.sleep(PIECE_WAIT_INTERVAL_MS)
            waitCount++
        }
        return false
    }

    private fun prefetchNextPieces(infoHash: String, currentPiece: Int, count: Int = 3) {
        try {
            val th = freshHandle(infoHash) ?: return
            val numPieces = th.torrentFile()?.numPieces() ?: return
            for (i in 1..count) {
                val next = currentPiece + i
                if (next < numPieces && !th.havePiece(next)) {
                    th.piecePriority(next, Priority.SIX)
                    th.setPieceDeadline(next, 3000 + i * 2000)
                }
            }
        } catch (_: Exception) {}
    }

    override fun serve(session: IHTTPSession): Response {
        val uri = session.uri
        Log.d(TAG, "Request: $uri, headers: ${session.headers["range"] ?: "no-range"}")

        val parts = uri.trimStart('/').split("/")
        if (parts.size < 3 || parts[0] != "stream") {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, MIME_PLAINTEXT, "Not found")
        }

        val infoHash = parts[1]
        val fileIndex = parts[2].toIntOrNull() ?: 0

        val entry = torrents[infoHash]
        if (entry == null) {
            Log.w(TAG, "Torrent $infoHash not registered")
            return newFixedLengthResponse(Response.Status.NOT_FOUND, MIME_PLAINTEXT, "Torrent not found")
        }

        val th = freshHandle(infoHash)
        if (th == null) {
            Log.w(TAG, "No valid handle for $infoHash")
            return newFixedLengthResponse(Response.Status.SERVICE_UNAVAILABLE, MIME_PLAINTEXT, "Torrent not ready")
        }

        val status = try { th.status() } catch (e: Exception) {
            return newFixedLengthResponse(Response.Status.SERVICE_UNAVAILABLE, MIME_PLAINTEXT, "Handle error")
        }

        if (!status.hasMetadata()) {
            Log.w(TAG, "No metadata for $infoHash")
            return newFixedLengthResponse(Response.Status.SERVICE_UNAVAILABLE, MIME_PLAINTEXT, "No metadata yet")
        }

        val ti = try { th.torrentFile() } catch (e: Exception) {
            return newFixedLengthResponse(Response.Status.SERVICE_UNAVAILABLE, MIME_PLAINTEXT, "Metadata error")
        }

        val fs = ti.files()
        if (fileIndex >= fs.numFiles()) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, MIME_PLAINTEXT, "File index out of range")
        }

        val filePath = fs.filePath(fileIndex)
        val file = File(entry.saveDir, filePath)
        val fileSize = fs.fileSize(fileIndex)
        val fileOffset = fs.fileOffset(fileIndex)
        val pieceLength = ti.pieceLength().toLong()
        val mimeType = guessMimeType(filePath)

        val rangeHeader = session.headers["range"]
        val requestedRange = parseRange(rangeHeader, fileSize)
        if (requestedRange == null && rangeHeader != null) {
            return newFixedLengthResponse(
                Response.Status.RANGE_NOT_SATISFIABLE,
                MIME_PLAINTEXT,
                "Invalid range"
            ).apply {
                addHeader("Content-Range", "bytes */$fileSize")
            }
        }
        val start = requestedRange?.first ?: 0L
        val end = requestedRange?.last ?: (fileSize - 1L)

        val contentLength = end - start + 1
        val startPiece = ((fileOffset + start) / pieceLength).toInt()

        Log.d(TAG, "Serving $infoHash file=$fileIndex range=$start-$end (piece $startPiece, pieceLen=$pieceLength)")

        if (!waitForPieceAvailable(infoHash, startPiece, INITIAL_PIECE_WAIT_MAX)) {
            Log.e(TAG, "Timeout waiting for initial piece $startPiece")
            return newFixedLengthResponse(Response.Status.SERVICE_UNAVAILABLE, MIME_PLAINTEXT, "Piece not available yet")
        }

        // Wait for file to appear on disk
        var fileWait = 0
        while (!file.exists() && fileWait < 100) {
            Thread.sleep(100)
            fileWait++
        }
        if (!file.exists()) {
            Log.e(TAG, "File still doesn't exist after waiting: ${file.absolutePath}")
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, MIME_PLAINTEXT, "File not ready")
        }

        val raf = try {
            RandomAccessFile(file, "r")
        } catch (e: Exception) {
            Log.e(TAG, "Cannot open file: ${e.message}")
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, MIME_PLAINTEXT, "File error: ${e.message}")
        }

        try { raf.seek(start) } catch (e: Exception) {
            raf.close()
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, MIME_PLAINTEXT, "Seek error")
        }

        prefetchNextPieces(infoHash, startPiece)

        val inputStream = TorrentInputStream(raf, infoHash, fileOffset, pieceLength, start, contentLength)

        val response = newFixedLengthResponse(
            if (requestedRange != null) Response.Status.PARTIAL_CONTENT else Response.Status.OK,
            mimeType,
            inputStream,
            contentLength
        )
        if (requestedRange != null) {
            response.addHeader("Content-Range", "bytes $start-$end/$fileSize")
        }
        response.addHeader("Accept-Ranges", "bytes")
        response.addHeader("Content-Length", contentLength.toString())
        response.addHeader("Connection", "keep-alive")

        Log.d(TAG, "Response ready: 206, Content-Length=$contentLength, Content-Range=bytes $start-$end/$fileSize")
        return response
    }

    private fun parseRange(rangeHeader: String?, fileSize: Long): LongRange? {
        if (rangeHeader == null) return null
        if (!rangeHeader.startsWith("bytes=") || fileSize <= 0L) return null

        val value = rangeHeader.removePrefix("bytes=").substringBefore(',').trim()
        val separator = value.indexOf('-')
        if (separator < 0) return null

        val startValue = value.substring(0, separator).trim()
        val endValue = value.substring(separator + 1).trim()

        if (startValue.isEmpty()) {
            val suffixLength = endValue.toLongOrNull()?.takeIf { it > 0L } ?: return null
            val start = maxOf(0L, fileSize - suffixLength)
            return start..(fileSize - 1L)
        }

        val start = startValue.toLongOrNull()?.takeIf { it >= 0L && it < fileSize }
            ?: return null
        val end = if (endValue.isEmpty()) {
            fileSize - 1L
        } else {
            minOf(endValue.toLongOrNull() ?: return null, fileSize - 1L)
        }
        if (end < start) return null
        return start..end
    }

    private inner class TorrentInputStream(
        private val raf: RandomAccessFile,
        private val infoHash: String,
        private val fileOffset: Long,
        private val pieceLength: Long,
        startPos: Long,
        totalLength: Long
    ) : InputStream() {

        private var remaining = totalLength
        private var currentPos = startPos

        @Throws(java.io.IOException::class)
        private fun ensurePieceReady() {
            val absoluteOffset = fileOffset + currentPos
            val pieceIndex = (absoluteOffset / pieceLength).toInt()

            if (!waitForPieceAvailable(infoHash, pieceIndex, PIECE_WAIT_MAX_ITERATIONS)) {
                throw java.io.IOException("Timeout waiting for piece $pieceIndex (pos=$currentPos)")
            }

            prefetchNextPieces(infoHash, pieceIndex)
        }

        override fun read(): Int {
            if (remaining <= 0) return -1
            ensurePieceReady()
            val r = try { raf.read() } catch (e: Exception) { -1 }
            if (r != -1) {
                remaining--
                currentPos++
            }
            return r
        }

        override fun read(b: ByteArray, off: Int, len: Int): Int {
            if (remaining <= 0) return -1
            ensurePieceReady()

            val absoluteOffset = fileOffset + currentPos
            val currentPieceStart = (absoluteOffset / pieceLength) * pieceLength
            val bytesLeftInPiece = pieceLength - (absoluteOffset - currentPieceStart)

            val toRead = minOf(len.toLong(), remaining, bytesLeftInPiece).toInt()
            if (toRead <= 0) return 0

            val r = try { raf.read(b, off, toRead) } catch (e: Exception) {
                Log.e(TAG, "RAF read error at pos=$currentPos: ${e.message}")
                -1
            }
            if (r > 0) {
                remaining -= r
                currentPos += r
            }
            return r
        }

        override fun close() {
            try { raf.close() } catch (_: Exception) {}
        }
    }

    private fun guessMimeType(path: String): String {
        val lower = path.lowercase()
        return when {
            lower.endsWith(".mp4") -> "video/mp4"
            lower.endsWith(".mkv") -> "video/x-matroska"
            lower.endsWith(".avi") -> "video/x-msvideo"
            lower.endsWith(".webm") -> "video/webm"
            lower.endsWith(".mov") -> "video/quicktime"
            lower.endsWith(".ts") -> "video/mp2t"
            lower.endsWith(".flv") -> "video/x-flv"
            lower.endsWith(".wmv") -> "video/x-ms-wmv"
            lower.endsWith(".m4v") -> "video/mp4"
            lower.endsWith(".srt") -> "text/plain"
            lower.endsWith(".ass") || lower.endsWith(".ssa") -> "text/plain"
            else -> "application/octet-stream"
        }
    }
}
