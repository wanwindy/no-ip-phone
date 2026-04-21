"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisRateLimitStore = void 0;
const redis_1 = require("redis");
class RedisRateLimitStore {
    configService;
    logger;
    client = null;
    constructor(configService, logger) {
        this.configService = configService;
        this.logger = logger;
    }
    async connect() {
        if (this.client?.isReady) {
            return;
        }
        if (this.client) {
            const staleClient = this.client;
            this.client = null;
            try {
                if (staleClient.isOpen) {
                    await staleClient.quit();
                }
                else {
                    staleClient.disconnect();
                }
            }
            catch (error) {
                this.logger.debug(`Redis rate limit stale client cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
                staleClient.disconnect();
            }
        }
        const client = this.createClient();
        client.on('error', (error) => {
            this.logger.warn(`Redis rate limit client error: ${error instanceof Error ? error.message : String(error)}`);
        });
        client.on('end', () => {
            this.logger.warn('Redis rate limit connection closed');
        });
        await client.connect();
        this.client = client;
    }
    async reserveOnce(key, ttlMs) {
        const client = await this.getClient();
        const result = await client.set(key, '1', {
            NX: true,
            PX: ttlMs,
        });
        return result === 'OK';
    }
    async increment(key, ttlMs) {
        const client = await this.getClient();
        const result = await client.eval(`
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then
          redis.call('PEXPIRE', KEYS[1], ARGV[1])
        end
        return current
      `, {
            keys: [key],
            arguments: [String(ttlMs)],
        });
        return Number(result);
    }
    async delete(key) {
        const client = await this.getClient();
        await client.del(key);
    }
    async close() {
        if (!this.client) {
            return;
        }
        const client = this.client;
        this.client = null;
        try {
            await client.quit();
        }
        catch (error) {
            this.logger.debug(`Redis rate limit client quit failed: ${error instanceof Error ? error.message : String(error)}`);
            client.disconnect();
        }
    }
    createClient() {
        const redisUrl = this.configService.get('REDIS_URL', '').trim();
        const redisPassword = this.configService.get('REDIS_PASSWORD', '').trim();
        const connectionTimeoutMs = 2_000;
        if (redisUrl) {
            return (0, redis_1.createClient)({
                url: redisUrl,
                password: redisPassword || undefined,
                socket: {
                    connectTimeout: connectionTimeoutMs,
                    reconnectStrategy: false,
                },
            });
        }
        const host = this.configService.get('REDIS_HOST', 'localhost');
        const port = Number(this.configService.get('REDIS_PORT', '6379'));
        return (0, redis_1.createClient)({
            password: redisPassword || undefined,
            socket: {
                host,
                port,
                connectTimeout: connectionTimeoutMs,
                reconnectStrategy: false,
            },
        });
    }
    requireClient() {
        if (!this.client || !this.client.isReady) {
            throw new Error('Redis rate limit store is not connected');
        }
        return this.client;
    }
    async getClient() {
        await this.connect();
        return this.requireClient();
    }
}
exports.RedisRateLimitStore = RedisRateLimitStore;
