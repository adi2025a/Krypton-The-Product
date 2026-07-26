import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Key, CheckCircle, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export const BinanceSetupModal: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { connectBinance, setShowBinanceSetup } = useAuth();

  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMsg(null);
    setLoading(true);

    try {
      await connectBinance(apiKey, apiSecret);
      setStatusMsg('Binance API key verified and connected!');
      setTimeout(() => {
        setShowBinanceSetup(false);
        if (onClose) onClose();
      }, 1000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || 'Binance key verification failed';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setShowBinanceSetup(false);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg glass-panel p-8 rounded-2xl border border-amber-500/30 shadow-2xl relative"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <ShieldCheck className="w-6 h-6 text-black font-bold" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              Connect Binance Account
              <span className="text-xs bg-amber-500/20 border border-amber-500/40 text-amber-300 font-medium px-2 py-0.5 rounded-full">
                Optional
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Unlocks real-time portfolio concentration risk analysis & stop-loss rules
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {statusMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Binance API Key
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Binance Read-Only API Key..."
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm font-mono text-amber-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Binance Secret Key
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Enter Secret Key..."
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm font-mono"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/80">
            ℹ️ <strong>Security Tip:</strong> We recommend using a <em>Read-Only</em> API key without withdrawal or trading permissions.
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="w-1/3 py-3 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
            >
              Skip for Now
            </button>

            <button
              type="submit"
              disabled={loading || !apiKey || !apiSecret}
              className="w-2/3 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Connect Binance</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
