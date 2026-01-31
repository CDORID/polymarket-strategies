from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./polystrat.db"
    CLOB_API_BASE: str = "https://clob.polymarket.com"
    GAMMA_API_BASE: str = "https://gamma-api.polymarket.com"
    DATA_API_BASE: str = "https://data-api.polymarket.com"
    DEFAULT_INITIAL_CAPITAL: float = 1000.0
    BACKTEST_FEE_RATE: float = 0.002  # 0.2% per trade

    class Config:
        env_file = ".env"


settings = Settings()
