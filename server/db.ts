import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, profiles, chatMessages, InsertChatMessage, videoComments, InsertVideoComment, VideoComment } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Watchlist helpers ───────────────────────────────────────────────────────

export async function getWatchlist(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ watchlist: profiles.watchlist }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return rows[0]?.watchlist ?? [];
}

export async function setWatchlist(userId: number, symbols: string[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (existing.length > 0) {
    await db.update(profiles).set({ watchlist: symbols }).where(eq(profiles.userId, userId));
  } else {
    await db.insert(profiles).values({ userId, watchlist: symbols });
  }
}

// ─── Chat helpers ───────────────────────────────────────────────────────────

export async function getChatHistory(channelId: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.channelId, channelId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  return rows.reverse(); // oldest first for display
}

export async function saveChatMessage(msg: InsertChatMessage) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(chatMessages).values(msg);
  return result;
}

// ─── Video Comment helpers ─────────────────────────────────────────────────────────

export async function getVideoComments(videoId: string, limit = 100): Promise<VideoComment[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(videoComments)
    .where(eq(videoComments.videoId, videoId))
    .orderBy(desc(videoComments.createdAt))
    .limit(limit);
  return rows.reverse(); // oldest first
}

export async function saveVideoComment(comment: InsertVideoComment): Promise<VideoComment | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(videoComments).values(comment);
  const insertId = (result as any).insertId as number;
  const [inserted] = await db.select().from(videoComments).where(eq(videoComments.id, insertId));
  return inserted ?? null;
}

export async function getVideoCommentById(commentId: number): Promise<VideoComment | null> {
  const db = await getDb();
  if (!db) return null;
  const [comment] = await db.select().from(videoComments).where(eq(videoComments.id, commentId));
  return comment ?? null;
}

export async function deleteVideoComment(commentId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(videoComments).where(eq(videoComments.id, commentId));
}

export async function likeVideoComment(commentId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [comment] = await db.select().from(videoComments).where(eq(videoComments.id, commentId));
  if (!comment) return 0;
  const newCount = comment.likeCount + 1;
  await db.update(videoComments).set({ likeCount: newCount }).where(eq(videoComments.id, commentId));
  return newCount;
}

// TODO: add feature queries here as your schema grows.
