import React, { useState } from 'react';
import { X, Printer, CheckCircle2, TrendingUp, ChevronDown, ChevronUp, Copy, Check, MapPin, Phone, Mail, Share2, FileDown, RefreshCw, Eye, Download, Send, ArrowRight, CheckCheck, XCircle } from 'lucide-react';
import { CalloutJob, BusinessSettings, QuoteStatus } from '../../types';
import { formatCurrency, calculateJobTotals } from '../../lib/calculations';
import { downloadQuotePDF, shareQuotePDF, PDFSaveResult } from '../../lib/exportUtils';
import confetti from 'canvas-confetti';

interface QuoteViewModalProps {
  job: CalloutJob | null;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (job: CalloutJob, newStatus: QuoteStatus) => void;
  onConvertToInvoice: (job: CalloutJob) => void;
  onEditQuote: (job: CalloutJob) => void;
}

export const QuoteViewModal: React.FC<QuoteViewModalProps> = ({
  job,
  settings,
  isOpen,
  onClose,
  onStatusChange,
  onConvertToInvoice,
  onEditQuote,
}) => {
  if (!isOpen || !job) return null;

  const [showProfitAudit, setShowProfitAudit] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState(false);
  const [lastPdfResult, setLastPdfResult] = useState<PDFSaveResult | null>(null);

  const quoteNumber = job.quoteNumber || (job.invoiceNumber ? job.invoiceNumber.replace('INV', 'QUO') : `QUO-2026-001`);
  const totals = calculateJobTotals(job);

  const handleSavePDF = async () => {
    setIsSavingPdf(true);
    setPdfSuccessToast(false);
    try {
      const res = await downloadQuotePDF(job, settings);
      setLastPdfResult(res);
      setPdfSuccessToast(true);

      if (res?.blobUrl && !res?.shared) {
        try {
          window.open(res.blobUrl, '_blank');
        } catch (e) {
          console.warn('Popup blocked:', e);
        }
      }
    } catch (err) {
      console.error('PDF Save Error:', err);
      alert('Generating PDF failed. You can use the Print button to print or save as PDF directly.');
    } finally {
      setIsSavingPdf(false);
    }
  };

  const handleSharePDF = async () => {
    setIsSharingPdf(true);
    try {
      await shareQuotePDF(job, settings);
    } catch (err) {
      console.error('PDF Share Error:', err);
    } finally {
      setIsSharingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAcceptQuote = () => {
    onStatusChange(job, 'Accepted');
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const handleCopySummary = () => {
    const text = `QUOTATION ${quoteNumber}
Client: ${job.clientName}
Email: ${job.clientEmail || 'N/A'}
Date: ${job.date}
Valid Until: ${job.validUntil || '30 days from date'}
Total Quoted Amount: ${formatCurrency(job.totalInvoicePrice, settings.currencySymbol)}

Project: ${job.jobTitle}
Scope: ${job.workDone || 'See itemized details'}

Thank you for choosing ${settings.businessName}!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectEmail = () => {
    const subject = `Official Quotation ${quoteNumber} - ${settings.businessName}`;
    const body = `Dear ${job.clientName || 'Client'},\n\nPlease find the quotation summary below:\n\nQuotation: ${quoteNumber}\nProject: ${job.jobTitle}\nDate: ${job.date}\nValid Until: ${job.validUntil || '30 days'}\nTotal Amount: ${formatCurrency(job.totalInvoicePrice, settings.currencySymbol)}\n\nScope of Work:\n${job.workDone || 'As per discussed specifications'}\n\nPlease reply to this email to accept the quotation or let us know if you require any adjustments.\n\nWarm regards,\n${settings.ownerName || 'Harry'}\n${settings.businessName}\nTel: ${settings.phone}`;
    
    const mailtoUrl = `mailto:${job.clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:border-0 print:shadow-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between print:hidden flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              {quoteNumber}
            </span>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold ${
                job.quoteStatus === 'Accepted' || job.status === 'Accepted'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : job.quoteStatus === 'Sent'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : job.quoteStatus === 'Declined' || job.status === 'Declined'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : job.quoteStatus === 'Converted' || job.status === 'Converted'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {job.quoteStatus || job.status || 'Draft Quote'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {job.clientEmail && (
              <button
                onClick={handleDirectEmail}
                className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer border border-indigo-400/30"
                title={`Send direct email to ${job.clientEmail}`}
              >
                <Mail className="w-3.5 h-3.5 text-indigo-200" />
                <span className="hidden sm:inline">Email Client</span>
              </button>
            )}

            <button
              onClick={handleSharePDF}
              disabled={isSharingPdf}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer border border-indigo-400/30"
              title="Share Quote PDF directly via WhatsApp, Email, or Web Share"
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
              className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer border border-amber-400/30"
              title="Download Quote PDF directly"
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
              title="Copy quote summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-2.5 py-2 rounded-xl flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
              title="Print Quote"
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
          <div className="bg-amber-950/90 border-b border-amber-800/80 px-4 py-3 text-xs text-white space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400 stroke-[2.5]" />
                <span>Quotation PDF Generated Successfully!</span>
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
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View / Open PDF</span>
                </a>
              )}

              {lastPdfResult.blobUrl && (
                <a
                  href={lastPdfResult.blobUrl}
                  download={lastPdfResult.filename || `Quotation_${quoteNumber}.pdf`}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
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
            </div>
          </div>
        )}

        {/* PRINTABLE QUOTATION SHEET */}
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
                <span className="text-2xl sm:text-3xl font-black text-amber-700 tracking-widest uppercase block">
                  QUOTATION
                </span>
                <span className="inline-block text-xs font-mono font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md mt-1">
                  #{quoteNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block mt-1">
                  Date: <strong className="text-slate-800">{job.date}</strong>
                </span>
                {job.validUntil && (
                  <span className="text-xs text-amber-800 font-semibold block mt-0.5">
                    Valid Until: <strong>{job.validUntil}</strong>
                  </span>
                )}
                <span
                  className={`inline-block text-xs font-bold px-3 py-0.5 rounded-full mt-1.5 uppercase ${
                    job.quoteStatus === 'Accepted'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-400'
                  }`}
                >
                  Status: {job.quoteStatus || job.status}
                </span>
              </div>
            </div>
          </div>

          {/* Client & Quotation Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quoted To Box */}
            <div className="bg-gradient-to-r from-blue-50/80 to-sky-50/50 border border-blue-200 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider block">
                QUOTED TO:
              </span>
              <div className="text-sm font-bold text-blue-950 mt-0.5">{job.clientName}</div>
              
              {/* Space for Client Email Address */}
              {job.clientEmail ? (
                <div className="text-xs text-blue-800 font-semibold mt-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{job.clientEmail}</span>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic mt-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>No client email recorded</span>
                </div>
              )}

              {job.clientPhone && (
                <div className="text-xs text-slate-700 mt-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{job.clientPhone}</span>
                </div>
              )}

              {job.clientAddress && (
                <div className="text-xs text-slate-700 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{job.clientAddress}</span>
                </div>
              )}
            </div>

            {/* Scope Box */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                PROJECT SPECIFICATION:
              </span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{job.jobTitle}</div>
              {job.workDone && (
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-3">
                  {job.workDone}
                </p>
              )}
            </div>
          </div>

          {/* Itemized Quotation Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-blue-900 text-white font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Description & Scope</th>
                  <th className="py-2.5 px-3 text-center">Qty / Hrs</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {/* Travel */}
                {job.kmTravelled > 0 && (
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-3">
                      <span className="font-bold text-blue-950">Site Travel & Callout Charge</span>
                      <span className="block text-[11px] text-slate-500">({job.kmTravelled} km round trip)</span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono">1</td>
                    <td className="py-2 px-3 text-right font-mono">{formatCurrency(job.travelCharge, settings.currencySymbol)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-950">{formatCurrency(job.travelCharge, settings.currencySymbol)}</td>
                  </tr>
                )}

                {/* Labor */}
                {job.hoursOnSite > 0 && (
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-3">
                      <span className="font-bold text-blue-950">Technical Installation & Labor</span>
                      <span className="block text-[11px] text-slate-500">Certified technician on-site</span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono">{job.hoursOnSite} hrs</td>
                    <td className="py-2 px-3 text-right font-mono">{formatCurrency(job.hourlyRateClient, settings.currencySymbol)}/hr</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-950">{formatCurrency(job.laborCharge, settings.currencySymbol)}</td>
                  </tr>
                )}

                {/* Stock Items */}
                {job.stockItems.map((stk, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3">
                      <span className="font-bold text-blue-950">{stk.name}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">{stk.sku}</span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono">{stk.quantity} {stk.unit}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatCurrency(stk.unitSellPrice, settings.currencySymbol)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-950">
                      {formatCurrency(stk.quantity * stk.unitSellPrice, settings.currencySymbol)}
                    </td>
                  </tr>
                ))}

                {/* Misc */}
                {job.miscExpenses.map((m, idx) => (
                  <tr key={`m-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold">{m.description}</td>
                    <td className="py-2 px-3 text-center font-mono">1</td>
                    <td className="py-2 px-3 text-right font-mono">{formatCurrency(m.chargeAmount, settings.currencySymbol)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-950">{formatCurrency(m.chargeAmount, settings.currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 bg-gradient-to-br from-amber-50 to-slate-50 border border-amber-200 p-4 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold">{formatCurrency(totals.subtotal, settings.currencySymbol)}</span>
              </div>
              {job.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Special Discount:</span>
                  <span className="font-mono">-{formatCurrency(job.discountAmount, settings.currencySymbol)}</span>
                </div>
              )}
              {job.taxRate > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>VAT ({job.taxRate}%):</span>
                  <span className="font-mono">{formatCurrency(totals.taxTotal, settings.currencySymbol)}</span>
                </div>
              )}
              <div className="pt-2 border-t-2 border-amber-300 flex justify-between items-center text-sm font-black text-blue-950">
                <span>TOTAL QUOTE:</span>
                <span className="font-mono text-base text-amber-700">
                  {formatCurrency(totals.totalInvoicePrice, settings.currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Acceptance Box */}
          <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl space-y-3">
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-widest block">
              Quotation Terms & Conditions
            </span>
            <p className="text-xs text-slate-700 leading-relaxed">
              {job.quoteNotes || settings.defaultQuoteTerms || "Quotation is valid for 30 days. All workmanship carries a 6-month warranty. Parts & equipment covered by manufacturer warranty. 50% deposit required for special equipment orders."}
            </p>

            <div className="pt-3 border-t border-amber-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px] text-slate-600">
              <div>
                <span className="block font-bold text-slate-700 mb-4">Client Acceptance Signature:</span>
                <div className="border-b border-slate-400 w-full" />
              </div>
              <div>
                <span className="block font-bold text-slate-700 mb-4">Date:</span>
                <div className="border-b border-slate-400 w-full" />
              </div>
              <div>
                <span className="block font-bold text-slate-700 mb-4">Print Name:</span>
                <div className="border-b border-slate-400 w-full" />
              </div>
            </div>
          </div>

          {/* Banking Details */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-1">
            <span className="text-[10px] font-extrabold text-blue-950 uppercase tracking-wider block mb-1">
              Deposit & Banking Information:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
              <div>
                <span className="text-slate-400 text-[10px] block">Bank:</span>
                <strong>{settings.bankName || 'FNB'}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Account No:</span>
                <strong className="font-mono text-blue-950">{settings.accountNumber || '53002734919'}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Branch:</span>
                <strong className="font-mono">{settings.branchCode || '250655'}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Reference:</span>
                <strong className="font-mono text-amber-700">{quoteNumber}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar (Hidden when printing) */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          {/* Internal Margin preview toggle */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowProfitAudit(!showProfitAudit)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <TrendingUp className="w-4 h-4" />
              <span>{showProfitAudit ? 'Hide Cost/Margin Breakdown' : 'Show Internal Profit Audit'}</span>
              {showProfitAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={() => onEditQuote(job)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer border border-slate-700"
            >
              Edit Quote
            </button>

            {job.quoteStatus !== 'Accepted' && (
              <button
                onClick={handleAcceptQuote}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer border border-emerald-400/30"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark Accepted</span>
              </button>
            )}

            <button
              onClick={() => onConvertToInvoice(job)}
              className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-lg shadow-indigo-900/40 transition-all cursor-pointer border border-indigo-400/30"
            >
              <span>Convert to Tax Invoice</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Internal Profit Audit (Hidden when printing) */}
        {showProfitAudit && (
          <div className="bg-slate-950 p-4 border-t border-slate-800 text-xs text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Est. Direct Costs</span>
              <span className="text-sm font-bold text-white font-mono">
                {formatCurrency(job.totalCalloutCost, settings.currencySymbol)}
              </span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Quoted Revenue</span>
              <span className="text-sm font-bold text-white font-mono">
                {formatCurrency(job.totalInvoicePrice, settings.currencySymbol)}
              </span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Est. Net Profit</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {formatCurrency(job.netProfit, settings.currencySymbol)}
              </span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Est. Margin</span>
              <span className="text-sm font-bold text-amber-400 font-mono">
                {job.profitMarginPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
