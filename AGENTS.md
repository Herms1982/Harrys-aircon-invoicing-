# Project Context & Target Repository

## GitHub Repository
- **Target Repository:** `Herms1982/Harrys-aircon-invoicing`
- **Application Name:** Harry's Aircon Invoicing & Job Management System

## Architecture Overview
1. **Web / Hybrid Frontend & Server:**
   - React 19 + TypeScript + Vite + Tailwind CSS
   - Express server (`server.ts`) with Gemini 2.5 Flash API routes for diagnostic assistance, field notes parsing, and quote/invoice generation.
   - Comprehensive HVAC stock management, invoice creation, PDF generation, customer messaging, and field reporting.

2. **Android Native Module (`/android`):**
   - Jetpack Compose UI (`ScanInvoiceScreen.kt`, `InvoiceStockReviewScreen.kt`)
   - Google ML Kit Document Scanner integration
   - Direct Google Generative AI Client SDK (`com.google.ai.client.generativeai`) with `gemini-1.5-flash` for scanning purchase invoices and auto-reconciling stock
   - Local Room Database (`HarrysAirconDatabase`, `StockDao`, `StockEntity`) for offline inventory persistence.
