import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, ArrowRight, ShieldAlert, TrendingUp, XCircle, CheckCircle2, Zap, Info, AlertTriangle } from "lucide-react";
import { binanceAPI, ApiError } from "../config/api";

interface BinanceSetupPageProps {
  onNext: () => void;   // NOTE: no config object passed up anymore -- the
                         // backend already has the key stored (encrypted)
                         // by the time this fires. The frontend never
                         // holds onto the raw key/secret past this screen.
  onSkip: () => void;    // Binance is optional -- this is a distinct,
                         // equally-valid path, not a fallback/error state.
}

export default function BinanceSetupPage({ onNext, onSkip }: BinanceSetupPageProps) {
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // NOTE: renamed from "validated" -- there's no separate validate-only
  // step on this backend. connect() both tests AND saves the key in one
  // call, so "connected" means the API call completed, not just "looked
  // valid before saving."
  const [connected, setConnected] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    if (!apiKey || !secretKey) {
      setError("Both keys are required");
      return;
    }
    setConnecting(true);
    setError("");
    try {
      // This call both validates AND stores the key encrypted on the
      // backend -- there is no "just testing, don't save yet" mode.
      const res = await binanceAPI.connect(apiKey, secretKey);
      setConnected(true);
      setIsValid(res.is_valid);
      if (!res.is_valid) {
        // The key WAS saved (it's already in the database), but the
        // backend's live check against Binance failed -- e.g. wrong
        // permissions, revoked key, or a typo. We still let them
        // continue (the row exists, they can fix it later in Settings),
        // but the warning needs to be visible now, not silently hidden.
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Please try again.");
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  const handleContinue = () => {
    if (choice === "no") {
      onSkip();
      return;
    }
    if (choice === "yes" && !connected) {
      setError("Please connect your Binance account first, or choose Skip for Now.");
      return;
    }
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="min-h-screen bg-background flex flex-col items-center justify-center p-8"
    >
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,229,176,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,176,1) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
            <Zap size={13} className="text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-['Rajdhani'] text-lg font-700 tracking-widest text-foreground uppercase">KRYPTON</span>
        </div>

        <div className="mb-10">
          <div className="text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground mb-2">Step 2 of 3</div>
          <h1 className="text-4xl font-['Rajdhani'] font-700 text-foreground">Binance Integration</h1>
          <p className="text-muted-foreground text-sm mt-1">Connect for portfolio-aware risk analysis</p>
        </div>

        <div className="flex gap-2 mb-10">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-0.5 flex-1 rounded-full transition-all ${i <= 1 ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {/* Choice Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.button
            onClick={() => { setChoice("yes"); setError(""); setConnected(false); }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`relative text-left p-5 rounded-xl border transition-all duration-200 ${
              choice === "yes"
                ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-card hover:border-border/80 hover:bg-secondary"
            }`}
          >
            {choice === "yes" && (
              <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <CheckCircle2 size={12} className="text-primary-foreground" />
              </div>
            )}
            <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center mb-3">
              <TrendingUp size={18} className="text-primary" />
            </div>
            <div className="font-['Rajdhani'] text-lg font-600 text-foreground mb-1">Connect Binance</div>
            <div className="text-muted-foreground text-xs leading-relaxed">
              Enable portfolio tracking, position sizing, and real-time risk analysis
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Risk Agent", "Portfolio View", "P&L Tracking"].map((tag) => (
                <span key={tag} className="text-[10px] font-mono px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </motion.button>

          <motion.button
            onClick={() => { setChoice("no"); setError(""); }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`relative text-left p-5 rounded-xl border transition-all duration-200 ${
              choice === "no"
                ? "border-muted-foreground/40 bg-muted ring-1 ring-muted-foreground/20"
                : "border-border bg-card hover:border-border/80 hover:bg-secondary"
            }`}
          >
            {choice === "no" && (
              <div className="absolute top-3 right-3 w-5 h-5 bg-muted-foreground rounded-full flex items-center justify-center">
                <CheckCircle2 size={12} className="text-background" />
              </div>
            )}
            <div className="w-10 h-10 bg-muted border border-border rounded-lg flex items-center justify-center mb-3">
              <XCircle size={18} className="text-muted-foreground" />
            </div>
            <div className="font-['Rajdhani'] text-lg font-600 text-foreground mb-1">Skip for Now</div>
            <div className="text-muted-foreground text-xs leading-relaxed">
              Use Krypton without portfolio data. Risk analysis agent will be unavailable.
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["No Risk Agent", "Market Analysis Only"].map((tag) => (
                <span key={tag} className="text-[10px] font-mono px-2 py-0.5 bg-muted text-muted-foreground border border-border rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </motion.button>
        </div>

        {/* Binance Key Input */}
        <AnimatePresence>
          {choice === "yes" && (
            <motion.div
              initial={{ opacity: 0, height: 0, overflow: "hidden" }}
              animate={{ opacity: 1, height: "auto", overflow: "visible" }}
              exit={{ opacity: 0, height: 0, overflow: "hidden" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-4 mb-6"
            >
              {/* Security notice */}
              <div className="flex gap-3 p-3.5 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                <ShieldAlert size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-amber-400/90 text-xs leading-relaxed">
                  Use a <strong>Read-Only</strong> API key. Krypton never needs withdrawal or trading permissions.
                  Enable IP restriction for extra security.
                </p>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-mono">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setConnected(false); }}
                    placeholder="Your Binance API key"
                    className="w-full bg-secondary border border-border rounded-lg pl-4 pr-11 py-3 text-foreground font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-mono">Secret Key</label>
                <div className="relative">
                  <input
                    type={showSecretKey ? "text" : "password"}
                    value={secretKey}
                    onChange={(e) => { setSecretKey(e.target.value); setConnected(false); }}
                    placeholder="Your Binance secret key"
                    className="w-full bg-secondary border border-border rounded-lg pl-4 pr-11 py-3 text-foreground font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSecretKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-destructive text-xs font-mono">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {connected ? (
                isValid ? (
                  <div className="flex items-center gap-2.5 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <CheckCircle2 size={16} className="text-primary" />
                    <span className="text-primary text-sm font-['Rajdhani'] font-600 tracking-wide">Connected successfully</span>
                  </div>
                ) : (
                  // Key saved, but the backend's live check against Binance
                  // failed (bad permissions, revoked, etc). Not a dead end --
                  // they can still continue and fix it later in Settings.
                  <div className="flex items-center gap-2.5 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <AlertTriangle size={16} className="text-amber-400" />
                    <span className="text-amber-400 text-sm font-['Rajdhani'] font-600 tracking-wide">
                      Saved, but verification failed -- check permissions in Settings later
                    </span>
                  </div>
                )
              ) : (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connecting || !apiKey || !secretKey}
                  className="w-full py-2.5 border border-primary/30 text-primary rounded-lg font-['Rajdhani'] font-600 text-sm tracking-wider hover:bg-primary/5 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {connecting ? (
                    <><Spinner /> Connecting...</>
                  ) : (
                    <><Info size={14} /> Connect Binance</>
                  )}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* No-choice error */}
        <AnimatePresence>
          {error && choice !== "yes" && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-destructive text-sm mb-4 font-mono">
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          onClick={handleContinue}
          disabled={!choice || (choice === "yes" && !connected)}
          className="w-full bg-primary text-primary-foreground rounded-lg py-3.5 font-['Rajdhani'] font-700 text-base tracking-widest uppercase hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          Launch Dashboard <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}