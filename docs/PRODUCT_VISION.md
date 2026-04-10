# CheatCode OS — Product Vision

**Version 3.0 | April 2026**
**Status: Active — Defines the north star for all product decisions**

---

## One-Line Identity

CheatCode is the social trading platform where traders build reputation, learn in public, and compete for status — powered by AI.

---

## Core Thesis

In the era of AI, signals, analysis, education, and terminals all get commoditized to zero. The only durable moat is **community** — the people you trade with, the reputation you build, the accountability that makes you better.

CheatCode is not a dashboard. It's not a signals app. It's not an LMS. It's **where traders live**.

Everything on the platform orbits community:
- Intelligence is what the community is watching, powered by Kai
- Terminal is where you trade alongside your crew, not alone
- Learn is how you rank up, not a separate education site
- Coaches are verified members who earned their status
- Content is what members create and share

---

## The Five Pillars

### 1. Community Feed (the core)

The feed is the homepage. When you log in, you land in the community — not a dashboard, not a Netflix shelf. You see real traders posting setups, sharing wins and losses, debating market direction.

**Post types:**
- **Trade Idea** — structured thesis with ticker, direction, entry/target/stop, timeframe. System tracks outcome automatically. Win/loss updates on the card.
- **P&L Share** — screenshot-first. Optional broker verification proves it's real.
- **Market Take** — 280-char quick opinion with sentiment tag. The trading tweet.
- **Chart Post** — annotated chart from Terminal or TradingView.

**Feed tabs:**
- Following (default for logged-in users)
- Discover (default for new/logged-out users)
- Trending (top engagement last 24h)
- Live Now (active streams)

**Key rules (what we are NOT building):**
- No meme/GIF posts. CheatCode is not Reddit.
- No anonymous accounts.
- No unstructured text walls (280 char cap on takes, structured fields on trade ideas).
- No "DM me for picks" culture. All trade ideas are public and tracked.
- No pump groups. Coordinated pump activity = permanent ban.

### 2. Swipe Feed (the virality engine)

Trade ideas and curated content surfaced as swipeable cards — Tinder for trades.

**How it works:**
- Trade ideas from the community + Kai radar signals appear as full-screen cards
- Swipe right = fire (bullish / interested) → earns XP
- Swipe left = pass
- Toggle filter: All / Videos / Trade Ideas
- Cards show: ticker, direction, score, thesis, poster profile + level badge

**Why this matters:**
- Low-friction engagement (swipe is easier than scrolling a feed)
- Discovery mechanic for new users who don't follow anyone yet
- Engagement data feeds trending algorithms
- Shareable — "I swiped right on 4 out of 5 winners this week" becomes a flex

### 3. YouTube University (the education engine)

An LMS built on top of YouTube. No original video content needed day one. CheatCode curates existing YouTube trading education into structured learning paths with AI-generated quizzes.

**Structure:**
- Learning paths organized by level: Beginner → Intermediate → Advanced
- Each path = sequence of curated YouTube videos with context
- After each video: AI-generated quiz (3-5 questions testing comprehension)
- Pass the quiz → earn XP → unlock next lesson
- Complete a path → earn certification badge on your profile

**Current learning paths (from existing build):**

| Path | Level | Lessons | Duration |
|------|-------|---------|----------|
| Stock Market 101 | Beginner | 8 | 4h 30m |
| Technical Analysis Basics | Beginner | 10 | 5h 15m |
| Options Fundamentals | Intermediate | 12 | 6h 00m |
| Swing Trading & VCP Setups | Intermediate | 14 | 7h 30m |
| Macro & Sector Rotation | Advanced | — | — |
| Advanced Options Structures | Advanced | — | — |

**YouTube integration:**
- Videos embed directly (no hosting costs)
- AI watches the video transcript and generates quiz questions
- Progress tracked per user in Supabase
- Coaches can create custom paths using any YouTube content

**The hook:** Beginners enter CheatCode to learn for free. They rank up through education. By the time they're intermediate, they're embedded in the community and posting trade ideas. Education is the acquisition funnel for the social platform.

### 4. Coaches & Creator Economy (the monetization flywheel)

Anyone who levels up high enough becomes eligible to create paid products. CheatCode takes a rev share. Coaches bring their audience to the platform.

**Coach capabilities:**
- Create subscription products (monthly access to their content/room)
- Create one-time products (courses, playbooks, signal groups)
- Build subgroups / private rooms with their subscribers
- Host live sessions (gated to their subscribers)
- Revenue share model (platform takes 20-30%, coach keeps 70-80%)

**Coach verification:**
- Must reach Veteran level (5,000+ XP) minimum
- Must have tracked trade ideas with verified win rate
- Profile displays: rating, subscriber count, products, verified status
- Featured coaches promoted on Coaches Corner directory

**AI trading coaches (paid tier feature):**
- Kai serves as the base AI coach for all users (5 messages/day free, unlimited on Pro)
- Paid tiers unlock specialized AI coaching personas:
  - **Scalper Kai** — intraday setups, momentum plays, quick entries
  - **Swing Kai** — multi-day setups, VCP patterns, sector rotation
  - **Options Kai** — spreads, Greeks analysis, premium selling
- AI coaches know your journal history, watchlist, trading style, and past mistakes
- Weekly AI review: top 3 wins, top 3 losses, pattern analysis, focus for next week

**Coach KB integration:**
The platform has 1,949 knowledge base chunks and 102 coach demos already in Supabase. These power the AI coaching layer — Kai doesn't just analyze tickers, it teaches using the pedagogy and frameworks from real trading educators.

### 5. Gamification & Status (the retention loop)

Every action on CheatCode earns or costs status. The platform rewards contribution, accountability, and skill — not just showing up.

---

## Trader Identity System

### The Profile Card

Every user has a Trader Profile Card — a compact, scannable identity block visible on their profile, every post, and in search results.

**Four layers of identity:**

**Layer 1 — Asset Classes** (what you trade)

| Badge | Color |
|-------|-------|
| Stocks | CC Blue `#00AEEF` |
| Options | CC Purple `#7B2FBE` |
| Futures | CC Red `#E8193C` |
| Forex | CC Amber `#F79009` |
| Crypto | CC Green `#4DC820` |
| ETFs | Slate |
| Bonds | Slate |

**Layer 2 — Trading Style** (how you trade)
Single-select. Defines core identity.

| Style | Description |
|-------|-------------|
| Day Trader | In and out same day |
| Scalper | Seconds to minutes |
| Swing Trader | 2–14 days |
| Investor | Long-term growth |
| Income Trader | Yield via options, dividends |
| Options Strategist | Structures & spreads |
| Algo / Quant | Systematic, rules-based |

**Layer 3 — Experience Level** (where you are)
Self-reported at onboarding, auto-updated as XP accumulates.

| Level | XP Range | Badge Color | Unlocks |
|-------|----------|-------------|---------|
| Rookie | 0–499 | Gray | Basic feed, post, follow |
| Apprentice | 500–1,999 | Green | Strategy Rooms, custom watchlist alerts |
| Trader | 2,000–4,999 | Blue | Trading Journal full access, leaderboard eligibility |
| Veteran | 5,000–9,999 | Purple | Creator Room access, ability to create custom Rooms, coach eligibility |
| Elite | 10,000–24,999 | Gold | Priority feed placement, early access to new features |
| Legend | 25,000+ | Gradient | Permanent top-of-feed placement, direct line to CheatCode team |

**Layer 4 — Verification Badges** (trust signals — earned, not self-reported)

| Badge | How Earned |
|-------|-----------|
| Verified P&L | Connected broker account with confirmed trade history |
| Journal Active | Logged at least 20 trades in the Trading Journal |
| Certified | Completed a CheatCode Learn certification path |
| Creator | Verified content creator with 1,000+ followers |
| Top 100 | Ranked in the weekly leaderboard top 100 |

### XP System

XP is behavioral signal, not vanity. Every XP-earning action makes the platform better. Passive consumption earns nothing. Active contribution earns everything.

**XP Earning Actions:**

| Action | XP | Notes |
|--------|----|-------|
| Complete onboarding | +100 | One-time |
| Connect brokerage | +500 | One-time per broker |
| Post a Trade Idea | +25 | Per post |
| Trade Idea closes as Win | +75 | Requires outcome tracking |
| Trade Idea closes as Loss (respected stop) | +25 | Accountability rewarded |
| Trade Idea closes as Loss (blown stop) | 0 | No reward for reckless losses |
| Post a P&L Share | +20 | Per post |
| Post a Market Take | +10 | Per post |
| Log a Journal Entry | +15 | Max 3/day |
| Complete a Learn lesson | +50 | Per lesson |
| Complete a Learn certification | +500 | Per certification |
| Receive 10 likes on a post | +30 | Per milestone |
| Gain a new follower | +10 | Per follower |
| Daily login streak (7 days) | +100 | Per streak |
| Daily login streak (30 days) | +500 | Per streak |
| Verified P&L post (broker-confirmed) | +100 | Per verified post |
| Go live (min 15 min) | +150 | Per stream |
| Swipe feed engagement (right swipe on winner) | +10 | Rewards good judgment |

### Shareable Profile Cards

Users can export their profile as an image card for sharing on Instagram, Twitter/X, TikTok. The card shows:
- Name, handle, avatar
- Level badge + XP progress
- Win rate + total tracked trades
- Top badges earned
- "Trade with me on CheatCode" CTA

This is the primary organic acquisition mechanic. "I'm a Level 4 Veteran on CheatCode with a 68% win rate" becomes a social flex that drives signups.

### Trade Idea Tracking

The most important accountability feature. When a user posts a Trade Idea with entry/target/stop:
1. System monitors the ticker price against the stated levels
2. When target or stop is hit, the post auto-updates: Win or Loss
3. User's win rate recalculates across all tracked ideas
4. Win rate displayed on profile and every future post
5. Leaderboard rankings update weekly

This solves the fundamental problem with every other trading social platform: nobody tracks who was actually right.

---

## Leaderboard

Weekly and all-time rankings. Filtered to prevent gaming.

| Category | Metric | Filter |
|----------|--------|--------|
| Top Traders | Win rate x avg return | Min 10 tracked ideas |
| Most Accurate | Win rate only | Min 10 tracked ideas |
| Biggest Gains | Highest single verified P&L | Verified broker only |
| Most Followed | Follower count | No minimum |
| Rising Stars | Follower growth this week | Joined < 90 days ago |

---

## Community Rooms (Subgroups)

Persistent, topic-organized spaces. Discord channels built for trading.

| Room Type | Description | Example |
|-----------|-------------|---------|
| Market Rooms | Always-on, by asset class | #stocks-general, #crypto, #futures |
| Ticker Rooms | Auto-created when ticker has >10 followers | #NVDA, #BTC, #ES1 |
| Strategy Rooms | Organized by style | #options-flow, #swing-trading, #scalping |
| Creator Rooms | Private rooms for coach subscribers | Mark's Room, Kai's Room |
| Live Rooms | Temporary, created when someone goes live | Disappear after stream |

**Room features:**
- Chat feed (real-time messages)
- Pinned chart (shared TradingView widget, moderator-controlled)
- Trade ideas sidebar (last 5 ideas tagged to this room's ticker/topic)

**Anyone at Veteran level (5,000+ XP) can create custom rooms** — this is the subgroup mechanic. Build a following, create a room, monetize it.

---

## Live Sessions (Stories-Style)

Live sessions follow the Instagram/Snapchat pattern — not a separate page buried in navigation.

### The Live Strip

A horizontal scrollable strip at the top of the Feed, above all posts. Always visible. This is the highest-priority real estate on the platform.

```
[LIVE 🔴 Coach Mark] [LIVE 🔴 @alphatrader] [LIVE 🔴 Kai Market Open] [+ Go Live]
```

**How it looks:**
- Circular avatars with a pulsing red/green ring (CheatCode brand gradient when live)
- Username + "LIVE" label underneath
- Sorted by: followed users first, then by viewer count
- When nobody is live: strip shows recent replays (grayed ring, "2h ago") and a "Schedule a Live" prompt
- Tapping an avatar opens the live session full-screen (mobile) or as an overlay (desktop)

### Live Session UX

**Mobile (primary experience):**
- Full-screen vertical video (like IG Live)
- Chat messages float up from bottom-left
- Emoji reactions float up (fire, rocket, bear, bull, 100)
- Pinned trade idea card at top of chat (streamer can pin one)
- Ticker tag visible at top: "Talking about $NVDA"
- Swipe up on pinned card → opens Kai intelligence for that ticker inline
- Bottom bar: comment input, share, tip/subscribe CTA

**Desktop:**
- Overlay panel (right side, 40% width) or theater mode
- Video + chat side by side
- Pinned chart widget below video (TradingView, moderator-controlled)
- Can pop out to full terminal with live audio still playing

### Live Features

- **Chart Mode** — streamer switches from camera to full-screen TradingView chart while keeping audio. Essential for showing setups.
- **Screen Share** — streamer shares their actual trading platform. Viewers see real execution.
- **Co-host** — invite another trader to join the live (split screen, like IG Live collab)
- **Clip it** — viewers can clip the last 30 seconds, which becomes a shareable post in the feed. Clips earn the streamer XP.
- **Replay** — lives auto-save as replays visible in the stories strip for 24h, then move to the streamer's profile
- **Scheduled Lives** — coaches/creators can schedule lives in advance. Followers get a push notification 15 min before.

### Who Can Go Live

| Level | Can Go Live | Max Viewers |
|-------|-------------|-------------|
| Free (below Veteran) | No | — |
| Veteran (5,000+ XP) | Yes | 50 |
| Elite subscriber | Yes | 500 |
| Creator (verified) | Yes | Unlimited |

Going live earns +150 XP (minimum 15 minutes). Clips created from your live earn +10 XP each.

### Discovery

Lives surface in three places:
1. **Stories strip** at the top of the Feed (primary)
2. **Red dot + viewer count** on the streamer's avatar everywhere on the platform
3. **Push notification** to followers when someone they follow goes live

---

## Contextual Terminal

The Terminal exists as both a standalone page and as embeddable components throughout the social experience.

### Standalone Terminal (/terminal)
Full Bloomberg-lite layout for focused analysis. TradingView chart + instrument panel + watchlist + community chat. This stays as-is for power users who want to sit down and work.

### Embedded Terminal Components

| Context | What Renders | Interaction |
|---------|-------------|-------------|
| Trade idea post | Mini chart with entry/target/stop drawn on it | Tap → expands to full terminal with that ticker |
| Swipe feed card | Sparkline chart (SparklineChart component) | Visual price action at a glance |
| Community room | Pinned TradingView chart, moderator-controlled | Shared context for room discussion |
| Live session | Chart Mode replaces video with full TradingView | Streamer annotates live, viewers follow along |
| Intelligence inline | Kai score + key levels rendered on post card | No page navigation needed |

### Intelligence Inside Posts

When someone posts a trade idea on $NVDA, the card auto-enriches:
- Kai conviction score (ring widget)
- Key support/resistance levels
- One-liner from Kai: "AMD strength pulling semis, NVDA testing $875 resistance with volume"
- Sentiment badge from community (bullish/bearish vote ratio)

No separate Intelligence page visit required. The intelligence lives where the conversation happens.

---

## Trading Journal

Private by default. The most powerful individual growth tool on the platform.

**Entry structure:**

Auto-populated (from broker or manual):
- Ticker, direction, entry/exit price, dates, position size, P&L, fees

User-filled (the intelligence layer):
- Setup type (VCP, Breakout, Reversal, Earnings Play, etc.)
- Pre-trade thesis (why did you enter?)
- Entry chart screenshot
- Exit reason (Hit Target / Hit Stop / Manual Exit / Held Too Long / Exited Too Early / News Event)
- Post-trade reflection (what went well? what would you change?)
- Emotional state (Calm → Anxious → Confident → Impulsive → Fearful)
- Rule violations (Moved stop, Sized too large, Chased entry, Ignored stop)

**Journal Dashboard:**
1. Performance Overview — total trades, win rate, avg win/loss, profit factor, 90-day P&L curve
2. Kai Pattern Analysis — AI surfaces patterns the user can't see themselves
3. Rule Violation Tracker — heatmap of which rules you break most and how they correlate with losses
4. Weekly Review — Kai generates personalized Sunday review with top wins, losses, lessons, focus for next week

**Journal + Social Integration:**
Users can share journal entries to the feed as "Trade Recap" posts — the highest-quality post type. Shows trade summary, entry/exit chart, and reflection. Earns +50 XP.

**Broker auto-import:**
Connected broker → trades auto-imported → notification: "Your NVDA trade closed. Add your reflection to earn 15 XP." → habit loop.

---

## Onboarding Flow

Goal: first meaningful social interaction within 60 seconds of signup.

| Screen | Purpose | Details |
|--------|---------|---------|
| 1. Welcome | Entry | Logo animation + "Get Started" CTA |
| 2. What do you trade? | Asset classes | Multi-select tile grid (Stocks, Options, Futures, Forex, Crypto, ETFs, Bonds) |
| 3. How do you trade? | Trading style | Single-select (Day Trader, Scalper, Swing, Investor, Income, Options Strategist, Algo) |
| 4. Experience level | Self-assessment | Horizontal progression: Just Starting → <1yr → 1-3yr → 3-7yr → 7+yr |
| 5. Your watchlist | Ticker personalization | Searchable input, pre-populated suggestions based on asset class, up to 20 tickers |
| 6. Follow traders | Social seed | 6 algorithmically matched traders based on style + assets + experience. Must follow at least 1. |
| 7. Connect broker | Optional | Grid of supported brokers. +500 XP bonus. "Skip for now" available but de-emphasized. |

**Landing state:** After onboarding, user lands on the Feed — already populated with content from followed traders + Discover content matching their profile. Welcome banner: "Welcome to CheatCode, [Name]. Your feed is ready."

---

## Monetization

### Tier Structure

**Free ($0 forever)**
- Full community access (feed, post, follow, comment, react)
- Swipe feed
- YouTube University (all free learning paths + quizzes)
- Basic profile with XP and badges
- Browse all curated content
- Discover/trending content
- Topic and creator browsing
- Limited Kai messages (5/day)

**Pro ($99/month) — Trade Ideas + Alerts**
- Everything in Free
- Community trade ideas with outcome tracking
- Real-time trade alerts (breakout, momentum, swing)
- Full intelligence breakdowns (evidence chains)
- Trading Journal full access
- All learning paths (including Advanced)
- Leaderboard eligibility
- Ad-free experience
- Daily Morning Prep briefing
- Unlimited Kai chat

**Elite ($197/month) — AI Alerts + Coaches + Algo**
- Everything in Pro
- AI-powered alerts (Kai scans market autonomously, not just community-sourced)
- AI coach personas (Scalper Kai, Swing Kai, Options Kai) with personalized guidance
- Algorithmic scanning tools (sector rotation, convergence signals, dark pool flow)
- Access to all coach content and live sessions
- Bulk ticker analysis (up to 50/day)
- Custom alert thresholds
- Priority support
- Live streaming (unlimited viewers)
- Early access to new features

**Creator (rev share)**
- Available to Veteran+ level users
- Create subscription products (monthly)
- Create one-time products (courses, playbooks)
- Build private rooms
- Host gated live sessions
- Platform takes 20-30%, creator keeps 70-80%

### Revenue Streams

1. **Subscriptions** — Pro ($99) + Elite ($197) monthly recurring
2. **Creator rev share** — percentage of all coach/creator product sales
3. **Broker referrals** — affiliate revenue from brokerage connections
4. **Sponsored content** — native ad placements in Discover feed (clearly labeled)

---

## Design Language

**Selected direction: "Spotify Card"** — Content-first platform design. Clean but never sterile. Confident but never loud.

**Principles:**
1. Cards are the atomic unit — videos, tickers, creators, trade ideas
2. White space is intentional — breathing room signals quality
3. Color is semantic — green=bullish, red=bearish, amber=watch, blue=AI/Kai
4. Content is the hero — UI chrome is invisible

**Color:**
- Base: White `#FFFFFF`
- Brand accent: CC Green `#4DC820`
- Text: Near-black `#101828`
- Card bg: `#F9FAFB`
- Semantic: Green (bullish), Red `#E8193C` (bearish), Amber `#F79009` (neutral), Blue `#00AEEF` (Kai/AI), Purple `#7B2FBE` (options/premium)

**Typography:**
- Display: Sora (geometric, modern)
- Body: Inter (clean, legible)
- Data/scores: JetBrains Mono (clinical precision)
- Labels: All-caps Inter, 11px, 1.5px letter-spacing

**Signature elements:**
- Score Ring — circular progress ring on every ticker card
- Horizontal content rows — Spotify-style shelves
- Kai bubble — persistent bottom-right chat, subtle pulse
- Level badges — colored pills on every post and profile

---

## Navigation

**Desktop (logged in):**
```
[Logo]  [Feed]  [Terminal]  [Learn]  [Intelligence]  [Journal]  |  [Search]  [Notifications]  [+ Post]  [Avatar + Level Badge]
```

**Mobile bottom tab:**
```
[Feed]  [Terminal]  [+ Post]  [Journal]  [Profile]
```

Feed is the default landing page for logged-in users. The current Netflix-shelf Home becomes the "Discover" tab within the feed for new/logged-out users.

---

## Technical Status (What Exists Today)

### Frontend Pages Built

| Page | File | Status |
|------|------|--------|
| Home (Netflix shelves) | `Home.tsx` | Live, pulls from Railway API |
| Community (ticker hub + feed) | `CommunityPage.tsx` | Built, seed/mock data |
| Social Feed | `FeedPage.tsx` | Built, mock data, 4 post types |
| Swipe Feed | `SwipeFeedPage.tsx` | Built, pulls from Kai radar |
| Trader Profile | `TraderProfilePage.tsx` | Built, XP/badge system, mock data |
| Terminal | `TerminalPage.tsx` | Built, TradingView + chat |
| Intelligence | `IntelligencePage.tsx` | Live, Kai-powered |
| Learn | `LearnPage.tsx` | Built, static learning paths |
| Coaches Corner | `CoachesCornerPage.tsx` | Built, directory layout |
| Kai Chat | `KaiAssistPage.tsx` | Built, full chat UI |
| Onboarding | `OnboardingPage.tsx` | Built, 7 screens |
| Pricing | `PricingPage.tsx` | Built, 3 tiers |
| Discover | `DiscoverPage.tsx` | Built |
| Coach Profile | `CoachProfilePage.tsx` | Built |
| Coach Apply | `CoachApplyPage.tsx` | Built |
| Coach Dashboard | `CoachDashboard.tsx` | Built |

### Supabase Schema (Main Project)

| Table | Rows | Ready for community? |
|-------|------|---------------------|
| `users` | 29 | Yes — real users |
| `conversation_history` | 2,094 | Yes — real Kai convos |
| `coach_kb_chunks` | 1,949 | Yes — powers AI coaching |
| `kb_chunks` | 2,297 | Yes — knowledge base |
| `content` | 280 | Yes — curated content |
| `content_items` | 113 | Yes — additional content |
| `feed_posts` | 0 | Schema ready, no data |
| `post_interactions` | 0 | Schema ready, no data |
| `post_comments` | 0 | Schema ready, no data |
| `follows` | 0 | Schema ready, no data |
| `journal_entries` | 0 | Schema ready, no data |
| `user_xp_log` | 0 | Schema ready, no data |
| `user_badges` | 0 | Schema ready, no data |
| `user_events` | 0 | Schema ready, no data |
| `profiles` | 1 | Needs expansion |

### Supabase Schema (FTA Project)

| Table | Rows | Relevant? |
|-------|------|-----------|
| `courses` | 35 | Yes — YouTube University paths |
| `modules` | 17 | Yes — path structure |
| `lessons` | 46 | Yes — individual lessons |
| `badges` | 10 | Yes — achievement system |
| `quizzes` | 0 | Schema ready for AI quizzes |
| `quiz_attempts` | 0 | Ready |
| `lesson_progress` | 0 | Ready |
| `sim_portfolios` | 2 | Paper trading |
| `sim_trades` | 2 | Paper trading |
| `coach_demos` | 102 | AI coaching demos |

### Backend Infrastructure

| System | Status | Purpose |
|--------|--------|---------|
| Kai SMS Alerts | Live (credits issue) | Personalized morning briefings to 29 users |
| Railway (strong-strength) | 12 services, 6 stopped | Kai crons: news-intel, content, alerts, watchlist |
| Supabase (main) | Active, healthy | Users, convos, content, social schema |
| Supabase (FTA) | Active, healthy | Courses, lessons, quizzes, coaching |
| Supabase (Sales CRM) | Active, healthy | 18K contacts, product agents |
| Vault (local) | 797+ files | Agent knowledge base, Kai intel |
| Coach KB | 1,949 chunks | Trading education for AI coaching |

---

## Build Priority

### Phase 1: Community Core (highest priority)
Make the feed the homepage. Wire auth → real posts → real follows. This is the foundation everything else depends on.

- Auth flow (email + Google)
- Feed as default landing page (logged-in)
- Post creation (all 4 types) writing to Supabase
- Follow/unfollow wired to Supabase
- Like/comment/repost real interactions
- Basic profile with real data
- Onboarding flow connected to backend

### Phase 2: Gamification & Status
Make participation addictive. Every action earns XP. Every level unlocks something real.

- XP system backend (accumulation, level calculation)
- XP notifications (toast on every earn)
- Level badges on all post cards and profiles
- Shareable profile card export (image generation)
- Basic leaderboard (most followed, rising stars)

### Phase 3: Trade Tracking & Accountability
The killer differentiator. Nobody else tracks who was right.

- Price monitoring service for posted trade ideas
- Auto win/loss marking when target/stop hit
- Win rate calculation on profiles
- Leaderboard: Top Traders, Most Accurate
- Trading Journal UI (manual entry first)

### Phase 4: YouTube University
The acquisition funnel. Free education that hooks beginners into the community.

- YouTube embed in learning paths
- AI quiz generation from video transcripts
- Progress tracking per user
- Certification badges on completion
- XP rewards per lesson and certification

### Phase 5: Creator Economy
The monetization flywheel. Coaches bring audiences, platform takes rev share.

- Coach application and verification flow
- Subscription product creation
- Private rooms for subscribers
- Rev share payment system (Stripe Connect)
- Coach dashboard with analytics

### Phase 6: AI Coaching Layer
Differentiation through AI that knows you.

- Kai personas (Scalper, Swing, Options) on paid tiers
- Journal pattern analysis (Kai reads your trade history)
- Weekly AI review generation
- Personalized lesson recommendations based on trading weaknesses

### Phase 7: Advanced Social
Depth features that increase retention and time-on-platform.

- Broker connection + auto-import (Alpaca first)
- Verified P&L badges
- Live streaming (100ms)
- Strategy Rooms / custom subgroups
- Swipe feed XP integration

---

## Success Metrics

| Metric | Target (6 months) | Why it matters |
|--------|-------------------|----------------|
| DAU / MAU ratio | >40% | Daily habit = community health |
| Posts per day | >100 | Content density = feed quality |
| Trade ideas with outcomes | >50% of posted ideas | Accountability adoption |
| Avg session time | >8 minutes | Engagement depth |
| Free → Pro ($99) conversion | >5% | Monetization efficiency |
| Pro → Elite ($197) upgrade | >15% | Upsell efficiency |
| Coach rev share GMV | >$10K/month | Creator economy traction |
| Organic signup rate | >30% of new users | Shareable profiles working |

---

## What This Is NOT

- Not a signals app. Signals are a byproduct of community activity, not the product.
- Not a Bloomberg terminal. The terminal exists to serve the community, not the other way around.
- Not an LMS. Education exists to get people into the community, not as a standalone product.
- Not a media site. Content exists because members create and share it.
- Not eToro. No copy-trading. Traders learn and execute independently.
- Not WallStreetBets. Structure is enforced. Noise is punished. Signal is rewarded.

---

## The Daily Loop

The product succeeds when users do this every morning:

1. Open CheatCode at 8:55 AM
2. Check the feed — what are people watching today?
3. Read Kai's morning briefing (or listen via AI coach)
4. Swipe through trade ideas on the swipe feed
5. Post their own setup or market take
6. Check the leaderboard — how do they rank this week?
7. Enter a trade, log it in the journal
8. Come back at close to mark outcomes and reflect

That's a daily habit. That's retention. That's a moat AI can't replicate.
