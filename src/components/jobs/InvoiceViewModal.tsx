import React, { useState } from 'react';
import { X, Printer, CheckCircle2, TrendingUp, ChevronDown, ChevronUp, Copy, Check, MapPin, Phone, Mail, Share2 } from 'lucide-react';
import { CalloutJob, BusinessSettings, JobStatus } from '../../types';
import { formatCurrency } from '../../lib/calculations';
import confetti from 'canvas-confetti';

interface InvoiceViewModalProps {
  job: CalloutJob | null;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (job: CalloutJob, newStatus: JobStatus) => void;
  onEditJob: (job: CalloutJob) => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  job,
  settings,
  isOpen,
  onClose,
  onStatusChange,
  onEditJob,
}) => {
  if (!isOpen || !job) return null;

  const [showProfitAudit, setShowProfitAudit] = useState(true);
  const [copied, setCopied] = useState(false);

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

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl border border-slate-700 flex items-center gap-1 transition-colors font-semibold"
              title="Copy invoice summary to share"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer border border-indigo-400/30"
              title="Print invoice or save as PDF"
            >
              <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE INVOICE SHEET */}
        <div className="print-sheet p-6 sm:p-8 bg-white text-slate-900 font-sans space-y-6 overflow-y-auto flex-1 print:p-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-slate-950 tracking-tight">
                {settings.businessName}
              </h1>
              <p className="text-xs text-slate-600 mt-1">{settings.address}</p>
              <p className="text-xs text-slate-600">
                Phone: {settings.phone} | Email: {settings.email}
                {settings.website && ` | Web: ${settings.website}`}
              </p>
              {settings.taxNumber && (
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Tax No: {settings.taxNumber}
                </p>
              )}
            </div>

            <div className="sm:text-right">
              <span className="text-2xl font-black text-slate-900 tracking-widest uppercase block">
                INVOICE
              </span>
              <span className="text-sm font-mono font-bold text-amber-600 block mt-1">
                #{job.invoiceNumber}
              </span>
              <span className="text-xs text-slate-500 block mt-1">
                Date: <strong className="text-slate-800">{job.date}</strong>
              </span>
              <span
                className={`inline-block text-xs font-bold px-3 py-0.5 rounded-md mt-2 uppercase ${
                  job.status === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                Status: {job.status}
              </span>
            </div>
          </div>

          {/* Client Details */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              BILLED TO:
            </span>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{job.clientName}</div>
            <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{job.clientAddress}</span>
            </div>
            {job.clientPhone && (
              <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{job.clientPhone}</span>
              </div>
            )}
          </div>

          {/* Job description */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Work Performed: {job.jobTitle}
            </h3>
            <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1.5 leading-relaxed">
              {job.workDone || 'Site callout and diagnostic inspection completed.'}
            </p>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700">
                  <th className="py-2.5 px-3 font-bold">Service / Item Description</th>
                  <th className="py-2.5 px-3 text-center font-bold">Qty / Units</th>
                  <th className="py-2.5 px-3 text-right font-bold">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Travel */}
                {job.kmTravelled > 0 && (
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      Site Travelling & Vehicle Fuel ({job.kmTravelled} km round trip)
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{job.kmTravelled} km</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                      {formatCurrency(job.clientFuelRatePerKm, settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                      {formatCurrency(job.travelCharge, settings.currencySymbol)}
                    </td>
                  </tr>
                )}

                {/* Labor */}
                {job.hoursOnSite > 0 && (
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      On-Site Technician Labor ({job.hoursOnSite} hours)
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{job.hoursOnSite} hrs</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                      {formatCurrency(job.hourlyRateClient, settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                      {formatCurrency(job.laborCharge, settings.currencySymbol)}
                    </td>
                  </tr>
                )}

                {/* Stock Items */}
                {job.stockItems.map((item) => (
                  <tr key={item.stockItemId}>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                      {formatCurrency(item.unitSellPrice, settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                      {formatCurrency(item.quantity * item.unitSellPrice, settings.currencySymbol)}
                    </td>
                  </tr>
                ))}

                {/* Misc Expenses */}
                {job.miscExpenses.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{m.description}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">1</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                      {formatCurrency(m.chargeAmount, settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                      {formatCurrency(m.chargeAmount, settings.currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t border-slate-300 gap-4">
            <div className="text-xs text-slate-500 max-w-xs space-y-1">
              <p className="font-semibold text-slate-700">Payment Terms & Notes:</p>
              <p>Payment due within 15 days of invoice date.</p>
              <p>Thank you for choosing {settings.businessName}!</p>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(job.subtotal, settings.currencySymbol)}</span>
              </div>

              {job.discountAmount > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>Discount:</span>
                  <span>-{formatCurrency(job.discountAmount, settings.currencySymbol)}</span>
                </div>
              )}

              {job.taxRate > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax / VAT ({job.taxRate}%):</span>
                  <span>{formatCurrency(job.taxTotal, settings.currencySymbol)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-extrabold text-slate-950 pt-2 border-t-2 border-slate-900">
                <span>TOTAL DUE:</span>
                <span>{formatCurrency(job.totalInvoicePrice, settings.currencySymbol)}</span>
              </div>
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
