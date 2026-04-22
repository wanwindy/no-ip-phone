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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const typeorm_1 = require("@nestjs/typeorm");
const passport_jwt_1 = require("passport-jwt");
const typeorm_2 = require("typeorm");
const error_codes_1 = require("../../../common/constants/error-codes");
const app_exception_1 = require("../../../common/exceptions/app.exception");
const account_entity_1 = require("../../account/entities/account.entity");
const tenant_member_entity_1 = require("../../tenant/entities/tenant-member.entity");
const TENANT_SELECTION_HEADER = 'x-tenant-id';
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    tenantMembersRepository;
    constructor(configService, tenantMembersRepository) {
        super({
            passReqToCallback: true,
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET', 'replace-me'),
        });
        this.tenantMembersRepository = tenantMembersRepository;
    }
    async validate(request, payload) {
        if (payload.role !== account_entity_1.AccountRole.AppUser) {
            throw new common_1.UnauthorizedException();
        }
        const tenantMembers = await this.tenantMembersRepository.find({
            where: {
                accountId: payload.sub,
                status: tenant_member_entity_1.TenantMemberStatus.Active,
            },
            order: {
                joinedAt: 'ASC',
                createdAt: 'ASC',
            },
        });
        const requestedTenantId = this.extractTenantId(request);
        const tenantMember = requestedTenantId
            ? tenantMembers.find((item) => item.tenantId === requestedTenantId) ?? null
            : tenantMembers[0] ?? null;
        if (requestedTenantId && !tenantMember) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.INTERNAL_ERROR, '当前账号不属于所选租户，无法在该租户上下文中继续操作', 403);
        }
        return {
            accountId: payload.sub,
            username: payload.username,
            role: payload.role,
            deviceId: payload.deviceId,
            tenantId: tenantMember?.tenantId ?? null,
            tenantMemberId: tenantMember?.id ?? null,
            tenantRole: tenantMember?.tenantRole ?? null,
        };
    }
    extractTenantId(request) {
        const raw = request.headers[TENANT_SELECTION_HEADER];
        const value = Array.isArray(raw) ? raw[0] : raw;
        const normalized = value?.trim();
        return normalized ? normalized : null;
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(tenant_member_entity_1.TenantMemberEntity)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository])
], JwtStrategy);
