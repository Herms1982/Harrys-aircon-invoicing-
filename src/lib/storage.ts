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

// Helper getters
export function getStoredStock(): StockItem[] {
  try {
    const data = localStorage.getItem(KEYS.STOCK);
    if (!data) return [];
    const parsed: StockItem[] = JSON.parse(data);
    // Filter out old pre-populated demo items if present
    const cleaned = parsed.filter((item) => !isDemoId(item.id));
    if (cleaned.length !== parsed.length) {
      saveStoredStock(cleaned);
    }
    return cleaned;
  } catch {
    return [];
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
    const cleaned = parsed.filter((item) => !isDemoId(item.id));
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
