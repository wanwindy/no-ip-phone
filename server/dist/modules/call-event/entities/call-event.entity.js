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
exports.CallEventEntity = exports.CallEventName = exports.CallEventSessionDirection = exports.CallEventDirection = void 0;
const typeorm_1 = require("typeorm");
var CallEventDirection;
(function (CallEventDirection) {
    CallEventDirection["Inbound"] = "inbound";
    CallEventDirection["Outbound"] = "outbound";
    CallEventDirection["Internal"] = "internal";
})(CallEventDirection || (exports.CallEventDirection = CallEventDirection = {}));
var CallEventSessionDirection;
(function (CallEventSessionDirection) {
    CallEventSessionDirection["Inbound"] = "inbound";
    CallEventSessionDirection["Outbound"] = "outbound";
})(CallEventSessionDirection || (exports.CallEventSessionDirection = CallEventSessionDirection = {}));
var CallEventName;
(function (CallEventName) {
    CallEventName["TelephonyInboundReceived"] = "telephony.inbound.received";
    CallEventName["TelephonyCallbackMatched"] = "telephony.callback.matched";
    CallEventName["TelephonyCallbackTargetRinging"] = "telephony.callback.target.ringing";
    CallEventName["TelephonyCallbackTargetAnswered"] = "telephony.callback.target.answered";
    CallEventName["TelephonyCallbackBridged"] = "telephony.callback.bridged";
    CallEventName["TelephonyCallbackCompleted"] = "telephony.callback.completed";
    CallEventName["TelephonyCallbackFailed"] = "telephony.callback.failed";
    CallEventName["TelephonyCallbackCanceled"] = "telephony.callback.canceled";
    CallEventName["TelephonyCallbackRejected"] = "telephony.callback.rejected";
    CallEventName["TelephonyOutboundAccepted"] = "telephony.outbound.accepted";
    CallEventName["TelephonyOutboundRinging"] = "telephony.outbound.ringing";
    CallEventName["TelephonyOutboundAnswered"] = "telephony.outbound.answered";
    CallEventName["TelephonyOutboundBridged"] = "telephony.outbound.bridged";
    CallEventName["TelephonyOutboundCompleted"] = "telephony.outbound.completed";
    CallEventName["TelephonyOutboundFailed"] = "telephony.outbound.failed";
    CallEventName["TelephonyOutboundCanceled"] = "telephony.outbound.canceled";
    CallEventName["TelephonyRecordingReady"] = "telephony.recording.ready";
    CallEventName["TelephonyRecordingFailed"] = "telephony.recording.failed";
})(CallEventName || (exports.CallEventName = CallEventName = {}));
let CallEventEntity = class CallEventEntity {
    id;
    tenantId;
    callSessionId;
    callbackSessionId;
    targetEndpointId;
    eventName;
    eventDirection;
    sessionDirection;
    providerKey;
    trunkKey;
    providerEventId;
    providerCallId;
    displayDid;
    remoteNumber;
    traceId;
    eventIdempotencyKey;
    routingDecisionKey;
    providerRawStatus;
    providerRawReason;
    decisionReason;
    payload;
    occurredAt;
    receivedAt;
    createdAt;
};
exports.CallEventEntity = CallEventEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'id' }),
    __metadata("design:type", String)
], CallEventEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid' }),
    __metadata("design:type", String)
], CallEventEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'call_session_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "callSessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'callback_session_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "callbackSessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_endpoint_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "targetEndpointId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'event_name', type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], CallEventEntity.prototype, "eventName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'event_direction', type: 'varchar', length: 16 }),
    __metadata("design:type", String)
], CallEventEntity.prototype, "eventDirection", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'session_direction', type: 'varchar', length: 16, nullable: true }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "sessionDirection", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_key', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "providerKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trunk_key', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "trunkKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_event_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "providerEventId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_call_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "providerCallId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_did', type: 'varchar', length: 32, nullable: true }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "displayDid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'remote_number', type: 'varchar', length: 32, nullable: true }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "remoteNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trace_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "traceId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'event_idempotency_key',
        type: 'varchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "eventIdempotencyKey", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'routing_decision_key',
        type: 'varchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "routingDecisionKey", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'provider_raw_status',
        type: 'varchar',
        length: 64,
        nullable: true,
    }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "providerRawStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'provider_raw_reason',
        type: 'varchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "providerRawReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'decision_reason', type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "decisionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'payload',
        type: 'jsonb',
        default: () => "'{}'::jsonb",
    }),
    __metadata("design:type", Object)
], CallEventEntity.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'occurred_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CallEventEntity.prototype, "occurredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'received_at', type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], CallEventEntity.prototype, "receivedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CallEventEntity.prototype, "createdAt", void 0);
exports.CallEventEntity = CallEventEntity = __decorate([
    (0, typeorm_1.Entity)('call_events'),
    (0, typeorm_1.Index)('uk_call_events_tenant_id_id', ['tenantId', 'id'], { unique: true }),
    (0, typeorm_1.Index)('idx_call_events_tenant_call_occurred', ['tenantId', 'callSessionId', 'occurredAt']),
    (0, typeorm_1.Index)('idx_call_events_tenant_callback_occurred', [
        'tenantId',
        'callbackSessionId',
        'occurredAt',
    ]),
    (0, typeorm_1.Index)('idx_call_events_provider_call_occurred', ['providerCallId', 'occurredAt']),
    (0, typeorm_1.Index)('idx_call_events_routing_decision_key', ['tenantId', 'routingDecisionKey']),
    (0, typeorm_1.Index)('idx_call_events_tenant_target_endpoint_occurred', [
        'tenantId',
        'targetEndpointId',
        'occurredAt',
    ]),
    (0, typeorm_1.Index)('idx_call_events_tenant_session_direction_occurred', [
        'tenantId',
        'sessionDirection',
        'occurredAt',
    ])
], CallEventEntity);
