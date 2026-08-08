import { CalloutJob, UsedStockItem, MiscExpense } from '../types';

export interface CalculatedJobTotals {
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
}

export function calculateJobTotals(params: {
  kmTravelled: number;
  fuelCostPerKm: number;
  clientFuelRatePerKm: number;
  hoursOnSite: number;
  hourlyRateClient: number;
  hourlyCostInternal: number;
  stockItems: UsedStockItem[];
  miscExpenses: MiscExpense[];
  taxRate: number;
  discountAmount: number;
}): CalculatedJobTotals {
  const travelCharge = (params.kmTravelled || 0) * (params.clientFuelRatePerKm || 0);
  const travelCost = (params.kmTravelled || 0) * (params.fuelCostPerKm || 0);

  const laborCharge = (params.hoursOnSite || 0) * (params.hourlyRateClient || 0);
  const laborCost = (params.hoursOnSite || 0) * (params.hourlyCostInternal || 0);

  const stockCharge = (params.stockItems || []).reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitSellPrice || 0),
    0
  );
  const stockCost = (params.stockItems || []).reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitCost || 0),
    0
  );

  const miscCharge = (params.miscExpenses || []).reduce(
    (sum, item) => sum + (item.chargeAmount || 0),
    0
  );
  const miscCost = (params.miscExpenses || []).reduce(
    (sum, item) => sum + (item.costAmount || 0),
    0
  );

  const subtotal = travelCharge + laborCharge + stockCharge + miscCharge;
  const taxableAmount = Math.max(0, subtotal - (params.discountAmount || 0));
  const taxTotal = taxableAmount * ((params.taxRate || 0) / 100);

  const totalInvoicePrice = taxableAmount + taxTotal;
  const totalCalloutCost = travelCost + laborCost + stockCost + miscCost;

  // Net profit is the earnings on client charges minus direct job costs (excluding government tax collected)
  const netProfit = taxableAmount - totalCalloutCost;
  const profitMarginPercent = taxableAmount > 0 ? (netProfit / taxableAmount) * 100 : 0;

  return {
    travelCharge,
    travelCost,
    laborCharge,
    laborCost,
    stockCharge,
    stockCost,
    miscCharge,
    miscCost,
    subtotal,
    taxTotal,
    totalInvoicePrice,
    totalCalloutCost,
    netProfit,
    profitMarginPercent,
  };
}

export function formatCurrency(amount: number, symbol = 'R'): string {
  const num = isNaN(amount) ? 0 : amount;
  const formatted = num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  if (!symbol) return `R ${formatted}`;
  const cleanSymbol = symbol.trim();
  if (cleanSymbol === 'R') {
    return `R ${formatted}`;
  }
  return `${cleanSymbol} ${formatted}`;
}
