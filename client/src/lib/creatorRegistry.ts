/**
 * CheatCode OS — Creator Registry
 *
 * Auto-generation system for creator profiles.
 *
 * HOW IT WORKS:
 * ─────────────
 * When new content arrives on the platform (via the backend curation pipeline),
 * the backend's `run_curation_cycle()` in `curation.py` processes videos for
 * creators that already exist in the `creators` table.
 *
 * To AUTO-REGISTER a new creator when their content is first detected:
 *   1. Backend: The curation pipeline should call `ensure_creator_exists(channel_id)`
 *      before processing any video. If the creator doesn't exist, it fetches their
 *      YouTube channel metadata (name, avatar, description, tags) and POSTs to
 *      `POST /admin/creators` to create the record.
 *   2. Frontend: This registry module handles the frontend side — it fetches the
 *      latest creator list from the API, merges it with mock data for any creators
 *      not yet in the API, and provides a unified creator lookup.
 *
 * FRONTEND AUTO-GENERATION FLOW:
 * ────────────────────────────────
 * 1. `syncCreatorRegistry()` — called on app mount — fetches all creators from API
 * 2. New creators from API are merged into the local registry
 * 3. Any creator in the API but not in mockData gets a generated profile (color, bio, etc.)
 * 4. The registry is stored in localStorage for offline access
 * 5. Components use `getCreator(id)` to get the full profile
 *
 * BACKEND INTEGRATION (for Claude Code):
 * ────────────────────────────────────────
 * Add this to `backend/app/services/curation.py` inside `run_curation_cycle()`:
 *
 * ```python
 * async def ensure_creator_exists(db, youtube_channel_id: str, yt_api_key: str) -> dict | None:
 *     """Auto-register a creator from their YouTube channel if not already in DB."""
 *     existing = db.table("creators").select("id").eq("youtube_channel_id", youtube_channel_id).execute()
 *     if existing.data:
 *         return existing.data[0]
 *
 *     # Fetch channel metadata from YouTube Data API
 *     url = f"https://www.googleapis.com/youtube/v3/channels?part=snippet&id={youtube_channel_id}&key={yt_api_key}"
 *     resp = requests.get(url).json()
 *     if not resp.get("items"):
 *         return None
 *
 *     channel = resp["items"][0]["snippet"]
 *     slug = channel["customUrl"].lstrip("@").lower() if channel.get("customUrl") else youtube_channel_id
 *     avatar_url = channel["thumbnails"].get("high", {}).get("url") or channel["thumbnails"].get("default", {}).get("url")
 *
 *     new_creator = {
 *         "name": channel["title"],
 *         "slug": slug,
 *         "platform": "youtube",
 *         "youtube_channel_id": youtube_channel_id,
 *         "avatar_url": avatar_url,
 *         "description": channel.get("description", "")[:500],
 *         "quality_score": 0.7,  # Default score; updated after first content analysis
 *         "tags": [],
 *         "is_active": True,
 *     }
 *
 *     result = db.table("creators").insert(new_creator).execute()
 *     logger.info(f"Auto-registered new creator: {channel['title']} ({slug})")
 *     return result.data[0] if result.data else None
 * ```
 */

import { fetchCreators, type Creator } from "./api";
import { creators as mockCreators } from "./mockData";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegistryCreator {
  id: string;           // slug (used in URLs)
  name: string;
  slug: string;
  platform: string;
  avatarUrl: string;
  description: string;
  qualityScore: number;
  tags: string[];
  contentCount: number;
  color: string;        // Brand color for UI (generated if not in mockData)
  verified: boolean;
  // Enriched from mockData (if available)
  bio?: string;
  handle?: string;
  specialty?: string;
  youtubeUrl?: string;
  topTickers?: string[];
  kaiTake?: string;
}

// ─── Color generation ─────────────────────────────────────────────────────────

const BRAND_COLORS = [
  "#4DC820", // CC Green
  "#00AEEF", // CC Cyan
  "#E8193C", // CC Red
  "#7B2FBE", // CC Purple
  "#F79009", // Amber
  "#2E90FA", // Blue
  "#12B76A", // Emerald
  "#EE46BC", // Pink
  "#F04438", // Rose
  "#0EA5E9", // Sky
];

function generateColor(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length];
}

// ─── Normalization ────────────────────────────────────────────────────────────

function normalizeCreator(apiCreator: Creator): RegistryCreator {
  // Try to find enriched data in mockData
  const mock = mockCreators.find(
    m => m.id === apiCreator.slug || m.name.toLowerCase() === apiCreator.name.toLowerCase()
  );

  return {
    id: apiCreator.slug,
    name: apiCreator.name,
    slug: apiCreator.slug,
    platform: apiCreator.platform,
    avatarUrl: apiCreator.avatar_url || mock?.avatarUrl || "",
    description: apiCreator.description || mock?.bio || "",
    qualityScore: apiCreator.quality_score,
    tags: apiCreator.tags,
    contentCount: apiCreator.content_count,
    color: mock?.color || generateColor(apiCreator.slug),
    verified: apiCreator.quality_score >= 0.7,
    // Enriched fields from mockData
    bio: mock?.bio || apiCreator.description || undefined,
    handle: mock?.handle || `@${apiCreator.slug}`,
    specialty: mock?.specialty || apiCreator.tags
      .slice(0, 2)
      .map(t => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
      .join(", "),
    youtubeUrl: mock?.youtubeUrl || (
      apiCreator.platform === "youtube"
        ? `https://youtube.com/@${apiCreator.slug}`
        : undefined
    ),
    topTickers: mock?.topTickers || [],
    kaiTake: mock?.kaiTake || `${apiCreator.name} is a curated creator on CheatCode. Their content has been analyzed by Kai for signal quality and market relevance.`,
  };
}

// ─── Registry Storage ─────────────────────────────────────────────────────────

const REGISTRY_KEY = "cc-creator-registry";
const REGISTRY_TTL = 5 * 60 * 1000; // 5 minutes

interface StoredRegistry {
  creators: RegistryCreator[];
  fetchedAt: number;
}

function loadFromStorage(): RegistryCreator[] | null {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return null;
    const stored: StoredRegistry = JSON.parse(raw);
    if (Date.now() - stored.fetchedAt > REGISTRY_TTL) return null;
    return stored.creators;
  } catch {
    return null;
  }
}

function saveToStorage(creators: RegistryCreator[]) {
  try {
    const stored: StoredRegistry = { creators, fetchedAt: Date.now() };
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(stored));
  } catch {
    // localStorage might be full — ignore
  }
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

let _registry: RegistryCreator[] | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sync the creator registry from the API.
 * Call this once on app mount (e.g., in App.tsx useEffect).
 * Falls back to mockData if the API is unavailable.
 */
export async function syncCreatorRegistry(): Promise<RegistryCreator[]> {
  // Return cached if fresh
  if (_registry) return _registry;

  // Try localStorage cache
  const cached = loadFromStorage();
  if (cached) {
    _registry = cached;
    return cached;
  }

  try {
    const apiCreators = await fetchCreators();
    const registry = apiCreators.map(normalizeCreator);

    // Merge in any mock creators not yet in the API (for local dev)
    const apiSlugs = new Set(registry.map(c => c.id));
    const mockOnly = mockCreators
      .filter(m => !apiSlugs.has(m.id))
      .map(m => ({
        id: m.id,
        name: m.name,
        slug: m.id,
        platform: "youtube",
        avatarUrl: m.avatarUrl || "",
        description: m.bio || "",
        qualityScore: 0.8,
        tags: m.tags || [],
        contentCount: m.videoCount,
        color: m.color,
        verified: true,
        bio: m.bio,
        handle: m.handle,
        specialty: m.specialty,
        youtubeUrl: m.youtubeUrl,
        topTickers: m.topTickers,
        kaiTake: m.kaiTake,
      } as RegistryCreator));

    const merged = [...registry, ...mockOnly];
    _registry = merged;
    saveToStorage(merged);
    return merged;
  } catch {
    // API unavailable — fall back to mock data
    const fallback = mockCreators.map(m => ({
      id: m.id,
      name: m.name,
      slug: m.id,
      platform: "youtube",
      avatarUrl: m.avatarUrl || "",
      description: m.bio || "",
      qualityScore: 0.8,
      tags: m.tags || [],
      contentCount: m.videoCount,
      color: m.color,
      verified: true,
      bio: m.bio,
      handle: m.handle,
      specialty: m.specialty,
      youtubeUrl: m.youtubeUrl,
      topTickers: m.topTickers,
      kaiTake: m.kaiTake,
    } as RegistryCreator));
    _registry = fallback;
    return fallback;
  }
}

/**
 * Get a single creator by slug/id.
 * Returns null if not found.
 */
export function getCreator(id: string): RegistryCreator | null {
  if (!_registry) return null;
  return _registry.find(c => c.id === id || c.slug === id) ?? null;
}

/**
 * Get all creators in the registry.
 * Returns empty array if registry hasn't been synced yet.
 */
export function getAllCreators(): RegistryCreator[] {
  return _registry ?? [];
}

/**
 * Invalidate the registry cache (call after adding a new creator).
 */
export function invalidateRegistry() {
  _registry = null;
  localStorage.removeItem(REGISTRY_KEY);
}
