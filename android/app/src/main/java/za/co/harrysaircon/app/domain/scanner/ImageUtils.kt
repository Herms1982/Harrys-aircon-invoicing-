package za.co.harrysaircon.app.domain.scanner

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.util.Log
import androidx.exifinterface.media.ExifInterface
import java.io.ByteArrayOutputStream
import java.io.InputStream
import kotlin.math.max
import kotlin.math.roundToInt

object ImageUtils {
    private const val TAG = "ImageUtils"
    private const val DEFAULT_MAX_DIMENSION = 1024

    /**
     * Safely decodes and downscales a Bitmap from a Content URI,
     * maintaining aspect ratio and correcting EXIF orientation.
     */
    fun decodeAndScaleBitmapFromUri(
        context: Context,
        uri: Uri,
        maxDimension: Int = DEFAULT_MAX_DIMENSION
    ): Bitmap? {
        return try {
            // 1. Read bounds without loading entire bitmap into memory
            val boundsOptions = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            context.contentResolver.openInputStream(uri)?.use { stream ->
                BitmapFactory.decodeStream(stream, null, boundsOptions)
            } ?: return null

            val originalWidth = boundsOptions.outWidth
            val originalHeight = boundsOptions.outHeight

            if (originalWidth <= 0 || originalHeight <= 0) {
                Log.e(TAG, "Invalid image dimensions: $originalWidth x $originalHeight")
                return null
            }

            // 2. Calculate optimal inSampleSize (power of 2)
            var inSampleSize = 1
            val maxOriginal = max(originalWidth, originalHeight)
            while (maxOriginal / (inSampleSize * 2) >= maxDimension) {
                inSampleSize *= 2
            }

            // 3. Decode actual bitmap with downsampling
            val decodeOptions = BitmapFactory.Options().apply {
                this.inSampleSize = inSampleSize
                inPreferredConfig = Bitmap.Config.ARGB_8888
            }

            val sampledBitmap = context.contentResolver.openInputStream(uri)?.use { stream ->
                BitmapFactory.decodeStream(stream, null, decodeOptions)
            } ?: return null

            // 4. Exact scale down if still larger than maxDimension
            val currentMax = max(sampledBitmap.width, sampledBitmap.height)
            val scaledBitmap = if (currentMax > maxDimension) {
                val scale = maxDimension.toFloat() / currentMax.toFloat()
                val targetW = (sampledBitmap.width * scale).roundToInt()
                val targetH = (sampledBitmap.height * scale).roundToInt()
                val scaled = Bitmap.createScaledBitmap(sampledBitmap, targetW, targetH, true)
                if (scaled != sampledBitmap) sampledBitmap.recycle()
                scaled
            } else {
                sampledBitmap
            }

            // 5. Correct EXIF Orientation (rotate if camera took vertical photo sideways)
            val orientation = getExifOrientation(context, uri)
            val rotatedBitmap = rotateBitmapIfNeeded(scaledBitmap, orientation)

            Log.d(TAG, "Successfully loaded bitmap: ${rotatedBitmap.width}x${rotatedBitmap.height}")
            rotatedBitmap
        } catch (e: Exception) {
            Log.e(TAG, "Error decoding bitmap from URI: $uri", e)
            null
        }
    }

    /**
     * Decodes and scales from raw ByteArray (e.g. from camera callback)
     */
    fun decodeAndScaleBitmapFromBytes(
        bytes: ByteArray,
        maxDimension: Int = DEFAULT_MAX_DIMENSION
    ): Bitmap? {
        return try {
            val boundsOptions = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, boundsOptions)

            var inSampleSize = 1
            val maxOriginal = max(boundsOptions.outWidth, boundsOptions.outHeight)
            while (maxOriginal / (inSampleSize * 2) >= maxDimension) {
                inSampleSize *= 2
            }

            val decodeOptions = BitmapFactory.Options().apply {
                this.inSampleSize = inSampleSize
                inPreferredConfig = Bitmap.Config.ARGB_8888
            }

            val sampledBitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, decodeOptions) ?: return null

            val currentMax = max(sampledBitmap.width, sampledBitmap.height)
            if (currentMax > maxDimension) {
                val scale = maxDimension.toFloat() / currentMax.toFloat()
                val targetW = (sampledBitmap.width * scale).roundToInt()
                val targetH = (sampledBitmap.height * scale).roundToInt()
                val scaled = Bitmap.createScaledBitmap(sampledBitmap, targetW, targetH, true)
                if (scaled != sampledBitmap) sampledBitmap.recycle()
                scaled
            } else {
                sampledBitmap
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error decoding bitmap from bytes", e)
            null
        }
    }

    /**
     * Converts a Bitmap to compressed JPEG ByteArray
     */
    fun compressBitmapToJpeg(bitmap: Bitmap, quality: Int = 85): ByteArray {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
        return outputStream.toByteArray()
    }

    private fun getExifOrientation(context: Context, uri: Uri): Int {
        return try {
            context.contentResolver.openInputStream(uri)?.use { stream ->
                val exif = ExifInterface(stream)
                exif.getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL
                )
            } ?: ExifInterface.ORIENTATION_NORMAL
        } catch (e: Exception) {
            Log.w(TAG, "Could not read EXIF orientation", e)
            ExifInterface.ORIENTATION_NORMAL
        }
    }

    private fun rotateBitmapIfNeeded(bitmap: Bitmap, orientation: Int): Bitmap {
        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
            else -> return bitmap
        }

        return try {
            val rotated = Bitmap.createBitmap(
                bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true
            )
            if (rotated != bitmap) {
                bitmap.recycle()
            }
            rotated
        } catch (e: Exception) {
            Log.e(TAG, "Failed to rotate bitmap", e)
            bitmap
        }
    }
}
