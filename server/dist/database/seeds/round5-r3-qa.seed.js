"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcrypt = __importStar(require("bcryptjs"));
const { Client } = require('pg');
const SEED_IDS = {
    accountTenantAlpha: '11111111-1111-4111-8111-111111111111',
    accountTenantBeta: '22222222-2222-4222-8222-222222222222',
    tenantAlpha: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    tenantBeta: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    tenantMemberAlpha: 'aaaabbbb-1111-4111-8111-111111111111',
    tenantMemberAlphaBeta: 'bbbbaaaa-3333-4333-8333-333333333333',
    tenantMemberBeta: 'bbbbaaaa-2222-4222-8222-222222222222',
    didAlpha: 'dddd1111-1111-4111-8111-111111111111',
    didBeta: 'dddd2222-2222-4222-8222-222222222222',
    assignmentAlpha: 'adad1111-1111-4111-8111-111111111111',
    assignmentBeta: 'adad2222-2222-4222-8222-222222222222',
    endpointAlpha: 'eeee1111-1111-4111-8111-111111111111',
    endpointBeta: 'eeee2222-2222-4222-8222-222222222222',
    outboundCallAlpha: 'cccc1111-1111-4111-8111-111111111111',
    inboundCallAlpha: 'cccc1111-2222-4111-8222-111111111111',
    outboundCallBeta: 'cccc2222-1111-4222-8111-222222222222',
    callbackActiveAlpha: 'fafa1111-1111-4111-8111-111111111111',
    callbackExpiredBeta: 'fafa2222-2222-4222-8222-222222222222',
    eventOutboundAcceptedAlpha: '99991111-1111-4111-8111-111111111111',
    eventInboundReceivedAlpha: '99992222-2222-4222-8222-222222222222',
    eventCallbackMatchedAlpha: '99993333-3333-4333-8333-333333333333',
    eventCallbackTargetRingingAlpha: '99994444-4444-4444-8444-444444444444',
    eventCallbackRejectedBeta: '99995555-5555-4555-8555-555555555555',
};
const SEED_LOGINS = {
    sharedSwitcher: {
        username: 'seed_alpha_owner',
        displayName: 'Seed Alpha/Beta Switcher',
        password: 'Round5!AlphaBeta1',
        defaultTenantId: SEED_IDS.tenantAlpha,
        defaultTenantCode: 'qa_alpha',
        selectableTenantIds: [SEED_IDS.tenantAlpha, SEED_IDS.tenantBeta],
        selectableTenantCodes: ['qa_alpha', 'qa_beta'],
    },
    betaOwner: {
        username: 'seed_beta_owner',
        displayName: 'Seed Beta Owner',
        password: 'Round5!BetaOwner1',
        defaultTenantId: SEED_IDS.tenantBeta,
        defaultTenantCode: 'qa_beta',
        selectableTenantIds: [SEED_IDS.tenantBeta],
        selectableTenantCodes: ['qa_beta'],
    },
};
function createClient() {
    return new Client({
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? '5432'),
        user: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME ?? 'privacy_dialer',
    });
}
async function assertTablesExist(client) {
    const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'accounts',
        'tenants',
        'tenant_members',
        'did_inventory',
        'tenant_did_assignments',
        'tenant_endpoints',
        'call_sessions',
        'callback_sessions',
        'call_events'
      )
  `);
    const requiredTables = new Set([
        'accounts',
        'tenants',
        'tenant_members',
        'did_inventory',
        'tenant_did_assignments',
        'tenant_endpoints',
        'call_sessions',
        'callback_sessions',
        'call_events',
    ]);
    for (const row of result.rows) {
        requiredTables.delete(row.table_name);
    }
    if (requiredTables.size > 0) {
        throw new Error(`Missing required tables: ${Array.from(requiredTables).join(', ')}`);
    }
}
async function upsertAccounts(client) {
    const [sharedSwitcherPasswordHash, betaOwnerPasswordHash] = await Promise.all([
        bcrypt.hash(SEED_LOGINS.sharedSwitcher.password, 10),
        bcrypt.hash(SEED_LOGINS.betaOwner.password, 10),
    ]);
    await client.query(`
    INSERT INTO accounts (
      id,
      username,
      display_name,
      password_hash,
      role,
      status,
      created_at,
      last_login_at
    )
    VALUES
      ($1, $2, $3, $4, 'app_user', 'active', NOW() - INTERVAL '30 day', NOW() - INTERVAL '1 day'),
      ($5, $6, $7, $8, 'app_user', 'active', NOW() - INTERVAL '29 day', NOW() - INTERVAL '1 day')
    ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        last_login_at = EXCLUDED.last_login_at
  `, [
        SEED_IDS.accountTenantAlpha,
        SEED_LOGINS.sharedSwitcher.username,
        SEED_LOGINS.sharedSwitcher.displayName,
        sharedSwitcherPasswordHash,
        SEED_IDS.accountTenantBeta,
        SEED_LOGINS.betaOwner.username,
        SEED_LOGINS.betaOwner.displayName,
        betaOwnerPasswordHash,
    ]);
}
async function upsertTenants(client) {
    await client.query(`
    INSERT INTO tenants (
      id,
      code,
      name,
      status,
      timezone,
      default_country,
      created_at,
      updated_at
    )
    VALUES
      ($1, 'qa_alpha', 'QA Tenant Alpha', 'active', 'Australia/Sydney', 'AU', NOW(), NOW()),
      ($2, 'qa_beta', 'QA Tenant Beta', 'active', 'Europe/London', 'GB', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET code = EXCLUDED.code,
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        timezone = EXCLUDED.timezone,
        default_country = EXCLUDED.default_country,
        updated_at = NOW()
  `, [SEED_IDS.tenantAlpha, SEED_IDS.tenantBeta]);
}
async function upsertTenantMembers(client) {
    await client.query(`
    INSERT INTO tenant_members (
      id,
      tenant_id,
      account_id,
      tenant_role,
      status,
      joined_at,
      created_at,
      updated_at
    )
    VALUES
      (
        $1,
        $2,
        $3,
        'tenant_owner',
        'active',
        NOW() - INTERVAL '30 day',
        NOW() - INTERVAL '30 day',
        NOW()
      ),
      (
        $4,
        $5,
        $6,
        'tenant_admin',
        'active',
        NOW() - INTERVAL '29 day',
        NOW() - INTERVAL '29 day',
        NOW()
      ),
      (
        $7,
        $8,
        $9,
        'tenant_owner',
        'active',
        NOW() - INTERVAL '28 day',
        NOW() - INTERVAL '28 day',
        NOW()
      )
    ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        account_id = EXCLUDED.account_id,
        tenant_role = EXCLUDED.tenant_role,
        status = EXCLUDED.status,
        joined_at = EXCLUDED.joined_at,
        updated_at = NOW()
  `, [
        SEED_IDS.tenantMemberAlpha,
        SEED_IDS.tenantAlpha,
        SEED_IDS.accountTenantAlpha,
        SEED_IDS.tenantMemberAlphaBeta,
        SEED_IDS.tenantBeta,
        SEED_IDS.accountTenantAlpha,
        SEED_IDS.tenantMemberBeta,
        SEED_IDS.tenantBeta,
        SEED_IDS.accountTenantBeta,
    ]);
}
async function upsertDidInventory(client) {
    await client.query(`
    INSERT INTO did_inventory (
      id,
      provider_code,
      phone_number_e164,
      country_code,
      area_code,
      display_label,
      capabilities,
      status,
      monthly_cost,
      currency,
      metadata,
      purchased_at,
      released_at,
      created_at,
      updated_at
    )
    VALUES
      (
        $1,
        'provider-au-01',
        '+617676021983',
        'AU',
        '7',
        'QA Alpha DID',
        '["outbound_voice", "inbound_did"]'::jsonb,
        'assigned',
        12.50,
        'AUD',
        '{"seed":"round5-r3","tenant":"alpha"}'::jsonb,
        NOW() - INTERVAL '30 day',
        NULL,
        NOW(),
        NOW()
      ),
      (
        $2,
        'provider-gb-01',
        '+442080001111',
        'GB',
        '20',
        'QA Beta DID',
        '["outbound_voice", "inbound_did"]'::jsonb,
        'assigned',
        10.00,
        'GBP',
        '{"seed":"round5-r3","tenant":"beta"}'::jsonb,
        NOW() - INTERVAL '30 day',
        NULL,
        NOW(),
        NOW()
      )
    ON CONFLICT (id) DO UPDATE
    SET provider_code = EXCLUDED.provider_code,
        phone_number_e164 = EXCLUDED.phone_number_e164,
        country_code = EXCLUDED.country_code,
        area_code = EXCLUDED.area_code,
        display_label = EXCLUDED.display_label,
        capabilities = EXCLUDED.capabilities,
        status = EXCLUDED.status,
        monthly_cost = EXCLUDED.monthly_cost,
        currency = EXCLUDED.currency,
        metadata = EXCLUDED.metadata,
        purchased_at = EXCLUDED.purchased_at,
        released_at = EXCLUDED.released_at,
        updated_at = NOW()
  `, [SEED_IDS.didAlpha, SEED_IDS.didBeta]);
}
async function upsertAssignments(client) {
    await client.query(`
    INSERT INTO tenant_did_assignments (
      id,
      tenant_id,
      did_id,
      assigned_member_id,
      usage_mode,
      callback_enabled,
      status,
      activated_at,
      released_at,
      created_at,
      updated_at
    )
    VALUES
      ($1, $2, $3, $4, 'fixed_member', true, 'active', NOW() - INTERVAL '2 day', NULL, NOW(), NOW()),
      ($5, $6, $7, $8, 'fixed_member', true, 'active', NOW() - INTERVAL '2 day', NULL, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        did_id = EXCLUDED.did_id,
        assigned_member_id = EXCLUDED.assigned_member_id,
        usage_mode = EXCLUDED.usage_mode,
        callback_enabled = EXCLUDED.callback_enabled,
        status = EXCLUDED.status,
        activated_at = EXCLUDED.activated_at,
        released_at = EXCLUDED.released_at,
        updated_at = NOW()
  `, [
        SEED_IDS.assignmentAlpha,
        SEED_IDS.tenantAlpha,
        SEED_IDS.didAlpha,
        SEED_IDS.tenantMemberAlpha,
        SEED_IDS.assignmentBeta,
        SEED_IDS.tenantBeta,
        SEED_IDS.didBeta,
        SEED_IDS.tenantMemberBeta,
    ]);
}
async function upsertEndpoints(client) {
    await client.query(`
    INSERT INTO tenant_endpoints (
      id,
      tenant_id,
      member_id,
      endpoint_type,
      endpoint_value,
      endpoint_label,
      priority,
      status,
      metadata,
      last_seen_at,
      created_at,
      updated_at
    )
    VALUES
      (
        $1,
        $2,
        $3,
        'app_user',
        $4,
        'QA Alpha Agent Endpoint',
        10,
        'active',
        '{"seed":"round5-r3","channel":"app"}'::jsonb,
        NOW() - INTERVAL '5 minute',
        NOW(),
        NOW()
      ),
      (
        $5,
        $6,
        $7,
        'sip_extension',
        'sip:beta-agent-1001@example.invalid',
        'QA Beta SIP Endpoint',
        20,
        'active',
        '{"seed":"round5-r3","channel":"sip"}'::jsonb,
        NOW() - INTERVAL '5 minute',
        NOW(),
        NOW()
      )
    ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        member_id = EXCLUDED.member_id,
        endpoint_type = EXCLUDED.endpoint_type,
        endpoint_value = EXCLUDED.endpoint_value,
        endpoint_label = EXCLUDED.endpoint_label,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        metadata = EXCLUDED.metadata,
        last_seen_at = EXCLUDED.last_seen_at,
        updated_at = NOW()
  `, [
        SEED_IDS.endpointAlpha,
        SEED_IDS.tenantAlpha,
        SEED_IDS.tenantMemberAlpha,
        `member:${SEED_IDS.tenantMemberAlpha}`,
        SEED_IDS.endpointBeta,
        SEED_IDS.tenantBeta,
        SEED_IDS.tenantMemberBeta,
    ]);
}
async function upsertCallSessions(client) {
    await client.query(`
    INSERT INTO call_sessions (
      id,
      tenant_id,
      tenant_did_assignment_id,
      initiated_by_member_id,
      from_endpoint_id,
      callback_session_id,
      direction,
      remote_number,
      display_did_id,
      provider_call_id,
      selected_trunk_key,
      status,
      hangup_cause,
      started_at,
      answered_at,
      ended_at,
      created_at,
      updated_at
    )
    VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        NULL,
        'outbound',
        '+8613811111111',
        $6,
        'provider-call-alpha-outbound',
        'au-outbound-01',
        'completed',
        NULL,
        NOW() - INTERVAL '100 minute',
        NOW() - INTERVAL '99 minute',
        NOW() - INTERVAL '80 minute',
        NOW() - INTERVAL '100 minute',
        NOW()
      ),
      (
        $7,
        $8,
        $9,
        $10,
        $11,
        NULL,
        'inbound',
        '+8613811111111',
        $12,
        'provider-call-alpha-inbound',
        'au-did-inbound-01',
        'ringing',
        NULL,
        NOW() - INTERVAL '10 minute',
        NULL,
        NULL,
        NOW() - INTERVAL '10 minute',
        NOW()
      ),
      (
        $13,
        $14,
        $15,
        $16,
        $17,
        NULL,
        'outbound',
        '+8613822222222',
        $18,
        'provider-call-beta-outbound',
        'gb-outbound-01',
        'completed',
        NULL,
        NOW() - INTERVAL '150 minute',
        NOW() - INTERVAL '149 minute',
        NOW() - INTERVAL '130 minute',
        NOW() - INTERVAL '150 minute',
        NOW()
      )
    ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        tenant_did_assignment_id = EXCLUDED.tenant_did_assignment_id,
        initiated_by_member_id = EXCLUDED.initiated_by_member_id,
        from_endpoint_id = EXCLUDED.from_endpoint_id,
        callback_session_id = EXCLUDED.callback_session_id,
        direction = EXCLUDED.direction,
        remote_number = EXCLUDED.remote_number,
        display_did_id = EXCLUDED.display_did_id,
        provider_call_id = EXCLUDED.provider_call_id,
        selected_trunk_key = EXCLUDED.selected_trunk_key,
        status = EXCLUDED.status,
        hangup_cause = EXCLUDED.hangup_cause,
        started_at = EXCLUDED.started_at,
        answered_at = EXCLUDED.answered_at,
        ended_at = EXCLUDED.ended_at,
        updated_at = NOW()
  `, [
        SEED_IDS.outboundCallAlpha,
        SEED_IDS.tenantAlpha,
        SEED_IDS.assignmentAlpha,
        SEED_IDS.tenantMemberAlpha,
        SEED_IDS.endpointAlpha,
        SEED_IDS.didAlpha,
        SEED_IDS.inboundCallAlpha,
        SEED_IDS.tenantAlpha,
        SEED_IDS.assignmentAlpha,
        SEED_IDS.tenantMemberAlpha,
        SEED_IDS.endpointAlpha,
        SEED_IDS.didAlpha,
        SEED_IDS.outboundCallBeta,
        SEED_IDS.tenantBeta,
        SEED_IDS.assignmentBeta,
        SEED_IDS.tenantMemberBeta,
        SEED_IDS.endpointBeta,
        SEED_IDS.didBeta,
    ]);
}
async function linkInboundCallToCallbackSession(client) {
    await client.query(`
    UPDATE call_sessions
    SET callback_session_id = $1,
        updated_at = NOW()
    WHERE id = $2
      AND tenant_id = $3
  `, [
        SEED_IDS.callbackActiveAlpha,
        SEED_IDS.inboundCallAlpha,
        SEED_IDS.tenantAlpha,
    ]);
}
async function upsertCallbackSessions(client) {
    await client.query(`
    INSERT INTO callback_sessions (
      id,
      tenant_id,
      tenant_did_assignment_id,
      display_did_id,
      remote_number,
      origin_call_session_id,
      target_endpoint_id,
      last_routed_endpoint_id,
      status,
      expires_at,
      matched_at,
      expired_at,
      decision_reason,
      routing_decision_key,
      last_inbound_at,
      created_at,
      updated_at
    )
    VALUES
      (
        $1,
        $2,
        $3,
        $4,
        '+8613811111111',
        $5,
        $6,
        $6,
        'active',
        NOW() + INTERVAL '2 hour',
        NOW() - INTERVAL '8 minute',
        NULL,
        NULL,
        'route:+617676021983:+8613811111111:provider-call-alpha-inbound',
        NOW() - INTERVAL '8 minute',
        NOW() - INTERVAL '100 minute',
        NOW()
      ),
      (
        $7,
        $8,
        $9,
        $10,
        '+8613822222222',
        $11,
        $12,
        NULL,
        'expired',
        NOW() - INTERVAL '20 minute',
        NULL,
        NOW() - INTERVAL '20 minute',
        'callback_expired',
        'route:+442080001111:+8613822222222:provider-call-beta-expired',
        NOW() - INTERVAL '19 minute',
        NOW() - INTERVAL '150 minute',
        NOW()
      )
    ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        tenant_did_assignment_id = EXCLUDED.tenant_did_assignment_id,
        display_did_id = EXCLUDED.display_did_id,
        remote_number = EXCLUDED.remote_number,
        origin_call_session_id = EXCLUDED.origin_call_session_id,
        target_endpoint_id = EXCLUDED.target_endpoint_id,
        last_routed_endpoint_id = EXCLUDED.last_routed_endpoint_id,
        status = EXCLUDED.status,
        expires_at = EXCLUDED.expires_at,
        matched_at = EXCLUDED.matched_at,
        expired_at = EXCLUDED.expired_at,
        decision_reason = EXCLUDED.decision_reason,
        routing_decision_key = EXCLUDED.routing_decision_key,
        last_inbound_at = EXCLUDED.last_inbound_at,
        updated_at = NOW()
  `, [
        SEED_IDS.callbackActiveAlpha,
        SEED_IDS.tenantAlpha,
        SEED_IDS.assignmentAlpha,
        SEED_IDS.didAlpha,
        SEED_IDS.outboundCallAlpha,
        SEED_IDS.endpointAlpha,
        SEED_IDS.callbackExpiredBeta,
        SEED_IDS.tenantBeta,
        SEED_IDS.assignmentBeta,
        SEED_IDS.didBeta,
        SEED_IDS.outboundCallBeta,
        SEED_IDS.endpointBeta,
    ]);
}
async function upsertCallEvents(client) {
    await client.query(`
    INSERT INTO call_events (
      id,
      tenant_id,
      call_session_id,
      callback_session_id,
      target_endpoint_id,
      event_name,
      event_direction,
      session_direction,
      provider_key,
      trunk_key,
      provider_event_id,
      provider_call_id,
      display_did,
      remote_number,
      trace_id,
      event_idempotency_key,
      routing_decision_key,
      provider_raw_status,
      provider_raw_reason,
      decision_reason,
      payload,
      occurred_at,
      received_at,
      created_at
    )
    VALUES
      (
        $1,
        $2,
        $3,
        NULL,
        NULL,
        'telephony.outbound.accepted',
        'outbound',
        'outbound',
        'provider-au-01',
        'au-outbound-01',
        'evt-alpha-outbound-accepted',
        'provider-call-alpha-outbound',
        '+617676021983',
        '+8613811111111',
        'trace-alpha-outbound',
        'provider-au-01:au-outbound-01:provider-call-alpha-outbound:telephony.outbound.accepted:evt-alpha-outbound-accepted',
        NULL,
        'accepted',
        NULL,
        NULL,
        '{"seed":"round5-r3","phase":"outbound"}'::jsonb,
        NOW() - INTERVAL '100 minute',
        NOW() - INTERVAL '100 minute',
        NOW()
      ),
      (
        $4,
        $5,
        $6,
        $7,
        $8,
        'telephony.inbound.received',
        'inbound',
        'inbound',
        'provider-au-01',
        'au-did-inbound-01',
        'evt-alpha-inbound-received',
        'provider-call-alpha-inbound',
        '+617676021983',
        '+8613811111111',
        'trace-alpha-inbound',
        'provider-au-01:au-did-inbound-01:provider-call-alpha-inbound:telephony.inbound.received',
        'route:+617676021983:+8613811111111:provider-call-alpha-inbound',
        'incoming',
        NULL,
        'matched_active_callback',
        '{"seed":"round5-r3","phase":"inbound"}'::jsonb,
        NOW() - INTERVAL '10 minute',
        NOW() - INTERVAL '10 minute',
        NOW()
      ),
      (
        $9,
        $10,
        $11,
        $12,
        $13,
        'telephony.callback.matched',
        'internal',
        'inbound',
        'provider-au-01',
        'au-did-inbound-01',
        'evt-alpha-callback-matched',
        'provider-call-alpha-inbound',
        '+617676021983',
        '+8613811111111',
        'trace-alpha-inbound',
        'provider-au-01:au-did-inbound-01:provider-call-alpha-inbound:telephony.callback.matched:evt-alpha-callback-matched',
        'route:+617676021983:+8613811111111:provider-call-alpha-inbound',
        'matched',
        NULL,
        'matched_active_callback',
        '{"seed":"round5-r3","phase":"callback"}'::jsonb,
        NOW() - INTERVAL '9 minute',
        NOW() - INTERVAL '9 minute',
        NOW()
      ),
      (
        $14,
        $15,
        $16,
        $17,
        $18,
        'telephony.callback.target.ringing',
        'internal',
        'inbound',
        'provider-au-01',
        'au-did-inbound-01',
        'evt-alpha-callback-target-ringing',
        'provider-call-alpha-inbound',
        '+617676021983',
        '+8613811111111',
        'trace-alpha-inbound',
        'provider-au-01:au-did-inbound-01:provider-call-alpha-inbound:telephony.callback.target.ringing:evt-alpha-callback-target-ringing',
        'route:+617676021983:+8613811111111:provider-call-alpha-inbound',
        'target_ringing',
        NULL,
        NULL,
        '{"seed":"round5-r3","phase":"callback-target"}'::jsonb,
        NOW() - INTERVAL '8 minute',
        NOW() - INTERVAL '8 minute',
        NOW()
      ),
      (
        $19,
        $20,
        NULL,
        NULL,
        NULL,
        'telephony.callback.rejected',
        'internal',
        'inbound',
        'provider-gb-01',
        'gb-did-inbound-01',
        'evt-beta-callback-rejected',
        'provider-call-beta-expired',
        '+442080001111',
        '+8613822222222',
        'trace-beta-inbound',
        'provider-gb-01:gb-did-inbound-01:provider-call-beta-expired:telephony.callback.rejected:evt-beta-callback-rejected',
        'route:+442080001111:+8613822222222:provider-call-beta-expired',
        'callback_expired',
        'window expired before inbound callback routing',
        'callback_expired',
        '{"seed":"round5-r3","phase":"rejected"}'::jsonb,
        NOW() - INTERVAL '18 minute',
        NOW() - INTERVAL '18 minute',
        NOW()
      )
    ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        call_session_id = EXCLUDED.call_session_id,
        callback_session_id = EXCLUDED.callback_session_id,
        target_endpoint_id = EXCLUDED.target_endpoint_id,
        event_name = EXCLUDED.event_name,
        event_direction = EXCLUDED.event_direction,
        session_direction = EXCLUDED.session_direction,
        provider_key = EXCLUDED.provider_key,
        trunk_key = EXCLUDED.trunk_key,
        provider_event_id = EXCLUDED.provider_event_id,
        provider_call_id = EXCLUDED.provider_call_id,
        display_did = EXCLUDED.display_did,
        remote_number = EXCLUDED.remote_number,
        trace_id = EXCLUDED.trace_id,
        event_idempotency_key = EXCLUDED.event_idempotency_key,
        routing_decision_key = EXCLUDED.routing_decision_key,
        provider_raw_status = EXCLUDED.provider_raw_status,
        provider_raw_reason = EXCLUDED.provider_raw_reason,
        decision_reason = EXCLUDED.decision_reason,
        payload = EXCLUDED.payload,
        occurred_at = EXCLUDED.occurred_at,
        received_at = EXCLUDED.received_at
  `, [
        SEED_IDS.eventOutboundAcceptedAlpha,
        SEED_IDS.tenantAlpha,
        SEED_IDS.outboundCallAlpha,
        SEED_IDS.eventInboundReceivedAlpha,
        SEED_IDS.tenantAlpha,
        SEED_IDS.inboundCallAlpha,
        SEED_IDS.callbackActiveAlpha,
        SEED_IDS.endpointAlpha,
        SEED_IDS.eventCallbackMatchedAlpha,
        SEED_IDS.tenantAlpha,
        SEED_IDS.inboundCallAlpha,
        SEED_IDS.callbackActiveAlpha,
        SEED_IDS.endpointAlpha,
        SEED_IDS.eventCallbackTargetRingingAlpha,
        SEED_IDS.tenantAlpha,
        SEED_IDS.inboundCallAlpha,
        SEED_IDS.callbackActiveAlpha,
        SEED_IDS.endpointAlpha,
        SEED_IDS.eventCallbackRejectedBeta,
        SEED_IDS.tenantBeta,
    ]);
}
async function main() {
    const client = createClient();
    const summary = {
        logins: [
            {
                username: SEED_LOGINS.sharedSwitcher.username,
                password: SEED_LOGINS.sharedSwitcher.password,
                defaultTenantId: SEED_LOGINS.sharedSwitcher.defaultTenantId,
                defaultTenantCode: SEED_LOGINS.sharedSwitcher.defaultTenantCode,
                selectableTenantIds: [...SEED_LOGINS.sharedSwitcher.selectableTenantIds],
                selectableTenantCodes: [...SEED_LOGINS.sharedSwitcher.selectableTenantCodes],
            },
            {
                username: SEED_LOGINS.betaOwner.username,
                password: SEED_LOGINS.betaOwner.password,
                defaultTenantId: SEED_LOGINS.betaOwner.defaultTenantId,
                defaultTenantCode: SEED_LOGINS.betaOwner.defaultTenantCode,
                selectableTenantIds: [...SEED_LOGINS.betaOwner.selectableTenantIds],
                selectableTenantCodes: [...SEED_LOGINS.betaOwner.selectableTenantCodes],
            },
        ],
        tenants: [
            { id: SEED_IDS.tenantAlpha, code: 'qa_alpha' },
            { id: SEED_IDS.tenantBeta, code: 'qa_beta' },
        ],
        dids: [
            { id: SEED_IDS.didAlpha, tenantCode: 'qa_alpha', phoneNumberE164: '+617676021983' },
            { id: SEED_IDS.didBeta, tenantCode: 'qa_beta', phoneNumberE164: '+442080001111' },
        ],
        endpoints: [
            {
                id: SEED_IDS.endpointAlpha,
                tenantCode: 'qa_alpha',
                memberId: SEED_IDS.tenantMemberAlpha,
            },
            {
                id: SEED_IDS.endpointBeta,
                tenantCode: 'qa_beta',
                memberId: SEED_IDS.tenantMemberBeta,
            },
        ],
        callbackSessions: {
            active: SEED_IDS.callbackActiveAlpha,
            expired: SEED_IDS.callbackExpiredBeta,
        },
    };
    await client.connect();
    try {
        await assertTablesExist(client);
        await client.query('BEGIN');
        await client.query(`SET TIME ZONE 'UTC'`);
        await upsertAccounts(client);
        await upsertTenants(client);
        await upsertTenantMembers(client);
        await upsertDidInventory(client);
        await upsertAssignments(client);
        await upsertEndpoints(client);
        await upsertCallSessions(client);
        await upsertCallbackSessions(client);
        await linkInboundCallToCallbackSession(client);
        await upsertCallEvents(client);
        await client.query('COMMIT');
        console.log(JSON.stringify({
            seed: 'round5-r3-qa',
            database: process.env.DB_NAME ?? 'privacy_dialer',
            summary,
        }, null, 2));
    }
    catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
    }
    finally {
        await client.end();
    }
}
main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});
