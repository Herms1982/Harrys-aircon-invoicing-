import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CalloutJob, BusinessSettings, StockItem } from '../types';
import { formatCurrency, calculateJobTotals } from './calculations';

/**
 * Generate and download a PDF for an Invoice
 */
export function downloadInvoicePDF(job: CalloutJob, settings: BusinessSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const totals = calculateJobTotals(job);

  // Colors
  const primaryColor = [30, 41, 59]; // slate-800
  const accentColor = [79, 70, 229]; // indigo-600

  // 1. Header & Business Name
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(settings.businessName || "Harry's Aircon Electrical & Solar", 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${settings.address || 'South Africa'} | Tel: ${settings.phone || 'N/A'} | Email: ${settings.email || 'N/A'}`,
    14,
    23
  );

  // Invoice Title & Badge
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 196, 17, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(job.invoiceNumber, 196, 24, { align: 'right' });

  // 2. Client & Job Metadata
  let y = 42;

  // Left Box: Billed To
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 90, 32, 3, 3, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO:', 18, y + 6);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(job.clientName || 'Valued Customer', 18, y + 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(job.clientPhone || 'No Phone', 18, y + 19);
  doc.text(job.clientAddress || 'No Address', 18, y + 25);

  // Right Box: Invoice Meta
  doc.roundedRect(108, y, 88, 32, 3, 3, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DETAILS:', 112, y + 6);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${job.date}`, 112, y + 13);
  doc.text(`Job Title: ${job.jobTitle}`, 112, y + 19);
  doc.text(`Status: ${job.status.toUpperCase()}`, 112, y + 25);

  y += 38;

  // Work Done Description
  if (job.workDone) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('WORK PERFORMED / SERVICE SUMMARY:', 14, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const splitDesc = doc.splitTextToSize(job.workDone, 180);
    doc.text(splitDesc, 14, y);
    y += splitDesc.length * 4.5 + 4;
  }

  // 3. Itemized Table
  const tableRows: Array<[string, string, string, string, string]> = [];

  // Callout / Travel Charge
  if (job.kmTravelled > 0) {
    tableRows.push([
      `Travel / Callout (${job.kmTravelled} km)`,
      '1',
      formatCurrency(job.travelCharge, settings.currencySymbol),
      '0%',
      formatCurrency(job.travelCharge, settings.currencySymbol),
    ]);
  }

  // Labor Charge
  if (job.hoursOnSite > 0) {
    tableRows.push([
      `On-Site Technician Labor (${job.hoursOnSite} hrs @ ${formatCurrency(job.hourlyRateClient, settings.currencySymbol)}/hr)`,
      `${job.hoursOnSite}`,
      formatCurrency(job.hourlyRateClient, settings.currencySymbol),
      '0%',
      formatCurrency(job.laborCharge, settings.currencySymbol),
    ]);
  }

  // Stock Items
  job.stockItems.forEach((stk) => {
    tableRows.push([
      stk.name,
      `${stk.quantity} ${stk.unit}`,
      formatCurrency(stk.unitSellPrice, settings.currencySymbol),
      '0%',
      formatCurrency(stk.quantity * stk.unitSellPrice, settings.currencySymbol),
    ]);
  });

  // Misc Expenses
  job.miscExpenses.forEach((m) => {
    tableRows.push([
      m.description,
      '1',
      formatCurrency(m.chargeAmount, settings.currencySymbol),
      '0%',
      formatCurrency(m.chargeAmount, settings.currencySymbol),
    ]);
  });

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Qty', 'Unit Price', 'Tax', 'Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: accentColor as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 27, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // 4. Totals Block
  let totalY = finalY;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(118, totalY, 78, 38, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text('Subtotal:', 122, totalY + 8);
  doc.text(formatCurrency(totals.subtotal, settings.currencySymbol), 192, totalY + 8, { align: 'right' });

  if (job.discountAmount > 0) {
    doc.text('Discount:', 122, totalY + 14);
    doc.text(`-${formatCurrency(job.discountAmount, settings.currencySymbol)}`, 192, totalY + 14, { align: 'right' });
  }

  if (job.taxRate > 0) {
    doc.text(`VAT (${job.taxRate}%):`, 122, totalY + 20);
    doc.text(formatCurrency(totals.taxTotal, settings.currencySymbol), 192, totalY + 20, { align: 'right' });
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL DUE:', 122, totalY + 30);
  doc.setTextColor(79, 70, 229);
  doc.text(formatCurrency(totals.totalInvoicePrice, settings.currencySymbol), 192, totalY + 30, { align: 'right' });

  // 5. Banking Details / Footer
  let footerY = totalY + 44;
  if (footerY > 260) {
    doc.addPage();
    footerY = 20;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY, 196, footerY);

  footerY += 6;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('PAYMENT & BANKING DETAILS:', 14, footerY);

  footerY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Business: ${settings.businessName || "Harry's Aircon"}`, 14, footerY);
  doc.text(`Contact: ${settings.phone || 'N/A'} | Email: ${settings.email || 'N/A'}`, 14, footerY + 4);
  doc.text(`Payment Reference: ${job.invoiceNumber}`, 14, footerY + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text("Thank you for choosing Harry's Aircon Electrical & Solar services!", 105, footerY + 18, { align: 'center' });

  // Save PDF
  const filename = `Invoice_${job.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`;
  doc.save(filename);
}

/**
 * Export Stock Inventory Catalog to Excel (.xlsx)
 */
export function exportStockToExcel(stock: StockItem[], settings: BusinessSettings) {
  const data = stock.map((item, index) => {
    const costValue = item.quantity * item.costPrice;
    const retailValue = item.quantity * item.sellPrice;
    const margin = item.sellPrice > 0 ? ((item.sellPrice - item.costPrice) / item.sellPrice) * 100 : 0;
    const isLow = item.quantity <= item.minQuantity;

    return {
      '#': index + 1,
      'SKU / Part ID': item.sku,
      'Part Name': item.name,
      Category: item.category,
      'Qty On Hand': item.quantity,
      Unit: item.unit,
      'Unit Cost (ZAR)': item.costPrice,
      'Unit Sell Price (ZAR)': item.sellPrice,
      'Margin %': `${margin.toFixed(1)}%`,
      'Total Cost Valuation': costValue,
      'Total Retail Valuation': retailValue,
      'Min Reorder Level': item.minQuantity,
      'Low Stock Warning': isLow ? 'LOW STOCK' : 'OK',
    };
  });

  // Total Summary Row
  const totalCostVal = stock.reduce((s, i) => s + i.quantity * i.costPrice, 0);
  const totalRetailVal = stock.reduce((s, i) => s + i.quantity * i.sellPrice, 0);
  const lowStockCount = stock.filter((i) => i.quantity <= i.minQuantity).length;

  data.push({
    '#': '',
    'SKU / Part ID': '',
    'Part Name': 'TOTAL INVENTORY SUMMARY',
    Category: '',
    'Qty On Hand': stock.reduce((s, i) => s + i.quantity, 0),
    Unit: 'items',
    'Unit Cost (ZAR)': 0,
    'Unit Sell Price (ZAR)': 0,
    'Margin %': '',
    'Total Cost Valuation': totalCostVal,
    'Total Retail Valuation': totalRetailVal,
    'Min Reorder Level': 0,
    'Low Stock Warning': `${lowStockCount} Low Items`,
  } as any);

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Catalog');

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Harrys_Aircon_Stock_List_${today}.xlsx`);
}

/**
 * Generate Stock Inventory PDF Report
 */
export function downloadStockPDF(stock: StockItem[], settings: BusinessSettings) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const today = new Date().toLocaleDateString('en-ZA');

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 297, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.businessName || "Harry's Aircon Electrical & Solar", 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Official Inventory Stock Report - Date: ${today}`, 14, 21);

  // Summary Metrics
  const totalCostVal = stock.reduce((s, i) => s + i.quantity * i.costPrice, 0);
  const totalRetailVal = stock.reduce((s, i) => s + i.quantity * i.sellPrice, 0);
  const lowStockCount = stock.filter((i) => i.quantity <= i.minQuantity).length;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Stock Items: ${stock.length}`, 14, 36);
  doc.text(`Total Cost Value: ${formatCurrency(totalCostVal, settings.currencySymbol)}`, 80, 36);
  doc.text(`Total Retail Value: ${formatCurrency(totalRetailVal, settings.currencySymbol)}`, 160, 36);

  if (lowStockCount > 0) {
    doc.setTextColor(225, 29, 72);
    doc.text(`Low Stock Alerts: ${lowStockCount} items`, 235, 36);
  }

  // Table
  const tableRows = stock.map((item, idx) => {
    const costVal = item.quantity * item.costPrice;
    const retailVal = item.quantity * item.sellPrice;
    const isLow = item.quantity <= item.minQuantity;

    return [
      `${idx + 1}`,
      item.sku,
      item.name,
      item.category,
      `${item.quantity} ${item.unit}`,
      formatCurrency(item.costPrice, settings.currencySymbol),
      formatCurrency(item.sellPrice, settings.currencySymbol),
      formatCurrency(costVal, settings.currencySymbol),
      formatCurrency(retailVal, settings.currencySymbol),
      isLow ? 'LOW STOCK' : 'OK',
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [
      [
        '#',
        'SKU',
        'Part Name',
        'Category',
        'Qty',
        'Unit Cost',
        'Unit Sell',
        'Total Cost',
        'Total Sell',
        'Status',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 25 },
      2: { cellWidth: 65 },
      3: { cellWidth: 35 },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 25, halign: 'right' },
      8: { cellWidth: 25, halign: 'right' },
      9: { cellWidth: 20, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`Harrys_Aircon_Stock_Report_${dateStr}.pdf`);
}

/**
 * Share or Copy Formatted Stock Catalog Text
 */
export async function shareStockListText(stock: StockItem[], settings: BusinessSettings): Promise<boolean> {
  const totalCostVal = stock.reduce((s, i) => s + i.quantity * i.costPrice, 0);
  const totalRetailVal = stock.reduce((s, i) => s + i.quantity * i.sellPrice, 0);
  const lowStock = stock.filter((i) => i.quantity <= i.minQuantity);

  let text = `📦 *${settings.businessName || "Harry's Aircon"} - Inventory Stock List*\n`;
  text += `Total Parts: ${stock.length} | Cost Valuation: ${formatCurrency(totalCostVal, settings.currencySymbol)} | Retail Value: ${formatCurrency(totalRetailVal, settings.currencySymbol)}\n\n`;

  text += `*STOCK CATALOG:* \n`;
  stock.forEach((item) => {
    const isLow = item.quantity <= item.minQuantity;
    text += `• ${item.sku} - ${item.name}: ${item.quantity} ${item.unit} @ ${formatCurrency(item.sellPrice, settings.currencySymbol)}${isLow ? ' ⚠️ LOW' : ''}\n`;
  });

  if (lowStock.length > 0) {
    text += `\n🚨 *LOW STOCK REORDER WARNINGS (${lowStock.length}):*\n`;
    lowStock.forEach((item) => {
      text += `- ${item.name} (${item.sku}): ${item.quantity} ${item.unit} left (Min: ${item.minQuantity})\n`;
    });
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Harry's Aircon Stock List",
        text,
      });
      return true;
    } catch {
      // Fallback to clipboard
    }
  }

  await navigator.clipboard.writeText(text);
  return false;
}
