"use strict";
/**
 * High-Performance In-Memory Cache with TTL
 * Used for static and master lookup datasets (Packet Natures, Hardware Catalog, Templates)
 * to deliver sub-5ms response times on high-throughput ERP endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryCache = void 0;
class MemoryCache {
    constructor() {
        this.store = new Map();
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.data;
    }
    set(key, data, ttlSeconds = 300) {
        this.store.set(key, {
            data,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }
    invalidate(keyOrPrefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(keyOrPrefix)) {
                this.store.delete(key);
            }
        }
    }
    clear() {
        this.store.clear();
    }
}
exports.memoryCache = new MemoryCache();
//# sourceMappingURL=cache.js.map