export interface RateLimitStore {
  reserveOnce(key: string, ttlMs: number): Promise<boolean>;
  increment(key: string, ttlMs: number): Promise<number>;
  delete(key: string): Promise<void>;
}
