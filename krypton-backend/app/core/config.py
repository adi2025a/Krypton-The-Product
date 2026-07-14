"""
Centralized application settings.

Why pydantic-settings?
- Reads from environment variables / .env automatically
- Validates types at startup (fails fast if something is misconfigured)
- Single source of truth imported everywhere else as `settings`
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    APP_NAME: str = "Crypto Trading Assistant"
    ENV: str = "development"

    # --- Database ---
    DATABASE_URL: str  # e.g. postgresql+asyncpg://user:pass@localhost:5432/crypto_db

    # --- JWT (session auth, issued AFTER otp verification) ---
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # --- Fernet key used to encrypt LLM / Binance API keys at rest ---
    ENCRYPTION_KEY: str  # generate with cryptography.fernet.Fernet.generate_key()

    # --- OTP ---
    OTP_EXPIRE_MINUTES: int = 5
    OTP_LENGTH: int = 6

    # --- LLM key default TTL (user can override per-key) ---
    LLM_KEY_DEFAULT_TTL_DAYS: int = 7

    # --- Email (for sending OTP) ---
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()