import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import type { NewsItem } from '../types';
import { Search, ExternalLink, RefreshCw, TrendingUp, TrendingDown, Minus, Activity, Gauge } from 'lucide-react';
import { motion } from 'framer-motion';

export const NewsPage: React.FC = () => {
  const { activeSymbol } = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ items: NewsItem[] }>(`/news/feed?symbol=${activeSymbol}&limit=30`);
      setNews(res.data.items || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load news feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [activeSymbol]);

  const sentimentAnalytics = useMemo(() => {
    if (news.length === 0) {
      return { avgScore: 0.5, label: 'Neutral', bullPct: 0, bearPct: 0, neutralPct: 0, bullCount: 0, bearCount: 0, neutralCount: 0 };
    }

    let bullCount = 0;
    let bearCount = 0;
    let neutralCount = 0;
    let totalScoreSum = 0;

    news.forEach((item) => {
      const lbl = item.sentiment_label?.toLowerCase();
      totalScoreSum += item.sentiment_score || 0.5;
      if (lbl === 'bullish') bullCount++;
      else if (lbl === 'bearish') bearCount++;
      else neutralCount++;
    });

    const total = news.length;
    const avgScore = totalScoreSum / total;
    const bullPct = Math.round((bullCount / total) * 100);
    const bearPct = Math.round((bearCount / total) * 100);
    const neutralPct = Math.round((neutralCount / total) * 100);

    let label = 'Neutral Market Mood';
    if (avgScore >= 0.6) label = 'Strong Bullish Sentiment';
    else if (avgScore <= 0.4) label = 'Strong Bearish Sentiment';

    return { avgScore, label, bullPct, bearPct, neutralPct, bullCount, bearCount, neutralCount };
  }, [news]);

  const filteredNews = useMemo(() => {
    if (!searchQuery.trim()) return news;
    const q = searchQuery.toLowerCase();
    return news.filter((n) => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.source.toLowerCase().includes(q));
  }, [news, searchQuery]);

  return (
    <div className="p-6 space-y-6">
      {/* Header & Aggregated Sentiment Section */}
      <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Market Sentiment Intelligence</h1>
              <p className="text-xs text-slate-400">
                AI aggregated sentiment analysis for <span className="text-cyan-400 font-mono font-bold">{activeSymbol}</span>
              </p>
            </div>
          </div>

          <button
            onClick={fetchNews}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Rescan News Feed</span>
          </button>
        </div>

        {/* Aggregated Score Gauge & Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-5 rounded-xl border border-white/10 flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Aggregated Sentiment Score
            </div>
            <div className="flex items-baseline gap-3 my-2">
              <span className="text-4xl font-extrabold text-white">
                {(sentimentAnalytics.avgScore * 100).toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-indigo-300">{sentimentAnalytics.label}</span>
                <span className="text-slate-400">{(sentimentAnalytics.avgScore * 100).toFixed(0)}% Index</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden flex p-0.5 border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, sentimentAnalytics.avgScore * 100))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-xl border border-white/10 flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Sentiment Distribution
            </div>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Bullish
                  </span>
                  <span className="text-white font-mono">{sentimentAnalytics.bullPct}% ({sentimentAnalytics.bullCount})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${sentimentAnalytics.bullPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-400 font-semibold flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Bearish
                  </span>
                  <span className="text-white font-mono">{sentimentAnalytics.bearPct}% ({sentimentAnalytics.bearCount})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${sentimentAnalytics.bearPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <Minus className="w-3.5 h-3.5" /> Neutral
                  </span>
                  <span className="text-white font-mono">{sentimentAnalytics.neutralPct}% ({sentimentAnalytics.neutralCount})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div className="h-full bg-slate-500 rounded-full" style={{ width: `${sentimentAnalytics.neutralPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-xl border border-white/10 flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Market AI Digest
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Analyzed {news.length} aggregated news reports for {activeSymbol}. Current sentiment tilt is{' '}
              <strong className="text-cyan-300">{sentimentAnalytics.label}</strong> with an average score of{' '}
              <span className="text-emerald-400 font-mono">{(sentimentAnalytics.avgScore * 100).toFixed(1)}%</span>.
            </p>
            <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-2 text-[11px] text-slate-400">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Real-time sentiment scoring active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search news titles, topics or sources..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">Showing {filteredNews.length} articles</span>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-sm">Fetching and scoring news feed...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      ) : filteredNews.length === 0 ? (
        <div className="py-16 text-center text-slate-400 glass-panel rounded-2xl border border-white/10">
          No articles match your search filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map((item, idx) => {
            const lbl = item.sentiment_label?.toLowerCase();
            const isBull = lbl === 'bullish';
            const isBear = lbl === 'bearish';
            const scorePct = Math.round((item.sentiment_score || 0.5) * 100);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-indigo-500/40 transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                      {item.source}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${
                        isBull
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isBear
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-slate-700/30 text-slate-300 border-slate-600/30'
                      }`}
                    >
                      {isBull && <TrendingUp className="w-3.5 h-3.5" />}
                      {isBear && <TrendingDown className="w-3.5 h-3.5" />}
                      {!isBull && !isBear && <Minus className="w-3.5 h-3.5" />}
                      <span className="capitalize">{lbl}</span>
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-white leading-snug line-clamp-2 hover:text-cyan-300">
                    {item.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                      <span>Sentiment Score</span>
                      <span className={isBull ? 'text-emerald-400' : isBear ? 'text-red-400' : 'text-slate-300'}>
                        {scorePct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isBull ? 'bg-emerald-400' : isBear ? 'bg-red-400' : 'bg-slate-400'}`}
                        style={{ width: `${scorePct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      {item.published_at ? new Date(item.published_at).toLocaleString() : 'Recently'}
                    </span>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                    >
                      <span>Read Article</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
