import { StockItem, CalloutJob, Client } from '../types';

export interface AIDiagnosisResult {
  diagnosis: string;
  troubleshooting: string[];
  recommendedParts: string[];
  estimatedLaborHours: number;
  invoiceSummary: string;
}

export interface AIParsedNoteResult {
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  jobTitle?: string;
  category?: string;
  description?: string;
  laborHours?: number;
  items?: Array<{
    stockItemId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export async function fetchAIDiagnosis(
  description: string,
  category: string,
  equipment: string
): Promise<AIDiagnosisResult> {
  const res = await fetch('/api/ai/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, category, equipment }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to generate AI diagnosis');
  }

  return res.json();
}

export async function parseFieldNotesWithAI(
  rawText: string,
  availableStock: StockItem[]
): Promise<AIParsedNoteResult> {
  const res = await fetch('/api/ai/parse-note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, availableStock }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to parse field notes with AI');
  }

  return res.json();
}

export async function generateAICustomerMessage(
  type: 'quote_send' | 'invoice_ready' | 'payment_reminder' | 'service_completion' | 'seasonal_maintenance',
  job?: CalloutJob | null,
  client?: Client | null,
  businessName?: string
): Promise<string> {
  const res = await fetch('/api/ai/generate-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, job, client, businessName }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to generate customer message');
  }

  const data = await res.json();
  return data.message || '';
}
