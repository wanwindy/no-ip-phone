# Webhook 验签测试向量

> 本文件只提供可执行测试向量，不扩签名语义。签名算法、头字段与失败边界仍以 `telephony-contract.md` 为准。

## 1. 统一规则

- HTTP Method：`POST`
- 签名版本：`v1`
- 哈希算法：`SHA-256`
- MAC 算法：`HMAC-SHA256`
- 输出编码：`Base64URL`
- canonical string 换行符：固定使用 LF（`\n`）
- body：按本文件 code block 中展示的单行 JSON 精确取值，不带前后空白和额外换行

## 2. 测试向量：`/webhooks/inbound-call`

### 2.1 输入

- `X-Telephony-Key-Id`：`r5-r3-key-inbound-01`
- `X-Telephony-Timestamp`：`1776852000`
- `X-Telephony-Nonce`：`r5-r3-nonce-inbound-0001`
- `secret`：`r5-r3-secret-au-inbound-01`
- `path`：`/webhooks/inbound-call`

body：

```json
{"event_name":"telephony.inbound.received","event_direction":"inbound","provider_key":"provider-au-01","trunk_key":"au-did-inbound-01","provider_event_id":"evt_in_0001","provider_call_id":"provcall_in_0001","occurred_at":"2026-04-22T10:00:00Z","trace_id":"trace_r5r3_in_0001","display_did":"+617676021983","remote_number":"+8613812345678","provider_raw_status":"incoming","provider_raw_reason":null}
```

### 2.2 期望值

- `body_sha256`：`e3805d42bb636e08bd622d0f93eed865dcff7a95038f40a7f035175c5ae69eee`

canonical string：

```text
POST
/webhooks/inbound-call
1776852000
r5-r3-nonce-inbound-0001
e3805d42bb636e08bd622d0f93eed865dcff7a95038f40a7f035175c5ae69eee
```

- `signature`：`rF4ue2pmL7HFsV0Vc433b22weiZLXmQ8ynHidKJuRKY`

## 3. 测试向量：`/webhooks/call-status`

### 3.1 输入

- `X-Telephony-Key-Id`：`r5-r3-key-status-01`
- `X-Telephony-Timestamp`：`1776852120`
- `X-Telephony-Nonce`：`r5-r3-nonce-callstatus-0001`
- `secret`：`r5-r3-secret-au-status-01`
- `path`：`/webhooks/call-status`

body：

```json
{"event_name":"telephony.callback.target.ringing","event_direction":"internal","provider_key":"provider-au-01","trunk_key":"au-did-inbound-01","provider_event_id":"evt_cb_0001","provider_call_id":"provcall_cb_0001","occurred_at":"2026-04-22T10:02:00Z","session_direction":"inbound","trace_id":"trace_r5r3_cb_0001","tenant_ref":"tenant_alpha","call_session_ref":"11111111-1111-4111-8111-111111111111","callback_session_ref":"22222222-2222-4222-8222-222222222222","target_endpoint_ref":"33333333-3333-4333-8333-333333333333","display_did":"+617676021983","remote_number":"+8613812345678","provider_raw_status":"target_ringing","provider_raw_reason":null}
```

### 3.2 期望值

- `body_sha256`：`270ba5d1721195f223b4c1ac8fdee6fcbfd991ea12821f0d8b0bf985e6a95307`

canonical string：

```text
POST
/webhooks/call-status
1776852120
r5-r3-nonce-callstatus-0001
270ba5d1721195f223b4c1ac8fdee6fcbfd991ea12821f0d8b0bf985e6a95307
```

- `signature`：`IVFQWmUhyI3oUgTOx2X1SNt5Dp5FpmrtkG75zD739WE`

## 4. 测试向量：`/webhooks/recording-ready`

### 4.1 输入

- `X-Telephony-Key-Id`：`r5-r3-key-recording-01`
- `X-Telephony-Timestamp`：`1776853800`
- `X-Telephony-Nonce`：`r5-r3-nonce-recording-0001`
- `secret`：`r5-r3-secret-au-recording-01`
- `path`：`/webhooks/recording-ready`

body：

```json
{"event_name":"telephony.recording.ready","event_direction":"internal","provider_key":"provider-au-01","trunk_key":"au-outbound-01","provider_event_id":"evt_rec_0001","provider_call_id":"provcall_out_0001","occurred_at":"2026-04-22T10:30:00Z","session_direction":"outbound","trace_id":"trace_r5r3_out_0001","tenant_ref":"tenant_alpha","call_session_ref":"44444444-4444-4444-8444-444444444444","display_did":"+617676021983","remote_number":"+8613812345678","recording_id":"rec_r5r3_0001","recording_scope":"mixed","recording_url":"https://fixtures.invalid/recordings/rec_r5r3_0001.wav","duration_sec":180,"checksum_sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}
```

### 4.2 期望值

- `body_sha256`：`9feb0463a2f213d35e0f860294f949ae71c8a1b736c3c6b68d5ce222e737c17f`

canonical string：

```text
POST
/webhooks/recording-ready
1776853800
r5-r3-nonce-recording-0001
9feb0463a2f213d35e0f860294f949ae71c8a1b736c3c6b68d5ce222e737c17f
```

- `signature`：`kXCP6_5vkJQSfo10eFaErxCN6_qyhhMbq75atcPHYvk`
