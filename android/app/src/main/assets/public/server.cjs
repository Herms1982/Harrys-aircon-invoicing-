var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  const getAi = () => {
    return new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  };
  app.get("/api/ai/health", (req, res) => {
    res.json({ status: "ok", hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
  });
  app.post("/api/ai/diagnose", async (req, res) => {
    try {
      const { description, category, equipment } = req.body;
      const ai = getAi();
      const prompt = `You are an expert master HVAC, Electrical, and Solar engineer assisting a field technician for Harry's Aircon Electrical and Solar services in South Africa.
System Domain: ${category || "Aircon & Electrical"}
Equipment / Brand: ${equipment || "General unit"}
Reported Issue / Symptoms: ${description}

Provide a concise, practical JSON diagnosis and guidance:
1. "diagnosis": Root cause summary and likely fault.
2. "troubleshooting": List of 3 to 5 physical checks/measurements to perform on site.
3. "recommendedParts": List of recommended spare parts or consumables to fetch from inventory.
4. "estimatedLaborHours": Estimated repair labor duration in hours.
5. "invoiceSummary": Professional 2-sentence description of the service to add to customer quote/invoice.
`;
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              diagnosis: { type: import_genai.Type.STRING },
              troubleshooting: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING }
              },
              recommendedParts: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING }
              },
              estimatedLaborHours: { type: import_genai.Type.NUMBER },
              invoiceSummary: { type: import_genai.Type.STRING }
            },
            required: ["diagnosis", "troubleshooting", "recommendedParts", "estimatedLaborHours", "invoiceSummary"]
          }
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err) {
      console.error("Gemini Diagnose Error:", err);
      res.status(500).json({ error: err.message || "Failed to generate AI diagnosis." });
    }
  });
  app.post("/api/ai/parse-note", async (req, res) => {
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
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              clientName: { type: import_genai.Type.STRING },
              clientPhone: { type: import_genai.Type.STRING },
              clientAddress: { type: import_genai.Type.STRING },
              jobTitle: { type: import_genai.Type.STRING },
              category: { type: import_genai.Type.STRING },
              description: { type: import_genai.Type.STRING },
              laborHours: { type: import_genai.Type.NUMBER },
              items: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    stockItemId: { type: import_genai.Type.STRING },
                    name: { type: import_genai.Type.STRING },
                    quantity: { type: import_genai.Type.NUMBER },
                    unitPrice: { type: import_genai.Type.NUMBER }
                  },
                  required: ["name", "quantity", "unitPrice"]
                }
              }
            },
            required: ["jobTitle", "category", "description", "laborHours", "items"]
          }
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err) {
      console.error("Gemini Parse Note Error:", err);
      res.status(500).json({ error: err.message || "Failed to parse notes with AI." });
    }
  });
  app.post("/api/ai/generate-message", async (req, res) => {
    try {
      const { type, job, client, businessName } = req.body;
      const ai = getAi();
      const prompt = `You are a courteous customer communication manager for ${businessName || "Harry's Aircon Electrical and Solar services"}.
Generate a professional, polite message for message purpose "${type}" (e.g. quote_send, invoice_ready, payment_reminder, service_completion, seasonal_maintenance).

Callout Job Context:
- Invoice #: ${job?.invoiceNumber || "INV-000"}
- Job Title: ${job?.title || "Service Callout"}
- Client Name: ${client?.name || job?.clientName || "Valued Client"}
- Total Amount: R${job?.totalAmount ? Number(job.totalAmount).toFixed(2) : "0.00"}
- Status: ${job?.status || "Draft"}
- Due Date: ${job?.dueDate || "On Receipt"}

Format requirements:
- Warm, polite tone suitable for WhatsApp or Email.
- Highlight invoice total in South African Rand (R).
- Keep it concise, ready to copy and send to the customer.
`;
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });
      res.json({ message: response.text });
    } catch (err) {
      console.error("Gemini Generate Message Error:", err);
      res.status(500).json({ error: err.message || "Failed to generate AI message." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
