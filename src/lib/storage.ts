import { StockItem, Client, CalloutJob, BusinessSettings, StockLog, JobStatus } from '../types';
import { INITIAL_STOCK, INITIAL_CLIENTS, INITIAL_CALLOUTS, INITIAL_SETTINGS } from '../data/initialData';

const KEYS = {
  STOCK: 'stock_app_inventory_v1',
  CLIENTS: 'stock_app_clients_v1',
  CALLOUTS: 'stock_app_jobs_v1',
  SETTINGS: 'stock_app_settings_v1',
  LOGS: 'stock_app_logs_v1',
};

// Demo ID detection
const isDemoId = (id: string) => /^(stk|cli|job|log)-[1-9]$/.test(id) || id.startsWith('job-100');

/**
 * Normalizes any legacy or custom category string strictly into one of the 5 official categories:
 * 1. Electrical
 * 2. Solar
 * 3. Refrigeration
 * 4. Air Conditioning
 * 5. Security and CCTV
 */
export function normalizeStockCategory(rawCategory: string | undefined): string {
  if (!rawCategory) return 'Electrical';
  const norm = rawCategory.trim().toLowerCase();

  // 1. Security and CCTV
  if (
    norm.includes('security') ||
    norm.includes('cctv') ||
    norm.includes('camera') ||
    norm.includes('alarm') ||
    norm.includes('surveillance') ||
    norm.includes('gate') ||
    norm.includes('siren') ||
    norm.includes('remote') ||
    norm.includes('balun')
  ) {
    return 'Security and CCTV';
  }

  // 2. Solar
  if (
    norm.includes('solar') ||
    norm.includes('inverter') ||
    norm.includes('photovoltaic') ||
    norm.includes('pv') ||
    norm.includes('battery') ||
    norm.includes('backup power') ||
    norm.includes('mppt')
  ) {
    return 'Solar';
  }

  // 3. Refrigeration
  if (
    norm.includes('refrigeration') ||
    norm.includes('refrigerant') ||
    norm.includes('fridge') ||
    norm.includes('freezer') ||
    norm.includes('cold room') ||
    norm.includes('gas & refrigerant') ||
    norm.includes('evaporator') ||
    norm.includes('defrost') ||
    norm.includes('txv') ||
    norm.includes('drier') ||
    norm.includes('r134a') ||
    norm.includes('r404a') ||
    norm.includes('r600a')
  ) {
    return 'Refrigeration';
  }

  // 4. Air Conditioning
  if (
    norm.includes('aircon') ||
    norm.includes('air conditioning') ||
    norm.includes('cooling') ||
    norm.includes('hvac') ||
    norm.includes('split unit') ||
    norm.includes('condenser') ||
    norm.includes('r410a') ||
    norm.includes('r32') ||
    norm.includes('r22') ||
    norm.includes('compressor') ||
    norm.includes('drain pipe')
  ) {
    return 'Air Conditioning';
  }

  // 5. Electrical (all circuit breakers, wiring, cables, switches, sockets, DB boards, consumables, hardware)
  return 'Electrical';
}

// Helper getters
export function getStoredStock(): StockItem[] {
  try {
    const data = localStorage.getItem(KEYS.STOCK);
    if (!data) {
      saveStoredStock(INITIAL_STOCK);
      return INITIAL_STOCK;
    }
    const parsed: StockItem[] = JSON.parse(data);
    const cleaned = parsed.filter((item) => !isDemoId(item.id));
    if (cleaned.length === 0 && INITIAL_STOCK.length > 0) {
      saveStoredStock(INITIAL_STOCK);
      return INITIAL_STOCK;
    }

    let needsUpdate = false;
    const normalized = cleaned.map((item) => {
      const fixedCat = normalizeStockCategory(item.category);
      if (fixedCat !== item.category) {
        needsUpdate = true;
        return { ...item, category: fixedCat };
      }
      return item;
    });

    // If new catalog categories (like Solar, Refrigeration, Air Conditioning, Security and CCTV) are missing from stored stock, merge them in cleanly
    const existingIds = new Set(normalized.map((i) => i.id));
    const missingCatalogItems = INITIAL_STOCK.filter((item) => !existingIds.has(item.id));
    if (missingCatalogItems.length > 0) {
      normalized.push(...missingCatalogItems);
      needsUpdate = true;
    }

    if (needsUpdate || cleaned.length !== parsed.length) {
      saveStoredStock(normalized);
    }
    return normalized;
  } catch {
    return INITIAL_STOCK;
  }
}

export function saveStoredStock(stock: StockItem[]) {
  localStorage.setItem(KEYS.STOCK, JSON.stringify(stock));
}

export function getStoredClients(): Client[] {
  try {
    const data = localStorage.getItem(KEYS.CLIENTS);
    if (!data) return [];
    const parsed: Client[] = JSON.parse(data);
    // Filter out old pre-populated demo items if present
    const cleaned = parsed.filter((item) => !isDemoId(item.id));
    if (cleaned.length !== parsed.length) {
      saveStoredClients(cleaned);
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function saveStoredClients(clients: Client[]) {
  localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients));
}

export function getStoredCallouts(): CalloutJob[] {
  try {
    const data = localStorage.getItem(KEYS.CALLOUTS);
    if (!data) return [];
    const parsed: CalloutJob[] = JSON.parse(data);
    const cleaned = parsed.filter((item) => !isDemoId(item.id)).map((job) => ({
      ...job,
      documentType: job.documentType || (job.status === 'Quote' ? 'quote' : 'invoice'),
    }));
    if (cleaned.length !== parsed.length) {
      saveStoredCallouts(cleaned);
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function saveStoredCallouts(jobs: CalloutJob[]) {
  localStorage.setItem(KEYS.CALLOUTS, JSON.stringify(jobs));
}

export function getStoredSettings(): BusinessSettings {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (data) {
      const settings = JSON.parse(data);
      let updated = false;
      if (settings.currencySymbol === '$' || !settings.currencySymbol) {
        settings.currencySymbol = 'R';
        updated = true;
      }
      if (settings.businessName === 'Vanguard Technical & Electrical Services' || !settings.businessName) {
        settings.businessName = INITIAL_SETTINGS.businessName;
        settings.ownerName = INITIAL_SETTINGS.ownerName;
        settings.email = INITIAL_SETTINGS.email;
        updated = true;
      }
      if (settings.address === 'Sandton, Johannesburg' || !settings.address) {
        settings.address = INITIAL_SETTINGS.address;
        updated = true;
      }
      if (settings.phone === '+27 11 382 9100' || !settings.phone || settings.phone === '+27 11 000 0000') {
        settings.phone = INITIAL_SETTINGS.phone;
        updated = true;
      }
      if (!settings.githubRepo || settings.githubRepo === 'herms1982/harrys-aircon-app' || settings.githubRepo.endsWith('-')) {
        settings.githubRepo = INITIAL_SETTINGS.githubRepo;
        updated = true;
      }
      if (!settings.slogan) {
        settings.slogan = INITIAL_SETTINGS.slogan;
        updated = true;
      }
      if (!settings.logoUrl) {
        settings.logoUrl = INITIAL_SETTINGS.logoUrl;
        updated = true;
      }
      if (!settings.accountNumber || settings.accountNumber === '' || !settings.accountName || !settings.accountType) {
        settings.accountType = settings.accountType || INITIAL_SETTINGS.accountType;
        settings.accountName = settings.accountName || INITIAL_SETTINGS.accountName;
        settings.accountNumber = settings.accountNumber || INITIAL_SETTINGS.accountNumber;
        settings.bankName = settings.bankName || INITIAL_SETTINGS.bankName;
        settings.branchCode = settings.branchCode || INITIAL_SETTINGS.branchCode;
        updated = true;
      }
      if (!settings.nextQuoteNumber) {
        settings.nextQuoteNumber = INITIAL_SETTINGS.nextQuoteNumber || 101;
        updated = true;
      }
      if (!settings.defaultQuoteValidityDays) {
        settings.defaultQuoteValidityDays = INITIAL_SETTINGS.defaultQuoteValidityDays || 30;
        updated = true;
      }
      if (!settings.defaultQuoteTerms) {
        settings.defaultQuoteTerms = INITIAL_SETTINGS.defaultQuoteTerms;
        updated = true;
      }
      if (updated) {
        saveStoredSettings(settings);
      }
      return settings;
    }
    return INITIAL_SETTINGS;
  } catch {
    return INITIAL_SETTINGS;
  }
}

export function saveStoredSettings(settings: BusinessSettings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export function getStoredLogs(): StockLog[] {
  try {
    const data = localStorage.getItem(KEYS.LOGS);
    if (!data) return [];
    const parsed: StockLog[] = JSON.parse(data);
    const cleaned = parsed.filter((item) => !isDemoId(item.id));
    if (cleaned.length !== parsed.length) {
      saveStoredLogs(cleaned);
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function saveStoredLogs(logs: StockLog[]) {
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
}

export function clearAllDemoData() {
  saveStoredStock([]);
  saveStoredClients([]);
  saveStoredCallouts([]);
  saveStoredLogs([]);
}

export function resetAllData() {
  localStorage.removeItem(KEYS.STOCK);
  localStorage.removeItem(KEYS.CLIENTS);
  localStorage.removeItem(KEYS.CALLOUTS);
  localStorage.removeItem(KEYS.SETTINGS);
  localStorage.removeItem(KEYS.LOGS);
}

/**
 * Handle stock inventory deductions or restorations when job status changes
 */
export function handleStockForJobStatusChange(
  job: CalloutJob,
  newStatus: JobStatus,
  currentStock: StockItem[],
  currentLogs: StockLog[]
): { updatedJob: CalloutJob; updatedStock: StockItem[]; updatedLogs: StockLog[]; message?: string } {
  const stockMap = new Map<string, StockItem>(currentStock.map(item => [item.id, { ...item }]));
  const logs = [...currentLogs];
  let updatedJob = { ...job, status: newStatus };
  let message = '';

  const shouldDeduct = (newStatus === 'Invoiced' || newStatus === 'Paid');

  if (shouldDeduct && !job.stockDeducted) {
    // Deduct stock!
    const deductions: string[] = [];
    job.stockItems.forEach(used => {
      const item = stockMap.get(used.stockItemId);
      if (item) {
        const newQty = Math.max(0, item.quantity - used.quantity);
        item.quantity = newQty;
        item.updatedAt = new Date().toISOString();
        stockMap.set(item.id, item);

        logs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          stockItemId: item.id,
          stockItemName: item.name,
          changeQuantity: -used.quantity,
          newQuantity: newQty,
          reason: 'Job Invoiced',
          jobInvoiceNumber: job.invoiceNumber,
          timestamp: new Date().toISOString(),
        });

        deductions.push(`${used.quantity}x ${item.name}`);
      }
    });

    updatedJob.stockDeducted = true;
    message = `Auto-subtracted stock for ${job.invoiceNumber}: ${deductions.join(', ') || 'No stock items'}`;
  } else if (!shouldDeduct && job.stockDeducted) {
    // Restore stock if moving back to Draft or Cancelled!
    const restorations: string[] = [];
    job.stockItems.forEach(used => {
      const item = stockMap.get(used.stockItemId);
      if (item) {
        const newQty = item.quantity + used.quantity;
        item.quantity = newQty;
        item.updatedAt = new Date().toISOString();
        stockMap.set(item.id, item);

        logs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          stockItemId: item.id,
          stockItemName: item.name,
          changeQuantity: used.quantity,
          newQuantity: newQty,
          reason: 'Job Cancelled / Returned',
          jobInvoiceNumber: job.invoiceNumber,
          timestamp: new Date().toISOString(),
        });

        restorations.push(`${used.quantity}x ${item.name}`);
      }
    });

    updatedJob.stockDeducted = false;
    message = `Restored stock for ${job.invoiceNumber}: ${restorations.join(', ') || 'No items'}`;
  }

  return {
    updatedJob,
    updatedStock: Array.from(stockMap.values()),
    updatedLogs: logs,
    message,
  };
}
