import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronLeft,
  Filter,
  BarChart2,
  Clock,
  Sparkles,
  Activity,
  LayoutDashboard,
} from "lucide-react";
import { newsAPI, type NewsItem } from "../config/api";

interface NewsPageProps {
  onBackToDashboard: () => void;
  onNavigateToIndicators?: () => void;
}

const SYMBOL_OPTIONS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
];

function sentimentDetails(score: number, label: string) {
  if (label === "bullish" || score > 0.1) {
    return {
      label: "Bullish",
      color: "#00e5b0",
      bg: "rgba(0, 229, 176, 0.12)",
      borderColor: "rgba(0, 229, 176, 0.3)",
      icon: TrendingUp,
    };
  }
  if (label === "bearish" || score < -0.1) {
    return {
      label: "Bearish",
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.12)",
      borderColor: "rgba(239, 68, 68, 0.3)",
      icon: TrendingDown,
    };
  }
  return {
    label: "Neutral",
    color: "#60a5fa",
    bg: "rgba(96, 165, 250, 0.12)",
    borderColor: "rgba(96, 165, 250, 0.3)",
    icon: Minus,
  };
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Recently";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NewsPage({ onBackToDashboard, onNavigateToIndicators }: NewsPageProps) {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "bullish" | "neutral" | "bearish">("all");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      // Request top 20 items from backend
      const res = await newsAPI.getFeed(symbol, 20);
      setNews(res.items || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to fetch news feed", err);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Overall sentiment calculation calculated on the frontend:
  // Taking average of sentiment_score across all news items returned
  const overallSentiment = useMemo(() => {
    if (news.length === 0) {
      return {
        avgScore: 0,
        label: "Neutral",
        color: "#60a5fa",
        gaugePercent: 50,
        bullishCount: 0,
        neutralCount: 0,
        bearishCount: 0,
      };
    }

    const totalScore = news.reduce((acc, item) => acc + item.sentiment_score, 0);
    const avgScore = totalScore / news.length;

    let bullishCount = 0;
    let neutralCount = 0;
    let bearishCount = 0;

    news.forEach((item) => {
      const details = sentimentDetails(item.sentiment_score, item.sentiment_label);
      if (details.label === "Bullish") bullishCount++;
      else if (details.label === "Bearish") bearishCount++;
      else neutralCount++;
    });

    let label = "Neutral";
    let color = "#60a5fa";
    if (avgScore > 0.25) {
      label = "Strongly Bullish";
      color = "#00e5b0";
    } else if (avgScore > 0.05) {
      label = "Slightly Bullish";
      color = "#10b981";
    } else if (avgScore < -0.25) {
      label = "Strongly Bearish";
      color = "#ef4444";
    } else if (avgScore < -0.05) {
      label = "Slightly Bearish";
      color = "#f87171";
    }

    const gaugePercent = Math.min(Math.max(Math.round(((avgScore + 1) / 2) * 100), 0), 100);

    return {
      avgScore,
      label,
      color,
      gaugePercent,
      bullishCount,
      neutralCount,
      bearishCount,
    };
  }, [news]);

  // Filtering news based on search query and active tab
  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      const details = sentimentDetails(item.sentiment_score, item.sentiment_label);
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "bullish" && details.label === "Bullish") ||
        (activeTab === "neutral" && details.label === "Neutral") ||
        (activeTab === "bearish" && details.label === "Bearish");

      const matchesSearch =
        searchQuery.trim() === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [news, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-[#0d111c]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />

          {/* Navigation Pill Buttons */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-slate-400 hover:text-white rounded-md transition-all"
            >
              <LayoutDashboard size={13} />
              <span>Dashboard</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono bg-emerald-500/20 text-[#00e5b0] border border-emerald-500/30 rounded-md font-semibold shadow-sm">
              <Newspaper size={13} />
              <span>News & Sentiment</span>
            </button>
            {onNavigateToIndicators && (
              <button
                onClick={onNavigateToIndicators}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-slate-400 hover:text-white rounded-md transition-all"
              >
                <Activity size={13} />
                <span>Indicators</span>
              </button>
            )}
          </div>
        </div>

        {/* Symbol Selector & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-1.5">
            <span className="text-xs text-slate-400 uppercase font-semibold">Asset:</span>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer"
            >
              {SYMBOL_OPTIONS.map((sym) => (
                <option key={sym} value={sym} className="bg-[#0f1422] text-white">
                  {sym}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchNews}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh news feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Overall Sentiment Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Overall Sentiment Score */}
          <div className="lg:col-span-2 bg-gradient-to-br from-[#111625] to-[#0c101a] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-semibold text-white">Market Sentiment Summary</h2>
              </div>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Updated {formatRelativeTime(lastRefreshed.toISOString())}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              {/* Left Column: Gauge & Average Score */}
              <div className="flex flex-col items-center sm:items-start space-y-2">
                <span className="text-xs text-slate-400 uppercase font-medium tracking-wider">
                  Calculated Overall Sentiment
                </span>
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-4xl font-extrabold tracking-tight"
                    style={{ color: overallSentiment.color }}
                  >
                    {overallSentiment.avgScore > 0 ? "+" : ""}
                    {overallSentiment.avgScore.toFixed(3)}
                  </span>
                  <span
                    className="text-sm font-semibold px-2.5 py-1 rounded-full border"
                    style={{
                      color: overallSentiment.color,
                      borderColor: overallSentiment.color + "40",
                      backgroundColor: overallSentiment.color + "15",
                    }}
                  >
                    {overallSentiment.label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Average score computed on frontend from {news.length} backend news items for{" "}
                  <span className="text-white font-medium">{symbol}</span>.
                </p>
              </div>

              {/* Right Column: Visual Progress Bar */}
              <div className="space-y-3 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-red-400 font-semibold flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Bearish (-1.0)
                  </span>
                  <span className="text-slate-400 font-medium">Gauge: {overallSentiment.gaugePercent}%</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Bullish (+1.0)
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/50">
                  {/* Center Line Marker (0.0) */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-slate-600 z-10 opacity-75" />
                  <motion.div
                    className="h-full rounded-full transition-all duration-500 shadow-lg"
                    style={{
                      width: `${overallSentiment.gaugePercent}%`,
                      backgroundColor: overallSentiment.color,
                    }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${overallSentiment.gaugePercent}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>-1.0</span>
                  <span>-0.5</span>
                  <span>0.0</span>
                  <span>+0.5</span>
                  <span>+1.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Breakdown Stats */}
          <div className="bg-gradient-to-br from-[#111625] to-[#0c101a] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Sentiment Distribution</h2>
            </div>

            <div className="space-y-3">
              {/* Bullish item count */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-[#00e5b0]">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">Bullish Headlines</span>
                </div>
                <span className="text-base font-bold text-[#00e5b0]">
                  {overallSentiment.bullishCount} <span className="text-xs font-normal text-slate-400">({Math.round((overallSentiment.bullishCount / (news.length || 1)) * 100)}%)</span>
                </span>
              </div>

              {/* Neutral item count */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                    <Minus className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">Neutral Headlines</span>
                </div>
                <span className="text-base font-bold text-blue-400">
                  {overallSentiment.neutralCount} <span className="text-xs font-normal text-slate-400">({Math.round((overallSentiment.neutralCount / (news.length || 1)) * 100)}%)</span>
                </span>
              </div>

              {/* Bearish item count */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">Bearish Headlines</span>
                </div>
                <span className="text-base font-bold text-red-400">
                  {overallSentiment.bearishCount} <span className="text-xs font-normal text-slate-400">({Math.round((overallSentiment.bearishCount / (news.length || 1)) * 100)}%)</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#111625] border border-slate-800 rounded-xl p-3 shadow-md">
          {/* Sentiment Category Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "all"
                  ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All News ({news.length})
            </button>
            <button
              onClick={() => setActiveTab("bullish")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "bullish"
                  ? "bg-emerald-500/20 text-[#00e5b0] border border-emerald-500/30"
                  : "text-slate-400 hover:text-emerald-400"
              }`}
            >
              Bullish ({overallSentiment.bullishCount})
            </button>
            <button
              onClick={() => setActiveTab("neutral")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "neutral"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-blue-400"
              }`}
            >
              Neutral ({overallSentiment.neutralCount})
            </button>
            <button
              onClick={() => setActiveTab("bearish")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "bearish"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "text-slate-400 hover:text-red-400"
              }`}
            >
              Bearish ({overallSentiment.bearishCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search headlines or sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-all"
            />
          </div>
        </div>

        {/* News Items List (20 News Cards) */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm text-slate-400">Fetching 20 news items from crypto RSS feeds...</p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-[#0f1422]">
            <Filter className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No matching news articles found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search query or switching tabs.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredNews.map((item, index) => {
                const details = sentimentDetails(item.sentiment_score, item.sentiment_label);
                const IconComponent = details.icon;

                return (
                  <motion.div
                    key={item.link || index}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="bg-[#111625] hover:bg-[#151c2e] border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 shadow-lg flex flex-col justify-between group transition-all duration-200"
                  >
                    <div>
                      {/* Top Card Meta: Source, Index, Timestamp & Sentiment Pill */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                            #{index + 1}
                          </span>
                          <span className="text-xs font-semibold text-emerald-400/90 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                            {item.source}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatRelativeTime(item.published_at)}
                          </span>
                        </div>

                        {/* Sentiment Score Pill */}
                        <div
                          className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border shadow-sm"
                          style={{
                            color: details.color,
                            backgroundColor: details.bg,
                            borderColor: details.borderColor,
                          }}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                          <span>{item.sentiment_score > 0 ? "+" : ""}{item.sentiment_score.toFixed(2)}</span>
                          <span className="text-[10px] opacity-80 uppercase tracking-wider hidden sm:inline">
                            ({details.label})
                          </span>
                        </div>
                      </div>

                      {/* Headline Title */}
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug mb-2 line-clamp-2">
                        {item.title}
                      </h3>

                      {/* Headline Summary */}
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                        {item.summary || "No summary provided by news feed source."}
                      </p>
                    </div>

                    {/* Bottom Link Button */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">
                        Score: {item.sentiment_score}
                      </span>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline transition-all"
                      >
                        <span>Read full story</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
