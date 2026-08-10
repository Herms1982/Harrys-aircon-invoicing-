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

  // API Route: AI Health check
  app.get('/api/ai/health', (req, res) => {
    res.json({ status: 'ok', hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // API Route: Smart HVAC & Solar Fault Diagnostic Assistant
  app.post('/api/ai/diagnose', async (req, res) => {
    try {
      const { description, category, equipment } = req.body;
      const ai = getAi();

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

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
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
      const ai = getAi();

      const prompt = `You are an intelligent callout logger for Harry's Aircon Electrical & Solar services.
Extract structured job and client details from these technician field notes:
"${rawText}"

Available Parts Stock Catalog:
${JSON.stringify(availableStock || [])}

Rules:
1. Extract client name, phone number, and physical address if mentioned.
2. Create a concise job title and select appropriate category: "Aircon", "Electrical", "Solar", "Refrigeration", "Maintenance", "Repair", "Installation", "Inspection".
3. Provide a clear work summary description.
4. Match mentioned materials to item IDs in the parts catalog if possible. Return matched or new parts with quantity used and realistic unit price in South African Rand (ZAR).
5. Estimate labor hours based on description.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
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

  // API Route: AI Customer Communication & Payment Reminder Generator
  app.post('/api/ai/generate-message', async (req, res) => {
    try {
      const { type, job, client, businessName } = req.body;
      const ai = getAi();

      const prompt = `You are a courteous customer communication manager for ${businessName || "Harry's Aircon Electrical and Solar services"}.
Generate a professional, polite message for message purpose "${type}" (e.g. quote_send, invoice_ready, payment_reminder, service_completion, seasonal_maintenance).

Callout Job Context:
- Invoice #: ${job?.invoiceNumber || 'INV-000'}
- Job Title: ${job?.title || 'Service Callout'}
- Client Name: ${client?.name || job?.clientName || 'Valued Client'}
- Total Amount: R${job?.totalAmount ? Number(job.totalAmount).toFixed(2) : '0.00'}
- Status: ${job?.status || 'Draft'}
- Due Date: ${job?.dueDate || 'On Receipt'}

Format requirements:
- Warm, polite tone suitable for WhatsApp or Email.
- Highlight invoice total in South African Rand (R).
- Keep it concise, ready to copy and send to the customer.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
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
