import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import type { NewsItem } from '../types';
import { Newspaper, ExternalLink, RefreshCw, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const DashboardPage: React.FC = () => {
  const { activeSymbol } = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState<boolean>(true);
  const [newsError, setNewsError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNews = async () => {
    setLoadingNews(true);
    setNewsError(null);
    try {
      const res = await apiClient.get<{ items: NewsItem[] }>(`/news/feed?symbol=${activeSymbol}&limit=12`);
      setNews(res.data.items || []);
    } catch (err: any) {
      setNewsError(err.response?.data?.detail || 'Failed to fetch news feed');
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [activeSymbol]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).TradingView && containerRef.current) {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: `BINANCE:${activeSymbol}`,
          interval: '15',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#090d16',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerRef.current.id,
          backgroundColor: '#090d16',
          gridColor: 'rgba(255, 255, 255, 0.05)',
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [activeSymbol]);

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-indigo-500/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Market Dashboard <span className="text-cyan-400 font-mono text-sm">[{activeSymbol}]</span>
            </h1>
            <p className="text-xs text-slate-400">
              Live TradingView chart analysis side-by-side with real-time news intelligence
            </p>
          </div>
        </div>

        <button
          onClick={fetchNews}
          disabled={loadingNews}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingNews ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Main Split Layout: Left Chart, Right News */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: TradingView Chart (8 cols) */}
        <div className="lg:col-span-8 glass-panel p-4 rounded-2xl border border-white/10 shadow-2xl h-[650px] flex flex-col">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Advanced TradingView Interactive Chart
            </div>
            <span className="text-[11px] text-slate-500 font-mono">BINANCE:{activeSymbol}</span>
          </div>

          <div className="flex-1 w-full relative rounded-xl overflow-hidden bg-[#090d16] border border-white/5">
            <div id={`tradingview_chart_${activeSymbol}`} ref={containerRef} className="w-full h-full min-h-[550px]" />
          </div>
        </div>

        {/* Right Side: News API Feed (4 cols) */}
        <div className="lg:col-span-4 glass-panel p-5 rounded-2xl border border-white/10 shadow-2xl h-[650px] flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Newspaper className="w-4 h-4 text-cyan-400" />
              <span>Live News Feed</span>
            </div>
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              {news.length} Items
            </span>
          </div>

          {/* News List Scroll Container */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {loadingNews ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Fetching latest market news...</span>
              </div>
            ) : newsError ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                {newsError}
              </div>
            ) : news.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">No recent news available for this symbol.</div>
            ) : (
              news.map((item, idx) => {
                const label = item.sentiment_label?.toLowerCase();
                const isBull = label === 'bullish';
                const isBear = label === 'bearish';

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="p-3.5 rounded-xl glass-card border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                          {item.source}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                            isBull
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isBear
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-slate-700/30 text-slate-300 border-slate-600/30'
                          }`}
                        >
                          {isBull && <TrendingUp className="w-3 h-3" />}
                          {isBear && <TrendingDown className="w-3 h-3" />}
                          {!isBull && !isBear && <Minus className="w-3 h-3" />}
                          <span className="capitalize">{label}</span>
                          <span>({(item.sentiment_score * 100).toFixed(0)}%)</span>
                        </span>
                      </div>

                      <h3 className="text-xs font-semibold text-white leading-snug line-clamp-2 hover:text-cyan-300">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-500">
                      <span>{item.published_at ? new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}</span>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                      >
                        <span>Read</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
