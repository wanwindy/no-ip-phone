"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertReleaseRuntimePreflight = assertReleaseRuntimePreflight;
const rate_limit_constants_1 = require("../../modules/rate-limit/rate-limit.constants");
function normalizeNodeEnv(value) {
    return value?.trim().toLowerCase() || 'development';
}
function hasExplicitRedisConnectionConfig(env) {
    const redisUrl = env.REDIS_URL?.trim();
    if (redisUrl) {
        return true;
    }
    const redisHost = env.REDIS_HOST?.trim();
    const redisPort = Number(env.REDIS_PORT);
    return Boolean(redisHost) && Number.isInteger(redisPort) && redisPort > 0;
}
function assertReleaseRuntimePreflight(env = process.env) {
    const nodeEnv = normalizeNodeEnv(env.NODE_ENV);
    if (nodeEnv !== 'production') {
        return;
    }
    const driver = (0, rate_limit_constants_1.resolveRateLimitDriver)(env.RATE_LIMIT_DRIVER);
    const allowFallback = (0, rate_limit_constants_1.resolveRateLimitFallbackAllowed)(nodeEnv, env.RATE_LIMIT_ALLOW_FALLBACK);
    const errors = [];
    if (driver !== rate_limit_constants_1.RATE_LIMIT_DRIVER_REDIS) {
        errors.push('NODE_ENV=production requires RATE_LIMIT_DRIVER=redis to keep rate limits shared across instances.');
    }
    if (allowFallback) {
        errors.push('NODE_ENV=production requires RATE_LIMIT_ALLOW_FALLBACK=false so Redis failures do not silently downgrade to memory.');
    }
    if (!hasExplicitRedisConnectionConfig(env)) {
        errors.push('NODE_ENV=production requires explicit REDIS_URL or REDIS_HOST with REDIS_PORT.');
    }
    if (errors.length === 0) {
        return;
    }
    throw new Error(`Release runtime preflight failed:\n- ${errors.join('\n- ')}`);
}
