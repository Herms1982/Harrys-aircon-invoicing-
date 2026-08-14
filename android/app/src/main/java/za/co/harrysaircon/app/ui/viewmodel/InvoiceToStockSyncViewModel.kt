package za.co.harrysaircon.app.ui.viewmodel

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.mlkit.vision.documentscanner.GmsDocumentScanner
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import za.co.harrysaircon.app.data.repository.ReconciledReviewItem
import za.co.harrysaircon.app.data.repository.StockSyncRepository
import za.co.harrysaircon.app.domain.scanner.InvoiceScannerService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

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
    fun onDocumentScanned(context: Context, scanResult: GmsDocumentScanningResult) {
        val pages = scanResult.pages
        if (pages.isNullOrEmpty()) {
            _uiState.value = ScanUiState.Error("No invoice pages captured.")
            return
        }

        val imageUri = pages[0].imageUri
        processImageUri(context, imageUri)
    }

    fun processImageUri(context: Context, uri: Uri) {
        viewModelScope.launch {
            _uiState.value = ScanUiState.ScanningWithGemini
            try {
                val inputStream = context.contentResolver.openInputStream(uri)
                val bitmap = BitmapFactory.decodeStream(inputStream)
                inputStream?.close()

                if (bitmap == null) {
                    _uiState.value = ScanUiState.Error("Could not decode scanned image.")
                    return@launch
                }

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
                    _uiState.value = ScanUiState.Error(error.localizedMessage ?: "Gemini invoice scan failed.")
                }
            } catch (e: Exception) {
                _uiState.value = ScanUiState.Error(e.localizedMessage ?: "Unknown scanning error.")
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
}
