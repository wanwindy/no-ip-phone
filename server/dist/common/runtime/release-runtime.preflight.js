"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertReleaseRuntimePreflight = assertReleaseRuntimePreflight;
const rate_limit_constants_1 = require("../../modules/rate-limit/rate-limit.constants");
const sms_constants_1 = require("../../modules/sms/sms.constants");
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
    const smsProviderRaw = env.SMS_PROVIDER;
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
    try {
        const smsProvider = (0, sms_constants_1.resolveSmsProviderName)(smsProviderRaw);
        if ((0, sms_constants_1.isNoopSmsProvider)(smsProvider)) {
            errors.push('NODE_ENV=production requires a real SMS provider; SMS_PROVIDER=noop is local-only.');
        }
        if (!(0, sms_constants_1.isImplementedSmsProvider)(smsProvider)) {
            errors.push(`SMS provider "${smsProvider}" is not implemented in this build yet. Integrate it before production startup.`);
        }
    }
    catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
    }
    if (errors.length === 0) {
        return;
    }
    throw new Error(`Release runtime preflight failed:\n- ${errors.join('\n- ')}`);
}
