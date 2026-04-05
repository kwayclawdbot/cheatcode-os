from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "CheatCode OS"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_anon_key: str = ""

    # Anthropic (Kai Chat)
    anthropic_api_key: str = ""
    kai_model: str = "claude-sonnet-4-20250514"

    # OpenAI (embeddings)
    openai_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"

    # YouTube Data API
    youtube_api_key: str = ""

    # EODHD (market data)
    eodhd_api_key: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_pro_price_id: str = ""
    stripe_elite_price_id: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Perplexity (deep research)
    perplexity_api_key: str = ""

    # Content
    max_curated_per_day: int = 20
    relevance_threshold: float = 0.6
    kai_free_messages_per_day: int = 5

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
