import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, ArrowRight, ShieldAlert, CheckCircle2, Zap, AlertTriangle } from "lucide-react";
import { binanceAPI, ApiError } from "../config/api";
import { useAuth } from "../context/AuthContext";

export default function BinanceSetupPage() {
  const navigate = useNavigate();
  const { refreshOnboarding } = useAuth();

  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [connecting, setConnecting] = useState(false);
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
      const res = await binanceAPI.connect(apiKey, secretKey);
      setConnected(true);
      setIsValid(res.is_valid);
      await refreshOnboarding();
      if (!res.is_valid) {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Please try again.");
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  const handleContinue = async () => {
    if (choice === "no") {
      await refreshOnboarding();
      navigate("/dashboard");
      return;
    }
    if (choice === "yes" && !connected) {
      setError("Please connect your Binance account first, or choose Skip for Now.");
      return;
    }
    await refreshOnboarding();
    navigate("/dashboard");
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
          <span className="font-['Rajdhani'] text-xl font-bold tracking-widest text-foreground uppercase">KRYPTON</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-['Rajdhani'] font-bold text-foreground mb-1">Connect Binance</h1>
          <p className="text-muted-foreground text-sm">Optional: Connect read-only API keys for live risk analysis</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => { setChoice("yes"); setError(""); }}
            className={`p-5 rounded-xl border text-left transition-all ${
              choice === "yes"
                ? "bg-card border-primary ring-1 ring-primary/40 shadow-lg"
                : "bg-card/50 border-border hover:border-border/80"
            }`}
          >
            <div className="text-2xl mb-2">🟡</div>
            <div className="font-['Rajdhani'] text-lg font-bold text-foreground">Connect API</div>
            <div className="text-xs text-muted-foreground mt-1">Full portfolio & risk analytics enabled</div>
          </button>

          <button
            onClick={() => { setChoice("no"); setError(""); }}
            className={`p-5 rounded-xl border text-left transition-all ${
              choice === "no"
                ? "bg-card border-primary ring-1 ring-primary/40 shadow-lg"
                : "bg-card/50 border-border hover:border-border/80"
            }`}
          >
            <div className="text-2xl mb-2">⚡</div>
            <div className="font-['Rajdhani'] text-lg font-bold text-foreground">Skip for Now</div>
            <div className="text-xs text-muted-foreground mt-1">Use market data & AI features without Binance</div>
          </button>
        </div>

        <AnimatePresence>
          {choice === "yes" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4"
            >
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-mono">
                <ShieldAlert size={16} className="shrink-0" />
                <span>Only READ-ONLY permissions are required. Never enable trading or withdrawal permissions.</span>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-mono">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Binance API Key"
                    className="w-full bg-secondary border border-border rounded-lg pl-4 pr-11 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Binance Secret Key"
                    className="w-full bg-secondary border border-border rounded-lg pl-4 pr-11 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecretKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleConnect}
                disabled={connecting || !apiKey || !secretKey}
                className="w-full bg-secondary border border-border text-foreground hover:bg-secondary/80 rounded-lg py-2.5 font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connecting ? "Testing Connection..." : connected ? "Re-Test & Save Keys" : "Test & Save Keys"}
              </button>

              {connected && (
                <div className={`flex items-center gap-2 text-xs font-mono p-3 rounded-lg ${isValid ? "bg-primary/10 text-primary border border-primary/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                  {isValid ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  <span>{isValid ? "Binance API Key connected & verified!" : "Saved, but verification warned."}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && <div className="text-xs font-mono text-destructive mb-4">{error}</div>}

        <button
          onClick={handleContinue}
          disabled={!choice}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-['Rajdhani'] font-bold text-base tracking-widest uppercase hover:bg-primary/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <span>Complete Setup</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}
