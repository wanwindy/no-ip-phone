import { Logger } from '@nestjs/common';
import { RATE_LIMIT_RETRY_COOLDOWN_MS_DEFAULT } from './rate-limit.constants';
import { RateLimitStore } from './rate-limit.store';

type FailoverRateLimitStoreOptions = {
  retryCooldownMs?: number;
};

export class FailoverRateLimitStore implements RateLimitStore {
  private retryPrimaryAfter = 0;

  constructor(
    private readonly primary: RateLimitStore,
    private readonly fallback: RateLimitStore,
    private readonly logger: Logger,
    private readonly options: FailoverRateLimitStoreOptions = {},
  ) {}

  activateFallback(reason: string): void {
    this.openFallbackCircuit(reason);
  }

  async reserveOnce(key: string, ttlMs: number): Promise<boolean> {
    return this.execute(
      'reserveOnce',
      () => this.primary.reserveOnce(key, ttlMs),
      () => this.fallback.reserveOnce(key, ttlMs),
    );
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    return this.execute(
      'increment',
      () => this.primary.increment(key, ttlMs),
      () => this.fallback.increment(key, ttlMs),
    );
  }

  async delete(key: string): Promise<void> {
    return this.execute(
      'delete',
      () => this.primary.delete(key),
      () => this.fallback.delete(key),
    );
  }

  private async execute<T>(
    action: string,
    primaryAction: () => Promise<T>,
    fallbackAction: () => Promise<T>,
  ): Promise<T> {
    if (this.isFallbackActive()) {
      return fallbackAction();
    }

    try {
      const result = await primaryAction();
      this.clearFallbackCircuit(action);
      return result;
    } catch (error) {
      this.openFallbackCircuit(
        `Redis rate limit store failed during ${action}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return fallbackAction();
    }
  }

  private get retryCooldownMs(): number {
    return this.options.retryCooldownMs ?? RATE_LIMIT_RETRY_COOLDOWN_MS_DEFAULT;
  }

  private isFallbackActive(now = Date.now()): boolean {
    return now < this.retryPrimaryAfter;
  }

  private clearFallbackCircuit(action: string): void {
    if (this.retryPrimaryAfter === 0) {
      return;
    }

    this.retryPrimaryAfter = 0;
    this.logger.log(
      `Redis rate limit store recovered during ${action}, resuming primary usage`,
    );
  }

  private openFallbackCircuit(reason: string): void {
    const retryAt = Date.now() + this.retryCooldownMs;
    this.retryPrimaryAfter = retryAt;
    this.logger.warn(
      `${reason}. Using memory fallback until ${new Date(retryAt).toISOString()}`,
    );
  }
}
