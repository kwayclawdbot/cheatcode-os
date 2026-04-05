# CheatCode OS — Social Trading Platform UX Architecture
## Version 2.0 | April 2026

---

## Design Philosophy

CheatCode OS is built on a single conviction: **the best traders are made, not born, and they are made in community**. The platform's social layer exists not to create noise, but to create accountability, identity, and growth. Every feature — from onboarding to the trading journal to the XP system — is designed to answer one question for every user: *Am I getting better?*

The UX must feel like **Bloomberg Terminal meets Duolingo meets Instagram** — professional enough to be taken seriously, gamified enough to be addictive, and social enough to keep people coming back daily. Crucially, it must never feel like a casino or a pump-and-dump forum. Structure, accountability, and signal-to-noise ratio are non-negotiable.

---

## Part 1: Trader Identity System

### 1.1 The Trader Profile Card

Every user on CheatCode has a **Trader Profile Card** — a compact, scannable identity block that appears on their profile page, on every post they make, and in search results. It is the visual language of who you are as a trader.

The card contains four layers of identity information, displayed as colored pill badges:

**Layer 1 — Asset Classes** (what you trade)
These are the markets the user actively participates in. A user can select multiple.

| Badge | Color | Label |
|---|---|---|
| Stocks | CC Blue `#00AEEF` | Stocks |
| Options | CC Purple `#7B2FBE` | Options |
| Futures | CC Red `#E8193C` | Futures |
| Forex | CC Amber `#F79009` | Forex |
| Crypto | CC Green `#4DC820` | Crypto |
| ETFs | Slate | ETFs |
| Fixed Income | Slate | Bonds |

**Layer 2 — Trading Style** (how you trade)
A user selects their primary style. This is a single-select — it defines their core identity.

| Badge | Description |
|---|---|
| Day Trader | Holds no positions overnight |
| Scalper | Ultra-short, seconds to minutes |
| Swing Trader | Holds positions 2–14 days |
| Investor | Buy and hold, long-term growth |
| Income Trader | Generates yield via options, dividends, covered calls |
| Options Strategist | Primarily trades options structures |
| Algo / Quant | Systematic, rules-based trading |

**Layer 3 — Experience Level** (where you are in the journey)
Self-reported on onboarding, but updated automatically as XP accumulates.

| Level | XP Range | Badge Color |
|---|---|---|
| Rookie | 0–499 XP | Gray |
| Apprentice | 500–1,999 XP | Green |
| Trader | 2,000–4,999 XP | Blue |
| Veteran | 5,000–9,999 XP | Purple |
| Elite | 10,000–24,999 XP | Gold |
| Legend | 25,000+ XP | Gradient (all brand colors) |

**Layer 4 — Verification Badges** (trust signals)
These are earned, not self-reported.

| Badge | How Earned |
|---|---|
| ✅ Verified P&L | Connected broker account with confirmed trade history |
| 📊 Journal Active | Logged at least 20 trades in the Trading Journal |
| 🎓 Certified | Completed a CheatCode Learn certification path |
| 🔴 Creator | Verified content creator with 1,000+ followers |
| 🏆 Top 100 | Ranked in the weekly leaderboard top 100 |

---

### 1.2 Onboarding Flow

The onboarding flow is the most important UX in the entire platform. It must accomplish three things: collect enough data to personalize the experience, make the user feel seen and understood, and get them to their first meaningful interaction in under 3 minutes. The flow has **6 screens**, each with a single clear question.

---

**Screen 1 — Welcome**
Full-screen with the CheatCode logo animation (the 4 circles assembling). A single headline: *"The trading platform built for serious traders."* One CTA: **Get Started**. Below it, a smaller link: *Already have an account? Sign in.*

---

**Screen 2 — What do you trade?**
*Headline: "What markets do you trade?"*
*Subtext: "Select all that apply. We'll personalize your feed and tools."*

A grid of large pill tiles — each with an icon, label, and short descriptor. Multi-select. The selected tiles fill with their brand color.

```
[ 📈 Stocks ]      [ ⚡ Options ]
[ 📊 Futures ]     [ 💱 Forex ]
[ ₿  Crypto ]      [ 📦 ETFs ]
[ 🏦 Bonds ]       [ 🌍 Macro ]
```

---

**Screen 3 — How do you trade?**
*Headline: "What's your primary trading style?"*
*Subtext: "This helps us match you with the right community rooms and content."*

Single-select. Large tiles with icons and a one-line description.

```
[ ⚡ Day Trader — In and out same day ]
[ 🔪 Scalper — Seconds to minutes, high frequency ]
[ 📅 Swing Trader — 2 days to 2 weeks ]
[ 🌱 Investor — Long-term growth, buy & hold ]
[ 💰 Income Trader — Yield via options, dividends, covered calls ]
[ 🎯 Options Strategist — Structures & spreads ]
[ 🤖 Algo / Quant — Systematic, rules-based ]
```

---

**Screen 4 — Experience Level**
*Headline: "How long have you been trading?"*
*Subtext: "Be honest — we'll match you with the right content and community."*

Single-select. Five options displayed as a horizontal progression bar with labels.

```
Just Starting  →  < 1 Year  →  1–3 Years  →  3–7 Years  →  7+ Years
```

Each selection maps to an initial XP starting point and unlocks the appropriate experience-level badge.

---

**Screen 5 — What tickers do you watch?**
*Headline: "Add your watchlist"*
*Subtext: "We'll surface content and trade ideas for the tickers you care about."*

A searchable ticker input with pre-populated suggestions based on their asset class selections from Screen 2. Users can add up to 20 tickers. Each added ticker appears as a removable pill.

Pre-populated suggestions:
- Stocks: NVDA, TSLA, AAPL, AMD, META, MSFT, SPY, QQQ
- Crypto: BTC, ETH, SOL, XRP
- Futures: ES1!, NQ1!, CL1!, GC1!
- Forex: EUR/USD, GBP/USD, USD/JPY

---

**Screen 6 — Follow Your First Traders**
*Headline: "Follow traders like you"*
*Subtext: "We matched these traders to your style and experience level."*

A curated list of 6 suggested traders, each shown as a card with their avatar, name, style badges, win rate, and a Follow button. Suggestions are algorithmically matched based on the user's style, assets, and experience level from the previous screens. Users must follow at least 1 to proceed.

---

**Screen 7 — Connect Your Brokerage** *(Optional but prominently encouraged)*
*Headline: "Unlock your full trading identity"*
*Subtext: "Connect your brokerage to verify your P&L, auto-import your trades, and unlock the Trading Journal."*

A grid of supported brokers with their logos. Connecting a broker is optional but earns **500 bonus XP** and unlocks the Verified P&L badge immediately.

```
[ Alpaca ]  [ Tradier ]  [ TD Ameritrade ]  [ Interactive Brokers ]
[ Robinhood* ]  [ Webull* ]  [ Coinbase ]  [ Kraken ]
```
*\* Read-only via CSV import initially*

A "Skip for now" link is available but de-emphasized.

---

**Landing State**
After onboarding, the user lands on the **Feed** page, already populated with content from their followed traders and Kai-curated content matching their asset classes and style. A welcome banner at the top says: *"Welcome to CheatCode, [Name]. Your feed is ready."* with a prompt to make their first post.

---

## Part 2: XP & Leveling System

### 2.1 Philosophy

XP is not a vanity metric — it is a **behavioral signal**. Every XP-earning action on CheatCode is something that makes the platform better: posting a trade idea, logging a journal entry, completing a lesson, having a trade idea verified as accurate. Passive consumption earns no XP. Active contribution does.

### 2.2 XP Earning Actions

| Action | XP Earned | Notes |
|---|---|---|
| Complete onboarding | +100 XP | One-time |
| Connect brokerage | +500 XP | One-time per broker |
| Post a Trade Idea | +25 XP | Per post |
| Trade Idea closes as Win (tracked) | +75 XP | Requires outcome marking |
| Trade Idea closes as Loss (tracked) | +25 XP | Accountability rewarded too |
| Post a P&L Share | +20 XP | Per post |
| Post a Market Take | +10 XP | Per post |
| Log a Journal Entry | +15 XP | Per entry, max 3/day |
| Receive 10 likes on a post | +30 XP | Per milestone |
| Gain a new follower | +10 XP | Per follower |
| Complete a Learn lesson | +50 XP | Per lesson |
| Complete a Learn certification | +500 XP | Per certification |
| Daily login streak (7 days) | +100 XP | Per 7-day streak |
| Daily login streak (30 days) | +500 XP | Per 30-day streak |
| Verified P&L post (broker-confirmed) | +100 XP | Per verified post |
| Go live (min 15 min) | +150 XP | Per stream |

### 2.3 Level Tiers & Unlocks

Leveling up is not just cosmetic — each tier unlocks real platform capabilities.

| Level | XP Required | Badge | Unlocks |
|---|---|---|---|
| **Rookie** | 0 | Gray pill | Basic feed, post, follow |
| **Apprentice** | 500 | Green pill | Access to Strategy Rooms, custom watchlist alerts |
| **Trader** | 2,000 | Blue pill | Trading Journal full access, leaderboard eligibility |
| **Veteran** | 5,000 | Purple pill | Creator Room access, ability to create custom Rooms |
| **Elite** | 10,000 | Gold pill | Priority feed placement, early access to new features |
| **Legend** | 25,000 | Gradient pill | Verified Legend badge, permanent top-of-feed placement, direct line to CheatCode team |

### 2.4 XP Display

XP is displayed in three places:
1. **Profile page** — a horizontal progress bar showing current XP, level name, and XP needed for next level
2. **Post cards** — the user's level badge appears next to their name on every post
3. **Notifications** — every XP gain triggers a small toast notification: *"+25 XP — Trade Idea posted"*

---

## Part 3: Trading Journal

### 3.1 Philosophy

The Trading Journal is the most powerful tool on CheatCode for individual growth. It is not a spreadsheet — it is an **intelligent trade diary** that combines manual logging, automatic broker import, AI pattern analysis, and community accountability. The goal is to help traders answer the question they almost never ask: *Why do I keep making the same mistakes?*

### 3.2 Journal Entry Structure

Every journal entry is tied to a single trade and has the following fields:

**Auto-populated (from broker connection or manual):**
- Ticker symbol
- Direction (Long / Short)
- Entry price, Exit price
- Entry date/time, Exit date/time
- Position size
- P&L (dollar and percentage)
- Fees

**User-filled (the intelligence layer):**
- **Setup Type** — the pattern or strategy used (dropdown: VCP, Breakout, Reversal, Earnings Play, Options Spread, etc.)
- **Timeframe** — the chart timeframe the trade was based on
- **Pre-trade thesis** — *Why did you enter this trade?* (text, max 500 chars)
- **Entry chart screenshot** — the chart at the moment of entry
- **Exit reason** — *Why did you exit?* (dropdown: Hit Target / Hit Stop / Manual Exit / Held Too Long / Exited Too Early / News Event)
- **Post-trade reflection** — *What did you do well? What would you do differently?* (text)
- **Emotional state** — a 5-point scale: Calm → Anxious → Confident → Impulsive → Fearful
- **Rule violations** — checkboxes for common trading rule violations (e.g., "Moved stop loss," "Sized too large," "Chased entry," "Ignored stop")

### 3.3 Journal Dashboard

The Journal Dashboard is a personal analytics page that aggregates all logged trades into actionable insights. It has four sections:

**Section 1 — Performance Overview**
A summary card showing: Total trades, Win rate, Average win, Average loss, Profit factor, Best trade, Worst trade, and a 90-day P&L curve chart.

**Section 2 — Pattern Analysis**
Kai analyzes the journal entries and surfaces patterns the user may not see themselves. Examples:
- *"Your win rate on VCP breakouts is 71%, but only 38% on reversal plays. Consider reducing reversal trade frequency."*
- *"You exit winners 40% earlier than your stated target on average. This is costing you an estimated $X/month."*
- *"Your worst trades correlate with 'Impulsive' emotional state tags. Consider a pre-trade checklist."*

**Section 3 — Rule Violation Tracker**
A heatmap showing which trading rules the user violates most frequently, and how those violations correlate with losing trades. This is the most powerful accountability tool on the platform.

**Section 4 — Weekly Review**
Every Sunday, Kai generates a personalized weekly review: top 3 wins, top 3 losses, the week's biggest lesson, and a suggested focus for next week. This is delivered as a notification and stored in the journal.

### 3.4 Journal + Social Integration

The journal is private by default. However, users can **share individual journal entries** to the social feed as a special post type — a "Trade Recap" — which shows the trade summary, entry/exit chart, and reflection. This is the highest-quality post type on the platform because it demonstrates real accountability.

Sharing a journal entry to the feed earns **50 XP** (more than a regular post) and displays a special "Journal Post" badge on the card.

### 3.5 Broker Connection & Auto-Import

When a user connects their brokerage account, trades are automatically imported into the journal within minutes of closing. The auto-import populates all the objective fields (ticker, prices, P&L, size) and then prompts the user to fill in the subjective fields (thesis, reflection, emotional state) via a notification: *"Your NVDA trade closed. Add your reflection to earn 15 XP."*

This creates a powerful habit loop: trade → notification → reflection → XP → level up.

---

## Part 4: Updated Navigation Structure

The navigation evolves significantly to accommodate the new social and journal surfaces.

**Desktop Top Nav (logged in):**
```
[Logo]  [Feed]  [Terminal]  [Learn]  [Intelligence]  [Journal]  |  [Search]  [🔔 Notifications]  [+ Post]  [Avatar + Level Badge]
```

**Mobile Bottom Tab Bar:**
```
[🏠 Feed]  [💻 Terminal]  [+ Post]  [📓 Journal]  [👤 Profile]
```

The **Journal** replaces the Newsletter link in the primary nav for logged-in users (Newsletter moves to a secondary menu). The **+ Post** button is always the center action on mobile, following the Instagram/TikTok pattern.

---

## Part 5: Updated Build Phases

| Phase | Features | Priority |
|---|---|---|
| **Phase 1** | Onboarding flow (all 7 screens), trader profile card, badge system UI | High — sets the identity foundation |
| **Phase 2** | Social feed UI, all 4 post types, composer modal | High — core engagement loop |
| **Phase 3** | XP system backend, level tracking, XP notifications | Medium — retention driver |
| **Phase 4** | Trading Journal UI (manual entry), Journal Dashboard | High — differentiation feature |
| **Phase 5** | Broker connection + auto-import (Alpaca first) | High — unlocks verification |
| **Phase 6** | Kai pattern analysis on journal data | Medium — AI layer |
| **Phase 7** | Leaderboard, Rooms system, follow graph | Medium — community depth |
| **Phase 8** | Live streaming (Mux/100ms) | Low — Phase 2 feature |

---

## Final Decisions (Locked)

| # | Question | Decision |
|---|---|---|
| 1 | Feed vs. Home | Social Feed **replaces** Home for logged-in users. Logged-out users see the curated Discover/Home. |
| 2 | Journal entry gating | **Broker connection required** to unlock the Trading Journal. Ensures data quality and incentivizes connection. |
| 3 | XP for losses | Losses earn XP **only if the R:R was manageable** (i.e., the user respected their stop). A loss with a defined stop = +25 XP. A blown stop or no stop = no XP. |
| 4 | Badge density on post cards | Show only the **most important badge** per layer — trading style + level. Full badge set visible on profile page only. |
| 5 | Live streaming provider | **100ms** — interactive, lower latency, free tier available for early development. |