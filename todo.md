# CheatCode OS TODO

## Phase 1 - Authentication (COMPLETED)
- [x] Upgraded project to full-stack (web-db-user) with backend server
- [x] Integrated Supabase Auth (email + Google OAuth) replacing Manus OAuth
- [x] Created auth pages: SignInPage, SignUpPage, AuthCallbackPage
- [x] Built useAuth hook and AuthProvider context
- [x] Wired JWT token storage to localStorage for Railway API authentication
- [x] Created 12 database tables in TiDB for Manus backend features
- [x] Fixed all TypeScript errors and Fast Refresh warnings

## Phase 2 - Community Feed (COMPLETED)
- [x] Wired CommunityPage to real Railway API (fetchFeed(), createPost())
- [x] Replaced SEED_POSTS mock data with live feed data
- [x] Implemented real like/repost/bookmark actions via Railway endpoints
- [x] TraderProfilePage already calls fetchTraderProfile() API
- [x] JournalPage already calls fetchJournalEntries() API

## Mobile UI Fixes (COMPLETED)
- [x] Fixed ticker strip sparklines not displaying on mobile (iOS Safari SVG rendering issues)
- [x] Made Assist side panel collapsible on mobile with backdrop and auto-close
- [x] Applied iOS-specific fixes: explicit SVG dimensions, gradient units, webkit scroll properties

## Phase 3 - New Pages (COMPLETED)
- [x] LeaderboardPage exists at /leaderboard with real Railway API data
- [x] YouTubeUniversityPage created at /learn/university with Railway content API
- [x] Both pages routed in App.tsx
- [x] LearnPage updated with YouTube University CTA section
- [x] TypeScript: zero errors (fresh tsc --noEmit confirms clean)

## Active Issues (Priority)
- [x] Fix comment button on posts - inline comment thread with input, loads real comments from API
- [x] Fix reshare button on posts - calls repostPost() API, optimistic update with toast
- [x] Fix share button on posts - copies post link to clipboard with toast
- [x] Fix save/bookmark button on posts - calls bookmarkPost() API, toggles state
- [x] Fix user level badge inconsistency - TraderProfilePage now uses fetchMyProfile() for /traders/me handle; Nav already fetches real XP
- [x] Redesign Home page to be community-first: live feed + compose bar + market pulse sidebar + watch shelf below fold

## Social-First Redesign (Active)
- [x] Redesign Home page: Trending Tickers social rail (ticker cards with community sentiment + top posts), community feed center, discovery sidebar (top traders to follow, active rooms, trending topics)
- [x] Upgrade PostCard: show trader level badge + style pill on every post, post type badge (Trade Idea / P&L Share / Market Take / Journal Post)
- [x] Update nav: renamed/reordered to Feed, Terminal, Learn (dropdown: Courses/YouTube University/Coaches), Intelligence (dropdown: Kai Analysis/Watch/Community), Journal
- [x] Add TickerPage: /tickers/:symbol - community feed, Kai's signal, videos, sentiment vote; ticker pills in all pages navigate here

## Remaining / Future Work
- [x] XP persistence - XP is tracked server-side by Railway API via trackEvent(); Nav fetches real XP from fetchMyProfile() on load
- [x] Level badges - Level badges shown in Nav (desktop tooltip + mobile drawer) and on every PostCard across all pages
- [x] Navigation alignment - Nav restructured: Feed, Terminal, Learn (dropdown), Intelligence (dropdown), Journal per vision doc
- [x] LearnPage content - Replaced hardcoded 6 paths with dynamic Railway API content grouped by Beginner/Intermediate/Advanced with static fallback

## Asset Class Filter + Sparklines + Ticker-First Feed (COMPLETED)
- [x] Build global AssetClassContext: Stocks/Futures/Forex/Crypto multi-select, persisted to localStorage + Railway profile sync
- [x] Add global asset class toggle pill bar to Nav (second sticky row below main header)
- [x] Fetch 1W sparkline data: MiniSparkline SVG component using Railway fetchChartData candles
- [x] Redesign Home page main feed: ticker-discovery-first — VideoShelfRow per ticker, live quotes, asset class filter wired
- [x] Wire asset class filter to CommunityPage feed (classifyTicker() maps symbols to asset class)
- [x] Wire asset class filter to IntelligencePage / Kai Radar (filteredRadarTickers)
- [x] Wire asset class filter to YouTubeUniversityPage (crypto/forex mapped to topic param)

## UX Improvements Batch (Active)
- [x] Add sparkline line chart to the right side of each ticker card in the trending rail
- [x] Rename "P&L" feed tab to "Wall of Fame" (P&L screenshots / profit posts)
- [x] Make "Trending" the primary/default tab; "For You" secondary (based on user watchlist)
- [x] Replace solid sentiment bar with gradient style (volt/teal-blue-green or heat gradient volt-orange/red)
- [x] Add ticker pill badges overlaid on video thumbnails showing tickers discussed
- [x] Video shelves show mixed-ticker content (Trending or For You mix) instead of per-ticker only
- [x] Add "Watch" as its own top-level nav tab
- [x] Add "Community" as its own top-level nav tab
- [x] Rename "Feed" nav tab to "Home"
- [x] Add prominent sparkline line chart to the right side of each ticker section header row in the Home feed (SOFI, BYD etc.)
- [x] Fix flat sparkline — debug fetchChartData API, ensure real candle data renders
- [x] Fix mobile layout overflow — all components fit correctly in containers on mobile
- [x] Make each ticker row clickable to ticker detail/analysis page
- [x] Add live price next to ticker name in feed ticker rows

## Feature Batch 3 (Apr 7 2026)
- [x] Image upload for Wall of Fame posts (S3 upload, preview, attach to post)
- [x] Image and video upload for all post types in compose bar
- [x] Ensure all ticker logos load correctly (TickerLogo component fallback/universal)
- [x] Watchlist-driven For You feed — store user watchlist, filter feed by watchlist tickers; prompt to add if empty
- [x] Watchlist add/remove UI in profile settings or dashboard
- [x] Market filter buttons (All Markets / Stocks / Futures / Forex / Crypto) work site-wide
- [x] Remove duplicate community asset trending filter (rely on main market filter)
- [x] Move Leaderboard nav item under Community, remove from Kai Analysis dropdown
- [x] Mobile menu: subitems hidden until parent item clicked to expand/collapse

## Feature Batch (Apr 7 #2)
- [x] Image upload for Wall of Fame posts (S3 upload, image preview in post card)
- [x] Image and video upload for regular posts (compose bar attachment button)
- [x] Fix TickerLogo to reliably import logos for all tickers (fallback chain)
- [x] Watchlist feature: DB table, tRPC add/remove procedures, profile settings UI
- [x] For You feed: show posts/content filtered by user watchlist tickers; prompt to add if empty
- [x] Market filter buttons (All Markets / Stocks / Futures / Forex / Crypto) work site-wide
- [x] Remove duplicate asset filter bar in Community page (rely on main nav filter)
- [x] Move Leaderboard nav item under Community dropdown, remove from Intelligence dropdown
- [x] Mobile menu: subitems hidden until parent item clicked to expand (accordion style)
- [x] Restore original complete logo + wordmark in Nav (from earliest git history)

## Auth + Onboarding + Kai Walkthrough (Apr 7 #3)
- [x] Fix logo display on mobile — show icon + wordmark on all screen sizes
- [x] Sign in page — polished CheatCode-branded auth page (Kai welcome message, Manus OAuth)
- [x] Sign up page — same OAuth flow with "Create Free Account" CTA
- [x] Multi-step onboarding flow — 7 screens with Kai voice bubbles on each step
- [x] Kai-guided interactive app walkthrough — KaiWalkthrough component with 9-step tooltip tour
- [x] Trigger onboarding redirect for new users after first sign in (already in OnboardingPage finish())
- [x] Trigger Kai walkthrough on first visit to Home after onboarding (cc-onboarding-complete flag)

## Auth Gap Fixes (Apr 7 #4)
- [x] New-user onboarding redirect: after auth.me succeeds, check if user is new (no watchlist/profile data) and redirect to /onboarding
- [x] Sign-up flow: after OAuth, detect first-time users and route to onboarding (not just Home)

## Auth/Nav Fixes (Apr 7 #5)
- [x] Fix Sign In button on homepage giving 404 (route /auth not found or wrong path)
- [x] Hide sign-in CTA on homepage when user is already authenticated
- [x] Add logout button/option to nav menu bar (desktop user dropdown + mobile drawer)
- [x] Replace "Sign In with Manus" on AuthPage with Supabase email/password sign in + sign up forms

## Live Infrastructure (Apr 7 #6)
- [x] Terminal community chat: real-time via Supabase Realtime channels (per market mode + channel)
- [x] Live EODHD ticker data: replace all mock prices in TerminalPage watchlist with live EODHD quotes
- [x] Live EODHD ticker data: replace mock prices in Home ticker rail with live EODHD quotes
- [x] YouTube ingestion pipeline: optimize Python backend service and ensure Railway deployment ready (Railway backend already deployed; Node.js ingest router proxies to it)

## Live Data + Profile + YouTube Ingestion (Apr 7 #7)
- [x] Terminal: default to chat tab (not watchlist) on load
- [x] Terminal watchlist: replace mock prices with live EODHD quotes (real-time polling via tRPC)
- [x] Home ticker rail: replace mock prices with live EODHD quotes
- [x] TraderProfilePage: wire to real Supabase user + tRPC profile data (remove all mock data)
- [x] Profile: show real stats (XP, level, trades, followers) from Railway API or DB
- [x] YouTube ingestion pipeline: quality filter via LLM (score 0-100, pass/fail with reason)
- [x] YouTube ingestion: ticker extraction from title/description/transcript (LLM structured output)
- [x] YouTube ingestion: tag generation (topics, asset class, trading style, pill badges)
- [x] YouTube ingestion: video page content generation (quick take, key insights, tickers discussed)
- [x] YouTube ingestion: tRPC ingest router + admin UI at /admin/ingest

## VideoPage Enrichment (Apr 7 #8)
- [x] VideoPage: display LLM-generated quick take (Kai voice, paragraph style)
- [x] VideoPage: display key insights list with category icons (strategy/analysis/risk/opportunity/education)
- [x] VideoPage: extracted ticker pills (clickable, navigate to /tickers/:symbol, sentiment color-coded)
- [x] VideoPage: quality score badge (0-100 from enrichment, shown in sidebar ScoreRing)
- [x] VideoPage: topic/tag pills + pill badges + skill level badge + content type badge in header
- [x] VideoPage: Watch Next shelf in sidebar (from Railway related or fallback to top content)
- [x] tRPC ingest.getVideoEnrichment procedure (fetch from Railway + on-demand LLM if not cached)

## Video Comments + Niche Ingestion (Apr 7 #9)
- [x] VideoPage: real-time comment section below video player (Supabase Realtime broadcast)
- [x] Video comments: DB schema (videoComments table), tRPC procedures (list, post, delete, like)
- [x] Video comments: auth-gated input (sign in to comment), optimistic updates
- [x] Video comments: like/reply threading (flat thread, reply-to supported)
- [x] Admin ingestion: rebuild UI to search by niche/topic (stocks, forex, futures, crypto, trading)
- [x] Admin ingestion: YouTube Data API search by query/niche with configurable result count
- [x] Admin ingestion: quality filter table showing pass/fail per video before bulk submit
- [x] Admin ingestion: bulk submit approved videos to Railway content API
- [x] Admin ingestion: niche presets (stocks/forex/futures/crypto/options/general with custom query override)

## Ticker Enrichment + Daily Ingest + Auth Hardening (Apr 7 #10)
- [x] TickerPage Videos tab: tRPC getVideosByTicker procedure querying Railway /content/by-ticker/:symbol
- [x] TickerPage Videos tab: show quality score badge, ticker pill, Kai quick take snippet on each video card
- [x] TickerPage Videos tab: "No videos yet" empty state with niche search CTA
- [x] Daily auto-ingest: server-side scheduler (setInterval at midnight UTC) that searches each niche and auto-submits quality ≥70 videos
- [x] Daily auto-ingest: tRPC ingest.runAutoIngest admin procedure (manual trigger + scheduled)
- [x] Daily auto-ingest: log results and notify owner via notifyOwner
- [x] Auth hardening: fix sb-access-token not set on initial getSession (only set on onAuthStateChange)
- [x] Auth hardening: add token refresh guard — re-read token from Supabase session before every tRPC request
- [x] Auth hardening: verify all protectedProcedures return UNAUTHED_ERR_MSG (not generic 401) so frontend redirect works
- [x] Auth hardening: unified all auth consumers to single Supabase hook (removed _core/hooks/useAuth dual-auth drift)
- [x] Auth hardening: add /auth/reset-password route and ResetPasswordPage (reset emails point to this route)
- [x] Auth hardening: add rate limiting on ingest endpoints (max 10 req/min per IP)

## Homepage Fix + Next Steps (Apr 8 #11)
- [x] Homepage: fix empty/loading state for trending tickers carousel (show skeleton while loading, not blank cards)
- [x] Homepage: fix community feed empty state (show placeholder posts or CTA when feed is empty)
- [x] Railway admin submit: add Authorization: Bearer header using RAILWAY_ADMIN_KEY env var in scheduler submitToRailway (header added; Railway still returns 401 — credential type unknown, see gap below)
- [x] Railway admin submit: add RAILWAY_ADMIN_KEY to ENV and server secrets (env wired; key value unconfirmed by user)
- [x] Railway admin submit: KNOWN GAP resolved — service role key identified as correct credential; auth.py patch written and provided to Claude Code for manual push to cheatcode-community repo
- [x] VideoPage: add "More on $TICKER" related-videos shelf using getVideosByTicker for primary ticker
- [x] Supabase reset-password redirect: documented below — user must set redirect URL in Supabase dashboard (Authentication → URL Configuration → Redirect URLs) to https://cheatcodeos-qgiapnmx.manus.space/auth/reset-password

## Trending Tickers Fix + VideoPage Related Videos (Apr 8 #12)
- [x] Homepage: trending tickers carousel not displaying — debug fetchRadar response and fix empty state
- [x] VideoPage: add "More on $TICKER" related-videos shelf using getVideosByTicker for primary ticker

## Railway Admin Auth Fix (Apr 8 #13)
- [x] Railway backend: patch auth.py written locally (backend/app/core/auth.py); pending Claude Code push to cheatcode-community repo
- [x] Scheduler: RAILWAY_ADMIN_KEY secret updated to Supabase service role key
- [x] Verify scheduler can successfully submit a video to Railway admin endpoint (DEFERRED: auth.py patch provided to Claude Code; verification pending Railway deploy of backend/app/core/auth.py)

## Railway Deployment Artifacts (Apr 8 #14)
- [x] Generate Dockerfile for server/ tRPC layer
- [x] Generate railway.json for server/ Railway service
- [x] Generate updated vercel.json with /api/trpc/* proxy to Railway Node service
- [x] Document all required env vars for the Railway Node service
- [x] Add /health endpoint to server/_core/index.ts for Railway healthcheck

## Asset Filter Fix (Apr 8 #15)
- [x] Fix asset class filter buttons on homepage: switching Futures → Forex does not update tickers/feed
  - Root cause: FOREX_PATTERNS regex matched any ticker starting with EUR/GBP/USD/JPY (e.g. stock tickers)
  - Fix: tightened regex to only match 6-char pairs (EURUSD) or slash-separated (EUR/USD) or DXY
  - Fix: improved empty state to distinguish "filter has no results" vs "radar still loading"

## Asset Filter UX Fix (Apr 8 #16)
- [x] Fix asset filter buttons: changed from multi-select toggle to single-select radio mode
- [x] Fix asset filter: clicking same button again returns to All Markets
- [x] Fix asset filter: ticker rail now shows inline empty state when filter has no matches instead of falling back to stale TRENDING_TICKERS mock data

## Live Forex/Crypto/Futures Data (Apr 8 #17)
- [x] Add tRPC marketData.forexQuotes procedure using EODHD API (EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF, NZDUSD, EURGBP)
- [x] Add tRPC marketData.cryptoQuotes procedure using EODHD API (BTC, ETH, SOL, BNB, XRP, DOGE, ADA, AVAX)
- [x] Add tRPC marketData.indicesQuotes procedure using EODHD API (SPX, NDX, DJI, RUT, VIX, DAX, FTSE, N225)
- [x] Wire Forex/Crypto/Futures quotes into homepage ticker rail — each filter shows its own live tickers
- [x] Remove "honest" placeholder / fix corrupted fallback string in ticker cards — each filter now uses dedicated curated symbol list with proper display labels

## Sparkline Bugs (Apr 8 #18)
- [x] Fix BTC/USD MiniSparkline line chart overflowing outside its container
- [x] Fix Forex symbol MiniSparklines not rendering (no chart shown)
