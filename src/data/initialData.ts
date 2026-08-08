import { StockItem, Client, CalloutJob, BusinessSettings } from '../types';

export const INITIAL_SETTINGS: BusinessSettings = {
  businessName: "Harry's Aircon Electrical and Solar services",
  ownerName: 'Harry',
  phone: '+27 11 382 9100',
  email: 'service@harrysaircon.co.za',
  address: 'Sandton, Johannesburg',
  taxNumber: '',
  currencySymbol: 'R',
  defaultFuelCostPerKm: 2.80,
  defaultClientFuelRatePerKm: 6.50,
  defaultHourlyRateClient: 650.0,
  defaultHourlyCostInternal: 250.0,
  defaultTaxRate: 15.0, // 15% VAT in South Africa
  nextInvoiceNumber: 1001,
};

// Default arrays initialized clean (no demo items)
export const INITIAL_STOCK: StockItem[] = [];

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_CALLOUTS: CalloutJob[] = [];
