import { StockItem, Client, CalloutJob, BusinessSettings, StockLog, JobStatus } from '../types';
import { INITIAL_STOCK, INITIAL_CLIENTS, INITIAL_CALLOUTS, INITIAL_SETTINGS } from '../data/initialData';

const KEYS = {
  STOCK: 'stock_app_inventory_v1',
  CLIENTS: 'stock_app_clients_v1',
  CALLOUTS: 'stock_app_jobs_v1',
  SETTINGS: 'stock_app_settings_v1',
  LOGS: 'stock_app_logs_v1',
};

// Helper getters
export function getStoredStock(): StockItem[] {
  try {
    const data = localStorage.getItem(KEYS.STOCK);
    return data ? JSON.parse(data) : INITIAL_STOCK;
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
    return data ? JSON.parse(data) : INITIAL_CLIENTS;
  } catch {
    return INITIAL_CLIENTS;
  }
}

export function saveStoredClients(clients: Client[]) {
  localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients));
}

export function getStoredCallouts(): CalloutJob[] {
  try {
    const data = localStorage.getItem(KEYS.CALLOUTS);
    return data ? JSON.parse(data) : INITIAL_CALLOUTS;
  } catch {
    return INITIAL_CALLOUTS;
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
      if (settings.currencySymbol === '$' || !settings.currencySymbol) {
        settings.currencySymbol = 'R';
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
    return data ? JSON.parse(data) : [
      {
        id: 'log-1',
        stockItemId: 'stk-1',
        stockItemName: '3-Phase Main Circuit Breaker 63A',
        changeQuantity: -1,
        newQuantity: 14,
        reason: 'Job Invoiced',
        jobInvoiceNumber: 'INV-2026-1001',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'log-2',
        stockItemId: 'stk-7',
        stockItemName: 'Surge Protection Device (SPD) 40kA',
        changeQuantity: -2,
        newQuantity: 9,
        reason: 'Job Invoiced',
        jobInvoiceNumber: 'INV-2026-1001',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  } catch {
    return [];
  }
}

export function saveStoredLogs(logs: StockLog[]) {
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
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
