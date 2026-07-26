import type { Candle, CalculatedIndicators } from '../types';

export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [];
  
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let prevEMA = sum / period;
  ema.push(prevEMA);

  for (let i = period; i < prices.length; i++) {
    const currentEMA = prices[i] * k + prevEMA * (1 - k);
    ema.push(currentEMA);
    prevEMA = currentEMA;
  }
  return ema;
}

export function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length <= period) return [];
  const rsi: number[] = [];
  
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + firstRS));

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

export function calculateMACD(prices: number[], fast: number = 12, slow: number = 26, signalPeriod: number = 9) {
  const emaFast = calculateEMA(prices, fast);
  const emaSlow = calculateEMA(prices, slow);

  if (emaSlow.length === 0) {
    return { macdLine: 0, signalLine: 0, histogram: 0, trend: 'neutral' as const };
  }

  const macdValues: number[] = [];
  const offset = slow - fast;

  for (let i = 0; i < emaSlow.length; i++) {
    macdValues.push(emaFast[i + offset] - emaSlow[i]);
  }

  const signalValues = calculateEMA(macdValues, signalPeriod);
  if (signalValues.length === 0) {
    const lastMACD = macdValues[macdValues.length - 1] || 0;
    return { macdLine: lastMACD, signalLine: lastMACD, histogram: 0, trend: 'neutral' as const };
  }

  const currentMACD = macdValues[macdValues.length - 1];
  const currentSignal = signalValues[signalValues.length - 1];
  const histogram = currentMACD - currentSignal;

  return {
    macdLine: currentMACD,
    signalLine: currentSignal,
    histogram,
    trend: histogram >= 0 ? ('bullish' as const) : ('bearish' as const),
  };
}

export function calculateBollingerBands(prices: number[], period: number = 20, stdDevMultiplier: number = 2) {
  if (prices.length < period) {
    const last = prices[prices.length - 1] || 0;
    return { upper: last, middle: last, lower: last, percentB: 50, position: 'within_bands' as const };
  }

  const slice = prices.slice(prices.length - period);
  const mean = slice.reduce((acc, val) => acc + val, 0) / period;
  const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = mean + stdDevMultiplier * stdDev;
  const lower = mean - stdDevMultiplier * stdDev;
  const lastPrice = prices[prices.length - 1];

  let position: 'above_upper' | 'below_lower' | 'within_bands' = 'within_bands';
  if (lastPrice > upper) position = 'above_upper';
  if (lastPrice < lower) position = 'below_lower';

  const bandWidth = upper - lower;
  const percentB = bandWidth > 0 ? ((lastPrice - lower) / bandWidth) * 100 : 50;

  return {
    upper,
    middle: mean,
    lower,
    percentB,
    position,
  };
}

export function computeFrontendIndicators(candles: Candle[], symbol: string = 'BTCUSDT', timeframe: string = '15m'): CalculatedIndicators | null {
  if (!candles || candles.length < 50) return null;

  const closePrices = candles.map((c) => c.close);
  const currentClose = closePrices[closePrices.length - 1];

  const ema20Arr = calculateEMA(closePrices, 20);
  const ema50Arr = calculateEMA(closePrices, 50);

  const ema20 = ema20Arr[ema20Arr.length - 1] || currentClose;
  const ema50 = ema50Arr[ema50Arr.length - 1] || currentClose;
  const emaTrend = ema20 >= ema50 ? 'bullish' : 'bearish';

  const rsiArr = calculateRSI(closePrices, 14);
  const rsi14 = rsiArr[rsiArr.length - 1] || 50;
  let rsiState: 'oversold' | 'overbought' | 'neutral' = 'neutral';
  if (rsi14 < 30) rsiState = 'oversold';
  if (rsi14 > 70) rsiState = 'overbought';

  const macdData = calculateMACD(closePrices, 12, 26, 9);
  const bbData = calculateBollingerBands(closePrices, 20, 2);

  const volume24h = candles.slice(-24).reduce((sum, c) => sum + c.volume, 0);

  return {
    symbol,
    timeframe,
    currentClose,
    ema20,
    ema50,
    emaTrend,
    rsi14,
    rsiState,
    macd: macdData,
    bollingerBands: bbData,
    volume24h,
  };
}
