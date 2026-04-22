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
exports.TelephonyService = exports.TelephonyWebhookError = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const call_event_entity_1 = require("../call-event/entities/call-event.entity");
const call_session_entity_1 = require("../call-session/entities/call-session.entity");
const callback_session_entity_1 = require("../callback/entities/callback-session.entity");
const did_inventory_entity_1 = require("../tenant/entities/did-inventory.entity");
const tenant_did_assignment_entity_1 = require("../tenant/entities/tenant-did-assignment.entity");
const tenant_endpoint_entity_1 = require("../tenant/entities/tenant-endpoint.entity");
const tenant_entity_1 = require("../tenant/entities/tenant.entity");
const TELEPHONY_SIGNATURE_VERSION = 'v1';
const MAX_TIMESTAMP_SKEW_SECONDS = 300;
const NONCE_REPLAY_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_TELEPHONY_SHARED_KEYS = [
    {
        keyId: 'r5-r3-key-inbound-01',
        secret: 'r5-r3-secret-au-inbound-01',
    },
    {
        keyId: 'r5-r3-key-status-01',
        secret: 'r5-r3-secret-au-status-01',
    },
    {
        keyId: 'r5-r3-key-recording-01',
        secret: 'r5-r3-secret-au-recording-01',
    },
];
const KNOWN_TRUNK_KEYS = new Set([
    'au-did-inbound-01',
    'au-outbound-01',
    'gb-did-inbound-01',
    'gb-outbound-01',
]);
const TERMINAL_CALL_STATUSES = new Set([
    call_session_entity_1.CallSessionStatus.Completed,
    call_session_entity_1.CallSessionStatus.Failed,
    call_session_entity_1.CallSessionStatus.Canceled,
    call_session_entity_1.CallSessionStatus.Expired,
]);
const CALL_STATUS_RANK = {
    [call_session_entity_1.CallSessionStatus.Created]: 0,
    [call_session_entity_1.CallSessionStatus.Dispatching]: 1,
    [call_session_entity_1.CallSessionStatus.Ringing]: 2,
    [call_session_entity_1.CallSessionStatus.Answered]: 3,
    [call_session_entity_1.CallSessionStatus.Bridged]: 4,
    [call_session_entity_1.CallSessionStatus.Completed]: 5,
    [call_session_entity_1.CallSessionStatus.Failed]: 5,
    [call_session_entity_1.CallSessionStatus.Canceled]: 5,
    [call_session_entity_1.CallSessionStatus.Expired]: 5,
};
const OUTBOUND_STATUS_EVENT_NAMES = new Set([
    call_event_entity_1.CallEventName.TelephonyOutboundRinging,
    call_event_entity_1.CallEventName.TelephonyOutboundAnswered,
    call_event_entity_1.CallEventName.TelephonyOutboundBridged,
    call_event_entity_1.CallEventName.TelephonyOutboundCompleted,
    call_event_entity_1.CallEventName.TelephonyOutboundFailed,
    call_event_entity_1.CallEventName.TelephonyOutboundCanceled,
]);
const CALLBACK_STATUS_EVENT_NAMES = new Set([
    call_event_entity_1.CallEventName.TelephonyCallbackTargetRinging,
    call_event_entity_1.CallEventName.TelephonyCallbackTargetAnswered,
    call_event_entity_1.CallEventName.TelephonyCallbackBridged,
    call_event_entity_1.CallEventName.TelephonyCallbackCompleted,
    call_event_entity_1.CallEventName.TelephonyCallbackFailed,
    call_event_entity_1.CallEventName.TelephonyCallbackCanceled,
]);
const RECORDING_EVENT_NAMES = new Set([
    call_event_entity_1.CallEventName.TelephonyRecordingReady,
    call_event_entity_1.CallEventName.TelephonyRecordingFailed,
]);
class TelephonyWebhookError extends Error {
    status;
    body;
    constructor(status, body) {
        super(body.error_code ?? 'telephony_webhook_error');
        this.status = status;
        this.body = body;
    }
}
exports.TelephonyWebhookError = TelephonyWebhookError;
let TelephonyService = class TelephonyService {
    dataSource;
    tenantsRepository;
    tenantDidAssignmentsRepository;
    didInventoryRepository;
    tenantEndpointsRepository;
    callSessionsRepository;
    callbackSessionsRepository;
    callEventsRepository;
    sharedKeys;
    seenNonces = new Map();
    constructor(configService, dataSource, tenantsRepository, tenantDidAssignmentsRepository, didInventoryRepository, tenantEndpointsRepository, callSessionsRepository, callbackSessionsRepository, callEventsRepository) {
        this.dataSource = dataSource;
        this.tenantsRepository = tenantsRepository;
        this.tenantDidAssignmentsRepository = tenantDidAssignmentsRepository;
        this.didInventoryRepository = didInventoryRepository;
        this.tenantEndpointsRepository = tenantEndpointsRepository;
        this.callSessionsRepository = callSessionsRepository;
        this.callbackSessionsRepository = callbackSessionsRepository;
        this.callEventsRepository = callEventsRepository;
        this.sharedKeys = this.loadSharedKeys(configService);
    }
    async handleInboundCall(request, body) {
        this.verifyWebhookSignature(request);
        const payload = this.parseInboundPayload(body);
        const displayDid = this.tryNormalizeE164(payload.display_did);
        if (!displayDid) {
            return this.buildRejectResponse('invalid_display_did');
        }
        const remoteNumber = this.tryNormalizeE164(payload.remote_number);
        if (!remoteNumber) {
            return this.buildRejectResponse('invalid_remote_number');
        }
        payload.display_did = displayDid;
        payload.remote_number = remoteNumber;
        this.assertKnownTrunk(payload.trunk_key);
        const idempotencyKey = this.buildInboundIdempotencyKey(payload);
        const existingEvent = await this.callEventsRepository.findOne({
            where: {
                eventIdempotencyKey: idempotencyKey,
            },
            order: {
                createdAt: 'ASC',
            },
        });
        if (existingEvent) {
            this.assertInboundEventConsistency(existingEvent, payload);
            return this.rebuildInboundDecision(existingEvent);
        }
        const didContext = await this.lookupDidContext(payload.display_did);
        if (!didContext) {
            return this.buildRejectResponse('invalid_display_did');
        }
        if (didContext.tenant.status !== tenant_entity_1.TenantStatus.Active) {
            await this.persistInboundReject({
                payload,
                didContext,
                decisionReason: 'tenant_blocked',
                callbackSession: null,
            });
            return this.buildRejectResponse('tenant_blocked');
        }
        const callbackSessions = await this.callbackSessionsRepository.find({
            where: {
                tenantId: didContext.tenant.id,
                displayDidId: didContext.did.id,
                remoteNumber: payload.remote_number,
            },
            order: {
                createdAt: 'DESC',
            },
        });
        const now = new Date();
        const activeCallback = callbackSessions.find((session) => session.status === callback_session_entity_1.CallbackSessionStatus.Active &&
            session.expiresAt.getTime() > now.getTime());
        const expiredCallback = callbackSessions.find((session) => this.isExpiredCallback(session, now)) ?? null;
        if (!activeCallback) {
            const decisionReason = expiredCallback
                ? 'callback_expired'
                : 'callback_not_found';
            await this.persistInboundReject({
                payload,
                didContext,
                decisionReason,
                callbackSession: expiredCallback,
            });
            return this.buildRejectResponse(decisionReason);
        }
        const targetEndpoint = await this.resolveInboundTargetEndpoint(didContext.tenant.id, activeCallback);
        if (!targetEndpoint) {
            await this.persistInboundReject({
                payload,
                didContext,
                decisionReason: 'no_available_endpoint',
                callbackSession: activeCallback,
            });
            return this.buildRejectResponse('no_available_endpoint');
        }
        const persisted = await this.persistInboundRoute({
            payload,
            didContext,
            callbackSession: activeCallback,
            targetEndpoint,
            idempotencyKey,
        });
        return {
            accepted: true,
            session_direction: 'inbound',
            action: 'route_callback',
            decision_reason: 'matched_active_callback',
            tenant_ref: didContext.tenant.code,
            call_session_ref: persisted.callSession.id,
            callback_session_ref: persisted.callbackSession.id,
            target_endpoint_ref: persisted.targetEndpoint.id,
            expires_at: persisted.callbackSession.expiresAt.toISOString(),
        };
    }
    async handleCallStatus(request, body) {
        this.verifyWebhookSignature(request);
        const payload = this.parseCallStatusPayload(body);
        this.assertKnownTrunk(payload.trunk_key);
        const idempotencyKey = this.buildCallStatusIdempotencyKey(payload);
        const existingEvent = await this.callEventsRepository.findOne({
            where: {
                eventIdempotencyKey: idempotencyKey,
            },
            order: {
                createdAt: 'ASC',
            },
        });
        if (existingEvent) {
            this.assertStatusEventConsistency(existingEvent, payload);
            return {
                accepted: true,
                call_session_ref: payload.call_session_ref,
                state_applied: false,
            };
        }
        const mutation = await this.applyCallStatusEvent(payload, body, idempotencyKey);
        return {
            accepted: true,
            call_session_ref: mutation.callSession.id,
            state_applied: mutation.stateApplied,
        };
    }
    async handleRecordingReady(request, body) {
        this.verifyWebhookSignature(request);
        const payload = this.parseRecordingPayload(body);
        this.assertKnownTrunk(payload.trunk_key);
        const idempotencyKey = this.buildRecordingIdempotencyKey(payload);
        const existingEvent = await this.callEventsRepository.findOne({
            where: {
                eventIdempotencyKey: idempotencyKey,
            },
            order: {
                createdAt: 'ASC',
            },
        });
        if (existingEvent) {
            this.assertRecordingEventConsistency(existingEvent, payload);
            return {
                accepted: true,
                call_session_ref: payload.call_session_ref,
                recording_registered: true,
            };
        }
        const mutation = await this.applyRecordingEvent(payload, body, idempotencyKey);
        return {
            accepted: true,
            call_session_ref: mutation.callSession.id,
            recording_registered: mutation.recordingRegistered,
        };
    }
    async rebuildInboundDecision(inboundEvent) {
        if (inboundEvent.decisionReason === 'matched_active_callback' &&
            inboundEvent.callSessionId != null) {
            const [callSession, callbackSession] = await Promise.all([
                this.callSessionsRepository.findOne({
                    where: {
                        id: inboundEvent.callSessionId,
                    },
                }),
                inboundEvent.callbackSessionId
                    ? this.callbackSessionsRepository.findOne({
                        where: {
                            id: inboundEvent.callbackSessionId,
                        },
                    })
                    : Promise.resolve(null),
            ]);
            if (!callSession || !callbackSession) {
                throw this.createError(404, 'call_session_not_found', false);
            }
            return {
                accepted: true,
                session_direction: 'inbound',
                action: 'route_callback',
                decision_reason: 'matched_active_callback',
                tenant_ref: (await this.resolveTenantRef(callSession.tenantId)) ?? callSession.tenantId,
                call_session_ref: callSession.id,
                callback_session_ref: callbackSession.id,
                target_endpoint_ref: callbackSession.targetEndpointId ?? inboundEvent.targetEndpointId ?? undefined,
                expires_at: callbackSession.expiresAt.toISOString(),
            };
        }
        return this.buildRejectResponse(this.asInboundDecisionReason(inboundEvent.decisionReason ?? 'callback_not_found'));
    }
    async persistInboundRoute(params) {
        const { payload, didContext, callbackSession, targetEndpoint, idempotencyKey } = params;
        const routingDecisionKey = this.buildRoutingDecisionKey(payload);
        return this.dataSource.transaction(async (manager) => {
            const callSessionsRepository = manager.getRepository(call_session_entity_1.CallSessionEntity);
            const callbackSessionsRepository = manager.getRepository(callback_session_entity_1.CallbackSessionEntity);
            const callEventsRepository = manager.getRepository(call_event_entity_1.CallEventEntity);
            const callSession = await callSessionsRepository.save(callSessionsRepository.create({
                tenantId: didContext.tenant.id,
                tenantDidAssignmentId: didContext.assignment.id,
                initiatedByMemberId: null,
                fromEndpointId: targetEndpoint.id,
                callbackSessionId: callbackSession.id,
                direction: call_session_entity_1.CallSessionDirection.Inbound,
                remoteNumber: payload.remote_number,
                displayDidId: didContext.did.id,
                providerCallId: payload.provider_call_id,
                selectedTrunkKey: payload.trunk_key,
                status: call_session_entity_1.CallSessionStatus.Dispatching,
                hangupCause: null,
                startedAt: payload.occurred_at,
                answeredAt: null,
                endedAt: null,
            }));
            callbackSession.status = callback_session_entity_1.CallbackSessionStatus.Routing;
            callbackSession.targetEndpointId = targetEndpoint.id;
            callbackSession.lastRoutedEndpointId = targetEndpoint.id;
            callbackSession.matchedAt ??= payload.occurred_at;
            callbackSession.lastInboundAt = payload.occurred_at;
            callbackSession.decisionReason = 'matched_active_callback';
            callbackSession.routingDecisionKey = routingDecisionKey;
            const savedCallbackSession = await callbackSessionsRepository.save(callbackSession);
            const inboundEvent = await callEventsRepository.save(callEventsRepository.create({
                tenantId: didContext.tenant.id,
                callSessionId: callSession.id,
                callbackSessionId: savedCallbackSession.id,
                targetEndpointId: targetEndpoint.id,
                eventName: call_event_entity_1.CallEventName.TelephonyInboundReceived,
                eventDirection: call_event_entity_1.CallEventDirection.Inbound,
                sessionDirection: call_event_entity_1.CallEventSessionDirection.Inbound,
                providerKey: payload.provider_key,
                trunkKey: payload.trunk_key,
                providerEventId: payload.provider_event_id,
                providerCallId: payload.provider_call_id,
                displayDid: payload.display_did,
                remoteNumber: payload.remote_number,
                traceId: payload.trace_id,
                eventIdempotencyKey: idempotencyKey,
                routingDecisionKey,
                providerRawStatus: payload.provider_raw_status,
                providerRawReason: payload.provider_raw_reason,
                decisionReason: 'matched_active_callback',
                payload: {
                    ...this.serializeInboundPayload(payload),
                    action: 'route_callback',
                    callback_session_ref: savedCallbackSession.id,
                    target_endpoint_ref: targetEndpoint.id,
                },
                occurredAt: payload.occurred_at,
            }));
            await callEventsRepository.save(callEventsRepository.create({
                tenantId: didContext.tenant.id,
                callSessionId: callSession.id,
                callbackSessionId: savedCallbackSession.id,
                targetEndpointId: targetEndpoint.id,
                eventName: call_event_entity_1.CallEventName.TelephonyCallbackMatched,
                eventDirection: call_event_entity_1.CallEventDirection.Internal,
                sessionDirection: call_event_entity_1.CallEventSessionDirection.Inbound,
                providerKey: payload.provider_key,
                trunkKey: payload.trunk_key,
                providerEventId: `${payload.provider_event_id}:matched`,
                providerCallId: payload.provider_call_id,
                displayDid: payload.display_did,
                remoteNumber: payload.remote_number,
                traceId: payload.trace_id,
                eventIdempotencyKey: `${idempotencyKey}:matched`,
                routingDecisionKey,
                providerRawStatus: 'matched',
                providerRawReason: null,
                decisionReason: 'matched_active_callback',
                payload: {
                    ...this.serializeInboundPayload(payload),
                    action: 'route_callback',
                    callback_session_ref: savedCallbackSession.id,
                    target_endpoint_ref: targetEndpoint.id,
                },
                occurredAt: payload.occurred_at,
            }));
            return {
                inboundEvent,
                callSession,
                callbackSession: savedCallbackSession,
                targetEndpoint,
            };
        });
    }
    async persistInboundReject(params) {
        const { payload, didContext, decisionReason, callbackSession } = params;
        const idempotencyKey = this.buildInboundIdempotencyKey(payload);
        const routingDecisionKey = this.buildRoutingDecisionKey(payload);
        await this.dataSource.transaction(async (manager) => {
            const callbackSessionsRepository = manager.getRepository(callback_session_entity_1.CallbackSessionEntity);
            const callEventsRepository = manager.getRepository(call_event_entity_1.CallEventEntity);
            if (callbackSession && this.isExpiredCallback(callbackSession, payload.occurred_at)) {
                callbackSession.status = callback_session_entity_1.CallbackSessionStatus.Expired;
                callbackSession.expiredAt ??= payload.occurred_at;
                callbackSession.lastInboundAt = payload.occurred_at;
                callbackSession.decisionReason = decisionReason;
                callbackSession.routingDecisionKey = routingDecisionKey;
                await callbackSessionsRepository.save(callbackSession);
            }
            await callEventsRepository.save(callEventsRepository.create({
                tenantId: didContext.tenant.id,
                callSessionId: null,
                callbackSessionId: null,
                targetEndpointId: null,
                eventName: call_event_entity_1.CallEventName.TelephonyInboundReceived,
                eventDirection: call_event_entity_1.CallEventDirection.Inbound,
                sessionDirection: call_event_entity_1.CallEventSessionDirection.Inbound,
                providerKey: payload.provider_key,
                trunkKey: payload.trunk_key,
                providerEventId: payload.provider_event_id,
                providerCallId: payload.provider_call_id,
                displayDid: payload.display_did,
                remoteNumber: payload.remote_number,
                traceId: payload.trace_id,
                eventIdempotencyKey: idempotencyKey,
                routingDecisionKey,
                providerRawStatus: payload.provider_raw_status,
                providerRawReason: payload.provider_raw_reason,
                decisionReason,
                payload: {
                    ...this.serializeInboundPayload(payload),
                    action: 'reject',
                    decision_reason: decisionReason,
                },
                occurredAt: payload.occurred_at,
            }));
            await callEventsRepository.save(callEventsRepository.create({
                tenantId: didContext.tenant.id,
                callSessionId: null,
                callbackSessionId: null,
                targetEndpointId: null,
                eventName: call_event_entity_1.CallEventName.TelephonyCallbackRejected,
                eventDirection: call_event_entity_1.CallEventDirection.Internal,
                sessionDirection: call_event_entity_1.CallEventSessionDirection.Inbound,
                providerKey: payload.provider_key,
                trunkKey: payload.trunk_key,
                providerEventId: `${payload.provider_event_id}:rejected`,
                providerCallId: payload.provider_call_id,
                displayDid: payload.display_did,
                remoteNumber: payload.remote_number,
                traceId: payload.trace_id,
                eventIdempotencyKey: `${idempotencyKey}:rejected`,
                routingDecisionKey,
                providerRawStatus: payload.provider_raw_status ?? decisionReason,
                providerRawReason: payload.provider_raw_reason,
                decisionReason,
                payload: {
                    ...this.serializeInboundPayload(payload),
                    action: 'reject',
                    decision_reason: decisionReason,
                },
                occurredAt: payload.occurred_at,
            }));
        });
    }
    async applyCallStatusEvent(payload, rawBody, idempotencyKey) {
        return this.dataSource.transaction(async (manager) => {
            const callSessionsRepository = manager.getRepository(call_session_entity_1.CallSessionEntity);
            const callbackSessionsRepository = manager.getRepository(callback_session_entity_1.CallbackSessionEntity);
            const callEventsRepository = manager.getRepository(call_event_entity_1.CallEventEntity);
            const callSession = await callSessionsRepository.findOne({
                where: {
                    id: payload.call_session_ref,
                },
            });
            if (!callSession) {
                throw this.createError(404, 'call_session_not_found', false);
            }
            this.assertSessionDirection(callSession, payload.session_direction);
            const callbackSession = payload.callback_session_ref
                ? await callbackSessionsRepository.findOne({
                    where: {
                        id: payload.callback_session_ref,
                        tenantId: callSession.tenantId,
                    },
                })
                : null;
            if (payload.callback_session_ref && !callbackSession) {
                throw this.createError(404, 'callback_session_not_found', false);
            }
            const targetEndpointId = payload.target_endpoint_ref ??
                callbackSession?.targetEndpointId ??
                callSession.fromEndpointId;
            if (payload.event_name === call_event_entity_1.CallEventName.TelephonyCallbackTargetRinging ||
                payload.event_name === call_event_entity_1.CallEventName.TelephonyCallbackTargetAnswered) {
                if (!targetEndpointId) {
                    throw this.createError(404, 'target_endpoint_not_found', false);
                }
            }
            if (payload.target_endpoint_ref) {
                const targetEndpoint = await this.tenantEndpointsRepository.findOne({
                    where: {
                        id: payload.target_endpoint_ref,
                        tenantId: callSession.tenantId,
                    },
                });
                if (!targetEndpoint) {
                    throw this.createError(404, 'target_endpoint_not_found', false);
                }
            }
            const callEvent = callEventsRepository.create({
                tenantId: callSession.tenantId,
                callSessionId: callSession.id,
                callbackSessionId: callbackSession?.id ?? null,
                targetEndpointId: targetEndpointId ?? null,
                eventName: payload.event_name,
                eventDirection: this.toCallEventDirection(payload.event_direction),
                sessionDirection: payload.session_direction,
                providerKey: payload.provider_key,
                trunkKey: payload.trunk_key,
                providerEventId: payload.provider_event_id,
                providerCallId: payload.provider_call_id,
                displayDid: payload.display_did,
                remoteNumber: payload.remote_number,
                traceId: payload.trace_id,
                eventIdempotencyKey: idempotencyKey,
                routingDecisionKey: callbackSession?.routingDecisionKey ?? null,
                providerRawStatus: payload.provider_raw_status,
                providerRawReason: payload.provider_raw_reason,
                decisionReason: callbackSession?.decisionReason ?? null,
                payload: {
                    ...rawBody,
                    call_session_ref: callSession.id,
                    callback_session_ref: callbackSession?.id ?? null,
                    target_endpoint_ref: targetEndpointId,
                },
                occurredAt: payload.occurred_at,
            });
            await callEventsRepository.save(callEvent);
            let stateApplied = false;
            const nextStatus = this.resolveCallStatusFromEvent(payload.event_name);
            if (this.shouldApplyCallStatusTransition(callSession.status, nextStatus)) {
                callSession.status = nextStatus;
                stateApplied = true;
            }
            callSession.providerCallId = payload.provider_call_id;
            callSession.selectedTrunkKey = payload.trunk_key;
            callSession.startedAt ??= payload.occurred_at;
            if (payload.answered_at) {
                callSession.answeredAt = payload.answered_at;
            }
            else if (nextStatus === call_session_entity_1.CallSessionStatus.Answered ||
                nextStatus === call_session_entity_1.CallSessionStatus.Bridged) {
                callSession.answeredAt ??= payload.occurred_at;
            }
            if (payload.ended_at) {
                callSession.endedAt = payload.ended_at;
            }
            else if (TERMINAL_CALL_STATUSES.has(nextStatus)) {
                callSession.endedAt ??= payload.occurred_at;
            }
            if (payload.hangup_cause) {
                callSession.hangupCause = payload.hangup_cause;
            }
            if (targetEndpointId && !callSession.fromEndpointId) {
                callSession.fromEndpointId = targetEndpointId;
            }
            await callSessionsRepository.save(callSession);
            if (callbackSession) {
                this.applyCallbackSessionMutation(callbackSession, payload, targetEndpointId);
                await callbackSessionsRepository.save(callbackSession);
            }
            return {
                callSession,
                stateApplied,
            };
        });
    }
    async applyRecordingEvent(payload, rawBody, idempotencyKey) {
        return this.dataSource.transaction(async (manager) => {
            const callSessionsRepository = manager.getRepository(call_session_entity_1.CallSessionEntity);
            const callEventsRepository = manager.getRepository(call_event_entity_1.CallEventEntity);
            const callSession = await callSessionsRepository.findOne({
                where: {
                    id: payload.call_session_ref,
                },
            });
            if (!callSession) {
                throw this.createError(404, 'call_session_not_found', false);
            }
            this.assertSessionDirection(callSession, payload.session_direction);
            await callEventsRepository.save(callEventsRepository.create({
                tenantId: callSession.tenantId,
                callSessionId: callSession.id,
                callbackSessionId: callSession.callbackSessionId,
                targetEndpointId: callSession.fromEndpointId,
                eventName: payload.event_name,
                eventDirection: this.toCallEventDirection(payload.event_direction),
                sessionDirection: payload.session_direction,
                providerKey: payload.provider_key,
                trunkKey: payload.trunk_key,
                providerEventId: payload.provider_event_id,
                providerCallId: payload.provider_call_id,
                displayDid: payload.display_did,
                remoteNumber: payload.remote_number,
                traceId: payload.trace_id,
                eventIdempotencyKey: idempotencyKey,
                routingDecisionKey: null,
                providerRawStatus: payload.provider_raw_status,
                providerRawReason: payload.provider_raw_reason,
                decisionReason: null,
                payload: {
                    ...rawBody,
                    call_session_ref: callSession.id,
                },
                occurredAt: payload.occurred_at,
            }));
            callSession.providerCallId = payload.provider_call_id;
            callSession.selectedTrunkKey = payload.trunk_key;
            await callSessionsRepository.save(callSession);
            return {
                callSession,
                recordingRegistered: true,
            };
        });
    }
    applyCallbackSessionMutation(callbackSession, payload, targetEndpointId) {
        if (targetEndpointId) {
            callbackSession.targetEndpointId = targetEndpointId;
            callbackSession.lastRoutedEndpointId = targetEndpointId;
        }
        if (CALLBACK_STATUS_EVENT_NAMES.has(payload.event_name)) {
            callbackSession.lastInboundAt = payload.occurred_at;
        }
        switch (payload.event_name) {
            case call_event_entity_1.CallEventName.TelephonyCallbackTargetRinging:
            case call_event_entity_1.CallEventName.TelephonyCallbackTargetAnswered:
                if (callbackSession.status !== callback_session_entity_1.CallbackSessionStatus.Fulfilled &&
                    callbackSession.status !== callback_session_entity_1.CallbackSessionStatus.Expired) {
                    callbackSession.status = callback_session_entity_1.CallbackSessionStatus.Routing;
                }
                break;
            case call_event_entity_1.CallEventName.TelephonyCallbackBridged:
            case call_event_entity_1.CallEventName.TelephonyCallbackCompleted:
                callbackSession.status = callback_session_entity_1.CallbackSessionStatus.Fulfilled;
                callbackSession.matchedAt ??= payload.occurred_at;
                break;
            case call_event_entity_1.CallEventName.TelephonyCallbackFailed:
                callbackSession.status = callback_session_entity_1.CallbackSessionStatus.Failed;
                break;
            case call_event_entity_1.CallEventName.TelephonyCallbackCanceled:
                callbackSession.status = callback_session_entity_1.CallbackSessionStatus.Revoked;
                break;
            default:
                break;
        }
    }
    shouldApplyCallStatusTransition(current, next) {
        if (current === next) {
            return false;
        }
        if (TERMINAL_CALL_STATUSES.has(current)) {
            return false;
        }
        return CALL_STATUS_RANK[next] > CALL_STATUS_RANK[current];
    }
    resolveCallStatusFromEvent(eventName) {
        switch (eventName) {
            case call_event_entity_1.CallEventName.TelephonyCallbackTargetRinging:
            case call_event_entity_1.CallEventName.TelephonyOutboundRinging:
                return call_session_entity_1.CallSessionStatus.Ringing;
            case call_event_entity_1.CallEventName.TelephonyCallbackTargetAnswered:
            case call_event_entity_1.CallEventName.TelephonyOutboundAnswered:
                return call_session_entity_1.CallSessionStatus.Answered;
            case call_event_entity_1.CallEventName.TelephonyCallbackBridged:
            case call_event_entity_1.CallEventName.TelephonyOutboundBridged:
                return call_session_entity_1.CallSessionStatus.Bridged;
            case call_event_entity_1.CallEventName.TelephonyCallbackCompleted:
            case call_event_entity_1.CallEventName.TelephonyOutboundCompleted:
                return call_session_entity_1.CallSessionStatus.Completed;
            case call_event_entity_1.CallEventName.TelephonyCallbackFailed:
            case call_event_entity_1.CallEventName.TelephonyOutboundFailed:
                return call_session_entity_1.CallSessionStatus.Failed;
            case call_event_entity_1.CallEventName.TelephonyCallbackCanceled:
            case call_event_entity_1.CallEventName.TelephonyOutboundCanceled:
                return call_session_entity_1.CallSessionStatus.Canceled;
            default:
                return call_session_entity_1.CallSessionStatus.Dispatching;
        }
    }
    async lookupDidContext(displayDid) {
        const assignments = await this.tenantDidAssignmentsRepository.find({
            where: {
                status: tenant_did_assignment_entity_1.TenantDidAssignmentStatus.Active,
            },
            order: {
                activatedAt: 'ASC',
                createdAt: 'ASC',
            },
        });
        if (assignments.length === 0) {
            return null;
        }
        const didIds = assignments.map((assignment) => assignment.didId);
        const dids = await this.didInventoryRepository.find({
            where: {
                id: (0, typeorm_2.In)(didIds),
                phoneNumberE164: displayDid,
                status: (0, typeorm_2.In)([
                    did_inventory_entity_1.DidInventoryStatus.Assigned,
                    did_inventory_entity_1.DidInventoryStatus.Reserved,
                    did_inventory_entity_1.DidInventoryStatus.Available,
                ]),
            },
        });
        const did = dids[0] ?? null;
        if (!did) {
            return null;
        }
        const assignment = assignments.find((item) => item.didId === did.id) ?? null;
        if (!assignment) {
            return null;
        }
        const tenant = await this.tenantsRepository.findOne({
            where: {
                id: assignment.tenantId,
            },
        });
        if (!tenant) {
            return null;
        }
        return {
            tenant,
            assignment,
            did,
        };
    }
    async resolveInboundTargetEndpoint(tenantId, callbackSession) {
        const endpointIds = [
            callbackSession.targetEndpointId,
            callbackSession.lastRoutedEndpointId,
        ].filter((value) => value != null);
        if (endpointIds.length === 0) {
            return null;
        }
        const endpoints = await this.tenantEndpointsRepository.find({
            where: {
                id: (0, typeorm_2.In)(endpointIds),
                tenantId,
                status: tenant_endpoint_entity_1.TenantEndpointStatus.Active,
            },
            order: {
                priority: 'ASC',
                createdAt: 'ASC',
            },
        });
        return endpoints[0] ?? null;
    }
    buildInboundIdempotencyKey(payload) {
        return [
            payload.provider_key,
            payload.trunk_key,
            payload.provider_call_id,
            call_event_entity_1.CallEventName.TelephonyInboundReceived,
        ].join(':');
    }
    buildCallStatusIdempotencyKey(payload) {
        return [
            payload.provider_key,
            payload.trunk_key,
            payload.provider_call_id,
            payload.event_name,
            payload.provider_event_id,
        ].join(':');
    }
    buildRecordingIdempotencyKey(payload) {
        return [
            payload.provider_key,
            payload.trunk_key,
            payload.provider_call_id,
            payload.event_name,
            payload.recording_id,
        ].join(':');
    }
    buildRoutingDecisionKey(payload) {
        return `route:${payload.display_did}:${payload.remote_number}:${payload.provider_call_id}`;
    }
    buildRejectResponse(decisionReason) {
        return {
            accepted: true,
            session_direction: 'inbound',
            action: 'reject',
            decision_reason: decisionReason,
        };
    }
    async resolveTenantRef(tenantId) {
        const tenant = await this.tenantsRepository.findOne({
            where: {
                id: tenantId,
            },
        });
        return tenant?.code ?? null;
    }
    verifyWebhookSignature(request) {
        const keyId = this.extractHeader(request, 'x-telephony-key-id');
        const timestampRaw = this.extractHeader(request, 'x-telephony-timestamp');
        const nonce = this.extractHeader(request, 'x-telephony-nonce');
        const signatureVersion = this.extractHeader(request, 'x-telephony-signature-version');
        const signature = this.extractHeader(request, 'x-telephony-signature');
        if (!keyId || !timestampRaw || !nonce || !signatureVersion || !signature) {
            throw this.createError(401, 'auth_missing_or_unknown_key', false);
        }
        if (signatureVersion !== TELEPHONY_SIGNATURE_VERSION) {
            throw this.createError(422, 'unsupported_signature_version', false);
        }
        const secret = this.sharedKeys.get(keyId);
        if (!secret) {
            throw this.createError(401, 'auth_missing_or_unknown_key', false);
        }
        const timestamp = Number.parseInt(timestampRaw, 10);
        if (!Number.isFinite(timestamp)) {
            throw this.createError(403, 'timestamp_skew', false);
        }
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (Math.abs(nowSeconds - timestamp) > MAX_TIMESTAMP_SKEW_SECONDS) {
            throw this.createError(403, 'timestamp_skew', false);
        }
        const rawBody = request.rawBody ?? Buffer.from('{}');
        const bodyHash = (0, crypto_1.createHash)('sha256').update(rawBody).digest('hex');
        const canonicalString = [
            request.method.toUpperCase(),
            request.path,
            String(timestamp),
            nonce,
            bodyHash,
        ].join('\n');
        const expectedSignature = (0, crypto_1.createHmac)('sha256', secret)
            .update(canonicalString)
            .digest('base64url');
        const actualBuffer = Buffer.from(signature, 'base64url');
        const expectedBuffer = Buffer.from(expectedSignature, 'base64url');
        if (actualBuffer.length !== expectedBuffer.length ||
            !(0, crypto_1.timingSafeEqual)(actualBuffer, expectedBuffer)) {
            throw this.createError(403, 'signature_invalid', false);
        }
        this.assertNonceFresh(keyId, nonce);
        return { rawBody };
    }
    extractHeader(request, name) {
        const raw = request.headers[name];
        const value = Array.isArray(raw) ? raw[0] : raw;
        const normalized = value?.trim();
        return normalized ? normalized : null;
    }
    assertNonceFresh(keyId, nonce) {
        const now = Date.now();
        for (const [cacheKey, expiresAt] of this.seenNonces.entries()) {
            if (expiresAt <= now) {
                this.seenNonces.delete(cacheKey);
            }
        }
        const cacheKey = `${keyId}:${nonce}`;
        const existing = this.seenNonces.get(cacheKey);
        if (existing && existing > now) {
            throw this.createError(403, 'nonce_replayed', false);
        }
        this.seenNonces.set(cacheKey, now + NONCE_REPLAY_WINDOW_MS);
    }
    loadSharedKeys(configService) {
        const raw = configService.get('TELEPHONY_SHARED_KEYS_JSON');
        const keys = raw ? this.parseSharedKeys(raw) : DEFAULT_TELEPHONY_SHARED_KEYS;
        return new Map(keys.map((item) => [item.keyId, item.secret]));
    }
    parseSharedKeys(raw) {
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return DEFAULT_TELEPHONY_SHARED_KEYS;
            }
            const keys = parsed
                .map((item) => {
                if (!item ||
                    typeof item !== 'object' ||
                    typeof item.keyId !== 'string' ||
                    typeof item.secret !== 'string') {
                    return null;
                }
                return {
                    keyId: item.keyId.trim(),
                    secret: item.secret.trim(),
                };
            })
                .filter((item) => item != null);
            return keys.length > 0 ? keys : DEFAULT_TELEPHONY_SHARED_KEYS;
        }
        catch {
            return DEFAULT_TELEPHONY_SHARED_KEYS;
        }
    }
    parseInboundPayload(body) {
        const eventName = this.expectCallEventName(body.event_name);
        if (eventName !== call_event_entity_1.CallEventName.TelephonyInboundReceived) {
            throw this.createError(400, 'invalid_payload', false);
        }
        const eventDirection = this.expectString(body.event_direction, 'event_direction');
        if (eventDirection !== call_event_entity_1.CallEventDirection.Inbound) {
            throw this.createError(400, 'invalid_payload', false);
        }
        const payload = {
            event_name: eventName,
            event_direction: eventDirection,
            provider_key: this.expectString(body.provider_key, 'provider_key'),
            trunk_key: this.expectString(body.trunk_key, 'trunk_key'),
            provider_event_id: this.expectString(body.provider_event_id, 'provider_event_id'),
            provider_call_id: this.expectString(body.provider_call_id, 'provider_call_id'),
            occurred_at: this.expectDate(body.occurred_at, 'occurred_at'),
            trace_id: this.optionalString(body.trace_id),
            display_did: this.expectString(body.display_did, 'display_did'),
            remote_number: this.expectString(body.remote_number, 'remote_number'),
            provider_raw_status: this.optionalString(body.provider_raw_status),
            provider_raw_reason: this.optionalNullableString(body.provider_raw_reason),
        };
        return payload;
    }
    parseCallStatusPayload(body) {
        const eventName = this.expectCallEventName(body.event_name);
        if (!OUTBOUND_STATUS_EVENT_NAMES.has(eventName) &&
            !CALLBACK_STATUS_EVENT_NAMES.has(eventName)) {
            throw this.createError(400, 'invalid_payload', false);
        }
        const eventDirection = this.expectString(body.event_direction, 'event_direction');
        const sessionDirection = this.expectSessionDirection(body.session_direction);
        this.assertEventDirectionMatches(eventName, eventDirection, sessionDirection);
        const callbackSessionRef = this.optionalString(body.callback_session_ref);
        const targetEndpointRef = this.optionalString(body.target_endpoint_ref);
        if (CALLBACK_STATUS_EVENT_NAMES.has(eventName) && !callbackSessionRef) {
            throw this.createError(400, 'invalid_payload', false);
        }
        if (eventName === call_event_entity_1.CallEventName.TelephonyCallbackTargetRinging ||
            eventName === call_event_entity_1.CallEventName.TelephonyCallbackTargetAnswered) {
            if (!targetEndpointRef) {
                throw this.createError(400, 'invalid_payload', false);
            }
        }
        return {
            event_name: eventName,
            event_direction: eventDirection,
            provider_key: this.expectString(body.provider_key, 'provider_key'),
            trunk_key: this.expectString(body.trunk_key, 'trunk_key'),
            provider_event_id: this.expectString(body.provider_event_id, 'provider_event_id'),
            provider_call_id: this.expectString(body.provider_call_id, 'provider_call_id'),
            occurred_at: this.expectDate(body.occurred_at, 'occurred_at'),
            session_direction: sessionDirection,
            trace_id: this.optionalString(body.trace_id),
            tenant_ref: this.optionalString(body.tenant_ref),
            call_session_ref: this.expectString(body.call_session_ref, 'call_session_ref'),
            callback_session_ref: callbackSessionRef,
            target_endpoint_ref: targetEndpointRef,
            display_did: this.normalizeE164OrThrowPayload(body.display_did),
            remote_number: this.normalizeE164OrThrowPayload(body.remote_number),
            provider_raw_status: this.optionalString(body.provider_raw_status),
            provider_raw_reason: this.optionalNullableString(body.provider_raw_reason),
            hangup_cause: this.optionalString(body.hangup_cause),
            answered_at: this.optionalDate(body.answered_at),
            ended_at: this.optionalDate(body.ended_at),
            billable_duration_sec: this.optionalNumber(body.billable_duration_sec),
        };
    }
    parseRecordingPayload(body) {
        const eventName = this.expectCallEventName(body.event_name);
        if (!RECORDING_EVENT_NAMES.has(eventName)) {
            throw this.createError(400, 'invalid_payload', false);
        }
        const eventDirection = this.expectString(body.event_direction, 'event_direction');
        if (eventDirection !== call_event_entity_1.CallEventDirection.Internal) {
            throw this.createError(400, 'invalid_payload', false);
        }
        return {
            event_name: eventName,
            event_direction: eventDirection,
            provider_key: this.expectString(body.provider_key, 'provider_key'),
            trunk_key: this.expectString(body.trunk_key, 'trunk_key'),
            provider_event_id: this.expectString(body.provider_event_id, 'provider_event_id'),
            provider_call_id: this.expectString(body.provider_call_id, 'provider_call_id'),
            occurred_at: this.expectDate(body.occurred_at, 'occurred_at'),
            session_direction: this.expectSessionDirection(body.session_direction),
            trace_id: this.optionalString(body.trace_id),
            tenant_ref: this.optionalString(body.tenant_ref),
            call_session_ref: this.expectString(body.call_session_ref, 'call_session_ref'),
            display_did: this.normalizeE164OrThrowPayload(body.display_did),
            remote_number: this.normalizeE164OrThrowPayload(body.remote_number),
            provider_raw_status: this.optionalString(body.provider_raw_status),
            provider_raw_reason: this.optionalNullableString(body.provider_raw_reason),
            recording_id: this.expectString(body.recording_id, 'recording_id'),
            recording_scope: this.optionalString(body.recording_scope),
            recording_url: this.optionalString(body.recording_url),
            duration_sec: this.optionalNumber(body.duration_sec),
            checksum_sha256: this.optionalString(body.checksum_sha256),
        };
    }
    serializeInboundPayload(payload) {
        return {
            event_name: payload.event_name,
            event_direction: payload.event_direction,
            provider_key: payload.provider_key,
            trunk_key: payload.trunk_key,
            provider_event_id: payload.provider_event_id,
            provider_call_id: payload.provider_call_id,
            occurred_at: payload.occurred_at.toISOString(),
            trace_id: payload.trace_id,
            display_did: payload.display_did,
            remote_number: payload.remote_number,
            provider_raw_status: payload.provider_raw_status,
            provider_raw_reason: payload.provider_raw_reason,
        };
    }
    assertKnownTrunk(trunkKey) {
        if (!KNOWN_TRUNK_KEYS.has(trunkKey)) {
            throw this.createError(404, 'unknown_trunk', false);
        }
    }
    assertInboundEventConsistency(existingEvent, payload) {
        if (existingEvent.eventName !== call_event_entity_1.CallEventName.TelephonyInboundReceived ||
            existingEvent.providerKey !== payload.provider_key ||
            existingEvent.trunkKey !== payload.trunk_key ||
            existingEvent.providerCallId !== payload.provider_call_id ||
            existingEvent.displayDid !== payload.display_did ||
            existingEvent.remoteNumber !== payload.remote_number) {
            throw this.createError(409, 'event_conflict', false);
        }
    }
    assertStatusEventConsistency(existingEvent, payload) {
        const targetEndpointMatches = payload.target_endpoint_ref == null ||
            existingEvent.targetEndpointId === payload.target_endpoint_ref;
        if (existingEvent.eventName !== payload.event_name ||
            existingEvent.providerKey !== payload.provider_key ||
            existingEvent.trunkKey !== payload.trunk_key ||
            existingEvent.providerCallId !== payload.provider_call_id ||
            existingEvent.callSessionId !== payload.call_session_ref ||
            existingEvent.callbackSessionId !== payload.callback_session_ref ||
            !targetEndpointMatches ||
            existingEvent.displayDid !== payload.display_did ||
            existingEvent.remoteNumber !== payload.remote_number) {
            throw this.createError(409, 'event_conflict', false);
        }
    }
    assertRecordingEventConsistency(existingEvent, payload) {
        const existingRecordingId = this.readStringField(existingEvent.payload.recording_id);
        if (existingEvent.eventName !== payload.event_name ||
            existingEvent.providerKey !== payload.provider_key ||
            existingEvent.trunkKey !== payload.trunk_key ||
            existingEvent.providerCallId !== payload.provider_call_id ||
            existingEvent.callSessionId !== payload.call_session_ref ||
            existingRecordingId !== payload.recording_id) {
            throw this.createError(409, 'event_conflict', false);
        }
    }
    assertSessionDirection(callSession, sessionDirection) {
        if ((callSession.direction === call_session_entity_1.CallSessionDirection.Inbound &&
            sessionDirection !== call_event_entity_1.CallEventSessionDirection.Inbound) ||
            (callSession.direction === call_session_entity_1.CallSessionDirection.Outbound &&
                sessionDirection !== call_event_entity_1.CallEventSessionDirection.Outbound)) {
            throw this.createError(409, 'event_conflict', false);
        }
    }
    assertEventDirectionMatches(eventName, eventDirection, sessionDirection) {
        if (OUTBOUND_STATUS_EVENT_NAMES.has(eventName)) {
            if (eventDirection !== call_event_entity_1.CallEventDirection.Outbound ||
                sessionDirection !== call_event_entity_1.CallEventSessionDirection.Outbound) {
                throw this.createError(400, 'invalid_payload', false);
            }
            return;
        }
        if (CALLBACK_STATUS_EVENT_NAMES.has(eventName) &&
            (eventDirection !== call_event_entity_1.CallEventDirection.Internal ||
                sessionDirection !== call_event_entity_1.CallEventSessionDirection.Inbound)) {
            throw this.createError(400, 'invalid_payload', false);
        }
    }
    expectCallEventName(value) {
        const normalized = this.expectString(value, 'event_name');
        if (!Object.values(call_event_entity_1.CallEventName).includes(normalized)) {
            throw this.createError(400, 'invalid_payload', false);
        }
        return normalized;
    }
    expectSessionDirection(value) {
        const normalized = this.expectString(value, 'session_direction');
        if (normalized !== call_event_entity_1.CallEventSessionDirection.Inbound &&
            normalized !== call_event_entity_1.CallEventSessionDirection.Outbound) {
            throw this.createError(400, 'invalid_payload', false);
        }
        return normalized;
    }
    toCallEventDirection(value) {
        if (value !== call_event_entity_1.CallEventDirection.Inbound &&
            value !== call_event_entity_1.CallEventDirection.Outbound &&
            value !== call_event_entity_1.CallEventDirection.Internal) {
            throw this.createError(400, 'invalid_payload', false);
        }
        return value;
    }
    expectString(value, field) {
        if (typeof value !== 'string') {
            throw this.createError(400, 'invalid_payload', false);
        }
        const normalized = value.trim();
        if (!normalized) {
            throw this.createError(400, 'invalid_payload', false);
        }
        return normalized;
    }
    optionalString(value) {
        if (value == null) {
            return null;
        }
        if (typeof value !== 'string') {
            throw this.createError(400, 'invalid_payload', false);
        }
        const normalized = value.trim();
        return normalized.length > 0 ? normalized : null;
    }
    optionalNullableString(value) {
        if (value == null) {
            return null;
        }
        return this.optionalString(value);
    }
    expectDate(value, field) {
        if (typeof value !== 'string') {
            throw this.createError(400, 'invalid_payload', false);
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw this.createError(400, 'invalid_payload', false);
        }
        return parsed;
    }
    optionalDate(value) {
        if (value == null) {
            return null;
        }
        return this.expectDate(value, 'date');
    }
    optionalNumber(value) {
        if (value == null) {
            return null;
        }
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw this.createError(400, 'invalid_payload', false);
        }
        return value;
    }
    tryNormalizeE164(value) {
        const normalized = value.replace(/[\s\-()]/g, '').trim();
        return /^\+\d{7,15}$/.test(normalized) ? normalized : null;
    }
    normalizeE164OrThrowPayload(value) {
        if (typeof value !== 'string') {
            throw this.createError(400, 'invalid_payload', false);
        }
        const normalized = this.tryNormalizeE164(value);
        if (!normalized) {
            throw this.createError(400, 'invalid_payload', false);
        }
        return normalized;
    }
    isExpiredCallback(callbackSession, now) {
        if (callbackSession.status === callback_session_entity_1.CallbackSessionStatus.Expired) {
            return true;
        }
        return callbackSession.expiresAt.getTime() <= now.getTime();
    }
    asInboundDecisionReason(value) {
        switch (value) {
            case 'matched_active_callback':
            case 'callback_not_found':
            case 'callback_expired':
            case 'tenant_blocked':
            case 'no_available_endpoint':
            case 'invalid_display_did':
            case 'invalid_remote_number':
                return value;
            default:
                return 'callback_not_found';
        }
    }
    readStringField(value) {
        return typeof value === 'string' ? value : null;
    }
    createError(status, errorCode, retryable) {
        return new TelephonyWebhookError(status, {
            accepted: false,
            error_code: errorCode,
            retryable,
        });
    }
};
exports.TelephonyService = TelephonyService;
exports.TelephonyService = TelephonyService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(tenant_entity_1.TenantEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(tenant_did_assignment_entity_1.TenantDidAssignmentEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(did_inventory_entity_1.DidInventoryEntity)),
    __param(5, (0, typeorm_1.InjectRepository)(tenant_endpoint_entity_1.TenantEndpointEntity)),
    __param(6, (0, typeorm_1.InjectRepository)(call_session_entity_1.CallSessionEntity)),
    __param(7, (0, typeorm_1.InjectRepository)(callback_session_entity_1.CallbackSessionEntity)),
    __param(8, (0, typeorm_1.InjectRepository)(call_event_entity_1.CallEventEntity)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], TelephonyService);
