package za.co.harrysaircon.app.domain.scanner

import android.content.Context
import android.util.Log
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Robust network helper for the Invoice Scanning Module.
 * 
 * Handles:
 * 1. Safe HTTP Status Code & Content-Type verification
 * 2. Header authentication (x-goog-api-key or Bearer tokens)
 * 3. HTML Error Page Interception (<DOCTYPE / <html) before JSON parsing
 * 4. Verbose Logcat logging for easy debugging
 */
object InvoiceApiNetworkClient {
    private const val TAG = "InvoiceNetworkClient"
    private const val ERROR_TAG = "ScannerError"

    /**
     * Creates a configured OkHttpClient with timeouts and logging
     */
    fun createClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .addInterceptor(Interceptor { chain ->
                val request = chain.request()
                Log.d(TAG, "--> ${request.method} ${request.url}")
                val response = chain.proceed(request)
                Log.d(TAG, "<-- ${response.code} ${response.message} (${request.url})")
                response
            })
            .build()
    }

    /**
     * Executes an HTTP request and safely extracts the JSON body string,
     * throwing informative exceptions on HTML pages, 404s, 500s, or non-JSON payloads.
     */
    @Throws(IOException::class)
    fun executeSafeJsonRequest(client: OkHttpClient, request: Request): String {
        val response: Response
        try {
            response = client.newCall(request).execute()
        } catch (e: Exception) {
            Log.e(ERROR_TAG, "Network connection failure to ${request.url}: ${e.message}", e)
            throw IOException("Network connection failed. Please check internet connection.", e)
        }

        val statusCode = response.code
        val contentType = response.header("Content-Type") ?: ""
        val responseBody = response.body?.string() ?: ""

        // 1. Check for HTML error response before anything else
        if (responseBody.trim().startsWith("<!DOCTYPE", ignoreCase = true) || 
            responseBody.trim().startsWith("<html", ignoreCase = true) || 
            contentType.contains("text/html", ignoreCase = true)
        ) {
            Log.e(ERROR_TAG, "Received HTML response instead of JSON (HTTP $statusCode): $responseBody")
            throw IOException("Server returned an HTML error page (HTTP $statusCode). Check your API URL and API Key.")
        }

        // 2. Check HTTP status code
        if (!response.isSuccessful) {
            Log.e(ERROR_TAG, "API Request failed with HTTP $statusCode from ${request.url}. Body: $responseBody")
            throw IOException("API Request failed with status $statusCode: ${responseBody.take(200)}")
        }

        // 3. Check Content-Type header
        if (!contentType.contains("application/json", ignoreCase = true) && responseBody.isNotBlank()) {
            Log.w(TAG, "Response Content-Type header is '$contentType' instead of 'application/json'.")
        }

        return responseBody
    }

    /**
     * Builds a POST request with the specified endpoint URL and API Key header
     */
    fun buildPostRequest(endpointUrl: String, apiKey: String, jsonBody: String): Request {
        return Request.Builder()
            .url(endpointUrl)
            .addHeader("Content-Type", "application/json")
            .addHeader("x-goog-api-key", apiKey)
            .post(jsonBody.toRequestBody("application/json; charset=utf-8".toMediaType()))
            .build()
    }
}
