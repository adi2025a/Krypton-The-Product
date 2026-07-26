export interface User {
  email: string;
  is_verified?: boolean;
}

export interface AuthTokens {
  access_token: string;
}

export interface LLMKeyStatus {
  provider: string;
  model_name: string;
  is_active: boolean;
  is_valid: boolean;
  expires_at: string;
}

export interface BinanceStatus {
  platform: string;
  is_active: boolean;
  is_valid: boolean;
}

export interface PortfolioBalance {
  asset: string;
  free: number;
  locked: number;
}

export interface NewsItem {
  title: string;
  summary: string;
  link: string;
  source: string;
  published_at?: string;
  sentiment_label: 'bullish' | 'bearish' | 'neutral' | string;
  sentiment_score: number;
}

export interface NewsFeedResponse {
  symbol: string;
  items: NewsItem[];
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CalculatedIndicators {
  symbol: string;
  timeframe: string;
  currentClose: number;
  ema20: number;
  ema50: number;
  emaTrend: 'bullish' | 'bearish';
  rsi14: number;
  rsiState: 'oversold' | 'overbought' | 'neutral';
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    percentB: number;
    position: 'above_upper' | 'below_lower' | 'within_bands';
  };
  volume24h: number;
}

export interface RiskProfileResponse {
  overall_risk_score?: number;
  risk_level?: string;
  concentration_risk?: {
    dominant_asset: string;
    concentration_pct: number;
    risk_assessment: string;
  };
  portfolio_summary?: {
    total_usdt_value: number;
    balances_count: number;
  };
  warnings?: string[];
  recommendations?: string[];
  [key: string]: any;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    indicators?: any;
    news_items?: any[];
    sentiment_summary?: any;
    risk_profile?: any;
  };
}
