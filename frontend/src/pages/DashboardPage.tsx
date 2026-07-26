import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare, TrendingUp, RefreshCw, ChevronRight, Activity, Newspaper,
} from "lucide-react";
import {
  newsAPI, marketAPI, chartContextAPI,
  type NewsItem, type Timeframe, type MarketIndicators,
} from "../config/api";
import ChatOverlay from "../components/ChatOverlay";

const SYMBOL_OPTIONS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT"];
const TIMEFRAME_OPTIONS: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

const TV_INTERVAL_MAP: Record<Timeframe, string> = {
  "1m": "1", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1d": "D",
};

function sentimentColor(label: string): { color: string; bg: string } {
  if (label === "bullish") return { color: "#00e5b0", bg: "rgba(0,229,176,0.08)" };
  if (label === "bearish") return { color: "#ef4444", bg: "rgba(239,68,68,0.08)" };
  return { color: "#5a6a8a", bg: "rgba(90,106,138,0.08)" };
}

function sentimentGaugeValue(score: number): number {
  return Math.round(((score + 1) / 2) * 100);
}

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

export default function DashboardPage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [selectedNewsLink, setSelectedNewsLink] = useState<string | null>(null);

  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [indicators, setIndicators] = useState<MarketIndicators | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);
  const tvWidgetRef = useRef<any>(null);

  useEffect(() => {
    chartContextAPI.get().then((ctx) => {
      if (ctx.symbol) setSymbol(ctx.symbol);
      if (ctx.timeframe) setTimeframe(ctx.timeframe);
    }).catch(() => {});
  }, []);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const res = await newsAPI.getFeed(symbol, 8);
      setNews(res.items);
    } catch {
      setNews([]);
    } finally {
      setNewsLoading(false);
    }
  }, [symbol]);

  const loadIndicators = useCallback(async () => {
    try {
      const res = await marketAPI.getIndicators(symbol, timeframe);
      setIndicators(res);
    } catch {
      setIndicators(null);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    loadNews();
    loadIndicators();
  }, [loadNews, loadIndicators]);

  const handleSymbolChange = async (newSym: string) => {
    setSymbol(newSym);
    await chartContextAPI.set(newSym, timeframe).catch(() => {});
  };

  const handleTimeframeChange = async (newTf: Timeframe) => {
    setTimeframe(newTf);
    await chartContextAPI.set(symbol, newTf).catch(() => {});
  };

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.innerHTML = "";

    const container = document.createElement("div");
    container.className = "tradingview-widget-container__widget";
    container.style.height = "100%";
    container.style.width = "100%";
    chartRef.current.appendChild(container);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${symbol}`,
      interval: TV_INTERVAL_MAP[timeframe] || "15",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      backgroundColor: "#0d1117",
      gridColor: "rgba(255, 255, 255, 0.04)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });

    chartRef.current.appendChild(script);
    tvWidgetRef.current = script;
  }, [symbol, timeframe]);

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-background flex flex-col overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: TradingView chart */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="h-10 flex items-center justify-between px-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <select
                value={symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                className="bg-transparent text-xs font-['Rajdhani'] font-semibold tracking-wider text-foreground uppercase focus:outline-none cursor-pointer"
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

            {indicators && (
              <span className="text-xs font-mono text-foreground font-medium">
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
            <span className="text-xs font-['Rajdhani'] font-semibold tracking-wider text-foreground uppercase">Live News</span>
            <div className="flex items-center gap-2">
              <Link
                to="/news"
                className="text-[11px] font-mono text-[#00e5b0] hover:underline font-semibold transition-all flex items-center gap-1"
              >
                View All 20 ↗
              </Link>
              <button onClick={loadNews} className="text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw size={12} className={newsLoading ? "animate-spin" : ""} />
              </button>
            </div>
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
                          className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded font-medium shrink-0 uppercase"
                          style={{ color: sentiment.color, background: sentiment.bg }}
                        >
                          {item.sentiment_label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-semibold" style={{ color: sentiment.color }}>
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
          className="flex items-center gap-2.5 px-5 py-2 bg-primary text-primary-foreground rounded-lg font-['Rajdhani'] font-bold text-sm tracking-wider hover:bg-primary/90 transition-all"
        >
          <MessageSquare size={15} />
          OPEN AI CHAT
          <ChevronRight size={13} />
        </motion.button>
      </div>

      <AnimatePresence>
        {chatOpen && <ChatOverlay onClose={() => setChatOpen(false)} symbol={symbol} />}
      </AnimatePresence>
    </div>
  );
}
