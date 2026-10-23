/**
 * Memory-bounded TTL cache utility for high-concurrency read endpoints.
 * Prevents database connection exhaustion under 400K concurrent users
 * with automatic time-to-live and LRU-style eviction on capacity bounds.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class BoundedTtlCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly maxEntries: number = 5000,
    private readonly defaultTtlMs: number = 30000
  ) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlMs: number = this.defaultTtlMs): void {
    const now = Date.now();

    // If cache is at capacity, prune expired first
    if (this.cache.size >= this.maxEntries) {
      for (const [k, e] of this.cache.entries()) {
        if (e.expiresAt <= now) {
          this.cache.delete(k);
        }
      }
      // If still at capacity, evict oldest 20% entries (FIFO / LRU-like)
      if (this.cache.size >= this.maxEntries) {
        const evictCount = Math.max(1, Math.floor(this.maxEntries * 0.2));
        const keys = Array.from(this.cache.keys()).slice(0, evictCount);
        for (const k of keys) {
          this.cache.delete(k);
        }
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: now + ttlMs,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Global bounded cache instances for hot endpoints
export const profileCache = new BoundedTtlCache<any>(5000, 30 * 1000); // 30 sec TTL
export const heatmapCache = new BoundedTtlCache<any>(2000, 60 * 1000); // 60 sec TTL
export const recoveryCache = new BoundedTtlCache<any>(2000, 60 * 1000); // 60 sec TTL
export const adminStatsCache = new BoundedTtlCache<any>(10, 10 * 1000); // 10 sec TTL

/**
 * Invalidates all cached user state when they submit a new typing session or update profile
 */
export function invalidateUserCaches(userId: string): void {
  profileCache.delete(`profile:${userId}`);
  heatmapCache.delete(`heatmap:${userId}`);
  recoveryCache.delete(`recovery:${userId}`);
  adminStatsCache.clear(); // Clear admin aggregates so new sessions reflect immediately
}
