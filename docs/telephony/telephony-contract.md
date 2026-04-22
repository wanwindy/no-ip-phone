# Telephony 接入契约

> Round 5 冻结目标：让 trunk / SIP Router / Media Control / Orchestrator 在不依赖数据库实现细节的前提下，使用同一套事件名、字段语义、方向和幂等规则。

## 1. 范围

本文件冻结以下接口面：

- trunk 逻辑契约
- `POST /webhooks/inbound-call`
- `POST /webhooks/call-status`
- `POST /webhooks/recording-ready`

本文件不冻结：

- SIP 账号、密码、域名等部署细节
- PostgreSQL 列类型
- 内部 service / entity 的代码组织

## 2. 共同字段与归一化规则

### 2.1 共同字段

所有 telephony webhook 事件都使用同一组逻辑相关键：

| 字段 | 必填 | 说明 |
|------|------|------|
| `event_name` | 是 | 冻结后的事件名，见 `state-dictionaries.md` |
| `event_direction` | 是 | 取值固定为 `inbound` / `outbound` / `internal` |
| `provider_key` | 是 | trunk provider 的稳定标识 |
| `trunk_key` | 是 | 平台内 trunk 的稳定标识 |
| `provider_event_id` | 是 | 上游事件唯一标识；若上游没有，adapter 必须生成稳定值 |
| `provider_call_id` | 是 | 上游通话标识，同一次外部通话保持稳定 |
| `occurred_at` | 是 | 事件发生时间，UTC ISO-8601 |
| `session_direction` | 条件必填 | `call_session` 已存在时必填，固定为 `inbound` / `outbound`，用于区分会话方向与 `event_direction` |
| `trace_id` | 否 | 跨系统串联用链路标识 |
| `tenant_ref` | 条件必填 | 出呼状态、录音事件必须有；入呼首次进入时可为空，由平台用 DID 反查 |
| `call_session_ref` | 条件必填 | 已创建平台会话时必填；首次入呼请求可为空，由编排层创建后回填 |
| `callback_session_ref` | 否 | 同号回拨命中后返回或回填 |
| `target_endpoint_ref` | 否 | 命中同号回拨后的目标终端稳定标识 |
| `display_did` | 是 | 外显/被拨 DID，固定使用 E.164 |
| `remote_number` | 是 | PSTN 对端号码，固定使用 E.164 |
| `provider_raw_status` | 否 | 上游原始状态文案，保留排障用 |
| `provider_raw_reason` | 否 | 上游原始失败原因文案 |

### 2.2 号码与时间

- `display_did`、`remote_number` 一律按 E.164 传输和比较。
- `0061...`、空格、短横线、括号等仅属于展示层，不进入匹配键。
- 所有时间统一为 UTC ISO-8601；若上游只给 epoch，由 adapter 负责归一化。
- `session_direction` 表示 `call_session` 的业务方向；`event_direction` 表示当前事件的来源语义，两者不能混用。

### 2.3 幂等键总规则

- 事件消费侧必须以“事件级幂等”处理重复通知。
- 优先使用 `provider_event_id` 作为外部唯一键。
- 若上游没有真正的事件 ID，则 adapter 必须生成：

```text
{provider_key}:{trunk_key}:{provider_call_id}:{event_name}:{provider_seq_or_occurred_at}
```

- 相同幂等键的重复请求必须返回成功语义，不允许因为重复而返回 5xx。

### 2.4 状态推进规则

- webhook 只能推进同一 `call_session` 的状态，不能把终态改回非终态。
- 终态固定为：`completed` / `failed` / `canceled` / `expired`。
- 终态之后到达的重复或乱序事件，记录为 `call_event` 即可，不回滚主状态。

### 2.5 Webhook 鉴权头

三个 webhook 入口统一要求以下 HTTP 头：

| Header | 必填 | 说明 |
|--------|------|------|
| `X-Telephony-Key-Id` | 是 | webhook 凭证标识，用于找到对应共享密钥 |
| `X-Telephony-Timestamp` | 是 | UTC epoch seconds |
| `X-Telephony-Nonce` | 是 | 单次请求唯一随机串 |
| `X-Telephony-Signature-Version` | 是 | Round 5 固定为 `v1` |
| `X-Telephony-Signature` | 是 | 对规范化签名串做 HMAC-SHA256 后的 Base64URL 值 |

补充要求：

- `Content-Type` 固定为 `application/json`
- 接收侧必须按原始请求体字节参与验签，不能先重排 JSON 再验签
- `X-Telephony-Key-Id` 与 payload 中的 `trunk_key` 必须属于同一 trunk 凭证域

### 2.6 签名语义（`v1`）

`v1` 的签名算法冻结为：

- 哈希算法：`SHA-256`
- MAC 算法：`HMAC-SHA256`
- 编码：`Base64URL`

规范化签名串固定为：

```text
{HTTP_METHOD}
{REQUEST_PATH}
{X-Telephony-Timestamp}
{X-Telephony-Nonce}
{LOWERCASE_HEX_SHA256_OF_RAW_BODY}
```

示例：

```text
POST
/webhooks/inbound-call
1776842400
nonce_abc123
4f3c2b1a...
```

签名计算规则：

```text
signature = Base64URL(HMAC_SHA256(shared_secret, canonical_string))
```

### 2.7 重放防护与时钟偏移

- `X-Telephony-Timestamp` 与服务端当前 UTC 时间偏差超过 `300 秒` 时，视为鉴权失败
- 同一 `X-Telephony-Key-Id + X-Telephony-Nonce` 在 `10 分钟` 内不得重复使用
- 若 producer 因网络重试复发同一业务事件，必须复用相同幂等键，但应生成新的 `nonce` 并重新签名

### 2.8 失败响应体

所有 webhook 失败响应体冻结为：

```json
{
  "accepted": false,
  "error_code": "signature_invalid",
  "retryable": false
}
```

字段说明：

- `accepted`：固定为 `false`
- `error_code`：见第 7 节固定字典
- `retryable`：表示 producer 是否可以在修复前直接重试同一请求

## 3. Trunk 逻辑契约

### 3.1 trunk 最小逻辑对象

trunk 在本轮只冻结逻辑字段，不冻结底层 SIP 配置实现：

| 字段 | 必填 | 说明 |
|------|------|------|
| `trunk_key` | 是 | 平台唯一 trunk 标识 |
| `provider_key` | 是 | provider 唯一标识 |
| `direction` | 是 | `outbound` / `inbound` / `bidirectional` |
| `capabilities` | 是 | 允许值：`outbound_voice`、`inbound_did`、`status_callback`、`recording_callback` |
| `did_match_mode` | 是 | Round 5 固定为 `exact_e164` |
| `priority` | 是 | 同 failover 组内优先级，数值语义由实现层决定 |
| `failover_group` | 否 | 同组 trunk 参与出呼容灾 |
| `enabled` | 是 | 是否可用 |
| `inbound_webhook_path` | 条件必填 | 有 `inbound_did` 能力时必填，固定为 `/webhooks/inbound-call` |
| `status_webhook_path` | 条件必填 | 有 `status_callback` 能力时必填，固定为 `/webhooks/call-status` |
| `recording_webhook_path` | 条件必填 | 有 `recording_callback` 能力时必填，固定为 `/webhooks/recording-ready` |

### 3.2 跨系统相关键

以下逻辑字段必须能在 Orchestrator、Kamailio/OpenSIPS、FreeSWITCH、trunk adapter 之间传递；具体映射到 SIP header、channel variable 还是内部字段，由实现线程决定：

- `call_session_ref`
- `tenant_ref`
- `trunk_key`
- `provider_key`
- `session_direction`
- `display_did`
- `remote_number`
- `callback_session_ref`
- `target_endpoint_ref`
- `trace_id`

冻结要求：

- 出呼发起时必须把这些键向下游透传，避免后续状态回流只能靠模糊匹配。
- 入呼命中回拨后，`callback_session_ref` 必须回灌到后续桥接链路。

## 4. Inbound Webhook 契约

### 4.1 接口

- 路径：`POST /webhooks/inbound-call`
- 生产者：SIP Router、trunk inbound adapter
- 消费者：Call Orchestrator
- 目的：把“某个 DID 收到来电”的事实送入平台，并同步返回路由决策

### 4.2 请求体

`event_name` 冻结为 `telephony.inbound.received`。

```json
{
  "event_name": "telephony.inbound.received",
  "event_direction": "inbound",
  "provider_key": "provider-au-01",
  "trunk_key": "au-did-inbound-01",
  "provider_event_id": "evt_12345",
  "provider_call_id": "call_67890",
  "occurred_at": "2026-04-22T10:00:00Z",
  "trace_id": "trace_abc",
  "display_did": "+617676021983",
  "remote_number": "+8613812345678",
  "provider_raw_status": "incoming",
  "provider_raw_reason": null
}
```

### 4.3 入呼幂等键

入呼事件幂等键固定为：

```text
{provider_key}:{trunk_key}:{provider_call_id}:telephony.inbound.received
```

若 provider 会对同一次来电重推相同通知，平台必须返回与首次一致的决策语义。

### 4.4 成功响应

编排层必须同步返回一个明确动作，固定为以下二选一：

#### 4.4.1 命中同号回拨

```json
{
  "accepted": true,
  "action": "route_callback",
  "session_direction": "inbound",
  "tenant_ref": "tenant_xxx",
  "call_session_ref": "call_xxx",
  "callback_session_ref": "callback_xxx",
  "target_endpoint_ref": "endpoint_xxx",
  "decision_reason": "matched_active_callback",
  "expires_at": "2026-04-22T12:00:00Z"
}
```

#### 4.4.2 不命中或不可路由

```json
{
  "accepted": true,
  "session_direction": "inbound",
  "action": "reject",
  "decision_reason": "callback_not_found"
}
```

`decision_reason` 冻结允许值：

- `matched_active_callback`
- `callback_not_found`
- `callback_expired`
- `tenant_blocked`
- `no_available_endpoint`
- `invalid_display_did`
- `invalid_remote_number`

### 4.5 命中回拨后的生命周期起点

当 `action=route_callback` 时，Orchestrator 必须在同一决策上下文内完成以下逻辑动作：

1. 写入或确认 `telephony.inbound.received`
2. 创建或确认该次入呼的 `call_session`
3. 固定 `call_session.session_direction=inbound`
4. 写入 `telephony.callback.matched`
5. 将 `call_session.status` 推进到 `dispatching`
6. 将 `callback_session.status` 推进到 `routing`

冻结要求：

- `telephony.callback.matched` 是命中成功后的唯一生命周期起点事件
- `telephony.callback.matched` 由 Orchestrator 生成，不由 trunk / FreeSWITCH 直接上报
- 命中成功但尚未振铃目标终端时，`call_session.status` 必须停留在 `dispatching`

### 4.6 重复请求响应

对相同幂等键的重复请求：

- 若首次已决策，返回相同 `action`、`call_session_ref`、`callback_session_ref`
- 响应仍返回 2xx
- 不重复创建新的会话主记录

## 5. Call Status 契约

### 5.1 接口

- 路径：`POST /webhooks/call-status`
- 生产者：FreeSWITCH、trunk status adapter、callback media adapter
- 消费者：Call Orchestrator
- 目的：推进 `call_session` 的归一化状态，覆盖出呼和“已命中的入呼回拨”两类生命周期

### 5.2 允许事件名

`event_name` 仅允许以下值：

出呼事件：

- `telephony.outbound.accepted`
- `telephony.outbound.ringing`
- `telephony.outbound.answered`
- `telephony.outbound.bridged`
- `telephony.outbound.completed`
- `telephony.outbound.failed`
- `telephony.outbound.canceled`

入呼命中回拨后的生命周期事件：

- `telephony.callback.target.ringing`
- `telephony.callback.target.answered`
- `telephony.callback.bridged`
- `telephony.callback.completed`
- `telephony.callback.failed`
- `telephony.callback.canceled`

### 5.3 请求体

```json
{
  "event_name": "telephony.outbound.ringing",
  "event_direction": "outbound",
  "provider_key": "provider-au-01",
  "trunk_key": "au-outbound-01",
  "provider_event_id": "evt_20001",
  "provider_call_id": "call_67890",
  "occurred_at": "2026-04-22T10:01:00Z",
  "session_direction": "outbound",
  "trace_id": "trace_abc",
  "tenant_ref": "tenant_xxx",
  "call_session_ref": "call_xxx",
  "display_did": "+617676021983",
  "remote_number": "+8613812345678",
  "provider_raw_status": "ringing",
  "provider_raw_reason": null
}
```

`telephony.outbound.completed` 和 `telephony.outbound.failed` 额外允许：

- `hangup_cause`
- `answered_at`
- `ended_at`
- `billable_duration_sec`

入呼命中回拨事件示例：

```json
{
  "event_name": "telephony.callback.target.ringing",
  "event_direction": "internal",
  "provider_key": "provider-au-01",
  "trunk_key": "au-did-inbound-01",
  "provider_event_id": "evt_21001",
  "provider_call_id": "call_67890",
  "occurred_at": "2026-04-22T10:02:00Z",
  "session_direction": "inbound",
  "trace_id": "trace_abc",
  "tenant_ref": "tenant_xxx",
  "call_session_ref": "call_xxx",
  "callback_session_ref": "callback_xxx",
  "target_endpoint_ref": "endpoint_xxx",
  "display_did": "+617676021983",
  "remote_number": "+8613812345678",
  "provider_raw_status": "target_ringing",
  "provider_raw_reason": null
}
```

补充要求：

- `session_direction=inbound` 时，`call_session_ref` 必须已存在
- `telephony.callback.*` 事件必须带上 `callback_session_ref`
- `telephony.callback.target.*` 事件必须带上 `target_endpoint_ref`

### 5.4 状态事件幂等键

`/webhooks/call-status` 的状态事件幂等键固定为：

```text
{provider_key}:{trunk_key}:{provider_call_id}:{event_name}:{provider_event_id}
```

若 provider_event_id 由 adapter 合成，则该稳定值同样进入幂等键。

### 5.5 成功响应

```json
{
  "accepted": true,
  "call_session_ref": "call_xxx",
  "state_applied": true
}
```

重复或乱序事件也返回 2xx，但：

- `state_applied=false` 表示已记录事件但未推进主状态
- 不允许把终态改回非终态

### 5.6 入呼命中回拨后的生命周期口径

`call-status` 对“已命中的入呼回拨”按以下顺序推进：

1. `telephony.callback.target.ringing`：目标终端开始振铃，`call_session.status=ringing`
2. `telephony.callback.target.answered`：目标终端已接听，`call_session.status=answered`
3. `telephony.callback.bridged`：入呼 PSTN leg 与目标终端已桥接，`call_session.status=bridged`
4. `telephony.callback.completed`：通话正常结束，`call_session.status=completed`
5. `telephony.callback.failed`：命中后路由或桥接失败，`call_session.status=failed`
6. `telephony.callback.canceled`：命中后被调用方、主叫方或系统取消，`call_session.status=canceled`

补充冻结：

- `telephony.callback.bridged` 是 `callback_session` 进入 `fulfilled` 的唯一成功事件
- `telephony.callback.target.answered` 不等于已桥接，不能直接把 `call_session` 推进到 `bridged`
- `telephony.callback.failed` 只用于“命中回拨后仍未成功桥接”的失败，不用于未命中场景

## 6. Recording Event 契约

### 6.1 接口

- 路径：`POST /webhooks/recording-ready`
- 生产者：FreeSWITCH、录音处理器、provider recording adapter
- 消费者：Call Orchestrator
- 目的：把录音文件可用事实回流平台

### 6.2 允许事件名

- `telephony.recording.ready`
- `telephony.recording.failed`

### 6.3 请求体

```json
{
  "event_name": "telephony.recording.ready",
  "event_direction": "internal",
  "provider_key": "provider-au-01",
  "trunk_key": "au-outbound-01",
  "provider_event_id": "evt_rec_30001",
  "provider_call_id": "call_67890",
  "occurred_at": "2026-04-22T10:30:00Z",
  "session_direction": "outbound",
  "trace_id": "trace_abc",
  "tenant_ref": "tenant_xxx",
  "call_session_ref": "call_xxx",
  "display_did": "+617676021983",
  "remote_number": "+8613812345678",
  "recording_id": "rec_123",
  "recording_scope": "mixed",
  "recording_url": "https://example.invalid/recordings/rec_123.wav",
  "duration_sec": 180,
  "checksum_sha256": "abc123"
}
```

`recording_scope` 冻结允许值：

- `mixed`
- `agent_leg`
- `remote_leg`

### 6.4 录音事件幂等键

录音事件幂等键固定为：

```text
{provider_key}:{trunk_key}:{provider_call_id}:{event_name}:{recording_id}
```

若 `recording_id` 缺失，则 adapter 必须生成稳定录音标识后再入站。

### 6.5 成功响应

```json
{
  "accepted": true,
  "call_session_ref": "call_xxx",
  "recording_registered": true
}
```

## 7. 错误语义

固定错误场景如下：

| HTTP | 场景 | 说明 |
|------|------|------|
| `400` | `invalid_payload` | 缺少必填字段或格式不合法 |
| `401` | `auth_missing_or_unknown_key` | 缺少鉴权头或 `X-Telephony-Key-Id` 不存在 |
| `403` | `signature_invalid` | 签名不通过 |
| `403` | `timestamp_skew` | 时间偏差超过 300 秒 |
| `403` | `nonce_replayed` | `X-Telephony-Nonce` 在重放窗口内重复使用 |
| `404` | `unknown_trunk` | `trunk_key` 不存在或未启用 |
| `409` | `event_conflict` | 同一幂等键对应的载荷语义冲突 |
| `422` | `unsupported_signature_version` | `X-Telephony-Signature-Version` 不是 `v1` |

说明：

- “重复但内容一致”不属于 `409`，应按成功处理。
- `409` 只用于同一幂等键下出现互斥事实，例如同一 `provider_event_id` 对应两个不同 `provider_call_id`。
- `timestamp_skew`、`nonce_replayed`、`signature_invalid` 均返回 `retryable=false`。
- 仅当 producer 修复本地时间、nonce 或密钥后，才允许重新发起新的签名请求。
