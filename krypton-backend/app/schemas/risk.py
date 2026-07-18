from pydantic import BaseModel


class ConcentrationData(BaseModel):
    asset: str
    pct_of_portfolio: float


class VolatilityData(BaseModel):
    std_dev_pct: float
    label: str


class RiskProfileResponse(BaseModel):
    symbol: str
    concentration: ConcentrationData
    volatility: VolatilityData
    portfolio_total_usdt: float
    overall_risk_score: float
    overall_risk_label: str