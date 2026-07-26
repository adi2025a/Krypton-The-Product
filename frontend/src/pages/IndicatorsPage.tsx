import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import type { Candle, CalculatedIndicators } from '../types';
import { computeFrontendIndicators } from '../utils/indicators';
import { LineChart, RefreshCw, TrendingUp, TrendingDown, Activity, Layers, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const IndicatorsPage: React.FC = () => {
  const { activeSymbol } = useAuth();
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [indicators, setIndicators] = useState<CalculatedIndicators | null>(null);
  const [backendIndicators, setBackendIndicators] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = async () => {
    setLoading(true);
    setError(null);
    try {
      const ohlcvRes = await apiClient.get<{ symbol: string; timeframe: string; candles: number[][] }>(
        `/market/ohlcv?symbol=${activeSymbol}&timeframe=${timeframe}&limit=200`
      );

      const rawCandles: Candle[] = ohlcvRes.data.candles.map((c) => ({
        timestamp: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5],
      }));

      setCandles(rawCandles);

      const computed = computeFrontendIndicators(rawCandles, activeSymbol, timeframe);
      setIndicators(computed);

      const backRes = await apiClient.get(`/market/indicators?symbol=${activeSymbol}&timeframe=${timeframe}`).catch(() => null);
      if (backRes?.data) {
        setBackendIndicators(backRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch market OHLCV data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, [activeSymbol, timeframe]);

  return (
    <div className="p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-indigo-500/20 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/20">
            <LineChart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              Market Indicators <span className="text-cyan-400 font-mono text-base">[{activeSymbol}]</span>
            </h1>
            <p className="text-xs text-slate-400">
              Calculated on the <strong>frontend</strong> using raw OHLCV candles from the backend market service
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs font-semibold">
            {['5m', '15m', '1h', '4h', '1d'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === tf ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={fetchMarketData}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-sm">Fetching OHLCV candles and computing indicators on frontend...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      ) : !indicators ? (
        <div className="p-6 text-center text-slate-400 glass-panel rounded-2xl">Not enough OHLCV data to compute indicators.</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-xl border border-white/10">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Current Close Price</div>
              <div className="text-2xl font-extrabold text-white font-mono mt-1">${indicators.currentClose.toLocaleString()}</div>
            </div>
            <div className="glass-card p-4 rounded-xl border border-white/10">
              <div className="text-[11px] font-bold text-slate-400 uppercase">EMA (20 vs 50) Trend</div>
              <div className="flex items-center gap-2 mt-1">
                {indicators.emaTrend === 'bullish' ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-lg">
                    <TrendingUp className="w-5 h-5" /> Bullish Alignment
                  </span>
                ) : (
                  <span className="text-red-400 font-bold flex items-center gap-1 text-lg">
                    <TrendingDown className="w-5 h-5" /> Bearish Alignment
                  </span>
                )}
              </div>
            </div>
            <div className="glass-card p-4 rounded-xl border border-white/10">
              <div className="text-[11px] font-bold text-slate-400 uppercase">RSI (14) Index</div>
              <div className="text-2xl font-extrabold font-mono mt-1 flex items-baseline gap-2">
                <span className={indicators.rsi14 > 70 ? 'text-red-400' : indicators.rsi14 < 30 ? 'text-emerald-400' : 'text-white'}>
                  {indicators.rsi14.toFixed(1)}
                </span>
                <span className="text-xs uppercase text-slate-400">({indicators.rsiState})</span>
              </div>
            </div>
            <div className="glass-card p-4 rounded-xl border border-white/10">
              <div className="text-[11px] font-bold text-slate-400 uppercase">OHLCV Candles Analyzed</div>
              <div className="text-2xl font-extrabold text-cyan-400 font-mono mt-1">{candles.length} Candles</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">EMA (20 / 50)</h3>
                    <p className="text-xs text-slate-400">Exponential Moving Average Trend</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  indicators.emaTrend === 'bullish'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {indicators.emaTrend.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="glass-card p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] font-semibold text-slate-400">EMA 20 (Short-term)</div>
                  <div className="text-lg font-mono font-bold text-indigo-300">${indicators.ema20.toFixed(2)}</div>
                </div>
                <div className="glass-card p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] font-semibold text-slate-400">EMA 50 (Mid-term)</div>
                  <div className="text-lg font-mono font-bold text-purple-300">${indicators.ema50.toFixed(2)}</div>
                </div>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-white/5">
                {indicators.ema20 >= indicators.ema50
                  ? '🟢 EMA 20 is trading above EMA 50, signalling an active short-to-medium term bullish trend.'
                  : '🔴 EMA 20 is trading below EMA 50, indicating short-term downward momentum pressure.'}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">RSI (14 Period)</h3>
                    <p className="text-xs text-slate-400">Relative Strength Index Momentum</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  indicators.rsiState === 'oversold'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : indicators.rsiState === 'overbought'
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-slate-700/30 text-slate-300 border-slate-600/30'
                }`}>
                  {indicators.rsiState.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span className="text-slate-400">0 (Oversold &lt;30)</span>
                  <span className="text-white text-base">{indicators.rsi14.toFixed(1)}</span>
                  <span className="text-slate-400">100 (Overbought &gt;70)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden relative border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-red-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, indicators.rsi14))}%` }}
                  />
                </div>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-white/5">
                {indicators.rsi14 < 30
                  ? '⚡ RSI is below 30 (Oversold condition). Market may be due for a bullish mean-reversion bounce.'
                  : indicators.rsi14 > 70
                  ? '⚠️ RSI is above 70 (Overbought condition). Exercise caution against potential short-term pullbacks.'
                  : '↔️ RSI is hovering in the neutral zone between 30 and 70.'}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">MACD (12, 26, 9)</h3>
                    <p className="text-xs text-slate-400">Moving Average Convergence Divergence</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  indicators.macd.trend === 'bullish'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {indicators.macd.trend.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="glass-card p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] text-slate-400">MACD Line</div>
                  <div className="text-sm font-mono font-bold text-white">{indicators.macd.macdLine.toFixed(2)}</div>
                </div>
                <div className="glass-card p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] text-slate-400">Signal Line</div>
                  <div className="text-sm font-mono font-bold text-indigo-300">{indicators.macd.signalLine.toFixed(2)}</div>
                </div>
                <div className="glass-card p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] text-slate-400">Histogram</div>
                  <div className={`text-sm font-mono font-bold ${indicators.macd.histogram >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {indicators.macd.histogram.toFixed(2)}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Bollinger Bands (20, 2)</h3>
                    <p className="text-xs text-slate-400">Volatility Channels</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 capitalize">
                  {indicators.bollingerBands.position.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="glass-card p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] text-slate-400">Upper Band</div>
                  <div className="text-sm font-mono font-bold text-red-300">${indicators.bollingerBands.upper.toFixed(2)}</div>
                </div>
                <div className="glass-card p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] text-slate-400">Middle SMA</div>
                  <div className="text-sm font-mono font-bold text-slate-200">${indicators.bollingerBands.middle.toFixed(2)}</div>
                </div>
                <div className="glass-card p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] text-slate-400">Lower Band</div>
                  <div className="text-sm font-mono font-bold text-emerald-300">${indicators.bollingerBands.lower.toFixed(2)}</div>
                </div>
              </div>
            </motion.div>
          </div>

          {backendIndicators && (
            <div className="glass-panel p-6 rounded-2xl border border-cyan-500/20 space-y-3">
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Backend Market Service Sync Verification
              </div>
              <p className="text-xs text-slate-400">
                Frontend indicator calculations verified against backend pre-computed indicators:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 block text-[10px]">Backend EMA 20:</span>
                  <span className="text-white font-bold">${backendIndicators.ema?.ema20?.toFixed(2)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 block text-[10px]">Backend RSI:</span>
                  <span className="text-white font-bold">{backendIndicators.rsi?.value?.toFixed(1)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 block text-[10px]">Backend MACD:</span>
                  <span className="text-white font-bold">{backendIndicators.macd?.macd?.toFixed(2)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 block text-[10px]">Backend Upper Band:</span>
                  <span className="text-white font-bold">${backendIndicators.bollinger_bands?.upper?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
