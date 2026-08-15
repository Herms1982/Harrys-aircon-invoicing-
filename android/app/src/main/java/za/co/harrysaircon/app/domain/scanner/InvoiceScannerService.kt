package za.co.harrysaircon.app.domain.scanner

import android.graphics.Bitmap
import android.util.Base64
import android.util.Log
import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content
import com.google.ai.client.generativeai.type.generationConfig
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonSyntaxException
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.util.concurrent.TimeUnit

data class ScannedInvoiceDto(
    @SerializedName("supplier_name") val supplierName: String = "Wholesale Supplier",
    @SerializedName("invoice_date") val invoiceDate: String = "",
    @SerializedName("invoice_number") val invoiceNumber: String = "",
    @SerializedName("line_items") val lineItems: List<ScannedLineItemDto> = emptyList(),
    @SerializedName("total_amount") val totalAmount: Double = 0.0
)

data class ScannedLineItemDto(
    @SerializedName("item_code") val itemCode: String = "",
    @SerializedName("description") val description: String = "",
    @SerializedName("quantity_purchased") val quantityPurchased: Double = 0.0,
    @SerializedName("unit_cost_price") val unitCostPrice: Double = 0.0,
    @SerializedName("total_price") val totalPrice: Double = 0.0
)

class InvoiceScannerService(
    private val apiKey: String,
    private val backendBaseUrl: String = "https://generativelanguage.googleapis.com"
) {

    private val json: Gson = GsonBuilder().setLenient().create()

    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()
    }

    private val generativeModel by lazy {
        val config = generationConfig {
            responseMimeType = "application/json"
            temperature = 0.1f
        }
        GenerativeModel(
            modelName = "gemini-1.5-flash",
            apiKey = apiKey,
            generationConfig = config
        )
    }

    /**
     * Multimodal API Call: Sends the downscaled Bitmap image along with prompt instructions
     * and structured JSON configuration to extract purchase invoice data.
     * 
     * Includes pre-flight checks, HTML response interception, and safe JSON deserialization.
     */
    suspend fun parseInvoiceImage(bitmap: Bitmap): Result<ScannedInvoiceDto> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Initiating Gemini scan on bitmap: ${bitmap.width}x${bitmap.height}")

            // Try standard GenerativeModel SDK first; fallback to REST if needed
            val prompt = buildScannerPrompt()

            val inputContent = content {
                image(bitmap)
                text(prompt)
            }

            val response = generativeModel.generateContent(inputContent)
            val rawText = response.text

            if (rawText.isNullOrBlank()) {
                Log.e(TAG, "Empty response text received from Gemini model.")
                return@withContext Result.failure(
                    IllegalStateException("No content returned from AI scanner. Please ensure clear lighting and try again.")
                )
            }

            // Safe JSON validation and parsing
            val parsedInvoice = safelyParseInvoiceJson(rawText)
            Result.success(parsedInvoice)

        } catch (e: Exception) {
            Log.e(TAG, "Primary SDK scan failed, attempting REST endpoint fallback with HTTP status validation", e)
            
            // Fallback to direct REST API with strict HTTP status and content-type checking
            parseInvoiceViaRestApi(bitmap)
        }
    }

    /**
     * Direct REST API invocation with HTTP Response Code validation,
     * Content-Type inspection, and HTML error body interception.
     */
    suspend fun parseInvoiceViaRestApi(bitmap: Bitmap): Result<ScannedInvoiceDto> = withContext(Dispatchers.IO) {
        val endpointUrl = "$backendBaseUrl/v1beta/models/gemini-1.5-flash:generateContent"
        
        try {
            // Compress bitmap to JPEG Base64
            val byteArrayOutputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 85, byteArrayOutputStream)
            val base64Image = Base64.encodeToString(byteArrayOutputStream.toByteArray(), Base64.NO_WRAP)

            val prompt = buildScannerPrompt()

            val requestJson = """
            {
              "contents": [
                {
                  "parts": [
                    { "text": ${Gson().toJson(prompt)} },
                    {
                      "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": "$base64Image"
                      }
                    }
                  ]
                }
              ],
              "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1
              }
            }
            """.trimIndent()

            val request = Request.Builder()
                .url(endpointUrl)
                .addHeader("Content-Type", "application/json")
                .addHeader("x-goog-api-key", apiKey)
                .post(requestJson.toRequestBody("application/json; charset=utf-8".toMediaType()))
                .build()

            Log.d(TAG, "Executing REST request to: $endpointUrl (API Key configured: ${apiKey.isNotBlank()})")

            val response: Response = okHttpClient.newCall(request).execute()
            val statusCode = response.code
            val contentType = response.header("Content-Type") ?: ""
            val responseBody = response.body?.string() ?: ""

            Log.d(TAG, "HTTP Response Code: $statusCode, Content-Type: $contentType")

            // 1. Check HTTP Response Status & Content-Type First
            if (responseBody.trim().startsWith("<!DOCTYPE", ignoreCase = true) || 
                responseBody.trim().startsWith("<html", ignoreCase = true) || 
                contentType.contains("text/html", ignoreCase = true)
            ) {
                Log.e("ScannerError", "Received HTML response instead of JSON (Status $statusCode): $responseBody")
                return@withContext Result.failure(
                    IOException("Server returned an HTML error page (HTTP $statusCode). Check your API URL and API Key.")
                )
            }

            if (!response.isSuccessful) {
                Log.e("ScannerError", "HTTP Request failed with status $statusCode. Body: $responseBody")
                val errorDetails = try {
                    val errObj = json.fromJson(responseBody, Map::class.java)
                    errObj["error"]?.toString() ?: responseBody.take(200)
                } catch (_: Exception) {
                    responseBody.take(200)
                }
                return@withContext Result.failure(
                    IOException("API Request failed with HTTP $statusCode: $errorDetails")
                )
            }

            // Validate Content-Type contains application/json
            if (!contentType.contains("application/json", ignoreCase = true) && responseBody.isNotBlank()) {
                Log.w(TAG, "Warning: Response Content-Type is '$contentType', attempting safe JSON parse.")
            }

            // 3. Handle API Response Safely with try-catch and Logcat error output
            try {
                // Extract text from Gemini REST response structure
                val rootJson = json.fromJson(responseBody, Map::class.java)
                val candidates = (rootJson["candidates"] as? List<*>)
                val firstCandidate = candidates?.firstOrNull() as? Map<*, *>
                val contentMap = firstCandidate?.get("content") as? Map<*, *>
                val parts = contentMap?.get("parts") as? List<*>
                val firstPart = parts?.firstOrNull() as? Map<*, *>
                val rawModelText = firstPart?.get("text") as? String ?: responseBody

                val parsedInvoice = safelyParseInvoiceJson(rawModelText)
                Result.success(parsedInvoice)
            } catch (e: Exception) {
                Log.e("ScannerError", "Failed to deserialize JSON response. Raw string: $responseBody", e)
                Result.failure(IOException("Failed to parse invoice data from server response.", e))
            }

        } catch (e: IOException) {
            Log.e("ScannerError", "Network or I/O error during invoice scan: ${e.message}", e)
            Result.failure(e)
        } catch (e: Exception) {
            Log.e("ScannerError", "Unexpected exception during invoice scan: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Safely cleans markdown blocks and deserializes into ScannedInvoiceDto
     */
    private fun safelyParseInvoiceJson(rawText: String): ScannedInvoiceDto {
        val trimmed = rawText.trim()
        
        // Intercept HTML pages masquerading as text
        if (trimmed.startsWith("<!DOCTYPE", ignoreCase = true) || trimmed.startsWith("<html", ignoreCase = true)) {
            Log.e("ScannerError", "Received HTML content string instead of JSON: $rawText")
            throw IOException("Server returned an HTML error page. Check your API URL and API Key.")
        }

        val cleanedJson = cleanJsonBlock(trimmed)
        Log.d(TAG, "Parsing JSON content: ${cleanedJson.take(300)}")

        return try {
            val parsed = json.fromJson(cleanedJson, ScannedInvoiceDto::class.java)
            if (parsed == null || (parsed.lineItems.isEmpty() && parsed.supplierName.isBlank())) {
                throw IllegalStateException("Parsed invoice contains no valid data or line items.")
            }
            parsed
        } catch (e: JsonSyntaxException) {
            Log.e("ScannerError", "Malformed JSON syntax from AI scanner. Raw content was: $rawText", e)
            throw IOException("Malformed JSON received from AI scanner: ${e.message}", e)
        }
    }

    private fun buildScannerPrompt(): String {
        return """
            Analyze this image of a purchase/tax invoice or receipt from a wholesale supplier (HVAC, electrical, plumbing, or hardware trade).
            Extract supplier, date, invoice_number, line_items (code, description, quantity_purchased, unit_cost_price, total_price), and total_amount into structured JSON.
            
            Ensure trade abbreviations (e.g., 1P MCB, CAP 45/5, R410A, 2.5MM CABTYRE) are clearly normalized into the description and item_code.
            
            Respond ONLY with valid JSON strictly conforming to this schema:
            {
              "supplier_name": "String",
              "invoice_date": "YYYY-MM-DD",
              "invoice_number": "String",
              "line_items": [
                {
                  "item_code": "String",
                  "description": "String",
                  "quantity_purchased": 0.0,
                  "unit_cost_price": 0.0,
                  "total_price": 0.0
                }
              ],
              "total_amount": 0.0
            }
        """.trimIndent()
    }

    private fun cleanJsonBlock(text: String): String {
        var trimmed = text.trim()
        if (trimmed.startsWith("```")) {
            val firstLineBreak = trimmed.indexOf('\n')
            if (firstLineBreak != -1) {
                trimmed = trimmed.substring(firstLineBreak + 1)
            }
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length - 3)
        }
        return trimmed.trim()
    }

    companion object {
        private const val TAG = "InvoiceScannerService"
    }
}
