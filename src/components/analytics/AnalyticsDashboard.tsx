import React from 'react';
import { TrendingUp, DollarSign, PieChart, ShieldAlert, PackageCheck, Fuel, Clock, Award, ArrowUpRight } from 'lucide-react';
import { CalloutJob, StockItem, BusinessSettings } from '../../types';
import { formatCurrency } from '../../lib/calculations';
import { ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface AnalyticsDashboardProps {
  jobs: CalloutJob[];
  stock: StockItem[];
  settings: BusinessSettings;
  onNavigateToStock: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  jobs,
  stock,
  settings,
  onNavigateToStock,
}) => {
  // Aggregate Financials
  const totalRevenue = jobs.reduce((sum, j) => sum + j.totalInvoicePrice, 0);
  const totalCosts = jobs.reduce((sum, j) => sum + j.totalCalloutCost, 0);
  const totalProfit = jobs.reduce((sum, j) => sum + j.netProfit, 0);
  const avgMargin = jobs.length > 0 ? (totalProfit / (totalRevenue || 1)) * 100 : 0;

  // Breakdown of Profit by Category across all jobs
  const travelProfit = jobs.reduce((sum, j) => sum + (j.travelCharge - j.travelCost), 0);
  const laborProfit = jobs.reduce((sum, j) => sum + (j.laborCharge - j.laborCost), 0);
  const stockProfit = jobs.reduce((sum, j) => sum + (j.stockCharge - j.stockCost), 0);
  const miscProfit = jobs.reduce((sum, j) => sum + (j.miscCharge - j.miscCost), 0);

  const profitCategoryData = [
    { name: 'Labor Profit', value: Math.max(0, laborProfit), color: '#38bdf8' },
    { name: 'Stock Markup', value: Math.max(0, stockProfit), color: '#10b981' },
    { name: 'Travel Fuel Markup', value: Math.max(0, travelProfit), color: '#f59e0b' },
    { name: 'Misc Expenses', value: Math.max(0, miscProfit), color: '#a855f7' },
  ];

  // Bar Chart Data (Top 5 Callouts)
  const jobBarData = jobs.slice(0, 5).map((j) => ({
    name: j.invoiceNumber,
    Revenue: j.totalInvoicePrice,
    Cost: j.totalCalloutCost,
    Profit: j.netProfit,
  }));

  // Low stock alert items
  const lowStockItems = stock.filter((s) => s.quantity <= s.minQuantity);

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner (Bento Header Cell) */}
      <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-5 shadow-xl text-slate-100">
        <label className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-1 block">
          Profit & Performance Analytics
        </label>
        <h2 className="text-xl font-bold text-white">
          Callout Net Profit & Inventory Margins
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Detailed breakdown of revenue earned vs fuel expenses, labor wages, and stock markup.
        </p>
      </div>

      {/* Main Financial Bento Cells */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Total Billed</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-white block mt-2">
            {formatCurrency(totalRevenue, settings.currencySymbol)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            {jobs.length} completed callouts
          </span>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Total Job Costs</span>
            <Fuel className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-rose-400 block mt-2">
            {formatCurrency(totalCosts, settings.currencySymbol)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Fuel + Wages + Parts Cost
          </span>
        </div>

        <div className="bg-indigo-600 rounded-3xl p-4 shadow-xl shadow-indigo-900/20 text-white flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-200 text-xs">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200">Net Callout Profit</span>
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white block mt-2">
            {formatCurrency(totalProfit, settings.currencySymbol)}
          </span>
          <span className="text-[10px] text-indigo-100 font-semibold mt-1 block">
            Pure profit after costs
          </span>
        </div>

        <div className="bg-slate-900/50 border border-emerald-500/30 p-4 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Avg Margin %</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-400 block mt-2">
            {avgMargin.toFixed(1)}%
          </span>
          <span className="text-[10px] text-emerald-300/80 font-bold mt-1 block">
            Overall business return
          </span>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profit Source Pie Chart */}
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl space-y-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-400" />
            <span>Profit Source Distribution</span>
          </h3>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={profitCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {profitCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [
                    formatCurrency(Number(val) || 0, settings.currencySymbol),
                    'Profit',
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    color: '#fff',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-800">
            {profitCategoryData.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-slate-400 text-[11px] truncate">{cat.name}:</span>
                <span className="text-white font-bold ml-auto font-mono text-[11px]">
                  {formatCurrency(cat.value, settings.currencySymbol)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Callout Revenue vs Cost Bar Chart */}
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl space-y-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Revenue vs Direct Costs per Callout</span>
          </h3>

          <div className="h-52 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jobBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  formatter={(val: any) => [
                    formatCurrency(Number(val) || 0, settings.currencySymbol),
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    color: '#fff',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="Revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Cost" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Profit" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-center gap-4 text-[11px] pt-1 text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm" /> Revenue
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" /> Cost
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> Net Profit
            </span>
          </div>
        </div>
      </div>

      {/* Low Stock Center Warning */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-500/40 p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Low Stock Action Center ({lowStockItems.length} items need restock)</span>
            </h3>
            <button
              onClick={onNavigateToStock}
              className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1 font-bold hover:bg-amber-500/30 transition-colors"
            >
              <span>Restock Now</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/80 border border-amber-900/60 p-3 rounded-2xl flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block">{item.name}</span>
                  <span className="text-[10px] text-amber-400 font-mono">SKU: {item.sku}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-amber-400 font-mono block">
                    {item.quantity} {item.unit}
                  </span>
                  <span className="text-[9px] text-slate-400 block">Min: {item.minQuantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
