from enum import Enum
from pydantic import BaseModel


class IntegrationPlatform(str, Enum):
    binance = "binance"
    # coinbase = "coinbase"   # add here when we support more platforms


class ConnectBinanceRequest(BaseModel):
    api_key: str
    api_secret: str


class ConnectBinanceResponse(BaseModel):
    platform: IntegrationPlatform
    is_valid: bool
    message: str


class IntegrationStatusResponse(BaseModel):
    platform: IntegrationPlatform
    is_active: bool
    is_valid: bool


class PortfolioBalance(BaseModel):
    asset: str
    free: float
    locked: float


class PortfolioResponse(BaseModel):
    platform: IntegrationPlatform
    balances: list[PortfolioBalance]