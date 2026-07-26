import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Cpu, Key, CheckCircle, RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o', icon: '⚡' },
  { id: 'groq', name: 'Groq (Ultra-Fast)', defaultModel: 'llama-3.3-70b-versatile', icon: '🚀' },
  { id: 'gemini', name: 'Google Gemini', defaultModel: 'gemini-1.5-pro', icon: '✨' },
  { id: 'claude', name: 'Anthropic Claude', defaultModel: 'claude-3-5-sonnet-20241022', icon: '🧠' },
];

export const LLMSetupModal: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { setLLMKey, setShowBinanceSetup } = useAuth();

  const [provider, setProvider] = useState<string>('openai');
  const [modelName, setModelName] = useState<string>('gpt-4o');
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleProviderChange = (provId: string) => {
    setProvider(provId);
    const found = PROVIDERS.find((p) => p.id === provId);
    if (found) setModelName(found.defaultModel);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMsg(null);
    setLoading(true);

    try {
      await setLLMKey(provider, modelName, apiKey);
      setStatusMsg('LLM API Key verified and saved successfully!');
      setTimeout(() => {
        if (onClose) onClose();
        setShowBinanceSetup(true); // Open optional Binance step next
      }, 1000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || 'Key validation failed';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg glass-panel p-8 rounded-2xl border border-indigo-500/30 shadow-2xl relative"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              Configure LLM Provider
              <span className="text-xs bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-medium px-2 py-0.5 rounded-full">
                Step 1 of 2
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Required for multi-agent reasoning, strategy synthesis & chat
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
            {error}
          </div>
        )}

        {statusMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{statusMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select AI Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    provider === p.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                      : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <div className="text-xs font-bold">{p.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Model Identifier
            </label>
            <input
              type="text"
              required
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. gpt-4o"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono text-indigo-300"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Provider API Key
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Your key is strongly encrypted with Fernet symmetric cryptography before storage.
            </p>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || !apiKey}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Verify & Save LLM Key</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
