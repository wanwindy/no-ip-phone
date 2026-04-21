"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailoverRateLimitStore = void 0;
const rate_limit_constants_1 = require("./rate-limit.constants");
class FailoverRateLimitStore {
    primary;
    fallback;
    logger;
    options;
    retryPrimaryAfter = 0;
    constructor(primary, fallback, logger, options = {}) {
        this.primary = primary;
        this.fallback = fallback;
        this.logger = logger;
        this.options = options;
    }
    activateFallback(reason) {
        this.openFallbackCircuit(reason);
    }
    async reserveOnce(key, ttlMs) {
        return this.execute('reserveOnce', () => this.primary.reserveOnce(key, ttlMs), () => this.fallback.reserveOnce(key, ttlMs));
    }
    async increment(key, ttlMs) {
        return this.execute('increment', () => this.primary.increment(key, ttlMs), () => this.fallback.increment(key, ttlMs));
    }
    async delete(key) {
        return this.execute('delete', () => this.primary.delete(key), () => this.fallback.delete(key));
    }
    async execute(action, primaryAction, fallbackAction) {
        if (this.isFallbackActive()) {
            return fallbackAction();
        }
        try {
            const result = await primaryAction();
            this.clearFallbackCircuit(action);
            return result;
        }
        catch (error) {
            this.openFallbackCircuit(`Redis rate limit store failed during ${action}: ${error instanceof Error ? error.message : String(error)}`);
            return fallbackAction();
        }
    }
    get retryCooldownMs() {
        return this.options.retryCooldownMs ?? rate_limit_constants_1.RATE_LIMIT_RETRY_COOLDOWN_MS_DEFAULT;
    }
    isFallbackActive(now = Date.now()) {
        return now < this.retryPrimaryAfter;
    }
    clearFallbackCircuit(action) {
        if (this.retryPrimaryAfter === 0) {
            return;
        }
        this.retryPrimaryAfter = 0;
        this.logger.log(`Redis rate limit store recovered during ${action}, resuming primary usage`);
    }
    openFallbackCircuit(reason) {
        const retryAt = Date.now() + this.retryCooldownMs;
        this.retryPrimaryAfter = retryAt;
        this.logger.warn(`${reason}. Using memory fallback until ${new Date(retryAt).toISOString()}`);
    }
}
exports.FailoverRateLimitStore = FailoverRateLimitStore;
