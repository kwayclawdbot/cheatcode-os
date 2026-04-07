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
