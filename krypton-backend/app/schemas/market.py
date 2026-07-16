from pydantic import BaseModel


class EMAData(BaseModel):
    ema20: float
    ema50: float
    trend: str


class RSIData(BaseModel):
    value: float
    state: str


class MACDData(BaseModel):
    macd: float
    signal: float
    histogram: float
    trend: str


class BollingerBandsData(BaseModel):
    upper: float
    middle: float
    lower: float
    position: str


class IndicatorResponse(BaseModel):
    symbol: str
    timeframe: str
    close: float
    ema: EMAData
    rsi: RSIData
    macd: MACDData
    bollinger_bands: BollingerBandsData