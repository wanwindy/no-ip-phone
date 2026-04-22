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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountRefreshTokenEntity = void 0;
const typeorm_1 = require("typeorm");
const account_entity_1 = require("./account.entity");
let AccountRefreshTokenEntity = class AccountRefreshTokenEntity {
    id;
    accountId;
    role;
    tokenHash;
    deviceId;
    expiredAt;
    revokedAt;
    createdAt;
};
exports.AccountRefreshTokenEntity = AccountRefreshTokenEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'id' }),
    __metadata("design:type", String)
], AccountRefreshTokenEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_id', type: 'uuid' }),
    __metadata("design:type", String)
], AccountRefreshTokenEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'role', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], AccountRefreshTokenEntity.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'token_hash', type: 'varchar', length: 128 }),
    __metadata("design:type", String)
], AccountRefreshTokenEntity.prototype, "tokenHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id', type: 'varchar', length: 128, nullable: true }),
    __metadata("design:type", Object)
], AccountRefreshTokenEntity.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expired_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], AccountRefreshTokenEntity.prototype, "expiredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'revoked_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], AccountRefreshTokenEntity.prototype, "revokedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], AccountRefreshTokenEntity.prototype, "createdAt", void 0);
exports.AccountRefreshTokenEntity = AccountRefreshTokenEntity = __decorate([
    (0, typeorm_1.Entity)('account_refresh_tokens'),
    (0, typeorm_1.Index)('idx_account_refresh_tokens_account', ['accountId']),
    (0, typeorm_1.Index)('idx_account_refresh_tokens_hash', ['tokenHash'])
], AccountRefreshTokenEntity);
