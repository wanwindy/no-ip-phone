import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
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
import { AuthenticatedAppUser } from '../auth/strategies/jwt.strategy';
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
import { CreateOutboundCallDto } from './dto/create-outbound-call.dto';

const DEFAULT_CALLBACK_TTL_SECONDS = 2 * 60 * 60;

const DIALABLE_PATTERNS = [
  /^1[3-9]\d{9}$/,
  /^0\d{2,3}\d{7,8}$/,
  /^\+\d{7,15}$/,
  /^(?:400|800)\d{7}$/,
];

export interface OutboundDisplayDidResponse {
  e164: string;
  displayLabel: string;
}

export interface CallbackWindowResponse {
  status: string;
  expiresAt: string;
  ttlSeconds: number;
}

export interface OutboundTargetEndpointResponse {
  endpointId: string;
  endpointType: string;
  endpointValue: string;
  endpointLabel: string;
}

export interface LatestCallEventResponse {
  eventName: string;
  eventDirection: string;
  occurredAt: string;
}

export interface OutboundCallTaskResponse {
  taskId: string;
  tenantId: string;
  mode: 'server_orchestrated_mode';
  status: string;
  destinationNumber: string;
  displayDid: OutboundDisplayDidResponse | null;
  targetEndpoint: OutboundTargetEndpointResponse | null;
  callbackWindow: CallbackWindowResponse | null;
  latestEvent: LatestCallEventResponse | null;
  createdAt: string;
  updatedAt: string;
  note: string;
}

interface SelectedDidContext {
  assignment: TenantDidAssignmentEntity;
  did: DidInventoryEntity | null;
}

interface PersistedCallTask {
  callSession: CallSessionEntity;
  callbackSession: CallbackSessionEntity | null;
  latestEvent: CallEventEntity | null;
}

interface LoadedCallTaskView {
  callSession: CallSessionEntity;
  callbackSession: CallbackSessionEntity | null;
  displayDid: DidInventoryEntity | null;
  targetEndpoint: TenantEndpointEntity | null;
  latestEvent: CallEventEntity | null;
}

@Injectable()
export class CallsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CallSessionEntity)
    private readonly callSessionsRepository: Repository<CallSessionEntity>,
    @InjectRepository(CallbackSessionEntity)
    private readonly callbackSessionsRepository: Repository<CallbackSessionEntity>,
    @InjectRepository(CallEventEntity)
    private readonly callEventsRepository: Repository<CallEventEntity>,
    @InjectRepository(TenantDidAssignmentEntity)
    private readonly tenantDidAssignmentsRepository: Repository<TenantDidAssignmentEntity>,
    @InjectRepository(DidInventoryEntity)
    private readonly didInventoryRepository: Repository<DidInventoryEntity>,
    @InjectRepository(TenantEndpointEntity)
    private readonly tenantEndpointsRepository: Repository<TenantEndpointEntity>,
  ) {}

  async createOutboundCall(
    user: AuthenticatedAppUser,
    input: CreateOutboundCallDto,
  ): Promise<OutboundCallTaskResponse> {
    this.assertTenantContext(user);

    const tenantId = user.tenantId!;
    const tenantMemberId = user.tenantMemberId!;
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

  async getCall(
    user: AuthenticatedAppUser,
    callId: string,
  ): Promise<OutboundCallTaskResponse> {
    this.assertTenantContext(user);

    const taskView = await this.loadCallTaskView({
      tenantId: user.tenantId!,
      callId,
    });
    if (!taskView) {
      throw new AppException(ErrorCode.INTERNAL_ERROR, '呼叫任务不存在', 404);
    }

    return this.toOutboundCallTaskResponse({
      callSession: taskView.callSession,
      callbackSession: taskView.callbackSession,
      displayDid: taskView.displayDid,
      targetEndpoint: taskView.targetEndpoint,
      latestEvent: taskView.latestEvent,
    });
  }

  private async persistOutboundCall(params: {
    tenantId: string;
    tenantMemberId: string;
    destinationNumber: string;
    didSelection: SelectedDidContext | null;
    targetEndpoint: TenantEndpointEntity | null;
    clientRequestId: string | null;
  }): Promise<PersistedCallTask> {
    const {
      tenantId,
      tenantMemberId,
      destinationNumber,
      didSelection,
      targetEndpoint,
      clientRequestId,
    } = params;

    return this.dataSource.transaction(async (manager) => {
      const callSessionsRepository = manager.getRepository(CallSessionEntity);
      const callbackSessionsRepository = manager.getRepository(CallbackSessionEntity);
      const callEventsRepository = manager.getRepository(CallEventEntity);

      let callSession = await callSessionsRepository.save(
        callSessionsRepository.create({
          tenantId,
          tenantDidAssignmentId: didSelection?.assignment.id ?? null,
          initiatedByMemberId: tenantMemberId,
          fromEndpointId: targetEndpoint?.id ?? null,
          callbackSessionId: null,
          direction: CallSessionDirection.Outbound,
          remoteNumber: destinationNumber,
          displayDidId: didSelection?.did?.id ?? null,
          providerCallId: null,
          selectedTrunkKey: null,
          status: didSelection?.did
            ? CallSessionStatus.Dispatching
            : CallSessionStatus.Created,
          hangupCause: null,
          startedAt: null,
          answeredAt: null,
          endedAt: null,
        }),
      );

      let callbackSession: CallbackSessionEntity | null = null;
      if (
        didSelection?.did != null &&
        didSelection.assignment.callbackEnabled &&
        targetEndpoint != null
      ) {
        const expiresAt = new Date(
          callSession.createdAt.getTime() + DEFAULT_CALLBACK_TTL_SECONDS * 1000,
        );
        callbackSession = await callbackSessionsRepository.save(
          callbackSessionsRepository.create({
            tenantId,
            tenantDidAssignmentId: didSelection.assignment.id,
            displayDidId: didSelection.did.id,
            remoteNumber: destinationNumber,
            originCallSessionId: callSession.id,
            targetEndpointId: targetEndpoint.id,
            lastRoutedEndpointId: null,
            status: CallbackSessionStatus.Active,
            expiresAt,
            matchedAt: null,
            expiredAt: null,
            decisionReason: null,
            routingDecisionKey: null,
            lastInboundAt: null,
          }),
        );

        callSession.callbackSessionId = callbackSession.id;
        callSession = await callSessionsRepository.save(callSession);
      }

      let latestEvent: CallEventEntity | null = null;
      if (didSelection?.did) {
        latestEvent = await callEventsRepository.save(
          callEventsRepository.create({
            tenantId,
            callSessionId: callSession.id,
            callbackSessionId: callbackSession?.id ?? null,
            targetEndpointId: targetEndpoint?.id ?? null,
            eventName: CallEventName.TelephonyOutboundAccepted,
            eventDirection: CallEventDirection.Outbound,
            sessionDirection: CallEventSessionDirection.Outbound,
            providerKey: null,
            trunkKey: callSession.selectedTrunkKey,
            providerEventId:
              clientRequestId ?? `call-task:${callSession.id}:accepted`,
            providerCallId: callSession.providerCallId,
            displayDid: didSelection.did.phoneNumberE164,
            remoteNumber: destinationNumber,
            traceId: clientRequestId ?? `call-task:${callSession.id}`,
            eventIdempotencyKey:
              `call-task:${callSession.id}:telephony.outbound.accepted`,
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
          }),
        );
      }

      return { callSession, callbackSession, latestEvent };
    });
  }

  private async loadCallTaskView(params: {
    tenantId: string;
    callId: string;
  }): Promise<LoadedCallTaskView | null> {
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

    const targetEndpointId =
      callbackSession?.targetEndpointId ?? callSession.fromEndpointId;
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

  private async selectDidContext(
    tenantId: string,
    tenantMemberId: string,
  ): Promise<SelectedDidContext | null> {
    const assignments = await this.tenantDidAssignmentsRepository.find({
      where: {
        tenantId,
        status: TenantDidAssignmentStatus.Active,
      },
      order: {
        activatedAt: 'ASC',
      },
    });

    const selectedAssignment =
      assignments.find(
        (assignment) => assignment.assignedMemberId === tenantMemberId,
      ) ??
      assignments.find((assignment) => assignment.assignedMemberId == null) ??
      null;

    if (!selectedAssignment) {
      return null;
    }

    const did = await this.didInventoryRepository.findOne({
      where: {
        id: selectedAssignment.didId,
        status: In([
          DidInventoryStatus.Assigned,
          DidInventoryStatus.Reserved,
          DidInventoryStatus.Available,
        ]),
      },
    });

    return {
      assignment: selectedAssignment,
      did,
    };
  }

  private async selectTargetEndpoint(
    tenantId: string,
    tenantMemberId: string,
  ): Promise<TenantEndpointEntity | null> {
    const endpoints = await this.tenantEndpointsRepository.find({
      where: {
        tenantId,
        status: TenantEndpointStatus.Active,
      },
      order: {
        priority: 'ASC',
        createdAt: 'ASC',
      },
    });

    return (
      endpoints.find((endpoint) => endpoint.memberId === tenantMemberId) ??
      endpoints.find((endpoint) => endpoint.memberId == null) ??
      null
    );
  }

  private toOutboundCallTaskResponse(params: {
    callSession: CallSessionEntity;
    callbackSession: CallbackSessionEntity | null;
    displayDid: DidInventoryEntity | null;
    targetEndpoint: TenantEndpointEntity | null;
    latestEvent: CallEventEntity | null;
  }): OutboundCallTaskResponse {
    const { callSession, callbackSession, displayDid, targetEndpoint, latestEvent } =
      params;

    return {
      taskId: callSession.id,
      tenantId: callSession.tenantId,
      mode: 'server_orchestrated_mode',
      status: callSession.status,
      destinationNumber: callSession.remoteNumber,
      displayDid: displayDid
          ? {
              e164: displayDid.phoneNumberE164,
              displayLabel:
                displayDid.displayLabel ??
                displayDid.phoneNumberE164.replace('+', '00'),
            }
          : null,
      targetEndpoint: targetEndpoint
          ? {
              endpointId: targetEndpoint.id,
              endpointType: targetEndpoint.endpointType,
              endpointValue: targetEndpoint.endpointValue,
              endpointLabel:
                targetEndpoint.endpointLabel ?? targetEndpoint.endpointValue,
            }
          : null,
      callbackWindow: callbackSession
          ? {
              status: callbackSession.status,
              expiresAt: callbackSession.expiresAt.toISOString(),
              ttlSeconds: Math.max(
                0,
                Math.ceil(
                  (callbackSession.expiresAt.getTime() - Date.now()) / 1000,
                ),
              ),
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

  private buildAcceptedEventPayload(params: {
    callSession: CallSessionEntity;
    callbackSession: CallbackSessionEntity | null;
    targetEndpoint: TenantEndpointEntity | null;
    clientRequestId: string | null;
  }): Record<string, unknown> {
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

  private buildTaskNote(params: {
    callSession: CallSessionEntity;
    callbackSession: CallbackSessionEntity | null;
    displayDid: DidInventoryEntity | null;
    targetEndpoint: TenantEndpointEntity | null;
    latestEvent: CallEventEntity | null;
  }): string {
    const {
      callSession,
      callbackSession,
      displayDid,
      targetEndpoint,
      latestEvent,
    } = params;

    if (!displayDid) {
      return '呼叫任务已落库，但当前租户尚未选到可用 DID，任务仍停留在创建态。';
    }

    if (!targetEndpoint) {
      return '呼叫任务已落库，当前 DID 已确定，但尚未选到可回拨的租户终端。';
    }

    if (!callbackSession) {
      return '呼叫任务已落库，当前 DID 与租户终端已确定，但回拨窗口未启用。';
    }

    if (latestEvent?.eventName === CallEventName.TelephonyOutboundAccepted) {
      return '呼叫任务已落库，并写入最小 accepted 事件；等待后续 telephony 状态推进。';
    }

    if (callSession.status === CallSessionStatus.Created) {
      return '呼叫任务已落库，等待后续编排层补齐 DID、终端和 telephony 事件。';
    }

    return '呼叫任务状态已从持久化记录加载。';
  }

  private assertTenantContext(user: AuthenticatedAppUser): void {
    if (!user.tenantId || !user.tenantMemberId) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        '当前账号未绑定可用租户，暂无法发起或查询平台外呼任务',
        403,
      );
    }
  }

  private normalizePhoneNumber(value: string): string {
    const normalized = value.replace(/[\s\-()（）]/g, '').trim();
    if (normalized.length === 0) {
      throw new AppException(ErrorCode.PHONE_INVALID, '号码格式不正确', 400);
    }

    if (!DIALABLE_PATTERNS.some((pattern) => pattern.test(normalized))) {
      throw new AppException(ErrorCode.PHONE_INVALID, '号码格式不正确', 400);
    }

    return normalized;
  }
}
