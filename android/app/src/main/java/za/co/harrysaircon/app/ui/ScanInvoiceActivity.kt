package za.co.harrysaircon.app.ui

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import za.co.harrysaircon.app.data.local.HarrysAirconDatabase
import za.co.harrysaircon.app.data.repository.StockSyncRepository
import za.co.harrysaircon.app.domain.scanner.InvoiceScannerService
import za.co.harrysaircon.app.ui.screens.ScanInvoiceScreen
import za.co.harrysaircon.app.ui.viewmodel.InvoiceToStockSyncViewModel

class ScanInvoiceActivity : ComponentActivity() {

    private val apiKey: String by lazy {
        // Reads from BuildConfig or local properties if defined
        try {
            val buildConfigClass = Class.forName("za.co.harrysaircon.app.BuildConfig")
            val field = buildConfigClass.getField("GEMINI_API_KEY")
            field.get(null) as? String ?: ""
        } catch (e: Exception) {
            Log.w("ScanInvoiceActivity", "BuildConfig.GEMINI_API_KEY not found reflectively, check manifest or local configs", e)
            ""
        }
    }

    private val viewModel: InvoiceToStockSyncViewModel by lazy {
        val db = HarrysAirconDatabase.getDatabase(applicationContext)
        val repo = StockSyncRepository(db.stockDao())
        val scannerService = InvoiceScannerService(apiKey)
        ViewModelProvider(this, object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return InvoiceToStockSyncViewModel(scannerService, repo) as T
            }
        })[InvoiceToStockSyncViewModel::class.java]
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ScanInvoiceScreen(
                viewModel = viewModel,
                apiKey = apiKey
            )
        }
    }
}
