# Round 5 第三轮主线程跟踪清单

> 主 agent 使用  
> 日期：2026-04-22

## 1. 本轮冻结项

- Round 5 第二轮统一验收结果按修正版口径记为 `CONDITIONAL GO`
- QA 与主线程只认单一 fresh-build 运行面
- `direct_prefix_mode` 仅作兼容模式
- `callback_session` 默认继续采用“首次成功桥接即 fulfilled”
- 同号回拨主键仍为 `display_did + remote_number + TTL`
- `session_direction` 接受为正式公共逻辑键
- `call_session` 正式业务方向只收口到 `inbound / outbound`
- 第二轮中已失效的阻塞项不得原样复用到第三轮结论

## 2. 第三轮子线程状态

| 线程 | 名称 | 当前状态 | 第三轮目标 |
|------|------|----------|------------|
| A | Tenant & Data Worker | 待启动 | 契约对齐 + QA seed + fresh DB 初始化 |
| B | API & App Worker | 待启动 | 单一 fresh build + 显式租户选择 + 最小事件写入 |
| C | Telephony Contract Worker | 待启动 | 验签向量 + webhook fixtures + 字段对齐说明 |
| D | QA & Release Worker | 待启动 | fresh runtime 复测 + 缺陷状态收口 + 新门禁结论 |

## 3. 主线程重点盯防项

- A 是否真正把 `call_events` 与 `session_direction`、目标终端语义对齐，而不是只加占位列
- A 是否提供可重复执行的 QA seed，而不是一次性手工 SQL
- B 是否交付“单一 fresh-build 运行面”，而不是继续混用旧实例 / 旧 dist
- B 是否引入唯一的显式租户选择契约，而不是又新增第二种 header / query 口径
- C 是否坚持“补 fixture，不扩主契约”，避免第三轮又重新发明状态机
- D 是否把第二轮失效阻塞标为“已过时”，而不是继续沿用旧结论

## 4. 第三轮验收门槛

只有当以下条件同时满足，主线程才考虑推进下一阶段：

1. A 线程：QA 库可从零执行 migration + seed，且 `tenant_members`、`tenant_endpoints`、`call_events`、`callback_sessions` 在库中真实可用。
2. B 线程：`npm run build` 通过，fresh build 可启动，`POST /calls/outbound` 与 `GET /calls/:id` 在 QA 种子库上可用。
3. B 线程：显式租户选择可用于双租户场景验证。
4. C 线程：验签向量、payload fixtures、字段对齐说明已落地，可直接被 A/B/D 使用。
5. D 线程：仅基于 fresh runtime 复测，并明确区分“仍有效 / 已解决 / 已过时”的缺陷结论。

## 5. 主线程预设决策

- 若第三轮仍缺 QA seed 或迁移证据，直接阻断高风险区验收。
- 若第三轮出现第二套租户选择契约，主线程优先要求收口而不是接受并行方案。
- 若 C 线程试图扩大主契约语义，主线程优先回退到第二轮已接受真源。
- 若 D 线程继续使用旧实例结论覆盖 fresh runtime 结果，主线程不采纳对应门禁项。
