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
exports.CallbackSessionEntity = exports.CallbackSessionStatus = void 0;
const typeorm_1 = require("typeorm");
var CallbackSessionStatus;
(function (CallbackSessionStatus) {
    CallbackSessionStatus["Active"] = "active";
    CallbackSessionStatus["Routing"] = "routing";
    CallbackSessionStatus["Fulfilled"] = "fulfilled";
    CallbackSessionStatus["Expired"] = "expired";
    CallbackSessionStatus["Failed"] = "failed";
    CallbackSessionStatus["Revoked"] = "revoked";
})(CallbackSessionStatus || (exports.CallbackSessionStatus = CallbackSessionStatus = {}));
let CallbackSessionEntity = class CallbackSessionEntity {
    id;
    tenantId;
    tenantDidAssignmentId;
    displayDidId;
    remoteNumber;
    originCallSessionId;
    targetEndpointId;
    lastRoutedEndpointId;
    status;
    expiresAt;
    matchedAt;
    expiredAt;
    decisionReason;
    routingDecisionKey;
    lastInboundAt;
    createdAt;
    updatedAt;
};
exports.CallbackSessionEntity = CallbackSessionEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'id' }),
    __metadata("design:type", String)
], CallbackSessionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid' }),
    __metadata("design:type", String)
], CallbackSessionEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_did_assignment_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CallbackSessionEntity.prototype, "tenantDidAssignmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_did_id', type: 'uuid' }),
    __metadata("design:type", String)
], CallbackSessionEntity.prototype, "displayDidId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'remote_number', type: 'varchar', length: 32 }),
    __metadata("design:type", String)
], CallbackSessionEntity.prototype, "remoteNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'origin_call_session_id', type: 'uuid' }),
    __metadata("design:type", String)
], CallbackSessionEntity.prototype, "originCallSessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_endpoint_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CallbackSessionEntity.prototype, "targetEndpointId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_routed_endpoint_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CallbackSessionEntity.prototype, "lastRoutedEndpointId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'status',
        type: 'varchar',
        length: 32,
        default: CallbackSessionStatus.Active,
    }),
    __metadata("design:type", String)
], CallbackSessionEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CallbackSessionEntity.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'matched_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], CallbackSessionEntity.prototype, "matchedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expired_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], CallbackSessionEntity.prototype, "expiredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'decision_reason', type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], CallbackSessionEntity.prototype, "decisionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'routing_decision_key',
        type: 'varchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", Object)
], CallbackSessionEntity.prototype, "routingDecisionKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_inbound_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], CallbackSessionEntity.prototype, "lastInboundAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CallbackSessionEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CallbackSessionEntity.prototype, "updatedAt", void 0);
exports.CallbackSessionEntity = CallbackSessionEntity = __decorate([
    (0, typeorm_1.Entity)('callback_sessions'),
    (0, typeorm_1.Index)('uk_callback_sessions_tenant_id_id', ['tenantId', 'id'], {
        unique: true,
    }),
    (0, typeorm_1.Index)('idx_callback_sessions_tenant_status_expires', [
        'tenantId',
        'status',
        'expiresAt',
    ]),
    (0, typeorm_1.Index)('idx_callback_sessions_origin_call', ['tenantId', 'originCallSessionId']),
    (0, typeorm_1.Index)('idx_callback_sessions_match_lookup', [
        'displayDidId',
        'remoteNumber',
        'expiresAt',
        'createdAt',
    ]),
    (0, typeorm_1.Index)('idx_callback_sessions_target_endpoint', ['tenantId', 'targetEndpointId', 'status'])
], CallbackSessionEntity);
