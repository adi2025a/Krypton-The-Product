import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ArrowRight, Eye, EyeOff, Check, Zap } from "lucide-react";
import { llmKeyAPI, ApiError } from "../config/api";

interface LLMSetupPageProps {
  onNext: () => void;   // was: onNext: (config: LLMConfig) => void;
}

const PROVIDERS = [
  {
    id: "openai" as const,
    name: "OpenAI",
    logo: "🟢",
    color: "#10a37f",
    description: "GPT-4o, GPT-4 Turbo & o1 series",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-preview", "o1-mini"],
    badge: "Most Popular",
  },
  {
    id: "claude" as const,
    name: "Anthropic",
    logo: "🟤",
    color: "#c96442",
    description: "Claude 3.5 Sonnet, Opus & Haiku",
    models: ["claude-3-5-sonnet-20241022", "claude-opus-4-8", "claude-haiku-4-5-20251001"],
    badge: "Best Reasoning",
  },
  {
    id: "gemini" as const,
    name: "Google Gemini",
    logo: "🔵",
    color: "#4285f4",
    description: "Gemini 1.5 Pro, Flash & Ultra",
    models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
    badge: "",
  },
  {
    id: "groq" as const,
    name: "Groq",
    logo: "🟣",
    color: "#f55036",
    description: "Llama 3, Mixtral — ultra-fast",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
    badge: "Fastest",
  },
] as const;

export default function LLMSetupPage({ onNext }: LLMSetupPageProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const provider = PROVIDERS.find((p) => p.id === selected);

  const handleSelect = (id: string) => {
    setSelected(id);
    setModel("");
    setApiKey("");
    setError("");
  };

  const handleContinue = async () => {
  if (!selected || !model || !apiKey) {
    setError("Please select a provider, model, and enter your API key.");
    return;
  }
  setSaving(true);
  setError("");
  try {
    const res = await llmKeyAPI.setKey(selected as any, model, apiKey);
    if (!res.is_valid) {
      // Key IS saved either way -- same pattern as BinanceSetupPage.
      // Don't block continuing, just warn.
      setError(`Saved, but verification failed: ${res.message}`);
    }
    onNext();
  } catch (err) {
    setError(err instanceof ApiError ? err.message : "Could not save your key. Please try again.");
  } finally {
    setSaving(false);
  }
};

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="min-h-screen bg-background flex flex-col items-center justify-center p-8"
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,229,176,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,176,1) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
            <Zap size={13} className="text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-['Rajdhani'] text-lg font-700 tracking-widest text-foreground uppercase">KRYPTON</span>
        </div>

        <div className="mb-10">
          <div className="text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground mb-2">Step 1 of 3</div>
          <h1 className="text-4xl font-['Rajdhani'] font-700 text-foreground">Choose your AI</h1>
          <p className="text-muted-foreground text-sm mt-1">Select the LLM provider and model for trading analysis</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-10">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-0.5 flex-1 rounded-full transition-all ${i === 0 ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {/* Provider Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {PROVIDERS.map((p) => (
            <motion.button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`relative text-left p-4 rounded-xl border transition-all duration-200 ${
                selected === p.id
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-border/80 hover:bg-secondary"
              }`}
            >
              {p.badge && (
                <span className="absolute top-3 right-3 text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30` }}>
                  {p.badge}
                </span>
              )}
              {selected === p.id && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check size={11} className="text-primary-foreground" strokeWidth={3} />
                </div>
              )}
              <div className="text-2xl mb-2">{p.logo}</div>
              <div className="font-['Rajdhani'] text-base font-600 text-foreground mb-0.5">{p.name}</div>
              <div className="text-muted-foreground text-xs">{p.description}</div>
            </motion.button>
          ))}
        </div>

        {/* Model + API Key */}
        <AnimatePresence>
          {provider && (
            <motion.div
              initial={{ opacity: 0, height: 0, overflow: "hidden" }}
              animate={{ opacity: 1, height: "auto", overflow: "visible" }}
              exit={{ opacity: 0, height: 0, overflow: "hidden" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-4 mb-6"
            >
              {/* Model Dropdown */}
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-mono">Model</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setModelOpen(!modelOpen)}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-primary/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                  >
                    <span className={model ? "text-foreground" : "text-muted-foreground/50"}>
                      {model || "Select a model"}
                    </span>
                    <ChevronDown size={15} className={`text-muted-foreground transition-transform ${modelOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {modelOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg overflow-hidden shadow-xl"
                      >
                        {provider.models.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => { setModel(m); setModelOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-mono hover:bg-secondary transition-colors flex items-center justify-between ${model === m ? "text-primary" : "text-foreground"}`}
                          >
                            {m}
                            {model === m && <Check size={13} className="text-primary" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-mono">
                  {provider.name} API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`sk-...`}
                    className="w-full bg-secondary border border-border rounded-lg pl-4 pr-11 py-3 text-foreground font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                  Your key is encrypted and stored securely on the server, and automatically expires after 7 days (configurable in Settings).
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-destructive text-sm mb-4 font-mono"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          onClick={handleContinue}
          disabled={!selected || !model || !apiKey || saving}
          className="w-full bg-primary text-primary-foreground rounded-lg py-3.5 font-['Rajdhani'] font-700 text-base tracking-widest uppercase hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving ? "Saving..." : "Continue to Binance Setup"} <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}
