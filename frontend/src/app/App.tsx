import { useState, useRef, useEffect } from "react";
import {
  TrendingUp, MessageSquare, Newspaper, Bot,
  ArrowRight, Shield, Zap, BarChart2,
  LogOut, Bell, Send, Settings,
  ExternalLink, Clock, ChevronDown, RefreshCw,
  CheckCircle, Loader2, AlertCircle, Activity,
  Eye, EyeOff, Menu, Lock, Key, Cpu,
  ChevronRight, Sparkles, Radio,
  LineChart, Plus, Circle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// ==================== TYPES ====================
type Page = "landing" | "login" | "signup" | "dashboard" | "workspace";
type ApiState = "idle" | "loading" | "success" | "error" | "empty";
type SentimentType = "bullish" | "bearish" | "neutral";
type AgentStatus = "running" | "completed" | "error" | "pending";
type BadgeVariant = SentimentType | "default" | AgentStatus;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface NewsItem {
  id: string;
  headline: string;
  source: string;
  time: string;
  summary: string;
  sentiment: SentimentType;
  sentimentScore: number;
}

interface AgentTask {
  id: string;
  agentName: string;
  status: AgentStatus;
  task: string;
  result: string | null;
  timestamp: string;
  duration: string | null;
}

interface LLMProvider {
  id: string;
  name: string;
  color: string;
  initial: string;
  models: string[];
  description: string;
}

interface PricePoint {
  time: string;
  price: number;
  volume: number;
}

// ==================== STATIC DATA ====================

const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    color: "#10B981",
    initial: "O",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    description: "GPT-4o and latest models",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    color: "#C27C3E",
    initial: "A",
    models: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"],
    description: "Claude 4 model family",
  },
  {
    id: "google",
    name: "Google",
    color: "#4285F4",
    initial: "G",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    description: "Gemini 2.0 and Pro",
  },
  {
    id: "groq",
    name: "Groq",
    color: "#F97316",
    initial: "G",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"],
    description: "Ultra-fast inference",
  },
  {
    id: "mistral",
    name: "Mistral",
    color: "#6366F1",
    initial: "M",
    models: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
    description: "European sovereign AI",
  },
];

const FEATURES = [
  {
    icon: Cpu,
    title: "Multi-Model AI",
    description: "Connect OpenAI, Anthropic, Google, and more. Use your own API keys — your data stays private and yours.",
  },
  {
    icon: BarChart2,
    title: "Professional Charting",
    description: "TradingView-grade charts with real-time price feeds across all major trading pairs and timeframes.",
  },
  {
    icon: Bot,
    title: "AI Agent Orchestration",
    description: "Autonomous agents analyze markets, scan news, and surface actionable signals — around the clock.",
  },
  {
    icon: Newspaper,
    title: "News Sentiment Engine",
    description: "Real-time news ingestion with AI sentiment scoring. Know the market narrative before it moves price.",
  },
  {
    icon: Shield,
    title: "Non-Custodial Design",
    description: "Your API keys are encrypted client-side. Krypton never stores or transmits your credentials.",
  },
  {
    icon: Zap,
    title: "Instant Insights",
    description: "Sub-second response times powered by streaming inference. Ask, analyze, act — without waiting.",
  },
];

const TRADING_PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "MATIC/USDT"];
const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1D", "1W"];

const BASE_PRICES: Record<string, number> = {
  "BTC/USDT": 68120, "ETH/USDT": 3640, "SOL/USDT": 182,
  "BNB/USDT": 615, "XRP/USDT": 0.62, "MATIC/USDT": 0.95,
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hello! I'm your Krypton AI trading assistant. I can analyze market conditions, interpret news sentiment, and help you think through trading decisions. What would you like to explore today?",
    timestamp: "09:41",
  },
];

const MOCK_NEWS: NewsItem[] = [
  {
    id: "1",
    headline: "Bitcoin ETF inflows hit $1.2B as institutional demand surges",
    source: "CoinDesk",
    time: "2m ago",
    summary: "Spot Bitcoin ETFs recorded their largest single-day inflow since launch, driven by BlackRock and Fidelity products. Analysts attribute the surge to macro tailwinds and growing institutional allocation strategies.",
    sentiment: "bullish",
    sentimentScore: 82,
  },
  {
    id: "2",
    headline: "Fed signals potential rate cut in Q3, risk assets rally across the board",
    source: "Reuters",
    time: "8m ago",
    summary: "Federal Reserve minutes revealed growing consensus among board members for a rate reduction cycle beginning in Q3 2026. Crypto markets responded positively with BTC gaining 3.2% in the hour following the release.",
    sentiment: "bullish",
    sentimentScore: 74,
  },
  {
    id: "3",
    headline: "Ethereum gas fees spike amid high-profile DeFi protocol launch",
    source: "The Block",
    time: "15m ago",
    summary: "A major DeFi protocol launch on Ethereum mainnet caused average gas fees to spike to 45 gwei. The congestion is expected to normalize within 2-4 hours as the initial launch excitement subsides.",
    sentiment: "neutral",
    sentimentScore: 48,
  },
  {
    id: "4",
    headline: "Binance faces regulatory scrutiny in three new jurisdictions",
    source: "Bloomberg",
    time: "32m ago",
    summary: "Regulatory bodies in Singapore, UAE, and France have opened preliminary inquiries into Binance compliance practices. The exchange confirmed it is cooperating fully and expects the reviews to conclude favorably.",
    sentiment: "bearish",
    sentimentScore: 28,
  },
  {
    id: "5",
    headline: "Solana network processes record 65k TPS in coordinated stress test",
    source: "Decrypt",
    time: "1h ago",
    summary: "Solana validators completed a stress test achieving 65,000 transactions per second with 99.8% uptime. The milestone positions Solana as a leading candidate for enterprise-grade blockchain adoption.",
    sentiment: "bullish",
    sentimentScore: 79,
  },
];

const INITIAL_AGENTS: AgentTask[] = [
  {
    id: "1",
    agentName: "MarketScanner",
    status: "completed",
    task: "Scan BTC/USDT for breakout patterns on 4H",
    result: "Identified ascending triangle. Resistance at $68,400. Volume confirmation required for entry.",
    timestamp: "09:38",
    duration: "2.1s",
  },
  {
    id: "2",
    agentName: "SentimentAgent",
    status: "completed",
    task: "Aggregate news sentiment — last 2 hours",
    result: "Overall: BULLISH (71/100). 14 bullish vs 3 bearish articles. Key driver: ETF inflows.",
    timestamp: "09:39",
    duration: "3.4s",
  },
  {
    id: "3",
    agentName: "RiskAnalyzer",
    status: "running",
    task: "Calculate portfolio exposure across open positions",
    result: null,
    timestamp: "09:41",
    duration: null,
  },
  {
    id: "4",
    agentName: "OnChainAgent",
    status: "pending",
    task: "Monitor whale wallet movements — BTC top 100",
    result: null,
    timestamp: "09:41",
    duration: null,
  },
];

const ASSISTANT_REPLIES = [
  "Based on current conditions, BTC is consolidating near $68,000 support. RSI on the 4H is at 52 — neither overbought nor oversold. Watch for a breakout above $68,500 with volume confirmation before taking a position.",
  "The sentiment data from the last 2 hours shows a bullish bias (score: 74/100). Key driver is ETF inflow data. However, the funding rate on perpetuals is slightly elevated at 0.012%, which could indicate overleveraged longs — be cautious on aggressive entries.",
  "For ETH/USDT, the gas fee spike is likely temporary, driven by the new DeFi launch. Once congestion normalizes, ETH typically sees renewed buying interest. The ETH/BTC ratio is holding 0.0534 support — a constructive sign.",
  "Looking at on-chain data, exchange reserves for BTC have declined for 6 consecutive days — a historically bullish signal indicating accumulation. Combined with ETF inflows, the medium-term bias remains constructive, though short-term volatility should be expected.",
];

// ==================== UTILITIES ====================

function generatePriceData(basePrice: number, points: number): PricePoint[] {
  let price = basePrice;
  return Array.from({ length: points }, (_, i) => {
    const noise = (Math.random() - 0.47) * 0.018;
    price = price * (1 + noise);
    const totalMin = i * 15;
    const hour = Math.floor(totalMin / 60) + 9;
    const min = totalMin % 60;
    return {
      time: `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
      price: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 800 + 200),
    };
  });
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

// ==================== SHARED COMPONENTS ====================

function KryptonLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const boxClass = { sm: "w-6 h-6 text-xs", md: "w-8 h-8 text-sm", lg: "w-10 h-10 text-base" }[size];
  const textClass = { sm: "text-xs tracking-[0.2em]", md: "text-sm tracking-[0.2em]", lg: "text-base tracking-[0.2em]" }[size];
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${boxClass} rounded flex items-center justify-center font-bold text-[#080B12] flex-shrink-0`}
        style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)" }}
      >
        Kr
      </div>
      <span className={`font-semibold ${textClass} text-foreground font-['Outfit']`} style={{ fontFamily: "Outfit, sans-serif" }}>
        KRYPTON
      </span>
    </div>
  );
}

function Badge({ variant = "default", children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  const styles: Record<BadgeVariant, string> = {
    bullish: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    bearish: "bg-red-500/10 text-red-400 border-red-500/20",
    neutral: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    default: "bg-muted text-muted-foreground border-border",
    running: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    pending: "bg-slate-600/10 text-slate-400 border-slate-600/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${styles[variant]}`} style={{ fontFamily: "JetBrains Mono, monospace" }}>
      {children}
    </span>
  );
}

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  return <Loader2 className={`animate-spin text-primary ${size === "sm" ? "w-4 h-4" : "w-6 h-6"}`} />;
}

function AgentStatusDot({ status }: { status: AgentStatus }) {
  if (status === "running") return <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 flex-shrink-0" />;
  if (status === "completed") return <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
  if (status === "error") return <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
  return <Circle className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />;
}

// ==================== LANDING PAGE ====================

function LandingNav({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-border"
      style={{ background: "rgba(8,11,18,0.88)", backdropFilter: "blur(14px)" }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <KryptonLogo />
        <div className="hidden md:flex items-center gap-8">
          {["Features", "Pricing", "Docs"].map((item) => (
            <a key={item} href={item === "Features" ? "#features" : "#"} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {item}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onLogin} className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
            Log in
          </button>
          <button
            onClick={onSignup}
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12" }}
          >
            Get Started
          </button>
          <button className="md:hidden text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-border px-6 py-4 flex flex-col gap-4" style={{ background: "#0D1117" }}>
          <a href="#features" className="text-sm text-muted-foreground">Features</a>
          <button onClick={onLogin} className="text-sm text-left text-muted-foreground">Log in</button>
          <button onClick={onSignup} className="text-sm text-left" style={{ color: "#00D4FF" }}>Sign up</button>
        </div>
      )}
    </nav>
  );
}

function HeroSection({ onSignup, onLogin }: { onSignup: () => void; onLogin: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(0,212,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Center glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border mb-8 text-xs text-muted-foreground"
            style={{ background: "#0D1117", fontFamily: "JetBrains Mono, monospace" }}
          >
            <Radio className="w-3 h-3 text-emerald-400" />
            Live Market Intelligence · AI-Powered
          </div>

          <h1 className="text-5xl lg:text-6xl font-semibold leading-tight text-foreground mb-6" style={{ fontFamily: "Outfit, sans-serif", letterSpacing: "-0.02em" }}>
            AI Trading
            <span
              className="block"
              style={{
                background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Intelligence
            </span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg">
            Krypton combines advanced language models with real-time market data to deliver institutional-grade trading insights. Your API keys. Your models. Your edge.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={onSignup}
              className="flex items-center gap-2 px-7 py-3.5 rounded-lg font-semibold transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12" }}
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onLogin}
              className="flex items-center gap-2 px-7 py-3.5 rounded-lg font-semibold text-foreground border border-border hover:border-primary/40 transition-all"
            >
              Log in
            </button>
          </div>

          <div className="flex items-center gap-8 mt-10">
            {[
              { value: "5+", label: "LLM Providers" },
              { value: "500+", label: "Trading Pairs" },
              { value: "<100ms", label: "Response Time" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-xl font-semibold text-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero preview card */}
        <div className="relative hidden md:block">
          <div className="rounded-xl border border-border overflow-hidden shadow-2xl" style={{ background: "#0D1117" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: "#EF4444" }} />
                <span className="w-3 h-3 rounded-full" style={{ background: "#F59E0B" }} />
                <span className="w-3 h-3 rounded-full" style={{ background: "#10B981" }} />
              </div>
              <span className="text-xs text-muted-foreground ml-2" style={{ fontFamily: "JetBrains Mono, monospace" }}>Krypton Workspace</span>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                <Activity className="w-3 h-3" />
                Live
              </div>
            </div>
            <div className="p-4 space-y-4">
              {/* AI Message */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12" }}>K</div>
                <div className="flex-1 p-3 rounded-lg border border-border/50 text-xs text-foreground/80 leading-relaxed" style={{ background: "#080B12" }}>
                  BTC showing strong accumulation at the $67,800 support zone. RSI divergence on 4H suggests potential reversal. ETF inflow data remains elevated — institutional demand is constructive.
                </div>
              </div>

              {/* Mini price tickers */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { pair: "BTC/USDT", price: "$68,120", change: "+2.4%", up: true },
                  { pair: "ETH/USDT", price: "$3,640", change: "+1.8%", up: true },
                  { pair: "SOL/USDT", price: "$182.40", change: "-0.6%", up: false },
                ].map((item) => (
                  <div key={item.pair} className="rounded-lg p-2.5 border border-border/30" style={{ background: "#080B12" }}>
                    <div className="text-[10px] text-muted-foreground mb-1" style={{ fontFamily: "JetBrains Mono, monospace" }}>{item.pair}</div>
                    <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>{item.price}</div>
                    <div className={`text-[10px] font-medium mt-0.5 ${item.up ? "text-emerald-400" : "text-red-400"}`} style={{ fontFamily: "JetBrains Mono, monospace" }}>{item.change}</div>
                  </div>
                ))}
              </div>

              {/* Agent feed preview */}
              <div className="space-y-1.5">
                {[
                  { name: "MarketScanner", status: "Analysis complete", done: true },
                  { name: "SentimentAgent", status: "BULLISH · score: 74", done: true },
                  { name: "RiskAnalyzer", status: "Running...", done: false },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-[10px]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    {item.done
                      ? <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      : <Loader2 className="w-3 h-3 animate-spin text-cyan-400 flex-shrink-0" />}
                    <span className="text-muted-foreground"><span className="text-foreground/70">{item.name}</span> — {item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Glow ring */}
          <div
            className="absolute -inset-px rounded-xl pointer-events-none opacity-20"
            style={{ background: "linear-gradient(135deg, #00D4FF, #6366F1)", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", padding: "1px" }}
          />
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 border-t border-border/40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border mb-6 text-xs text-muted-foreground"
            style={{ background: "#0D1117", fontFamily: "JetBrains Mono, monospace" }}
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Why Krypton
          </div>
          <h2 className="text-3xl lg:text-4xl font-semibold text-foreground mb-4" style={{ fontFamily: "Outfit, sans-serif", letterSpacing: "-0.02em" }}>
            Everything you need to trade smarter
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Institutional-grade tools, made accessible. Powered by the AI models you already trust.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-xl border border-border hover:border-primary/25 transition-all duration-300"
              style={{ background: "#0D1117" }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.12)" }}
              >
                <feature.icon className="w-5 h-5" style={{ color: "#00D4FF" }} />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({ onSignup }: { onSignup: () => void }) {
  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl lg:text-4xl font-semibold text-foreground mb-4" style={{ fontFamily: "Outfit, sans-serif", letterSpacing: "-0.02em" }}>
          Ready to trade with an edge?
        </h2>
        <p className="text-muted-foreground mb-10 max-w-md mx-auto">
          Join traders using Krypton to cut through market noise. Start free — no credit card required.
        </p>
        <button
          onClick={onSignup}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:opacity-90 hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12" }}
        >
          Create free account
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}

function LandingFooter() {
  const footerCols = [
    { label: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
    { label: "Resources", links: ["Documentation", "API Reference", "Blog", "Status"] },
    { label: "Company", links: ["About", "Privacy", "Terms", "Contact"] },
  ];
  return (
    <footer className="border-t border-border/40 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 justify-between">
          <div className="max-w-xs">
            <KryptonLogo />
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              AI-powered trading intelligence. Your keys, your data, your edge.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-10">
            {footerCols.map((col) => (
              <div key={col.label}>
                <div className="text-xs font-semibold text-foreground mb-4 uppercase tracking-widest">{col.label}</div>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2026 Krypton. All rights reserved.</p>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>v1.0.0-alpha · Not financial advice</p>
        </div>
      </div>
    </footer>
  );
}

function LandingPage({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "Inter, sans-serif" }}>
      <LandingNav onLogin={onLogin} onSignup={onSignup} />
      <HeroSection onSignup={onSignup} onLogin={onLogin} />
      <FeaturesSection />
      <CTASection onSignup={onSignup} />
      <LandingFooter />
    </div>
  );
}

// ==================== AUTH PAGE ====================

function AuthPage({
  mode,
  onToggle,
  onSuccess,
  onBack,
}: {
  mode: "login" | "signup";
  onToggle: () => void;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === "login";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 65%)" }} />

      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Back to home
      </button>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <KryptonLogo size="lg" />
          <h1 className="text-2xl font-semibold text-foreground mt-8 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Sign in to your Krypton workspace" : "Start trading with AI intelligence"}
          </p>
        </div>

        <div className="rounded-xl border border-border p-8" style={{ background: "#0D1117" }}>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/20 text-sm mb-6" style={{ background: "rgba(239,68,68,0.08)", color: "#F87171" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-border text-foreground text-sm focus:outline-none transition-colors placeholder:text-muted-foreground/40"
                  style={{ background: "#080B12" }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.4)")}
                  onBlur={(e) => (e.target.style.borderColor = "")}
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-lg border border-border text-foreground text-sm focus:outline-none transition-colors placeholder:text-muted-foreground/40"
                style={{ background: "#080B12" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "")}
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-lg border border-border text-foreground text-sm focus:outline-none transition-colors placeholder:text-muted-foreground/40"
                  style={{ background: "#080B12" }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.4)")}
                  onBlur={(e) => (e.target.style.borderColor = "")}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-right -mt-1">
                <a href="#" className="text-xs hover:opacity-80 transition-opacity" style={{ color: "#00D4FF" }}>Forgot password?</a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12" }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                isLogin ? "Sign in" : "Create account"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/60 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button onClick={onToggle} className="font-semibold hover:opacity-80 transition-opacity" style={{ color: "#00D4FF" }}>
                {isLogin ? "Sign up" : "Log in"}
              </button>
            </p>
          </div>
        </div>

        {!isLogin && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            By creating an account you agree to our{" "}
            <a href="#" className="underline hover:text-foreground">Terms</a> and{" "}
            <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
          </p>
        )}
      </div>
    </div>
  );
}

// ==================== DASHBOARD PAGE ====================

function DashboardPage({ onContinue }: { onContinue: () => void }) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [modelOpen, setModelOpen] = useState(false);

  const provider = LLM_PROVIDERS.find((p) => p.id === selectedProvider);
  const models = provider?.models ?? [];
  const canContinue = !!(selectedProvider && apiKey.trim().length > 10 && selectedModel);

  const stepActive = (step: number) => {
    if (step === 1) return true;
    if (step === 2) return !!selectedProvider;
    if (step === 3) return !!(selectedProvider && apiKey.trim().length > 10);
    return false;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
      <header className="h-16 border-b border-border flex items-center justify-between px-6 flex-shrink-0" style={{ background: "#0D1117" }}>
        <KryptonLogo />
        <div className="flex items-center gap-4">
          <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12" }}
          >
            AM
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-foreground mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
            Welcome to Krypton
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Connect your preferred AI provider to get started. Your API key is encrypted locally and never stored on our servers.
          </p>
        </div>

        {/* Step 1 — Provider */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12", fontFamily: "JetBrains Mono, monospace" }}
            >1</div>
            <h2 className="text-base font-semibold text-foreground">Choose your LLM provider</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {LLM_PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedProvider(p.id); setSelectedModel(""); setModelOpen(false); }}
                className="p-4 rounded-xl border text-left transition-all duration-200 group relative"
                style={{
                  background: selectedProvider === p.id ? `${p.color}0D` : "#0D1117",
                  borderColor: selectedProvider === p.id ? `${p.color}50` : "rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white mb-3"
                  style={{ background: p.color }}
                >
                  {p.initial}
                </div>
                <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{p.description}</div>
                {selectedProvider === p.id && (
                  <CheckCircle className="w-4 h-4 absolute top-3 right-3" style={{ color: p.color }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — API Key */}
        <div className={`mb-10 transition-opacity ${stepActive(2) ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: stepActive(2) ? "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)" : "#1a2235",
                color: stepActive(2) ? "#080B12" : "#6B7A8D",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >2</div>
            <h2 className="text-base font-semibold text-foreground">Enter your API key</h2>
          </div>
          <div className="rounded-xl border border-border p-6" style={{ background: "#0D1117" }}>
            <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Encrypted locally · Never transmitted to our servers
            </div>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Paste your ${provider?.name ?? "provider"} API key`}
                className="w-full pl-10 pr-11 py-3 rounded-lg border border-border text-foreground text-sm focus:outline-none transition-colors placeholder:text-muted-foreground/40"
                style={{ background: "#080B12", fontFamily: "JetBrains Mono, monospace" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "")}
              />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {provider && (
              <p className="text-xs text-muted-foreground mt-3">
                Get your key from the{" "}
                <a href="#" className="underline inline-flex items-center gap-0.5 hover:opacity-80" style={{ color: provider.color }}>
                  {provider.name} dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Step 3 — Model */}
        <div className={`mb-10 transition-opacity ${stepActive(3) ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: stepActive(3) ? "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)" : "#1a2235",
                color: stepActive(3) ? "#080B12" : "#6B7A8D",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >3</div>
            <h2 className="text-base font-semibold text-foreground">Select a model</h2>
          </div>
          <div className="relative">
            <button
              onClick={() => setModelOpen(!modelOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border text-sm transition-all focus:outline-none"
              style={{ background: "#0D1117", fontFamily: "JetBrains Mono, monospace" }}
            >
              <span className={selectedModel ? "text-foreground" : "text-muted-foreground"}>
                {selectedModel || "Select a model..."}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${modelOpen ? "rotate-180" : ""}`} />
            </button>
            {modelOpen && models.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border overflow-hidden z-20 shadow-2xl" style={{ background: "#0D1117" }}>
                {models.map((model) => (
                  <button
                    key={model}
                    onClick={() => { setSelectedModel(model); setModelOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/20 transition-colors text-foreground flex items-center justify-between group"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    <span>{model}</span>
                    {selectedModel === model && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onContinue}
          disabled={!canContinue}
          className="w-full py-4 rounded-xl font-semibold transition-all hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12", fontFamily: "Outfit, sans-serif" }}
        >
          Enter Workspace
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ==================== WORKSPACE ====================

function WorkspaceTopNav({ onBack }: { onBack: () => void }) {
  return (
    <header className="h-13 border-b border-border flex items-center justify-between px-5 flex-shrink-0" style={{ background: "#0D1117", height: "52px" }}>
      <div className="flex items-center gap-4">
        <KryptonLogo size="sm" />
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-xs text-emerald-400" style={{ fontFamily: "JetBrains Mono, monospace" }}>
          <Activity className="w-3 h-3" />
          <span>Live</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
        <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
        <button
          onClick={onBack}
          title="Exit workspace"
          className="p-1.5 rounded hover:bg-muted/20 transition-colors text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4" />
        </button>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12" }}
        >
          AM
        </div>
      </div>
    </header>
  );
}

// --- Chat ---
function ChatSection() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsTyping(true);
    setTimeout(() => {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: ASSISTANT_REPLIES[Math.floor(Math.random() * ASSISTANT_REPLIES.length)],
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 1400 + Math.random() * 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div className="flex flex-col h-full border-r border-border overflow-hidden" style={{ background: "#080B12" }}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0" style={{ background: "#0D1117" }}>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">AI Chat</span>
        </div>
        <button className="p-1.5 rounded hover:bg-muted/20 transition-colors" title="New conversation">
          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: "none" }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
              style={
                msg.role === "assistant"
                  ? { background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12" }
                  : { background: "#1a2235", border: "1px solid rgba(255,255,255,0.1)", color: "#A0AEBF" }
              }
            >
              {msg.role === "assistant" ? "K" : "U"}
            </div>
            <div className={`max-w-[86%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className="px-3.5 py-2.5 rounded-xl text-sm leading-relaxed"
                style={
                  msg.role === "assistant"
                    ? { background: "#0D1117", border: "1px solid rgba(255,255,255,0.07)", color: "#CBD5E1" }
                    : { background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12" }
                }
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-muted-foreground px-1" style={{ fontFamily: "JetBrains Mono, monospace" }}>{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)", color: "#080B12" }}>K</div>
            <div className="px-3.5 py-3 rounded-xl border border-border flex items-center gap-1" style={{ background: "#0D1117" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-border flex-shrink-0">
        <div
          className="flex gap-2 p-2.5 rounded-xl border border-border transition-colors focus-within:border-primary/30"
          style={{ background: "#0D1117" }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about markets, charts, strategy..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none leading-relaxed py-0.5 px-1"
            style={{ minHeight: "22px", maxHeight: "120px", fontFamily: "Inter, sans-serif" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="w-8 h-8 rounded-lg flex-shrink-0 self-end flex items-center justify-center transition-all disabled:opacity-25 hover:opacity-80"
            style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)" }}
          >
            <Send className="w-3.5 h-3.5" style={{ color: "#080B12" }} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 text-center mt-2" style={{ fontFamily: "JetBrains Mono, monospace" }}>
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// --- Chart ---
function ChartSection() {
  const [pair, setPair] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [chartData, setChartData] = useState<PricePoint[]>(() => generatePriceData(68120, 48));
  const [loading, setLoading] = useState(false);

  const currentPrice = chartData[chartData.length - 1]?.price ?? 0;
  const startPrice = chartData[0]?.price ?? 0;
  const priceChange = currentPrice - startPrice;
  const priceChangePct = ((priceChange / startPrice) * 100).toFixed(2);
  const isUp = priceChange >= 0;

  const loadChart = (newPair: string, newTf: string) => {
    setLoading(true);
    setTimeout(() => {
      setChartData(generatePriceData(BASE_PRICES[newPair] ?? 100, 48));
      setLoading(false);
    }, 350);
  };

  const switchPair = (p: string) => { setPair(p); loadChart(p, timeframe); };
  const switchTf = (tf: string) => { setTimeframe(tf); loadChart(pair, tf); };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: PricePoint }> }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="px-3 py-2 rounded-lg border border-border text-xs shadow-xl" style={{ background: "#0D1117", fontFamily: "JetBrains Mono, monospace" }}>
        <div className="text-muted-foreground mb-0.5">{payload[0].payload.time}</div>
        <div className="text-foreground font-semibold">{formatPrice(payload[0].value)}</div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full border-b border-border overflow-hidden" style={{ background: "#080B12" }}>
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0 flex-wrap gap-2" style={{ background: "#0D1117" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <LineChart className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Chart</span>
          </div>
          <div className="flex items-center gap-0.5">
            {TRADING_PAIRS.map((p) => (
              <button
                key={p}
                onClick={() => switchPair(p)}
                className="px-2 py-1 rounded text-xs transition-all"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  background: pair === p ? "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)" : "transparent",
                  color: pair === p ? "#080B12" : "#6B7A8D",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              {formatPrice(currentPrice)}
            </div>
            <div className={`text-xs font-medium ${isUp ? "text-emerald-400" : "text-red-400"}`} style={{ fontFamily: "JetBrains Mono, monospace" }}>
              {isUp ? "+" : ""}{priceChangePct}%
            </div>
          </div>
          <div className="flex items-center gap-0.5 border border-border rounded-lg p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => switchTf(tf)}
                className="px-2 py-0.5 rounded text-xs transition-all"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  background: timeframe === tf ? "#1a2235" : "transparent",
                  color: timeframe === tf ? "#E2E8F0" : "#6B7A8D",
                }}
              >
                {tf}
              </button>
            ))}
          </div>
          <button onClick={() => loadChart(pair, timeframe)} className="p-1.5 rounded hover:bg-muted/20 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-3 relative min-h-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isUp ? "#10B981" : "#EF4444"} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={isUp ? "#10B981" : "#EF4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: "#6B7A8D" }}
                axisLine={false} tickLine={false} interval={7}
              />
              <YAxis
                tick={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: "#6B7A8D" }}
                axisLine={false} tickLine={false} width={65}
                tickFormatter={(v) => formatPrice(v)}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="price"
                stroke={isUp ? "#10B981" : "#EF4444"} strokeWidth={1.5}
                fill="url(#priceGrad)" dot={false}
                activeDot={{ r: 4, fill: isUp ? "#10B981" : "#EF4444", stroke: "#080B12", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        <div
          className="absolute bottom-4 right-5 text-[10px] text-muted-foreground/30 flex items-center gap-1"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          <TrendingUp className="w-3 h-3" />
          TradingView widget slot
        </div>
      </div>
    </div>
  );
}

// --- News ---
function NewsSection() {
  const [news] = useState<NewsItem[]>(MOCK_NEWS);
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [apiState] = useState<ApiState>("success");

  return (
    <div className="flex flex-col h-full border-l border-border overflow-hidden" style={{ background: "#080B12" }}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0" style={{ background: "#0D1117" }}>
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Live News</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <button className="p-1.5 rounded hover:bg-muted/20 transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {apiState === "loading" && (
        <div className="flex-1 flex items-center justify-center"><Spinner /></div>
      )}

      {apiState === "error" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Failed to load news</p>
          <button className="text-xs text-primary hover:opacity-80 transition-opacity" style={{ color: "#00D4FF" }}>Retry</button>
        </div>
      )}

      {apiState === "empty" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <Newspaper className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">No news available</p>
        </div>
      )}

      {apiState === "success" && !selected && (
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {news.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="w-full text-left px-4 py-3.5 border-b border-border/30 hover:bg-muted/8 transition-colors group"
              style={{ "--tw-bg-opacity": "0.08" } as React.CSSProperties}
            >
              <div className="mb-2">
                <Badge variant={item.sentiment}>{item.sentiment}</Badge>
              </div>
              <p className="text-xs text-foreground/85 leading-snug mb-2.5 group-hover:text-foreground transition-colors line-clamp-2">
                {item.headline}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                <span>{item.source}</span>
                <span>·</span>
                <Clock className="w-2.5 h-2.5" />
                <span>{item.time}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-3 h-3 rotate-180" />
            Back
          </button>

          <div>
            <Badge variant={selected.sentiment}>{selected.sentiment}</Badge>
            <h3 className="text-sm font-semibold text-foreground leading-snug mt-2 mb-2">
              {selected.headline}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              <span>{selected.source}</span>
              <span>·</span>
              <span>{selected.time}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border" style={{ background: "#0D1117" }}>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</div>
            <p className="text-xs text-foreground/80 leading-relaxed">{selected.summary}</p>
          </div>

          <div className="p-3.5 rounded-xl border border-border" style={{ background: "#0D1117" }}>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sentiment Analysis</div>
            <div className="flex items-center justify-between mb-3">
              <Badge variant={selected.sentiment}>{selected.sentiment}</Badge>
              <span className="text-base font-semibold text-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>{selected.sentimentScore}/100</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1a2235" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${selected.sentimentScore}%`,
                  background: selected.sentiment === "bullish"
                    ? "linear-gradient(90deg, #10B981, #34D399)"
                    : selected.sentiment === "bearish"
                    ? "linear-gradient(90deg, #EF4444, #F87171)"
                    : "linear-gradient(90deg, #F59E0B, #FCD34D)",
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              <span>Bearish · 0</span>
              <span>100 · Bullish</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Agent Feed ---
function AgentFeedSection() {
  const [agents, setAgents] = useState<AgentTask[]>(INITIAL_AGENTS);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === "3"
            ? {
                ...a,
                status: "completed" as const,
                result: "Exposure: BTC 34.2%, ETH 18.7%, SOL 8.1%. Max drawdown risk: -12.4% at current implied volatility.",
                duration: "5.2s",
              }
            : a
        )
      );
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#080B12" }}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0" style={{ background: "#0D1117" }}>
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Agent Feed</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <button className="p-1.5 rounded hover:bg-muted/20 transition-colors" title="Run new agent">
          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: "none" }}>
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="p-3 rounded-xl border transition-all duration-300"
            style={{
              background: "#0D1117",
              borderColor: agent.status === "running"
                ? "rgba(0,212,255,0.18)"
                : agent.status === "error"
                ? "rgba(239,68,68,0.18)"
                : "rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <AgentStatusDot status={agent.status} />
                <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>{agent.agentName}</span>
              </div>
              <div className="flex items-center gap-2">
                {agent.duration && (
                  <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>{agent.duration}</span>
                )}
                <Badge variant={agent.status}>{agent.status}</Badge>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground mb-1.5 leading-relaxed" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              {agent.task}
            </p>

            {agent.status === "running" && (
              <div className="flex gap-0.5 mt-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-0.5 flex-1 rounded-full animate-pulse"
                    style={{ background: "rgba(0,212,255,0.35)", animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            )}

            {agent.result && (
              <div
                className="text-[10px] text-foreground/75 leading-relaxed border-t border-border/30 pt-2 mt-2"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {agent.result}
              </div>
            )}

            <div className="text-[9px] text-muted-foreground/40 mt-1.5" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              {agent.timestamp}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspacePage({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>
      <WorkspaceTopNav onBack={onBack} />
      <div
        className="flex-1 min-h-0 grid"
        style={{ gridTemplateColumns: "300px 1fr 260px" }}
      >
        {/* Left: Chat (full height) */}
        <ChatSection />

        {/* Center: Chart top + Agent Feed bottom */}
        <div className="grid min-h-0" style={{ gridTemplateRows: "58% 42%" }}>
          <ChartSection />
          <AgentFeedSection />
        </div>

        {/* Right: News (full height) */}
        <NewsSection />
      </div>
    </div>
  );
}

// ==================== APP ROUTER ====================

export default function App() {
  const [page, setPage] = useState<Page>("landing");

  return (
    <div className="dark">
      {page === "landing" && (
        <LandingPage
          onLogin={() => setPage("login")}
          onSignup={() => setPage("signup")}
        />
      )}
      {page === "login" && (
        <AuthPage
          mode="login"
          onToggle={() => setPage("signup")}
          onSuccess={() => setPage("dashboard")}
          onBack={() => setPage("landing")}
        />
      )}
      {page === "signup" && (
        <AuthPage
          mode="signup"
          onToggle={() => setPage("login")}
          onSuccess={() => setPage("dashboard")}
          onBack={() => setPage("landing")}
        />
      )}
      {page === "dashboard" && (
        <DashboardPage onContinue={() => setPage("workspace")} />
      )}
      {page === "workspace" && (
        <WorkspacePage onBack={() => setPage("dashboard")} />
      )}
    </div>
  );
}
