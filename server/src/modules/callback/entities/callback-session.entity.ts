import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CallbackSessionStatus {
  Active = 'active',
  Routing = 'routing',
  Fulfilled = 'fulfilled',
  Expired = 'expired',
  Failed = 'failed',
  Revoked = 'revoked',
}

@Entity('callback_sessions')
@Index('uk_callback_sessions_tenant_id_id', ['tenantId', 'id'], {
  unique: true,
})
@Index('idx_callback_sessions_tenant_status_expires', [
  'tenantId',
  'status',
  'expiresAt',
])
@Index('idx_callback_sessions_origin_call', ['tenantId', 'originCallSessionId'])
@Index('idx_callback_sessions_match_lookup', [
  'displayDidId',
  'remoteNumber',
  'expiresAt',
  'createdAt',
])
@Index('idx_callback_sessions_target_endpoint', ['tenantId', 'targetEndpointId', 'status'])
export class CallbackSessionEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'tenant_did_assignment_id', type: 'uuid', nullable: true })
  tenantDidAssignmentId!: string | null;

  @Column({ name: 'display_did_id', type: 'uuid' })
  displayDidId!: string;

  @Column({ name: 'remote_number', type: 'varchar', length: 32 })
  remoteNumber!: string;

  @Column({ name: 'origin_call_session_id', type: 'uuid' })
  originCallSessionId!: string;

  @Column({ name: 'target_endpoint_id', type: 'uuid', nullable: true })
  targetEndpointId!: string | null;

  @Column({ name: 'last_routed_endpoint_id', type: 'uuid', nullable: true })
  lastRoutedEndpointId!: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    default: CallbackSessionStatus.Active,
  })
  status!: CallbackSessionStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'matched_at', type: 'timestamptz', nullable: true })
  matchedAt!: Date | null;

  @Column({ name: 'expired_at', type: 'timestamptz', nullable: true })
  expiredAt!: Date | null;

  @Column({ name: 'decision_reason', type: 'varchar', length: 64, nullable: true })
  decisionReason!: string | null;

  @Column({
    name: 'routing_decision_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  routingDecisionKey!: string | null;

  @Column({ name: 'last_inbound_at', type: 'timestamptz', nullable: true })
  lastInboundAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
