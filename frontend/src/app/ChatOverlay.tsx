import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Send, TrendingUp, TrendingDown, BarChart2, Activity,
  Zap, ShieldCheck, Bot, User,
} from "lucide-react";
import {
  marketAPI, newsAPI, riskAPI, agentAPI,
  type MarketIndicators, type NewsItem, type RiskProfile, type SentimentSummary,
} from "../config/api";

// NOTE: ChatMessage is now defined LOCALLY, not imported from api config.
// The backend has no concept of a persisted message list -- /agent/chat
// is STATELESS: each call only carries the CURRENT message, not prior
// turns. `timestamp` here is purely a frontend display detail (when did
// this bubble render), not something the backend returns or uses.
//
// IMPORTANT LIMITATION: because the backend doesn't receive conversation
// history, a follow-up like "what about the risk on that?" has NO
// context of what "that" refers to -- each message is answered fresh,
// using only the current market/news/risk data, never prior chat turns.
// If you want real multi-turn memory, that requires extending
// ChatRequest to accept prior messages and having synthesis_node's
// prompt include them -- a backend change, not something to fake here.
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStrategy?: boolean; // tags Strategy-button-triggered messages distinctly
  errors?: string[];      // surfaced from AgentResponse.errors, if any
}

interface ChatOverlayProps {
  onClose: () => void;
  symbol: string; // NOTE: no llmConfig/binanceConfig anymore -- the backend
                    // already knows this user's stored LLM/Binance keys from
                    // the JWT alone. All this component needs is which
                    // symbol is currently selected, for display purposes.
}

// Mirrors the backend's OWN aggregation logic in sentiment_agent.py
// (_build_sentiment_summary) exactly, so the popup can show a sentiment
// summary the INSTANT it opens, using news already fetched -- without
// waiting for (or paying for) an LLM call just to count labels we
// already have. If the user later sends a chat message or hits
// Strategy, the backend's OWN sentiment_summary in that response
// takes over as the source of truth (see sendMessage/handleStrategy).
function computeLocalSentimentSummary(items: NewsItem[]): SentimentSummary {
  if (items.length === 0) {
    return { bullish_count: 0, bearish_count: 0, neutral_count: 0, avg_score: 0, overall_label: "neutral" };
  }
  const bullish = items.filter((i) => i.sentiment_label === "bullish").length;
  const bearish = items.filter((i) => i.sentiment_label === "bearish").length;
  const neutral = items.filter((i) => i.sentiment_label === "neutral").length;
  const avg = items.reduce((sum, i) => sum + i.sentiment_score, 0) / items.length;
  const overall_label = avg >= 0.15 ? "bullish" : avg <= -0.15 ? "bearish" : "neutral";
  return { bullish_count: bullish, bearish_count: bearish, neutral_count: neutral, avg_score: Math.round(avg * 1000) / 1000, overall_label };
}

export default function ChatOverlay({ onClose, symbol }: ChatOverlayProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Welcome to Krypton AI. I'm set up to analyze **${symbol}**. Ask me anything about the market, or click **Generate Strategy** for a full synthesized read.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [strategyLoading, setStrategyLoading] = useState(false);

  const [indicators, setIndicators] = useState<MarketIndicators | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [sentimentSummary, setSentimentSummary] = useState<SentimentSummary | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null); // null = either "not fetched yet" or "Binance not connected" -- see riskLocked below
  const [riskLocked, setRiskLocked] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load real panel data on open, and keep indicators/news lightly
  // refreshed while the popup stays open -- these are free, LLM-less
  // calls, so polling them is cheap (unlike chat/strategy).
  const loadPanels = useCallback(async () => {
    const [ind, news, risk] = await Promise.all([
      marketAPI.getIndicators(symbol),
      newsAPI.getFeed(symbol),
      riskAPI.getProfile(symbol),
    ]);
    setIndicators(ind);
    setNewsItems(news.items);
    setSentimentSummary(computeLocalSentimentSummary(news.items));
    setRiskProfile(risk);
    setRiskLocked(risk === null);
  }, [symbol]);

  useEffect(() => {
    loadPanels();
    const interval = setInterval(loadPanels, 25_000); // indicators/news refresh -- candles/headlines don't change faster than this
    return () => clearInterval(interval);
  }, [loadPanels]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim(), timestamp: new Date() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await agentAPI.chat(userMsg.content);
      setMessages((m) => [...m, {
        role: "assistant",
        content: res.final_response ?? "I couldn't generate a response.",
        timestamp: new Date(),
        errors: res.errors.length > 0 ? res.errors : undefined,
      }]);
      // The agent recomputed all of this fresh -- refresh the panels
      // with whatever it actually used, rather than leaving stale data
      // from the last poll showing.
      if (res.indicators) setIndicators(res.indicators);
      if (res.news_items) { setNewsItems(res.news_items); setSentimentSummary(computeLocalSentimentSummary(res.news_items)); }
      if (res.sentiment_summary) setSentimentSummary(res.sentiment_summary); // prefer the backend's own aggregate once available
      if (res.risk_profile) { setRiskProfile(res.risk_profile); setRiskLocked(false); }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I ran into an error reaching the assistant. Please check your connection and LLM key in Settings.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleStrategy = async () => {
    setStrategyLoading(true);
    try {
      const res = await agentAPI.strategy();
      setMessages((m) => [...m, {
        role: "assistant",
        content: res.final_response ?? "Strategy generation didn't return a result.",
        timestamp: new Date(),
        isStrategy: true,
        errors: res.errors.length > 0 ? res.errors : undefined,
      }]);
      if (res.indicators) setIndicators(res.indicators);
      if (res.sentiment_summary) setSentimentSummary(res.sentiment_summary);
      if (res.risk_profile) { setRiskProfile(res.risk_profile); setRiskLocked(false); }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Strategy generation failed. Check your LLM key in Settings.", timestamp: new Date() }]);
    } finally {
      setStrategyLoading(false);
    }
  };

  // "Market Sentiment" quick action -- deliberately NOT an LLM call.
  // We already have real sentiment_summary from news already fetched;
  // spending an LLM call just to restate counts we already computed
  // would be wasteful. This composes a plain-text summary locally.
  const showSentimentSummary = () => {
    if (!sentimentSummary) return;
    const s = sentimentSummary;
    const content =
      `Current sentiment for **${symbol}** is **${s.overall_label}** ` +
      `(avg score ${s.avg_score}).\n\n` +
      `• ${s.bullish_count} bullish headline${s.bullish_count === 1 ? "" : "s"}\n` +
      `• ${s.bearish_count} bearish headline${s.bearish_count === 1 ? "" : "s"}\n` +
      `• ${s.neutral_count} neutral headline${s.neutral_count === 1 ? "" : "s"}\n\n` +
      `Based on the top ${newsItems.length} relevant headlines right now.`;
    setMessages((m) => [...m, { role: "user", content: "What's the current market sentiment?", timestamp: new Date() }, { role: "assistant", content, timestamp: new Date() }]);
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
            <Zap size={13} className="text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-['Rajdhani'] text-lg font-700 tracking-widest text-foreground uppercase">KRYPTON</span>
          <span className="text-muted-foreground text-xs font-mono">/ AI TRADING ASSISTANT</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">LIVE</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:border-muted-foreground/30 hover:bg-secondary transition-all text-muted-foreground hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Market data panel */}
        <div className="w-[380px] shrink-0 border-r border-border bg-card overflow-y-auto flex flex-col gap-px">
          {/* Price header -- NOTE: no sparkline chart, no 24h % change.
              Backend's indicator service returns only the LATEST value
              for each indicator, not a historical time-series -- there's
              nothing to draw a trend line from without a NEW backend
              endpoint (one that computes indicators across many past
              candles, not just the most recent). The main TradingView
              chart already shows real price history anyway; faking a
              second mini-chart here with invented data isn't worth it. */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase">{symbol}</span>
            </div>
            {indicators ? (
              <div className="font-['JetBrains_Mono'] text-2xl font-600 text-foreground">
                ${indicators.close.toLocaleString()}
              </div>
            ) : (
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            )}
          </div>

          {/* EMA Indicators -- only EMA20/EMA50 (all the backend computes;
              no EMA200). "ABOVE/BELOW" badges are real: derived by
              comparing the actual close price to each real EMA value. */}
          <div className="p-4 border-b border-border">
            <div className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">Moving Averages</div>
            {indicators ? (
              <div className="space-y-2">
                {[
                  { label: "EMA 20", value: indicators.ema.ema20 },
                  { label: "EMA 50", value: indicators.ema.ema50 },
                ].map((ema) => {
                  const above = indicators.close > ema.value;
                  return (
                    <div key={ema.label} className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">{ema.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-foreground">${ema.value.toLocaleString()}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${above ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                          {above ? "▲ ABOVE" : "▼ BELOW"}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-mono text-muted-foreground">Trend</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${indicators.ema.trend === "bullish" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {indicators.ema.trend}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-4 bg-muted rounded animate-pulse" />)}</div>
            )}
          </div>

          {/* RSI -- real single current value + real state label from the
              backend. Gauge bar reflects the one real number we have;
              no fabricated historical line chart. */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase">RSI (14)</span>
              {indicators && (
                <span className={`text-sm font-['JetBrains_Mono'] font-600 ${indicators.rsi.state === "overbought" ? "text-destructive" : indicators.rsi.state === "oversold" ? "text-primary" : "text-amber-400"}`}>
                  {indicators.rsi.value.toFixed(1)}
                </span>
              )}
            </div>
            {indicators && (
              <>
                <div className="relative mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all"
                    style={{ width: `${indicators.rsi.value}%`, background: `linear-gradient(90deg, #22c55e, #f59e0b 80%, #ef4444)` }}
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/30 rounded" style={{ left: "30%" }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/30 rounded" style={{ left: "70%" }} />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
                  <span>Oversold 30</span>
                  <span className="uppercase">{indicators.rsi.state}</span>
                  <span>Overbought 70</span>
                </div>
              </>
            )}
          </div>

          {/* MACD -- real macd/signal/histogram values + real trend, no
              fabricated historical area chart. */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase">MACD (12,26,9)</span>
              {indicators && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${indicators.macd.trend === "bullish" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                  {indicators.macd.trend}
                </span>
              )}
            </div>
            {indicators && (
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "MACD", value: indicators.macd.macd.toFixed(2) },
                  { label: "Signal", value: indicators.macd.signal.toFixed(2) },
                  { label: "Hist.", value: indicators.macd.histogram.toFixed(2) },
                ].map((item) => (
                  <div key={item.label} className="bg-muted rounded-lg p-1.5">
                    <div className="text-[9px] font-mono text-muted-foreground uppercase">{item.label}</div>
                    <div className="text-xs font-['JetBrains_Mono'] font-500 text-foreground">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Risk -- real overall_risk_score (0-100 scale, NOT 0-10 like
              the original mock), real concentration % and volatility
              label. No "factors" bullet list -- the backend doesn't
              itemize contributing factors, only these two components. */}
          {riskLocked ? (
            <div className="p-4 text-center">
              <ShieldCheck size={20} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                Connect Binance to enable risk analysis and portfolio tracking
              </p>
            </div>
          ) : riskProfile ? (
            <div className="p-4">
              <div className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">Risk Analysis</div>
              <div className="flex items-center gap-4 mb-3">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#141929" strokeWidth="3" />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={riskProfile.overall_risk_label === "low" ? "#00e5b0" : riskProfile.overall_risk_label === "moderate" ? "#f59e0b" : "#ef4444"}
                      strokeWidth="3"
                      strokeDasharray={`${riskProfile.overall_risk_score}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-['JetBrains_Mono'] font-600 text-foreground leading-none">{riskProfile.overall_risk_score}</span>
                    <span className="text-[8px] font-mono text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <div>
                  <div className={`font-['Rajdhani'] text-base font-600 uppercase tracking-wider ${riskProfile.overall_risk_label === "low" ? "text-primary" : riskProfile.overall_risk_label === "moderate" ? "text-amber-400" : "text-destructive"}`}>
                    {riskProfile.overall_risk_label} risk
                  </div>
                  <div className="text-xs text-muted-foreground">Portfolio-aware score</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <TrendingUp size={10} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    {riskProfile.concentration.pct_of_portfolio.toFixed(1)}% of portfolio in {riskProfile.concentration.asset}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <TrendingDown size={10} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    Volatility: {riskProfile.volatility.label} ({riskProfile.volatility.std_dev_pct}%)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Activity size={10} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    Total portfolio value: ${riskProfile.portfolio_total_usdt.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-2">{[0, 1].map((i) => <div key={i} className="h-4 bg-muted rounded animate-pulse" />)}</div>
          )}

          {/*
            NOTE: the original mock's "Portfolio" section (per-asset $
            value + % breakdown) is REMOVED here. Your backend's
            /integration/binance/portfolio only returns raw balances
            (asset/free/locked quantities) -- no USD value or % per
            asset. Computing that properly for EVERY held asset (not
            just the currently-selected symbol) would need a new
            backend endpoint reusing risk_service's compute_portfolio_value
            across the whole portfolio, not just one asset's concentration.
            Worth building if you want this view back -- not something to
            reconstruct with ad-hoc price-fetching here.
          */}
        </div>

        {/* RIGHT: Chat panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={13} className="text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user" ? "bg-secondary text-foreground border border-border" : "bg-card border border-border text-foreground"
                  }`}
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {msg.isStrategy && (
                    <span className="inline-block text-[9px] font-mono uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 rounded px-1.5 py-0.5 mb-1.5">
                      Strategy Analysis
                    </span>
                  )}
                  {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                    part.startsWith("**") && part.endsWith("**")
                      ? <strong key={j} className="font-['Rajdhani'] font-600 text-primary">{part.slice(2, -2)}</strong>
                      : part
                  )}
                  {msg.errors && (
                    <div className="mt-2 text-[10px] font-mono text-amber-400/80">
                      Note: some data sources were unavailable for this response.
                    </div>
                  )}
                  <div className="text-[10px] font-mono text-muted-foreground mt-1.5 opacity-60">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 bg-secondary border border-border rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <User size={13} className="text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}

            {(loading || strategyLoading) && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center shrink-0">
                  <Bot size={13} className="text-primary" />
                </div>
                <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="w-1.5 h-1.5 bg-primary/60 rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-border bg-card p-4">
            <div className="flex gap-2 mb-3">
              <motion.button
                onClick={handleStrategy}
                disabled={strategyLoading || loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 text-accent rounded-lg text-sm font-['Rajdhani'] font-600 tracking-wide hover:bg-accent/20 transition-all disabled:opacity-50"
              >
                <BarChart2 size={14} />
                {strategyLoading ? "Generating..." : "Generate Strategy"}
              </motion.button>
              <motion.button
                onClick={showSentimentSummary}
                disabled={!sentimentSummary}
                className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border text-muted-foreground rounded-lg text-sm font-['Rajdhani'] font-600 tracking-wide hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
              >
                <Activity size={14} />
                Market Sentiment
              </motion.button>
            </div>

            <div className="flex gap-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Ask about market conditions, entry points, indicators..."
                disabled={loading || strategyLoading}
                className="flex-1 bg-secondary border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-60"
              />
              <motion.button
                onClick={sendMessage}
                disabled={!input.trim() || loading || strategyLoading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-11 h-11 bg-primary text-primary-foreground rounded-lg flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-40 shrink-0"
              >
                <Send size={15} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}