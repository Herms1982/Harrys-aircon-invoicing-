import React, { useState } from 'react';
import {
  Plus,
  Search,
  ShieldAlert,
  Package,
  TrendingUp,
  RefreshCw,
  History,
  Edit,
  Trash2,
  ArrowUpRight,
  AlertTriangle,
  Boxes,
  FileSpreadsheet,
  FileDown,
  Printer,
  Share2,
  Check,
  Camera,
  Sparkles,
} from 'lucide-react';
import { StockItem, BusinessSettings, STOCK_CATEGORIES } from '../../types';
import { formatCurrency } from '../../lib/calculations';
import { exportStockToExcel, downloadStockPDF, shareStockListText } from '../../lib/exportUtils';

function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case 'Electrical':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'Solar':
      return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
    case 'Refrigeration':
      return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    case 'Air Conditioning':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case 'Security and CCTV':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
}

interface InventoryListProps {
  stock: StockItem[];
  settings: BusinessSettings;
  onAddStock: () => void;
  onEditStock: (item: StockItem) => void;
  onDeleteStock?: (id: string) => void;
  onAdjustStockQty: (itemId: string, changeQty: number, reason: string) => void;
  onOpenLogs: () => void;
  onPopulateCatalog?: () => void;
  onScanInvoice?: () => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({
  stock,
  settings,
  onAddStock,
  onEditStock,
  onDeleteStock,
  onAdjustStockQty,
  onOpenLogs,
  onPopulateCatalog,
  onScanInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShareList = async () => {
    const isShared = await shareStockListText(stock, settings);
    if (!isShared) {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  // Order categories: ALL, then 5 standard categories, then any custom categories
  const standardSet = new Set<string>(STOCK_CATEGORIES as readonly string[]);
  const presentCategories: string[] = Array.from(new Set(stock.map((s) => s.category)));
  const customCategories = presentCategories.filter((c: string) => !standardSet.has(c));
  const categories = ['ALL', ...STOCK_CATEGORIES, ...customCategories];

  const filteredStock = stock.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' || item.category === selectedCategory;

    const isLow = item.quantity <= item.minQuantity;
    const matchesLowFilter = !showLowStockOnly || isLow;

    return matchesSearch && matchesCategory && matchesLowFilter;
  });

  // Calculate stock inventory financial value
  const totalCostValue = stock.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);
  const totalRetailValue = stock.reduce((sum, item) => sum + item.quantity * item.sellPrice, 0);
  const lowStockCount = stock.filter((item) => item.quantity <= item.minQuantity).length;

  const handleDelete = (item: StockItem) => {
    if (confirm(`Are you sure you want to delete "${item.name}" from stock inventory?`)) {
      if (onDeleteStock) {
        onDeleteStock(item.id);
      }
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-5 shadow-xl text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-1 block">
            Inventory & Stock Control
          </label>
          <h2 className="text-xl font-bold text-white">
            Parts Catalog & Auto-Deductions
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tracks available parts, unit cost prices, selling margins, and low stock warnings.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            onClick={() => exportStockToExcel(stock, settings)}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold px-3 py-2 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Export stock list to Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel</span>
          </button>

          <button
            onClick={() => downloadStockPDF(stock, settings)}
            className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-bold px-3 py-2 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Download formatted Stock Inventory PDF Report"
          >
            <FileDown className="w-4 h-4 text-indigo-400" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleShareList}
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold px-3 py-2 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Share or Copy stock catalog text for WhatsApp/Email"
          >
            {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedShare ? 'Copied' : 'Share'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold px-3 py-2 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Print stock list"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={onOpenLogs}
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold px-3 py-2 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Log</span>
          </button>

          {onScanInvoice && (
            <button
              onClick={onScanInvoice}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-4 py-2 rounded-2xl text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-amber-400/50"
              title="Scan supplier tax invoice or slip to auto-match and restock inventory items"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <span>Scan Invoice</span>
              <span className="text-[9px] bg-slate-950/80 text-amber-300 px-1.5 py-0.2 rounded-full font-mono ml-0.5">
                AI
              </span>
            </button>
          )}

          {onPopulateCatalog && (
            <button
              onClick={onPopulateCatalog}
              className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold px-3.5 py-2 rounded-2xl text-xs flex items-center justify-center gap-1.5 border border-emerald-500/40 transition-colors cursor-pointer shadow-sm"
              title="Load full 58 single-phase domestic electrical stock items catalog"
            >
              <Boxes className="w-3.5 h-3.5 text-emerald-400" />
              <span>Load Catalog</span>
            </button>
          )}

          <button
            onClick={onAddStock}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-2xl text-xs shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-indigo-400/30"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Part Item</span>
          </button>
        </div>
      </div>

      {/* Financial Valuation Summary Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl flex flex-col justify-between">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Stock Cost Valuation</label>
          <span className="text-2xl font-black text-white mt-1">
            {formatCurrency(totalCostValue, settings.currencySymbol)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1">Total wholesale asset value</span>
        </div>

        <div className="bg-slate-900/50 border border-emerald-500/30 p-4 rounded-3xl flex flex-col justify-between">
          <label className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold block">Retail Sale Value</label>
          <span className="text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(totalRetailValue, settings.currencySymbol)}
          </span>
          <span className="text-[10px] text-emerald-300/70 font-mono mt-1">Estimated customer invoice potential</span>
        </div>

        <div
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
            lowStockCount > 0
              ? 'bg-amber-950/30 border-amber-500/50 text-amber-300'
              : 'bg-slate-900/50 border-slate-800 text-slate-300'
          }`}
        >
          <label className="text-[10px] uppercase tracking-widest font-bold flex items-center justify-between">
            <span>Low Stock Items</span>
            {lowStockCount > 0 && <ShieldAlert className="w-4 h-4 text-amber-400" />}
          </label>
          <span className="text-2xl font-black mt-1">
            {lowStockCount} {lowStockCount === 1 ? 'part' : 'parts'}
          </span>
          <span className="text-[10px] text-slate-400 font-medium mt-1">
            {showLowStockOnly ? 'Showing low stock filter' : 'Click to filter low stock items'}
          </span>
        </div>
      </div>

      {/* Controls: Search & Category pills */}
      <div className="space-y-2">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by part name, SKU, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 text-xs rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3.5 py-2 rounded-2xl font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
            {showLowStockOnly && (
              <button
                onClick={() => setShowLowStockOnly(false)}
                className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-2 rounded-2xl font-bold uppercase tracking-wider"
              >
                Low Stock Only (Clear)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stock Cards Bento Grid */}
      {filteredStock.length === 0 ? (
        <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No Stock Items in Catalog</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You currently have no inventory parts listed. Add parts to automatically deduct stock on callouts.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {onScanInvoice && (
              <button
                onClick={onScanInvoice}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-5 py-2.5 rounded-2xl text-xs shadow-lg shadow-amber-500/20 inline-flex items-center gap-1.5 transition-all cursor-pointer border border-amber-400/50"
              >
                <Camera className="w-4 h-4 stroke-[2.5]" />
                <span>Scan Supplier Invoice Slip (AI)</span>
              </button>
            )}
            {onPopulateCatalog && (
              <button
                onClick={onPopulateCatalog}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-2xl text-xs shadow-lg inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Boxes className="w-4 h-4 text-white" />
                <span>Load Domestic Electrical Catalog (58 Items)</span>
              </button>
            )}
            <button
              onClick={onAddStock}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-2xl text-xs shadow-lg inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Custom Part Item</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredStock.map((item) => {
            const isLow = item.quantity <= item.minQuantity;
            const unitProfit = item.sellPrice - item.costPrice;
            const margin = item.sellPrice > 0 ? (unitProfit / item.sellPrice) * 100 : 0;

            return (
              <div
                key={item.id}
                className={`bg-slate-900/50 border rounded-3xl p-5 transition-all relative flex flex-col justify-between ${
                  isLow
                    ? 'border-amber-500/50 shadow-md shadow-amber-500/5'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                        {item.sku}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ml-2 ${getCategoryBadgeClass(item.category)}`}>
                        {item.category}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                        {item.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditStock(item)}
                        className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                        title="Edit Item"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {onDeleteStock && (
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-rose-400 hover:text-rose-300 p-1.5 rounded-xl hover:bg-rose-950/50 transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stock Quantity Badge */}
                  <div className="my-3.5 flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Available Units</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span
                          className={`text-xl font-black font-mono ${
                            isLow ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {item.quantity}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{item.unit}</span>
                      </div>
                    </div>

                    {/* Stock adjustments (+1 / -1) */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() =>
                          onAdjustStockQty(item.id, -1, 'Manual Deduction / Adjustment')
                        }
                        className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-sm flex items-center justify-center cursor-pointer"
                        title="Subtract 1"
                      >
                        -
                      </button>
                      <button
                        onClick={() =>
                          onAdjustStockQty(item.id, 1, 'Manual Restock / Adjustment')
                        }
                        className="w-8 h-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm flex items-center justify-center cursor-pointer shadow-sm"
                        title="Add 1"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="grid grid-cols-3 gap-1 text-xs font-mono py-1 border-t border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Unit Cost</span>
                      <span className="text-slate-300 font-bold">
                        {formatCurrency(item.costPrice, settings.currencySymbol)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Unit Sell</span>
                      <span className="text-white font-bold">
                        {formatCurrency(item.sellPrice, settings.currencySymbol)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-emerald-400 block font-sans">Margin %</span>
                      <span className="text-emerald-400 font-bold">{margin.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* Footer warning if low */}
                {isLow && (
                  <div className="mt-2.5 text-[11px] text-amber-300 bg-amber-950/60 border border-amber-800/60 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Below safety threshold ({item.minQuantity} min)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
