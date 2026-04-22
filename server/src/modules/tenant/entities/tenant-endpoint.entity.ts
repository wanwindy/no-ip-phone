import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TenantEndpointType {
  AppUser = 'app_user',
  SipExtension = 'sip_extension',
  PstnNumber = 'pstn_number',
  Webhook = 'webhook',
}

export enum TenantEndpointStatus {
  Active = 'active',
  Disabled = 'disabled',
  Offline = 'offline',
}

@Entity('tenant_endpoints')
@Index('uk_tenant_endpoints_tenant_id_id', ['tenantId', 'id'], { unique: true })
@Index('uk_tenant_endpoints_tenant_value', ['tenantId', 'endpointType', 'endpointValue'], {
  unique: true,
})
@Index('idx_tenant_endpoints_tenant_status_priority', [
  'tenantId',
  'status',
  'priority',
  'createdAt',
])
@Index('idx_tenant_endpoints_tenant_member_status', ['tenantId', 'memberId', 'status'])
export class TenantEndpointEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'member_id', type: 'uuid', nullable: true })
  memberId!: string | null;

  @Column({ name: 'endpoint_type', type: 'varchar', length: 32 })
  endpointType!: TenantEndpointType;

  @Column({ name: 'endpoint_value', type: 'varchar', length: 255 })
  endpointValue!: string;

  @Column({ name: 'endpoint_label', type: 'varchar', length: 100, nullable: true })
  endpointLabel!: string | null;

  @Column({ name: 'priority', type: 'int', default: 100 })
  priority!: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: TenantEndpointStatus.Active,
  })
  status!: TenantEndpointStatus;

  @Column({
    name: 'metadata',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  metadata!: Record<string, unknown>;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
