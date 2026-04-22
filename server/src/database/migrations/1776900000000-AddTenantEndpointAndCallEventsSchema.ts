import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantEndpointAndCallEventsSchema1776900000000
  implements MigrationInterface
{
  name = 'AddTenantEndpointAndCallEventsSchema1776900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant_endpoints (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        member_id uuid,
        endpoint_type varchar(32) NOT NULL,
        endpoint_value varchar(255) NOT NULL,
        endpoint_label varchar(100),
        priority int NOT NULL DEFAULT 100,
        status varchar(20) NOT NULL DEFAULT 'active',
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        last_seen_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_tenant_endpoints_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uk_tenant_endpoints_tenant_value UNIQUE (tenant_id, endpoint_type, endpoint_value),
        CONSTRAINT fk_tenant_endpoints_member
          FOREIGN KEY (tenant_id, member_id)
          REFERENCES tenant_members(tenant_id, id),
        CONSTRAINT ck_tenant_endpoints_type CHECK (
          endpoint_type IN ('app_user', 'sip_extension', 'pstn_number', 'webhook')
        ),
        CONSTRAINT ck_tenant_endpoints_status CHECK (
          status IN ('active', 'disabled', 'offline')
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_endpoints_tenant_status_priority
      ON tenant_endpoints (tenant_id, status, priority, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_endpoints_tenant_member_status
      ON tenant_endpoints (tenant_id, member_id, status)
    `);
    await queryRunner.query(`COMMENT ON TABLE tenant_endpoints IS '租户可路由终端表，供 callback 回退和桥接使用'`);
    await queryRunner.query(`COMMENT ON COLUMN tenant_endpoints.priority IS '数值越小优先级越高'`);

    await queryRunner.query(`
      ALTER TABLE call_sessions
      ADD COLUMN IF NOT EXISTS from_endpoint_id uuid
    `);
    await queryRunner.query(`
      ALTER TABLE call_sessions
      ADD COLUMN IF NOT EXISTS callback_session_id uuid
    `);
    await queryRunner.query(`
      ALTER TABLE call_sessions
      ADD COLUMN IF NOT EXISTS selected_trunk_key varchar(100)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_call_sessions_tenant_from_endpoint_created
      ON call_sessions (tenant_id, from_endpoint_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_call_sessions_tenant_callback_session
      ON call_sessions (tenant_id, callback_session_id)
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_call_sessions_from_endpoint'
        ) THEN
          ALTER TABLE call_sessions
          ADD CONSTRAINT fk_call_sessions_from_endpoint
            FOREIGN KEY (tenant_id, from_endpoint_id)
            REFERENCES tenant_endpoints(tenant_id, id);
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_call_sessions_callback_session'
        ) THEN
          ALTER TABLE call_sessions
          ADD CONSTRAINT fk_call_sessions_callback_session
            FOREIGN KEY (tenant_id, callback_session_id)
            REFERENCES callback_sessions(tenant_id, id);
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE callback_sessions
      ADD COLUMN IF NOT EXISTS target_endpoint_id uuid
    `);
    await queryRunner.query(`
      ALTER TABLE callback_sessions
      ADD COLUMN IF NOT EXISTS last_routed_endpoint_id uuid
    `);
    await queryRunner.query(`
      ALTER TABLE callback_sessions
      ADD COLUMN IF NOT EXISTS decision_reason varchar(64)
    `);
    await queryRunner.query(`
      ALTER TABLE callback_sessions
      ADD COLUMN IF NOT EXISTS routing_decision_key varchar(255)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_callback_sessions_target_endpoint
      ON callback_sessions (tenant_id, target_endpoint_id, status)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uk_callback_sessions_routing_decision
      ON callback_sessions (tenant_id, routing_decision_key)
      WHERE routing_decision_key IS NOT NULL
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_callback_sessions_match_lookup`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_callback_sessions_match_lookup
      ON callback_sessions (display_did_id, remote_number, expires_at DESC, created_at DESC)
      WHERE status = 'active'
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_callback_sessions_target_endpoint'
        ) THEN
          ALTER TABLE callback_sessions
          ADD CONSTRAINT fk_callback_sessions_target_endpoint
            FOREIGN KEY (tenant_id, target_endpoint_id)
            REFERENCES tenant_endpoints(tenant_id, id);
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_callback_sessions_last_routed_endpoint'
        ) THEN
          ALTER TABLE callback_sessions
          ADD CONSTRAINT fk_callback_sessions_last_routed_endpoint
            FOREIGN KEY (tenant_id, last_routed_endpoint_id)
            REFERENCES tenant_endpoints(tenant_id, id);
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'callback_sessions'
            AND column_name = 'target_member_id'
        ) THEN
          INSERT INTO tenant_endpoints (
            tenant_id,
            member_id,
            endpoint_type,
            endpoint_value,
            endpoint_label,
            priority,
            status
          )
          SELECT DISTINCT
            callback_sessions.tenant_id,
            callback_sessions.target_member_id,
            'app_user',
            'member:' || callback_sessions.target_member_id::text,
            'Migrated callback target',
            100,
            'active'
          FROM callback_sessions
          WHERE callback_sessions.target_member_id IS NOT NULL
          ON CONFLICT (tenant_id, endpoint_type, endpoint_value) DO NOTHING;

          UPDATE callback_sessions
          SET target_endpoint_id = tenant_endpoints.id
          FROM tenant_endpoints
          WHERE callback_sessions.target_member_id IS NOT NULL
            AND callback_sessions.target_endpoint_id IS NULL
            AND tenant_endpoints.tenant_id = callback_sessions.tenant_id
            AND tenant_endpoints.endpoint_type = 'app_user'
            AND tenant_endpoints.endpoint_value = 'member:' || callback_sessions.target_member_id::text;

          ALTER TABLE callback_sessions
          DROP COLUMN target_member_id;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS call_events (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        call_session_id uuid,
        callback_session_id uuid,
        event_name varchar(64) NOT NULL,
        event_direction varchar(16) NOT NULL,
        provider_key varchar(50),
        trunk_key varchar(100),
        provider_event_id varchar(100),
        provider_call_id varchar(100),
        display_did varchar(32),
        remote_number varchar(32),
        event_idempotency_key varchar(255),
        routing_decision_key varchar(255),
        provider_raw_status varchar(64),
        provider_raw_reason varchar(255),
        decision_reason varchar(64),
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        occurred_at timestamptz NOT NULL,
        received_at timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_call_events_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_call_events_call_session
          FOREIGN KEY (tenant_id, call_session_id)
          REFERENCES call_sessions(tenant_id, id),
        CONSTRAINT fk_call_events_callback_session
          FOREIGN KEY (tenant_id, callback_session_id)
          REFERENCES callback_sessions(tenant_id, id),
        CONSTRAINT ck_call_events_direction CHECK (
          event_direction IN ('inbound', 'outbound', 'internal')
        ),
        CONSTRAINT ck_call_events_name CHECK (
          event_name IN (
            'telephony.inbound.received',
            'telephony.callback.matched',
            'telephony.callback.rejected',
            'telephony.outbound.accepted',
            'telephony.outbound.ringing',
            'telephony.outbound.answered',
            'telephony.outbound.bridged',
            'telephony.outbound.completed',
            'telephony.outbound.failed',
            'telephony.outbound.canceled',
            'telephony.recording.ready',
            'telephony.recording.failed'
          )
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_call_events_tenant_call_occurred
      ON call_events (tenant_id, call_session_id, occurred_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_call_events_tenant_callback_occurred
      ON call_events (tenant_id, callback_session_id, occurred_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_call_events_provider_call_occurred
      ON call_events (provider_call_id, occurred_at DESC)
      WHERE provider_call_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uk_call_events_idempotency_key
      ON call_events (tenant_id, event_idempotency_key)
      WHERE event_idempotency_key IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_call_events_routing_decision_key
      ON call_events (tenant_id, routing_decision_key)
      WHERE routing_decision_key IS NOT NULL
    `);
    await queryRunner.query(`COMMENT ON TABLE call_events IS '呼叫事件持久化表，承接 telephony 冻结字典和幂等键'`);
    await queryRunner.query(`COMMENT ON COLUMN call_events.event_idempotency_key IS '外部事件消费幂等键'`);
    await queryRunner.query(`COMMENT ON COLUMN call_events.routing_decision_key IS '同号回拨内部路由决策幂等键'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS call_events`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'callback_sessions'
            AND column_name = 'target_endpoint_id'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'callback_sessions'
            AND column_name = 'target_member_id'
        ) THEN
          ALTER TABLE callback_sessions
          ADD COLUMN target_member_id uuid;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'callback_sessions'
            AND column_name = 'target_member_id'
        ) THEN
          UPDATE callback_sessions
          SET target_member_id = tenant_endpoints.member_id
          FROM tenant_endpoints
          WHERE callback_sessions.target_endpoint_id = tenant_endpoints.id
            AND callback_sessions.tenant_id = tenant_endpoints.tenant_id
            AND callback_sessions.target_member_id IS NULL;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE callback_sessions
      DROP CONSTRAINT IF EXISTS fk_callback_sessions_last_routed_endpoint
    `);
    await queryRunner.query(`
      ALTER TABLE callback_sessions
      DROP CONSTRAINT IF EXISTS fk_callback_sessions_target_endpoint
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS uk_callback_sessions_routing_decision`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_callback_sessions_target_endpoint`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_callback_sessions_match_lookup`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_callback_sessions_match_lookup
      ON callback_sessions (display_did_id, remote_number, expires_at DESC)
      WHERE status = 'active'
    `);

    await queryRunner.query(`
      ALTER TABLE callback_sessions
      DROP COLUMN IF EXISTS routing_decision_key
    `);
    await queryRunner.query(`
      ALTER TABLE callback_sessions
      DROP COLUMN IF EXISTS decision_reason
    `);
    await queryRunner.query(`
      ALTER TABLE callback_sessions
      DROP COLUMN IF EXISTS last_routed_endpoint_id
    `);
    await queryRunner.query(`
      ALTER TABLE callback_sessions
      DROP COLUMN IF EXISTS target_endpoint_id
    `);

    await queryRunner.query(`
      ALTER TABLE call_sessions
      DROP CONSTRAINT IF EXISTS fk_call_sessions_callback_session
    `);
    await queryRunner.query(`
      ALTER TABLE call_sessions
      DROP CONSTRAINT IF EXISTS fk_call_sessions_from_endpoint
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_call_sessions_tenant_callback_session`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_call_sessions_tenant_from_endpoint_created`);
    await queryRunner.query(`
      ALTER TABLE call_sessions
      DROP COLUMN IF EXISTS selected_trunk_key
    `);
    await queryRunner.query(`
      ALTER TABLE call_sessions
      DROP COLUMN IF EXISTS callback_session_id
    `);
    await queryRunner.query(`
      ALTER TABLE call_sessions
      DROP COLUMN IF EXISTS from_endpoint_id
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS tenant_endpoints`);
  }
}
