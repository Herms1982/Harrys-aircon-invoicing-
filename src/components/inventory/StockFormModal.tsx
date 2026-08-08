import React, { useState } from 'react';
import { X, Save, Boxes } from 'lucide-react';
import { StockItem, BusinessSettings } from '../../types';

interface StockFormModalProps {
  initialItem?: StockItem | null;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: StockItem) => void;
}

export const StockFormModal: React.FC<StockFormModalProps> = ({
  initialItem,
  settings,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [sku, setSku] = useState(initialItem?.sku || '');
  const [name, setName] = useState(initialItem?.name || '');
  const [category, setCategory] = useState(initialItem?.category || 'Electrical');
  const [costPrice, setCostPrice] = useState<number>(initialItem?.costPrice ?? 10);
  const [sellPrice, setSellPrice] = useState<number>(initialItem?.sellPrice ?? 25);
  const [quantity, setQuantity] = useState<number>(initialItem?.quantity ?? 10);
  const [minQuantity, setMinQuantity] = useState<number>(initialItem?.minQuantity ?? 3);
  const [unit, setUnit] = useState(initialItem?.unit || 'pcs');
  const [location, setLocation] = useState(initialItem?.location || 'Shelf A1');
  const [notes, setNotes] = useState(initialItem?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const item: StockItem = {
      id: initialItem?.id || `stk-${Date.now()}`,
      sku: sku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name.trim(),
      category,
      costPrice,
      sellPrice,
      quantity,
      minQuantity,
      unit,
      location,
      notes,
      updatedAt: new Date().toISOString(),
    };

    onSave(item);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-400" />
            <span>{initialItem ? 'Edit Stock Item' : 'Add New Stock Item'}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Part SKU / Code</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. BRK-63A"
                className="w-full bg-slate-950 border border-slate-800 text-indigo-400 font-mono font-bold rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white font-semibold rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
              >
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Cabling & Network">Cabling & Network</option>
                <option value="Lighting">Lighting</option>
                <option value="Backup Power">Backup Power</option>
                <option value="Hardware">Hardware</option>
                <option value="Tools & Spares">Tools & Spares</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Stock Item Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 3-Phase Main Circuit Breaker 63A"
              className="w-full bg-slate-950 border border-slate-800 text-white font-bold rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                Cost Price ({settings.currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 text-rose-400 font-mono font-bold rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                Client Sell Price ({settings.currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellPrice}
                onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Current Qty</label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 text-white font-mono font-bold rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Min Threshold</label>
              <input
                type="number"
                min="0"
                value={minQuantity}
                onChange={(e) => setMinQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs, m, roll"
                className="w-full bg-slate-950 border border-slate-800 text-white font-semibold rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Shelf / Warehouse Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Shelf B2"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Supplier Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Supplier code or spec"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-2xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center gap-1.5 shadow-lg shadow-indigo-900/40 border border-indigo-400/30 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Stock Item</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
