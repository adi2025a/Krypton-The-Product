import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare, TrendingUp, Zap, RefreshCw, Bell, Settings, ChevronRight, Activity,
} from "lucide-react";
import {
  newsAPI, marketAPI, chartContextAPI, statusAPI, llmKeyAPI,
  type NewsItem, type Timeframe, type MarketIndicators, type OnboardingStatus, type LLMKeyStatus,
} from "../config/api";
import ChatOverlay from "./ChatOverlay";

interface DashboardPageProps {
  email: string | null; // NOTE: no more llmConfig/binanceConfig -- those held raw
                          // key material that the backend never gives back out.
                          // Everything this page needs (LLM provider name, Binance
                          // connected state) is fetched live below.
}

// A small curated list for the symbol dropdown -- there's no backend
// endpoint that lists "available symbols", so this is a reasonable,
// hand-picked set of major pairs rather than something fetched live.
const SYMBOL_OPTIONS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT"];
const TIMEFRAME_OPTIONS: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

// Maps our Timeframe strings to TradingView's own interval format --
// these are two different vocabularies for the same concept, so the
// translation has to happen at the boundary where we hand off to the
// widget, not anywhere else in the app.
const TV_INTERVAL_MAP: Record<Timeframe, string> = {
  "1m": "1", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1d": "D",
};

function sentimentColor(label: string): { color: string; bg: string } {
  if (label === "bullish") return { color: "#00e5b0", bg: "rgba(0,229,176,0.08)" };
  if (label === "bearish") return { color: "#ef4444", bg: "rgba(239,68,68,0.08)" };
  return { color: "#5a6a8a", bg: "rgba(90,106,138,0.08)" };
}

// Backend sentiment_score is roughly -1..1 (VADER's compound score) --
// converting to a 0-100 gauge purely for the visual bar, same real
// number underneath, just rescaled for display.
function sentimentGaugeValue(score: number): number {
  return Math.round(((score + 1) / 2) * 100);
}

// Backend gives an ISO timestamp (or null), not a pre-formatted "2m
// ago" string -- that formatting has to happen here now.
function formatRelativeTime(iso: string | null): string {
  if (!iso) return "recently";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DashboardPage({ email }: DashboardPageProps) {
  const [chatOpen, setChatOpen] = useState(false);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [selectedNewsLink, setSelectedNewsLink] = useState<string | null>(null); // NOTE: keyed by
                                                                                   // `link` now, not `id` --
                                                                                   // the backend's NewsItem has no id field.

  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [indicators, setIndicators] = useState<MarketIndicators | null>(null);

  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [llmStatus, setLlmStatus] = useState<LLMKeyStatus | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);

  // Restore the user's last symbol/timeframe selection on mount, rather
  // than always starting at a hardcoded BTCUSDT/1h.
  useEffect(() => {
    chartContextAPI.get().then((ctx) => {
      setSymbol(ctx.symbol);
      setTimeframe(ctx.timeframe);
    });
    statusAPI.getOnboarding().then(setOnboarding);
    llmKeyAPI.getStatus().then(setLlmStatus);
  }, []);

  const loadNews = useCallback(() => {
    setNewsLoading(true);
    newsAPI.getFeed(symbol).then((res) => {
      setNews(res.items);
      setNewsLoading(false);
    });
  }, [symbol]);

  const loadIndicators = useCallback(() => {
    marketAPI.getIndicators(symbol, timeframe).then(setIndicators);
  }, [symbol, timeframe]);

  // Re-fetch news/indicators whenever symbol or timeframe changes --
  // both endpoints accept these as query overrides.
  useEffect(() => {
    loadNews();
    loadIndicators();
  }, [loadNews, loadIndicators]);

  // Called by the symbol/timeframe controls -- persists the change to
  // the backend (so the agent/chatbot stays in sync with what's on
  // screen) in addition to updating local state.
  async function handleSymbolChange(newSymbol: string) {
    setSymbol(newSymbol);
    await chartContextAPI.set(newSymbol, timeframe);
  }
  async function handleTimeframeChange(newTimeframe: Timeframe) {
    setTimeframe(newTimeframe);
    await chartContextAPI.set(symbol, newTimeframe);
  }

  // TradingView widget -- rebuilds whenever symbol/timeframe changes,
  // since the widget doesn't expose a clean "just update the symbol"
  // API for the free embed script; recreating it is the standard
  // approach for this widget.
  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget";
    wrapper.style.height = "100%";
    wrapper.style.width = "100%";
    container.appendChild(wrapper);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${symbol}`,
      interval: TV_INTERVAL_MAP[timeframe],
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(5, 8, 15, 1)",
      gridColor: "rgba(0, 229, 176, 0.04)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => { container.innerHTML = ""; };
  }, [symbol, timeframe]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen flex flex-col bg-background overflow-hidden"
    >
      {/* Top nav */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Zap size={11} className="text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-['Rajdhani'] text-base font-700 tracking-widest text-foreground uppercase">KRYPTON</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground tracking-wider">LIVE MARKET</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="text-foreground/60">{email}</span>
          </div>
          <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <Bell size={13} />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <Settings size={13} />
          </button>

          {/* AI badge -- reflects the REAL stored key status, not a
              client-side config object. Shows "Not set" rather than a
              fake provider name if the user hasn't configured one. */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary border border-border rounded-md">
            <span className="text-xs font-mono text-muted-foreground">AI:</span>
            <span className="text-xs font-mono text-foreground capitalize">
              {llmStatus ? llmStatus.provider : "Not set"}
            </span>
          </div>

          {onboarding?.binance_connected && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-md">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span className="text-xs font-mono text-primary">Binance</span>
            </div>
          )}
        </div>
      </header>

      {/*
        NOTE: the original multi-symbol ticker tape (BTC/ETH/SOL/BNB/...
        scrolling prices) is REMOVED here, not just left as mock data.
        There's no backend endpoint that returns live prices for many
        symbols at once -- /market/indicators is scoped to ONE symbol at
        a time (whatever the chart context currently is). Faking a
        ticker with static numbers would be actively misleading in a
        finance app. If you want this back, it needs a real backend
        endpoint (e.g. a batch price-fetch across a fixed symbol list
        via CCXT) -- happy to build that if you want it.
      */}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: TradingView chart */}
        <div className="flex-1 flex flex-col border-r border-border">
          {/* Chart header -- now a REAL symbol/timeframe selector, wired
              to chart_context on the backend */}
          <div className="h-10 flex items-center justify-between px-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <select
                value={symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                className="bg-transparent text-xs font-['Rajdhani'] font-600 tracking-wider text-foreground uppercase focus:outline-none cursor-pointer"
              >
                {SYMBOL_OPTIONS.map((s) => (
                  <option key={s} value={s} className="bg-card text-foreground">
                    {s.replace("USDT", "/USDT")}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5">
                {TIMEFRAME_OPTIONS.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => handleTimeframeChange(tf)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      timeframe === tf ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Real price from /market/indicators -- NOTE: no 24h
                change % shown here anymore. The backend's indicator
                service doesn't compute that (it only has recent
                candles for indicator math, not a fixed 24h-ago
                reference point) -- showing a fabricated % would be
                worse than just omitting it. */}
            {indicators && (
              <span className="text-xs font-['JetBrains_Mono'] text-foreground font-500">
                ${indicators.close.toLocaleString()}
              </span>
            )}
          </div>

          <div ref={chartRef} className="tradingview-widget-container flex-1 relative" style={{ minHeight: 0 }}>
            <div className="absolute inset-0 bg-card flex items-center justify-center">
              <div className="text-center">
                <Activity size={20} className="text-muted-foreground mx-auto mb-2 animate-pulse" />
                <p className="text-xs font-mono text-muted-foreground">Loading chart...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: News feed */}
        <div className="w-80 xl:w-96 flex flex-col border-border shrink-0">
          <div className="h-9 flex items-center justify-between px-4 border-b border-border shrink-0">
            <span className="text-xs font-['Rajdhani'] font-600 tracking-wider text-foreground uppercase">Live News</span>
            <button onClick={loadNews} className="text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw size={12} className={newsLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {newsLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-full" />
                    <div className="h-2 bg-muted rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : news.length === 0 ? (
              <div className="p-4 text-xs font-mono text-muted-foreground text-center">
                No relevant news found for {symbol} right now.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {news.map((item) => {
                  const sentiment = sentimentColor(item.sentiment_label);
                  const gauge = sentimentGaugeValue(item.sentiment_score);
                  const isSelected = selectedNewsLink === item.link;
                  return (
                    <motion.div
                      key={item.link}
                      onClick={() => setSelectedNewsLink(isSelected ? null : item.link)}
                      className="p-3.5 cursor-pointer hover:bg-secondary/30 transition-colors"
                      layout
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span
                          className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded font-500 shrink-0 uppercase"
                          style={{ color: sentiment.color, background: sentiment.bg }}
                        >
                          {item.sentiment_label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-['JetBrains_Mono'] font-600" style={{ color: sentiment.color }}>
                            {gauge}
                          </span>
                          <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${gauge}%`, background: sentiment.color }} />
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-foreground leading-relaxed font-medium mb-1">{item.title}</p>

                      <AnimatePresence>
                        {isSelected && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-[11px] text-muted-foreground leading-relaxed mb-2 overflow-hidden"
                          >
                            {item.summary}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground">{item.source}</span>
                          <span className="text-[10px] font-mono text-muted-foreground/50">·</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{formatRelativeTime(item.published_at)}</span>
                        </div>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronRight size={10} className={`transition-transform ${isSelected ? "rotate-90" : ""}`} />
                        </a>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar + Chat button */}
      <div className="h-12 border-t border-border bg-card flex items-center justify-between px-4 shrink-0">
        {/*
          NOTE: "Fear & Greed" and "Market Cap" below are REMOVED, not
          faked -- no backend endpoint computes either of these. The
          original had them hardcoded ("72 · Greed", "$2.41T"), which
          would show the same numbers forever. If these matter to you,
          they'd need real endpoints (Fear & Greed has a free public
          API you could proxy; total market cap could come from
          CoinGecko's public API) -- worth a follow-up if you want them.
        */}
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          {indicators && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span>{symbol} ${indicators.close.toLocaleString()}</span>
            </div>
          )}
          {indicators && (
            <div className="flex items-center gap-1.5">
              <TrendingUp size={11} className={indicators.ema.trend === "bullish" ? "text-primary" : "text-destructive"} />
              <span className={indicators.ema.trend === "bullish" ? "text-primary" : "text-destructive"}>
                EMA {indicators.ema.trend} · RSI {indicators.rsi.value.toFixed(1)} ({indicators.rsi.state})
              </span>
            </div>
          )}
        </div>

        <motion.button
          onClick={() => setChatOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2.5 px-5 py-2 bg-primary text-primary-foreground rounded-lg font-['Rajdhani'] font-700 text-sm tracking-wider hover:bg-primary/90 transition-all"
        >
          <MessageSquare size={15} />
          OPEN AI CHAT
          <ChevronRight size={13} />
        </motion.button>
      </div>

      {/* Chat overlay -- NOTE: no llmConfig/binanceConfig props anymore.
          ChatOverlay now calls agentAPI.chat()/agentAPI.strategy()
          directly; the backend already knows which LLM/Binance keys
          belong to this user from the JWT alone. */}
      <AnimatePresence>
        {chatOpen && <ChatOverlay onClose={() => setChatOpen(false)} symbol={symbol} />}
      </AnimatePresence>
    </motion.div>
  );
}