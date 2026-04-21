"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryRateLimitStore = void 0;
class MemoryRateLimitStore {
    buckets = new Map();
    async reserveOnce(key, ttlMs) {
        const now = Date.now();
        this.pruneExpired(key, now);
        if (this.buckets.has(key)) {
            return false;
        }
        this.buckets.set(key, {
            count: 1,
            expiresAt: now + ttlMs,
        });
        return true;
    }
    async increment(key, ttlMs) {
        const now = Date.now();
        const bucket = this.pruneExpired(key, now);
        if (!bucket) {
            this.buckets.set(key, {
                count: 1,
                expiresAt: now + ttlMs,
            });
            return 1;
        }
        bucket.count += 1;
        return bucket.count;
    }
    async delete(key) {
        this.buckets.delete(key);
    }
    pruneExpired(key, now) {
        const bucket = this.buckets.get(key);
        if (!bucket) {
            return null;
        }
        if (bucket.expiresAt <= now) {
            this.buckets.delete(key);
            return null;
        }
        return bucket;
    }
}
exports.MemoryRateLimitStore = MemoryRateLimitStore;
