import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { DataSource, In, Repository } from 'typeorm';
import {
  CallEventDirection,
  CallEventEntity,
  CallEventName,
  CallEventSessionDirection,
} from '../call-event/entities/call-event.entity';
import {
  CallSessionDirection,
  CallSessionEntity,
  CallSessionStatus,
} from '../call-session/entities/call-session.entity';
import {
  CallbackSessionEntity,
  CallbackSessionStatus,
} from '../callback/entities/callback-session.entity';
import {
  DidInventoryEntity,
  DidInventoryStatus,
} from '../tenant/entities/did-inventory.entity';
import {
  TenantDidAssignmentEntity,
  TenantDidAssignmentStatus,
} from '../tenant/entities/tenant-did-assignment.entity';
import {
  TenantEndpointEntity,
  TenantEndpointStatus,
} from '../tenant/entities/tenant-endpoint.entity';
import { TenantEntity, TenantStatus } from '../tenant/entities/tenant.entity';

const TELEPHONY_SIGNATURE_VERSION = 'v1';
const MAX_TIMESTAMP_SKEW_SECONDS = 300;
const NONCE_REPLAY_WINDOW_MS = 10 * 60 * 1000;

const DEFAULT_TELEPHONY_SHARED_KEYS: TelephonySharedKey[] = [
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

const TERMINAL_CALL_STATUSES = new Set<CallSessionStatus>([
  CallSessionStatus.Completed,
  CallSessionStatus.Failed,
  CallSessionStatus.Canceled,
  CallSessionStatus.Expired,
]);

const CALL_STATUS_RANK: Record<CallSessionStatus, number> = {
  [CallSessionStatus.Created]: 0,
  [CallSessionStatus.Dispatching]: 1,
  [CallSessionStatus.Ringing]: 2,
  [CallSessionStatus.Answered]: 3,
  [CallSessionStatus.Bridged]: 4,
  [CallSessionStatus.Completed]: 5,
  [CallSessionStatus.Failed]: 5,
  [CallSessionStatus.Canceled]: 5,
  [CallSessionStatus.Expired]: 5,
};

const OUTBOUND_STATUS_EVENT_NAMES = new Set<CallEventName>([
  CallEventName.TelephonyOutboundRinging,
  CallEventName.TelephonyOutboundAnswered,
  CallEventName.TelephonyOutboundBridged,
  CallEventName.TelephonyOutboundCompleted,
  CallEventName.TelephonyOutboundFailed,
  CallEventName.TelephonyOutboundCanceled,
]);

const CALLBACK_STATUS_EVENT_NAMES = new Set<CallEventName>([
  CallEventName.TelephonyCallbackTargetRinging,
  CallEventName.TelephonyCallbackTargetAnswered,
  CallEventName.TelephonyCallbackBridged,
  CallEventName.TelephonyCallbackCompleted,
  CallEventName.TelephonyCallbackFailed,
  CallEventName.TelephonyCallbackCanceled,
]);

const RECORDING_EVENT_NAMES = new Set<CallEventName>([
  CallEventName.TelephonyRecordingReady,
  CallEventName.TelephonyRecordingFailed,
]);

type TelephonyRequest = Request & { rawBody?: Buffer };

type InboundDecisionReason =
  | 'matched_active_callback'
  | 'callback_not_found'
  | 'callback_expired'
  | 'tenant_blocked'
  | 'no_available_endpoint'
  | 'invalid_display_did'
  | 'invalid_remote_number';

type InboundAction = 'route_callback' | 'reject';

type ErrorCode =
  | 'auth_missing_or_unknown_key'
  | 'signature_invalid'
  | 'timestamp_skew'
  | 'nonce_replayed'
  | 'unknown_trunk'
  | 'event_conflict'
  | 'unsupported_signature_version'
  | 'invalid_payload'
  | 'call_session_not_found'
  | 'callback_session_not_found'
  | 'target_endpoint_not_found'
  | 'tenant_not_found';

interface TelephonySharedKey {
  keyId: string;
  secret: string;
}

interface VerifiedWebhookContext {
  rawBody: Buffer;
}

interface BaseWebhookPayload {
  event_name: CallEventName;
  event_direction: string;
  provider_key: string;
  trunk_key: string;
  provider_event_id: string;
  provider_call_id: string;
  occurred_at: Date;
  trace_id: string | null;
  display_did: string;
  remote_number: string;
  provider_raw_status: string | null;
  provider_raw_reason: string | null;
}

interface InboundWebhookPayload extends BaseWebhookPayload {}

interface CallStatusWebhookPayload extends BaseWebhookPayload {
  session_direction: CallEventSessionDirection;
  tenant_ref: string | null;
  call_session_ref: string;
  callback_session_ref: string | null;
  target_endpoint_ref: string | null;
  hangup_cause: string | null;
  answered_at: Date | null;
  ended_at: Date | null;
  billable_duration_sec: number | null;
}

interface RecordingWebhookPayload extends BaseWebhookPayload {
  session_direction: CallEventSessionDirection;
  tenant_ref: string | null;
  call_session_ref: string;
  recording_id: string;
  recording_scope: string | null;
  recording_url: string | null;
  duration_sec: number | null;
  checksum_sha256: string | null;
}

interface DidLookupContext {
  tenant: TenantEntity;
  assignment: TenantDidAssignmentEntity;
  did: DidInventoryEntity;
}

interface InboundDecision {
  action: InboundAction;
  decisionReason: InboundDecisionReason;
  tenant: TenantEntity | null;
  callSession: CallSessionEntity | null;
  callbackSession: CallbackSessionEntity | null;
  targetEndpoint: TenantEndpointEntity | null;
  expiresAt: Date | null;
}

interface InboundRoutePersistenceResult {
  inboundEvent: CallEventEntity;
  callSession: CallSessionEntity;
  callbackSession: CallbackSessionEntity;
  targetEndpoint: TenantEndpointEntity;
}

interface CallStatusMutationResult {
  callSession: CallSessionEntity;
  stateApplied: boolean;
}

interface RecordingMutationResult {
  callSession: CallSessionEntity;
  recordingRegistered: boolean;
}

export interface TelephonyWebhookSuccessResponse {
  accepted: boolean;
  error_code?: string;
  retryable?: boolean;
}

export interface InboundWebhookResponse {
  accepted: true;
  session_direction: 'inbound';
  action: InboundAction;
  decision_reason: InboundDecisionReason;
  tenant_ref?: string;
  call_session_ref?: string;
  callback_session_ref?: string;
  target_endpoint_ref?: string;
  expires_at?: string;
}

export interface WebhookAcceptedResponse {
  accepted: true;
  call_session_ref: string;
  state_applied: boolean;
}

export interface RecordingWebhookResponse {
  accepted: true;
  call_session_ref: string;
  recording_registered: boolean;
}

export class TelephonyWebhookError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: TelephonyWebhookSuccessResponse,
  ) {
    super(body.error_code ?? 'telephony_webhook_error');
  }
}

@Injectable()
export class TelephonyService {
  private readonly sharedKeys: Map<string, string>;
  private readonly seenNonces = new Map<string, number>();

  constructor(
    configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(TenantEntity)
    private readonly tenantsRepository: Repository<TenantEntity>,
    @InjectRepository(TenantDidAssignmentEntity)
    private readonly tenantDidAssignmentsRepository: Repository<TenantDidAssignmentEntity>,
    @InjectRepository(DidInventoryEntity)
    private readonly didInventoryRepository: Repository<DidInventoryEntity>,
    @InjectRepository(TenantEndpointEntity)
    private readonly tenantEndpointsRepository: Repository<TenantEndpointEntity>,
    @InjectRepository(CallSessionEntity)
    private readonly callSessionsRepository: Repository<CallSessionEntity>,
    @InjectRepository(CallbackSessionEntity)
    private readonly callbackSessionsRepository: Repository<CallbackSessionEntity>,
    @InjectRepository(CallEventEntity)
    private readonly callEventsRepository: Repository<CallEventEntity>,
  ) {
    this.sharedKeys = this.loadSharedKeys(configService);
  }

  async handleInboundCall(
    request: TelephonyRequest,
    body: Record<string, unknown>,
  ): Promise<InboundWebhookResponse> {
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

    if (didContext.tenant.status !== TenantStatus.Active) {
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
    const activeCallback = callbackSessions.find(
      (session) =>
        session.status === CallbackSessionStatus.Active &&
        session.expiresAt.getTime() > now.getTime(),
    );
    const expiredCallback =
      callbackSessions.find((session) => this.isExpiredCallback(session, now)) ?? null;

    if (!activeCallback) {
      const decisionReason: InboundDecisionReason = expiredCallback
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

    const targetEndpoint = await this.resolveInboundTargetEndpoint(
      didContext.tenant.id,
      activeCallback,
    );
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

  async handleCallStatus(
    request: TelephonyRequest,
    body: Record<string, unknown>,
  ): Promise<WebhookAcceptedResponse> {
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

  async handleRecordingReady(
    request: TelephonyRequest,
    body: Record<string, unknown>,
  ): Promise<RecordingWebhookResponse> {
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

  private async rebuildInboundDecision(
    inboundEvent: CallEventEntity,
  ): Promise<InboundWebhookResponse> {
    if (
      inboundEvent.decisionReason === 'matched_active_callback' &&
      inboundEvent.callSessionId != null
    ) {
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
        tenant_ref:
          (await this.resolveTenantRef(callSession.tenantId)) ?? callSession.tenantId,
        call_session_ref: callSession.id,
        callback_session_ref: callbackSession.id,
        target_endpoint_ref:
          callbackSession.targetEndpointId ?? inboundEvent.targetEndpointId ?? undefined,
        expires_at: callbackSession.expiresAt.toISOString(),
      };
    }

    return this.buildRejectResponse(
      this.asInboundDecisionReason(inboundEvent.decisionReason ?? 'callback_not_found'),
    );
  }

  private async persistInboundRoute(params: {
    payload: InboundWebhookPayload;
    didContext: DidLookupContext;
    callbackSession: CallbackSessionEntity;
    targetEndpoint: TenantEndpointEntity;
    idempotencyKey: string;
  }): Promise<InboundRoutePersistenceResult> {
    const { payload, didContext, callbackSession, targetEndpoint, idempotencyKey } =
      params;
    const routingDecisionKey = this.buildRoutingDecisionKey(payload);

    return this.dataSource.transaction(async (manager) => {
      const callSessionsRepository = manager.getRepository(CallSessionEntity);
      const callbackSessionsRepository = manager.getRepository(CallbackSessionEntity);
      const callEventsRepository = manager.getRepository(CallEventEntity);

      const callSession = await callSessionsRepository.save(
        callSessionsRepository.create({
          tenantId: didContext.tenant.id,
          tenantDidAssignmentId: didContext.assignment.id,
          initiatedByMemberId: null,
          fromEndpointId: targetEndpoint.id,
          callbackSessionId: callbackSession.id,
          direction: CallSessionDirection.Inbound,
          remoteNumber: payload.remote_number,
          displayDidId: didContext.did.id,
          providerCallId: payload.provider_call_id,
          selectedTrunkKey: payload.trunk_key,
          status: CallSessionStatus.Dispatching,
          hangupCause: null,
          startedAt: payload.occurred_at,
          answeredAt: null,
          endedAt: null,
        }),
      );

      callbackSession.status = CallbackSessionStatus.Routing;
      callbackSession.targetEndpointId = targetEndpoint.id;
      callbackSession.lastRoutedEndpointId = targetEndpoint.id;
      callbackSession.matchedAt ??= payload.occurred_at;
      callbackSession.lastInboundAt = payload.occurred_at;
      callbackSession.decisionReason = 'matched_active_callback';
      callbackSession.routingDecisionKey = routingDecisionKey;
      const savedCallbackSession = await callbackSessionsRepository.save(callbackSession);

      const inboundEvent = await callEventsRepository.save(
        callEventsRepository.create({
          tenantId: didContext.tenant.id,
          callSessionId: callSession.id,
          callbackSessionId: savedCallbackSession.id,
          targetEndpointId: targetEndpoint.id,
          eventName: CallEventName.TelephonyInboundReceived,
          eventDirection: CallEventDirection.Inbound,
          sessionDirection: CallEventSessionDirection.Inbound,
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
        }),
      );

      await callEventsRepository.save(
        callEventsRepository.create({
          tenantId: didContext.tenant.id,
          callSessionId: callSession.id,
          callbackSessionId: savedCallbackSession.id,
          targetEndpointId: targetEndpoint.id,
          eventName: CallEventName.TelephonyCallbackMatched,
          eventDirection: CallEventDirection.Internal,
          sessionDirection: CallEventSessionDirection.Inbound,
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
        }),
      );

      return {
        inboundEvent,
        callSession,
        callbackSession: savedCallbackSession,
        targetEndpoint,
      };
    });
  }

  private async persistInboundReject(params: {
    payload: InboundWebhookPayload;
    didContext: DidLookupContext;
    decisionReason: InboundDecisionReason;
    callbackSession: CallbackSessionEntity | null;
  }): Promise<void> {
    const { payload, didContext, decisionReason, callbackSession } = params;
    const idempotencyKey = this.buildInboundIdempotencyKey(payload);
    const routingDecisionKey = this.buildRoutingDecisionKey(payload);

    await this.dataSource.transaction(async (manager) => {
      const callbackSessionsRepository = manager.getRepository(CallbackSessionEntity);
      const callEventsRepository = manager.getRepository(CallEventEntity);

      if (callbackSession && this.isExpiredCallback(callbackSession, payload.occurred_at)) {
        callbackSession.status = CallbackSessionStatus.Expired;
        callbackSession.expiredAt ??= payload.occurred_at;
        callbackSession.lastInboundAt = payload.occurred_at;
        callbackSession.decisionReason = decisionReason;
        callbackSession.routingDecisionKey = routingDecisionKey;
        await callbackSessionsRepository.save(callbackSession);
      }

      await callEventsRepository.save(
        callEventsRepository.create({
          tenantId: didContext.tenant.id,
          callSessionId: null,
          callbackSessionId: null,
          targetEndpointId: null,
          eventName: CallEventName.TelephonyInboundReceived,
          eventDirection: CallEventDirection.Inbound,
          sessionDirection: CallEventSessionDirection.Inbound,
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
        }),
      );

      await callEventsRepository.save(
        callEventsRepository.create({
          tenantId: didContext.tenant.id,
          callSessionId: null,
          callbackSessionId: null,
          targetEndpointId: null,
          eventName: CallEventName.TelephonyCallbackRejected,
          eventDirection: CallEventDirection.Internal,
          sessionDirection: CallEventSessionDirection.Inbound,
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
        }),
      );
    });
  }

  private async applyCallStatusEvent(
    payload: CallStatusWebhookPayload,
    rawBody: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<CallStatusMutationResult> {
    return this.dataSource.transaction(async (manager) => {
      const callSessionsRepository = manager.getRepository(CallSessionEntity);
      const callbackSessionsRepository = manager.getRepository(CallbackSessionEntity);
      const callEventsRepository = manager.getRepository(CallEventEntity);

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

      const targetEndpointId =
        payload.target_endpoint_ref ??
        callbackSession?.targetEndpointId ??
        callSession.fromEndpointId;
      if (
        payload.event_name === CallEventName.TelephonyCallbackTargetRinging ||
        payload.event_name === CallEventName.TelephonyCallbackTargetAnswered
      ) {
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
      } else if (
        nextStatus === CallSessionStatus.Answered ||
        nextStatus === CallSessionStatus.Bridged
      ) {
        callSession.answeredAt ??= payload.occurred_at;
      }
      if (payload.ended_at) {
        callSession.endedAt = payload.ended_at;
      } else if (TERMINAL_CALL_STATUSES.has(nextStatus)) {
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

  private async applyRecordingEvent(
    payload: RecordingWebhookPayload,
    rawBody: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<RecordingMutationResult> {
    return this.dataSource.transaction(async (manager) => {
      const callSessionsRepository = manager.getRepository(CallSessionEntity);
      const callEventsRepository = manager.getRepository(CallEventEntity);

      const callSession = await callSessionsRepository.findOne({
        where: {
          id: payload.call_session_ref,
        },
      });
      if (!callSession) {
        throw this.createError(404, 'call_session_not_found', false);
      }

      this.assertSessionDirection(callSession, payload.session_direction);

      await callEventsRepository.save(
        callEventsRepository.create({
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
        }),
      );

      callSession.providerCallId = payload.provider_call_id;
      callSession.selectedTrunkKey = payload.trunk_key;
      await callSessionsRepository.save(callSession);

      return {
        callSession,
        recordingRegistered: true,
      };
    });
  }

  private applyCallbackSessionMutation(
    callbackSession: CallbackSessionEntity,
    payload: CallStatusWebhookPayload,
    targetEndpointId: string | null,
  ): void {
    if (targetEndpointId) {
      callbackSession.targetEndpointId = targetEndpointId;
      callbackSession.lastRoutedEndpointId = targetEndpointId;
    }
    if (CALLBACK_STATUS_EVENT_NAMES.has(payload.event_name)) {
      callbackSession.lastInboundAt = payload.occurred_at;
    }

    switch (payload.event_name) {
      case CallEventName.TelephonyCallbackTargetRinging:
      case CallEventName.TelephonyCallbackTargetAnswered:
        if (
          callbackSession.status !== CallbackSessionStatus.Fulfilled &&
          callbackSession.status !== CallbackSessionStatus.Expired
        ) {
          callbackSession.status = CallbackSessionStatus.Routing;
        }
        break;
      case CallEventName.TelephonyCallbackBridged:
      case CallEventName.TelephonyCallbackCompleted:
        callbackSession.status = CallbackSessionStatus.Fulfilled;
        callbackSession.matchedAt ??= payload.occurred_at;
        break;
      case CallEventName.TelephonyCallbackFailed:
        callbackSession.status = CallbackSessionStatus.Failed;
        break;
      case CallEventName.TelephonyCallbackCanceled:
        callbackSession.status = CallbackSessionStatus.Revoked;
        break;
      default:
        break;
    }
  }

  private shouldApplyCallStatusTransition(
    current: CallSessionStatus,
    next: CallSessionStatus,
  ): boolean {
    if (current === next) {
      return false;
    }

    if (TERMINAL_CALL_STATUSES.has(current)) {
      return false;
    }

    return CALL_STATUS_RANK[next] > CALL_STATUS_RANK[current];
  }

  private resolveCallStatusFromEvent(eventName: CallEventName): CallSessionStatus {
    switch (eventName) {
      case CallEventName.TelephonyCallbackTargetRinging:
      case CallEventName.TelephonyOutboundRinging:
        return CallSessionStatus.Ringing;
      case CallEventName.TelephonyCallbackTargetAnswered:
      case CallEventName.TelephonyOutboundAnswered:
        return CallSessionStatus.Answered;
      case CallEventName.TelephonyCallbackBridged:
      case CallEventName.TelephonyOutboundBridged:
        return CallSessionStatus.Bridged;
      case CallEventName.TelephonyCallbackCompleted:
      case CallEventName.TelephonyOutboundCompleted:
        return CallSessionStatus.Completed;
      case CallEventName.TelephonyCallbackFailed:
      case CallEventName.TelephonyOutboundFailed:
        return CallSessionStatus.Failed;
      case CallEventName.TelephonyCallbackCanceled:
      case CallEventName.TelephonyOutboundCanceled:
        return CallSessionStatus.Canceled;
      default:
        return CallSessionStatus.Dispatching;
    }
  }

  private async lookupDidContext(displayDid: string): Promise<DidLookupContext | null> {
    const assignments = await this.tenantDidAssignmentsRepository.find({
      where: {
        status: TenantDidAssignmentStatus.Active,
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
        id: In(didIds),
        phoneNumberE164: displayDid,
        status: In([
          DidInventoryStatus.Assigned,
          DidInventoryStatus.Reserved,
          DidInventoryStatus.Available,
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

  private async resolveInboundTargetEndpoint(
    tenantId: string,
    callbackSession: CallbackSessionEntity,
  ): Promise<TenantEndpointEntity | null> {
    const endpointIds = [
      callbackSession.targetEndpointId,
      callbackSession.lastRoutedEndpointId,
    ].filter((value): value is string => value != null);
    if (endpointIds.length === 0) {
      return null;
    }

    const endpoints = await this.tenantEndpointsRepository.find({
      where: {
        id: In(endpointIds),
        tenantId,
        status: TenantEndpointStatus.Active,
      },
      order: {
        priority: 'ASC',
        createdAt: 'ASC',
      },
    });
    return endpoints[0] ?? null;
  }

  private buildInboundIdempotencyKey(payload: InboundWebhookPayload): string {
    return [
      payload.provider_key,
      payload.trunk_key,
      payload.provider_call_id,
      CallEventName.TelephonyInboundReceived,
    ].join(':');
  }

  private buildCallStatusIdempotencyKey(payload: CallStatusWebhookPayload): string {
    return [
      payload.provider_key,
      payload.trunk_key,
      payload.provider_call_id,
      payload.event_name,
      payload.provider_event_id,
    ].join(':');
  }

  private buildRecordingIdempotencyKey(payload: RecordingWebhookPayload): string {
    return [
      payload.provider_key,
      payload.trunk_key,
      payload.provider_call_id,
      payload.event_name,
      payload.recording_id,
    ].join(':');
  }

  private buildRoutingDecisionKey(payload: InboundWebhookPayload): string {
    return `route:${payload.display_did}:${payload.remote_number}:${payload.provider_call_id}`;
  }

  private buildRejectResponse(
    decisionReason: InboundDecisionReason,
  ): InboundWebhookResponse {
    return {
      accepted: true,
      session_direction: 'inbound',
      action: 'reject',
      decision_reason: decisionReason,
    };
  }

  private async resolveTenantRef(tenantId: string): Promise<string | null> {
    const tenant = await this.tenantsRepository.findOne({
      where: {
        id: tenantId,
      },
    });
    return tenant?.code ?? null;
  }

  private verifyWebhookSignature(request: TelephonyRequest): VerifiedWebhookContext {
    const keyId = this.extractHeader(request, 'x-telephony-key-id');
    const timestampRaw = this.extractHeader(request, 'x-telephony-timestamp');
    const nonce = this.extractHeader(request, 'x-telephony-nonce');
    const signatureVersion = this.extractHeader(
      request,
      'x-telephony-signature-version',
    );
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
    const bodyHash = createHash('sha256').update(rawBody).digest('hex');
    const canonicalString = [
      request.method.toUpperCase(),
      request.path,
      String(timestamp),
      nonce,
      bodyHash,
    ].join('\n');
    const expectedSignature = createHmac('sha256', secret)
      .update(canonicalString)
      .digest('base64url');

    const actualBuffer = Buffer.from(signature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw this.createError(403, 'signature_invalid', false);
    }

    this.assertNonceFresh(keyId, nonce);
    return { rawBody };
  }

  private extractHeader(request: Request, name: string): string | null {
    const raw = request.headers[name];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private assertNonceFresh(keyId: string, nonce: string): void {
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

  private loadSharedKeys(configService: ConfigService): Map<string, string> {
    const raw = configService.get<string>('TELEPHONY_SHARED_KEYS_JSON');
    const keys = raw ? this.parseSharedKeys(raw) : DEFAULT_TELEPHONY_SHARED_KEYS;
    return new Map(keys.map((item) => [item.keyId, item.secret]));
  }

  private parseSharedKeys(raw: string): TelephonySharedKey[] {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return DEFAULT_TELEPHONY_SHARED_KEYS;
      }

      const keys = parsed
        .map((item) => {
          if (
            !item ||
            typeof item !== 'object' ||
            typeof item.keyId !== 'string' ||
            typeof item.secret !== 'string'
          ) {
            return null;
          }

          return {
            keyId: item.keyId.trim(),
            secret: item.secret.trim(),
          } satisfies TelephonySharedKey;
        })
        .filter((item): item is TelephonySharedKey => item != null);

      return keys.length > 0 ? keys : DEFAULT_TELEPHONY_SHARED_KEYS;
    } catch {
      return DEFAULT_TELEPHONY_SHARED_KEYS;
    }
  }

  private parseInboundPayload(body: Record<string, unknown>): InboundWebhookPayload {
    const eventName = this.expectCallEventName(body.event_name);
    if (eventName !== CallEventName.TelephonyInboundReceived) {
      throw this.createError(400, 'invalid_payload', false);
    }

    const eventDirection = this.expectString(body.event_direction, 'event_direction');
    if (eventDirection !== CallEventDirection.Inbound) {
      throw this.createError(400, 'invalid_payload', false);
    }

    const payload: InboundWebhookPayload = {
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

  private parseCallStatusPayload(
    body: Record<string, unknown>,
  ): CallStatusWebhookPayload {
    const eventName = this.expectCallEventName(body.event_name);
    if (
      !OUTBOUND_STATUS_EVENT_NAMES.has(eventName) &&
      !CALLBACK_STATUS_EVENT_NAMES.has(eventName)
    ) {
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
    if (
      eventName === CallEventName.TelephonyCallbackTargetRinging ||
      eventName === CallEventName.TelephonyCallbackTargetAnswered
    ) {
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

  private parseRecordingPayload(
    body: Record<string, unknown>,
  ): RecordingWebhookPayload {
    const eventName = this.expectCallEventName(body.event_name);
    if (!RECORDING_EVENT_NAMES.has(eventName)) {
      throw this.createError(400, 'invalid_payload', false);
    }

    const eventDirection = this.expectString(body.event_direction, 'event_direction');
    if (eventDirection !== CallEventDirection.Internal) {
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

  private serializeInboundPayload(
    payload: InboundWebhookPayload,
  ): Record<string, unknown> {
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

  private assertKnownTrunk(trunkKey: string): void {
    if (!KNOWN_TRUNK_KEYS.has(trunkKey)) {
      throw this.createError(404, 'unknown_trunk', false);
    }
  }

  private assertInboundEventConsistency(
    existingEvent: CallEventEntity,
    payload: InboundWebhookPayload,
  ): void {
    if (
      existingEvent.eventName !== CallEventName.TelephonyInboundReceived ||
      existingEvent.providerKey !== payload.provider_key ||
      existingEvent.trunkKey !== payload.trunk_key ||
      existingEvent.providerCallId !== payload.provider_call_id ||
      existingEvent.displayDid !== payload.display_did ||
      existingEvent.remoteNumber !== payload.remote_number
    ) {
      throw this.createError(409, 'event_conflict', false);
    }
  }

  private assertStatusEventConsistency(
    existingEvent: CallEventEntity,
    payload: CallStatusWebhookPayload,
  ): void {
    const targetEndpointMatches =
      payload.target_endpoint_ref == null ||
      existingEvent.targetEndpointId === payload.target_endpoint_ref;
    if (
      existingEvent.eventName !== payload.event_name ||
      existingEvent.providerKey !== payload.provider_key ||
      existingEvent.trunkKey !== payload.trunk_key ||
      existingEvent.providerCallId !== payload.provider_call_id ||
      existingEvent.callSessionId !== payload.call_session_ref ||
      existingEvent.callbackSessionId !== payload.callback_session_ref ||
      !targetEndpointMatches ||
      existingEvent.displayDid !== payload.display_did ||
      existingEvent.remoteNumber !== payload.remote_number
    ) {
      throw this.createError(409, 'event_conflict', false);
    }
  }

  private assertRecordingEventConsistency(
    existingEvent: CallEventEntity,
    payload: RecordingWebhookPayload,
  ): void {
    const existingRecordingId = this.readStringField(
      existingEvent.payload.recording_id,
    );
    if (
      existingEvent.eventName !== payload.event_name ||
      existingEvent.providerKey !== payload.provider_key ||
      existingEvent.trunkKey !== payload.trunk_key ||
      existingEvent.providerCallId !== payload.provider_call_id ||
      existingEvent.callSessionId !== payload.call_session_ref ||
      existingRecordingId !== payload.recording_id
    ) {
      throw this.createError(409, 'event_conflict', false);
    }
  }

  private assertSessionDirection(
    callSession: CallSessionEntity,
    sessionDirection: CallEventSessionDirection,
  ): void {
    if (
      (callSession.direction === CallSessionDirection.Inbound &&
        sessionDirection !== CallEventSessionDirection.Inbound) ||
      (callSession.direction === CallSessionDirection.Outbound &&
        sessionDirection !== CallEventSessionDirection.Outbound)
    ) {
      throw this.createError(409, 'event_conflict', false);
    }
  }

  private assertEventDirectionMatches(
    eventName: CallEventName,
    eventDirection: string,
    sessionDirection: CallEventSessionDirection,
  ): void {
    if (OUTBOUND_STATUS_EVENT_NAMES.has(eventName)) {
      if (
        eventDirection !== CallEventDirection.Outbound ||
        sessionDirection !== CallEventSessionDirection.Outbound
      ) {
        throw this.createError(400, 'invalid_payload', false);
      }
      return;
    }

    if (
      CALLBACK_STATUS_EVENT_NAMES.has(eventName) &&
      (eventDirection !== CallEventDirection.Internal ||
        sessionDirection !== CallEventSessionDirection.Inbound)
    ) {
      throw this.createError(400, 'invalid_payload', false);
    }
  }

  private expectCallEventName(value: unknown): CallEventName {
    const normalized = this.expectString(value, 'event_name');
    if (!Object.values(CallEventName).includes(normalized as CallEventName)) {
      throw this.createError(400, 'invalid_payload', false);
    }
    return normalized as CallEventName;
  }

  private expectSessionDirection(
    value: unknown,
  ): CallEventSessionDirection {
    const normalized = this.expectString(value, 'session_direction');
    if (
      normalized !== CallEventSessionDirection.Inbound &&
      normalized !== CallEventSessionDirection.Outbound
    ) {
      throw this.createError(400, 'invalid_payload', false);
    }

    return normalized as CallEventSessionDirection;
  }

  private toCallEventDirection(value: string): CallEventDirection {
    if (
      value !== CallEventDirection.Inbound &&
      value !== CallEventDirection.Outbound &&
      value !== CallEventDirection.Internal
    ) {
      throw this.createError(400, 'invalid_payload', false);
    }

    return value as CallEventDirection;
  }

  private expectString(value: unknown, field: string): string {
    if (typeof value !== 'string') {
      throw this.createError(400, 'invalid_payload', false);
    }

    const normalized = value.trim();
    if (!normalized) {
      throw this.createError(400, 'invalid_payload', false);
    }

    return normalized;
  }

  private optionalString(value: unknown): string | null {
    if (value == null) {
      return null;
    }
    if (typeof value !== 'string') {
      throw this.createError(400, 'invalid_payload', false);
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private optionalNullableString(value: unknown): string | null {
    if (value == null) {
      return null;
    }
    return this.optionalString(value);
  }

  private expectDate(value: unknown, field: string): Date {
    if (typeof value !== 'string') {
      throw this.createError(400, 'invalid_payload', false);
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw this.createError(400, 'invalid_payload', false);
    }

    return parsed;
  }

  private optionalDate(value: unknown): Date | null {
    if (value == null) {
      return null;
    }
    return this.expectDate(value, 'date');
  }

  private optionalNumber(value: unknown): number | null {
    if (value == null) {
      return null;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw this.createError(400, 'invalid_payload', false);
    }
    return value;
  }

  private tryNormalizeE164(value: string): string | null {
    const normalized = value.replace(/[\s\-()]/g, '').trim();
    return /^\+\d{7,15}$/.test(normalized) ? normalized : null;
  }

  private normalizeE164OrThrowPayload(value: unknown): string {
    if (typeof value !== 'string') {
      throw this.createError(400, 'invalid_payload', false);
    }

    const normalized = this.tryNormalizeE164(value);
    if (!normalized) {
      throw this.createError(400, 'invalid_payload', false);
    }

    return normalized;
  }

  private isExpiredCallback(
    callbackSession: CallbackSessionEntity,
    now: Date,
  ): boolean {
    if (callbackSession.status === CallbackSessionStatus.Expired) {
      return true;
    }

    return callbackSession.expiresAt.getTime() <= now.getTime();
  }

  private asInboundDecisionReason(value: string): InboundDecisionReason {
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

  private readStringField(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private createError(
    status: number,
    errorCode: ErrorCode | InboundDecisionReason,
    retryable: boolean,
  ): TelephonyWebhookError {
    return new TelephonyWebhookError(status, {
      accepted: false,
      error_code: errorCode,
      retryable,
    });
  }
}
