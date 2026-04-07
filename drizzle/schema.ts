import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  float,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Trader Profiles ──────────────────────────────────────────────────────────
export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  handle: varchar("handle", { length: 64 }).unique(),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  bannerUrl: text("bannerUrl"),
  assetClasses: json("assetClasses").$type<string[]>(),
  tradingStyle: varchar("tradingStyle", { length: 64 }),
  experienceYears: varchar("experienceYears", { length: 32 }),
  xp: int("xp").default(0).notNull(),
  level: varchar("level", { length: 32 }).default("Rookie").notNull(),
  totalTrades: int("totalTrades").default(0).notNull(),
  wins: int("wins").default(0).notNull(),
  losses: int("losses").default(0).notNull(),
  followerCount: int("followerCount").default(0).notNull(),
  followingCount: int("followingCount").default(0).notNull(),
  isCoach: boolean("isCoach").default(false).notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  brokerConnected: boolean("brokerConnected").default(false).notNull(),
  watchlist: json("watchlist").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// ─── Feed Posts ───────────────────────────────────────────────────────────────
export const feedPosts = mysqlTable("feed_posts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  postType: mysqlEnum("postType", ["trade_idea", "pnl_share", "market_take", "chart_post"]).notNull(),
  body: text("body"),
  ticker: varchar("ticker", { length: 16 }),
  direction: mysqlEnum("direction", ["bullish", "bearish", "neutral"]),
  entryPrice: float("entryPrice"),
  targetPrice: float("targetPrice"),
  stopPrice: float("stopPrice"),
  timeframe: varchar("timeframe", { length: 32 }),
  outcome: mysqlEnum("outcome", ["open", "win", "loss", "breakeven"]).default("open"),
  outcomePrice: float("outcomePrice"),
  outcomeAt: timestamp("outcomeAt"),
  pnlAmount: float("pnlAmount"),
  pnlPercent: float("pnlPercent"),
  screenshotUrl: text("screenshotUrl"),
  brokerVerified: boolean("brokerVerified").default(false),
  likeCount: int("likeCount").default(0).notNull(),
  commentCount: int("commentCount").default(0).notNull(),
  repostCount: int("repostCount").default(0).notNull(),
  bookmarkCount: int("bookmarkCount").default(0).notNull(),
  kaiScore: int("kaiScore"),
  kaiOneLiner: text("kaiOneLiner"),
  bullishVotes: int("bullishVotes").default(0).notNull(),
  bearishVotes: int("bearishVotes").default(0).notNull(),
  tags: json("tags").$type<string[]>(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeedPost = typeof feedPosts.$inferSelect;
export type InsertFeedPost = typeof feedPosts.$inferInsert;

// ─── Post Interactions ────────────────────────────────────────────────────────
export const postInteractions = mysqlTable("post_interactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  postId: int("postId").notNull(),
  type: mysqlEnum("type", ["like", "bookmark", "repost", "bullish_vote", "bearish_vote"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Post Comments ────────────────────────────────────────────────────────────
export const postComments = mysqlTable("post_comments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  userId: int("userId").notNull(),
  parentId: int("parentId"),
  body: text("body").notNull(),
  likeCount: int("likeCount").default(0).notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Follows ──────────────────────────────────────────────────────────────────
export const follows = mysqlTable("follows", {
  id: int("id").autoincrement().primaryKey(),
  followerId: int("followerId").notNull(),
  followingId: int("followingId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── XP Log ───────────────────────────────────────────────────────────────────
export const xpLog = mysqlTable("xp_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  refId: varchar("refId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── User Badges ──────────────────────────────────────────────────────────────
export const userBadges = mysqlTable("user_badges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  badge: varchar("badge", { length: 64 }).notNull(),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
});

// ─── Journal Entries ──────────────────────────────────────────────────────────
export const journalEntries = mysqlTable("journal_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ticker: varchar("ticker", { length: 16 }).notNull(),
  direction: mysqlEnum("direction", ["long", "short"]).notNull(),
  entryPrice: float("entryPrice").notNull(),
  exitPrice: float("exitPrice"),
  stopPrice: float("stopPrice"),
  targetPrice: float("targetPrice"),
  positionSize: float("positionSize"),
  pnlAmount: float("pnlAmount"),
  pnlPercent: float("pnlPercent"),
  outcome: mysqlEnum("outcome", ["win", "loss", "breakeven", "open"]).default("open"),
  setupType: varchar("setupType", { length: 64 }),
  preTradeThesis: text("preTradeThesis"),
  exitReason: varchar("exitReason", { length: 128 }),
  postTradeReflection: text("postTradeReflection"),
  emotionalState: varchar("emotionalState", { length: 32 }),
  ruleViolations: json("ruleViolations").$type<string[]>(),
  kaiAnalysis: text("kaiAnalysis"),
  entryChartUrl: text("entryChartUrl"),
  exitChartUrl: text("exitChartUrl"),
  entryDate: timestamp("entryDate"),
  exitDate: timestamp("exitDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = typeof journalEntries.$inferInsert;

// ─── Login Streaks ────────────────────────────────────────────────────────────
export const loginStreaks = mysqlTable("login_streaks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  lastLoginDate: varchar("lastLoginDate", { length: 10 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Learn Progress ───────────────────────────────────────────────────────────
export const learnProgress = mysqlTable("learn_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pathId: varchar("pathId", { length: 64 }).notNull(),
  lessonId: varchar("lessonId", { length: 64 }).notNull(),
  completed: boolean("completed").default(false).notNull(),
  quizPassed: boolean("quizPassed").default(false).notNull(),
  quizScore: int("quizScore"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Chat Messages ───────────────────────────────────────────────────────────
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  channelId: varchar("channelId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  username: varchar("username", { length: 64 }).notNull(),
  avatarInitials: varchar("avatarInitials", { length: 4 }).notNull(),
  avatarColor: varchar("avatarColor", { length: 16 }).notNull(),
  badge: varchar("badge", { length: 32 }),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
// ─── Video Comments ─────────────────────────────────────────────────────────────
export const videoComments = mysqlTable("video_comments", {
  id: int("id").autoincrement().primaryKey(),
  videoId: varchar("videoId", { length: 128 }).notNull(),
  userId: int("userId").notNull(),
  username: varchar("username", { length: 64 }).notNull(),
  avatarInitials: varchar("avatarInitials", { length: 4 }).notNull(),
  avatarColor: varchar("avatarColor", { length: 16 }).notNull(),
  body: text("body").notNull(),
  replyToId: int("replyToId"),
  likeCount: int("likeCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VideoComment = typeof videoComments.$inferSelect;
export type InsertVideoComment = typeof videoComments.$inferInsert;

// ─── Coach Applications ─────────────────────────────────────────────────────────
export const coachApplications= mysqlTable("coach_applications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  tradingStyle: varchar("tradingStyle", { length: 64 }),
  yearsExperience: varchar("yearsExperience", { length: 32 }),
  specialties: json("specialties").$type<string[]>(),
  bio: text("bio"),
  socialLinks: json("socialLinks").$type<Record<string, string>>(),
  sampleContent: text("sampleContent"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
