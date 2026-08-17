import React from 'react';
import { Briefcase, FileSpreadsheet, Boxes, Users, TrendingUp, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lowStockCount: number;
  unpaidCount: number;
  pendingQuotesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  unpaidCount,
  pendingQuotesCount = 0,
}) => {
  const tabs = [
    { id: 'jobs', label: 'Callouts', icon: Briefcase, badge: unpaidCount },
    { id: 'quotes', label: 'Quotes', icon: FileSpreadsheet, badge: pendingQuotesCount, badgeColor: 'bg-amber-500' },
    { id: 'inventory', label: 'Stock', icon: Boxes, badge: lowStockCount },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'analytics', label: 'Profit', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-slate-950/90 backdrop-blur-md border-t border-slate-800 text-slate-400 py-2.5 px-2 sticky bottom-0 z-30 shadow-2xl">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 relative px-2.5 py-1 rounded-2xl transition-all cursor-pointer ${
                isActive
                  ? tab.id === 'quotes' ? 'text-amber-400 font-bold scale-105' : 'text-indigo-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5]' : ''}`} />
                {!!tab.badge && tab.badge > 0 && (
                  <span className={`absolute -top-1.5 -right-2.5 ${tab.badgeColor || 'bg-indigo-500'} text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center shadow-sm`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight uppercase font-semibold">{tab.label}</span>
              {isActive && (
                <span className={`absolute -bottom-1 w-6 h-1 ${tab.id === 'quotes' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-indigo-500 shadow-indigo-500/50'} rounded-full shadow-sm`} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
