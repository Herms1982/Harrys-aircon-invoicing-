package za.co.harrysaircon.app.ui.screens

import android.app.Activity
import android.graphics.Bitmap
import android.net.Uri
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import za.co.harrysaircon.app.data.repository.MatchType
import za.co.harrysaircon.app.data.repository.ReconciledReviewItem
import za.co.harrysaircon.app.domain.scanner.ImageUtils
import za.co.harrysaircon.app.ui.viewmodel.InvoiceToStockSyncViewModel
import za.co.harrysaircon.app.ui.viewmodel.ScanUiState

private const val TAG = "ScanInvoiceScreen"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScanInvoiceScreen(
    viewModel: InvoiceToStockSyncViewModel,
    apiKey: String,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    var selectedBitmap by remember { mutableStateOf<Bitmap?>(null) }

    // Launcher for ML Kit Document Scanner
    val scannerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartIntentSenderForResult()
    ) { activityResult ->
        if (activityResult.resultCode == Activity.RESULT_OK) {
            val gmsResult = GmsDocumentScanningResult.fromActivityResultIntent(activityResult.data)
            val uri = gmsResult?.pages?.firstOrNull()?.imageUri
            if (uri != null) {
                val bitmap = ImageUtils.decodeAndScaleBitmapFromUri(context, uri, maxDimension = 1024)
                selectedBitmap = bitmap
            }
        }
    }

    // Launcher for Photo Gallery Selection
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            val bitmap = ImageUtils.decodeAndScaleBitmapFromUri(context, uri, maxDimension = 1024)
            selectedBitmap = bitmap
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Invoice AI Scanner", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.surface)
        ) {
            when (val state = uiState) {
                is ScanUiState.Idle -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        if (selectedBitmap == null) {
                            Icon(
                                imageVector = Icons.Default.DocumentScanner,
                                contentDescription = null,
                                modifier = Modifier.size(80.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                "Supplier Invoice Scanner",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                "Capture or select a photo of a trade purchase invoice to parse with the native Gemini SDK.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(28.dp))

                            Button(
                                onClick = {
                                    val scanner = viewModel.createDocumentScanner(context)
                                    scanner.getStartScanIntent(context as Activity)
                                        .addOnSuccessListener { intentSender ->
                                            scannerLauncher.launch(
                                                IntentSenderRequest.Builder(intentSender).build()
                                            )
                                        }
                                },
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier
                                    .fillMaxWidth(0.85f)
                                    .height(52.dp)
                            ) {
                                Icon(Icons.Default.DocumentScanner, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Capture with Camera", fontWeight = FontWeight.Bold)
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedButton(
                                onClick = { galleryLauncher.launch("image/*") },
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier
                                    .fillMaxWidth(0.85f)
                                    .height(52.dp)
                            ) {
                                Icon(Icons.Default.PhotoLibrary, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Choose from Gallery", fontWeight = FontWeight.Bold)
                            }
                        } else {
                            // Selected Photo Preview
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f, fill = false)
                                    .heightIn(max = 350.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Image(
                                    bitmap = selectedBitmap!!.asImageBitmap(),
                                    contentDescription = "Invoice Preview",
                                    modifier = Modifier.fillMaxSize()
                                )
                            }

                            Spacer(modifier = Modifier.height(20.dp))

                            // DIRECT Gemini SDK ONCLICK BUTTON (No HTTP / Retrofit)
                            Button(
                                onClick = {
                                    val currentBitmap = selectedBitmap
                                    if (currentBitmap == null) {
                                        Toast.makeText(context, "Please select an image first", Toast.LENGTH_SHORT).show()
                                        return@Button
                                    }

                                    if (apiKey.isBlank()) {
                                        Log.e(TAG, "Gemini API Key is blank! Please configure BuildConfig.GEMINI_API_KEY")
                                        Toast.makeText(context, "Missing Gemini API Key. Please check settings.", Toast.LENGTH_LONG).show()
                                        return@Button
                                    }

                                    Log.d(TAG, "Triggering direct Gemini SDK extraction via processInvoiceImageWithSdk")
                                    viewModel.processBitmapWithSdk(context, currentBitmap, apiKey)
                                },
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(54.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                            ) {
                                Icon(Icons.Default.AutoAwesome, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Process Invoice with AI", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            TextButton(onClick = { selectedBitmap = null }) {
                                Text("Choose Different Image")
                            }
                        }
                    }
                }

                is ScanUiState.ScanningWithGemini -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Reading invoice with native Gemini 1.5 Flash SDK...", fontWeight = FontWeight.SemiBold)
                        Text("Extracting supplier and line items directly on device", color = Color.Gray, fontSize = 13.sp)
                    }
                }

                is ScanUiState.Review -> {
                    Column(modifier = Modifier.fillMaxSize()) {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = state.supplierName,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Inv #: ${state.invoiceNumber.ifBlank { "N/A" }} | Date: ${state.invoiceDate}",
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }

                        Text(
                            text = "Detected Items (${state.items.count { it.isSelectedForUpdate }} selected)",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                        )

                        LazyColumn(
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(state.items, key = { it.id }) { item ->
                                InvoiceReviewItemCard(
                                    item = item,
                                    onToggle = { viewModel.toggleItemSelection(item.id) }
                                )
                            }
                        }

                        Surface(
                            shadowElevation = 8.dp,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Button(
                                onClick = { viewModel.confirmAndUpdateStock() },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                                    .height(52.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A))
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Confirm & Update Stock", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                        }
                    }
                }

                is ScanUiState.Success -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF16A34A),
                            modifier = Modifier.size(72.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "Stock Updated Successfully!",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "${state.itemsUpdatedCount} stock items restocked in Room database.",
                            color = Color.Gray
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        Button(onClick = { 
                            selectedBitmap = null
                            viewModel.resetState() 
                        }) {
                            Text("Scan Another Invoice")
                        }
                    }
                }

                is ScanUiState.Error -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("Scan Failed", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.error)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(state.message, color = Color.Gray)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.resetState() }) {
                            Icon(Icons.Default.Refresh, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Try Again")
                        }
                    }
                }
            }
        }
    }
}
