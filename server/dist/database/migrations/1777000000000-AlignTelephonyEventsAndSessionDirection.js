"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlignTelephonyEventsAndSessionDirection1777000000000 = void 0;
class AlignTelephonyEventsAndSessionDirection1777000000000 {
    name = 'AlignTelephonyEventsAndSessionDirection1777000000000';
    async up(queryRunner) {
        await queryRunner.query(`
      UPDATE call_sessions
      SET direction = 'inbound'
      WHERE direction = 'callback'
    `);
        await queryRunner.query(`
      ALTER TABLE call_sessions
      DROP CONSTRAINT IF EXISTS ck_call_sessions_direction
    `);
        await queryRunner.query(`
      ALTER TABLE call_sessions
      ADD CONSTRAINT ck_call_sessions_direction
      CHECK (direction IN ('inbound', 'outbound'))
    `);
        await queryRunner.query(`
      ALTER TABLE call_events
      ADD COLUMN IF NOT EXISTS session_direction varchar(16)
    `);
        await queryRunner.query(`
      ALTER TABLE call_events
      ADD COLUMN IF NOT EXISTS target_endpoint_id uuid
    `);
        await queryRunner.query(`
      ALTER TABLE call_events
      ADD COLUMN IF NOT EXISTS trace_id varchar(100)
    `);
        await queryRunner.query(`
      UPDATE call_events
      SET session_direction = call_sessions.direction
      FROM call_sessions
      WHERE call_events.call_session_id = call_sessions.id
        AND call_events.tenant_id = call_sessions.tenant_id
        AND call_events.session_direction IS NULL
    `);
        await queryRunner.query(`
      UPDATE call_events
      SET session_direction = 'outbound'
      WHERE session_direction IS NULL
        AND event_name LIKE 'telephony.outbound.%'
    `);
        await queryRunner.query(`
      UPDATE call_events
      SET session_direction = 'inbound'
      WHERE session_direction IS NULL
        AND event_name IN (
          'telephony.inbound.received',
          'telephony.callback.matched',
          'telephony.callback.target.ringing',
          'telephony.callback.target.answered',
          'telephony.callback.bridged',
          'telephony.callback.completed',
          'telephony.callback.failed',
          'telephony.callback.canceled',
          'telephony.callback.rejected'
        )
    `);
        await queryRunner.query(`
      UPDATE call_events
      SET target_endpoint_id = COALESCE(
        callback_sessions.last_routed_endpoint_id,
        callback_sessions.target_endpoint_id
      )
      FROM callback_sessions
      WHERE call_events.callback_session_id = callback_sessions.id
        AND call_events.tenant_id = callback_sessions.tenant_id
        AND call_events.target_endpoint_id IS NULL
        AND COALESCE(
          callback_sessions.last_routed_endpoint_id,
          callback_sessions.target_endpoint_id
        ) IS NOT NULL
    `);
        await queryRunner.query(`
      ALTER TABLE call_events
      DROP CONSTRAINT IF EXISTS ck_call_events_name
    `);
        await queryRunner.query(`
      ALTER TABLE call_events
      ADD CONSTRAINT ck_call_events_name
      CHECK (
        event_name IN (
          'telephony.inbound.received',
          'telephony.callback.matched',
          'telephony.callback.target.ringing',
          'telephony.callback.target.answered',
          'telephony.callback.bridged',
          'telephony.callback.completed',
          'telephony.callback.failed',
          'telephony.callback.canceled',
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
    `);
        await queryRunner.query(`
      ALTER TABLE call_events
      DROP CONSTRAINT IF EXISTS ck_call_events_session_direction
    `);
        await queryRunner.query(`
      ALTER TABLE call_events
      ADD CONSTRAINT ck_call_events_session_direction
      CHECK (
        session_direction IS NULL
        OR session_direction IN ('inbound', 'outbound')
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_call_events_tenant_target_endpoint_occurred
      ON call_events (tenant_id, target_endpoint_id, occurred_at DESC)
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_call_events_tenant_session_direction_occurred
      ON call_events (tenant_id, session_direction, occurred_at DESC)
    `);
        await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_call_events_target_endpoint'
        ) THEN
          ALTER TABLE call_events
          ADD CONSTRAINT fk_call_events_target_endpoint
            FOREIGN KEY (tenant_id, target_endpoint_id)
            REFERENCES tenant_endpoints(tenant_id, id);
        END IF;
      END
      $$;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      DELETE FROM call_events
      WHERE event_name IN (
        'telephony.callback.target.ringing',
        'telephony.callback.target.answered',
        'telephony.callback.bridged',
        'telephony.callback.completed',
        'telephony.callback.failed',
        'telephony.callback.canceled'
      )
    `);
        await queryRunner.query(`
      ALTER TABLE call_events
      DROP CONSTRAINT IF EXISTS fk_call_events_target_endpoint
    `);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_call_events_tenant_session_direction_occurred`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_call_events_tenant_target_endpoint_occurred`);
        await queryRunner.query(`
      ALTER TABLE call_events
      DROP CONSTRAINT IF EXISTS ck_call_events_session_direction
    `);
        await queryRunner.query(`
      ALTER TABLE call_events
      DROP CONSTRAINT IF EXISTS ck_call_events_name
    `);
        await queryRunner.query(`
      ALTER TABLE call_events
      ADD CONSTRAINT ck_call_events_name
      CHECK (
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
    `);
        await queryRunner.query(`
      ALTER TABLE call_events
      DROP COLUMN IF EXISTS trace_id
    `);
        await queryRunner.query(`
      ALTER TABLE call_events
      DROP COLUMN IF EXISTS target_endpoint_id
    `);
        await queryRunner.query(`
      ALTER TABLE call_events
      DROP COLUMN IF EXISTS session_direction
    `);
        await queryRunner.query(`
      ALTER TABLE call_sessions
      DROP CONSTRAINT IF EXISTS ck_call_sessions_direction
    `);
        await queryRunner.query(`
      ALTER TABLE call_sessions
      ADD CONSTRAINT ck_call_sessions_direction
      CHECK (direction IN ('outbound', 'inbound', 'callback'))
    `);
    }
}
exports.AlignTelephonyEventsAndSessionDirection1777000000000 = AlignTelephonyEventsAndSessionDirection1777000000000;
