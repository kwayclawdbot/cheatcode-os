from pydantic import BaseModel
from datetime import datetime


class ContentBase(BaseModel):
    title: str
    content_type: str  # video | podcast
    source_platform: str = "youtube"
    external_id: str
    external_url: str
    description: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: int | None = None
    published_at: datetime | None = None
    topics: list[str] = []
    themes: list[str] = []
    skill_level: str = "intermediate"
    tags: list[str] = []


class ContentContextLayer(BaseModel):
    quick_take: str | None = None
    key_insights: list[dict] | None = None
    timestamps: list[dict] | None = None
    tickers_mentioned: list[dict] | None = None


class ContentCard(BaseModel):
    id: str
    title: str
    content_type: str
    external_url: str
    thumbnail_url: str | None
    duration_seconds: int | None
    creator_name: str | None
    creator_slug: str | None
    quick_take: str | None
    relevance_score: float
    topics: list[str]
    themes: list[str]
    skill_level: str
    published_at: datetime | None
    curated_at: datetime


class ContentDetail(ContentCard):
    description: str | None
    key_insights: list[dict] | None
    timestamps: list[dict] | None
    tickers: list[dict] | None
    related: list[ContentCard] | None = None
    transcript: str | None = None  # pro only


class CreatorProfile(BaseModel):
    id: str
    name: str
    slug: str
    platform: str
    avatar_url: str | None
    description: str | None
    quality_score: float
    tags: list[str]
    content_count: int = 0


class TickerLookup(BaseModel):
    symbol: str
    name: str | None
    convergence_score: int
    direction: str | None
    timeframe: str | None
    confidence: str | None
    last_price: float | None
    price_change_pct: float | None
    daily_analysis: str | None = None
    analysis_date: str | None = None
    key_levels: dict | None = None
    catalysts: list[str] | None = None
    risks: list[str] | None = None


class TickerDetail(TickerLookup):
    evidence_chain: list[dict]
    source_count: int
    catalyst: str | None
    invalidation: str | None
    themes: list[str]
    related_content: list[ContentCard] | None = None
    related_tickers: list[str] | None = None
    daily_analysis: str | None = None
    analysis_date: str | None = None
    key_levels: dict | None = None
    catalysts: list[str] | None = None
    risks: list[str] | None = None


class PredictionCard(BaseModel):
    id: str
    ticker: str
    direction: str
    convergence_score: int
    timeframe: str
    confidence: str
    evidence_chain: list[dict]
    catalyst: str | None
    invalidation: str | None
    related_tickers: list[str]
    theme: str | None
    created_at: datetime


class RadarSnapshot(BaseModel):
    date: str
    market_sentiment: str
    sentiment_summary: str | None
    critical: list[dict]
    high_conviction: list[dict]
    watch: list[dict]
    contested: list[dict]
    theme_heatmap: list[dict]
    sector_rotation: dict


class ThemeDetail(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None
    status: str
    tickers: list[str]
    escalation_score: float
    content: list[ContentCard] | None = None


class KaiMessage(BaseModel):
    role: str
    content: str
    sources: list[dict] | None = None


class KaiChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class KaiChatResponse(BaseModel):
    conversation_id: str
    message: KaiMessage
    remaining_messages: int | None = None  # null for pro/elite


class NewsletterPreview(BaseModel):
    date: str
    subject: str
    market_sentiment: str | None
    top_content: list[ContentCard]
    theme_changes: list[dict] | None


class HomePageData(BaseModel):
    market_sentiment: str
    sentiment_summary: str | None
    todays_picks: list[ContentCard]
    continue_learning: list[ContentCard] | None = None
    topics: list[dict]
    themes: list[dict]
