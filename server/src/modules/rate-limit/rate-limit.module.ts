import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RateLimitService } from './rate-limit.service';
import {
  RATE_LIMIT_DRIVER_MEMORY,
  RATE_LIMIT_DRIVER_REDIS,
  RATE_LIMIT_STORE,
  resolveRateLimitDriver,
  resolveRateLimitFallbackAllowed,
  resolveRateLimitRetryCooldownMs,
} from './rate-limit.constants';
import { MemoryRateLimitStore } from './memory-rate-limit.store';
import { RedisRateLimitStore } from './redis-rate-limit.store';
import { FailoverRateLimitStore } from './failover-rate-limit.store';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RATE_LIMIT_STORE,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RateLimitModule');
        const rawDriver = configService.get<string>(
          'RATE_LIMIT_DRIVER',
          RATE_LIMIT_DRIVER_MEMORY,
        );
        const driver = resolveRateLimitDriver(rawDriver);
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const allowFallback = resolveRateLimitFallbackAllowed(
          nodeEnv,
          configService.get<string>('RATE_LIMIT_ALLOW_FALLBACK'),
        );
        const retryCooldownMs = resolveRateLimitRetryCooldownMs(
          configService.get<string>('RATE_LIMIT_RETRY_COOLDOWN_MS'),
        );
        const memoryStore = new MemoryRateLimitStore();

        if (rawDriver !== RATE_LIMIT_DRIVER_MEMORY && rawDriver !== RATE_LIMIT_DRIVER_REDIS) {
          logger.warn(
            `Unsupported RATE_LIMIT_DRIVER=${rawDriver}, falling back to memory`,
          );
        }

        if (driver === RATE_LIMIT_DRIVER_REDIS) {
          const redisStore = new RedisRateLimitStore(configService, logger);
          const failoverStore = new FailoverRateLimitStore(
            redisStore,
            memoryStore,
            logger,
            { retryCooldownMs },
          );

          try {
            await redisStore.connect();
            logger.log(
              allowFallback
                ? 'Rate limit driver initialized with Redis and recoverable memory fallback'
                : 'Rate limit driver initialized with Redis',
            );
            return allowFallback ? failoverStore : redisStore;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            if (!allowFallback) {
              throw new Error(
                `RATE_LIMIT_DRIVER=redis but Redis is unavailable and fallback is disabled: ${message}`,
              );
            }

            failoverStore.activateFallback(
              `RATE_LIMIT_DRIVER=redis but Redis is unavailable at startup: ${message}`,
            );
            logger.warn(
              `Rate limit driver initialized in memory fallback mode, Redis will be retried every ${retryCooldownMs}ms`,
            );
            return failoverStore;
          }
        }

        logger.log('Rate limit driver initialized with memory');
        return memoryStore;
      },
    },
    RateLimitService,
  ],
  exports: [RateLimitService],
})
export class RateLimitModule {}
