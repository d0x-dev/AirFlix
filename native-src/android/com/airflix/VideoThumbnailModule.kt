package com.airflix

import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Handler
import android.os.HandlerThread
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.SeekParameters
import androidx.media3.exoplayer.mediacodec.MediaCodecSelector
import androidx.media3.transformer.ExperimentalFrameExtractor
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.uimanager.ViewManager
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.roundToLong

class VideoThumbnailModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    // MediaMetadataRetriever is not thread-safe. A single serialized worker
    // also prevents rapid scrubbing from opening multiple remote decoders and
    // competing with video playback for bandwidth.
    private val executor = Executors.newSingleThreadExecutor()
    private var activeRetriever: MediaMetadataRetriever? = null
    private var activeSourceKey: String? = null

    override fun getName(): String = "VideoThumbnailModule"

    @ReactMethod
    fun getThumbnail(
        source: String,
        timestampMs: Double,
        requestHeaders: ReadableMap?,
        options: ReadableMap?,
        promise: Promise,
    ) {
        if (source.isBlank()) {
            promise.reject("VIDEO_THUMBNAIL_INVALID_SOURCE", "A video source is required")
            return
        }
        if (!timestampMs.isFinite() || timestampMs < 0) {
            promise.reject(
                "VIDEO_THUMBNAIL_INVALID_TIMESTAMP",
                "timestampMs must be a finite number greater than or equal to zero",
            )
            return
        }

        val headers = requestHeaders.toStringMap()
        val quality = options.intOr("quality", 85).coerceIn(0, 100)
        val maxWidth = options.intOr("maxWidth", 0).coerceAtLeast(0)
        val maxHeight = options.intOr("maxHeight", 0).coerceAtLeast(0)
        val useCache = options.booleanOr("cache", true)
        val requestedTimestampMs = timestampMs.roundToLong()

        executor.execute {
            var frame: Bitmap? = null
            var outputBitmap: Bitmap? = null
            try {
                val outputDirectory = File(reactApplicationContext.cacheDir, "video-thumbnails")
                if (!outputDirectory.exists() && !outputDirectory.mkdirs()) {
                    throw IllegalStateException("Unable to create the video thumbnail cache")
                }

                val cacheKey = buildCacheKey(
                    source,
                    requestedTimestampMs,
                    headers,
                    quality,
                    maxWidth,
                    maxHeight,
                )
                val outputFile = File(outputDirectory, "$cacheKey.jpg")
                if (useCache && outputFile.isFile && outputFile.length() > 0) {
                    val cachedBounds = android.graphics.BitmapFactory.Options().apply {
                        inJustDecodeBounds = true
                    }
                    android.graphics.BitmapFactory.decodeFile(outputFile.absolutePath, cachedBounds)
                    promise.resolve(
                        createResult(
                            outputFile,
                            cachedBounds.outWidth,
                            cachedBounds.outHeight,
                            requestedTimestampMs,
                            true,
                        ),
                    )
                    return@execute
                }

                val extractedFrame = if (isRemoteSource(source)) {
                    try {
                        extractRemoteFrame(source, requestedTimestampMs)
                    } catch (_: Throwable) {
                        // Some authenticated servers cannot be opened without the supplied
                        // request headers. Keep the platform retriever as a compatibility
                        // fallback for those sources.
                        extractWithMetadataRetriever(source, requestedTimestampMs, headers)
                    }
                } else {
                    extractWithMetadataRetriever(source, requestedTimestampMs, headers)
                }
                frame = extractedFrame

                val bitmapToWrite = scaleBitmap(extractedFrame, maxWidth, maxHeight)
                outputBitmap = bitmapToWrite
                FileOutputStream(outputFile).use { output ->
                    if (!bitmapToWrite.compress(Bitmap.CompressFormat.JPEG, quality, output)) {
                        throw IllegalStateException("Unable to encode the video thumbnail")
                    }
                }

                promise.resolve(
                    createResult(
                        outputFile,
                        bitmapToWrite.width,
                        bitmapToWrite.height,
                        requestedTimestampMs,
                        false,
                    ),
                )
            } catch (error: Throwable) {
                releaseActiveRetriever()
                promise.reject(
                    "VIDEO_THUMBNAIL_ERROR",
                    error.message ?: "Unable to generate the video thumbnail",
                    error,
                )
            } finally {
                if (outputBitmap !== frame) {
                    outputBitmap?.recycle()
                }
                frame?.recycle()
            }
        }
    }

    @ReactMethod
    fun clearCache(promise: Promise) {
        executor.execute {
            try {
                val directory = File(reactApplicationContext.cacheDir, "video-thumbnails")
                val deleted = !directory.exists() || directory.deleteRecursively()
                if (!deleted) {
                    throw IllegalStateException("Unable to clear the video thumbnail cache")
                }
                promise.resolve(null)
            } catch (error: Throwable) {
                promise.reject(
                    "VIDEO_THUMBNAIL_CACHE_ERROR",
                    error.message ?: "Unable to clear the video thumbnail cache",
                    error,
                )
            }
        }
    }

    override fun invalidate() {
        executor.execute { releaseActiveRetriever() }
        executor.shutdown()
        super.invalidate()
    }

    private fun getRetriever(
        source: String,
        headers: Map<String, String>,
    ): MediaMetadataRetriever {
        val sourceKey = buildString {
            append(source)
            headers.toSortedMap(String.CASE_INSENSITIVE_ORDER).forEach { (name, value) ->
                append('|').append(name.lowercase()).append(':').append(value)
            }
        }
        activeRetriever?.let { retriever ->
            if (activeSourceKey == sourceKey) return retriever
        }

        releaseActiveRetriever()
        val retriever = MediaMetadataRetriever()
        try {
            setDataSource(retriever, source, headers)
        } catch (error: Throwable) {
            try {
                retriever.release()
            } catch (_: Throwable) {
                // Preserve the original data-source error.
            }
            throw error
        }
        activeRetriever = retriever
        activeSourceKey = sourceKey
        return retriever
    }

    private fun extractWithMetadataRetriever(
        source: String,
        timestampMs: Long,
        headers: Map<String, String>,
    ): Bitmap {
        val retriever = getRetriever(source, headers)
        val timestampUs = timestampMs * 1_000L
        return retriever.getFrameAtTime(
            timestampUs,
            MediaMetadataRetriever.OPTION_CLOSEST,
        ) ?: retriever.getFrameAtTime(
            timestampUs,
            MediaMetadataRetriever.OPTION_CLOSEST_SYNC,
        ) ?: throw IllegalStateException(
            "The video decoder did not return a frame at ${timestampMs}ms",
        )
    }

    private fun isRemoteSource(source: String): Boolean =
        when (Uri.parse(source).scheme?.lowercase()) {
            "http", "https" -> true
            else -> false
        }

    /**
     * MediaMetadataRetriever commonly returns the opening frame for every seek
     * on HTTP sources. Media3 prepares the stream, decodes the initial frame it
     * requires internally, and then performs a real seek to the requested time.
     */
    @UnstableApi
    private fun extractRemoteFrame(source: String, timestampMs: Long): Bitmap {
        val thread = HandlerThread("airflix-thumbnail-frame-extractor").apply { start() }
        val handler = Handler(thread.looper)
        val result = CompletableFuture<Bitmap>()

        handler.post {
            var extractor: ExperimentalFrameExtractor? = null
            try {
                val configuration = ExperimentalFrameExtractor.Configuration.Builder()
                    .setSeekParameters(SeekParameters.CLOSEST_SYNC)
                    .setMediaCodecSelector(MediaCodecSelector.DEFAULT)
                    .build()
                extractor = ExperimentalFrameExtractor(reactApplicationContext, configuration)
                extractor.setMediaItem(MediaItem.fromUri(source), emptyList())

                val frameFuture = extractor.getFrame(timestampMs)
                frameFuture.addListener(
                    {
                        try {
                            result.complete(frameFuture.get().bitmap)
                        } catch (error: Throwable) {
                            result.completeExceptionally(error)
                        } finally {
                            extractor?.release()
                            thread.quitSafely()
                        }
                    },
                    { task -> handler.post(task) },
                )
            } catch (error: Throwable) {
                try {
                    extractor?.release()
                } catch (_: Throwable) {
                    // Preserve the extraction error.
                }
                thread.quitSafely()
                result.completeExceptionally(error)
            }
        }

        return try {
            result.get(20, TimeUnit.SECONDS)
        } catch (error: Throwable) {
            handler.post {
                thread.quitSafely()
            }
            throw (error.cause ?: error)
        }
    }

    private fun releaseActiveRetriever() {
        val retriever = activeRetriever
        activeRetriever = null
        activeSourceKey = null
        try {
            retriever?.release()
        } catch (_: Throwable) {
            // Some device codecs throw while releasing after a decode failure.
        }
    }

    private fun setDataSource(
        retriever: MediaMetadataRetriever,
        source: String,
        headers: Map<String, String>,
    ) {
        val uri = Uri.parse(source)
        when (uri.scheme?.lowercase()) {
            "http", "https" -> retriever.setDataSource(source, headers)
            "content", "android.resource" ->
                retriever.setDataSource(reactApplicationContext, uri)
            "file" -> {
                val path = uri.path ?: throw IllegalArgumentException("Invalid file URI")
                retriever.setDataSource(path)
            }
            null -> retriever.setDataSource(source)
            else -> retriever.setDataSource(reactApplicationContext, uri)
        }
    }

    private fun scaleBitmap(bitmap: Bitmap, maxWidth: Int, maxHeight: Int): Bitmap {
        if (maxWidth <= 0 && maxHeight <= 0) return bitmap

        val widthScale = if (maxWidth > 0) maxWidth.toDouble() / bitmap.width else 1.0
        val heightScale = if (maxHeight > 0) maxHeight.toDouble() / bitmap.height else 1.0
        val scale = min(1.0, min(widthScale, heightScale))
        if (scale >= 1.0) return bitmap

        return Bitmap.createScaledBitmap(
            bitmap,
            (bitmap.width * scale).roundToInt().coerceAtLeast(1),
            (bitmap.height * scale).roundToInt().coerceAtLeast(1),
            true,
        )
    }

    private fun createResult(
        file: File,
        width: Int,
        height: Int,
        timestampMs: Long,
        cached: Boolean,
    ) = Arguments.createMap().apply {
        putString("uri", Uri.fromFile(file).toString())
        putString("path", file.absolutePath)
        putInt("width", width)
        putInt("height", height)
        putDouble("timestampMs", timestampMs.toDouble())
        putBoolean("cached", cached)
    }

    private fun buildCacheKey(
        source: String,
        timestampMs: Long,
        headers: Map<String, String>,
        quality: Int,
        maxWidth: Int,
        maxHeight: Int,
    ): String {
        val value = buildString {
            append("media3-frame-extractor-v1|")
            append(source)
            append('|').append(timestampMs)
            append('|').append(quality)
            append('|').append(maxWidth).append('x').append(maxHeight)
            headers.toSortedMap(String.CASE_INSENSITIVE_ORDER).forEach { (name, headerValue) ->
                append('|').append(name.lowercase()).append(':').append(headerValue)
            }
        }
        return MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(Charsets.UTF_8))
            .joinToString("") { byte -> "%02x".format(byte) }
    }
}

private fun ReadableMap?.toStringMap(): Map<String, String> {
    if (this == null) return emptyMap()
    val result = linkedMapOf<String, String>()
    val iterator = keySetIterator()
    while (iterator.hasNextKey()) {
        val key = iterator.nextKey()
        val value = when (getType(key)) {
            ReadableType.String -> getString(key)
            ReadableType.Number -> getDouble(key).toString()
            ReadableType.Boolean -> getBoolean(key).toString()
            else -> null
        }
        if (value != null) result[key] = value
    }
    return result
}

private fun ReadableMap?.intOr(key: String, fallback: Int): Int {
    if (this == null || !hasKey(key) || isNull(key)) return fallback
    return when (getType(key)) {
        ReadableType.Number -> getDouble(key).roundToInt()
        else -> fallback
    }
}

private fun ReadableMap?.booleanOr(key: String, fallback: Boolean): Boolean {
    if (this == null || !hasKey(key) || isNull(key)) return fallback
    return when (getType(key)) {
        ReadableType.Boolean -> getBoolean(key)
        else -> fallback
    }
}

class VideoThumbnailPackage : com.facebook.react.ReactPackage {
    override fun createNativeModules(
        reactContext: ReactApplicationContext,
    ): List<NativeModule> = listOf(VideoThumbnailModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext,
    ): List<ViewManager<*, *>> = emptyList()
}
