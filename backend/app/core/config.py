"""Application configuration.

Required env vars are validated at startup via Pydantic. A missing required
var will crash the FastAPI app during boot with a clear error message,
instead of silently starting and blowing up on first API call.
"""

import logging
from functools import lru_cache

from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings

log = logging.getLogger("config")


class Settings(BaseSettings):
    # App
    app_name: str = "CheatCode OS"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # Supabase (REQUIRED — backend cannot function without these)
    supabase_url: str = Field(..., min_length=1, description="Supabase project URL")
    supabase_service_key: str = Field(..., min_length=1, description="Supabase service role key (server-only)")
    supabase_anon_key: str = ""

    # Anthropic (REQUIRED — Kai, curation, ingestion all depend on this)
    anthropic_api_key: str = Field(..., min_length=1, description="Anthropic API key for Kai + curation")
    kai_model: str = "claude-sonnet-4-20250514"
    kai_haiku_model: str = "claude-haiku-4-5-20251001"  # cheaper model for framework extraction

    # OpenAI (REQUIRED — embeddings for semantic search)
    openai_api_key: str = Field(..., min_length=1, description="OpenAI API key for embeddings")
    embedding_model: str = "text-embedding-3-small"

    # YouTube Data API (REQUIRED — curation pipeline)
    youtube_api_key: str = Field(..., min_length=1, description="YouTube Data API v3 key")

    # EODHD market data (REQUIRED — ticker radar + prices)
    eodhd_api_key: str = Field(..., min_length=1, description="EODHD API key for market data")

    # Stripe (REQUIRED — payments flow)
    stripe_secret_key: str = Field(..., min_length=1, description="Stripe secret key (LIVE MODE!)")
    stripe_webhook_secret: str = Field(..., min_length=1, description="Stripe webhook endpoint secret")
    stripe_pro_price_id: str = Field(..., min_length=1, description="Stripe Pro tier price_xxx ID")
    stripe_elite_price_id: str = ""  # May not be created yet — handled gracefully downstream

    # Frontend URL for Stripe redirect URLs and CORS. Set in Railway to your
    # production Vercel domain (e.g. https://cheatcode-os.vercel.app). Locally
    # defaults to http://localhost:5173. NO trailing slash.
    frontend_url: str = "http://localhost:5173"

    # CORS — comma-separated list of allowed origins.
    # FRONTEND_URL is automatically included; add extras here if needed.
    cors_allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    # Kai spend caps (USD per user per month, plus global daily circuit breaker)
    kai_free_messages_per_day: int = 5
    kai_pro_monthly_budget_usd: float = 15.0
    kai_elite_monthly_budget_usd: float = 60.0
    kai_daily_global_budget_usd: float = 200.0

    # Content curation
    max_curated_per_day: int = 20
    relevance_threshold: float = 0.6

    # Redis (optional — used for distributed locks if scheduler needs to scale)
    redis_url: str = ""

    # Perplexity (optional — deep research feature, not yet wired)
    perplexity_api_key: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",  # tolerate extra env vars (PORT, etc.)
    }


@lru_cache()
def get_settings() -> Settings:
    """Load settings once at startup. Raises ValidationError with a clear
    message if any required env var is missing."""
    try:
        return Settings()
    except ValidationError as e:
        missing = []
        for err in e.errors():
            if err.get("type") == "missing":
                field = ".".join(str(x) for x in err.get("loc", []))
                missing.append(field.upper())
        if missing:
            log.critical(
                "STARTUP FAILED: missing required environment variables: %s. "
                "Set them in Railway dashboard → Variables tab.",
                ", ".join(missing),
            )
        raise
