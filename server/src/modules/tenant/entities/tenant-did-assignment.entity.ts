import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TenantDidAssignmentUsageMode {
  SharedPool = 'shared_pool',
  FixedMember = 'fixed_member',
  ExclusiveTenant = 'exclusive_tenant',
}

export enum TenantDidAssignmentStatus {
  Active = 'active',
  Reserved = 'reserved',
  Released = 'released',
  Disabled = 'disabled',
}

@Entity('tenant_did_assignments')
@Index('uk_tenant_did_assignments_tenant_id_id', ['tenantId', 'id'], {
  unique: true,
})
@Index('idx_tenant_did_assignments_tenant_status', ['tenantId', 'status', 'usageMode'])
@Index('idx_tenant_did_assignments_tenant_member', ['tenantId', 'assignedMemberId', 'status'])
export class TenantDidAssignmentEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'did_id', type: 'uuid' })
  didId!: string;

  @Column({ name: 'assigned_member_id', type: 'uuid', nullable: true })
  assignedMemberId!: string | null;

  @Column({
    name: 'usage_mode',
    type: 'varchar',
    length: 32,
    default: TenantDidAssignmentUsageMode.SharedPool,
  })
  usageMode!: TenantDidAssignmentUsageMode;

  @Column({ name: 'callback_enabled', type: 'boolean', default: true })
  callbackEnabled!: boolean;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: TenantDidAssignmentStatus.Active,
  })
  status!: TenantDidAssignmentStatus;

  @Column({ name: 'activated_at', type: 'timestamptz', default: () => 'NOW()' })
  activatedAt!: Date;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
