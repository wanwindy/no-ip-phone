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
exports.TenantDidAssignmentEntity = exports.TenantDidAssignmentStatus = exports.TenantDidAssignmentUsageMode = void 0;
const typeorm_1 = require("typeorm");
var TenantDidAssignmentUsageMode;
(function (TenantDidAssignmentUsageMode) {
    TenantDidAssignmentUsageMode["SharedPool"] = "shared_pool";
    TenantDidAssignmentUsageMode["FixedMember"] = "fixed_member";
    TenantDidAssignmentUsageMode["ExclusiveTenant"] = "exclusive_tenant";
})(TenantDidAssignmentUsageMode || (exports.TenantDidAssignmentUsageMode = TenantDidAssignmentUsageMode = {}));
var TenantDidAssignmentStatus;
(function (TenantDidAssignmentStatus) {
    TenantDidAssignmentStatus["Active"] = "active";
    TenantDidAssignmentStatus["Reserved"] = "reserved";
    TenantDidAssignmentStatus["Released"] = "released";
    TenantDidAssignmentStatus["Disabled"] = "disabled";
})(TenantDidAssignmentStatus || (exports.TenantDidAssignmentStatus = TenantDidAssignmentStatus = {}));
let TenantDidAssignmentEntity = class TenantDidAssignmentEntity {
    id;
    tenantId;
    didId;
    assignedMemberId;
    usageMode;
    callbackEnabled;
    status;
    activatedAt;
    releasedAt;
    createdAt;
    updatedAt;
};
exports.TenantDidAssignmentEntity = TenantDidAssignmentEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'id' }),
    __metadata("design:type", String)
], TenantDidAssignmentEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid' }),
    __metadata("design:type", String)
], TenantDidAssignmentEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'did_id', type: 'uuid' }),
    __metadata("design:type", String)
], TenantDidAssignmentEntity.prototype, "didId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assigned_member_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], TenantDidAssignmentEntity.prototype, "assignedMemberId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'usage_mode',
        type: 'varchar',
        length: 32,
        default: TenantDidAssignmentUsageMode.SharedPool,
    }),
    __metadata("design:type", String)
], TenantDidAssignmentEntity.prototype, "usageMode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'callback_enabled', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], TenantDidAssignmentEntity.prototype, "callbackEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'status',
        type: 'varchar',
        length: 20,
        default: TenantDidAssignmentStatus.Active,
    }),
    __metadata("design:type", String)
], TenantDidAssignmentEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'activated_at', type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], TenantDidAssignmentEntity.prototype, "activatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'released_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], TenantDidAssignmentEntity.prototype, "releasedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TenantDidAssignmentEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TenantDidAssignmentEntity.prototype, "updatedAt", void 0);
exports.TenantDidAssignmentEntity = TenantDidAssignmentEntity = __decorate([
    (0, typeorm_1.Entity)('tenant_did_assignments'),
    (0, typeorm_1.Index)('uk_tenant_did_assignments_tenant_id_id', ['tenantId', 'id'], {
        unique: true,
    }),
    (0, typeorm_1.Index)('idx_tenant_did_assignments_tenant_status', ['tenantId', 'status', 'usageMode']),
    (0, typeorm_1.Index)('idx_tenant_did_assignments_tenant_member', ['tenantId', 'assignedMemberId', 'status'])
], TenantDidAssignmentEntity);
