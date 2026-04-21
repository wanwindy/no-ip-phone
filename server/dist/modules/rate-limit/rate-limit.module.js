"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const rate_limit_service_1 = require("./rate-limit.service");
const rate_limit_constants_1 = require("./rate-limit.constants");
const memory_rate_limit_store_1 = require("./memory-rate-limit.store");
const redis_rate_limit_store_1 = require("./redis-rate-limit.store");
const failover_rate_limit_store_1 = require("./failover-rate-limit.store");
let RateLimitModule = class RateLimitModule {
};
exports.RateLimitModule = RateLimitModule;
exports.RateLimitModule = RateLimitModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            {
                provide: rate_limit_constants_1.RATE_LIMIT_STORE,
                inject: [config_1.ConfigService],
                useFactory: async (configService) => {
                    const logger = new common_1.Logger('RateLimitModule');
                    const rawDriver = configService.get('RATE_LIMIT_DRIVER', rate_limit_constants_1.RATE_LIMIT_DRIVER_MEMORY);
                    const driver = (0, rate_limit_constants_1.resolveRateLimitDriver)(rawDriver);
                    const nodeEnv = configService.get('NODE_ENV', 'development');
                    const allowFallback = (0, rate_limit_constants_1.resolveRateLimitFallbackAllowed)(nodeEnv, configService.get('RATE_LIMIT_ALLOW_FALLBACK'));
                    const retryCooldownMs = (0, rate_limit_constants_1.resolveRateLimitRetryCooldownMs)(configService.get('RATE_LIMIT_RETRY_COOLDOWN_MS'));
                    const memoryStore = new memory_rate_limit_store_1.MemoryRateLimitStore();
                    if (rawDriver !== rate_limit_constants_1.RATE_LIMIT_DRIVER_MEMORY && rawDriver !== rate_limit_constants_1.RATE_LIMIT_DRIVER_REDIS) {
                        logger.warn(`Unsupported RATE_LIMIT_DRIVER=${rawDriver}, falling back to memory`);
                    }
                    if (driver === rate_limit_constants_1.RATE_LIMIT_DRIVER_REDIS) {
                        const redisStore = new redis_rate_limit_store_1.RedisRateLimitStore(configService, logger);
                        const failoverStore = new failover_rate_limit_store_1.FailoverRateLimitStore(redisStore, memoryStore, logger, { retryCooldownMs });
                        try {
                            await redisStore.connect();
                            logger.log(allowFallback
                                ? 'Rate limit driver initialized with Redis and recoverable memory fallback'
                                : 'Rate limit driver initialized with Redis');
                            return allowFallback ? failoverStore : redisStore;
                        }
                        catch (error) {
                            const message = error instanceof Error ? error.message : String(error);
                            if (!allowFallback) {
                                throw new Error(`RATE_LIMIT_DRIVER=redis but Redis is unavailable and fallback is disabled: ${message}`);
                            }
                            failoverStore.activateFallback(`RATE_LIMIT_DRIVER=redis but Redis is unavailable at startup: ${message}`);
                            logger.warn(`Rate limit driver initialized in memory fallback mode, Redis will be retried every ${retryCooldownMs}ms`);
                            return failoverStore;
                        }
                    }
                    logger.log('Rate limit driver initialized with memory');
                    return memoryStore;
                },
            },
            rate_limit_service_1.RateLimitService,
        ],
        exports: [rate_limit_service_1.RateLimitService],
    })
], RateLimitModule);
