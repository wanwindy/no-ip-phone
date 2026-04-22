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
var AccountService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountService = exports.AccountStatus = exports.AccountRole = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const typeorm_2 = require("typeorm");
const app_exception_1 = require("../../common/exceptions/app.exception");
const error_codes_1 = require("../../common/constants/error-codes");
const account_entity_1 = require("./entities/account.entity");
var account_entity_2 = require("./entities/account.entity");
Object.defineProperty(exports, "AccountRole", { enumerable: true, get: function () { return account_entity_2.AccountRole; } });
Object.defineProperty(exports, "AccountStatus", { enumerable: true, get: function () { return account_entity_2.AccountStatus; } });
let AccountService = AccountService_1 = class AccountService {
    accountsRepository;
    configService;
    logger = new common_1.Logger(AccountService_1.name);
    constructor(accountsRepository, configService) {
        this.accountsRepository = accountsRepository;
        this.configService = configService;
    }
    async onModuleInit() {
        await this.bootstrapFromEnv(account_entity_1.AccountRole.Admin, this.configService.get('ADMIN_BOOTSTRAP_USERNAME'), this.configService.get('ADMIN_BOOTSTRAP_PASSWORD'), this.configService.get('ADMIN_BOOTSTRAP_DISPLAY_NAME', '系统管理员'));
        await this.bootstrapFromEnv(account_entity_1.AccountRole.AppUser, this.configService.get('APP_BOOTSTRAP_USERNAME'), this.configService.get('APP_BOOTSTRAP_PASSWORD'), this.configService.get('APP_BOOTSTRAP_DISPLAY_NAME', '演示账号'));
    }
    async validateCredentials(username, password, role) {
        const normalizedUsername = this.normalizeUsername(username);
        this.ensureValidUsername(normalizedUsername);
        this.ensureValidPassword(password, false);
        const account = await this.accountsRepository.findOne({
            where: {
                username: normalizedUsername,
                role,
            },
        });
        if (!account) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.ACCOUNT_CREDENTIALS_INVALID, '账号或密码错误', 401);
        }
        const matched = await bcrypt.compare(password, account.passwordHash);
        if (!matched) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.ACCOUNT_CREDENTIALS_INVALID, '账号或密码错误', 401);
        }
        if (account.status === account_entity_1.AccountStatus.Disabled) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.ACCOUNT_DISABLED, '账号已停用', 403);
        }
        if (account.status === account_entity_1.AccountStatus.Banned) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.ACCOUNT_BANNED, '账号已被封禁', 403);
        }
        return account;
    }
    async findById(accountId) {
        return this.accountsRepository.findOne({ where: { id: accountId } });
    }
    async getProfile(accountId) {
        const account = await this.findById(accountId);
        if (!account) {
            return null;
        }
        return {
            id: account.id,
            username: account.username,
            displayName: account.displayName,
            role: account.role,
            status: account.status,
            createdAt: account.createdAt.toISOString(),
        };
    }
    async touchLastLoginAt(accountId) {
        await this.accountsRepository.update(accountId, {
            lastLoginAt: new Date(),
        });
    }
    async listAccounts(role = account_entity_1.AccountRole.AppUser) {
        const rows = await this.accountsRepository.find({
            where: { role },
            order: {
                createdAt: 'ASC',
                username: 'ASC',
            },
        });
        return rows.map((item) => ({
            id: item.id,
            username: item.username,
            displayName: item.displayName,
            role: item.role,
            status: item.status,
            createdAt: item.createdAt.toISOString(),
        }));
    }
    async createAccount(input) {
        const username = this.normalizeUsername(input.username);
        const displayName = this.normalizeDisplayName(input.displayName, username);
        this.ensureValidUsername(username);
        this.ensureValidPassword(input.password, true);
        this.ensureValidStatus(input.status ?? account_entity_1.AccountStatus.Active);
        const existing = await this.accountsRepository.findOne({
            where: { username, role: input.role },
        });
        if (existing) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.USERNAME_INVALID, '账号名已存在', 409);
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const account = await this.accountsRepository.save(this.accountsRepository.create({
            username,
            displayName,
            passwordHash,
            role: input.role,
            status: input.status ?? account_entity_1.AccountStatus.Active,
            lastLoginAt: null,
        }));
        return {
            id: account.id,
            username: account.username,
            displayName: account.displayName,
            role: account.role,
            status: account.status,
            createdAt: account.createdAt.toISOString(),
        };
    }
    async updateAccount(accountId, input) {
        const account = await this.findById(accountId);
        if (!account) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.INTERNAL_ERROR, '账号不存在', 404);
        }
        const nextDisplayName = input.displayName == null
            ? account.displayName
            : this.normalizeDisplayName(input.displayName, account.username);
        const nextStatus = input.status ?? account.status;
        this.ensureValidStatus(nextStatus);
        account.displayName = nextDisplayName;
        account.status = nextStatus;
        if (input.password != null && input.password.length > 0) {
            this.ensureValidPassword(input.password, true);
            account.passwordHash = await bcrypt.hash(input.password, 10);
        }
        const saved = await this.accountsRepository.save(account);
        return {
            id: saved.id,
            username: saved.username,
            displayName: saved.displayName,
            role: saved.role,
            status: saved.status,
            createdAt: saved.createdAt.toISOString(),
        };
    }
    async bootstrapFromEnv(role, username, password, displayName) {
        if (!username || !password) {
            return;
        }
        const normalizedUsername = this.normalizeUsername(username);
        const existing = await this.accountsRepository.findOne({
            where: {
                username: normalizedUsername,
                role,
            },
        });
        if (existing) {
            return;
        }
        const profile = await this.createAccount({
            username: normalizedUsername,
            password,
            displayName: displayName ?? normalizedUsername,
            role,
            status: account_entity_1.AccountStatus.Active,
        });
        this.logger.log(`Bootstrapped ${role} account: ${profile.username}`);
    }
    normalizeUsername(value) {
        return value.trim().toLowerCase();
    }
    normalizeDisplayName(value, fallback) {
        const trimmed = value.trim();
        return trimmed.length == 0 ? fallback : trimmed;
    }
    ensureValidUsername(username) {
        if (!/^[a-z0-9._-]{4,32}$/.test(username)) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.USERNAME_INVALID, '账号名需为 4-32 位小写字母、数字或 ._- 组合', 400);
        }
    }
    ensureValidPassword(password, strictLength) {
        const trimmed = password.trim();
        if (trimmed.length < (strictLength ? 8 : 1) || trimmed.length > 64) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.PASSWORD_INVALID, strictLength ? '密码长度需为 8-64 位' : '请输入密码', 400);
        }
    }
    ensureValidStatus(status) {
        if (!Object.values(account_entity_1.AccountStatus).includes(status)) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.INTERNAL_ERROR, '账号状态不合法', 400);
        }
    }
};
exports.AccountService = AccountService;
exports.AccountService = AccountService = AccountService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(account_entity_1.AccountEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], AccountService);
