import React from 'react';
import { X, History, ArrowDownRight, ArrowUpRight, FileText } from 'lucide-react';
import { StockLog } from '../../types';

interface StockLogModalProps {
  logs: StockLog[];
  isOpen: boolean;
  onClose: () => void;
}

export const StockLogModal: React.FC<StockLogModalProps> = ({ logs, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              <span>Inventory Subtraction & Restock Log</span>
            </h2>
            <p className="text-xs text-slate-400">
              Audit history of stock movements triggered by client callout invoicing.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {logs.length === 0 ? (
            <p className="text-center text-slate-500 text-xs py-8">No inventory movements recorded yet.</p>
          ) : (
            logs.map((log) => {
              const isDeduction = log.changeQuantity < 0;

              return (
                <div
                  key={log.id}
                  className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isDeduction
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {isDeduction ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="font-semibold text-white">{log.stockItemName}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-amber-400">{log.reason}</span>
                        {log.jobInvoiceNumber && (
                          <span className="font-mono bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                            {log.jobInvoiceNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono font-bold text-sm block ${
                        isDeduction ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {log.changeQuantity > 0 ? `+${log.changeQuantity}` : log.changeQuantity}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      New level: {log.newQuantity}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
