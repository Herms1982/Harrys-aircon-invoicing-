package za.co.harrysaircon.app.ui.screens

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CameraAlt
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
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import za.co.harrysaircon.app.data.repository.ReconciledReviewItem
import za.co.harrysaircon.app.domain.scanner.ImageUtils
import za.co.harrysaircon.app.ui.viewmodel.InvoiceToStockSyncViewModel
import za.co.harrysaircon.app.ui.viewmodel.ScanUiState
import java.io.File

private const val TAG = "ScanInvoiceScreen"

/**
 * Creates a secure temporary file URI using FileProvider for direct camera captures.
 */
private fun createTempImageUri(context: Context): Uri? {
    return try {
        val storageDir = File(context.cacheDir, "camera_captures").apply {
            if (!exists()) mkdirs()
        }
        val tempFile = File.createTempFile("invoice_capture_", ".jpg", storageDir).apply {
            createNewFile()
            deleteOnExit()
        }
        FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            tempFile
        )
    } catch (e: Exception) {
        Log.e(TAG, "Error creating temporary file for camera capture: ${e.message}", e)
        null
    }
}

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
    var tempPhotoUri by remember { mutableStateOf<Uri?>(null) }
    var pendingCameraLaunch by remember { mutableStateOf(false) }

    // 1. Direct Camera Capture Launcher (Takes high-resolution photo straight to FileProvider Uri)
    val takePictureLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && tempPhotoUri != null) {
            try {
                Log.d(TAG, "Camera photo captured successfully to $tempPhotoUri. Decoding...")
                val bitmap = ImageUtils.decodeAndScaleBitmapFromUri(
                    context = context,
                    uri = tempPhotoUri!!,
                    maxDimension = 1024
                )
                if (bitmap != null) {
                    selectedBitmap = bitmap
                    Toast.makeText(context, "Invoice photo captured! Tap 'Process Invoice with AI' to analyze.", Toast.LENGTH_SHORT).show()
                } else {
                    val errorMsg = "Could not decode photo from camera."
                    Log.e(TAG, errorMsg)
                    Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing camera capture: ${e.message}", e)
                Toast.makeText(context, "Failed to load camera image: ${e.message}", Toast.LENGTH_LONG).show()
            }
        } else {
            Log.d(TAG, "Camera capture cancelled or failed.")
        }
    }

    // Helper to start the native Camera
    val launchDirectCamera: () -> Unit = {
        val uri = createTempImageUri(context)
        if (uri != null) {
            tempPhotoUri = uri
            takePictureLauncher.launch(uri)
        } else {
            val err = "Unable to create secure storage file for camera photo."
            Log.e(TAG, err)
            Toast.makeText(context, err, Toast.LENGTH_LONG).show()
        }
    }

    // 2. Runtime Camera Permission Request Launcher
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            Log.d(TAG, "Camera permission granted by user.")
            if (pendingCameraLaunch) {
                pendingCameraLaunch = false
                launchDirectCamera()
            }
        } else {
            pendingCameraLaunch = false
            Log.w(TAG, "Camera permission was denied by user.")
            Toast.makeText(
                context,
                "Camera permission is required to photograph invoices. Please grant permission in Settings.",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    // Function to trigger direct camera with permission verification
    val onTakePhotoClicked: () -> Unit = {
        val permissionCheck = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
        if (permissionCheck == PackageManager.PERMISSION_GRANTED) {
            launchDirectCamera()
        } else {
            pendingCameraLaunch = true
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    // 3. Photo Gallery Selection Launcher (Backup option)
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            try {
                val bitmap = ImageUtils.decodeAndScaleBitmapFromUri(context, uri, maxDimension = 1024)
                if (bitmap != null) {
                    selectedBitmap = bitmap
                } else {
                    Toast.makeText(context, "Failed to decode selected image.", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error opening gallery image", e)
                Toast.makeText(context, "Error loading image: ${e.message}", Toast.LENGTH_LONG).show()
            }
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
                                "Take a photo of a trade purchase invoice to parse line items using the native Gemini 1.5 Flash SDK.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(28.dp))

                            // DIRECT CAMERA BUTTON WITH RUNTIME PERMISSION
                            Button(
                                onClick = onTakePhotoClicked,
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier
                                    .fillMaxWidth(0.9f)
                                    .height(54.dp)
                            ) {
                                Icon(Icons.Default.CameraAlt, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Take Photo with Camera", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedButton(
                                onClick = { galleryLauncher.launch("image/*") },
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier
                                    .fillMaxWidth(0.9f)
                                    .height(54.dp)
                            ) {
                                Icon(Icons.Default.PhotoLibrary, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Choose from Gallery", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            }
                        } else {
                            // Selected Photo Preview
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f, fill = false)
                                    .heightIn(max = 360.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Image(
                                    bitmap = selectedBitmap!!.asImageBitmap(),
                                    contentDescription = "Invoice Photo Preview",
                                    modifier = Modifier.fillMaxSize()
                                )
                            }

                            Spacer(modifier = Modifier.height(20.dp))

                            // DIRECT Gemini SDK ONCLICK BUTTON (With full try-catch and Toast error reporting)
                            Button(
                                onClick = {
                                    val currentBitmap = selectedBitmap
                                    if (currentBitmap == null) {
                                        Toast.makeText(context, "Please take or select an invoice photo first.", Toast.LENGTH_SHORT).show()
                                        return@Button
                                    }

                                    if (apiKey.isBlank()) {
                                        val errorMsg = "Gemini API Key is missing. Please check your configuration."
                                        Log.e(TAG, errorMsg)
                                        Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
                                        return@Button
                                    }

                                    try {
                                        Log.d(TAG, "Initiating Gemini SDK extraction on bitmap (${currentBitmap.width}x${currentBitmap.height})")
                                        viewModel.processBitmapWithSdk(context, currentBitmap, apiKey)
                                    } catch (e: Exception) {
                                        Log.e(TAG, "Error starting invoice scan: ${e.message}", e)
                                        val failureMsg = "Scan initiation failed: ${e.localizedMessage ?: e.message}"
                                        Toast.makeText(context, failureMsg, Toast.LENGTH_LONG).show()
                                    }
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

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceEvenly
                            ) {
                                TextButton(onClick = onTakePhotoClicked) {
                                    Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Retake Photo")
                                }
                                TextButton(onClick = { selectedBitmap = null }) {
                                    Text("Clear")
                                }
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
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Extracting supplier, line items, and prices directly on device", color = Color.Gray, fontSize = 13.sp)
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
                                onClick = {
                                    try {
                                        viewModel.confirmAndUpdateStock()
                                    } catch (e: Exception) {
                                        Log.e(TAG, "Error updating stock", e)
                                        Toast.makeText(context, "Failed to update stock: ${e.message}", Toast.LENGTH_LONG).show()
                                    }
                                },
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
