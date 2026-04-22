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
const crypto = __importStar(require("crypto"));
const typeorm_2 = require("typeorm");
const error_codes_1 = require("../../common/constants/error-codes");
const app_exception_1 = require("../../common/exceptions/app.exception");
const account_service_1 = require("../account/account.service");
const account_refresh_token_entity_1 = require("../account/entities/account-refresh-token.entity");
const rate_limit_service_1 = require("../rate-limit/rate-limit.service");
let AuthService = class AuthService {
    accountService;
    rateLimitService;
    jwtService;
    configService;
    refreshTokensRepository;
    constructor(accountService, rateLimitService, jwtService, configService, refreshTokensRepository) {
        this.accountService = accountService;
        this.rateLimitService = rateLimitService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.refreshTokensRepository = refreshTokensRepository;
    }
    async loginWithRole(username, password, deviceId, role) {
        const loginKey = username.trim().toLowerCase();
        try {
            const account = await this.accountService.validateCredentials(loginKey, password, role);
            await this.accountService.touchLastLoginAt(account.id);
            await this.rateLimitService.resetFailedAttempts(loginKey);
            return this.issueTokens(account.id, account.username, deviceId, role);
        }
        catch (error) {
            if (error instanceof app_exception_1.AppException &&
                error.code === error_codes_1.ErrorCode.ACCOUNT_CREDENTIALS_INVALID) {
                await this.rateLimitService.recordFailedAttempt(loginKey);
            }
            throw error;
        }
    }
    async refreshWithRole(refreshToken, deviceId, role) {
        const tokenHash = this.hashToken(refreshToken);
        const stored = await this.refreshTokensRepository.findOne({
            where: { tokenHash, revokedAt: (0, typeorm_2.IsNull)(), role },
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
        const account = await this.accountService.findById(stored.accountId);
        if (!account) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.REFRESH_TOKEN_INVALID, 'Refresh Token 无效或已过期', 401);
        }
        if (account.status === 'disabled') {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.ACCOUNT_DISABLED, '账号已停用', 403);
        }
        if (account.status === 'banned') {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.ACCOUNT_BANNED, '账号已被封禁', 403);
        }
        return this.issueTokens(account.id, account.username, deviceId, role);
    }
    async logoutWithRole(accountId, refreshToken, role) {
        const tokenHash = this.hashToken(refreshToken);
        const stored = await this.refreshTokensRepository.findOne({
            where: { accountId, tokenHash, role, revokedAt: (0, typeorm_2.IsNull)() },
        });
        if (!stored) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.REFRESH_TOKEN_INVALID, 'Refresh Token 无效或已过期', 401);
        }
        stored.revokedAt = new Date();
        await this.refreshTokensRepository.save(stored);
    }
    async me(accountId) {
        const profile = await this.accountService.getProfile(accountId);
        if (!profile) {
            throw new common_1.UnauthorizedException();
        }
        return profile;
    }
    async issueTokens(accountId, username, deviceId, role) {
        const expiresInText = this.resolveAccessExpires(role);
        const refreshDays = this.resolveRefreshDays(role);
        const accessToken = this.jwtService.sign({ sub: accountId, username, role, deviceId }, {
            secret: this.resolveJwtSecret(role),
            expiresIn: expiresInText,
        });
        const refreshToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(refreshToken);
        await this.refreshTokensRepository.save(this.refreshTokensRepository.create({
            accountId,
            role,
            tokenHash,
            deviceId,
            expiredAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
            revokedAt: null,
        }));
        const expiresIn = this.parseExpiresInSeconds(expiresInText);
        return { accessToken, refreshToken, expiresIn };
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    resolveJwtSecret(role) {
        if (role === account_service_1.AccountRole.Admin) {
            return this.configService.get('ADMIN_JWT_SECRET', this.configService.get('JWT_SECRET', 'replace-me'));
        }
        return this.configService.get('JWT_SECRET', 'replace-me');
    }
    resolveAccessExpires(role) {
        if (role === account_service_1.AccountRole.Admin) {
            return this.configService.get('ADMIN_JWT_ACCESS_EXPIRES', '2h');
        }
        return this.configService.get('JWT_ACCESS_EXPIRES', '2h');
    }
    resolveRefreshDays(role) {
        if (role === account_service_1.AccountRole.Admin) {
            return Number(this.configService.get('ADMIN_JWT_REFRESH_DAYS', '30'));
        }
        return Number(this.configService.get('JWT_REFRESH_DAYS', '30'));
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
    __param(4, (0, typeorm_1.InjectRepository)(account_refresh_token_entity_1.AccountRefreshTokenEntity)),
    __metadata("design:paramtypes", [account_service_1.AccountService,
        rate_limit_service_1.RateLimitService,
        jwt_1.JwtService,
        config_1.ConfigService,
        typeorm_2.Repository])
], AuthService);
