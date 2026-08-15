package za.co.harrysaircon.app.ui.viewmodel

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.util.Log
import android.widget.Toast
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content
import com.google.ai.client.generativeai.type.generationConfig
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonSyntaxException
import com.google.mlkit.vision.documentscanner.GmsDocumentScanner
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import za.co.harrysaircon.app.data.repository.ReconciledReviewItem
import za.co.harrysaircon.app.data.repository.StockSyncRepository
import za.co.harrysaircon.app.domain.scanner.ImageUtils
import za.co.harrysaircon.app.domain.scanner.InvoiceScannerService
import za.co.harrysaircon.app.domain.scanner.ScannedInvoiceDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

sealed interface ScanUiState {
    object Idle : ScanUiState
    object ScanningWithGemini : ScanUiState
    data class Review(
        val supplierName: String,
        val invoiceDate: String,
        val invoiceNumber: String,
        val items: List<ReconciledReviewItem>
    ) : ScanUiState
    data class Success(val itemsUpdatedCount: Int) : ScanUiState
    data class Error(val message: String) : ScanUiState
}

class InvoiceToStockSyncViewModel(
    private val scannerService: InvoiceScannerService,
    private val repository: StockSyncRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<ScanUiState>(ScanUiState.Idle)
    val uiState: StateFlow<ScanUiState> = _uiState.asStateFlow()
    private val json: Gson = GsonBuilder().setLenient().create()

    /**
     * Direct Gemini GenerativeModel SDK function to bypass web server routes and avoid 200 OK HTML pages.
     */
    suspend fun processInvoiceImageWithSdk(bitmap: Bitmap, apiKey: String): String = withContext(Dispatchers.IO) {
        if (apiKey.isBlank()) {
            Log.e(TAG, "Gemini API key is blank!")
            throw IllegalArgumentException("Gemini API key is not configured.")
        }

        Log.d(TAG, "Executing native GenerativeModel with gemini-1.5-flash for bitmap: ${bitmap.width}x${bitmap.height}")
        val config = generationConfig {
            responseMimeType = "application/json"
            temperature = 0.1f
        }
        val generativeModel = GenerativeModel(
            modelName = "gemini-1.5-flash",
            apiKey = apiKey,
            generationConfig = config
        )

        val prompt = """
            Analyze this tax invoice/receipt photo. Extract supplier name, date, invoice_number, total_amount, 
            and line_items (item_code, description, quantity_purchased, unit_cost_price, total_price). 
            Return purely as valid JSON without HTML or markdown formatting:
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

        val text = response.text ?: ""
        if (text.trim().startsWith("<!DOCTYPE", ignoreCase = true) || text.trim().startsWith("<html", ignoreCase = true)) {
            Log.e(TAG, "Received HTML content string instead of JSON: $text")
            throw IllegalStateException("Received an HTML error page. Check your API configuration and key.")
        }
        text
    }

    /**
     * Directly processes a Bitmap with the Gemini SDK and updates UI review state
     */
    fun processBitmapWithSdk(context: Context, bitmap: Bitmap, apiKey: String) {
        viewModelScope.launch {
            _uiState.value = ScanUiState.ScanningWithGemini
            try {
                if (apiKey.isBlank()) {
                    val errorMsg = "Gemini API Key is missing. Please check your configuration."
                    Log.e(TAG, errorMsg)
                    _uiState.value = ScanUiState.Error(errorMsg)
                    Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
                    return@launch
                }

                val rawJson = processInvoiceImageWithSdk(bitmap, apiKey)
                val cleanedJson = cleanJsonBlock(rawJson)
                val invoiceDto = json.fromJson(cleanedJson, ScannedInvoiceDto::class.java)

                if (invoiceDto == null || (invoiceDto.lineItems.isEmpty() && invoiceDto.supplierName.isBlank())) {
                    val errorMsg = "No line items detected in invoice photo. Please ensure good lighting and try again."
                    _uiState.value = ScanUiState.Error(errorMsg)
                    Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
                    return@launch
                }

                val reconciledItems = repository.correlateScannedItems(invoiceDto)
                _uiState.value = ScanUiState.Review(
                    supplierName = invoiceDto.supplierName,
                    invoiceDate = invoiceDto.invoiceDate,
                    invoiceNumber = invoiceDto.invoiceNumber,
                    items = reconciledItems
                )
            } catch (e: Exception) {
                Log.e(TAG, "Direct SDK processing failed: ${e.message}", e)
                val userMessage = when {
                    e.message?.contains("API_KEY", ignoreCase = true) == true ->
                        "Invalid or missing Gemini API key. Please check your configuration."
                    e.message?.contains("RESOURCE_EXHAUSTED", ignoreCase = true) == true ->
                        "Scan limit reached. Please wait a moment and try again."
                    else ->
                        "Failed to scan photo with AI SDK. Please ensure clear lighting and try again."
                }
                _uiState.value = ScanUiState.Error(userMessage)
                Toast.makeText(context, userMessage, Toast.LENGTH_LONG).show()
            }
        }
    }

    /**
     * Initializes Google ML Kit Document Scanner Client
     */
    fun createDocumentScanner(activityContext: Context): GmsDocumentScanner {
        val options = GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(true)
            .setPageLimit(2)
            .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
            .build()

        return GmsDocumentScanning.getClient(options)
    }

    /**
     * Handles ML Kit scanner result URI and delegates to Gemini Vision
     */
    fun onDocumentScanned(context: Context, scanResult: GmsDocumentScanningResult, apiKey: String = "") {
        val pages = scanResult.pages
        if (pages.isNullOrEmpty()) {
            val errorMsg = "No invoice pages captured."
            _uiState.value = ScanUiState.Error(errorMsg)
            Toast.makeText(context, errorMsg, Toast.LENGTH_SHORT).show()
            return
        }

        val imageUri = pages[0].imageUri
        processImageUri(context, imageUri, apiKey)
    }

    /**
     * Converts any photo URI (from Camera capture, Document Scanner, or Gallery)
     * into a downscaled, EXIF-corrected Bitmap, then sends it to the Gemini SDK.
     */
    fun processImageUri(context: Context, uri: Uri, apiKey: String = "") {
        viewModelScope.launch {
            _uiState.value = ScanUiState.ScanningWithGemini
            try {
                Log.d(TAG, "Decoding and downscaling image from URI: $uri")
                
                // Downscale image to max 1024px to stay within memory limits and ensure fast processing
                val bitmap: Bitmap? = ImageUtils.decodeAndScaleBitmapFromUri(
                    context = context,
                    uri = uri,
                    maxDimension = 1024
                )

                if (bitmap == null) {
                    val errorMsg = "Failed to load photo. Please ensure clear lighting and try again."
                    _uiState.value = ScanUiState.Error(errorMsg)
                    Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
                    return@launch
                }

                if (apiKey.isNotBlank()) {
                    processBitmapWithSdk(context, bitmap, apiKey)
                } else {
                    processBitmap(context, bitmap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing image URI", e)
                val userMsg = "Failed to scan photo. Please ensure clear lighting and try again."
                _uiState.value = ScanUiState.Error(userMsg)
                Toast.makeText(context, userMsg, Toast.LENGTH_LONG).show()
            }
        }
    }

    /**
     * Direct Bitmap ingestion via the Gemini SDK Service
     */
    fun processBitmap(context: Context, bitmap: Bitmap) {
        viewModelScope.launch {
            _uiState.value = ScanUiState.ScanningWithGemini
            val parseResult = scannerService.parseInvoiceImage(bitmap)
            
            parseResult.onSuccess { invoiceDto ->
                val reconciledItems = repository.correlateScannedItems(invoiceDto)
                _uiState.value = ScanUiState.Review(
                    supplierName = invoiceDto.supplierName,
                    invoiceDate = invoiceDto.invoiceDate,
                    invoiceNumber = invoiceDto.invoiceNumber,
                    items = reconciledItems
                )
            }.onFailure { error ->
                val errorMessage = error.message ?: "Failed to scan photo. Please ensure clear lighting and try again."
                Log.e(TAG, "Gemini scan failed: $errorMessage", error)
                _uiState.value = ScanUiState.Error(errorMessage)
                Toast.makeText(context, errorMessage, Toast.LENGTH_LONG).show()
            }
        }
    }

    fun toggleItemSelection(itemId: String) {
        _uiState.update { current ->
            if (current is ScanUiState.Review) {
                current.copy(
                    items = current.items.map {
                        if (it.id == itemId) it.copy(isSelectedForUpdate = !it.isSelectedForUpdate) else it
                    }
                )
            } else current
        }
    }

    fun updateItemQuantity(itemId: String, newQty: Double) {
        _uiState.update { current ->
            if (current is ScanUiState.Review) {
                current.copy(
                    items = current.items.map {
                        if (it.id == itemId) it.copy(quantityToAdd = newQty) else it
                    }
                )
            } else current
        }
    }

    fun confirmAndUpdateStock() {
        val state = _uiState.value as? ScanUiState.Review ?: return
        viewModelScope.launch {
            try {
                val count = repository.processScannedInvoiceToInventory(
                    supplierName = state.supplierName,
                    invoiceReference = state.invoiceNumber,
                    itemsToProcess = state.items
                )
                _uiState.value = ScanUiState.Success(itemsUpdatedCount = count)
            } catch (e: Exception) {
                _uiState.value = ScanUiState.Error("Failed to update database: ${e.message}")
            }
        }
    }

    fun resetState() {
        _uiState.value = ScanUiState.Idle
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
        private const val TAG = "InvoiceScanViewModel"
    }
}
