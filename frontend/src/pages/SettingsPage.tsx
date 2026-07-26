import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Cpu, ShieldCheck, Key, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const SettingsPage: React.FC = () => {
  const { llmStatus, binanceStatus, setLLMKey, connectBinance } = useAuth();

  const [llmProvider, setLlmProvider] = useState<string>(llmStatus?.provider || 'openai');
  const [modelName, setModelName] = useState<string>(llmStatus?.model_name || 'gpt-4o');
  const [llmKey, setLlmKeyInput] = useState<string>('');
  const [llmLoading, setLlmLoading] = useState<boolean>(false);
  const [llmMsg, setLlmMsg] = useState<string | null>(null);
  const [llmErr, setLlmErr] = useState<string | null>(null);

  const [binanceKey, setBinanceKey] = useState<string>('');
  const [binanceSecret, setBinanceSecret] = useState<string>('');
  const [binanceLoading, setBinanceLoading] = useState<boolean>(false);
  const [binanceMsg, setBinanceMsg] = useState<string | null>(null);
  const [binanceErr, setBinanceErr] = useState<string | null>(null);

  const handleUpdateLLM = async (e: React.FormEvent) => {
    e.preventDefault();
    setLlmErr(null);
    setLlmMsg(null);
    setLlmLoading(true);

    try {
      await setLLMKey(llmProvider, modelName, llmKey);
      setLlmMsg('LLM key updated successfully!');
      setLlmKeyInput('');
    } catch (err: any) {
      setLlmErr(err.response?.data?.detail || 'Failed to update LLM key');
    } finally {
      setLlmLoading(false);
    }
  };

  const handleUpdateBinance = async (e: React.FormEvent) => {
    e.preventDefault();
    setBinanceErr(null);
    setBinanceMsg(null);
    setBinanceLoading(true);

    try {
      await connectBinance(binanceKey, binanceSecret);
      setBinanceMsg('Binance API credentials updated!');
      setBinanceKey('');
      setBinanceSecret('');
    } catch (err: any) {
      setBinanceErr(err.response?.data?.detail || 'Failed to update Binance credentials');
    } finally {
      setBinanceLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 p-6 rounded-2xl glass-panel border border-indigo-500/20 shadow-2xl">
        <div className="p-3 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/20">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">API Connections & Integration Settings</h1>
          <p className="text-xs text-slate-400">
            Manage active LLM provider keys and Binance API connection status
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 rounded-2xl border border-white/10 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-white text-base">LLM Provider Key</h2>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              llmStatus?.is_valid
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              {llmStatus?.is_valid ? 'Active & Valid' : 'Missing / Invalid'}
            </span>
          </div>

          {llmStatus && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs space-y-1">
              <div className="text-slate-400">Active Provider: <strong className="text-white capitalize">{llmStatus.provider}</strong></div>
              <div className="text-slate-400">Model Name: <strong className="text-indigo-300 font-mono">{llmStatus.model_name}</strong></div>
              <div className="text-slate-500 text-[10px]">Expires: {new Date(llmStatus.expires_at).toLocaleDateString()}</div>
            </div>
          )}

          {llmErr && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{llmErr}</div>
          )}

          {llmMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{llmMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateLLM} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Provider
              </label>
              <select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              >
                <option value="openai" className="bg-slate-900">OpenAI (gpt-4o)</option>
                <option value="groq" className="bg-slate-900">Groq (llama-3.3-70b)</option>
                <option value="gemini" className="bg-slate-900">Google Gemini (gemini-1.5-pro)</option>
                <option value="claude" className="bg-slate-900">Anthropic Claude (claude-3-5-sonnet)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Model Identifier
              </label>
              <input
                type="text"
                required
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="gpt-4o"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono text-indigo-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                New API Key
              </label>
              <input
                type="password"
                required
                value={llmKey}
                onChange={(e) => setLlmKeyInput(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={llmLoading || !llmKey}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {llmLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              <span>Save LLM Key</span>
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 rounded-2xl border border-white/10 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-white text-base">Binance API Connection</h2>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              binanceStatus?.is_active
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-slate-800 text-slate-400 border-white/10'
            }`}>
              {binanceStatus?.is_active ? 'Connected' : 'Not Connected'}
            </span>
          </div>

          {binanceStatus && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs space-y-1">
              <div className="text-slate-400">Platform: <strong className="text-amber-300 uppercase">{binanceStatus.platform}</strong></div>
              <div className="text-slate-400">Status: <strong className="text-emerald-400">Active & Valid</strong></div>
            </div>
          )}

          {binanceErr && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{binanceErr}</div>
          )}

          {binanceMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{binanceMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateBinance} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Binance API Key
              </label>
              <input
                type="text"
                required
                value={binanceKey}
                onChange={(e) => setBinanceKey(e.target.value)}
                placeholder="Enter Binance API Key..."
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono text-amber-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Binance Secret Key
              </label>
              <input
                type="password"
                required
                value={binanceSecret}
                onChange={(e) => setBinanceSecret(e.target.value)}
                placeholder="Enter Secret Key..."
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={binanceLoading || !binanceKey || !binanceSecret}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {binanceLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Connect / Update Binance</span>
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
