// ================================================================
// KRYPTON — API CONFIGURATION
// Connects to the real FastAPI backend. Field names match the
// backend's actual JSON responses (snake_case) rather than being
// translated to camelCase -- deliberate choice: a translation layer
// is one more place to introduce bugs, and this is a learning
// project where matching the backend 1:1 keeps things traceable.
// ================================================================

// ── Base ─────────────────────────────────────────────────────────
const rawBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
export const API_CONFIG = {
  baseUrl: rawBaseUrl.trim().replace(/\/+$/, ""),
  timeout: 10_000,
};

const TOKEN_STORAGE_KEY = "krypton_token";

// sessionStorage, not localStorage -- cleared when the tab closes,
// which limits how long a stolen token (via XSS) stays useful. Not
// perfect (an httpOnly cookie set by the backend would be stronger),
// but a reasonable middle ground for a project like this.
export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}
function setToken(token: string) {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}
export function clearToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

// ── Core fetch wrapper ────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_CONFIG.baseUrl}${cleanPath}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new ApiError(408, "Request timed out. Please check your backend server connection.");
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(0, `Failed to connect to backend at ${API_CONFIG.baseUrl}. ${err.message || "Network error"}`);
  } finally {
    clearTimeout(timeoutId);
  }

  // 401 -- token missing/expired/invalid. Clear it and bounce to login.
  // Every protected route on the backend can return this the moment a
  // JWT expires, so this needs to be handled globally, not per-call.
  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail || "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Types (matching backend Pydantic schemas exactly) ────────────

export type LLMProvider = "openai" | "groq" | "gemini" | "claude"; // NOTE: backend uses "claude", not "anthropic"
export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";
export type SentimentLabel = "bullish" | "bearish" | "neutral";
export type RiskLabel = "low" | "moderate" | "high";

export interface SignupResponse {
  message: string;
  email: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface OnboardingStatus {
  email_verified: boolean;
  llm_key_set: boolean;
  llm_key_valid: boolean;
  binance_connected: boolean;
  binance_key_valid: boolean;
}

export interface SetLLMKeyResponse {
  provider: LLMProvider;
  model_name: string;
  is_valid: boolean;
  message: string;
  expires_at: string;
}

export interface LLMKeyStatus {
  provider: LLMProvider;
  model_name: string;
  is_active: boolean;
  is_valid: boolean;
  expires_at: string;
}

export interface ConnectBinanceResponse {
  platform: "binance";
  is_valid: boolean;
  message: string;
}

export interface BinanceStatus {
  platform: "binance";
  is_active: boolean;
  is_valid: boolean;
}

export interface BinanceBalance {
  asset: string;
  free: number;
  locked: number;
}

export interface BinancePortfolio {
  platform: "binance";
  balances: BinanceBalance[];
  // NOTE: no totalUSDT / pnl24h / pct here -- the backend's
  // /integration/binance/portfolio endpoint returns raw balances only.
  // Total USD value IS computed internally (see risk_service), but only
  // exposed via /risk/profile's `portfolio_total_usdt` field today. If
  // you want a dedicated portfolio-value view later, that's a small
  // backend addition (reuse compute_portfolio_value from risk_service),
  // not something to fake on the frontend with your own price-fetching.
}

export interface ChartContext {
  symbol: string;
  timeframe: Timeframe;
}

export interface NewsItem {
  title: string;
  summary: string;
  link: string;
  source: string;
  published_at: string | null;
  sentiment_label: SentimentLabel;
  sentiment_score: number; // roughly -1 to 1 (VADER compound score)
  // NOTE: no `category` field -- the backend doesn't classify headlines
  // by topic. `source` (CoinDesk, CoinTelegraph, etc.) is what's available.
}

export interface NewsFeedResponse {
  symbol: string;
  items: NewsItem[];
}

export interface MarketIndicators {
  symbol: string;
  timeframe: Timeframe;
  close: number;
  ema: { ema20: number; ema50: number; trend: "bullish" | "bearish" };
  rsi: { value: number; state: "overbought" | "oversold" | "neutral" };
  macd: { macd: number; signal: number; histogram: number; trend: "bullish" | "bearish" };
  bollinger_bands: { upper: number; middle: number; lower: number; position: "above_upper" | "below_lower" | "inside" };
  // NOTE: no price/change24h/volume24h/sparkline here -- those aren't
  // computed by the backend's indicator service. Get live price/24h
  // change directly from the TradingView widget instead; don't try to
  // recreate them from this endpoint.
}

export interface RiskProfile {
  symbol: string;
  concentration: { asset: string; pct_of_portfolio: number };
  volatility: { std_dev_pct: number; label: RiskLabel };
  portfolio_total_usdt: number;
  overall_risk_score: number;
  overall_risk_label: RiskLabel;
  // NOTE: shape is completely different from a typical "risk score /
  // factors list" model -- this backend computes risk from real
  // portfolio concentration + price volatility, not a generic factor list.
}

export interface SentimentSummary {
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  avg_score: number;
  overall_label: SentimentLabel;
}

export interface AgentResponse {
  final_response: string | null;
  indicators: MarketIndicators | null;
  news_items: NewsItem[] | null;
  sentiment_summary: SentimentSummary | null;
  risk_profile: RiskProfile | null;
  errors: string[];
}

// ── Auth API ──────────────────────────────────────────────────────
export const authAPI = {
  async signup(email: string, password: string): Promise<SignupResponse> {
    return apiFetch("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
  },

  // NOTE: unlike the original mock, this does NOT return a token.
  // The backend's OTP verification only marks the account verified --
  // it deliberately does not auto-login. Redirect to /login afterward.
  async verifyOtp(email: string, otp: string): Promise<{ message: string }> {
    return apiFetch("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) });
  },

  async resendOtp(email: string): Promise<{ message: string }> {
    return apiFetch("/auth/resend-otp", { method: "POST", body: JSON.stringify({ email }) });
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.access_token);
    return res;
  },

  logout() {
    clearToken();
  },
};

// ── Status API ────────────────────────────────────────────────────
export const statusAPI = {
  async getOnboarding(): Promise<OnboardingStatus> {
    return apiFetch("/status/onboarding");
  },
};

// ── LLM Key API ───────────────────────────────────────────────────
// Split out from "llmAPI" in the original mock -- key MANAGEMENT
// (this file) and actually TALKING to an LLM (agentAPI, below) are
// different backend concerns. Also important: the frontend never
// sends the LLM api_key on chat/strategy calls -- the backend already
// has it stored (encrypted) from setKey(), and decrypts it server-side
// per request. Never pass an api key into agentAPI.chat/strategy.
export const llmKeyAPI = {
  async setKey(
    provider: LLMProvider,
    model_name: string,
    api_key: string,
    expiry_days?: number
  ): Promise<SetLLMKeyResponse> {
    return apiFetch("/llm-key/set", {
      method: "POST",
      body: JSON.stringify({ provider, model_name, api_key, expiry_days }),
    });
  },

  async getStatus(): Promise<LLMKeyStatus | null> {
    try {
      return await apiFetch("/llm-key/status");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null; // no active key set yet
      throw e;
    }
  },
};

// ── Binance API ───────────────────────────────────────────────────
export const binanceAPI = {
  // NOTE: no separate validateKeys() -- connecting IS validating on
  // this backend. It tests the key/secret against Binance immediately
  // and tells you via `is_valid` in the same response.
  async connect(api_key: string, api_secret: string): Promise<ConnectBinanceResponse> {
    return apiFetch("/integration/binance/connect", {
      method: "POST",
      body: JSON.stringify({ api_key, api_secret }),
    });
  },

  async getStatus(): Promise<BinanceStatus | null> {
    try {
      return await apiFetch("/integration/binance/status");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null; // not connected yet
      throw e;
    }
  },

  async getPortfolio(): Promise<BinancePortfolio> {
    return apiFetch("/integration/binance/portfolio");
  },
};

// ── Chart Context API ─────────────────────────────────────────────
// Not present in the original mock at all -- this is the backend's
// mechanism for keeping the chart's symbol/timeframe selection in
// sync with what the agent reasons about. Call `set` whenever the
// user changes the symbol/timeframe dropdown; call `get` on mount to
// restore their last selection.
export const chartContextAPI = {
  async get(): Promise<ChartContext> {
    return apiFetch("/context/chart");
  },
  async set(symbol: string, timeframe: Timeframe): Promise<ChartContext> {
    return apiFetch("/context/chart", { method: "PUT", body: JSON.stringify({ symbol, timeframe }) });
  },
};

// ── Market Data API ───────────────────────────────────────────────
export const marketAPI = {
  // symbol/timeframe are both optional -- if omitted, the backend uses
  // the user's saved chart context automatically.
  async getIndicators(symbol?: string, timeframe?: Timeframe): Promise<MarketIndicators> {
    const params = new URLSearchParams();
    if (symbol) params.set("symbol", symbol);
    if (timeframe) params.set("timeframe", timeframe);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/market/indicators${qs}`);
  },
};

// ── News API ──────────────────────────────────────────────────────
export const newsAPI = {
  // NOTE: no `limit` param -- the backend always returns exactly the
  // top 5 symbol-relevant headlines, ranked and pre-filtered server-side.
  async getFeed(symbol?: string): Promise<NewsFeedResponse> {
    const qs = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return apiFetch(`/news/feed${qs}`);
  },
};

// ── Risk API ──────────────────────────────────────────────────────
export const riskAPI = {
  // Returns null specifically on 404 -- that means "Binance not
  // connected," which the UI should render as a locked/upsell card,
  // NOT as a generic error state. Any other failure re-throws.
  async getProfile(symbol?: string): Promise<RiskProfile | null> {
    try {
      const qs = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
      return await apiFetch(`/risk/profile${qs}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
};

// ── Agent API ─────────────────────────────────────────────────────
// This replaces the original mock's llmAPI.chat/generateStrategy.
// Crucially: no LLMConfig is passed in here. The backend already
// knows which provider/model/key to use (from llm-key/set) and reads
// the user's chart context + Binance connection server-side -- the
// frontend just asks a question or requests a strategy synthesis.
export const agentAPI = {
  async chat(message: string): Promise<AgentResponse> {
    return apiFetch("/agent/chat", { method: "POST", body: JSON.stringify({ message }) });
  },

  async strategy(): Promise<AgentResponse> {
    return apiFetch("/agent/strategy", { method: "POST" });
  },
};