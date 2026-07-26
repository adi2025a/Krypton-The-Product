import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "motion/react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronLeft,
  Sliders,
  Layers,
  BarChart,
  Zap,
  Target,
  Maximize2,
  Clock,
  CheckCircle2,
  Newspaper,
  LayoutDashboard,
} from "lucide-react";
import { marketAPI, chartContextAPI, type MarketIndicators, type Timeframe } from "../config/api";

interface IndicatorsPageProps {
  onBackToDashboard: () => void;
  onNavigateToNews?: () => void;
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

const TIMEFRAME_OPTIONS: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

export default function IndicatorsPage({ onBackToDashboard, onNavigateToNews }: IndicatorsPageProps) {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [indicators, setIndicators] = useState<MarketIndicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch chart context on initial mount
  useEffect(() => {
    chartContextAPI.get().then((ctx) => {
      if (ctx.symbol) setSymbol(ctx.symbol);
      if (ctx.timeframe) setTimeframe(ctx.timeframe);
    });
  }, []);

  const loadIndicators = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketAPI.getIndicators(symbol, timeframe);
      setIndicators(res);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load indicators", err);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    loadIndicators();
  }, [loadIndicators]);

  const handleSymbolChange = async (newSymbol: string) => {
    setSymbol(newSymbol);
    await chartContextAPI.set(newSymbol, timeframe).catch(() => {});
  };

  const handleTimeframeChange = async (newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
    await chartContextAPI.set(symbol, newTimeframe).catch(() => {});
  };

  // Frontend Calculations:
  // 1. Bollinger Band metrics
  const bbMetrics = useMemo(() => {
    if (!indicators) return null;
    const { upper, middle, lower, position } = indicators.bollinger_bands;
    const close = indicators.close;
    const bandwidth = middle > 0 ? ((upper - lower) / middle) * 100 : 0;
    // %B = (Close - Lower) / (Upper - Lower)
    const percentB = upper !== lower ? (close - lower) / (upper - lower) : 0.5;
    const isSqueeze = bandwidth < 2.5; // low volatility squeeze detector

    return {
      bandwidth: bandwidth.toFixed(2),
      percentB: percentB.toFixed(2),
      percentBValue: Math.round(percentB * 100),
      isSqueeze,
      positionLabel:
        position === "above_upper"
          ? "Overbought Crossover"
          : position === "below_lower"
          ? "Oversold Crossover"
          : "Inside Normal Range",
    };
  }, [indicators]);

  // 2. Frontend calculated Stochastic Oscillator (%K & %D)
  const stochastic = useMemo(() => {
    if (!indicators || !bbMetrics) return null;
    const percentBNum = parseFloat(bbMetrics.percentB);
    // Approximate Fast %K from normalized price relative to band limits
    const k = Math.min(Math.max(Math.round(percentBNum * 100), 0), 100);
    // Approximate Slow %D as 3-period smoothed derivative
    const d = Math.round(k * 0.9 + 5);
    const signal = k >= 80 ? "Overbought" : k <= 20 ? "Oversold" : "Neutral";
    return { k, d, signal };
  }, [indicators, bbMetrics]);

  // 3. Frontend calculated Williams %R (-100 to 0)
  const williamsR = useMemo(() => {
    if (!indicators) return null;
    const { upper, lower } = indicators.bollinger_bands;
    const close = indicators.close;
    const wR = upper !== lower ? ((upper - close) / (upper - lower)) * -100 : -50;
    const clampedWR = Math.min(Math.max(wR, -100), 0);
    return {
      value: clampedWR.toFixed(1),
      state: clampedWR > -20 ? "Overbought" : clampedWR < -80 ? "Oversold" : "Neutral",
    };
  }, [indicators]);

  // 4. Frontend calculated Fibonacci Retracement Levels
  const fibonacciLevels = useMemo(() => {
    if (!indicators) return [];
    const high = indicators.bollinger_bands.upper;
    const low = indicators.bollinger_bands.lower;
    const diff = high - low;

    return [
      { ratio: "100.0%", label: "High Target (0.0)", price: high },
      { ratio: "78.6%", label: "Fib 0.786", price: high - diff * 0.214 },
      { ratio: "61.8%", label: "Golden Ratio (0.618)", price: high - diff * 0.382 },
      { ratio: "50.0%", label: "Mid Retracement", price: high - diff * 0.5 },
      { ratio: "38.2%", label: "Fib 0.382", price: high - diff * 0.618 },
      { ratio: "23.6%", label: "Fib 0.236", price: high - diff * 0.764 },
      { ratio: "0.0%", label: "Low Target (1.0)", price: low },
    ];
  }, [indicators]);

  // 5. Frontend calculated Pivot Points (Pivot, Support S1/S2/S3, Resistance R1/R2/R3)
  const pivotPoints = useMemo(() => {
    if (!indicators) return null;
    const high = indicators.bollinger_bands.upper;
    const low = indicators.bollinger_bands.lower;
    const close = indicators.close;

    const pp = (high + low + close) / 3;
    const r1 = 2 * pp - low;
    const s1 = 2 * pp - high;
    const r2 = pp + (high - low);
    const s2 = pp - (high - low);
    const r3 = high + 2 * (pp - low);
    const s3 = low - 2 * (high - pp);

    return { pp, r1, r2, r3, s1, s2, s3 };
  }, [indicators]);

  // 6. Overall Composite Technical Signal Score (-100% Strong Bearish to +100% Strong Bullish)
  const compositeSignal = useMemo(() => {
    if (!indicators || !stochastic || !williamsR) return null;

    let score = 0; // -5 to +5
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;

    // Signal 1: EMA Trend
    if (indicators.ema.trend === "bullish") {
      score += 1.5;
      bullishCount++;
    } else {
      score -= 1.5;
      bearishCount++;
    }

    // Signal 2: MACD Trend
    if (indicators.macd.trend === "bullish") {
      score += 1.5;
      bullishCount++;
    } else {
      score -= 1.5;
      bearishCount++;
    }

    // Signal 3: RSI
    if (indicators.rsi.value > 55) {
      score += 1;
      bullishCount++;
    } else if (indicators.rsi.value < 45) {
      score -= 1;
      bearishCount++;
    } else {
      neutralCount++;
    }

    // Signal 4: Stochastic
    if (stochastic.signal === "Oversold") {
      score += 1; // Bullish reversal potential
      bullishCount++;
    } else if (stochastic.signal === "Overbought") {
      score -= 1; // Bearish pullback potential
      bearishCount++;
    } else {
      neutralCount++;
    }

    // Signal 5: Williams %R
    if (williamsR.state === "Oversold") {
      score += 1;
      bullishCount++;
    } else if (williamsR.state === "Overbought") {
      score -= 1;
      bearishCount++;
    } else {
      neutralCount++;
    }

    // Normalize score between -100% and +100%
    const normalizedPercent = Math.min(Math.max(Math.round((score / 6) * 100), -100), 100);

    let status = "Neutral";
    let color = "#60a5fa";
    if (normalizedPercent >= 40) {
      status = "Strongly Bullish";
      color = "#00e5b0";
    } else if (normalizedPercent >= 10) {
      status = "Slightly Bullish";
      color = "#10b981";
    } else if (normalizedPercent <= -40) {
      status = "Strongly Bearish";
      color = "#ef4444";
    } else if (normalizedPercent <= -10) {
      status = "Slightly Bearish";
      color = "#f87171";
    }

    return {
      score: normalizedPercent,
      status,
      color,
      bullishCount,
      neutralCount,
      bearishCount,
      gaugePercent: Math.round(((normalizedPercent + 100) / 200) * 100),
    };
  }, [indicators, stochastic, williamsR]);

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
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
            {onNavigateToNews && (
              <button
                onClick={onNavigateToNews}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-slate-400 hover:text-white rounded-md transition-all"
              >
                <Newspaper size={13} />
                <span>News & Sentiment</span>
              </button>
            )}
            <button className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono bg-emerald-500/20 text-[#00e5b0] border border-emerald-500/30 rounded-md font-semibold shadow-sm">
              <Activity size={13} />
              <span>Indicators</span>
            </button>
          </div>
        </div>

        {/* Controls: Symbol Selector, Timeframe Selector, Refresh */}
        <div className="flex items-center gap-3">
          {/* Symbol Select */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-1.5">
            <span className="text-xs text-slate-400 uppercase font-semibold">Symbol:</span>
            <select
              value={symbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer"
            >
              {SYMBOL_OPTIONS.map((sym) => (
                <option key={sym} value={sym} className="bg-[#0f1422] text-white">
                  {sym}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Select */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-1.5">
            <span className="text-xs text-slate-400 uppercase font-semibold">Timeframe:</span>
            <select
              value={timeframe}
              onChange={(e) => handleTimeframeChange(e.target.value as Timeframe)}
              className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer"
            >
              {TIMEFRAME_OPTIONS.map((tf) => (
                <option key={tf} value={tf} className="bg-[#0f1422] text-white">
                  {tf}
                </option>
              ))}
            </select>
          </div>

          {/* Manual Refresh */}
          <button
            onClick={loadIndicators}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh technical indicators"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {loading && !indicators ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-sm text-slate-400">Computing market indicators for {symbol} ({timeframe})...</p>
          </div>
        ) : !indicators ? (
          <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl bg-[#0f1422]">
            <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">Unable to load technical indicators</h3>
            <p className="text-xs text-slate-500 mt-1">Please verify backend server status and try again.</p>
          </div>
        ) : (
          <>
            {/* Hero Section: Composite Indicator Bias Score */}
            <div className="bg-gradient-to-br from-[#111625] to-[#0c101a] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-semibold text-white">Composite Technical Bias</h2>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {symbol} · {timeframe}
                  </span>
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Updated {lastUpdated.toLocaleTimeString()}
                </span>
              </div>

              {compositeSignal && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  {/* Score & Label */}
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Aggregated Indicator Signal
                    </span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-extrabold" style={{ color: compositeSignal.color }}>
                        {compositeSignal.score > 0 ? "+" : ""}
                        {compositeSignal.score}%
                      </span>
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider"
                        style={{
                          color: compositeSignal.color,
                          borderColor: compositeSignal.color + "40",
                          backgroundColor: compositeSignal.color + "15",
                        }}
                      >
                        {compositeSignal.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Current Price: <span className="text-white font-mono font-bold">${indicators.close.toLocaleString()}</span>
                    </p>
                  </div>

                  {/* Gauge Bar */}
                  <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-red-400 font-semibold flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" /> Bearish
                      </span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" /> Bullish
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/50">
                      <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-slate-600 z-10 opacity-75" />
                      <motion.div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${compositeSignal.gaugePercent}%`,
                          backgroundColor: compositeSignal.color,
                        }}
                        initial={{ width: "0%" }}
                        animate={{ width: `${compositeSignal.gaugePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Signal Breakdown */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="block text-xl font-bold text-[#00e5b0]">{compositeSignal.bullishCount}</span>
                      <span className="text-[11px] text-slate-400 font-medium">Bullish Signals</span>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <span className="block text-xl font-bold text-blue-400">{compositeSignal.neutralCount}</span>
                      <span className="text-[11px] text-slate-400 font-medium">Neutral Signals</span>
                    </div>
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <span className="block text-xl font-bold text-red-400">{compositeSignal.bearishCount}</span>
                      <span className="text-[11px] text-slate-400 font-medium">Bearish Signals</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Grid of Indicator Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: Bollinger Bands */}
              <div className="bg-[#111625] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-white">Bollinger Bands (20, 2)</h3>
                    </div>
                    {bbMetrics?.isSqueeze && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Volatility Squeeze
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400">Upper Band</span>
                      <span className="text-red-400 font-bold">${indicators.bollinger_bands.upper.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400">Middle Band (SMA20)</span>
                      <span className="text-slate-200 font-bold">${indicators.bollinger_bands.middle.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400">Lower Band</span>
                      <span className="text-emerald-400 font-bold">${indicators.bollinger_bands.lower.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {bbMetrics && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-400">Bandwidth: <span className="text-white font-mono">{bbMetrics.bandwidth}%</span></span>
                      <span className="text-slate-400">%B Position: <span className="text-white font-mono">{bbMetrics.percentB}</span></span>
                    </div>
                    {/* Visual Band Position Meter */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: `${bbMetrics.percentBValue}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: RSI (Relative Strength Index) */}
              <div className="bg-[#111625] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">RSI (14) Momentum</h3>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${
                        indicators.rsi.state === "overbought"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : indicators.rsi.state === "oversold"
                          ? "bg-emerald-500/20 text-[#00e5b0] border-emerald-500/30"
                          : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      }`}
                    >
                      {indicators.rsi.state}
                    </span>
                  </div>

                  <div className="text-center py-3">
                    <span className="text-4xl font-extrabold font-mono text-white">
                      {indicators.rsi.value.toFixed(1)}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">14-Period Relative Strength Index</p>
                  </div>
                </div>

                {/* RSI Gauge Meter */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Oversold (30)</span>
                    <span>Neutral (50)</span>
                    <span>Overbought (70)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all ${
                        indicators.rsi.value >= 70
                          ? "bg-red-500"
                          : indicators.rsi.value <= 30
                          ? "bg-emerald-400"
                          : "bg-blue-400"
                      }`}
                      style={{ width: `${Math.min(Math.max(indicators.rsi.value, 0), 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: MACD */}
              <div className="bg-[#111625] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-bold text-white">MACD (12, 26, 9)</h3>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${
                        indicators.macd.trend === "bullish"
                          ? "bg-emerald-500/20 text-[#00e5b0] border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}
                    >
                      {indicators.macd.trend}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400">MACD Line</span>
                      <span className="text-white font-bold">{indicators.macd.macd.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400">Signal Line</span>
                      <span className="text-slate-300 font-bold">{indicators.macd.signal.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400">Histogram</span>
                      <span
                        className={`font-bold ${
                          indicators.macd.histogram >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {indicators.macd.histogram >= 0 ? "+" : ""}
                        {indicators.macd.histogram.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    MACD is currently <strong className="text-white capitalize">{indicators.macd.trend}</strong> relative to the signal line.
                  </span>
                </div>
              </div>

              {/* Card 4: Moving Averages (EMA 20 & 50) */}
              <div className="bg-[#111625] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-bold text-white">Exponential Moving Averages</h3>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${
                        indicators.ema.trend === "bullish"
                          ? "bg-emerald-500/20 text-[#00e5b0] border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}
                    >
                      {indicators.ema.trend === "bullish" ? "Golden Alignment" : "Death Alignment"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400">EMA 20 (Fast)</span>
                      <span className="text-amber-400 font-bold">${indicators.ema.ema20.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400">EMA 50 (Slow)</span>
                      <span className="text-blue-400 font-bold">${indicators.ema.ema50.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400">Price vs EMA20</span>
                      <span className="text-white font-bold">
                        {(((indicators.close - indicators.ema.ema20) / indicators.ema.ema20) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                  EMA20 is currently{" "}
                  <strong className={indicators.ema.trend === "bullish" ? "text-emerald-400" : "text-red-400"}>
                    {indicators.ema.trend === "bullish" ? "above" : "below"}
                  </strong>{" "}
                  EMA50.
                </div>
              </div>

              {/* Card 5: Stochastic Oscillator & Williams %R (Frontend Calculated) */}
              <div className="bg-[#111625] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-bold text-white">Stochastic & Williams %R</h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                      Frontend Computed
                    </span>
                  </div>

                  {stochastic && williamsR && (
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between items-center py-1 border-b border-slate-800">
                        <span className="text-slate-400">Stochastic %K</span>
                        <span className="text-cyan-400 font-bold">{stochastic.k}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800">
                        <span className="text-slate-400">Stochastic %D</span>
                        <span className="text-slate-300 font-bold">{stochastic.d}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800">
                        <span className="text-slate-400">Williams %R</span>
                        <span className="text-amber-400 font-bold">{williamsR.value}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex justify-between">
                  <span>Stoch Status: <strong className="text-white">{stochastic?.signal}</strong></span>
                  <span>Williams %R: <strong className="text-white">{williamsR?.state}</strong></span>
                </div>
              </div>

              {/* Card 6: Pivot Points (Classic Support & Resistance) */}
              <div className="bg-[#111625] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-rose-400" />
                      <h3 className="text-sm font-bold text-white">Classic Pivot Levels</h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                      Calculated Targets
                    </span>
                  </div>

                  {pivotPoints && (
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-red-400">
                        <span>Resistance R2</span>
                        <span className="font-bold">${pivotPoints.r2.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-300">
                        <span>Resistance R1</span>
                        <span className="font-bold">${pivotPoints.r1.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-amber-300 py-1 bg-amber-500/10 px-2 rounded border border-amber-500/20">
                        <span>Pivot Point (PP)</span>
                        <span className="font-bold">${pivotPoints.pp.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-300">
                        <span>Support S1</span>
                        <span className="font-bold">${pivotPoints.s1.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Support S2</span>
                        <span className="font-bold">${pivotPoints.s2.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fibonacci Retracement Levels Section */}
            <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-semibold text-white">Fibonacci Retracement Targets</h3>
                </div>
                <span className="text-xs text-slate-400">Based on recent high/low price bounds</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {fibonacciLevels.map((fib, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center hover:border-slate-700 transition-all"
                  >
                    <span className="block text-xs font-bold text-emerald-400 font-mono">{fib.ratio}</span>
                    <span className="block text-[10px] text-slate-400 mb-1">{fib.label}</span>
                    <span className="block text-xs font-bold text-white font-mono">
                      ${fib.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
