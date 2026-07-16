import re
from enum import Enum
from pydantic import BaseModel, field_validator


class Timeframe(str, Enum):
    """
    Mirrors Binance's actual kline interval values exactly -- these
    strings get passed straight into the Binance API later, so they
    must match Binance's spelling, not our own invented names.
    """
    m1 = "1m"
    m5 = "5m"
    m15 = "15m"
    m30 = "30m"
    h1 = "1h"
    h4 = "4h"
    d1 = "1d"


class SetChartContextRequest(BaseModel):
    symbol: str
    timeframe: Timeframe = Timeframe.m15

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, v: str) -> str:
        v = v.strip().upper().replace("/", "")  # "btc/usdt" -> "BTCUSDT"
        if not re.match(r"^[A-Z0-9]{5,15}$", v):
            raise ValueError("symbol must look like a trading pair, e.g. BTCUSDT")
        return v


class ChartContextResponse(BaseModel):
    symbol: str
    timeframe: Timeframe