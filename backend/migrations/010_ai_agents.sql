-- 010_ai_agents.sql
-- AI persona agents that seed the community feed before real members arrive.
-- See SOCIAL_UX_PLAN_V2.md + memory/project_ai_agent_seeding.md for the full plan.

begin;

-- ============================================================
-- 1. profiles.is_agent flag + extended tier check
-- ============================================================
alter table public.profiles
    add column if not exists is_agent boolean not null default false;

create index if not exists profiles_is_agent_idx on public.profiles(is_agent) where is_agent = true;

alter table public.profiles drop constraint if exists profiles_tier_check;
alter table public.profiles add constraint profiles_tier_check
    check (tier in ('free', 'pro', 'elite', 'admin', 'agent'));

-- ============================================================
-- 2. ai_agents config table
-- ============================================================
create table if not exists public.ai_agents (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null unique references public.profiles(id) on delete cascade,

    -- Persona
    persona_name text not null,            -- "Alex Chen"
    specialty text not null,               -- "NQ/ES futures day trading"
    style text not null check (style in (
        'day', 'swing', 'options', 'macro', 'crypto',
        'risk', 'newbie', 'value', 'ta', 'contrarian',
        'news', 'recap', 'meme', 'earnings'
    )),
    voice_prompt text not null,            -- full system prompt for Claude

    -- Ticker focus
    specialty_tickers text[] not null default '{}',  -- tickers this agent prefers to talk about

    -- Cadence
    cadence_per_day int not null default 3,
    market_hours_weight float not null default 0.75,  -- 0-1, probability of posting during RTH

    -- State
    active boolean not null default true,
    last_post_at timestamptz,
    last_reply_at timestamptz,
    post_count int not null default 0,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists ai_agents_active_idx on public.ai_agents(active) where active = true;
create index if not exists ai_agents_last_post_idx on public.ai_agents(last_post_at);

-- ============================================================
-- 3. app_settings (generic key/value for feature flags)
-- ============================================================
create table if not exists public.app_settings (
    key text primary key,
    value jsonb not null,
    updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
    ('agent_posting_enabled', 'false'::jsonb),
    ('agent_max_posts_per_hour', '4'::jsonb),
    ('agent_reaction_batch_enabled', 'true'::jsonb)
on conflict (key) do nothing;

-- ============================================================
-- 4. RLS
-- ============================================================
alter table public.ai_agents enable row level security;
alter table public.app_settings enable row level security;

-- ai_agents: readable by authenticated (so frontend can show "AI" badge detail if it wants), writable only by service role
drop policy if exists "ai_agents readable" on public.ai_agents;
create policy "ai_agents readable" on public.ai_agents
    for select using (true);

-- app_settings: no anon/authenticated access, service role only
drop policy if exists "app_settings readable by service" on public.app_settings;
-- (no select policy for public = service role bypasses RLS automatically)

commit;
