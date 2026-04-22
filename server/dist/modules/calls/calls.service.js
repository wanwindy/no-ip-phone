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
exports.CallsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const error_codes_1 = require("../../common/constants/error-codes");
const app_exception_1 = require("../../common/exceptions/app.exception");
const call_event_entity_1 = require("../call-event/entities/call-event.entity");
const call_session_entity_1 = require("../call-session/entities/call-session.entity");
const callback_session_entity_1 = require("../callback/entities/callback-session.entity");
const did_inventory_entity_1 = require("../tenant/entities/did-inventory.entity");
const tenant_did_assignment_entity_1 = require("../tenant/entities/tenant-did-assignment.entity");
const tenant_endpoint_entity_1 = require("../tenant/entities/tenant-endpoint.entity");
const DEFAULT_CALLBACK_TTL_SECONDS = 2 * 60 * 60;
const DIALABLE_PATTERNS = [
    /^1[3-9]\d{9}$/,
    /^0\d{2,3}\d{7,8}$/,
    /^\+\d{7,15}$/,
    /^(?:400|800)\d{7}$/,
];
let CallsService = class CallsService {
    dataSource;
    callSessionsRepository;
    callbackSessionsRepository;
    callEventsRepository;
    tenantDidAssignmentsRepository;
    didInventoryRepository;
    tenantEndpointsRepository;
    constructor(dataSource, callSessionsRepository, callbackSessionsRepository, callEventsRepository, tenantDidAssignmentsRepository, didInventoryRepository, tenantEndpointsRepository) {
        this.dataSource = dataSource;
        this.callSessionsRepository = callSessionsRepository;
        this.callbackSessionsRepository = callbackSessionsRepository;
        this.callEventsRepository = callEventsRepository;
        this.tenantDidAssignmentsRepository = tenantDidAssignmentsRepository;
        this.didInventoryRepository = didInventoryRepository;
        this.tenantEndpointsRepository = tenantEndpointsRepository;
    }
    async createOutboundCall(user, input) {
        this.assertTenantContext(user);
        const tenantId = user.tenantId;
        const tenantMemberId = user.tenantMemberId;
        const destinationNumber = this.normalizePhoneNumber(input.destinationNumber);
        const [selection, targetEndpoint] = await Promise.all([
            this.selectDidContext(tenantId, tenantMemberId),
            this.selectTargetEndpoint(tenantId, tenantMemberId),
        ]);
        const persisted = await this.persistOutboundCall({
            tenantId,
            tenantMemberId,
            destinationNumber,
            didSelection: selection,
            targetEndpoint,
            clientRequestId: input.clientRequestId?.trim() || null,
        });
        return this.toOutboundCallTaskResponse({
            callSession: persisted.callSession,
            callbackSession: persisted.callbackSession,
            displayDid: selection?.did ?? null,
            targetEndpoint,
            latestEvent: persisted.latestEvent,
        });
    }
    async getCall(user, callId) {
        this.assertTenantContext(user);
        const taskView = await this.loadCallTaskView({
            tenantId: user.tenantId,
            callId,
        });
        if (!taskView) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.INTERNAL_ERROR, '呼叫任务不存在', 404);
        }
        return this.toOutboundCallTaskResponse({
            callSession: taskView.callSession,
            callbackSession: taskView.callbackSession,
            displayDid: taskView.displayDid,
            targetEndpoint: taskView.targetEndpoint,
            latestEvent: taskView.latestEvent,
        });
    }
    async persistOutboundCall(params) {
        const { tenantId, tenantMemberId, destinationNumber, didSelection, targetEndpoint, clientRequestId, } = params;
        return this.dataSource.transaction(async (manager) => {
            const callSessionsRepository = manager.getRepository(call_session_entity_1.CallSessionEntity);
            const callbackSessionsRepository = manager.getRepository(callback_session_entity_1.CallbackSessionEntity);
            const callEventsRepository = manager.getRepository(call_event_entity_1.CallEventEntity);
            let callSession = await callSessionsRepository.save(callSessionsRepository.create({
                tenantId,
                tenantDidAssignmentId: didSelection?.assignment.id ?? null,
                initiatedByMemberId: tenantMemberId,
                fromEndpointId: targetEndpoint?.id ?? null,
                callbackSessionId: null,
                direction: call_session_entity_1.CallSessionDirection.Outbound,
                remoteNumber: destinationNumber,
                displayDidId: didSelection?.did?.id ?? null,
                providerCallId: null,
                selectedTrunkKey: null,
                status: didSelection?.did
                    ? call_session_entity_1.CallSessionStatus.Dispatching
                    : call_session_entity_1.CallSessionStatus.Created,
                hangupCause: null,
                startedAt: null,
                answeredAt: null,
                endedAt: null,
            }));
            let callbackSession = null;
            if (didSelection?.did != null &&
                didSelection.assignment.callbackEnabled &&
                targetEndpoint != null) {
                const expiresAt = new Date(callSession.createdAt.getTime() + DEFAULT_CALLBACK_TTL_SECONDS * 1000);
                callbackSession = await callbackSessionsRepository.save(callbackSessionsRepository.create({
                    tenantId,
                    tenantDidAssignmentId: didSelection.assignment.id,
                    displayDidId: didSelection.did.id,
                    remoteNumber: destinationNumber,
                    originCallSessionId: callSession.id,
                    targetEndpointId: targetEndpoint.id,
                    lastRoutedEndpointId: null,
                    status: callback_session_entity_1.CallbackSessionStatus.Active,
                    expiresAt,
                    matchedAt: null,
                    expiredAt: null,
                    decisionReason: null,
                    routingDecisionKey: null,
                    lastInboundAt: null,
                }));
                callSession.callbackSessionId = callbackSession.id;
                callSession = await callSessionsRepository.save(callSession);
            }
            let latestEvent = null;
            if (didSelection?.did) {
                latestEvent = await callEventsRepository.save(callEventsRepository.create({
                    tenantId,
                    callSessionId: callSession.id,
                    callbackSessionId: callbackSession?.id ?? null,
                    targetEndpointId: targetEndpoint?.id ?? null,
                    eventName: call_event_entity_1.CallEventName.TelephonyOutboundAccepted,
                    eventDirection: call_event_entity_1.CallEventDirection.Outbound,
                    sessionDirection: call_event_entity_1.CallEventSessionDirection.Outbound,
                    providerKey: null,
                    trunkKey: callSession.selectedTrunkKey,
                    providerEventId: clientRequestId ?? `call-task:${callSession.id}:accepted`,
                    providerCallId: callSession.providerCallId,
                    displayDid: didSelection.did.phoneNumberE164,
                    remoteNumber: destinationNumber,
                    traceId: clientRequestId ?? `call-task:${callSession.id}`,
                    eventIdempotencyKey: `call-task:${callSession.id}:telephony.outbound.accepted`,
                    routingDecisionKey: null,
                    providerRawStatus: 'accepted',
                    providerRawReason: null,
                    decisionReason: null,
                    payload: this.buildAcceptedEventPayload({
                        callSession,
                        callbackSession,
                        targetEndpoint,
                        clientRequestId,
                    }),
                    occurredAt: new Date(),
                }));
            }
            return { callSession, callbackSession, latestEvent };
        });
    }
    async loadCallTaskView(params) {
        const callSession = await this.callSessionsRepository.findOne({
            where: {
                id: params.callId,
                tenantId: params.tenantId,
            },
        });
        if (!callSession) {
            return null;
        }
        const callbackSessionPromise = callSession.callbackSessionId
            ? this.callbackSessionsRepository.findOne({
                where: {
                    id: callSession.callbackSessionId,
                    tenantId: params.tenantId,
                },
            })
            : this.callbackSessionsRepository.findOne({
                where: {
                    tenantId: params.tenantId,
                    originCallSessionId: callSession.id,
                },
                order: {
                    createdAt: 'DESC',
                },
            });
        const latestEventPromise = this.callEventsRepository.findOne({
            where: {
                tenantId: params.tenantId,
                callSessionId: callSession.id,
            },
            order: {
                occurredAt: 'DESC',
                createdAt: 'DESC',
            },
        });
        const displayDidPromise = callSession.displayDidId
            ? this.didInventoryRepository.findOne({
                where: { id: callSession.displayDidId },
            })
            : Promise.resolve(null);
        const [callbackSession, latestEvent, displayDid] = await Promise.all([
            callbackSessionPromise,
            latestEventPromise,
            displayDidPromise,
        ]);
        const targetEndpointId = callbackSession?.targetEndpointId ?? callSession.fromEndpointId;
        const targetEndpoint = targetEndpointId
            ? await this.tenantEndpointsRepository.findOne({
                where: {
                    id: targetEndpointId,
                    tenantId: params.tenantId,
                },
            })
            : null;
        return {
            callSession,
            callbackSession,
            displayDid,
            targetEndpoint,
            latestEvent,
        };
    }
    async selectDidContext(tenantId, tenantMemberId) {
        const assignments = await this.tenantDidAssignmentsRepository.find({
            where: {
                tenantId,
                status: tenant_did_assignment_entity_1.TenantDidAssignmentStatus.Active,
            },
            order: {
                activatedAt: 'ASC',
            },
        });
        const selectedAssignment = assignments.find((assignment) => assignment.assignedMemberId === tenantMemberId) ??
            assignments.find((assignment) => assignment.assignedMemberId == null) ??
            null;
        if (!selectedAssignment) {
            return null;
        }
        const did = await this.didInventoryRepository.findOne({
            where: {
                id: selectedAssignment.didId,
                status: (0, typeorm_2.In)([
                    did_inventory_entity_1.DidInventoryStatus.Assigned,
                    did_inventory_entity_1.DidInventoryStatus.Reserved,
                    did_inventory_entity_1.DidInventoryStatus.Available,
                ]),
            },
        });
        return {
            assignment: selectedAssignment,
            did,
        };
    }
    async selectTargetEndpoint(tenantId, tenantMemberId) {
        const endpoints = await this.tenantEndpointsRepository.find({
            where: {
                tenantId,
                status: tenant_endpoint_entity_1.TenantEndpointStatus.Active,
            },
            order: {
                priority: 'ASC',
                createdAt: 'ASC',
            },
        });
        return (endpoints.find((endpoint) => endpoint.memberId === tenantMemberId) ??
            endpoints.find((endpoint) => endpoint.memberId == null) ??
            null);
    }
    toOutboundCallTaskResponse(params) {
        const { callSession, callbackSession, displayDid, targetEndpoint, latestEvent } = params;
        return {
            taskId: callSession.id,
            tenantId: callSession.tenantId,
            mode: 'server_orchestrated_mode',
            status: callSession.status,
            destinationNumber: callSession.remoteNumber,
            displayDid: displayDid
                ? {
                    e164: displayDid.phoneNumberE164,
                    displayLabel: displayDid.displayLabel ??
                        displayDid.phoneNumberE164.replace('+', '00'),
                }
                : null,
            targetEndpoint: targetEndpoint
                ? {
                    endpointId: targetEndpoint.id,
                    endpointType: targetEndpoint.endpointType,
                    endpointValue: targetEndpoint.endpointValue,
                    endpointLabel: targetEndpoint.endpointLabel ?? targetEndpoint.endpointValue,
                }
                : null,
            callbackWindow: callbackSession
                ? {
                    status: callbackSession.status,
                    expiresAt: callbackSession.expiresAt.toISOString(),
                    ttlSeconds: Math.max(0, Math.ceil((callbackSession.expiresAt.getTime() - Date.now()) / 1000)),
                }
                : null,
            latestEvent: latestEvent
                ? {
                    eventName: latestEvent.eventName,
                    eventDirection: latestEvent.eventDirection,
                    occurredAt: latestEvent.occurredAt.toISOString(),
                }
                : null,
            createdAt: callSession.createdAt.toISOString(),
            updatedAt: callSession.updatedAt.toISOString(),
            note: this.buildTaskNote({
                callSession,
                callbackSession,
                displayDid,
                targetEndpoint,
                latestEvent,
            }),
        };
    }
    buildAcceptedEventPayload(params) {
        const { callSession, callbackSession, targetEndpoint, clientRequestId } = params;
        return {
            source: 'calls_service.create_outbound_call',
            sessionDirection: callSession.direction,
            tenantRef: callSession.tenantId,
            callSessionRef: callSession.id,
            callbackSessionRef: callbackSession?.id ?? null,
            targetEndpointRef: targetEndpoint?.id ?? null,
            clientRequestId,
        };
    }
    buildTaskNote(params) {
        const { callSession, callbackSession, displayDid, targetEndpoint, latestEvent, } = params;
        if (!displayDid) {
            return '呼叫任务已落库，但当前租户尚未选到可用 DID，任务仍停留在创建态。';
        }
        if (!targetEndpoint) {
            return '呼叫任务已落库，当前 DID 已确定，但尚未选到可回拨的租户终端。';
        }
        if (!callbackSession) {
            return '呼叫任务已落库，当前 DID 与租户终端已确定，但回拨窗口未启用。';
        }
        if (latestEvent?.eventName === call_event_entity_1.CallEventName.TelephonyOutboundAccepted) {
            return '呼叫任务已落库，并写入最小 accepted 事件；等待后续 telephony 状态推进。';
        }
        if (callSession.status === call_session_entity_1.CallSessionStatus.Created) {
            return '呼叫任务已落库，等待后续编排层补齐 DID、终端和 telephony 事件。';
        }
        return '呼叫任务状态已从持久化记录加载。';
    }
    assertTenantContext(user) {
        if (!user.tenantId || !user.tenantMemberId) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.INTERNAL_ERROR, '当前账号未绑定可用租户，暂无法发起或查询平台外呼任务', 403);
        }
    }
    normalizePhoneNumber(value) {
        const normalized = value.replace(/[\s\-()（）]/g, '').trim();
        if (normalized.length === 0) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.PHONE_INVALID, '号码格式不正确', 400);
        }
        if (!DIALABLE_PATTERNS.some((pattern) => pattern.test(normalized))) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.PHONE_INVALID, '号码格式不正确', 400);
        }
        return normalized;
    }
};
exports.CallsService = CallsService;
exports.CallsService = CallsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(call_session_entity_1.CallSessionEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(callback_session_entity_1.CallbackSessionEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(call_event_entity_1.CallEventEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(tenant_did_assignment_entity_1.TenantDidAssignmentEntity)),
    __param(5, (0, typeorm_1.InjectRepository)(did_inventory_entity_1.DidInventoryEntity)),
    __param(6, (0, typeorm_1.InjectRepository)(tenant_endpoint_entity_1.TenantEndpointEntity)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CallsService);
