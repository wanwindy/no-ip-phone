import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CallSessionDirection {
  Outbound = 'outbound',
  Inbound = 'inbound',
}

export enum CallSessionStatus {
  Created = 'created',
  Dispatching = 'dispatching',
  Ringing = 'ringing',
  Answered = 'answered',
  Bridged = 'bridged',
  Completed = 'completed',
  Failed = 'failed',
  Canceled = 'canceled',
  Expired = 'expired',
}

@Entity('call_sessions')
@Index('uk_call_sessions_tenant_id_id', ['tenantId', 'id'], { unique: true })
@Index('idx_call_sessions_tenant_status_created', ['tenantId', 'status', 'createdAt'])
@Index('idx_call_sessions_tenant_did_remote_created', [
  'tenantId',
  'displayDidId',
  'remoteNumber',
  'createdAt',
])
@Index('idx_call_sessions_provider_call', ['providerCallId'])
@Index('idx_call_sessions_tenant_from_endpoint_created', [
  'tenantId',
  'fromEndpointId',
  'createdAt',
])
@Index('idx_call_sessions_tenant_callback_session', ['tenantId', 'callbackSessionId'])
export class CallSessionEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'tenant_did_assignment_id', type: 'uuid', nullable: true })
  tenantDidAssignmentId!: string | null;

  @Column({ name: 'initiated_by_member_id', type: 'uuid', nullable: true })
  initiatedByMemberId!: string | null;

  @Column({ name: 'from_endpoint_id', type: 'uuid', nullable: true })
  fromEndpointId!: string | null;

  @Column({ name: 'callback_session_id', type: 'uuid', nullable: true })
  callbackSessionId!: string | null;

  @Column({ name: 'direction', type: 'varchar', length: 20 })
  direction!: CallSessionDirection;

  @Column({ name: 'remote_number', type: 'varchar', length: 32 })
  remoteNumber!: string;

  @Column({ name: 'display_did_id', type: 'uuid', nullable: true })
  displayDidId!: string | null;

  @Column({ name: 'provider_call_id', type: 'varchar', length: 100, nullable: true })
  providerCallId!: string | null;

  @Column({ name: 'selected_trunk_key', type: 'varchar', length: 100, nullable: true })
  selectedTrunkKey!: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    default: CallSessionStatus.Created,
  })
  status!: CallSessionStatus;

  @Column({ name: 'hangup_cause', type: 'varchar', length: 64, nullable: true })
  hangupCause!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'answered_at', type: 'timestamptz', nullable: true })
  answeredAt!: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
