import React, { useState } from 'react';
import { Plus, Search, Calendar, MapPin, Clock, FileText, CheckCircle2, Clock3, AlertCircle, TrendingUp, ChevronRight, Trash2, FileDown, RefreshCw, Mail, Phone, ArrowRight, Share2, CheckCheck, XCircle, Send, FileSpreadsheet } from 'lucide-react';
import { CalloutJob, QuoteStatus, BusinessSettings } from '../../types';
import { formatCurrency } from '../../lib/calculations';
import { downloadQuotePDF } from '../../lib/exportUtils';

interface QuoteListProps {
  quotes: CalloutJob[];
  settings: BusinessSettings;
  onNewQuote: () => void;
  onViewQuote: (quote: CalloutJob) => void;
  onEditQuote: (quote: CalloutJob) => void;
  onDeleteQuote?: (quoteId: string) => void;
  onStatusChange: (quote: CalloutJob, newStatus: QuoteStatus) => void;
  onConvertToInvoice: (quote: CalloutJob) => void;
}

export const QuoteList: React.FC<QuoteListProps> = ({
  quotes,
  settings,
  onNewQuote,
  onViewQuote,
  onEditQuote,
  onDeleteQuote,
  onStatusChange,
  onConvertToInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  const handleDownloadPdf = async (quote: CalloutJob) => {
    setDownloadingPdfId(quote.id);
    try {
      const res = await downloadQuotePDF(quote, settings);
      if (res?.blobUrl && !res?.shared) {
        try {
          window.open(res.blobUrl, '_blank');
        } catch (e) {
          console.warn('Popup blocked:', e);
        }
      }
    } catch (err) {
      console.error('Quote PDF Download failed:', err);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    const quoteNum = q.quoteNumber || q.invoiceNumber || '';
    const clientEmail = q.clientEmail || '';
    const matchesSearch =
      q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quoteNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.workDone.toLowerCase().includes(searchTerm.toLowerCase());

    const currentStatus = q.quoteStatus || q.status;
    const matchesStatus = selectedStatus === 'ALL' || currentStatus === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate totals for quick summary banner
  const totalQuotedValue = filteredQuotes.reduce((sum, q) => sum + q.totalInvoicePrice, 0);
  const acceptedQuotes = filteredQuotes.filter((q) => (q.quoteStatus || q.status) === 'Accepted');
  const totalAcceptedValue = acceptedQuotes.reduce((sum, q) => sum + q.totalInvoicePrice, 0);
  const pendingCount = filteredQuotes.filter((q) => (q.quoteStatus || q.status) === 'Draft' || (q.quoteStatus || q.status) === 'Sent').length;

  const handleDelete = (quote: CalloutJob) => {
    const qNum = quote.quoteNumber || quote.invoiceNumber;
    if (confirm(`Are you sure you want to delete quote "${qNum} - ${quote.jobTitle}"?`)) {
      if (onDeleteQuote) {
        onDeleteQuote(quote.id);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Accepted':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Accepted
          </span>
        );
      case 'Sent':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Send className="w-3 h-3" /> Sent to Client
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <FileText className="w-3 h-3" /> Draft
          </span>
        );
      case 'Declined':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> Declined
          </span>
        );
      case 'Converted':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <CheckCheck className="w-3 h-3" /> Converted to Invoice
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Quotation Action Banner */}
      <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-5 shadow-xl text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-1 block">
            Quotations & Trade Estimates
          </label>
          <h2 className="text-xl font-bold text-white">
            Create Quotes, Email Clients & Convert to Invoices
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Itemize labor, travel, parts & materials for customer approval. Auto-generate professional PDF quotes.
          </p>
        </div>

        <button
          onClick={onNewQuote}
          className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-3 rounded-2xl text-xs shadow-lg shadow-amber-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer border border-amber-400/30 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create New Quotation</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Quoted</span>
          <span className="text-lg font-black text-white font-mono mt-0.5 block">
            {formatCurrency(totalQuotedValue, settings.currencySymbol)}
          </span>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Pending Quotes</span>
          <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block">
            {pendingCount}
          </span>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Accepted Value</span>
          <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">
            {formatCurrency(totalAcceptedValue, settings.currencySymbol)}
          </span>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Quotes Recorded</span>
          <span className="text-lg font-black text-indigo-400 font-mono mt-0.5 block">
            {quotes.length}
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by quote #, client name, email address, or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 text-xs rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'Draft', 'Sent', 'Accepted', 'Declined', 'Converted'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`text-xs px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedStatus === st
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Quotations List */}
      {filteredQuotes.length === 0 ? (
        <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No Quotations Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm || selectedStatus !== 'ALL'
                ? 'No quotations match your current search criteria or filter.'
                : 'You have not created any quotations yet. Create your first quotation to estimate jobs and send professional pricing to clients.'}
            </p>
          </div>
          <button
            onClick={onNewQuote}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2.5 rounded-2xl text-xs shadow-lg inline-flex items-center gap-1.5 transition-all cursor-pointer border border-amber-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Quotation</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map((quote) => {
            const quoteNum = quote.quoteNumber || quote.invoiceNumber.replace('INV', 'QUO');
            const currentStatus = quote.quoteStatus || quote.status || 'Draft';

            return (
              <div
                key={quote.id}
                className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-3 hover:border-slate-700 transition-all shadow-sm group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                        {quoteNum}
                      </span>
                      {getStatusBadge(currentStatus)}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>Issued: {quote.date}</span>
                      </span>
                      {quote.validUntil && (
                        <span className="text-xs text-amber-300/80 font-medium">
                          • Valid to: {quote.validUntil}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                      {quote.jobTitle}
                    </h3>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Total Quoted</span>
                    <span className="text-xl font-black text-amber-400 font-mono block">
                      {formatCurrency(quote.totalInvoicePrice, settings.currencySymbol)}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Est. Profit: <strong className="text-emerald-400">{formatCurrency(quote.netProfit, settings.currencySymbol)}</strong> ({quote.profitMarginPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Client & Email Details Bar */}
                <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-4 flex-wrap text-slate-300">
                    <span className="font-bold text-white">{quote.clientName}</span>

                    {/* Client Email Space */}
                    {quote.clientEmail ? (
                      <a
                        href={`mailto:${quote.clientEmail}?subject=${encodeURIComponent(`Quotation ${quoteNum} - ${settings.businessName}`)}`}
                        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                        title="Click to email client"
                      >
                        <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="underline">{quote.clientEmail}</span>
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500 italic">
                        <Mail className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>No client email</span>
                      </span>
                    )}

                    {quote.clientPhone && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{quote.clientPhone}</span>
                      </span>
                    )}

                    {quote.clientAddress && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-xs">{quote.clientAddress}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Scope Preview */}
                {quote.workDone && (
                  <p className="text-xs text-slate-400 line-clamp-2 italic">
                    "{quote.workDone}"
                  </p>
                )}

                {/* Bottom Action Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onViewQuote(quote)}
                      className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm border border-amber-400/30"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View & PDF</span>
                    </button>

                    <button
                      onClick={() => handleDownloadPdf(quote)}
                      disabled={downloadingPdfId === quote.id}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 disabled:opacity-50"
                      title="Download PDF"
                    >
                      {downloadingPdfId === quote.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>PDF</span>
                    </button>

                    {quote.clientEmail && (
                      <a
                        href={`mailto:${quote.clientEmail}?subject=${encodeURIComponent(`Quotation ${quoteNum} - ${settings.businessName}`)}&body=${encodeURIComponent(`Dear ${quote.clientName},\n\nPlease find your Quotation ${quoteNum} for ${formatCurrency(quote.totalInvoicePrice, settings.currencySymbol)} attached from ${settings.businessName}.\n\nThank you!`)}`}
                        className="text-xs bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        title={`Direct email to ${quote.clientEmail}`}
                      >
                        <Mail className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {currentStatus !== 'Converted' && (
                      <button
                        onClick={() => onConvertToInvoice(quote)}
                        className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-all cursor-pointer border border-indigo-400/30"
                        title="Convert accepted quote to a Tax Invoice"
                      >
                        <span>Convert to Invoice</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => onEditQuote(quote)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1"
                    >
                      Edit
                    </button>

                    {onDeleteQuote && (
                      <button
                        onClick={() => handleDelete(quote)}
                        className="text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete Quote"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
