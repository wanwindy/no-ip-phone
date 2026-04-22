# 同号回拨规则冻结

> 本文件冻结 `display_did + remote_number + TTL` 这条主线程已确认的回拨实现基线，并补齐匹配顺序、TTL、幂等键和失败回退规则。

## 1. 核心规则

同号回拨只在以下条件同时成立时命中：

1. `display_did` 与最近一次有效外呼使用的展示 DID 完全一致。
2. `remote_number` 与该次外呼的 PSTN 对端号码完全一致。
3. 命中的 `callback_session` 仍处于有效 TTL 内。
4. `callback_session.status=active`。

额外冻结项：

- 不允许跨 DID 模糊匹配。
- 不允许跨租户回退；租户归属由 `display_did` 反查得出。
- 不使用 `0061...` 或本地格式参与匹配，一律先归一化到 E.164。

## 2. 匹配键

### 2.1 业务匹配主键

主线程冻结的业务匹配主键保持为：

```text
display_did + remote_number + TTL
```

解释：

- `display_did`：被回拨的 DID，E.164
- `remote_number`：来电主叫号码，E.164
- `TTL`：命中时点必须尚未过期

### 2.2 候选排序

当同一 `display_did + remote_number` 在 TTL 内出现多个候选时，固定按以下顺序选择：

1. 最近一次创建且仍有效的 `callback_session`
2. 若仍并列，选择关联的最近一次 `origin_call_session`
3. 若仍冲突，取最新写入的一条并记录冲突审计事件

Round 5 不允许随机挑选候选。

## 3. TTL 规则

### 3.1 默认 TTL

Round 5 默认 TTL 冻结为 `2 小时`。

### 3.2 允许的策略档位

为与真源保持一致，允许的租户策略档位固定为：

- `30 分钟`
- `2 小时`
- `24 小时`

### 3.3 命中判定

- 对接侧命中时不得自行重算策略，只认平台给出的有效窗口。
- 若实现层需要落库，必须能表达一个明确的“过期时点”语义。
- 当入呼到达时间晚于有效窗口结束时间时，结果固定为 `callback_expired`。

## 4. 同号回拨幂等键

### 4.1 入呼事件幂等键

同号回拨的入呼消费幂等键固定为：

```text
{provider_key}:{trunk_key}:{provider_call_id}:telephony.inbound.received
```

### 4.2 路由决策幂等键

为避免同一次入呼重复命中多个回拨窗口，路由决策必须再使用一个内部决策幂等键：

```text
{display_did}:{remote_number}:{provider_call_id}
```

语义：

- 同一个外部入呼 `provider_call_id` 只能产出一个最终路由决策
- 重试时必须返回同一 `callback_session_ref` 或同一拒绝原因

## 5. 失败回退规则

### 5.1 首选路由

命中 `callback_session` 后，首选路由目标固定为该窗口关联的原始目标终端。

## 5.2 回退顺序

若原始目标终端不可达，固定按以下顺序回退：

1. 同租户内、同回拨策略允许范围内的备用 `tenant_endpoint`
2. 按 `tenant_endpoint.priority` 已定义的优先级顺序依次尝试
3. 所有可尝试目标都失败后，返回拒绝

说明：

- 本轮只冻结“按优先级顺序回退”的规则，不替数据线程定义优先级列类型。
- 不允许回退到其他租户。
- 不允许因为 trunk 空闲而改去其他 DID；展示 DID 必须保持命中的原 DID。

### 5.3 失败结果字典

当无法完成路由时，`decision_reason` 固定使用以下值之一：

- `callback_not_found`
- `callback_expired`
- `tenant_blocked`
- `no_available_endpoint`
- `invalid_display_did`
- `invalid_remote_number`

若已经命中 `callback_session` 但所有回退都失败：

- `callback_session.status` 进入 `failed`
- 写入 `telephony.callback.rejected`
- 不创建新的替代 `callback_session`

## 6. 冲突与异常处理

### 6.1 重复入呼通知

- 相同幂等键的重复通知必须返回首次决策
- 不重复创建新的 `call_session`
- 不重复推进 `callback_session`

### 6.2 号码不可解析

若 `display_did` 或 `remote_number` 不能归一化为 E.164：

- 不进入模糊匹配
- 直接返回 `invalid_display_did` 或 `invalid_remote_number`

### 6.3 候选已过期

若找到了历史候选但全部超过 TTL：

- 返回 `callback_expired`
- 不允许降级为“命中最接近的一次旧会话”

### 6.4 回退中断

若回退过程中出现部分目标已尝试、部分尚未尝试的中断情况：

- 只要入呼 `provider_call_id` 不变，就必须继续复用同一决策上下文
- 不允许在重试时改命中另一条 `callback_session`

## 7. 与其他线程边界

本文件只冻结业务规则，不冻结以下实现细节：

- `callback_session` 的数据库列类型
- `tenant_endpoint.priority` 的具体存储格式
- Kamailio、FreeSWITCH 的具体脚本实现
- 客户端如何展示“回拨有效期”
