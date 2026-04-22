# Round 5 第二轮主线程跟踪清单

> 主 agent 使用  
> 日期：2026-04-22

## 1. 本轮冻结项

- 目标仍是“多租户境外 DID 语音平台”
- `direct_prefix_mode` 仅作兼容模式
- `callback_session` 默认继续采用“首次成功桥接即 fulfilled”
- 同号回拨主键仍为 `display_did + remote_number + TTL`
- A 线程优先补 `tenant_endpoints` / `call_events`
- B 线程优先补持久化、租户上下文、`GET /calls/:id`
- C 线程优先补入呼回拨生命周期、签名、映射表
- D 线程优先补真实执行记录，不继续扩原则文档

## 2. 第二轮子线程状态

| 线程 | 名称 | 当前状态 | 第二轮目标 |
|------|------|----------|------------|
| A | Tenant & Data Worker | 待启动 | 路由目标模型 + 事件持久化 + migration 实跑 |
| B | API & App Worker | 待启动 | 持久化外呼任务 + 状态查询 + 客户端刷新 |
| C | Telephony Contract Worker | 待启动 | 入呼回拨生命周期 + 签名 + 映射表 |
| D | QA & Release Worker | 待启动 | 真实联调 / 冒烟 / 门禁执行记录 |

## 3. 主线程重点盯防项

- A/B 是否再次出现运行时集成边界漂移
- A/C 是否对 `callback_session` 目标模型给出互相冲突的口径
- B 是否在 C 未冻结前擅自新增 event/webhook 字段
- D 是否继续产出原则文档而不是执行记录

## 4. 第二轮验收门槛

只有当以下条件同时满足，主线程才推进下一阶段：

1. A 线程：migration 实跑成功，且 `tenant_endpoints` / `call_events` 语义清晰。
2. B 线程：`POST /calls/outbound` 已持久化，`GET /calls/:id` 可查，客户端能刷新任务状态。
3. C 线程：入呼回拨生命周期、签名和映射表已冻结。
4. D 线程：有真实联调 / 冒烟 / 门禁执行记录，不只是模板。
