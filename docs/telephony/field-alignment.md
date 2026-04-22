# 字段对齐说明

> 目标：明确 telephony 逻辑键、当前持久化列、当前 API 字段之间的对应关系，帮助 A / B / D 线程在同一套 fresh runtime 语义下落实现、写测试和复测。

## 1. 对齐原则

- 本文件只反映 Round 5 第四轮已确认的 fresh runtime 现状，不再继续沿用第三轮已经被当前代码推翻的旧 gap。
- 本文件不新增主契约语义；只把已接受的逻辑键对齐到当前实体、seed、API 和 fixture。
- API 显式切租户只认 `X-Tenant-Id`；telephony webhook / fixture 继续使用 `tenant_ref`，不新增第二套 body 租户选择契约。

## 2. 核心身份键

| 逻辑键 | webhook / fixture 字段 | 当前持久化列 | 当前 API 字段 | 对齐说明 |
|--------|-------------------------|--------------|---------------|----------|
| `tenant_ref` | `tenant_ref` | `call_sessions.tenant_id`、`callback_sessions.tenant_id`、`call_events.tenant_id` | 请求头 `X-Tenant-Id`；响应 `tenantId` | API 请求体不单独接收 `tenant_ref`；未带 `X-Tenant-Id` 时按最早 active membership 解析租户 |
| `call_session_ref` | `call_session_ref` | `call_sessions.id`；`call_events.call_session_id`；`callback_sessions.origin_call_session_id` 用于指向外呼源会话 | `GET /calls/:id` 的 `:id`；响应 `taskId` | API 的 `taskId` 与 telephony 的 `call_session_ref` 视为同义 |
| `callback_session_ref` | `callback_session_ref` | `callback_sessions.id`；`call_sessions.callback_session_id`；`call_events.callback_session_id` | 当前 `GET /calls/:id` 未直接暴露 | 对接和 QA 回放统一以 `callback_sessions.id` 作为真实回拨窗口引用 |
| `target_endpoint_ref` | `target_endpoint_ref` | `callback_sessions.target_endpoint_id`、`callback_sessions.last_routed_endpoint_id`、`call_events.target_endpoint_id`；`call_sessions.from_endpoint_id` 仅表示外呼源终端 | 响应 `targetEndpoint.endpointId` | 回拨目标终端优先以 `callback_sessions` / `call_events` 为准，不能用 `from_endpoint_id` 替代 |

## 3. 方向与状态键

| 逻辑键 | webhook / fixture 字段 | 当前持久化列 | 当前 API 字段 | 对齐说明 |
|--------|-------------------------|--------------|---------------|----------|
| `session_direction` | `session_direction` | `call_sessions.direction`；`call_events.session_direction` | 当前 `GET /calls/:id` 未单独暴露 | 第三轮接受的公共逻辑键，当前 fresh runtime 已能在 `call_events` 稳定承载 |
| `event_direction` | `event_direction` | `call_events.event_direction` | 响应 `latestEvent.eventDirection` | 仅属于事件维度，不能替代 `session_direction` |
| `call_session.status` | 不在 webhook 中单独传输，由 `event_name` 推进 | `call_sessions.status` | 响应 `status` | API `status` 与持久化主状态保持同义 |
| `callback_session.status` | 不在 webhook 中单独传输，由 `decision_reason` / callback 事件推进 | `callback_sessions.status` | 响应 `callbackWindow.status` | `fulfilled` 仍只由 `telephony.callback.bridged` 推进 |

## 4. 号码与 trunk 键

| 逻辑键 | webhook / fixture 字段 | 当前持久化列 | 当前 API 字段 | 对齐说明 |
|--------|-------------------------|--------------|---------------|----------|
| `display_did` | `display_did` | `call_sessions.display_did_id`、`callback_sessions.display_did_id` 保存 DID 主键；`call_events.display_did` 保存 E.164 | 响应 `displayDid.e164` / `displayDid.displayLabel` | 事件与 fixture 始终传 E.164；持久化主表保存 DID 主键 |
| `remote_number` | `remote_number` | `call_sessions.remote_number`、`callback_sessions.remote_number`、`call_events.remote_number` | 请求 `destinationNumber`；响应 `destinationNumber` | API 的 `destinationNumber` 是 telephony `remote_number` 在出呼场景的对应名 |
| `trunk_key` | `trunk_key` | `call_sessions.selected_trunk_key`；`call_events.trunk_key` | 当前无独立 API 字段 | 出呼选路与 webhook 回流统一沿用同一个 trunk 语义 |
| `provider_key` | `provider_key` | `call_events.provider_key` | 当前无独立 API 字段 | 主要用于 webhook 验签后的事件归属与排障 |
| `provider_call_id` | `provider_call_id` | `call_sessions.provider_call_id`；`call_events.provider_call_id` | 当前无独立 API 字段 | 对 fresh runtime 回放，出呼完成与录音事件必须复用同一 `provider_call_id` |

## 5. 事件、trace 与决策键

| 逻辑键 | webhook / fixture 字段 | 当前持久化列 | 当前 API 字段 | 对齐说明 |
|--------|-------------------------|--------------|---------------|----------|
| `event_name` | `event_name` | `call_events.event_name` | 响应 `latestEvent.eventName` | 第四轮不新增任何新事件名 |
| `provider_event_id` | `provider_event_id` | `call_events.provider_event_id` | 当前无独立 API 字段 | 事件级幂等优先使用此值 |
| `trace_id` | `trace_id` | `call_events.trace_id` | 当前无独立 API 字段 | 供 webhook 回放和 QA 串联同一事件链，不要求 `GET /calls/:id` 直接回出 |
| `decision_reason` | `decision_reason` | `callback_sessions.decision_reason`、`call_events.decision_reason` | 入呼 webhook 响应 `decision_reason`；`GET /calls/:id` 当前无独立字段 | 命中 / 未命中 / 过期 / 失败回退都继续复用同一决策字段 |
| `routing_decision_key` | 不直接进入 webhook payload；由消费侧生成 | `callback_sessions.routing_decision_key`、`call_events.routing_decision_key` | 当前无独立 API 字段 | 用于同一次入呼重复通知复用同一决策上下文 |
| `event_idempotency_key` | 不直接进入 webhook payload；由消费侧生成 | `call_events.event_idempotency_key` | 当前无独立 API 字段 | 消费侧去重键，不要求外部 producer 直传 |

## 6. 时间与录音键

| 逻辑键 | webhook / fixture 字段 | 当前持久化列 | 当前 API 字段 | 对齐说明 |
|--------|-------------------------|--------------|---------------|----------|
| `occurred_at` | `occurred_at` | `call_events.occurred_at` | 响应 `latestEvent.occurredAt` | 事件事实时间，不等于落库时间 |
| `started_at` / `answered_at` / `ended_at` | `answered_at`、`ended_at` | `call_sessions.started_at`、`answered_at`、`ended_at` | 当前 `GET /calls/:id` 未单独暴露 | 状态推进依赖主表时间列，但当前最小 API 只回最新事件时间 |
| `recording_id` | `recording_id` | 当前无独立列；沿用 `call_events.payload.recording_id` | 当前无独立 API 字段 | 第四轮仍不决定最终 recording 表结构 |
| `recording_url` | `recording_url` | 当前无独立列；沿用 `call_events.payload.recording_url` | 当前无独立 API 字段 | 录音下载地址继续按事件事实承载 |
| `duration_sec` / `checksum_sha256` | `duration_sec`、`checksum_sha256` | 当前无独立列；沿用 `call_events.payload` | 当前无独立 API 字段 | 录音时长和校验值继续视为事件载荷事实，不单独建 API 字段 |

## 7. 当前 fresh runtime 仍真实存在的字段差异

- `GET /calls/:id` 当前只回 `taskId`、`tenantId`、`status`、`displayDid`、`targetEndpoint`、`callbackWindow`、`latestEvent` 等最小视图；不会直接回出 `callback_session_ref`、`provider_call_id`、`provider_event_id`、`trace_id`、`routing_decision_key`、`event_idempotency_key`。
- 录音相关字段目前仍以 webhook payload / `call_events.payload` 承载，不存在独立持久化列或最小 API 字段；这属于第四轮仍成立的真实差异，不代表可以扩主契约。
- API 显式切租户继续只认 `X-Tenant-Id`；若后续线程需要在测试或 QA 中切租户，也必须沿用这一个入口，而不是把 `tenant_ref` 搬进 `POST /calls/outbound` 请求体。
