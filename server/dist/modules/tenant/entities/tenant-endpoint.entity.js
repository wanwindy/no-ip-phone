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
exports.TenantEndpointEntity = exports.TenantEndpointStatus = exports.TenantEndpointType = void 0;
const typeorm_1 = require("typeorm");
var TenantEndpointType;
(function (TenantEndpointType) {
    TenantEndpointType["AppUser"] = "app_user";
    TenantEndpointType["SipExtension"] = "sip_extension";
    TenantEndpointType["PstnNumber"] = "pstn_number";
    TenantEndpointType["Webhook"] = "webhook";
})(TenantEndpointType || (exports.TenantEndpointType = TenantEndpointType = {}));
var TenantEndpointStatus;
(function (TenantEndpointStatus) {
    TenantEndpointStatus["Active"] = "active";
    TenantEndpointStatus["Disabled"] = "disabled";
    TenantEndpointStatus["Offline"] = "offline";
})(TenantEndpointStatus || (exports.TenantEndpointStatus = TenantEndpointStatus = {}));
let TenantEndpointEntity = class TenantEndpointEntity {
    id;
    tenantId;
    memberId;
    endpointType;
    endpointValue;
    endpointLabel;
    priority;
    status;
    metadata;
    lastSeenAt;
    createdAt;
    updatedAt;
};
exports.TenantEndpointEntity = TenantEndpointEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'id' }),
    __metadata("design:type", String)
], TenantEndpointEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid' }),
    __metadata("design:type", String)
], TenantEndpointEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'member_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], TenantEndpointEntity.prototype, "memberId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'endpoint_type', type: 'varchar', length: 32 }),
    __metadata("design:type", String)
], TenantEndpointEntity.prototype, "endpointType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'endpoint_value', type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], TenantEndpointEntity.prototype, "endpointValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'endpoint_label', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], TenantEndpointEntity.prototype, "endpointLabel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'priority', type: 'int', default: 100 }),
    __metadata("design:type", Number)
], TenantEndpointEntity.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'status',
        type: 'varchar',
        length: 20,
        default: TenantEndpointStatus.Active,
    }),
    __metadata("design:type", String)
], TenantEndpointEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'metadata',
        type: 'jsonb',
        default: () => "'{}'::jsonb",
    }),
    __metadata("design:type", Object)
], TenantEndpointEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_seen_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], TenantEndpointEntity.prototype, "lastSeenAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TenantEndpointEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TenantEndpointEntity.prototype, "updatedAt", void 0);
exports.TenantEndpointEntity = TenantEndpointEntity = __decorate([
    (0, typeorm_1.Entity)('tenant_endpoints'),
    (0, typeorm_1.Index)('uk_tenant_endpoints_tenant_id_id', ['tenantId', 'id'], { unique: true }),
    (0, typeorm_1.Index)('uk_tenant_endpoints_tenant_value', ['tenantId', 'endpointType', 'endpointValue'], {
        unique: true,
    }),
    (0, typeorm_1.Index)('idx_tenant_endpoints_tenant_status_priority', [
        'tenantId',
        'status',
        'priority',
        'createdAt',
    ]),
    (0, typeorm_1.Index)('idx_tenant_endpoints_tenant_member_status', ['tenantId', 'memberId', 'status'])
], TenantEndpointEntity);
