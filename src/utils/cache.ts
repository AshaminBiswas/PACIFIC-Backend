/**
 * High-Performance In-Memory Cache with TTL, Request Coalescing & Stampede Prevention
 * Delivers sub-millisecond response times for master lookups, reference data, and precomputed aggregates.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  hitRatio: string;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private maxEntries = 2500;
  private hits = 0;
  private misses = 0;

  constructor() {
    // Periodic sweep every 5 minutes to release expired RAM
    if (typeof setInterval !== 'undefined') {
      const interval = setInterval(() => this.sweep(), 5 * 60 * 1000);
      if (interval.unref) interval.unref();
    }
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    if (this.store.size >= this.maxEntries) {
      // Evict oldest 10% when capacity reached
      const keysToDelete = Array.from(this.store.keys()).slice(0, Math.floor(this.maxEntries * 0.1));
      for (const k of keysToDelete) {
        this.store.delete(k);
      }
    }
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Request Coalescing (Single-Flight Stampede Shield)
   * If a query is already running, concurrent requests join the same Promise.
   * If cached, returns immediately from memory with zero database overhead.
   */
  async coalesce<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key) as Promise<T>;
    }

    const promise = (async () => {
      try {
        const result = await fetcher();
        if (result !== undefined && result !== null) {
          this.set(key, result, ttlSeconds);
        }
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  invalidate(keyOrPrefix: string): void {
    for (const key of this.store.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const ratio = total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0.0%';
    return {
      hits: this.hits,
      misses: this.misses,
      keys: this.store.size,
      hitRatio: ratio,
    };
  }
}

export const memoryCache = new MemoryCache();
