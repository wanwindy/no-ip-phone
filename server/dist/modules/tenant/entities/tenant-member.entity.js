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
exports.TenantMemberEntity = exports.TenantMemberStatus = exports.TenantMemberRole = void 0;
const typeorm_1 = require("typeorm");
var TenantMemberRole;
(function (TenantMemberRole) {
    TenantMemberRole["TenantOwner"] = "tenant_owner";
    TenantMemberRole["TenantAdmin"] = "tenant_admin";
    TenantMemberRole["TenantOperator"] = "tenant_operator";
    TenantMemberRole["TenantAgent"] = "tenant_agent";
    TenantMemberRole["TenantAuditor"] = "tenant_auditor";
})(TenantMemberRole || (exports.TenantMemberRole = TenantMemberRole = {}));
var TenantMemberStatus;
(function (TenantMemberStatus) {
    TenantMemberStatus["Invited"] = "invited";
    TenantMemberStatus["Active"] = "active";
    TenantMemberStatus["Disabled"] = "disabled";
})(TenantMemberStatus || (exports.TenantMemberStatus = TenantMemberStatus = {}));
let TenantMemberEntity = class TenantMemberEntity {
    id;
    tenantId;
    accountId;
    tenantRole;
    status;
    joinedAt;
    createdAt;
    updatedAt;
};
exports.TenantMemberEntity = TenantMemberEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'id' }),
    __metadata("design:type", String)
], TenantMemberEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid' }),
    __metadata("design:type", String)
], TenantMemberEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_id', type: 'uuid' }),
    __metadata("design:type", String)
], TenantMemberEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_role', type: 'varchar', length: 32 }),
    __metadata("design:type", String)
], TenantMemberEntity.prototype, "tenantRole", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'status',
        type: 'varchar',
        length: 20,
        default: TenantMemberStatus.Active,
    }),
    __metadata("design:type", String)
], TenantMemberEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'joined_at', type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], TenantMemberEntity.prototype, "joinedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TenantMemberEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TenantMemberEntity.prototype, "updatedAt", void 0);
exports.TenantMemberEntity = TenantMemberEntity = __decorate([
    (0, typeorm_1.Entity)('tenant_members'),
    (0, typeorm_1.Index)('uk_tenant_members_tenant_account', ['tenantId', 'accountId'], {
        unique: true,
    }),
    (0, typeorm_1.Index)('uk_tenant_members_tenant_id_id', ['tenantId', 'id'], { unique: true }),
    (0, typeorm_1.Index)('idx_tenant_members_account_status', ['accountId', 'status']),
    (0, typeorm_1.Index)('idx_tenant_members_tenant_role_status', ['tenantId', 'tenantRole', 'status'])
], TenantMemberEntity);
