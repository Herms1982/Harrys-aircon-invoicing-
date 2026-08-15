package za.co.harrysaircon.app.domain.scanner

import android.graphics.Bitmap
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
import java.io.IOException

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

/**
 * Direct Google Generative AI Client SDK Service.
 * Bypasses web servers and retrofits to prevent 200 OK HTML fallback pages.
 */
class InvoiceScannerService(private val apiKey: String) {

    private val json: Gson = GsonBuilder().setLenient().create()

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
     * Directly calls the Gemini SDK with the given Bitmap and returns structured JSON text.
     */
    suspend fun processInvoiceImage(bitmap: Bitmap): String = withContext(Dispatchers.IO) {
        val prompt = """
            Analyze this tax invoice/receipt photo from a wholesale trade supplier.
            Extract supplier name, date, invoice_number, total_amount, and line_items (item_code, description, quantity_purchased, unit_cost_price, total_price).
            Ensure abbreviations (e.g. 1P MCB, CAP 45/5, R410A, 2.5MM CABTYRE) are normalized.
            Return purely as valid JSON conforming strictly to the schema without HTML or markdown formatting:
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

        val response = generativeModel.generateContent(
            content {
                image(bitmap)
                text(prompt)
            }
        )

        val rawText = response.text ?: ""
        if (rawText.trim().startsWith("<!DOCTYPE", ignoreCase = true) || 
            rawText.trim().startsWith("<html", ignoreCase = true)
        ) {
            Log.e(TAG, "Unexpected HTML response received: $rawText")
            throw IOException("Received an HTML error page. Check your API configuration and key.")
        }

        rawText
    }

    /**
     * Parses the image directly via the Gemini SDK into our App's DTO.
     */
    suspend fun parseInvoiceImage(bitmap: Bitmap): Result<ScannedInvoiceDto> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Calling direct Gemini SDK on bitmap (${bitmap.width}x${bitmap.height})")
            val rawJson = processInvoiceImage(bitmap)

            if (rawJson.isBlank()) {
                Log.e(TAG, "Empty response received from Gemini model.")
                return@withContext Result.failure(
                    IllegalStateException("Failed to scan photo. Please ensure clear lighting and try again.")
                )
            }

            val cleanedJson = cleanJsonBlock(rawJson)
            Log.d(TAG, "Cleaned JSON: ${cleanedJson.take(200)}")

            val parsedInvoice = json.fromJson(cleanedJson, ScannedInvoiceDto::class.java)
            if (parsedInvoice == null || (parsedInvoice.lineItems.isEmpty() && parsedInvoice.supplierName.isBlank())) {
                return@withContext Result.failure(
                    IllegalStateException("No invoice line items detected. Please ensure clear lighting and try again.")
                )
            }

            Result.success(parsedInvoice)
        } catch (e: JsonSyntaxException) {
            Log.e(TAG, "JSON syntax error from Gemini response", e)
            Result.failure(IOException("Failed to parse invoice data from Gemini SDK.", e))
        } catch (e: Exception) {
            Log.e(TAG, "Gemini direct SDK invocation error: ${e.message}", e)
            val userMessage = when {
                e.message?.contains("API_KEY", ignoreCase = true) == true ->
                    "Invalid or missing Gemini API key. Please check your configuration."
                e.message?.contains("RESOURCE_EXHAUSTED", ignoreCase = true) == true ->
                    "Scan limit reached. Please wait a moment and try again."
                else ->
                    "Failed to scan photo. Please ensure clear lighting and try again."
            }
            Result.failure(Exception(userMessage, e))
        }
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
