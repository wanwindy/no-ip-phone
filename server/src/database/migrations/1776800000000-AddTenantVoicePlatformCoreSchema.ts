import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantVoicePlatformCoreSchema1776800000000
  implements MigrationInterface
{
  name = 'AddTenantVoicePlatformCoreSchema1776800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        code varchar(50) NOT NULL,
        name varchar(100) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'active',
        timezone varchar(64) NOT NULL DEFAULT 'UTC',
        default_country varchar(8) NOT NULL DEFAULT 'AU',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_tenants_code UNIQUE (code),
        CONSTRAINT ck_tenants_status CHECK (status IN ('active', 'suspended', 'disabled'))
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE tenants IS '租户主表'`);
    await queryRunner.query(`COMMENT ON COLUMN tenants.code IS '租户编码，平台范围唯一'`);
    await queryRunner.query(`COMMENT ON COLUMN tenants.default_country IS '租户默认国家/区号资源'`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant_members (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        account_id uuid NOT NULL REFERENCES accounts(id),
        tenant_role varchar(32) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'active',
        joined_at timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_tenant_members_tenant_account UNIQUE (tenant_id, account_id),
        CONSTRAINT uk_tenant_members_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_tenant_members_role CHECK (
          tenant_role IN (
            'tenant_owner',
            'tenant_admin',
            'tenant_operator',
            'tenant_agent',
            'tenant_auditor'
          )
        ),
        CONSTRAINT ck_tenant_members_status CHECK (status IN ('invited', 'active', 'disabled'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_members_account_status
      ON tenant_members (account_id, status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_role_status
      ON tenant_members (tenant_id, tenant_role, status)
    `);
    await queryRunner.query(`COMMENT ON TABLE tenant_members IS '租户成员关系表，连接 accounts 与 tenants'`);
    await queryRunner.query(`COMMENT ON COLUMN tenant_members.account_id IS '平台账号 ID，关联 accounts.id'`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS did_inventory (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider_code varchar(50) NOT NULL,
        phone_number_e164 varchar(32) NOT NULL,
        country_code varchar(8) NOT NULL,
        area_code varchar(20),
        display_label varchar(100),
        capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
        status varchar(20) NOT NULL DEFAULT 'available',
        monthly_cost numeric(12, 2),
        currency varchar(3),
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        purchased_at timestamptz,
        released_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_did_inventory_phone_number UNIQUE (phone_number_e164),
        CONSTRAINT ck_did_inventory_status CHECK (
          status IN ('available', 'assigned', 'reserved', 'disabled', 'retired')
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_did_inventory_country_status
      ON did_inventory (country_code, status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_did_inventory_provider_status
      ON did_inventory (provider_code, status)
    `);
    await queryRunner.query(`COMMENT ON TABLE did_inventory IS '平台级 DID 库存表，不直接绑定 tenant_id'`);
    await queryRunner.query(`COMMENT ON COLUMN did_inventory.phone_number_e164 IS '标准 E.164 号码格式'`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant_did_assignments (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        did_id uuid NOT NULL REFERENCES did_inventory(id),
        assigned_member_id uuid,
        usage_mode varchar(32) NOT NULL DEFAULT 'shared_pool',
        callback_enabled boolean NOT NULL DEFAULT true,
        status varchar(20) NOT NULL DEFAULT 'active',
        activated_at timestamptz NOT NULL DEFAULT NOW(),
        released_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_tenant_did_assignments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_tenant_did_assignments_assigned_member
          FOREIGN KEY (tenant_id, assigned_member_id)
          REFERENCES tenant_members(tenant_id, id),
        CONSTRAINT ck_tenant_did_assignments_usage_mode CHECK (
          usage_mode IN ('shared_pool', 'fixed_member', 'exclusive_tenant')
        ),
        CONSTRAINT ck_tenant_did_assignments_status CHECK (
          status IN ('active', 'reserved', 'released', 'disabled')
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_did_assignments_tenant_status
      ON tenant_did_assignments (tenant_id, status, usage_mode)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_did_assignments_tenant_member
      ON tenant_did_assignments (tenant_id, assigned_member_id, status)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uk_tenant_did_assignments_active_did
      ON tenant_did_assignments (did_id)
      WHERE released_at IS NULL AND status IN ('active', 'reserved')
    `);
    await queryRunner.query(`COMMENT ON TABLE tenant_did_assignments IS '租户与 DID 的分配关系表'`);
    await queryRunner.query(`COMMENT ON COLUMN tenant_did_assignments.assigned_member_id IS '可选，固定到某个租户成员'`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS call_sessions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        tenant_did_assignment_id uuid,
        initiated_by_member_id uuid,
        direction varchar(20) NOT NULL,
        remote_number varchar(32) NOT NULL,
        display_did_id uuid REFERENCES did_inventory(id),
        provider_call_id varchar(100),
        status varchar(32) NOT NULL DEFAULT 'created',
        hangup_cause varchar(64),
        started_at timestamptz,
        answered_at timestamptz,
        ended_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_call_sessions_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_call_sessions_assignment
          FOREIGN KEY (tenant_id, tenant_did_assignment_id)
          REFERENCES tenant_did_assignments(tenant_id, id),
        CONSTRAINT fk_call_sessions_initiated_by_member
          FOREIGN KEY (tenant_id, initiated_by_member_id)
          REFERENCES tenant_members(tenant_id, id),
        CONSTRAINT ck_call_sessions_direction CHECK (
          direction IN ('outbound', 'inbound', 'callback')
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_call_sessions_tenant_status_created
      ON call_sessions (tenant_id, status, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_call_sessions_tenant_did_remote_created
      ON call_sessions (tenant_id, display_did_id, remote_number, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_call_sessions_provider_call
      ON call_sessions (provider_call_id)
      WHERE provider_call_id IS NOT NULL
    `);
    await queryRunner.query(`COMMENT ON TABLE call_sessions IS '通话会话主表，按 tenant_id 做行级隔离'`);
    await queryRunner.query(`COMMENT ON COLUMN call_sessions.remote_number IS '被叫或来电号码，要求写入 E.164'`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS callback_sessions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        tenant_did_assignment_id uuid,
        display_did_id uuid NOT NULL REFERENCES did_inventory(id),
        remote_number varchar(32) NOT NULL,
        origin_call_session_id uuid NOT NULL,
        target_member_id uuid,
        status varchar(32) NOT NULL DEFAULT 'active',
        expires_at timestamptz NOT NULL,
        matched_at timestamptz,
        expired_at timestamptz,
        last_inbound_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_callback_sessions_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_callback_sessions_assignment
          FOREIGN KEY (tenant_id, tenant_did_assignment_id)
          REFERENCES tenant_did_assignments(tenant_id, id),
        CONSTRAINT fk_callback_sessions_origin_call
          FOREIGN KEY (tenant_id, origin_call_session_id)
          REFERENCES call_sessions(tenant_id, id),
        CONSTRAINT fk_callback_sessions_target_member
          FOREIGN KEY (tenant_id, target_member_id)
          REFERENCES tenant_members(tenant_id, id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_callback_sessions_tenant_status_expires
      ON callback_sessions (tenant_id, status, expires_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_callback_sessions_origin_call
      ON callback_sessions (tenant_id, origin_call_session_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_callback_sessions_match_lookup
      ON callback_sessions (display_did_id, remote_number, expires_at DESC)
      WHERE status = 'active'
    `);
    await queryRunner.query(`COMMENT ON TABLE callback_sessions IS '同号回拨窗口表，匹配 display_did + remote_number + TTL'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS callback_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS call_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_did_assignments`);
    await queryRunner.query(`DROP TABLE IF EXISTS did_inventory`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants`);
  }
}
