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
  businessName?: string,
  bankingDetails?: {
    accountName?: string;
    accountNumber?: string;
    accountType?: string;
    bankName?: string;
    branchCode?: string;
  }
): Promise<string> {
  const res = await fetch('/api/ai/generate-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, job, client, businessName, bankingDetails }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to generate customer message');
  }

  const data = await res.json();
  return data.message || '';
}

export interface ScannedInvoiceItem {
  rawDescription: string;
  supplierSku?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  suggestedName: string;
  suggestedCategory: string;
  suggestedUnit: string;
  suggestedSellPrice: number;
  matchedStockId?: string | null;
  matchConfidence: 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  matchReason?: string;
  // Review & action state
  selectedAction: 'RESTOCK_EXISTING' | 'CREATE_NEW' | 'IGNORE';
  chosenStockId?: string;
  customName: string;
  customQty: number;
  customCostPrice: number;
  customSellPrice: number;
  customCategory: string;
  customUnit: string;
  updateCatalogCostPrice: boolean;
  rememberMapping: boolean;
}

export interface ScannedInvoiceResult {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalInvoiceAmount?: number;
  items: ScannedInvoiceItem[];
}

export async function scanPurchaseInvoiceWithAI(
  imageBase64: string,
  mimeType: string,
  catalog: StockItem[]
): Promise<ScannedInvoiceResult> {
  const res = await fetch('/api/ai/scan-purchase-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType, catalog }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to scan purchase invoice with AI');
  }

  const data = await res.json();
  
  // Transform raw items to include default action states for user review
  const transformedItems: ScannedInvoiceItem[] = (data.items || []).map((raw: any) => {
    const hasMatch = Boolean(raw.matchedStockId && raw.matchConfidence !== 'NONE');
    const matchedItem = hasMatch ? catalog.find((c) => c.id === raw.matchedStockId) : null;

    const action: 'RESTOCK_EXISTING' | 'CREATE_NEW' | 'IGNORE' = matchedItem
      ? 'RESTOCK_EXISTING'
      : 'CREATE_NEW';

    const cost = typeof raw.unitCost === 'number' && raw.unitCost > 0
      ? raw.unitCost
      : (raw.totalCost && raw.quantity ? Math.round((raw.totalCost / raw.quantity) * 100) / 100 : (matchedItem?.costPrice || 0));

    const sell = typeof raw.suggestedSellPrice === 'number' && raw.suggestedSellPrice > 0
      ? raw.suggestedSellPrice
      : (matchedItem ? matchedItem.sellPrice : Math.round(cost * 1.35));

    return {
      rawDescription: raw.rawDescription || 'Unnamed Item',
      supplierSku: raw.supplierSku || '',
      quantity: Number(raw.quantity) > 0 ? Number(raw.quantity) : 1,
      unitCost: cost,
      totalCost: raw.totalCost || cost * (Number(raw.quantity) || 1),
      suggestedName: raw.suggestedName || (matchedItem ? matchedItem.name : raw.rawDescription),
      suggestedCategory: raw.suggestedCategory || (matchedItem ? matchedItem.category : 'Electrical'),
      suggestedUnit: raw.suggestedUnit || (matchedItem ? matchedItem.unit : 'pcs'),
      suggestedSellPrice: sell,
      matchedStockId: matchedItem ? matchedItem.id : null,
      matchConfidence: raw.matchConfidence || (matchedItem ? 'HIGH' : 'NONE'),
      matchReason: raw.matchReason || (matchedItem ? `Matched to ${matchedItem.name}` : 'New item not found in catalog'),
      selectedAction: action,
      chosenStockId: matchedItem ? matchedItem.id : '',
      customName: matchedItem ? matchedItem.name : (raw.suggestedName || raw.rawDescription),
      customQty: Number(raw.quantity) > 0 ? Number(raw.quantity) : 1,
      customCostPrice: cost,
      customSellPrice: sell,
      customCategory: matchedItem ? matchedItem.category : (raw.suggestedCategory || 'Electrical'),
      customUnit: matchedItem ? matchedItem.unit : (raw.suggestedUnit || 'pcs'),
      updateCatalogCostPrice: true,
      rememberMapping: true,
    };
  });

  return {
    supplierName: data.supplierName || 'Unknown Supplier',
    invoiceNumber: data.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    invoiceDate: data.invoiceDate || new Date().toISOString().split('T')[0],
    totalInvoiceAmount: data.totalInvoiceAmount || 0,
    items: transformedItems,
  };
}

