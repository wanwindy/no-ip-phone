export const RATE_LIMIT_STORE = Symbol('RATE_LIMIT_STORE');

export const RATE_LIMIT_DRIVER_MEMORY = 'memory' as const;
export const RATE_LIMIT_DRIVER_REDIS = 'redis' as const;
export const RATE_LIMIT_RETRY_COOLDOWN_MS_DEFAULT = 30_000;

export type RateLimitDriver =
  | typeof RATE_LIMIT_DRIVER_MEMORY
  | typeof RATE_LIMIT_DRIVER_REDIS;

export function resolveRateLimitDriver(value?: string): RateLimitDriver {
  return value === RATE_LIMIT_DRIVER_REDIS
    ? RATE_LIMIT_DRIVER_REDIS
    : RATE_LIMIT_DRIVER_MEMORY;
}

export function resolveRateLimitFallbackAllowed(
  nodeEnv: string,
  value?: string,
): boolean {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return nodeEnv !== 'production';
}

export function resolveRateLimitRetryCooldownMs(value?: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : RATE_LIMIT_RETRY_COOLDOWN_MS_DEFAULT;
}
