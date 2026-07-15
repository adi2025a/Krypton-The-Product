from pydantic import BaseModel


class OnboardingStatusResponse(BaseModel):
    email_verified: bool
    llm_key_set: bool          # compulsory for the agent to function
    llm_key_valid: bool
    binance_connected: bool     # optional
    binance_key_valid: bool