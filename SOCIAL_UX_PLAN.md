# CheatCode OS — Social Trading Platform UX Architecture

**Version 1.0 | April 2026**

---

## Design Philosophy

The guiding principle for CheatCode's social layer is **signal over noise**. Every major social trading platform that has failed — StockTwits becoming spam-heavy, eToro's feed becoming a vanity contest, Reddit's WallStreetBets becoming a meme machine — has done so by optimizing for volume of posts rather than quality of ideas. CheatCode must be the opposite: a place where every post earns its place, every trade idea is structured, and the community is organized around learning and accountability.

The UX should feel like **Bloomberg Terminal meets Instagram meets Discord** — professional enough to be taken seriously, visual enough to be addictive, and communal enough to keep people coming back daily.

---

## Information Architecture

The platform is organized into five primary destinations, accessible from a persistent top navigation bar. Each destination has a clear, singular purpose. Nothing overlaps.

```
CheatCode OS
├── 1. Home Feed          — Your personalized social trading feed
├── 2. Terminal           — Trade with your community in real-time
├── 3. Learn              — Curated video + education content (existing)
├── 4. Intelligence       — Kai's AI ticker analysis (existing)
└── 5. Profile / Community — Your profile, leaderboard, live rooms
```

The key insight is that **Home Feed replaces the current "Home" page** as the primary destination for logged-in users. The current Home (Today in the Market, video picks) becomes a tab within the Feed called "Discover" — surfaced to users who haven't followed anyone yet, or as a secondary tab alongside their social feed.

---

## Surface 1: Home Feed

The feed is the heartbeat of the platform. It is a single, vertically scrolling column — not a grid, not a masonry layout — because trading is time-sensitive and chronological order matters. Think Twitter/X's timeline, but every post has structure.

### Feed Tabs

| Tab | Content | Default |
|---|---|---|
| **Following** | Posts from people you follow | ✅ Logged-in users |
| **Discover** | Kai-curated videos + trending trade ideas | ✅ Logged-out / new users |
| **Trending** | Top posts by engagement in the last 24h | — |
| **Live Now** | Active live streams, sorted by viewer count | — |

### Post Types

The feed supports exactly **four post types** — no more. Each has a fixed structure so the feed never feels chaotic.

**1. Trade Idea**
The most important post type. Structured like a thesis, not a tweet.
- Ticker symbol (required, auto-links to Intelligence page)
- Direction: Bullish / Bearish / Neutral
- Timeframe: Day / Swing / Position / Long-term
- Entry zone, Target, Stop Loss (optional but encouraged)
- Thesis text (max 500 characters)
- Attached chart screenshot or TradingView snapshot (optional)
- Outcome tracking: once the trade closes, the post auto-updates with ✅ Win / ❌ Loss / ⏳ Open

**2. Profit / Loss Share**
A screenshot-first post type. The image is the content.
- Upload screenshot (P&L statement, brokerage confirmation, chart)
- Optional caption (max 280 characters)
- Ticker tags (auto-extracted from image via OCR if possible, or manual)
- Verified badge if connected to a supported broker API

**3. Market Take**
A quick text opinion — the closest thing to a tweet. For real-time market commentary.
- Text only (max 280 characters)
- Ticker tags (optional)
- Sentiment tag: Bullish / Bearish / Cautious / Neutral

**4. Chart Post**
An annotated chart shared directly from the Terminal or TradingView.
- Chart image (required)
- Ticker + timeframe (auto-populated from Terminal)
- Annotation notes (optional)
- Links back to the ticker's Intelligence page

### Feed Card Design

Every post card follows the same visual hierarchy regardless of type:
1. **User avatar + name + badge + time** — top left
2. **Post type pill** (Trade Idea / P&L Share / Market Take / Chart) — top right
3. **Content area** — ticker header (if applicable), then text, then media
4. **Engagement bar** — Like, Comment, Repost, Bookmark, Share

Cards are clean white (light mode) / dark (#1a2035, dark mode) with a single left-border accent color keyed to sentiment: CC Green for bullish, CC Red for bearish, amber for neutral.

---

## Surface 2: Composer

The post composer is a **bottom sheet on mobile, a centered modal on desktop** — triggered by a persistent floating "+" button (bottom-right on mobile, in the nav on desktop). It never navigates away from the current page.

The composer opens to a type selector first (four post types as large icon tiles), then expands into the relevant form. This prevents users from staring at a blank text box and ensures every post has structure from the start.

---

## Surface 3: User Profiles

A profile page is a trader's public identity on CheatCode. It should communicate three things at a glance: **who they are, how they trade, and whether they're worth following**.

### Profile Layout

```
[Cover image / banner]
[Avatar]  [Name]  [Badge: Free / Pro / Elite / Verified Creator]
[Bio — 160 chars]
[Stats row: Posts | Followers | Following | Win Rate | Avg Return]

[Tabs]
├── Posts        — All posts in reverse chronological order
├── Trade Ideas  — Only Trade Idea posts, with outcome tracking
├── P&L          — Only P&L Share posts
└── Charts       — Only Chart posts
```

### Win Rate & Accountability

The single most important trust signal on a trader's profile is their **tracked win rate** — the percentage of their Trade Idea posts that closed as wins. This is calculated automatically from posts where the user marked an outcome. It is displayed prominently on the profile and on every Trade Idea post card.

Users who connect a verified broker account get a **Verified P&L** badge, meaning their profit screenshots are confirmed against actual trade data — not fabricated.

---

## Surface 4: Community Rooms (replacing current Terminal chat)

The current Terminal has a community chat sidebar. This evolves into a full **Rooms** system — persistent, topic-organized spaces that feel like Discord channels but are designed specifically for trading.

### Room Types

| Type | Description | Example |
|---|---|---|
| **Market Rooms** | Always-on, organized by asset class | #stocks-general, #crypto, #futures, #forex |
| **Ticker Rooms** | Auto-created for any ticker with >10 followers | #NVDA, #BTC, #ES1 |
| **Strategy Rooms** | Organized by trading style | #options-flow, #swing-trading, #scalping |
| **Creator Rooms** | Private rooms for Pro/Elite subscribers of a creator | Mark Minervini's Room |
| **Live Rooms** | Temporary rooms created when someone goes live | disappear after stream ends |

### Room Features

Each room has three panels: a **chat feed** (real-time messages), a **pinned chart** (a shared TradingView widget that the room moderator controls), and a **trade ideas sidebar** (the last 5 Trade Idea posts tagged to this room's ticker/topic).

---

## Surface 5: Live Streaming

Live streaming is the highest-engagement feature and should be treated as a premium, gated experience — not something every user can do on day one.

### Who Can Go Live

| Tier | Can Go Live | Max Viewers |
|---|---|---|
| Free | ❌ | — |
| Pro ($29/mo) | ✅ | 50 |
| Elite ($99/mo) | ✅ | 500 |
| Verified Creator | ✅ | Unlimited |

### Live Room UX

When a user goes live, a **Live Room** is created automatically. The layout is:
- **Left 70%**: The live video feed (full-height)
- **Right 30%**: Live chat + a pinned chart the streamer can update in real-time
- **Bottom bar**: Viewer count, duration, tip/subscribe CTA

Viewers can react with emoji (fire, rocket, bear, bull) that float up the screen — identical to Instagram Live reactions. The streamer can pin a Trade Idea to the top of chat, share their screen (showing their actual trading platform), or switch to a "Chart Mode" that replaces the video with a full-screen TradingView chart while keeping audio.

### Discovery

Live streams surface in three places:
1. A **"Live Now" tab** in the Home Feed
2. A **live indicator** (red dot + viewer count) on the streamer's profile avatar throughout the platform
3. A **push notification** to followers when someone they follow goes live

---

## Surface 6: Leaderboard

The leaderboard is a **weekly and all-time ranking** of traders by tracked performance. It is not a vanity metric — it is filtered to only include users with at least 10 tracked Trade Ideas, preventing gaming.

### Leaderboard Categories

| Category | Metric | Filter |
|---|---|---|
| **Top Traders** | Win rate × avg return | Min 10 tracked ideas |
| **Most Accurate** | Win rate only | Min 10 tracked ideas |
| **Biggest Gains** | Highest single verified P&L | Verified broker only |
| **Most Followed** | Follower count | No minimum |
| **Rising Stars** | Follower growth this week | Joined < 90 days ago |

---

## Navigation Structure

The top navigation evolves for logged-in users:

```
[Logo]  [Feed]  [Terminal]  [Learn]  [Intelligence]  [Live]  |  [Search]  [Notifications]  [+Post]  [Profile]
```

The **[+ Post]** button is always visible and always opens the composer. The **[Live]** link shows a red dot when anyone the user follows is currently live.

On mobile, the top nav collapses to a bottom tab bar with five icons: Feed, Terminal, + (composer), Notifications, Profile.

---

## Onboarding Flow

New users should reach their first meaningful social interaction within **60 seconds** of signing up. The onboarding flow is:

1. **Sign up** (email or Google)
2. **Pick your trading style** (Day Trading / Swing / Options / Crypto / Long-term) — 1 screen, 5 tiles
3. **Pick 3 tickers you watch** — pre-populated with the most-followed tickers
4. **Follow 3 suggested traders** — curated by CheatCode based on style match
5. **Land on the Feed** — already populated with content from followed traders + Discover

Total: 4 screens, no friction, immediate value.

---

## What We Are NOT Building

To keep the platform focused and prevent it from becoming noisy, the following are explicitly out of scope:

- **Meme/GIF posts** — CheatCode is not Reddit. No meme post type.
- **Anonymous accounts** — Every user must have a display name and avatar. No throwaway accounts.
- **Unstructured text walls** — Market Takes are capped at 280 characters. Trade Ideas have required fields. Structure is enforced.
- **Paid signal groups** — No "DM me for my picks" culture. All trade ideas are public and tracked.
- **Crypto pump groups** — Any coordinated pump activity results in permanent ban. Moderation is built into the platform from day one.

---

## Build Phases

| Phase | Features | Complexity |
|---|---|---|
| **Phase 1** | Feed UI, post cards (all 4 types), composer modal, profile page shell | Low — frontend only |
| **Phase 2** | Supabase schema (posts, follows, likes, comments), real-time feed updates | Medium |
| **Phase 3** | Win rate tracking, outcome marking on Trade Ideas, leaderboard | Medium |
| **Phase 4** | Broker verification (Alpaca/Tradier API), Verified P&L badge | High |
| **Phase 5** | Live streaming via Mux or 100ms, Live Rooms, notifications | High |

---

## Open Questions for Review

1. **Should the social feed replace the current Home page entirely**, or should it live at `/feed` while the current curated Home stays at `/`?
2. **Should Trade Ideas require a stop loss**, or should it be optional to lower the barrier to posting?
3. **Should the Leaderboard be public** (visible to non-logged-in users) or members-only?
4. **For live streaming**, do you want to go with Mux (broadcast quality, higher cost) or 100ms (interactive, free tier available)?
5. **Should Rooms be open to all users** or gated behind Pro/Elite for some categories?
