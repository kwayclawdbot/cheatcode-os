-- CheatCode OS — Initial Schema
-- Run against Supabase SQL editor

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    display_name text,
    avatar_url text,
    tier text not null default 'free' check (tier in ('free', 'pro', 'elite', 'admin')),
    stripe_customer_id text,
    stripe_subscription_id text,
    kai_messages_today int not null default 0,
    kai_messages_reset_at timestamptz not null default now(),
    preferences jsonb not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, display_name)
    values (new.id, new.email, split_part(new.email, '@', 1));
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function handle_new_user();

-- ============================================================
-- CREATORS (YouTube channels / podcast hosts we curate)
-- ============================================================
create table if not exists creators (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    slug text not null unique,
    platform text not null default 'youtube' check (platform in ('youtube', 'podcast', 'both')),
    youtube_channel_id text,
    rss_feed_url text,
    avatar_url text,
    description text,
    quality_score float not null default 0.7,
    tags text[] not null default '{}',
    is_active boolean not null default true,
    metadata jsonb not null default '{}',
    created_at timestamptz not null default now()
);

-- ============================================================
-- CONTENT (curated videos + podcasts)
-- ============================================================
create table if not exists content (
    id uuid primary key default uuid_generate_v4(),
    creator_id uuid references creators(id) on delete set null,

    -- Source info
    content_type text not null check (content_type in ('video', 'podcast')),
    source_platform text not null default 'youtube',
    external_id text not null,          -- YouTube video ID or podcast episode GUID
    external_url text not null,

    -- Core metadata
    title text not null,
    description text,
    thumbnail_url text,
    duration_seconds int,
    published_at timestamptz,

    -- AI-generated context layer
    quick_take text,                    -- 3-4 sentence contextual summary
    key_insights jsonb,                 -- [{insight: "...", category: "..."}]
    timestamps jsonb,                   -- [{time: 120, label: "VCP pattern explained"}]
    transcript text,                    -- full transcript

    -- Categorization
    topics text[] not null default '{}',           -- ["technical_analysis", "options"]
    themes text[] not null default '{}',           -- ["nuclear_renaissance", "ai_bubble"]
    skill_level text default 'intermediate' check (skill_level in ('beginner', 'intermediate', 'advanced')),
    tags text[] not null default '{}',

    -- Scoring
    relevance_score float not null default 0,
    engagement_score float not null default 0,
    is_featured boolean not null default false,
    is_published boolean not null default false,

    -- Embedding for semantic search
    embedding vector(1536),

    -- Timestamps
    curated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique(source_platform, external_id)
);

create index idx_content_published on content(is_published, curated_at desc);
create index idx_content_featured on content(is_featured, curated_at desc) where is_published = true;
create index idx_content_topics on content using gin(topics);
create index idx_content_themes on content using gin(themes);
create index idx_content_creator on content(creator_id);
create index idx_content_type on content(content_type, curated_at desc);
create index idx_content_embedding on content using ivfflat(embedding vector_cosine_ops) with (lists = 100);

-- ============================================================
-- CONTENT_TICKERS (tickers mentioned in content)
-- ============================================================
create table if not exists content_tickers (
    id uuid primary key default uuid_generate_v4(),
    content_id uuid not null references content(id) on delete cascade,
    ticker text not null,
    mention_context text,               -- what the creator said about it
    sentiment text check (sentiment in ('bullish', 'bearish', 'neutral', 'mixed')),
    is_primary boolean not null default false,  -- main ticker discussed
    created_at timestamptz not null default now()
);

create index idx_content_tickers_ticker on content_tickers(ticker);
create index idx_content_tickers_content on content_tickers(content_id);

-- ============================================================
-- TICKERS (master ticker table with convergence data)
-- ============================================================
create table if not exists tickers (
    symbol text primary key,
    name text,
    sector text,
    industry text,

    -- Convergence brain
    convergence_score int not null default 0 check (convergence_score between 0 and 100),
    direction text check (direction in ('bullish', 'bearish', 'neutral', 'contested')),
    timeframe text check (timeframe in ('day_trade', 'swing', 'position', 'long_term')),
    confidence text check (confidence in ('low', 'medium', 'high', 'very_high')),

    -- Evidence
    evidence_chain jsonb not null default '[]',   -- [{source, signal, direction, timestamp}]
    source_count int not null default 0,
    catalyst text,
    invalidation text,

    -- Theme linkage
    themes text[] not null default '{}',

    -- Price data
    last_price float,
    price_change_pct float,
    volume_ratio float,

    -- Timestamps
    scored_at timestamptz,
    updated_at timestamptz not null default now()
);

create index idx_tickers_convergence on tickers(convergence_score desc) where convergence_score >= 60;
create index idx_tickers_themes on tickers using gin(themes);

-- ============================================================
-- THEMES (market themes tracked by brain)
-- ============================================================
create table if not exists themes (
    id uuid primary key default uuid_generate_v4(),
    name text not null unique,
    slug text not null unique,
    description text,
    status text not null default 'active' check (status in ('emerging', 'active', 'escalating', 'cooling', 'dead')),
    tickers text[] not null default '{}',
    evidence jsonb not null default '[]',
    escalation_score float not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ============================================================
-- PREDICTIONS (prediction cards from convergence brain)
-- ============================================================
create table if not exists predictions (
    id uuid primary key default uuid_generate_v4(),
    ticker text not null references tickers(symbol) on delete cascade,
    direction text not null check (direction in ('bullish', 'bearish')),
    convergence_score int not null,
    timeframe text not null,
    confidence text not null,
    evidence_chain jsonb not null default '[]',
    catalyst text,
    invalidation text,
    related_tickers text[] not null default '{}',
    theme text,
    status text not null default 'active' check (status in ('active', 'hit', 'missed', 'expired', 'invalidated')),
    target_price float,
    stop_price float,
    created_at timestamptz not null default now(),
    expires_at timestamptz,
    resolved_at timestamptz
);

create index idx_predictions_active on predictions(convergence_score desc) where status = 'active';
create index idx_predictions_ticker on predictions(ticker);

-- ============================================================
-- RADAR (daily radar snapshots)
-- ============================================================
create table if not exists radar_snapshots (
    id uuid primary key default uuid_generate_v4(),
    date date not null unique default current_date,
    market_sentiment text not null check (market_sentiment in ('bullish', 'bearish', 'choppy', 'neutral')),
    sentiment_summary text,
    critical jsonb not null default '[]',       -- convergence 90+
    high_conviction jsonb not null default '[]', -- 75-89
    watch jsonb not null default '[]',           -- 60-74
    contested jsonb not null default '[]',
    theme_heatmap jsonb not null default '[]',
    sector_rotation jsonb not null default '{}',
    created_at timestamptz not null default now()
);

-- ============================================================
-- KAI CONVERSATIONS
-- ============================================================
create table if not exists kai_conversations (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references profiles(id) on delete cascade,
    title text,
    message_count int not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists kai_messages (
    id uuid primary key default uuid_generate_v4(),
    conversation_id uuid not null references kai_conversations(id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    sources jsonb,                      -- [{type: "content"|"prediction"|"theme", id, title}]
    created_at timestamptz not null default now()
);

create index idx_kai_messages_conversation on kai_messages(conversation_id, created_at);

-- ============================================================
-- USER ACTIVITY (personalization + analytics)
-- ============================================================
create table if not exists user_views (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references profiles(id) on delete cascade,
    content_id uuid not null references content(id) on delete cascade,
    view_duration_seconds int,
    completed boolean not null default false,
    created_at timestamptz not null default now()
);

create index idx_user_views_user on user_views(user_id, created_at desc);

create table if not exists user_bookmarks (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references profiles(id) on delete cascade,
    content_id uuid not null references content(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique(user_id, content_id)
);

-- ============================================================
-- PLAYLISTS
-- ============================================================
create table if not exists playlists (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references profiles(id) on delete cascade,  -- null = system playlist
    title text not null,
    slug text not null,
    description text,
    is_system boolean not null default false,  -- morning_prep, weekend_deep_dive, etc.
    is_public boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists playlist_items (
    id uuid primary key default uuid_generate_v4(),
    playlist_id uuid not null references playlists(id) on delete cascade,
    content_id uuid not null references content(id) on delete cascade,
    position int not null default 0,
    created_at timestamptz not null default now()
);

-- ============================================================
-- NEWSLETTERS
-- ============================================================
create table if not exists newsletters (
    id uuid primary key default uuid_generate_v4(),
    date date not null unique default current_date,
    subject text not null,
    body_html text not null,
    body_text text not null,
    market_sentiment text,
    top_content_ids uuid[] not null default '{}',
    theme_changes jsonb,
    sent_at timestamptz,
    created_at timestamptz not null default now()
);

-- ============================================================
-- CURATION QUEUE (pipeline staging)
-- ============================================================
create table if not exists curation_queue (
    id uuid primary key default uuid_generate_v4(),
    external_id text not null,
    source_platform text not null default 'youtube',
    title text,
    channel_name text,
    creator_id uuid references creators(id),
    relevance_score float,
    status text not null default 'pending' check (status in ('pending', 'processing', 'approved', 'rejected', 'published')),
    raw_data jsonb not null default '{}',
    created_at timestamptz not null default now(),
    processed_at timestamptz,
    unique(source_platform, external_id)
);

create index idx_curation_queue_status on curation_queue(status, created_at);

-- ============================================================
-- RLS POLICIES
-- ============================================================

alter table profiles enable row level security;
alter table content enable row level security;
alter table kai_conversations enable row level security;
alter table kai_messages enable row level security;
alter table user_views enable row level security;
alter table user_bookmarks enable row level security;
alter table playlists enable row level security;
alter table playlist_items enable row level security;

-- Profiles: users can read/update their own
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Content: published content is public
create policy "Published content is public" on content for select using (is_published = true);

-- Kai conversations: users own their conversations
create policy "Users own conversations" on kai_conversations for all using (auth.uid() = user_id);
create policy "Users own messages" on kai_messages for all
    using (conversation_id in (select id from kai_conversations where user_id = auth.uid()));

-- User views/bookmarks: users own their own
create policy "Users own views" on user_views for all using (auth.uid() = user_id);
create policy "Users own bookmarks" on user_bookmarks for all using (auth.uid() = user_id);

-- Playlists: public playlists readable by all, own playlists editable
create policy "Public playlists readable" on playlists for select using (is_public = true or auth.uid() = user_id);
create policy "Users own playlists" on playlists for all using (auth.uid() = user_id);
create policy "Playlist items readable" on playlist_items for select
    using (playlist_id in (select id from playlists where is_public = true or user_id = auth.uid()));
