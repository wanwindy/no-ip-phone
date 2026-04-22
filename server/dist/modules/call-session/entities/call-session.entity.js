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
exports.CallSessionEntity = exports.CallSessionStatus = exports.CallSessionDirection = void 0;
const typeorm_1 = require("typeorm");
var CallSessionDirection;
(function (CallSessionDirection) {
    CallSessionDirection["Outbound"] = "outbound";
    CallSessionDirection["Inbound"] = "inbound";
})(CallSessionDirection || (exports.CallSessionDirection = CallSessionDirection = {}));
var CallSessionStatus;
(function (CallSessionStatus) {
    CallSessionStatus["Created"] = "created";
    CallSessionStatus["Dispatching"] = "dispatching";
    CallSessionStatus["Ringing"] = "ringing";
    CallSessionStatus["Answered"] = "answered";
    CallSessionStatus["Bridged"] = "bridged";
    CallSessionStatus["Completed"] = "completed";
    CallSessionStatus["Failed"] = "failed";
    CallSessionStatus["Canceled"] = "canceled";
    CallSessionStatus["Expired"] = "expired";
})(CallSessionStatus || (exports.CallSessionStatus = CallSessionStatus = {}));
let CallSessionEntity = class CallSessionEntity {
    id;
    tenantId;
    tenantDidAssignmentId;
    initiatedByMemberId;
    fromEndpointId;
    callbackSessionId;
    direction;
    remoteNumber;
    displayDidId;
    providerCallId;
    selectedTrunkKey;
    status;
    hangupCause;
    startedAt;
    answeredAt;
    endedAt;
    createdAt;
    updatedAt;
};
exports.CallSessionEntity = CallSessionEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'id' }),
    __metadata("design:type", String)
], CallSessionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid' }),
    __metadata("design:type", String)
], CallSessionEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_did_assignment_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CallSessionEntity.prototype, "tenantDidAssignmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'initiated_by_member_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CallSessionEntity.prototype, "initiatedByMemberId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'from_endpoint_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CallSessionEntity.prototype, "fromEndpointId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'callback_session_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CallSessionEntity.prototype, "callbackSessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'direction', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], CallSessionEntity.prototype, "direction", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'remote_number', type: 'varchar', length: 32 }),
    __metadata("design:type", String)
], CallSessionEntity.prototype, "remoteNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_did_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CallSessionEntity.prototype, "displayDidId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_call_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], CallSessionEntity.prototype, "providerCallId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'selected_trunk_key', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], CallSessionEntity.prototype, "selectedTrunkKey", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'status',
        type: 'varchar',
        length: 32,
        default: CallSessionStatus.Created,
    }),
    __metadata("design:type", String)
], CallSessionEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hangup_cause', type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], CallSessionEntity.prototype, "hangupCause", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], CallSessionEntity.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'answered_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], CallSessionEntity.prototype, "answeredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ended_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], CallSessionEntity.prototype, "endedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CallSessionEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CallSessionEntity.prototype, "updatedAt", void 0);
exports.CallSessionEntity = CallSessionEntity = __decorate([
    (0, typeorm_1.Entity)('call_sessions'),
    (0, typeorm_1.Index)('uk_call_sessions_tenant_id_id', ['tenantId', 'id'], { unique: true }),
    (0, typeorm_1.Index)('idx_call_sessions_tenant_status_created', ['tenantId', 'status', 'createdAt']),
    (0, typeorm_1.Index)('idx_call_sessions_tenant_did_remote_created', [
        'tenantId',
        'displayDidId',
        'remoteNumber',
        'createdAt',
    ]),
    (0, typeorm_1.Index)('idx_call_sessions_provider_call', ['providerCallId']),
    (0, typeorm_1.Index)('idx_call_sessions_tenant_from_endpoint_created', [
        'tenantId',
        'fromEndpointId',
        'createdAt',
    ]),
    (0, typeorm_1.Index)('idx_call_sessions_tenant_callback_session', ['tenantId', 'callbackSessionId'])
], CallSessionEntity);
