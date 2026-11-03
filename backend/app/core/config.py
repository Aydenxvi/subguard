from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SubGuard API"
    environment: str = "development"
    debug: bool = True

    # postgresql+asyncpg://subguard:subguard_dev_pw@localhost:5432/subguard
    database_url: str = "postgresql+asyncpg://subguard:subguard_dev_pw@localhost:5432/subguard"

    telegram_bot_token: str = ""
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_ttl_seconds: int = 60 * 60 * 24 * 7
    init_data_max_age_seconds: int = 60 * 60 * 24

    cors_origins: List[str] = ["*"]

    # Demo mode lets the Mini App run in a plain browser with an isolated demo user.
    demo_mode_enabled: bool = True

    default_currency: str = "TRY"
    supported_currencies: List[str] = ["TRY", "USD", "EUR", "KGS", "GBP"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
