import React from 'react';
import { Wrench, Smartphone, Monitor, ShieldAlert, Sparkles, Download, Github } from 'lucide-react';
import { BusinessSettings } from '../types';

interface HeaderProps {
  settings: BusinessSettings;
  activeTab: string;
  isMobileDeviceFrame: boolean;
  setIsMobileDeviceFrame: (val: boolean) => void;
  lowStockCount: number;
  onOpenLowStock: () => void;
  onOpenAICopilot?: () => void;
  onOpenAppUpdates?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  activeTab,
  isMobileDeviceFrame,
  setIsMobileDeviceFrame,
  lowStockCount,
  onOpenLowStock,
  onOpenAICopilot,
  onOpenAppUpdates,
}) => {
  const tabTitles: Record<string, string> = {
    jobs: 'Callout Jobs & Invoices',
    inventory: 'Stock & Inventory',
    clients: 'Client Directory',
    analytics: 'Profit & Financial Analytics',
    settings: 'Business Settings',
  };

  return (
    <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 text-white px-4 py-3 sticky top-0 z-30 shadow-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Active Screen */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
            <Wrench className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>{settings.businessName}</span>
            </h1>
            <p className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
              <span>{tabTitles[activeTab] || 'Job & Stock Manager'}</span>
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* System Online Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-400">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span>System Active</span>
          </div>

          {/* Low stock alert badge if any */}
          {lowStockCount > 0 && (
            <button
              onClick={onOpenLowStock}
              className="flex items-center gap-1.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full font-semibold hover:bg-amber-500/30 transition-colors animate-pulse cursor-pointer"
              title="Low stock items need reordering"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{lowStockCount} Low Stock</span>
              <span className="sm:hidden">{lowStockCount}</span>
            </button>
          )}

          {/* GitHub Update button */}
          {onOpenAppUpdates && (
            <button
              onClick={onOpenAppUpdates}
              className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold px-2.5 py-1.5 rounded-xl border border-slate-700/80 shadow-sm transition-all cursor-pointer"
              title="Check GitHub for App & APK Updates"
            >
              <Github className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Update App</span>
            </button>
          )}

          {/* Gemini AI Copilot button */}
          {onOpenAICopilot && (
            <button
              onClick={onOpenAICopilot}
              className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-3 py-1.5 rounded-xl border border-indigo-400/40 shadow-lg shadow-indigo-900/30 transition-all cursor-pointer"
              title="Open Gemini AI Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
              <span className="hidden sm:inline">AI Copilot</span>
              <span className="sm:hidden">AI</span>
            </button>
          )}

          {/* Mobile frame toggle */}
          <button
            onClick={() => setIsMobileDeviceFrame(!isMobileDeviceFrame)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all ${
              isMobileDeviceFrame
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
            title={isMobileDeviceFrame ? 'Switch to Full Screen layout' : 'Simulate Smartphone View'}
          >
            {isMobileDeviceFrame ? (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Mobile Frame</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Full Screen</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
