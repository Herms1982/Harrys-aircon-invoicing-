import React, { useState } from 'react';
import { X, Printer, CheckCircle2, TrendingUp, ChevronDown, ChevronUp, Copy, Check, MapPin, Phone, Mail, Share2, Sparkles, FileDown, RefreshCw, ExternalLink, Download, Eye, Send, Landmark } from 'lucide-react';
import { CalloutJob, BusinessSettings, JobStatus } from '../../types';
import { formatCurrency } from '../../lib/calculations';
import { downloadInvoicePDF, shareInvoicePDF, PDFSaveResult } from '../../lib/exportUtils';
import confetti from 'canvas-confetti';

interface InvoiceViewModalProps {
  job: CalloutJob | null;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (job: CalloutJob, newStatus: JobStatus) => void;
  onEditJob: (job: CalloutJob) => void;
  onOpenAICopilot?: () => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  job,
  settings,
  isOpen,
  onClose,
  onStatusChange,
  onEditJob,
  onOpenAICopilot,
}) => {
  if (!isOpen || !job) return null;

  const [showProfitAudit, setShowProfitAudit] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState(false);
  const [lastPdfResult, setLastPdfResult] = useState<PDFSaveResult | null>(null);

  const handleSavePDF = async () => {
    setIsSavingPdf(true);
    setPdfSuccessToast(false);
    try {
      const res = await downloadInvoicePDF(job, settings);
      setLastPdfResult(res);
      setPdfSuccessToast(true);

      // On mobile browsers where download attribute is ignored, auto open blob URL in new tab as immediate fallback
      if (res?.blobUrl && !res?.shared) {
        try {
          const w = window.open(res.blobUrl, '_blank');
          if (!w) {
            console.warn('Popup blocked by browser');
          }
        } catch (e) {
          console.warn('Auto open failed:', e);
        }
      }
    } catch (err) {
      console.error('PDF Save Error:', err);
      alert('Generating PDF failed. You can use the Print button to print or save as PDF directly!');
    } finally {
      setIsSavingPdf(false);
    }
  };

  const handleSharePDF = async () => {
    setIsSharingPdf(true);
    try {
      await shareInvoicePDF(job, settings);
    } catch (err) {
      console.error('PDF Share Error:', err);
    } finally {
      setIsSharingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMarkPaid = () => {
    onStatusChange(job, 'Paid');
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const handleCopySummary = () => {
    const text = `INVOICE ${job.invoiceNumber}
Client: ${job.clientName}
Date: ${job.date}
Total Payable: ${formatCurrency(job.totalInvoicePrice, settings.currencySymbol)}

Work Done: ${job.workDone}
Thank you for your business!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:border-0 print:shadow-none print:max-h-none print:w-full print:rounded-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              {job.invoiceNumber}
            </span>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold ${
                job.status === 'Paid'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              {job.status}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleSharePDF}
              disabled={isSharingPdf}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-900/30 transition-all cursor-pointer border border-indigo-400/30"
              title="Share Invoice PDF directly via WhatsApp, Email, or Web Share API"
            >
              {isSharingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-indigo-200 stroke-[2.5]" />
              )}
              <span>{isSharingPdf ? 'Sharing...' : 'Share'}</span>
            </button>

            <button
              onClick={handleSavePDF}
              disabled={isSavingPdf}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer border border-emerald-400/30"
              title="Download PDF directly to your device"
            >
              {isSavingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <FileDown className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span className="hidden xs:inline">{isSavingPdf ? 'Saving...' : 'PDF'}</span>
            </button>

            <button
              onClick={handleCopySummary}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-2 rounded-xl border border-slate-700 flex items-center gap-1 transition-colors font-semibold"
              title="Copy text summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-2.5 py-2 rounded-xl flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
              title="Print invoice or save as PDF via system dialog"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Generated Success Action Banner */}
        {pdfSuccessToast && lastPdfResult && (
          <div className="bg-emerald-950/90 border-b border-emerald-800/80 px-4 py-3 text-xs text-white space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 stroke-[2.5]" />
                <span>Invoice PDF Generated Successfully!</span>
              </div>
              <button onClick={() => setPdfSuccessToast(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {lastPdfResult.blobUrl && (
                <a
                  href={lastPdfResult.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View / Open PDF</span>
                </a>
              )}

              {lastPdfResult.blobUrl && (
                <a
                  href={lastPdfResult.blobUrl}
                  download={lastPdfResult.filename || `Invoice_${job.invoiceNumber}.pdf`}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Direct Download</span>
                </a>
              )}

              <button
                onClick={handleSharePDF}
                disabled={isSharingPdf}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-400/30"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-200" />
                <span>Share PDF</span>
              </button>

              <button
                onClick={handlePrint}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        )}

        {/* PRINTABLE INVOICE SHEET */}
        <div className="print-sheet p-6 sm:p-8 bg-white text-slate-900 font-sans space-y-6 overflow-y-auto flex-1 print:p-0">
          {/* Top Brand Accent Bar */}
          <div className="h-2 w-full bg-gradient-to-r from-blue-700 via-amber-400 to-sky-500 rounded-full" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-blue-100 pb-5 gap-4">
            <div className="flex items-start gap-3.5">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt={settings.businessName}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl border border-amber-300 shadow-sm bg-white p-1 shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight">
                  {settings.businessName}
                </h1>
                {settings.slogan && (
                  <p className="text-[11px] font-semibold text-blue-700 italic mt-0.5 max-w-md">
                    "{settings.slogan}"
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-1">{settings.address}</p>
                <p className="text-xs text-slate-700 font-medium">
                  Phone: <strong className="text-blue-950">{settings.phone}</strong> | Email: <strong className="text-blue-950">{settings.email}</strong>
                  {settings.website && ` | Web: ${settings.website}`}
                </p>
                {settings.taxNumber && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Tax / VAT No: {settings.taxNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="sm:text-right w-full sm:w-auto flex sm:flex-col justify-between sm:justify-start items-end gap-1">
              <div>
                <span className="text-2xl sm:text-3xl font-black text-blue-950 tracking-widest uppercase block">
                  INVOICE
                </span>
                <span className="inline-block text-xs font-mono font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md mt-1">
                  #{job.invoiceNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block mt-1">
                  Date: <strong className="text-slate-800">{job.date}</strong>
                </span>
                <span
                  className={`inline-block text-xs font-bold px-3 py-0.5 rounded-full mt-1.5 uppercase ${
                    job.status === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-400'
                  }`}
                >
                  Status: {job.status}
                </span>
              </div>
            </div>
          </div>

          {/* Client Details */}
          <div className="bg-gradient-to-r from-blue-50/80 to-sky-50/50 border border-blue-200 p-4 rounded-xl shadow-xs">
            <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider block">
              BILLED TO:
            </span>
            <div className="text-sm font-bold text-blue-950 mt-0.5">{job.clientName}</div>
            <div className="text-xs text-slate-700 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{job.clientAddress}</span>
            </div>
            {job.clientPhone && (
              <div className="text-xs text-slate-700 mt-0.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{job.clientPhone}</span>
              </div>
            )}
          </div>

          {/* Job description */}
          <div>
            <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
              Work Performed: {job.jobTitle}
            </h3>
            <p className="text-xs text-slate-800 bg-blue-50/40 border border-blue-100 p-3 rounded-xl mt-1.5 leading-relaxed">
              {job.workDone || 'Site callout and diagnostic inspection completed.'}
            </p>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto rounded-xl border border-blue-200 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-blue-900 text-white border-b-2 border-amber-400">
                  <th className="py-2.5 px-3.5 font-bold">Service / Item Description</th>
                  <th className="py-2.5 px-3 text-center font-bold">Qty / Units</th>
                  <th className="py-2.5 px-3 text-right font-bold">Unit Rate</th>
                  <th className="py-2.5 px-3.5 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100 bg-white">
                {/* Travel */}
                {job.kmTravelled > 0 && (
                  <tr className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-slate-900">
                      Site Travelling & Vehicle Fuel ({job.kmTravelled} km round trip)
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{job.kmTravelled} km</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                      {formatCurrency(job.clientFuelRatePerKm, settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold font-mono text-blue-950">
                      {formatCurrency(job.travelCharge, settings.currencySymbol)}
                    </td>
                  </tr>
                )}

                {/* Labor */}
                {job.hoursOnSite > 0 && (
                  <tr className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-slate-900">
                      On-Site Technician Labor ({job.hoursOnSite} hours)
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{job.hoursOnSite} hrs</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                      {formatCurrency(job.hourlyRateClient, settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold font-mono text-blue-950">
                      {formatCurrency(job.laborCharge, settings.currencySymbol)}
                    </td>
                  </tr>
                )}

                {/* Stock Items */}
                {job.stockItems.map((item) => (
                  <tr key={item.stockItemId} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                      {formatCurrency(item.unitSellPrice, settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold font-mono text-blue-950">
                      {formatCurrency(item.quantity * item.unitSellPrice, settings.currencySymbol)}
                    </td>
                  </tr>
                ))}

                {/* Misc Expenses */}
                {job.miscExpenses.map((m) => (
                  <tr key={m.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-slate-900">{m.description}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">1</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                      {formatCurrency(m.chargeAmount, settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold font-mono text-blue-950">
                      {formatCurrency(m.chargeAmount, settings.currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t-2 border-blue-100 gap-4">
            <div className="text-xs text-slate-600 max-w-xs space-y-1">
              <p className="font-bold text-blue-950">Payment Terms & Notes:</p>
              <p>Payment due within 15 days of invoice date.</p>
              <p className="text-blue-800 font-medium">Thank you for choosing {settings.businessName}!</p>
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 font-mono px-2">
                <span>Subtotal:</span>
                <span>{formatCurrency(job.subtotal, settings.currencySymbol)}</span>
              </div>

              {job.discountAmount > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold font-mono px-2">
                  <span>Discount:</span>
                  <span>-{formatCurrency(job.discountAmount, settings.currencySymbol)}</span>
                </div>
              )}

              {job.taxRate > 0 && (
                <div className="flex justify-between text-slate-600 font-mono px-2">
                  <span>Tax / VAT ({job.taxRate}%):</span>
                  <span>{formatCurrency(job.taxTotal, settings.currencySymbol)}</span>
                </div>
              )}

              {/* Total Due Banner in Royal Blue & Yellow */}
              <div className="flex justify-between items-center bg-blue-950 text-white p-3 rounded-xl border-2 border-amber-400 shadow-md">
                <span className="font-black tracking-wide text-xs text-amber-300">TOTAL DUE:</span>
                <span className="font-black text-base font-mono text-amber-400">
                  {formatCurrency(job.totalInvoicePrice, settings.currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Banking & Payment Details Box */}
          <div className="bg-amber-50/70 border-2 border-amber-400/80 rounded-2xl p-4.5 text-xs shadow-xs">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-900" />
                <span className="font-extrabold text-blue-950 tracking-wide uppercase text-xs">
                  Banking & EFT Payment Details
                </span>
              </div>
              <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                Official EFT Details
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Account Name:</span>
                <strong className="text-blue-950 text-sm">{settings.accountName || 'Harrys aircon and Electrical'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Account Number:</span>
                <span className="bg-amber-200/70 border border-amber-300 text-blue-950 font-mono font-black text-sm px-2.5 py-0.5 rounded inline-block">
                  {settings.accountNumber || '53002734919'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Account Type:</span>
                <span className="text-slate-900 font-semibold">{settings.accountType || 'Current Business'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Bank & Branch Code:</span>
                <span className="text-slate-900 font-semibold">{settings.bankName || 'First National Bank'} ({settings.branchCode || '250655'})</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-amber-200/80 text-[11px] text-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
              <span>Please use invoice reference: <strong className="text-blue-900 font-mono font-black bg-blue-100 px-2 py-0.5 rounded text-xs">#{job.invoiceNumber}</strong></span>
              <span className="text-[10px] text-slate-600 font-medium">Proof of payment: <strong className="text-slate-800">{settings.email}</strong></span>
            </div>
          </div>
        </div>

        {/* BUSINESS OWNER PROFIT AUDIT DRAWER (Hidden when printed) */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 print:hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowProfitAudit(!showProfitAudit)}
              className="text-xs font-bold text-amber-400 flex items-center gap-1.5 cursor-pointer hover:underline"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Business Owner Profit & Cost Analysis</span>
              {showProfitAudit ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <div className="flex items-center gap-2">
              {onOpenAICopilot && (
                <button
                  onClick={onOpenAICopilot}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-md border border-indigo-400/30 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>AI Message Copilot</span>
                </button>
              )}

              {job.status !== 'Paid' && (
                <button
                  onClick={handleMarkPaid}
                  className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Mark Paid</span>
                </button>
              )}
            </div>
          </div>

          {showProfitAudit && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="p-2 bg-slate-950 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Travel Net Margin</span>
                <span className="font-bold text-white">
                  +{formatCurrency(job.travelCharge - job.travelCost, settings.currencySymbol)}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  Cost: {formatCurrency(job.travelCost, settings.currencySymbol)}
                </span>
              </div>

              <div className="p-2 bg-slate-950 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Labor Net Profit</span>
                <span className="font-bold text-white">
                  +{formatCurrency(job.laborCharge - job.laborCost, settings.currencySymbol)}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  Wage: {formatCurrency(job.laborCost, settings.currencySymbol)}
                </span>
              </div>

              <div className="p-2 bg-slate-950 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Stock Markup</span>
                <span className="font-bold text-white">
                  +{formatCurrency(job.stockCharge - job.stockCost, settings.currencySymbol)}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  Cost: {formatCurrency(job.stockCost, settings.currencySymbol)}
                </span>
              </div>

              <div className="p-2 bg-emerald-950/80 border border-emerald-500/30 rounded-lg text-right">
                <span className="text-[10px] text-emerald-400 block font-bold">
                  NET CALLOUT PROFIT
                </span>
                <span className="text-sm font-black text-emerald-400 block">
                  {formatCurrency(job.netProfit, settings.currencySymbol)}
                </span>
                <span className="text-[10px] text-emerald-300 font-bold block">
                  {job.profitMarginPercent.toFixed(1)}% Margin
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
