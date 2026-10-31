/**
 * Pacific Restroom Cubicle Enterprise ERP — High-Throughput Analytics Cache
 * 
 * Supports 1,000–2,000+ concurrent user scalability by preventing database thrashing
 * on high-frequency dashboard queries and synchronized reporting period lookups.
 * 
 * Target: Standard dashboard API P95 < 2s, Filtered analytics P95 < 3s.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  lastAccessed: number;
}

export class AnalyticsMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxEntries: number;
  private defaultTtlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(maxEntries = 1000, defaultTtlSeconds = 30) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlSeconds * 1000;

    // Background cleanup timer every 60 seconds
    setInterval(() => this.purgeExpired(), 60000).unref();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.lastAccessed = Date.now();
    this.hits++;
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds?: number): void {
    if (this.cache.size >= this.maxEntries) {
      this.evictLru();
    }

    const ttl = (ttlSeconds ?? (this.defaultTtlMs / 1000)) * 1000;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      lastAccessed: Date.now(),
    });
  }

  invalidatePattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern, 'i');
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  clear(): void {
    this.cache.clear();
  }

  getMetrics() {
    const totalRequests = this.hits + this.misses;
    const hitRatio = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRatioPct: Math.round(hitRatio * 10) / 10,
    };
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private evictLru(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

export const analyticsCache = new AnalyticsMemoryCache(1000, 30);
