/**
 * High-Performance In-Memory Cache with TTL
 * Used for static and master lookup datasets (Packet Natures, Hardware Catalog, Templates)
 * to deliver sub-5ms response times on high-throughput ERP endpoints.
 */
declare class MemoryCache {
    private store;
    get<T>(key: string): T | null;
    set<T>(key: string, data: T, ttlSeconds?: number): void;
    invalidate(keyOrPrefix: string): void;
    clear(): void;
}
export declare const memoryCache: MemoryCache;
export {};
//# sourceMappingURL=cache.d.ts.map