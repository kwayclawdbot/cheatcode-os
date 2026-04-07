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
