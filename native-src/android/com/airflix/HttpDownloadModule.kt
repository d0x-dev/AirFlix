package com.airflix

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.Call
import okhttp3.Request
import okhttp3.Response
import java.io.EOFException
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.min

private class DownloadCancelledException : IOException("Download cancelled")

private data class HttpDownloadJob(
    val id: String,
    val url: String,
    val destinationUri: Uri,
    val headers: Map<String, String>,
    val completion: Promise,
) {
    @Volatile var cancelled = false
    @Volatile var userPaused = false
    @Volatile var call: Call? = null
    @Volatile var cancelPromise: Promise? = null
    @Volatile var deleteOnCancel = false
    val monitor = Object()
}

/**
 * Streams HTTP response bodies directly into an SAF document. The document is
 * intentionally kept when the network disappears or the process is stopped;
 * the next start reads its current size and resumes with a validated Range.
 */
class HttpDownloadModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        private const val PROGRESS_EVENT = "AirflixHttpDownloadProgress"
        private const val STATE_EVENT = "AirflixHttpDownloadState"
        private const val PROGRESS_INTERVAL_MS = 500L
        private const val INITIAL_RETRY_DELAY_MS = 1_000L
        private const val MAX_RETRY_DELAY_MS = 30_000L
        private const val BUFFER_SIZE = 512 * 1024

        private val jobs = ConcurrentHashMap<String, HttpDownloadJob>()
        private val executor = Executors.newCachedThreadPool()
    }

    private val metadata by lazy {
        reactContext.getSharedPreferences("airflix_http_downloads", Context.MODE_PRIVATE)
    }

    private val connectivityManager by lazy {
        reactContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    }

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            wakeJobsWhenNetworkReturns()
        }

        override fun onCapabilitiesChanged(
            network: Network,
            networkCapabilities: NetworkCapabilities,
        ) {
            if (hasUsableInternet(networkCapabilities)) {
                wakeJobsWhenNetworkReturns()
            } else {
                pauseJobsForNetworkLoss()
            }
        }

        override fun onLost(network: Network) {
            pauseJobsForNetworkLoss()
        }
    }

    init {
        runCatching { connectivityManager.registerDefaultNetworkCallback(networkCallback) }
    }

    private val client by lazy {
        OkHttpClientProvider.getOkHttpClient()
            .newBuilder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(0, TimeUnit.MILLISECONDS)
            .retryOnConnectionFailure(true)
            .build()
    }

    override fun getName(): String = "HttpDownloadModule"

    override fun invalidate() {
        runCatching { connectivityManager.unregisterNetworkCallback(networkCallback) }
        super.invalidate()
    }

    @ReactMethod
    fun start(
        downloadId: String,
        url: String,
        destinationUri: String,
        headers: ReadableMap?,
        promise: Promise,
    ) {
        if (jobs.containsKey(downloadId)) {
            promise.reject("DOWNLOAD_ACTIVE", "Download is already active")
            return
        }

        val job = HttpDownloadJob(
            id = downloadId,
            url = url,
            destinationUri = Uri.parse(destinationUri),
            headers = readableHeaders(headers),
            completion = promise,
        )
        jobs[downloadId] = job
        executor.execute { runJob(job) }
    }

    @ReactMethod
    fun pause(downloadId: String, promise: Promise) {
        val job = jobs[downloadId]
        if (job == null || job.cancelled) {
            promise.reject("DOWNLOAD_NOT_ACTIVE", "Download is not active")
            return
        }
        job.userPaused = true
        job.call?.cancel()
        emitState(job.id, "paused")
        promise.resolve(null)
    }

    @ReactMethod
    fun resume(downloadId: String, promise: Promise) {
        val job = jobs[downloadId]
        if (job == null || job.cancelled) {
            promise.reject("DOWNLOAD_NOT_ACTIVE", "Download is not active")
            return
        }
        synchronized(job.monitor) {
            job.userPaused = false
            job.monitor.notifyAll()
        }
        if (hasNetwork()) {
            emitState(job.id, "connecting")
        } else {
            emitState(job.id, "waitingForNetwork", "Waiting for network connection")
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun cancel(downloadId: String, deleteDestination: Boolean, promise: Promise) {
        val job = jobs[downloadId]
        if (job != null) {
            job.cancelPromise = promise
            job.deleteOnCancel = deleteDestination
            job.cancelled = true
            job.call?.cancel()
            synchronized(job.monitor) {
                job.userPaused = false
                job.monitor.notifyAll()
            }
        } else {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun getUriSize(uriString: String, promise: Promise) {
        try {
            reactContext.contentResolver.openFileDescriptor(Uri.parse(uriString), "r")?.use { pfd ->
                FileInputStream(pfd.fileDescriptor).channel.use { channel ->
                    promise.resolve(channel.size().toDouble())
                }
            } ?: throw IOException("Unable to open SAF document")
        } catch (error: Exception) {
            promise.reject("SAF_SIZE_FAILED", error.message, error)
        }
    }

    // Required by NativeEventEmitter.
    @ReactMethod fun addListener(eventName: String) = Unit
    @ReactMethod fun removeListeners(count: Double) = Unit

    private fun runJob(job: HttpDownloadJob) {
        var retryDelay = INITIAL_RETRY_DELAY_MS
        try {
            while (!job.cancelled) {
                waitWhilePaused(job)
                if (job.cancelled) throw DownloadCancelledException()

                if (!hasNetwork()) {
                    emitState(job.id, "waitingForNetwork", "Waiting for network connection")
                    waitForRetry(job, 0L)
                    continue
                }

                try {
                    emitState(job.id, "connecting")
                    val result = transfer(job)
                    clearMetadata(job.id)
                    emitProgress(job.id, result.first, result.second, 0.0)
                    emitState(job.id, "completed")
                    job.completion.resolve(Arguments.createMap().apply {
                        putDouble("downloadedBytes", result.first.toDouble())
                        putDouble("totalBytes", result.second.toDouble())
                        putString("destinationUri", job.destinationUri.toString())
                    })
                    return
                } catch (error: Exception) {
                    if (job.cancelled) throw DownloadCancelledException()
                    if (job.userPaused) continue
                    if (!isRetryable(error)) throw error

                    emitState(job.id, "waitingForNetwork", error.message)
                    waitForRetry(job, retryDelay)
                    retryDelay = min(retryDelay * 2, MAX_RETRY_DELAY_MS)
                } finally {
                    job.call = null
                }
            }
            throw DownloadCancelledException()
        } catch (error: DownloadCancelledException) {
            emitState(job.id, "cancelled")
            job.completion.reject("DOWNLOAD_CANCELLED", error.message, error)
        } catch (error: Exception) {
            emitState(job.id, "failed", error.message)
            job.completion.reject("DOWNLOAD_FAILED", error.message, error)
        } finally {
            jobs.remove(job.id, job)
            if (job.cancelled && job.deleteOnCancel) {
                runCatching {
                    reactContext.contentResolver.delete(job.destinationUri, null, null)
                }
                clearMetadata(job.id)
            }
            job.cancelPromise?.resolve(null)
        }
    }

    private fun transfer(job: HttpDownloadJob): Pair<Long, Long> {
        val resolver = reactContext.contentResolver
        val openedDescriptor = try {
            resolver.openFileDescriptor(job.destinationUri, "rw")
        } catch (error: Exception) {
            throw DestinationException("Unable to open the SAF destination", error)
        }
        openedDescriptor?.use { descriptor ->
            FileOutputStream(descriptor.fileDescriptor).use { output ->
                val channel = output.channel
                var existingBytes = try {
                    channel.size().coerceAtLeast(0L)
                } catch (error: Exception) {
                    throw DestinationException("SAF destination does not support seeking", error)
                }
                val requestBuilder = Request.Builder().url(job.url)
                var hasAcceptEncoding = false
                job.headers.forEach { (name, value) ->
                    if (name.equals("accept-encoding", ignoreCase = true)) {
                        hasAcceptEncoding = true
                    }
                    if (!name.equals("range", ignoreCase = true) &&
                        !name.equals("if-range", ignoreCase = true)) {
                        requestBuilder.header(name, value)
                    }
                }
                if (!hasAcceptEncoding) {
                    requestBuilder.header("Accept-Encoding", "identity")
                }

                val storedUrl = metadata.getString(metaKey(job.id, "url"), null)
                val storedUri = metadata.getString(metaKey(job.id, "uri"), null)
                val canUseValidator = storedUrl == job.url && storedUri == job.destinationUri.toString()
                if (existingBytes > 0L) {
                    requestBuilder.header("Range", "bytes=$existingBytes-")
                    if (canUseValidator) {
                        val validator = metadata.getString(metaKey(job.id, "etag"), null)
                            ?: metadata.getString(metaKey(job.id, "lastModified"), null)
                        validator?.let { requestBuilder.header("If-Range", it) }
                    }
                }

                val call = client.newCall(requestBuilder.build())
                job.call = call
                val response = call.execute()
                response.use {
                    if (response.code == 416) {
                        val expectedTotal = parseUnsatisfiedTotal(response.header("Content-Range"))
                        if (expectedTotal >= 0L && existingBytes == expectedTotal) {
                            return existingBytes to expectedTotal
                        }
                        try {
                            channel.truncate(0L)
                        } catch (error: Exception) {
                            throw DestinationException("Unable to reset the SAF destination", error)
                        }
                        clearMetadata(job.id)
                        throw IOException("Server rejected the saved byte range; restarting")
                    }
                    if (!response.isSuccessful) {
                        throw HttpStatusException(response.code)
                    }

                    var writeOffset = existingBytes
                    if (existingBytes > 0L && response.code == 206) {
                        val rangeStart = parseContentRangeStart(response.header("Content-Range"))
                        if (rangeStart != existingBytes) {
                            try {
                                channel.truncate(0L)
                            } catch (error: Exception) {
                                throw DestinationException("Unable to reset the SAF destination", error)
                            }
                            clearMetadata(job.id)
                            throw IOException("Server returned an invalid byte range; restarting")
                        }
                    } else if (existingBytes > 0L) {
                        // The server ignored Range or the validator changed. Never append a full
                        // response to a partial file because that silently corrupts the video.
                        try {
                            channel.truncate(0L)
                        } catch (error: Exception) {
                            throw DestinationException("Unable to reset the SAF destination", error)
                        }
                        writeOffset = 0L
                        existingBytes = 0L
                    }

                    val body = response.body ?: throw IOException("Empty response body")
                    val totalBytes = parseContentRangeTotal(response.header("Content-Range"))
                        .takeIf { it > 0L }
                        ?: body.contentLength().takeIf { it >= 0L }?.plus(writeOffset)
                        ?: 0L

                    saveMetadata(job, response)
                    try {
                        channel.position(writeOffset)
                    } catch (error: Exception) {
                        throw DestinationException("SAF destination does not support resuming", error)
                    }
                    var downloadedBytes = writeOffset
                    var previousBytes = downloadedBytes
                    var previousTime = System.currentTimeMillis()
                    val buffer = ByteArray(BUFFER_SIZE)
                    body.byteStream().use { input ->
                        while (true) {
                            if (job.cancelled) throw DownloadCancelledException()
                            if (job.userPaused) throw IOException("Download paused")
                            val read = input.read(buffer)
                            if (read < 0) break
                            val byteBuffer = java.nio.ByteBuffer.wrap(buffer, 0, read)
                            try {
                                while (byteBuffer.hasRemaining()) {
                                    channel.write(byteBuffer)
                                }
                            } catch (error: Exception) {
                                throw DestinationException("Unable to write to the SAF destination", error)
                            }
                            downloadedBytes += read

                            val now = System.currentTimeMillis()
                            val elapsed = now - previousTime
                            if (elapsed >= PROGRESS_INTERVAL_MS) {
                                val speed = ((downloadedBytes - previousBytes) * 1000.0) / elapsed
                                emitProgress(job.id, downloadedBytes, totalBytes, speed)
                                previousBytes = downloadedBytes
                                previousTime = now
                            }
                        }
                    }
                    try {
                        output.flush()
                        descriptor.fileDescriptor.sync()
                    } catch (error: Exception) {
                        throw DestinationException("Unable to flush the SAF destination", error)
                    }
                    if (totalBytes > 0L && downloadedBytes < totalBytes) {
                        throw EOFException("Connection ended before the file was complete")
                    }
                    return downloadedBytes to if (totalBytes > 0L) totalBytes else downloadedBytes
                }
            }
        }
        throw IOException("Unable to open the SAF destination")
    }

    private fun waitWhilePaused(job: HttpDownloadJob) {
        synchronized(job.monitor) {
            while (job.userPaused && !job.cancelled) {
                job.monitor.wait()
            }
        }
    }

    private fun waitForRetry(job: HttpDownloadJob, delayMs: Long) {
        var waited = 0L
        while (!job.cancelled && !job.userPaused) {
            if (hasNetwork() && waited >= delayMs) return
            synchronized(job.monitor) { job.monitor.wait(1_000L) }
            waited += 1_000L
        }
    }

    private fun pauseJobsForNetworkLoss() {
        if (hasNetwork()) return
        jobs.values.forEach { job ->
            if (!job.cancelled && !job.userPaused) {
                emitState(job.id, "waitingForNetwork", "Waiting for network connection")
                // Interrupt a blocked OkHttp read immediately instead of waiting for its timeout.
                job.call?.cancel()
                synchronized(job.monitor) { job.monitor.notifyAll() }
            }
        }
    }

    private fun wakeJobsWhenNetworkReturns() {
        if (!hasNetwork()) return
        jobs.values.forEach { job ->
            if (!job.cancelled && !job.userPaused) {
                synchronized(job.monitor) { job.monitor.notifyAll() }
            }
        }
    }

    private fun hasUsableInternet(capabilities: NetworkCapabilities): Boolean =
        capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)

    private fun hasNetwork(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return hasUsableInternet(capabilities)
    }

    private fun isRetryable(error: Exception): Boolean = when (error) {
        is DownloadCancelledException -> false
        is DestinationException -> false
        is HttpStatusException -> error.status == 408 || error.status == 429 || error.status >= 500
        is IOException -> true
        else -> false
    }

    private fun saveMetadata(job: HttpDownloadJob, response: Response) {
        metadata.edit()
            .putString(metaKey(job.id, "url"), job.url)
            .putString(metaKey(job.id, "uri"), job.destinationUri.toString())
            .apply {
                response.header("ETag")?.let { putString(metaKey(job.id, "etag"), it) }
                response.header("Last-Modified")?.let {
                    putString(metaKey(job.id, "lastModified"), it)
                }
            }
            .apply()
    }

    private fun clearMetadata(downloadId: String) {
        metadata.edit()
            .remove(metaKey(downloadId, "url"))
            .remove(metaKey(downloadId, "uri"))
            .remove(metaKey(downloadId, "etag"))
            .remove(metaKey(downloadId, "lastModified"))
            .apply()
    }

    private fun metaKey(downloadId: String, field: String) = "$downloadId:$field"

    private fun emitProgress(downloadId: String, downloaded: Long, total: Long, speed: Double) {
        emit(PROGRESS_EVENT, Arguments.createMap().apply {
            putString("downloadId", downloadId)
            putDouble("downloadedBytes", downloaded.toDouble())
            putDouble("totalBytes", total.toDouble())
            putDouble("speed", speed)
        })
    }

    private fun emitState(downloadId: String, state: String, message: String? = null) {
        emit(STATE_EVENT, Arguments.createMap().apply {
            putString("downloadId", downloadId)
            putString("state", state)
            message?.let { putString("message", it) }
        })
    }

    private fun emit(eventName: String, payload: Any) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, payload)
        }
    }

    private fun readableHeaders(headers: ReadableMap?): Map<String, String> {
        if (headers == null) return emptyMap()
        val result = mutableMapOf<String, String>()
        val iterator = headers.keySetIterator()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            headers.getString(key)?.let { result[key] = it }
        }
        return result
    }

    private fun parseContentRangeStart(value: String?): Long {
        return Regex("bytes\\s+(\\d+)-", RegexOption.IGNORE_CASE)
            .find(value ?: "")?.groupValues?.getOrNull(1)?.toLongOrNull() ?: -1L
    }

    private fun parseContentRangeTotal(value: String?): Long {
        return Regex("/(\\d+)$").find(value ?: "")
            ?.groupValues?.getOrNull(1)?.toLongOrNull() ?: -1L
    }

    private fun parseUnsatisfiedTotal(value: String?): Long = parseContentRangeTotal(value)
}

private class HttpStatusException(val status: Int) : IOException("HTTP $status")
private class DestinationException(message: String, cause: Throwable) : IOException(message, cause)
