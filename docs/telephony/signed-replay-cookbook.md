# Signed Replay Cookbook（Round 5 第四轮）

> 目标：把第三轮 webhook fixture、验签向量和第四轮 QA seed 身份 / 别名串成一套可直接复放的最小手册，供 B / D 在线下 fresh runtime 使用。

## 1. 使用前提

- 只认单一 `fresh build + fresh runtime + migrated / seeded QA DB`。
- QA 初始化顺序以 `docs/qa/32-round5-r4-seed-login-reference.md` 为准：
  1. 在 `server/` 执行 `npm run migration:run`
  2. 在 `server/` 执行 `npm run seed:qa:r5-r3`
  3. 启动 fresh runtime
  4. 使用标准 `POST /api/v1/auth/login` 登录
- 业务 API 认证使用 `Authorization: Bearer <access_token>`。
- 显式切租户只使用 `X-Tenant-Id`。
- webhook 重放使用第二轮已冻结的 5 个鉴权头：
  - `X-Telephony-Key-Id`
  - `X-Telephony-Timestamp`
  - `X-Telephony-Nonce`
  - `X-Telephony-Signature-Version`
  - `X-Telephony-Signature`

## 2. 登录身份与样本别名

### 2.1 可登录 QA 身份

| 别名 | username | password | 默认租户 | 可选租户 | 说明 |
|------|----------|----------|----------|----------|------|
| `shared_switcher` | `seed_alpha_owner` | `Round5!AlphaBeta1` | `qa_alpha` / `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` | `qa_beta` / `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb` | 同一账号拥有双租户 active membership；不带 `X-Tenant-Id` 时默认落到 `qa_alpha` |
| `beta_owner` | `seed_beta_owner` | `Round5!BetaOwner1` | `qa_beta` / `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb` | 无 | 用于 beta 单租户场景 |

### 2.2 seed 样本别名

| 别名 | 真实值 | 用途 |
|------|--------|------|
| `tenant_alpha` | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` | alpha 租户主键 |
| `tenant_beta` | `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb` | beta 租户主键 |
| `membership_alpha` | `aaaabbbb-1111-4111-8111-111111111111` | alpha member |
| `membership_beta_shared` | `bbbbaaaa-3333-4333-8333-333333333333` | `shared_switcher` 在 beta 的 shared membership |
| `membership_beta_owner` | `bbbbaaaa-2222-4222-8222-222222222222` | beta 单租户 owner membership |
| `did_alpha_e164` | `+617676021983` | alpha DID 命中样本 |
| `did_beta_e164` | `+442080001111` | beta DID 过期 / 未命中样本 |
| `endpoint_alpha` | `eeee1111-1111-4111-8111-111111111111` | alpha 回拨目标终端 |
| `endpoint_beta` | `eeee2222-2222-4222-8222-222222222222` | beta SIP 终端 |
| `callback_active_alpha` | `fafa1111-1111-4111-8111-111111111111` | alpha active callback |
| `callback_expired_beta` | `fafa2222-2222-4222-8222-222222222222` | beta expired callback |
| `seed_outbound_call_alpha` | `cccc1111-1111-4111-8111-111111111111` | alpha 既有出呼样本 |
| `seed_inbound_call_alpha` | `cccc1111-2222-4111-8222-111111111111` | alpha 既有入呼样本 |

### 2.3 fixture 占位值替换规则

第三轮 fixture 里的以下值仍是“稳定占位值”，真实回放前必须替换：

| fixture 占位值 | 回放前替换成什么 |
|----------------|------------------|
| `tenant_alpha` | `tenant_alpha` 的真实 UUID |
| `11111111-1111-4111-8111-111111111111` | 本次命中返回的真实 `call_session_ref`，或明确指定的现有 seed `call_session` |
| `22222222-2222-4222-8222-222222222222` | 本次命中返回的真实 `callback_session_ref`，或 `callback_active_alpha` |
| `33333333-3333-4333-8333-333333333333` | 本次命中的真实 `target_endpoint_ref`，通常为 `endpoint_alpha` |
| `44444444-4444-4444-8444-444444444444` | 新建外呼后返回的真实 `taskId`，或明确指定的现有出呼 seed |

不要把这些占位 UUID 原样发给 fresh runtime。

## 3. 统一验签做法

### 3.1 先选 body，再签名

- `docs/telephony/fixtures/webhook/*.json` 是语义样本；回放前先把其中占位值替换成当前 seed / runtime 实值。
- 验签时必须使用“单行压缩 JSON + 原始字节”参与哈希；不要直接拿格式化文件字节去计算签名。
- `/webhooks/inbound-call`、`/webhooks/call-status`、`/webhooks/recording-ready` 的固定测试向量分别见 `webhook-signature-test-vectors.md`。

### 3.2 PowerShell 最小签名脚本

```powershell
$bodyObject = Get-Content -Raw '.\\docs\\telephony\\fixtures\\webhook\\telephony.inbound.received.json' | ConvertFrom-Json
$bodyObject.display_did = '+617676021983'
$bodyObject.remote_number = '+8613811111111'
$body = $bodyObject | ConvertTo-Json -Compress -Depth 10

$path = '/webhooks/inbound-call'
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
$nonce = 'qa-r5-r4-inbound-0001'
$secret = 'replace-with-runtime-secret'

$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
$bodyShaBytes = [System.Security.Cryptography.SHA256]::HashData($bodyBytes)
$bodyShaHex = ([System.BitConverter]::ToString($bodyShaBytes)).Replace('-', '').ToLower()
$canonical = "POST`n$path`n$timestamp`n$nonce`n$bodyShaHex"

$hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($secret))
$signatureBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($canonical))
$signature = [Convert]::ToBase64String($signatureBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')

$headers = @{
  'Content-Type' = 'application/json'
  'X-Telephony-Key-Id' = 'replace-with-runtime-key-id'
  'X-Telephony-Timestamp' = $timestamp
  'X-Telephony-Nonce' = $nonce
  'X-Telephony-Signature-Version' = 'v1'
  'X-Telephony-Signature' = $signature
}
```

### 3.3 向量与运行时配置的关系

- 如果 B 线程把测试环境 key-id / secret 配成与 `webhook-signature-test-vectors.md` 完全一致，可直接拿向量复算并比对。
- 如果 fresh runtime 的 key-id / secret 不同，允许继续复用同一 fixture body，但必须用运行时真实 secret 重新签名。
- 同一业务事件因网络重试重放时，复用同一业务幂等语义，但要换新的 `X-Telephony-Nonce` 和新签名。

## 4. 推荐回放顺序

1. 登录 `shared_switcher`，确认默认落到 `tenant_alpha`。
2. 回放 `telephony.inbound.received` 命中 active callback。
3. 继续回放 `telephony.callback.target.ringing` 和 `telephony.callback.bridged`。
4. 再分别回放“beta 过期”“错 DID / 错号码”两个 reject 场景。
5. 通过 `POST /api/v1/calls/outbound` 新建一条 fresh outbound 任务。
6. 回放 `telephony.outbound.completed`。
7. 回放 `telephony.recording.ready`。

## 5. 场景 cookbook

### 5.1 inbound callback 命中

- fixture：`fixtures/webhook/telephony.inbound.received.json`
- 替换建议：
  - `display_did = +617676021983`
  - `remote_number = +8613811111111`
  - `provider_call_id = provider-call-alpha-inbound-r4-hit-001`
  - `provider_event_id = evt-alpha-inbound-r4-hit-001`
  - `trace_id = trace-alpha-inbound-r4-hit-001`
- 路径：`POST /webhooks/inbound-call`
- 期望结果：
  - HTTP 成功
  - 响应 `action=route_callback`
  - 响应 `decision_reason=matched_active_callback`
  - 响应体返回真实 `tenant_ref`、`call_session_ref`、`callback_session_ref`、`target_endpoint_ref`

### 5.2 命中后的 callback 生命周期推进

- fixture 1：`fixtures/webhook/telephony.callback.target.ringing.json`
- fixture 2：`fixtures/webhook/telephony.callback.bridged.json`
- 替换建议：
  - `tenant_ref = aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
  - `call_session_ref = 上一步返回的真实 call_session_ref`
  - `callback_session_ref = 上一步返回的真实 callback_session_ref`
  - `target_endpoint_ref = 上一步返回的真实 target_endpoint_ref`
  - `provider_call_id` 在这条 callback 媒体链路内保持一致
  - `trace_id` 在这条 callback 媒体链路内保持一致
- 路径：`POST /webhooks/call-status`
- 期望结果：
  - `telephony.callback.target.ringing` 后，`GET /calls/:id` 的 `latestEvent.eventName` 变为 `telephony.callback.target.ringing`
  - `telephony.callback.bridged` 后，`callback_session.status=fulfilled`
  - 对应 `call_session.status` 进入 `bridged` 或后续完成态，由当前 fresh runtime 状态推进为准

### 5.3 inbound callback 过期

- fixture：`fixtures/webhook/telephony.inbound.received.json`
- 替换建议：
  - `display_did = +442080001111`
  - `remote_number = +8613822222222`
  - `provider_call_id = provider-call-beta-inbound-r4-expired-001`
  - `provider_event_id = evt-beta-inbound-r4-expired-001`
- 路径：`POST /webhooks/inbound-call`
- 期望结果：
  - HTTP 成功
  - 响应 `action=reject`
  - 响应 `decision_reason=callback_expired`

### 5.4 错 DID / 错号码未命中

- fixture：`fixtures/webhook/telephony.inbound.received.json`
- 推荐两种替换法：
  - alpha DID + 一个未出现在 active callback 内的号码，例如 `+8613999999999`
  - beta DID + alpha 号码 `+8613811111111`
- 路径：`POST /webhooks/inbound-call`
- 期望结果：
  - HTTP 成功
  - 响应 `action=reject`
  - 响应 `decision_reason=callback_not_found`

### 5.5 outbound completed 回放

- 先用 `shared_switcher` 登录，然后调用 `POST /api/v1/calls/outbound`

```json
{
  "destinationNumber": "+8613812345678",
  "clientRequestId": "qa-r5-r4-outbound-001"
}
```

- 从响应中记录：
  - `taskId`
  - `tenantId`
  - `displayDid.e164`
  - `targetEndpoint.endpointId`
- fixture：`fixtures/webhook/telephony.outbound.completed.json`
- 替换建议：
  - `tenant_ref = 返回的 tenantId`
  - `call_session_ref = 返回的 taskId`
  - `display_did = 返回的 displayDid.e164`
  - `remote_number = +8613812345678`
  - `provider_call_id = provider-call-alpha-outbound-r4-001`
  - `provider_event_id = evt-alpha-outbound-r4-completed-001`
  - `trace_id = trace-alpha-outbound-r4-001`
- 路径：`POST /webhooks/call-status`
- 期望结果：
  - `GET /calls/:id` 返回 `status=completed`
  - `latestEvent.eventName = telephony.outbound.completed`

### 5.6 recording ready 回放

- fixture：`fixtures/webhook/telephony.recording.ready.json`
- 替换建议：
  - `tenant_ref`、`call_session_ref`、`display_did`、`remote_number` 与 5.5 保持一致
  - `provider_call_id` 与 5.5 保持一致
  - `trace_id` 与 5.5 保持一致
  - `recording_id = rec-alpha-r4-001`
  - `recording_url = https://fixtures.invalid/recordings/rec-alpha-r4-001.wav`
- 路径：`POST /webhooks/recording-ready`
- 期望结果：
  - webhook 成功接收
  - 新写入事件名为 `telephony.recording.ready`
  - 录音事实仍以事件载荷承载，不要求本轮额外暴露独立 API 字段

### 5.7 accepted fixture 的使用边界

- `fixtures/webhook/telephony.outbound.accepted.json` 仍可用于消费者单测、幂等测试或 fixture 完整性校验。
- 但在 fresh runtime 手工回放里，推荐先调用 `POST /api/v1/calls/outbound`，因为当前 `CallsService` 已经会落一条最小 `telephony.outbound.accepted` 事件。

## 6. 回放后的最小核对项

- `GET /calls/:id` 能读到 webhook 推进后的最新 `status` 与 `latestEvent`。
- 查库时，`call_events.session_direction`、`call_events.target_endpoint_id`、`call_events.trace_id` 对应事件应已有值，不再沿用第三轮旧缺陷表述。
- `callback_expired`、`callback_not_found`、`matched_active_callback` 三类决策原因必须与 fixture 场景一致。
- fixture 回放通过只代表当前 webhook 消费面闭环成立，不等于真实 trunk 全链路商用稳定。
