import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { CalloutJob, BusinessSettings, StockItem } from '../types';
import { formatCurrency, calculateJobTotals } from './calculations';

export interface PDFSaveResult {
  success: boolean;
  blobUrl: string;
  filename: string;
  title: string;
  shared?: boolean;
}

/**
 * Universal PDF export helper that works reliably across:
 * - Desktop Chrome / Firefox / Safari
 * - Android WebView / Capacitor native app (with runtime permissions)
 * - Mobile web browsers & sandboxed iFrames
 */
async function savePDFDocument(doc: jsPDF, filename: string, title: string): Promise<PDFSaveResult> {
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  let shared = false;

  // 1. Capacitor Android Native App
  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.requestPermissions();

      const pdfDataUri = doc.output('datauristring');
      const base64Data = pdfDataUri.split(',')[1];

      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      await Share.share({
        title: title || filename,
        text: `PDF Document: ${filename}`,
        url: result.uri,
        dialogTitle: `Save or Share ${filename}`,
      });
      return { success: true, blobUrl, filename, title, shared: true };
    } catch (nativeErr) {
      console.warn('Native Capacitor save error:', nativeErr);
    }
  }

  // 2. Web Share API for Mobile Devices (Android Chrome & iOS Safari)
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: title || filename,
        });
        shared = true;
      }
    } catch (shareErr) {
      console.warn('Web Share API canceled or unsupported:', shareErr);
    }
  }

  // 3. Anchor download click
  try {
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = filename;
    downloadAnchor.target = '_blank';
    downloadAnchor.style.display = 'none';
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    setTimeout(() => {
      if (document.body.contains(downloadAnchor)) {
        document.body.removeChild(downloadAnchor);
      }
    }, 2000);
  } catch (anchorErr) {
    console.warn('Anchor download error:', anchorErr);
  }

  // 4. Fallback jsPDF doc.save
  try {
    doc.save(filename);
  } catch (err) {
    console.warn('doc.save error:', err);
  }

  return { success: true, blobUrl, filename, title, shared };
}

/**
 * Build jsPDF instance and metadata for an Invoice
 */
export function buildInvoicePDFDoc(job: CalloutJob, settings: BusinessSettings): { doc: jsPDF; filename: string; title: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const totals = calculateJobTotals(job);

  // White, Yellow and Royal Blue Palette
  const royalBlue = [30, 58, 138]; // #1e3a8a
  const goldenYellow = [234, 179, 8]; // #eab308
  const brightYellow = [250, 204, 21]; // #facc15

  // 1. Header & Business Name
  // Top Yellow Accent Line
  doc.setFillColor(brightYellow[0], brightYellow[1], brightYellow[2]);
  doc.rect(0, 0, 210, 3.5, 'F');

  // Main Royal Blue Header Banner
  doc.setFillColor(royalBlue[0], royalBlue[1], royalBlue[2]);
  doc.rect(0, 3.5, 210, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.businessName || "Harrys aircon and Electrical", 14, 15);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(224, 242, 254); // sky-100
  doc.text(
    `${settings.address || 'Pretoria, South Africa'} | Tel: ${settings.phone || '0716896139'} | ${settings.email || 'service@harrysaircon.co.za'}`,
    14,
    21.5
  );

  // Slogan Banner
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor(brightYellow[0], brightYellow[1], brightYellow[2]); // Yellow slogan
  const sloganText = settings.slogan || "From Electrical, Solar, Security, CCTV, Refrigeration and Air Conditioning — We've Got You Covered";
  doc.text(sloganText, 14, 28);

  // Invoice Title & Badge in Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brightYellow[0], brightYellow[1], brightYellow[2]);
  doc.text('INVOICE', 196, 17, { align: 'right' });

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`#${job.invoiceNumber}`, 196, 25, { align: 'right' });

  // 2. Client & Job Metadata
  let y = 44;

  // Left Box: Billed To (White background with blue border)
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.setFillColor(248, 250, 255); // soft light blue-white
  doc.roundedRect(14, y, 90, 32, 2.5, 2.5, 'FD');

  doc.setTextColor(30, 58, 138); // royal-blue
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO:', 18, y + 6);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(job.clientName || 'Valued Customer', 18, y + 13);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(job.clientPhone || 'No Phone', 18, y + 19);
  doc.text(job.clientAddress || 'No Address', 18, y + 25);

  // Right Box: Invoice Meta
  doc.roundedRect(108, y, 88, 32, 2.5, 2.5, 'FD');

  doc.setTextColor(30, 58, 138);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DETAILS:', 112, y + 6);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${job.date}`, 112, y + 13);
  doc.text(`Job: ${job.jobTitle}`, 112, y + 19);
  doc.text(`Status: ${job.status.toUpperCase()}`, 112, y + 25);

  y += 38;

  // Work Done Description
  if (job.workDone) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
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
      `Travel / Callout (${job.kmTravelled} km round trip)`,
      '1',
      formatCurrency(job.travelCharge, settings.currencySymbol),
      '0%',
      formatCurrency(job.travelCharge, settings.currencySymbol),
    ]);
  }

  // Labor Charge
  if (job.hoursOnSite > 0) {
    tableRows.push([
      `Technician Labor (${job.hoursOnSite} hrs @ ${formatCurrency(job.hourlyRateClient, settings.currencySymbol)}/hr)`,
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
      fillColor: royalBlue as [number, number, number],
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

  doc.setFillColor(248, 250, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(118, totalY, 78, 38, 3, 3, 'FD');

  doc.setFontSize(8.5);
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
  doc.setTextColor(30, 58, 138);
  doc.text('TOTAL DUE:', 122, totalY + 30);
  doc.setTextColor(180, 83, 9); // amber gold total
  doc.text(formatCurrency(totals.totalInvoicePrice, settings.currencySymbol), 192, totalY + 30, { align: 'right' });

  // 5. Banking Details / Footer
  let footerY = totalY + 42;
  if (footerY > 245) {
    doc.addPage();
    footerY = 20;
  }

  // Draw Banking Details Card Box with Yellow accent border
  doc.setDrawColor(234, 179, 8); // amber-500 / yellow
  doc.setFillColor(254, 252, 232); // yellow-50 / light cream
  doc.roundedRect(14, footerY, 182, 34, 2.5, 2.5, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // Royal Blue
  doc.text('BANKING & EFT PAYMENT DETAILS:', 18, footerY + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  
  // Left column
  doc.text(`Account Name:`, 18, footerY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${settings.accountName || 'Harrys aircon and Electrical'}`, 48, footerY + 12);

  doc.setFont('helvetica', 'normal');
  doc.text(`Account No:`, 18, footerY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(`${settings.accountNumber || '53002734919'}`, 48, footerY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Account Type:`, 18, footerY + 22);
  doc.text(`${settings.accountType || 'Current Business'}`, 48, footerY + 22);

  // Right column
  doc.text(`Bank:`, 115, footerY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${settings.bankName || 'First National Bank (FNB)'}`, 138, footerY + 12);

  doc.setFont('helvetica', 'normal');
  doc.text(`Branch Code:`, 115, footerY + 17);
  doc.text(`${settings.branchCode || '250655'}`, 138, footerY + 17);

  doc.text(`Reference:`, 115, footerY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202); // indigo-700
  doc.text(`${job.invoiceNumber}`, 138, footerY + 22);

  // Bottom note in card
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Please send proof of payment to ${settings.email || 'service@harrysaircon.co.za'}. Thank you for your business!`, 18, footerY + 29);

  const filename = `Invoice_${job.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`;
  const title = `Invoice ${job.invoiceNumber}`;
  return { doc, filename, title };
}

/**
 * Generate and download a PDF for an Invoice
 */
export async function downloadInvoicePDF(job: CalloutJob, settings: BusinessSettings): Promise<PDFSaveResult> {
  const { doc, filename, title } = buildInvoicePDFDoc(job, settings);
  return await savePDFDocument(doc, filename, title);
}

export interface ShareResult {
  shared: boolean;
  method: 'web_share' | 'capacitor' | 'whatsapp' | 'email' | 'clipboard';
  message?: string;
}

/**
 * Share Invoice PDF directly via Web Share API or Capacitor / WhatsApp / Email
 */
export async function shareInvoicePDF(job: CalloutJob, settings: BusinessSettings): Promise<ShareResult> {
  const { doc, filename } = buildInvoicePDFDoc(job, settings);
  const pdfBlob = doc.output('blob');
  const title = `Invoice ${job.invoiceNumber} - ${settings.businessName}`;
  const shareText = `Hi ${job.clientName || 'Valued Client'},

Please find attached your Invoice ${job.invoiceNumber} for ${formatCurrency(job.totalInvoicePrice, settings.currencySymbol)} from ${settings.businessName}.

*Banking Details for EFT:*
• Account Name: ${settings.accountName || 'Harrys aircon and Electrical'}
• Account Number: ${settings.accountNumber || '53002734919'}
• Account Type: ${settings.accountType || 'Current Business'}
• Bank: ${settings.bankName || 'First National Bank'} (${settings.branchCode || '250655'})
• Payment Reference: ${job.invoiceNumber}

Thank you for your business!`;

  // 1. Capacitor Native Share
  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.requestPermissions();
      const pdfDataUri = doc.output('datauristring');
      const base64Data = pdfDataUri.split(',')[1];
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title,
        text: shareText,
        url: result.uri,
        dialogTitle: `Share ${filename} via...`,
      });
      return { shared: true, method: 'capacitor' };
    } catch (nativeErr) {
      console.warn('Capacitor native share error:', nativeErr);
    }
  }

  // 2. Web Share API with PDF File (WhatsApp, Email, Telegram, System Share Sheet)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title,
          text: shareText,
        });
        return { shared: true, method: 'web_share' };
      } else if (navigator.canShare && navigator.canShare({ title, text: shareText })) {
        await navigator.share({
          title,
          text: shareText,
        });
        return { shared: true, method: 'web_share' };
      }
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        return { shared: false, method: 'web_share', message: 'User canceled share' };
      }
      console.warn('Web Share API error:', shareErr);
    }
  }

  // 3. Direct Fallback: WhatsApp
  if (job.clientPhone) {
    const cleanPhone = job.clientPhone.replace(/[^0-9+]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
    return { shared: true, method: 'whatsapp' };
  }

  // 4. Fallback: Email
  const mailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText)}`;
  window.open(mailUrl, '_blank');
  return { shared: true, method: 'email' };
}

/**
 * Export Stock Inventory Catalog to Excel (.xlsx)
 */
export async function exportStockToExcel(stock: StockItem[], settings: BusinessSettings): Promise<void> {
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
  const filename = `Harrys_Aircon_Stock_List_${today}.xlsx`;

  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.requestPermissions();
      const excelBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      const result = await Filesystem.writeFile({
        path: filename,
        data: excelBase64,
        directory: Directory.Documents,
        recursive: true,
      });

      await Share.share({
        title: "Harry's Aircon Stock List Excel",
        url: result.uri,
        dialogTitle: 'Share or Save Excel Stock List',
      });
      return;
    } catch (e) {
      console.warn('Capacitor native Excel save error:', e);
    }
  }

  XLSX.writeFile(workbook, filename);
}

/**
 * Generate Stock Inventory PDF Report
 */
export async function downloadStockPDF(stock: StockItem[], settings: BusinessSettings): Promise<PDFSaveResult> {
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
  const filename = `Harrys_Aircon_Stock_Report_${dateStr}.pdf`;
  return await savePDFDocument(doc, filename, "Harry's Aircon Inventory Stock Report");
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
