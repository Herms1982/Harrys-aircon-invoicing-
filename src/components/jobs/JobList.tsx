import React, { useState } from 'react';
import { Plus, Search, Calendar, MapPin, Clock, PackageCheck, FileText, CheckCircle2, Clock3, AlertCircle, DollarSign, TrendingUp, ChevronRight, Trash2, FileDown } from 'lucide-react';
import { CalloutJob, JobStatus, BusinessSettings } from '../../types';
import { formatCurrency } from '../../lib/calculations';
import { downloadInvoicePDF } from '../../lib/exportUtils';

interface JobListProps {
  jobs: CalloutJob[];
  settings: BusinessSettings;
  onNewJob: () => void;
  onViewInvoice: (job: CalloutJob) => void;
  onEditJob: (job: CalloutJob) => void;
  onDeleteJob?: (jobId: string) => void;
  onStatusChange: (job: CalloutJob, newStatus: JobStatus) => void;
}

export const JobList: React.FC<JobListProps> = ({
  jobs,
  settings,
  onNewJob,
  onViewInvoice,
  onEditJob,
  onDeleteJob,
  onStatusChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.workDone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === 'ALL' || job.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate totals for quick summary banner
  const totalBilled = filteredJobs.reduce((sum, j) => sum + j.totalInvoicePrice, 0);
  const totalProfit = filteredJobs.reduce((sum, j) => sum + j.netProfit, 0);
  const avgMargin =
    filteredJobs.length > 0
      ? filteredJobs.reduce((sum, j) => sum + j.profitMarginPercent, 0) /
        filteredJobs.length
      : 0;

  const handleDelete = (job: CalloutJob) => {
    if (confirm(`Are you sure you want to delete callout job "${job.invoiceNumber} - ${job.jobTitle}"?`)) {
      if (onDeleteJob) {
        onDeleteJob(job.id);
      }
    }
  };

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case 'Invoiced':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Clock3 className="w-3 h-3" /> Invoiced
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <FileText className="w-3 h-3" /> Draft
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" /> Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Quick Callout Action Banner */}
      <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-5 shadow-xl text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-1 block">
            Callouts & Invoicing Hub
          </label>
          <h2 className="text-xl font-bold text-white">
            Log Job, Deduct Stock & Track Profit
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Auto-calculates travel fuel costs, labor on site, stock used, and net profit margin.
          </p>
        </div>
        <button
          onClick={onNewJob}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-2xl text-xs shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer border border-indigo-400/30"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="uppercase tracking-wider">New Callout Job</span>
        </button>
      </div>

      {/* Financial Quick Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl flex flex-col justify-between">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">
            Total Invoiced
          </label>
          <span className="text-2xl font-black text-white mt-1">
            {formatCurrency(totalBilled, settings.currencySymbol)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1">
            {filteredJobs.length} matching jobs
          </span>
        </div>

        <div className="bg-indigo-600 rounded-3xl p-4 shadow-xl shadow-indigo-900/20 text-white flex flex-col justify-between">
          <label className="text-[10px] uppercase tracking-widest text-indigo-200 font-bold block">
            Net Callout Profit
          </label>
          <span className="text-3xl font-black text-white mt-1">
            {formatCurrency(totalProfit, settings.currencySymbol)}
          </span>
          <span className="text-[10px] text-indigo-100 font-semibold mt-1">
            Pure gain after labor & parts cost
          </span>
        </div>

        <div className="bg-slate-900/50 border border-emerald-500/30 p-4 rounded-3xl flex flex-col justify-between">
          <label className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold block">
            Average Profit Margin
          </label>
          <span className="text-2xl font-black text-emerald-400 mt-1">
            {avgMargin.toFixed(1)}%
          </span>
          <span className="text-[10px] text-emerald-300/80 font-mono mt-1">
            Average markup return
          </span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search client, invoice #, or job notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 text-xs rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'Paid', 'Invoiced', 'Draft'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`text-xs px-3.5 py-2.5 rounded-2xl font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                selectedStatus === status
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List Bento Cards */}
      {filteredJobs.length === 0 ? (
        <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No Callout Jobs Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You haven't logged any callout jobs yet. Click below to create your first client callout invoice.
            </p>
          </div>
          <button
            onClick={onNewJob}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-2xl text-xs shadow-lg inline-flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Callout Job</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const stockCount = job.stockItems.reduce((acc, item) => acc + item.quantity, 0);

            return (
              <div
                key={job.id}
                className="bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 transition-all shadow-sm group hover:shadow-md"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                        {job.invoiceNumber}
                      </span>
                      {getStatusBadge(job.status)}
                      {job.stockDeducted && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md font-mono">
                          ✓ Stock Subtracted
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {job.jobTitle}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{job.clientName}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
                      {job.date}
                    </span>
                    <div className="text-lg font-black text-white mt-0.5">
                      {formatCurrency(job.totalInvoicePrice, settings.currencySymbol)}
                    </div>
                  </div>
                </div>

                {/* Metrics pill row */}
                <div className="grid grid-cols-3 gap-2 my-3.5 py-2.5 px-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{job.kmTravelled} km</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{job.hoursOnSite} hrs on site</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <PackageCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{stockCount} stock parts</span>
                  </div>
                </div>

                {/* Profit Margin Bar & Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  {/* Profit summary */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 font-bold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Profit: {formatCurrency(job.netProfit, settings.currencySymbol)}</span>
                      <span className="text-[10px] text-emerald-300 bg-emerald-900/50 px-1.5 py-0.2 rounded ml-1 font-mono">
                        {job.profitMarginPercent.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => downloadInvoicePDF(job, settings)}
                      className="text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold px-2.5 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Download Invoice PDF"
                    >
                      <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                    <button
                      onClick={() => onEditJob(job)}
                      className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-slate-800 transition-colors font-medium"
                    >
                      Edit
                    </button>
                    {onDeleteJob && (
                      <button
                        onClick={() => handleDelete(job)}
                        className="text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded-xl hover:bg-rose-950/50 transition-colors"
                        title="Delete Job"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onViewInvoice(job)}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded-xl border border-indigo-400/30 flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                    >
                      <span>Invoice</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
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
