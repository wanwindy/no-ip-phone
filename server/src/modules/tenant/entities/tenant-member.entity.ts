import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TenantMemberRole {
  TenantOwner = 'tenant_owner',
  TenantAdmin = 'tenant_admin',
  TenantOperator = 'tenant_operator',
  TenantAgent = 'tenant_agent',
  TenantAuditor = 'tenant_auditor',
}

export enum TenantMemberStatus {
  Invited = 'invited',
  Active = 'active',
  Disabled = 'disabled',
}

@Entity('tenant_members')
@Index('uk_tenant_members_tenant_account', ['tenantId', 'accountId'], {
  unique: true,
})
@Index('uk_tenant_members_tenant_id_id', ['tenantId', 'id'], { unique: true })
@Index('idx_tenant_members_account_status', ['accountId', 'status'])
@Index('idx_tenant_members_tenant_role_status', ['tenantId', 'tenantRole', 'status'])
export class TenantMemberEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @Column({ name: 'tenant_role', type: 'varchar', length: 32 })
  tenantRole!: TenantMemberRole;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: TenantMemberStatus.Active,
  })
  status!: TenantMemberStatus;

  @Column({ name: 'joined_at', type: 'timestamptz', default: () => 'NOW()' })
  joinedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
