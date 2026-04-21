import { RateLimitStore } from './rate-limit.store';

type Bucket = {
  count: number;
  expiresAt: number;
};

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();

  async reserveOnce(key: string, ttlMs: number): Promise<boolean> {
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

  async increment(key: string, ttlMs: number): Promise<number> {
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

  async delete(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  private pruneExpired(key: string, now: number): Bucket | null {
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
