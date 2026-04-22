# Telephony 状态与事件字典

> 本文件冻结 `call_session`、`callback_session`、`call_event` 的归一化字典与语义，不决定数据库列类型。

## 1. `call_session` 状态字典

`call_session.status` 冻结为以下值：

| 状态 | 是否终态 | 语义 |
|------|----------|------|
| `created` | 否 | 平台已创建会话，但尚未下发到 trunk / media |
| `dispatching` | 否 | 编排层正在选择 DID、trunk、路由或桥接目标；对入呼回拨表示已命中窗口并开始给目标终端路由 |
| `ringing` | 否 | 当前待接通目标已被振铃；出呼时是 PSTN 对端，入呼回拨时是租户目标终端 |
| `answered` | 否 | 某一待桥接目标已接听，但双向桥接可能仍未完成 |
| `bridged` | 否 | 租户目标与外部对端已建立桥接 |
| `completed` | 是 | 正常结束 |
| `failed` | 是 | 失败结束，具体原因看 `hangup_cause` |
| `canceled` | 是 | 被用户或系统主动取消 |
| `expired` | 是 | 因超时或回拨窗口过期而结束 |

### 1.1 状态推进原则

- 出呼常见路径：`created -> dispatching -> ringing -> answered -> bridged -> completed`
- 出呼失败路径：`created/dispatching/ringing -> failed`
- 主动取消路径：`created/dispatching/ringing -> canceled`
- 入呼同号回拨路径：`created -> dispatching -> ringing -> answered -> bridged -> completed`

### 1.2 归一化说明

- `busy`、`no_answer`、`rejected`、`congestion`、`provider_error` 不单独占用 `status`，统一落到 `hangup_cause`。
- `answered` 与 `bridged` 必须区分；外部接听不等于已经接通租户终端。
- 任一终态之后，不再接受主状态回退。

### 1.3 入呼命中回拨后的生命周期口径

| 顺序 | event_name | 触发方 | `call_session.status` | 说明 |
|------|------------|--------|-----------------------|------|
| 1 | `telephony.inbound.received` | SIP Router / trunk adapter | `created` | DID 收到来电 |
| 2 | `telephony.callback.matched` | Orchestrator | `dispatching` | 命中有效 `callback_session`，开始路由目标终端 |
| 3 | `telephony.callback.target.ringing` | media / callback adapter | `ringing` | 目标终端振铃 |
| 4 | `telephony.callback.target.answered` | media / callback adapter | `answered` | 目标终端接听 |
| 5 | `telephony.callback.bridged` | media / callback adapter | `bridged` | PSTN leg 与目标终端桥接成功 |
| 6 | `telephony.callback.completed` | media / callback adapter | `completed` | 正常结束 |
| 7 | `telephony.callback.failed` | media / callback adapter | `failed` | 命中后仍未完成有效桥接 |
| 8 | `telephony.callback.canceled` | media / callback adapter | `canceled` | 命中后被主叫、被叫或系统取消 |

冻结说明：

- `telephony.callback.matched` 是命中成功后的唯一起点事件
- `telephony.callback.target.answered` 只表示目标终端接听，不表示对端已完成桥接
- `telephony.callback.bridged` 发生后，`callback_session` 才进入 `fulfilled`

## 2. `callback_session` 状态字典

`callback_session.status` 冻结为以下值：

| 状态 | 是否终态 | 语义 |
|------|----------|------|
| `active` | 否 | 回拨窗口已建立，允许按 `display_did + remote_number + TTL` 命中 |
| `routing` | 否 | 某次入呼已命中该窗口，平台正在给租户终端路由 |
| `fulfilled` | 是 | 已成功桥接一次同号回拨，Round 5 默认关闭该窗口 |
| `expired` | 是 | TTL 到期或被显式过期 |
| `failed` | 是 | 已命中，但所有允许回退路径都失败 |
| `revoked` | 是 | 被人工或策略主动撤销，不再参与匹配 |

### 2.1 状态推进原则

- 创建窗口：`active`
- 命中回拨并开始路由：`active -> routing`
- 路由成功：`routing -> fulfilled`
- 路由失败且无更多回退：`routing -> failed`
- 到达 TTL：`active/routing -> expired`

### 2.2 Round 5 默认语义

- 同一个 `callback_session` 默认按“首次成功桥接即关闭窗口”处理，因此成功后进入 `fulfilled`。
- 若未来产品要支持“一次外呼、多次回拨”，应由主线程重新冻结，不能在本轮私自放宽。
- `telephony.callback.bridged` 是唯一把 `callback_session` 从 `routing` 推进到 `fulfilled` 的成功事件。

## 3. `call_event` 事件字典

本轮对 `call_event` 冻结的是 `event_name` 字典和 `event_direction` 语义；不额外冻结独立的 `call_event.status` 列。

### 3.1 `event_direction`

| 值 | 语义 |
|----|------|
| `inbound` | PSTN 向平台进入 |
| `outbound` | 平台向 PSTN 发起 |
| `internal` | 平台内部编排/录音回流，不代表新外部方向 |

### 3.2 `event_name` 字典

| event_name | direction | 触发方 | 语义 |
|------------|-----------|--------|------|
| `telephony.inbound.received` | `inbound` | SIP Router / trunk adapter | DID 收到来电 |
| `telephony.callback.matched` | `internal` | Orchestrator | 入呼命中有效 `callback_session` |
| `telephony.callback.target.ringing` | `internal` | media / callback adapter | 目标终端振铃 |
| `telephony.callback.target.answered` | `internal` | media / callback adapter | 目标终端接听 |
| `telephony.callback.bridged` | `internal` | media / callback adapter | 入呼 PSTN leg 与目标终端桥接成功 |
| `telephony.callback.completed` | `internal` | media / callback adapter | 命中回拨后的通话正常结束 |
| `telephony.callback.failed` | `internal` | media / callback adapter | 命中回拨后的路由或桥接失败 |
| `telephony.callback.canceled` | `internal` | media / callback adapter | 命中回拨后的会话被取消 |
| `telephony.callback.rejected` | `internal` | Orchestrator | 入呼未命中或被策略拒绝 |
| `telephony.outbound.accepted` | `outbound` | trunk / media | 出呼请求已被接收 |
| `telephony.outbound.ringing` | `outbound` | trunk / media | 被叫振铃 |
| `telephony.outbound.answered` | `outbound` | trunk / media | PSTN 侧已接听 |
| `telephony.outbound.bridged` | `outbound` | media | 已完成桥接 |
| `telephony.outbound.completed` | `outbound` | trunk / media | 正常结束 |
| `telephony.outbound.failed` | `outbound` | trunk / media | 失败结束 |
| `telephony.outbound.canceled` | `outbound` | Orchestrator / media | 主动取消 |
| `telephony.recording.ready` | `internal` | media / recording adapter | 录音可用 |
| `telephony.recording.failed` | `internal` | media / recording adapter | 录音失败 |

### 3.3 事件到 `call_session.status` 的映射

| event_name | 目标状态 |
|------------|----------|
| `telephony.inbound.received` | `created` |
| `telephony.callback.matched` | `dispatching` |
| `telephony.callback.target.ringing` | `ringing` |
| `telephony.callback.target.answered` | `answered` |
| `telephony.callback.bridged` | `bridged` |
| `telephony.callback.completed` | `completed` |
| `telephony.callback.failed` | `failed` |
| `telephony.callback.canceled` | `canceled` |
| `telephony.outbound.accepted` | `dispatching` |
| `telephony.outbound.ringing` | `ringing` |
| `telephony.outbound.answered` | `answered` |
| `telephony.outbound.bridged` | `bridged` |
| `telephony.outbound.completed` | `completed` |
| `telephony.outbound.failed` | `failed` |
| `telephony.outbound.canceled` | `canceled` |

说明：

- `telephony.callback.rejected`、`telephony.recording.*` 必须写入 `call_event`，但不直接覆盖 `call_session.status`。
- `telephony.callback.matched` 会把 `call_session` 推进到 `dispatching`，但不能直接跳成 `ringing` 或 `bridged`。

## 4. 推荐最小事件字段

为保证后续审计、排障和幂等处理，`call_event` 至少应承载以下逻辑字段：

- `event_name`
- `event_direction`
- `session_direction`
- `tenant_ref`
- `call_session_ref`
- `callback_session_ref`
- `target_endpoint_ref`
- `provider_key`
- `trunk_key`
- `provider_event_id`
- `provider_call_id`
- `display_did`
- `remote_number`
- `occurred_at`
- `provider_raw_status`
- `provider_raw_reason`

若数据线程需要扩展为持久化列，可在不改动这些逻辑字段语义的前提下自行实现。
