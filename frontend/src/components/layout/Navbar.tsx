import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Cpu, ShieldCheck, LogOut, ChevronDown, Activity, Sparkles } from 'lucide-react';

const POPULAR_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT'];

interface NavbarProps {
  currentTab?: string;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, llmStatus, binanceStatus, logout, activeSymbol, setActiveSymbol, setShowLLMSetup, setShowBinanceSetup } = useAuth();

  return (
    <header className="h-16 border-b border-white/10 glass-panel sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Left: Brand logo & Symbol Picker */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-cyan-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="font-black tracking-wider text-base text-white flex items-center gap-1.5">
              KRYPTON <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">PRO</span>
            </div>
          </div>
        </div>

        {/* Symbol Selector */}
        <div className="relative flex items-center gap-2 bg-slate-900/60 border border-white/10 px-3 py-1.5 rounded-xl">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <select
            value={activeSymbol}
            onChange={(e) => setActiveSymbol(e.target.value)}
            className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer pr-4"
          >
            {POPULAR_SYMBOLS.map((sym) => (
              <option key={sym} value={sym} className="bg-slate-900 text-white">
                {sym}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2" />
        </div>
      </div>

      {/* Right: Status Pill & User Info */}
      <div className="flex items-center gap-4">
        {/* LLM Status Pill */}
        <button
          onClick={() => setShowLLMSetup(true)}
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
            llmStatus?.is_valid
              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
              : 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{llmStatus?.is_valid ? `LLM: ${llmStatus.provider}` : 'LLM Key Required'}</span>
          <span className={`w-2 h-2 rounded-full ${llmStatus?.is_valid ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`} />
        </button>

        {/* Binance Status Pill */}
        <button
          onClick={() => setShowBinanceSetup(true)}
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
            binanceStatus?.is_active
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              : 'bg-slate-800/60 border-white/10 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{binanceStatus?.is_active ? 'Binance Connected' : 'Connect Binance'}</span>
          <span className={`w-2 h-2 rounded-full ${binanceStatus?.is_active ? 'bg-amber-400' : 'bg-slate-600'}`} />
        </button>

        {/* User Email & Logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-white/10">
          <span className="text-xs font-medium text-slate-300 hidden lg:inline max-w-[140px] truncate">
            {user?.email}
          </span>
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
