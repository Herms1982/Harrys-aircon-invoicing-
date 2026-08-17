import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Shared Gemini client instance generator
  const getAi = () => {
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Robust helper to run generative models with fallback
  const generateWithFallback = async (params: {
    contents: any;
    config?: any;
    fallbackModels?: string[];
  }) => {
    const ai = getAi();
    const models = [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
    ];
    let lastError: any = null;

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        console.warn(`[AI Model Fallback] Model ${model} failed:`, err.message);
        lastError = err;
      }
    }
    throw lastError || new Error('All AI models unavailable');
  };

  // API Route: AI Health check
  app.get('/api/ai/health', (req, res) => {
    res.json({ status: 'ok', hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // API Route: Smart HVAC & Solar Fault Diagnostic Assistant
  app.post('/api/ai/diagnose', async (req, res) => {
    try {
      const { description, category, equipment } = req.body;

      const prompt = `You are an expert master HVAC, Electrical, and Solar engineer assisting a field technician for Harry's Aircon Electrical and Solar services in South Africa.
System Domain: ${category || 'Aircon & Electrical'}
Equipment / Brand: ${equipment || 'General unit'}
Reported Issue / Symptoms: ${description}

Provide a concise, practical JSON diagnosis and guidance:
1. "diagnosis": Root cause summary and likely fault.
2. "troubleshooting": List of 3 to 5 physical checks/measurements to perform on site.
3. "recommendedParts": List of recommended spare parts or consumables to fetch from inventory.
4. "estimatedLaborHours": Estimated repair labor duration in hours.
5. "invoiceSummary": Professional 2-sentence description of the service to add to customer quote/invoice.
`;

      const response = await generateWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              diagnosis: { type: Type.STRING },
              troubleshooting: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommendedParts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              estimatedLaborHours: { type: Type.NUMBER },
              invoiceSummary: { type: Type.STRING },
            },
            required: ['diagnosis', 'troubleshooting', 'recommendedParts', 'estimatedLaborHours', 'invoiceSummary'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (err: any) {
      console.error('Gemini Diagnose Error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate AI diagnosis.' });
    }
  });

  // API Route: Field Notes / Raw Voice Note AI Job Parser
  app.post('/api/ai/parse-note', async (req, res) => {
    try {
      const { rawText, availableStock } = req.body;

      const prompt = `You are an intelligent callout logger for Harry's Aircon Electrical & Solar services.
Extract structured job and client details from these technician field notes:
"${rawText}"

Available Parts Stock Catalog:
${JSON.stringify(availableStock || [])}

Rules:
1. Extract client name, phone number, and physical address if mentioned.
2. Create a concise job title and select appropriate category strictly from: "Electrical", "Solar", "Refrigeration", "Air Conditioning", "Security and CCTV".
3. Provide a clear work summary description.
4. Match mentioned materials to item IDs in the parts catalog if possible. Return matched or new parts with quantity used and realistic unit price in South African Rand (ZAR).
5. Estimate labor hours based on description.
`;

      const response = await generateWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clientName: { type: Type.STRING },
              clientPhone: { type: Type.STRING },
              clientAddress: { type: Type.STRING },
              jobTitle: { type: Type.STRING },
              category: { type: Type.STRING },
              description: { type: Type.STRING },
              laborHours: { type: Type.NUMBER },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stockItemId: { type: Type.STRING },
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitPrice: { type: Type.NUMBER },
                  },
                  required: ['name', 'quantity', 'unitPrice'],
                },
              },
            },
            required: ['jobTitle', 'category', 'description', 'laborHours', 'items'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (err: any) {
      console.error('Gemini Parse Note Error:', err);
      res.status(500).json({ error: err.message || 'Failed to parse notes with AI.' });
    }
  });

  // API Route: Scan Purchase Invoice / Supplier Slip for Inventory Restock & Stock Addition
  app.post('/api/ai/scan-purchase-invoice', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', catalog = [] } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Invoice image data is required.' });
      }

      // Clean base64 data (strip data URL prefix if present)
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

      // Simplify catalog to minimize prompt tokens while maintaining matching precision
      const catalogSummary = (catalog || []).map((item: any) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        costPrice: item.costPrice,
        sellPrice: item.sellPrice,
        unit: item.unit,
        currentQty: item.quantity,
      }));

      const systemPrompt = `You are an expert South African HVAC, Electrical, Solar, and Refrigeration trade invoice parser and stock inventory auditor.
Your job is to accurately read scanned supplier purchase tax invoices, cash receipts, and delivery slips (e.g. from Voltex, ACDC Dynamics, ARB Electrical, Plumblink, Builders Warehouse, Metraclark, Eurocool, Tecsa Reco, Solar suppliers, etc.).

CRITICAL KNOWLEDGE REGARDING SUPPLIER ITEM NAMING:
Different suppliers and wholesalers name identical trade items differently using abbreviations, codes, or brand prefixes.
Examples of equivalent names to reconcile:
- "16A 1P MCB 3KA" / "CB1-16" / "DIN CIRCUIT BREAKER 16A 1POLE" <---> "16A Single Pole Circuit Breaker (C-Curve 3kA)"
- "45+5 MFD 440V ROUND" / "CAP DUAL 45/5UF 440V" <---> "Dual Run Capacitor 45/5 uF 440V"
- "R410A GAS 11.3KG" / "R410A CYL 11.3KG REFRIG" <---> "Refrigerant R410A 11.3kg Cylinder"
- "CONT 25A 2P 230V" / "CONTACTOR 25A 230V 1P+N" <---> "AC Contactor 25A 2-Pole 230V"
- "2.5MM TW+E 100M BLK" / "SURFIX 2.5MM 100M" <---> "2.5mm² Flat Twin & Earth Cable (100m Roll)"
- "SOLAR MC4 CONN M/F" / "MC4-PAIR" <---> "MC4 Solar Connectors Male/Female Set"
- "12WAY FLUSH DB WHITE" / "DB-F12" <---> "12-Way Flush Mount Distribution Board"
- "ISOLATOR 32A 3P W/P" <---> "32A Triple Pole Weatherproof Isolator"

EXISTING INVENTORY CATALOG:
${JSON.stringify(catalogSummary, null, 2)}

TASK:
1. Extract the supplier/store name (e.g. "Voltex", "ACDC Dynamics", "ARB Electrical", "Builders Warehouse", "Plumblink", "Metraclark", etc.).
2. Extract the invoice / slip number (e.g. "INV-109284") and invoice date (YYYY-MM-DD format if readable).
3. Extract every line item purchased:
   - "rawDescription": Exact text as printed on the supplier invoice.
   - "supplierSku": Supplier item/part code if visible (e.g. "CB1-16").
   - "quantity": Number of units purchased.
   - "unitCost": Net unit cost price in South African Rand (ZAR) before VAT/tax (or totalLineCost / quantity).
   - "totalCost": Line total cost amount.
   - "suggestedName": Clean, professional, standardized trade name for South African trades (e.g. "16A Single Pole Circuit Breaker (C-Curve 3kA)").
   - "suggestedCategory": Choose strictly from the 5 standard categories: "Electrical", "Solar", "Refrigeration", "Air Conditioning", "Security and CCTV".
   - "suggestedUnit": Unit of measure (e.g. "pcs", "m", "roll", "box", "kg", "cylinder", "set", "pack").
   - "suggestedSellPrice": Suggested retail sell price to clients (calculated as unitCost * 1.35 for a standard 35% trade markup, rounded to a clean number).
   - "matchedStockId": If this invoice item matches an item in the EXISTING INVENTORY CATALOG above (even if named slightly differently by the supplier), provide that exact catalog item 'id'. If it is a new item not in catalog, leave as null or empty string.
   - "matchConfidence": "EXACT" | "HIGH" | "MEDIUM" | "LOW" | "NONE".
   - "matchReason": A concise 1-sentence note explaining the match or why it is a new item (e.g. "Matched 'CB1-16' to catalog item '16A Single Pole Circuit Breaker'").

4. Ignore non-inventory rows like payment tender lines or cash change, but keep courier/delivery charges as a separate line with category "Consumables" or mark as low confidence.
`;

      const imagePart = {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      };

      const response = await generateWithFallback({
        contents: [imagePart, { text: systemPrompt }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              supplierName: { type: Type.STRING },
              invoiceNumber: { type: Type.STRING },
              invoiceDate: { type: Type.STRING },
              totalInvoiceAmount: { type: Type.NUMBER },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    rawDescription: { type: Type.STRING },
                    supplierSku: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitCost: { type: Type.NUMBER },
                    totalCost: { type: Type.NUMBER },
                    suggestedName: { type: Type.STRING },
                    suggestedCategory: { type: Type.STRING },
                    suggestedUnit: { type: Type.STRING },
                    suggestedSellPrice: { type: Type.NUMBER },
                    matchedStockId: { type: Type.STRING },
                    matchConfidence: { type: Type.STRING },
                    matchReason: { type: Type.STRING },
                  },
                  required: [
                    'rawDescription',
                    'quantity',
                    'unitCost',
                    'totalCost',
                    'suggestedName',
                    'suggestedCategory',
                    'suggestedUnit',
                    'suggestedSellPrice',
                    'matchConfidence',
                  ],
                },
              },
            },
            required: ['supplierName', 'invoiceNumber', 'invoiceDate', 'items'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (err: any) {
      console.error('Gemini Scan Purchase Invoice Error:', err);
      res.status(500).json({ error: err.message || 'Failed to scan purchase invoice with AI.' });
    }
  });

  // API Route: AI Customer Communication & Payment Reminder Generator
  app.post('/api/ai/generate-message', async (req, res) => {
    try {
      const { type, job, client, businessName, bankingDetails } = req.body;

      const bankInfo = bankingDetails || {
        accountName: 'Harrys aircon and Electrical',
        accountNumber: '53002734919',
        accountType: 'Current Business',
        bankName: 'First National Bank (FNB)',
        branchCode: '250655',
      };

      const prompt = `You are a courteous customer communication manager for ${businessName || "Harry's Aircon Electrical and Solar services"}.
Generate a professional, polite message for message purpose "${type}" (e.g. quote_send, invoice_ready, payment_reminder, service_completion, seasonal_maintenance).

Callout Job Context:
- Invoice #: ${job?.invoiceNumber || 'INV-000'}
- Job Title: ${job?.title || 'Service Callout'}
- Client Name: ${client?.name || job?.clientName || 'Valued Client'}
- Total Amount: R${job?.totalAmount ? Number(job.totalAmount).toFixed(2) : '0.00'}
- Status: ${job?.status || 'Draft'}
- Due Date: ${job?.dueDate || 'On Receipt'}

Banking Details for EFT:
- Account Name: ${bankInfo.accountName}
- Account Number: ${bankInfo.accountNumber}
- Account Type: ${bankInfo.accountType}
- Bank: ${bankInfo.bankName} (Branch: ${bankInfo.branchCode})
- Reference: ${job?.invoiceNumber || 'Invoice #'}

Format requirements:
- Warm, polite tone suitable for WhatsApp or Email.
- Highlight invoice/quote total in South African Rand (R).
- If type is invoice_ready, quote_send, or payment_reminder, clearly include the EFT banking details for payment.
- Keep it concise, ready to copy and send to the customer.
`;

      const response = await generateWithFallback({
        contents: prompt,
      });

      res.json({ message: response.text });
    } catch (err: any) {
      console.error('Gemini Generate Message Error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate AI message.' });
    }
  });

  // Vite middleware for development vs Static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
