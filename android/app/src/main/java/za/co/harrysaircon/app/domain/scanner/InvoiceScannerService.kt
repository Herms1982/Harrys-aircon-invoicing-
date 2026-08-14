package za.co.harrysaircon.app.domain.scanner

import android.graphics.Bitmap
import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content
import com.google.ai.client.generativeai.type.generationConfig
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

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

class InvoiceScannerService(private val apiKey: String) {

    private val json = Gson()

    private val generativeModel by lazy {
        GenerativeModel(
            modelName = "gemini-1.5-flash",
            apiKey = apiKey,
            generationConfig = generationConfig {
                responseMimeType = "application/json"
                temperature = 0.1f
            }
        )
    }

    suspend fun parseInvoiceImage(bitmap: Bitmap): Result<ScannedInvoiceDto> = withContext(Dispatchers.IO) {
        try {
            val prompt = """
                You are a professional invoice OCR and stock reconciliation engine for HVAC, electrical, and refrigeration trades.
                Extract every purchased trade line item from this supplier tax invoice or cash receipt.
                Reconcile abbreviations (e.g. 1P MCB, CAP 45/5, R410A) into clear item codes and descriptions.
                
                Respond ONLY with valid JSON following this schema:
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

            val rawJson = response.text?.trim() ?: throw IllegalStateException("Empty response from Gemini")
            val parsedDto = json.fromJson(rawJson, ScannedInvoiceDto::class.java)

            Result.success(parsedDto)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
