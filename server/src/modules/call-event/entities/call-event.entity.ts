import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum CallEventDirection {
  Inbound = 'inbound',
  Outbound = 'outbound',
  Internal = 'internal',
}

export enum CallEventSessionDirection {
  Inbound = 'inbound',
  Outbound = 'outbound',
}

export enum CallEventName {
  TelephonyInboundReceived = 'telephony.inbound.received',
  TelephonyCallbackMatched = 'telephony.callback.matched',
  TelephonyCallbackTargetRinging = 'telephony.callback.target.ringing',
  TelephonyCallbackTargetAnswered = 'telephony.callback.target.answered',
  TelephonyCallbackBridged = 'telephony.callback.bridged',
  TelephonyCallbackCompleted = 'telephony.callback.completed',
  TelephonyCallbackFailed = 'telephony.callback.failed',
  TelephonyCallbackCanceled = 'telephony.callback.canceled',
  TelephonyCallbackRejected = 'telephony.callback.rejected',
  TelephonyOutboundAccepted = 'telephony.outbound.accepted',
  TelephonyOutboundRinging = 'telephony.outbound.ringing',
  TelephonyOutboundAnswered = 'telephony.outbound.answered',
  TelephonyOutboundBridged = 'telephony.outbound.bridged',
  TelephonyOutboundCompleted = 'telephony.outbound.completed',
  TelephonyOutboundFailed = 'telephony.outbound.failed',
  TelephonyOutboundCanceled = 'telephony.outbound.canceled',
  TelephonyRecordingReady = 'telephony.recording.ready',
  TelephonyRecordingFailed = 'telephony.recording.failed',
}

@Entity('call_events')
@Index('uk_call_events_tenant_id_id', ['tenantId', 'id'], { unique: true })
@Index('idx_call_events_tenant_call_occurred', ['tenantId', 'callSessionId', 'occurredAt'])
@Index('idx_call_events_tenant_callback_occurred', [
  'tenantId',
  'callbackSessionId',
  'occurredAt',
])
@Index('idx_call_events_provider_call_occurred', ['providerCallId', 'occurredAt'])
@Index('idx_call_events_routing_decision_key', ['tenantId', 'routingDecisionKey'])
@Index('idx_call_events_tenant_target_endpoint_occurred', [
  'tenantId',
  'targetEndpointId',
  'occurredAt',
])
@Index('idx_call_events_tenant_session_direction_occurred', [
  'tenantId',
  'sessionDirection',
  'occurredAt',
])
export class CallEventEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'call_session_id', type: 'uuid', nullable: true })
  callSessionId!: string | null;

  @Column({ name: 'callback_session_id', type: 'uuid', nullable: true })
  callbackSessionId!: string | null;

  @Column({ name: 'target_endpoint_id', type: 'uuid', nullable: true })
  targetEndpointId!: string | null;

  @Column({ name: 'event_name', type: 'varchar', length: 64 })
  eventName!: CallEventName;

  @Column({ name: 'event_direction', type: 'varchar', length: 16 })
  eventDirection!: CallEventDirection;

  @Column({ name: 'session_direction', type: 'varchar', length: 16, nullable: true })
  sessionDirection!: CallEventSessionDirection | null;

  @Column({ name: 'provider_key', type: 'varchar', length: 50, nullable: true })
  providerKey!: string | null;

  @Column({ name: 'trunk_key', type: 'varchar', length: 100, nullable: true })
  trunkKey!: string | null;

  @Column({ name: 'provider_event_id', type: 'varchar', length: 100, nullable: true })
  providerEventId!: string | null;

  @Column({ name: 'provider_call_id', type: 'varchar', length: 100, nullable: true })
  providerCallId!: string | null;

  @Column({ name: 'display_did', type: 'varchar', length: 32, nullable: true })
  displayDid!: string | null;

  @Column({ name: 'remote_number', type: 'varchar', length: 32, nullable: true })
  remoteNumber!: string | null;

  @Column({ name: 'trace_id', type: 'varchar', length: 100, nullable: true })
  traceId!: string | null;

  @Column({
    name: 'event_idempotency_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  eventIdempotencyKey!: string | null;

  @Column({
    name: 'routing_decision_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  routingDecisionKey!: string | null;

  @Column({
    name: 'provider_raw_status',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  providerRawStatus!: string | null;

  @Column({
    name: 'provider_raw_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerRawReason!: string | null;

  @Column({ name: 'decision_reason', type: 'varchar', length: 64, nullable: true })
  decisionReason!: string | null;

  @Column({
    name: 'payload',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  payload!: Record<string, unknown>;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'NOW()' })
  receivedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
