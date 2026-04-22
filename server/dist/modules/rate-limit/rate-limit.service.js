"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RateLimitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = void 0;
const common_1 = require("@nestjs/common");
const rate_limit_constants_1 = require("./rate-limit.constants");
let RateLimitService = class RateLimitService {
    static { RateLimitService_1 = this; }
    store;
    static SEND_CODE_COOLDOWN_MS = 60_000;
    static SEND_CODE_HOURLY_LIMIT_MS = 3_600_000;
    static SEND_CODE_HOURLY_LIMIT = 5;
    static SEND_CODE_IP_LIMIT = 20;
    static LOGIN_FAILED_LIMIT_MS = 30 * 60_000;
    static LOGIN_FAILED_LIMIT = 5;
    constructor(store) {
        this.store = store;
    }
    async checkSendCode(phone, ip) {
        const cooldownOk = await this.store.reserveOnce(`send-code:cooldown:${phone}`, RateLimitService_1.SEND_CODE_COOLDOWN_MS);
        if (!cooldownOk) {
            throw new common_1.HttpException('请 60 秒后再试', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const phoneCount = await this.store.increment(`send-code:hourly:${phone}`, RateLimitService_1.SEND_CODE_HOURLY_LIMIT_MS);
        if (phoneCount > RateLimitService_1.SEND_CODE_HOURLY_LIMIT) {
            throw new common_1.HttpException('验证码发送次数已达上限，请 1 小时后再试', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const ipCount = await this.store.increment(`send-code:ip:${ip}`, RateLimitService_1.SEND_CODE_HOURLY_LIMIT_MS);
        if (ipCount > RateLimitService_1.SEND_CODE_IP_LIMIT) {
            throw new common_1.HttpException('请求过于频繁', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
    }
    async recordFailedAttempt(phone) {
        const count = await this.store.increment(`login:failed:${phone}`, RateLimitService_1.LOGIN_FAILED_LIMIT_MS);
        if (count >= RateLimitService_1.LOGIN_FAILED_LIMIT) {
            throw new common_1.HttpException('账号或密码错误次数过多，请 30 分钟后再试', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
    }
    async resetFailedAttempts(phone) {
        await this.store.delete(`login:failed:${phone}`);
    }
};
exports.RateLimitService = RateLimitService;
exports.RateLimitService = RateLimitService = RateLimitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(rate_limit_constants_1.RATE_LIMIT_STORE)),
    __metadata("design:paramtypes", [Object])
], RateLimitService);
