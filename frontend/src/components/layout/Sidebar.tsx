import React from 'react';
import { LayoutDashboard, Newspaper, LineChart, ShieldAlert, MessageSquareCode, Settings } from 'lucide-react';

export type NavTab = 'dashboard' | 'news' | 'indicators' | 'risk' | 'chat' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'news', label: 'News & Sentiment', icon: Newspaper },
    { id: 'indicators', label: 'Market Indicators', icon: LineChart },
    { id: 'risk', label: 'Risk Analysis', icon: ShieldAlert },
    { id: 'chat', label: 'AI Chat Assistant', icon: MessageSquareCode },
    { id: 'settings', label: 'API & Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-white/10 glass-panel min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
          Navigation Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-3.5 rounded-2xl glass-card border border-indigo-500/20 text-xs">
        <div className="flex items-center gap-2 text-indigo-300 font-bold mb-1">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          Multi-Agent Active
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Krypton backend graph evaluating technicals, news sentiment & risk parameters in real-time.
        </p>
      </div>
    </aside>
  );
};
