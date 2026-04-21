"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATE_LIMIT_RETRY_COOLDOWN_MS_DEFAULT = exports.RATE_LIMIT_DRIVER_REDIS = exports.RATE_LIMIT_DRIVER_MEMORY = exports.RATE_LIMIT_STORE = void 0;
exports.resolveRateLimitDriver = resolveRateLimitDriver;
exports.resolveRateLimitFallbackAllowed = resolveRateLimitFallbackAllowed;
exports.resolveRateLimitRetryCooldownMs = resolveRateLimitRetryCooldownMs;
exports.RATE_LIMIT_STORE = Symbol('RATE_LIMIT_STORE');
exports.RATE_LIMIT_DRIVER_MEMORY = 'memory';
exports.RATE_LIMIT_DRIVER_REDIS = 'redis';
exports.RATE_LIMIT_RETRY_COOLDOWN_MS_DEFAULT = 30_000;
function resolveRateLimitDriver(value) {
    return value === exports.RATE_LIMIT_DRIVER_REDIS
        ? exports.RATE_LIMIT_DRIVER_REDIS
        : exports.RATE_LIMIT_DRIVER_MEMORY;
}
function resolveRateLimitFallbackAllowed(nodeEnv, value) {
    const normalized = value?.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return false;
    }
    return nodeEnv !== 'production';
}
function resolveRateLimitRetryCooldownMs(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0
        ? parsed
        : exports.RATE_LIMIT_RETRY_COOLDOWN_MS_DEFAULT;
}
