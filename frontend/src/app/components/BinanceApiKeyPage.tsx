
import { useState, useEffect } from "react";
import {
  Key, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2,
  ExternalLink, ChevronRight, ShieldCheck, Pencil, ChevronRight as ArrowIcon,
} from "lucide-react";

// ==================== TYPES ====================

export type BinancePageMode = "setup" | "confirm";

interface BinancePermissions {
  read: boolean;
  trade: boolean;
  withdraw: boolean;
}

interface StoredBinanceCredentials {
  apiKeyMasked: string;   // e.g. "AbCd••••••••••••1F9k"
  connectedAt: string;    // display string, e.g. "Jul 3, 2026"
  permissions: BinancePermissions;
}

interface BinanceApiKeyPageProps {
  /** "setup" = first-time entry (post-signup). "confirm" = review stored key (post-login). */
  mode: BinancePageMode;
  /** Called once the user is happy to proceed to the rest of onboarding/app. */
  onContinue: () => void;
  /** Optional back navigation (e.g. back to signup/login). */
  onBack?: () => void;
}

// ==================== API CONFIG ====================
// Mirrors the API_BASE_URL / apiFetch pattern used in App.tsx.
// If you extract that into a shared src/lib/api.ts, delete this block and
// import { apiFetch } from "./lib/api" instead — see integration notes.

const API_BASE_URL: string =
  (typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_API_BASE_URL) ||
  "http://localhost:8000";

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore parse errors, fall back to statusText
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// ==================== SHARED BITS (kept local so this file drops in standalone) ====================

function KryptonLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded flex items-center justify-center font-bold text-[#080B12] flex-shrink-0 text-sm"
        style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)" }}
      >
        Kr
      </div>
      <span className="font-semibold text-sm tracking-[0.2em] text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
        KRYPTON
      </span>
    </div>
  );
}

function PermissionPill({ label, granted }: { label: string; granted: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border"
      style={{
        fontFamily: "JetBrains Mono, monospace",
        background: granted ? "rgba(16,185,129,0.08)" : "rgba(107,122,141,0.08)",
        borderColor: granted ? "rgba(16,185,129,0.2)" : "rgba(107,122,141,0.18)",
        color: granted ? "#34D399" : "#6B7A8D",
      }}
    >
      {granted ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 flex items-center justify-center">–</span>}
      {label}
    </span>
  );
}

// ==================== MAIN COMPONENT ====================

export default function BinanceApiKeyPage({ mode, onContinue, onBack }: BinanceApiKeyPageProps) {
  // ---- shared state ----
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- confirm-mode state ----
  const [stored, setStored] = useState<StoredBinanceCredentials | null>(null);
  const [loadingStored, setLoadingStored] = useState(mode === "confirm");
  const [editing, setEditing] = useState(false);

  const effectiveMode: "form" | "review" = mode === "setup" || editing ? "form" : "review";

  useEffect(() => {
    if (mode !== "confirm") return;
    let cancelled = false;
    (async () => {
      setLoadingStored(true);
      setError(null);
      try {
        const data = await apiFetch<StoredBinanceCredentials>("/api/binance/credentials");
        if (!cancelled) setStored(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load your saved Binance keys.");
      } finally {
        if (!cancelled) setLoadingStored(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mode]);

  const canSave = apiKey.trim().length > 10 && apiSecret.trim().length > 10;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Backend should verify the key is read-only (no trade/withdraw permission)
      // before persisting it, and should encrypt it at rest.
      const data = await apiFetch<StoredBinanceCredentials>("/api/binance/credentials", {
        method: "POST",
        body: JSON.stringify({ api_key: apiKey.trim(), api_secret: apiSecret.trim() }),
      });
      setStored(data);
      setApiKey("");
      setApiSecret("");
      if (mode === "setup") {
        onContinue();
      } else {
        setEditing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't verify this key. Double-check it's active and read-only.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmContinue = () => {
    onContinue();
  };

  const title = mode === "setup" ? "Connect your Binance account" : "Confirm your Binance connection";
  const subtitle =
    mode === "setup"
      ? "Add a read-only API key so Krypton can see your balances and positions. Trading and withdrawal permissions are never required."
      : "This is the Binance key already on file for your account. Confirm it's still correct before continuing.";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 65%)" }}
      />

      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back
        </button>
      )}

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-8"><KryptonLogo /></div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(240,185,11,0.08)", border: "1px solid rgba(240,185,11,0.18)" }}
          >
            {/* Binance-yellow accent, used only here to signal "exchange connection" */}
            <Key className="w-5 h-5" style={{ color: "#F0B90B" }} />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
            {title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">{subtitle}</p>
        </div>

        <div className="rounded-xl border border-border p-8" style={{ background: "#0D1117" }}>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/20 text-sm mb-6" style={{ background: "rgba(239,68,68,0.08)", color: "#F87171" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ---- CONFIRM MODE: loading stored key ---- */}
          {mode === "confirm" && loadingStored && (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading your saved key…</p>
            </div>
          )}

          {/* ---- CONFIRM MODE: review saved key ---- */}
          {mode === "confirm" && !loadingStored && effectiveMode === "review" && stored && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Connected · {stored.connectedAt}
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">API key on file</label>
                <div
                  className="w-full px-4 py-3 rounded-lg border border-border text-foreground text-sm flex items-center gap-2"
                  style={{ background: "#080B12", fontFamily: "JetBrains Mono, monospace" }}
                >
                  <Key className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  {stored.apiKeyMasked}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-2">Permissions</div>
                <div className="flex flex-wrap gap-2">
                  <PermissionPill label="Read" granted={stored.permissions.read} />
                  <PermissionPill label="Spot & margin trading" granted={stored.permissions.trade} />
                  <PermissionPill label="Withdrawals" granted={stored.permissions.withdraw} />
                </div>
                {(stored.permissions.trade || stored.permissions.withdraw) && (
                  <p className="text-xs mt-2.5 leading-relaxed" style={{ color: "#FCD34D" }}>
                    This key has more than read access. For safety, edit it on Binance to remove trading and
                    withdrawal permissions.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm border border-border text-foreground hover:border-primary/40 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Update key
                </button>
                <button
                  onClick={handleConfirmContinue}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12" }}
                >
                  Looks right, continue
                  <ArrowIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ---- FORM: setup mode, or confirm-mode editing ---- */}
          {effectiveMode === "form" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Encrypted at rest · Use a read-only key, never one with trading or withdrawal access
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">API key</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste your Binance API key"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border text-foreground text-sm focus:outline-none transition-colors placeholder:text-muted-foreground/40"
                    style={{ background: "#080B12", fontFamily: "JetBrains Mono, monospace" }}
                    onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.4)")}
                    onBlur={(e) => (e.target.style.borderColor = "")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Secret key</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showSecret ? "text" : "password"}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Paste your Binance secret key"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full pl-10 pr-11 py-3 rounded-lg border border-border text-foreground text-sm focus:outline-none transition-colors placeholder:text-muted-foreground/40"
                    style={{ background: "#080B12", fontFamily: "JetBrains Mono, monospace" }}
                    onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.4)")}
                    onBlur={(e) => (e.target.style.borderColor = "")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Create a read-only key from{" "}
                <a
                  href="https://www.binance.com/en/my/settings/api-management"
                  target="_blank"
                  rel="noreferrer"
                  className="underline inline-flex items-center gap-0.5 hover:opacity-80"
                  style={{ color: "#F0B90B" }}
                >
                  Binance API Management <ExternalLink className="w-3 h-3" />
                </a>{" "}
                — leave "Enable Spot & Margin Trading" and "Enable Withdrawals" unchecked.
              </p>

              <div className="flex gap-3 pt-2">
                {mode === "confirm" && editing && (
                  <button
                    onClick={() => { setEditing(false); setError(null); setApiKey(""); setApiSecret(""); }}
                    className="flex-1 py-3 rounded-lg font-semibold text-sm border border-border text-foreground hover:border-primary/40 transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12" }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying key…
                    </>
                  ) : (
                    <>
                      Save & continue
                      <ArrowIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Krypton only ever requests read access — it can never place trades or move funds on your behalf.
        </p>
      </div>
    </div>
  );
}