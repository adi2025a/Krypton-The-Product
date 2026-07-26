import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import type { RiskProfileResponse } from '../types';
import { ShieldAlert, ShieldCheck, Key, RefreshCw, AlertTriangle, CheckCircle2, PieChart, ArrowUpRight, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export const RiskPage: React.FC = () => {
  const { activeSymbol, binanceStatus, setShowBinanceSetup } = useAuth();

  const [riskProfile, setRiskProfile] = useState<RiskProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notConnected, setNotConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRiskProfile = async () => {
    setLoading(true);
    setError(null);
    setNotConnected(false);

    if (!binanceStatus?.is_active) {
      setNotConnected(true);
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.get<RiskProfileResponse>(`/risk/profile?symbol=${activeSymbol}`);
      setRiskProfile(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setNotConnected(true);
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch risk profile from Binance');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskProfile();
  }, [activeSymbol, binanceStatus]);

  if (notConnected || !binanceStatus?.is_active) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-8 md:p-12 rounded-3xl border border-amber-500/40 text-center space-y-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 bg-amber-500/20 border border-amber-500/40 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
            <Lock className="w-10 h-10 text-amber-400" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
              Access Restricted
            </span>
            <h1 className="text-3xl font-extrabold text-white">Binance Account Required</h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Personalized Risk Analysis requires access to your live portfolio balances to compute asset concentration risk, position sizing limits, stop-loss margins, and liquidation distance.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 max-w-lg mx-auto text-left text-xs text-slate-300 space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> What you unlock when connected:
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>Concentration Risk Assessment (% holding in {activeSymbol})</li>
              <li>Portfolio Value-at-Risk (VaR) calculation</li>
              <li>Automated leverage safety buffer warnings</li>
              <li>Personalized stop-loss & position sizing recommendations</li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowBinanceSetup(true)}
              className="py-4 px-8 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-sm rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-3 mx-auto transition-all transform hover:scale-[1.02]"
            >
              <Key className="w-5 h-5" />
              <span>Connect Binance API Key & Secret</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-amber-500/30 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              Portfolio Risk Analysis <span className="text-amber-400 font-mono text-base">[{activeSymbol}]</span>
            </h1>
            <p className="text-xs text-slate-400">
              Live Binance portfolio integration, concentration checks & volatility safeguards
            </p>
          </div>
        </div>

        <button
          onClick={fetchRiskProfile}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-Evaluate Risk</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
          <span className="text-sm">Fetching live Binance portfolio and evaluating risk metrics...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      ) : !riskProfile ? (
        <div className="p-6 text-center text-slate-400 glass-panel rounded-2xl">No risk profile data returned.</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Overall Risk Score
              </div>
              <div className="flex items-baseline gap-3 my-2">
                <span className="text-4xl font-extrabold text-white font-mono">
                  {riskProfile.overall_risk_score ?? 'Moderate'}
                </span>
                <span className="text-xs font-bold uppercase text-amber-400">
                  {riskProfile.risk_level || 'Evaluated'}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Based on portfolio asset distribution and volatility parameters.
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Total Portfolio Value (USDT)
              </div>
              <div className="text-3xl font-extrabold text-amber-300 font-mono my-2">
                ${riskProfile.portfolio_summary?.total_usdt_value?.toLocaleString() || '0.00'}
              </div>
              <div className="text-xs text-slate-400">
                {riskProfile.portfolio_summary?.balances_count || 0} active asset balances found
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Asset Concentration
              </div>
              <div className="text-xl font-bold text-white my-1 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-cyan-400" />
                <span>{riskProfile.concentration_risk?.dominant_asset || activeSymbol}</span>
              </div>
              <div className="text-xs text-slate-300">
                {riskProfile.concentration_risk?.concentration_pct?.toFixed(1)}% of total portfolio value
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-red-500/20 space-y-4">
              <div className="flex items-center gap-2 text-red-400 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Active Risk Warnings</span>
              </div>
              {riskProfile.warnings && riskProfile.warnings.length > 0 ? (
                <ul className="space-y-2.5">
                  {riskProfile.warnings.map((warn, i) => (
                    <li key={i} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      <span>{warn}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>No critical risk warnings detected for this portfolio.</span>
                </div>
              )}
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                <CheckCircle2 className="w-5 h-5" />
                <span>AI Risk Recommendations</span>
              </div>
              {riskProfile.recommendations && riskProfile.recommendations.length > 0 ? (
                <ul className="space-y-2.5">
                  {riskProfile.recommendations.map((rec, i) => (
                    <li key={i} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                      <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900/40 text-xs text-slate-400">
                  Portfolio balance is well diversified with low risk exposure.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
