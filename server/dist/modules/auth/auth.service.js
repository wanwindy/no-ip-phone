"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const typeorm_2 = require("typeorm");
const app_exception_1 = require("../../common/exceptions/app.exception");
const error_codes_1 = require("../../common/constants/error-codes");
const sms_service_1 = require("../sms/sms.service");
const user_service_1 = require("../user/user.service");
const rate_limit_service_1 = require("../rate-limit/rate-limit.service");
const user_entity_1 = require("../user/entities/user.entity");
const auth_code_entity_1 = require("./entities/auth-code.entity");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
let AuthService = class AuthService {
    smsService;
    userService;
    rateLimitService;
    jwtService;
    configService;
    authCodesRepository;
    refreshTokensRepository;
    constructor(smsService, userService, rateLimitService, jwtService, configService, authCodesRepository, refreshTokensRepository) {
        this.smsService = smsService;
        this.userService = userService;
        this.rateLimitService = rateLimitService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.authCodesRepository = authCodesRepository;
        this.refreshTokensRepository = refreshTokensRepository;
    }
    async sendCode(phone, ip) {
        await this.rateLimitService.checkSendCode(phone, ip);
        const code = this.resolveCodeForCurrentEnvironment();
        const codeHash = await bcrypt.hash(code, 10);
        await this.authCodesRepository.save(this.authCodesRepository.create({
            phone,
            codeHash,
            expiredAt: new Date(Date.now() + 5 * 60 * 1000),
            usedAt: null,
            sendIp: ip,
        }));
        await this.smsService.send(phone, code);
        return { cooldown: 60 };
    }
    async login(phone, code, deviceId) {
        const authCode = await this.authCodesRepository.findOne({
            where: { phone, usedAt: (0, typeorm_2.IsNull)() },
            order: { createdAt: 'DESC' },
        });
        if (!authCode || authCode.expiredAt.getTime() < Date.now()) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.CODE_EXPIRED, '验证码已过期', 401);
        }
        const matched = await bcrypt.compare(code, authCode.codeHash);
        if (!matched) {
            await this.rateLimitService.recordFailedAttempt(phone);
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.CODE_WRONG, '验证码错误', 401);
        }
        authCode.usedAt = new Date();
        await this.authCodesRepository.save(authCode);
        const user = await this.userService.findOrCreate(phone);
        if (user.status !== user_entity_1.UserStatus.Active) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.ACCOUNT_BANNED, '账户已被封禁', 403);
        }
        await this.userService.touchLastLoginAt(user.id);
        await this.rateLimitService.resetFailedAttempts(phone);
        return this.issueTokens(user.id, deviceId);
    }
    async refresh(refreshToken, deviceId) {
        const tokenHash = this.hashToken(refreshToken);
        const stored = await this.refreshTokensRepository.findOne({
            where: { tokenHash, revokedAt: (0, typeorm_2.IsNull)() },
            order: { createdAt: 'DESC' },
        });
        if (!stored || stored.expiredAt.getTime() < Date.now()) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.REFRESH_TOKEN_INVALID, 'Refresh Token 无效或已过期', 401);
        }
        if (stored.deviceId && stored.deviceId !== deviceId) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.REFRESH_TOKEN_INVALID, 'Refresh Token 无效或已过期', 401);
        }
        stored.revokedAt = new Date();
        await this.refreshTokensRepository.save(stored);
        return this.issueTokens(stored.userId, deviceId);
    }
    async logout(userId, refreshToken) {
        const tokenHash = this.hashToken(refreshToken);
        const stored = await this.refreshTokensRepository.findOne({
            where: { userId, tokenHash, revokedAt: (0, typeorm_2.IsNull)() },
        });
        if (!stored) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.REFRESH_TOKEN_INVALID, 'Refresh Token 无效或已过期', 401);
        }
        stored.revokedAt = new Date();
        await this.refreshTokensRepository.save(stored);
    }
    async me(userId) {
        const profile = await this.userService.getPublicProfile(userId);
        if (!profile) {
            throw new common_1.UnauthorizedException();
        }
        return profile;
    }
    async issueTokens(userId, deviceId) {
        const expiresInText = this.configService.get('JWT_ACCESS_EXPIRES', '2h');
        const refreshDays = Number(this.configService.get('JWT_REFRESH_DAYS', '30'));
        const accessToken = this.jwtService.sign({ sub: userId, deviceId }, {
            secret: this.configService.get('JWT_SECRET', 'replace-me'),
            expiresIn: expiresInText,
        });
        const refreshToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(refreshToken);
        await this.refreshTokensRepository.save(this.refreshTokensRepository.create({
            userId,
            tokenHash,
            deviceId,
            expiredAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
            revokedAt: null,
        }));
        const expiresIn = this.parseExpiresInSeconds(expiresInText);
        return { accessToken, refreshToken, expiresIn };
    }
    generateCode() {
        return crypto.randomInt(100000, 999999).toString();
    }
    resolveCodeForCurrentEnvironment() {
        if (this.isFixedCodeFlowEnabled()) {
            return this.normalizeFixedCode(this.configService.get('AUTH_FIXED_CODE', '123456'));
        }
        return this.generateCode();
    }
    isFixedCodeFlowEnabled() {
        const nodeEnv = this.configService.get('NODE_ENV', 'development');
        const smsProvider = this.configService.get('SMS_PROVIDER', 'noop');
        return nodeEnv !== 'production' && smsProvider === 'noop';
    }
    normalizeFixedCode(value) {
        if (/^\d{6}$/.test(value)) {
            return value;
        }
        return '123456';
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    parseExpiresInSeconds(value) {
        if (value.endsWith('h')) {
            return Number(value.slice(0, -1)) * 60 * 60;
        }
        if (value.endsWith('m')) {
            return Number(value.slice(0, -1)) * 60;
        }
        if (value.endsWith('s')) {
            return Number(value.slice(0, -1));
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 7200;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, typeorm_1.InjectRepository)(auth_code_entity_1.AuthCodeEntity)),
    __param(6, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshTokenEntity)),
    __metadata("design:paramtypes", [sms_service_1.SmsService,
        user_service_1.UserService,
        rate_limit_service_1.RateLimitService,
        jwt_1.JwtService,
        config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AuthService);
