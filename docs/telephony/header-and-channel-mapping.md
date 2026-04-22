# SIP Header / Channel Variable 映射表

> 目标：冻结 trunk、Kamailio/OpenSIPS、FreeSWITCH、Orchestrator 之间的逻辑键承载方式，避免实现线程再猜 header 名和变量名。

## 1. 命名规则

- SIP 自定义 header 统一使用前缀 `X-NIP-`
- FreeSWITCH 内部 channel variable 统一使用前缀 `nip_`
- webhook JSON 继续使用 snake_case 字段名
- 文档中 header 名用规范大小写展示；SIP 线上大小写不敏感，但实现线程不得改 header 词义
- 在 FreeSWITCH 向 SIP leg 注入 header 时，使用 `sip_h_<Header-Name>`；在 dialplan / ESL / mod_lua 内部统一读写 `nip_*`

## 2. 映射表

| 逻辑键 | webhook JSON 字段 | SIP header | FreeSWITCH channel variable | 何时必须写入 | 说明 |
|--------|-------------------|------------|-----------------------------|--------------|------|
| `tenant_ref` | `tenant_ref` | `X-NIP-Tenant-Ref` | `nip_tenant_ref` | 出呼下发、入呼命中后桥接 | 仅在租户已确定后写入 |
| `call_session_ref` | `call_session_ref` | `X-NIP-Call-Session-Ref` | `nip_call_session_ref` | 所有已创建 `call_session` 的链路 | 这是主会话相关键 |
| `callback_session_ref` | `callback_session_ref` | `X-NIP-Callback-Session-Ref` | `nip_callback_session_ref` | 仅同号回拨命中后 | 未命中回拨时不得伪造 |
| `target_endpoint_ref` | `target_endpoint_ref` | `X-NIP-Target-Endpoint-Ref` | `nip_target_endpoint_ref` | 仅回拨目标已选定后 | 对应租户终端稳定标识 |
| `trunk_key` | `trunk_key` | `X-NIP-Trunk-Key` | `nip_trunk_key` | 所有 trunk 相关链路 | 平台内 trunk 稳定标识 |
| `provider_key` | `provider_key` | `X-NIP-Provider-Key` | `nip_provider_key` | 所有 webhook 回流 | 上游 provider 稳定标识 |
| `trace_id` | `trace_id` | `X-NIP-Trace-Id` | `nip_trace_id` | 建议全链路写入 | 跨系统排障链路键 |
| `session_direction` | `session_direction` | `X-NIP-Session-Direction` | `nip_session_direction` | 已创建 `call_session` 后 | 固定为 `inbound` / `outbound` |
| `display_did` | `display_did` | `X-NIP-Display-Did` | `nip_display_did` | 所有主流程 | 统一使用 E.164 |
| `remote_number` | `remote_number` | `X-NIP-Remote-Number` | `nip_remote_number` | 所有主流程 | 统一使用 E.164 |
| `provider_call_id` | `provider_call_id` | `X-NIP-Provider-Call-Id` | `nip_provider_call_id` | 上游已分配后 | 用于状态回流与幂等 |
| `event_name` | `event_name` | `X-NIP-Event-Name` | `nip_event_name` | 仅状态或录音回流 | 不要求在初始 INVITE 就存在 |
| `recording_id` | `recording_id` | `X-NIP-Recording-Id` | `nip_recording_id` | 仅录音回流 | 无录音时不写 |

## 3. 原生 SIP 字段与业务副本

以下逻辑键即使能够从原生 SIP 字段推导，也仍应保留一份业务副本：

| 逻辑键 | 常见原生 SIP 来源 | 冻结要求 |
|--------|-------------------|----------|
| `display_did` | 入呼的 `To` / `R-URI`；出呼的 `From` / `P-Asserted-Identity` | 归一化后再写入 `X-NIP-Display-Did` / `nip_display_did` |
| `remote_number` | 入呼的 `From` / `P-Asserted-Identity`；出呼的 `R-URI` | 归一化后再写入 `X-NIP-Remote-Number` / `nip_remote_number` |
| `provider_call_id` | SIP `Call-ID` 或 provider dialog id | 如上游已给稳定值，必须同步写入 `X-NIP-Provider-Call-Id` / `nip_provider_call_id` |

说明：

- 原生 SIP 字段用于互联，业务副本用于跨组件对账和 webhook 组装
- 不允许在不同 hop 间只靠解析原生 SIP 字段重新猜业务键

## 4. 写入责任

| 组件 | 必须负责写入的键 |
|------|------------------|
| Orchestrator | `tenant_ref`、`call_session_ref`、`trunk_key`、`provider_key`、`trace_id`、`session_direction`、`display_did`、`remote_number` |
| SIP Router（入呼） | 归一化 `display_did`、`remote_number`，并在命中后写入 `call_session_ref`、`callback_session_ref`、`target_endpoint_ref` |
| FreeSWITCH / Media Control | 在桥接、录音、状态回流前保留并回传全部 `nip_*` 业务键 |
| trunk adapter | 负责补齐 `provider_event_id`、`provider_call_id`，并按 webhook JSON 字段名回流 |

## 5. 最小实现约束

- 未创建 `call_session` 之前，不得伪造 `call_session_ref`
- `callback_session_ref` 只在 `action=route_callback` 后开始透传
- `session_direction` 一旦写入，不得在同一 `call_session` 生命周期内改变
- `display_did`、`remote_number` 在所有 hop 都必须保持同一 E.164 值，不允许一跳 `+61...`、一跳 `0061...`
