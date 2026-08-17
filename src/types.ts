export type JobStatus = 'Draft' | 'Invoiced' | 'Paid' | 'Cancelled';

export const STOCK_CATEGORIES = [
  'Electrical',
  'Solar',
  'Refrigeration',
  'Air Conditioning',
  'Security and CCTV',
] as const;

export type StockCategory = typeof STOCK_CATEGORIES[number];

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  costPrice: number; // Unit cost to business
  sellPrice: number; // Unit selling price to client
  quantity: number; // Current stock level
  minQuantity: number; // Low stock threshold alert
  unit: string; // e.g. 'pcs', 'm', 'box', 'set', 'kg'
  location?: string;
  notes?: string;
  updatedAt: string;
}

export interface UsedStockItem {
  stockItemId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number; // Cost price at time of job
  unitSellPrice: number; // Sell price charged to client
}

export interface MiscExpense {
  id: string;
  description: string;
  costAmount: number; // Expense cost to business
  chargeAmount: number; // Amount billed to client
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  address: string;
  notes?: string;
  createdAt: string;
}

export interface CalloutJob {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-001"
  clientId: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  date: string; // ISO format or YYYY-MM-DD
  status: JobStatus;
  jobTitle: string;
  workDone: string;
  
  // Travel metrics
  kmTravelled: number;
  fuelCostPerKm: number; // Internal fuel cost per km (e.g. $0.60)
  clientFuelRatePerKm: number; // Billed rate per km (e.g. $1.20)
  
  // Time on site
  hoursOnSite: number;
  hourlyRateClient: number; // Client labor rate per hour
  hourlyCostInternal: number; // Internal tech cost per hour
  
  // Items & expenses
  stockItems: UsedStockItem[];
  miscExpenses: MiscExpense[];
  
  // Financials & Discounts
  taxRate: number; // e.g. 15 for 15% VAT/Tax
  discountAmount: number; // Flat discount
  
  // Calculated summaries (stored or computed)
  travelCharge: number;
  travelCost: number;
  laborCharge: number;
  laborCost: number;
  stockCharge: number;
  stockCost: number;
  miscCharge: number;
  miscCost: number;
  subtotal: number;
  taxTotal: number;
  totalInvoicePrice: number;
  totalCalloutCost: number;
  netProfit: number;
  profitMarginPercent: number;

  // Audit
  stockDeducted: boolean; // Has inventory been auto-subtracted for this job?
  createdAt: string;
}

export interface StockLog {
  id: string;
  stockItemId: string;
  stockItemName: string;
  changeQuantity: number; // negative for deduction, positive for restock
  newQuantity: number;
  reason: 'Job Invoiced' | 'Restock' | 'Manual Adjustment' | 'Job Cancelled / Returned';
  jobInvoiceNumber?: string;
  timestamp: string;
}

export interface BusinessSettings {
  businessName: string;
  siteName?: string;
  website?: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  taxNumber?: string;
  currencySymbol: string; // '$', 'R', '£', '€', 'A$', 'KSh'
  defaultFuelCostPerKm: number;
  defaultClientFuelRatePerKm: number;
  defaultHourlyRateClient: number;
  defaultHourlyCostInternal: number;
  defaultTaxRate: number;
  nextInvoiceNumber: number;
  bankName?: string;
  accountType?: string;
  accountName?: string;
  accountNumber?: string;
  branchCode?: string;
  githubRepo?: string;
  appVersion?: string;
  slogan?: string;
  logoUrl?: string;
}
