# Round 5 第三轮联调真实执行记录

> 日期：2026-04-22  
> 线程：QA & Release Worker  
> 任务卡 ID：`R5-R3-D`

## 1. 执行基线

- 真源顺序：`docs/多租户境外号码语音平台设计方案.md -> docs/AgentTeams多租户语音平台开发模式.md -> docs/Round5第三轮任务卡.md -> docs/Round5第三轮主线程跟踪清单.md -> docs/qa/20 -> 21 -> 22 -> 23 -> 24 -> 25 -> 26 -> 27`
- 本轮只认单一 fresh-build 运行面：`npm run build` 后直接启动 `dist/main.js`，隔离端口为 `3203`。
- QA 库基线：`privacy_dialer`，先执行 `npm run migration:run`，再执行 `npm run seed:qa:r5-r3`。
- 旧实例 `3000`、第二轮隔离实例 `3101/3102` 未参与本轮结论，只保留为第二轮历史证据。

## 2. A / B / C 当前输入物核对

| 线程 | 当前输入物 | 结果 | 说明 |
|------|------------|------|------|
| A | `1776800000000`、`1776900000000`、`1777000000000` 三个 migration；`round5-r3-qa.seed.ts` | 通过 | fresh DB 迁移和 QA seed 可执行 |
| B | `CallsController` / `CallsService` fresh build；`GET /calls/:id`；显式租户头 `x-tenant-id`；客户端刷新任务状态能力 | 通过 | build、启动、POST / GET 都能在 fresh runtime 上执行 |
| C | `docs/telephony/README.md`、`field-alignment.md`、`header-and-channel-mapping.md`、`integration-sequence.md`、`fixtures/**` | 通过 | 第二轮缺失文档已补齐，可用于 D 线程复测准备 |

## 3. 执行前说明

- `SMK-01` 基础 smoke 继续使用 QA 库中已存在的 `demo_user` 账号执行，验证登录、刷新、登出与配置链路。
- 双租户 calls API 复测使用基于 QA seed 账号 ID 临时签发的 Bearer Token，重点验证 `x-tenant-id` 显式租户选择和 fresh runtime 下的租户隔离、DID 选择、TTL、`server_orchestrated_mode`。
- 本轮没有把旧阻塞直接继承为当前事实；所有结论都以本次命令、API 响应和数据库查询结果为准。

## 4. 联调前置结果

| ID | 结果 | 说明 |
|----|------|------|
| `INT-PRE-01` | 通过 | 第三轮真源、第二轮执行记录和 C 线程当前输出物已重新核对 |
| `INT-PRE-02` | 通过 | QA 库已具备双租户、双 DID、双终端、有效 TTL、过期 TTL 样本 |
| `INT-PRE-03` | 通过 | 通过 fresh runtime 的真实 `POST /calls/outbound` 响应拿到了 `taskId`、`tenantId`、`mode`、`displayDid`、`targetEndpoint`、`callbackWindow`、`latestEvent` |
| `INT-PRE-04` | 通过 | callback 规则、状态字典、字段映射和 fixture 文档都在当前工作区 |
| `INT-PRE-05` | 通过 | 客户端源码仍保留 `direct_prefix_mode` / `server_orchestrated_mode` 双模式分支，fresh runtime 可执行新模式 |
| `INT-PRE-06` | 通过 | 第二轮缺陷已可按“仍有效 / 已解决 / 已过时”口径更新 |

## 5. 联调执行结果

| ID | 关联任务卡 | 结果 | 证据 / 说明 |
|----|------------|------|-------------|
| `INT-01` | A, D | 通过 | migration 和 seed 后，`tenant_members`、`tenant_endpoints`、`callback_sessions`、`call_events` 在 QA 库中真实存在；`call_session.tenant_id`、`callback_session.tenant_id`、`call_event.tenant_id` 可查询 |
| `INT-02` | A, B, D | 通过 | `alpha` 账号带 `x-tenant-id=beta` 时返回 `403`；`alpha` 在本租户上下文读取 `beta` 任务 ID 时返回 `404` |
| `INT-03` | A, B, D | 通过 | `alpha` 租户出呼与查询均返回 `+617676021983`；`beta` 租户出呼与查询均返回 `+442080001111`，无串租户串号 |
| `INT-04` | B, C, D | 通过 | `POST /calls/outbound` 在 `alpha` / `beta` 两个租户下都返回 `taskId`、`tenantId`、`mode=server_orchestrated_mode`、`status=dispatching`、`displayDid`、`targetEndpoint`、`callbackWindow`、`latestEvent` |
| `INT-05` | B, D | 通过 | fresh runtime 下新模式稳定返回任务视图；`GET /calls/:id` 能读回最新持久化状态 |
| `INT-06` | B, D | 未执行 | 本轮未做真机或模拟器 `direct_prefix_mode` 兼容链路复测 |
| `INT-07` | A, C, D | 通过 | 新建 `alpha` / `beta` 外呼后，`call_sessions.callback_session_id` 已真实绑定到新 `callback_session`；`target_endpoint_id` 已写入 `callback_sessions` |
| `INT-08` | A, C, D | 未执行 | 当前 fresh runtime 未纳入真实 `/webhooks/inbound-call` 或 trunk 入呼路由复测，本轮未重放“命中 route_callback”链路 |
| `INT-09` | A, C, D | 部分通过 | 已验证“过期 TTL 返回 `expired` + `ttlSeconds=0`”与“跨租户访问失败”；但“错 DID / 错号码”未通过真实 inbound webhook 链路重放 |
| `INT-10` | B, D | 部分通过 | 客户端源码与 `flutter analyze` / `flutter test` 证明双模式壳仍在；但未做 fresh runtime 下的真机模式切换录制 |
| `INT-11` | C, D | 部分通过 | C 线程文档、fixture 和状态字典已补齐；但 fresh runtime 新写入的 `telephony.outbound.accepted` 事件仍把 `session_direction`、`target_endpoint_id`、`trace_id` 留空 |
| `INT-12` | D | 通过 | 本轮高风险区已至少覆盖租户隔离、DID 选择、TTL 有效 / 过期、`server_orchestrated_mode` |

## 6. 高风险区复测结果

| 高风险区 | 结果 | 说明 |
|----------|------|------|
| 租户隔离 | 通过 | `x-tenant-id` 显式选错租户返回 `403`；同 token 读取他租户任务返回 `404` |
| DID 选择 | 通过 | `alpha` / `beta` 两个租户在 fresh runtime 下稳定返回各自 DID 与目标终端 |
| TTL 有效 / 过期 | 通过 | `alpha` 种子任务返回 `callbackWindow.status=active` 且 `ttlSeconds > 0`；`beta` 种子任务返回 `callbackWindow.status=expired` 且 `ttlSeconds = 0` |
| `server_orchestrated_mode` | 通过 | 新建任务与查询任务都返回 `mode=server_orchestrated_mode`，并能稳定回读 |
| API 契约字段对齐 | 部分通过 | 任务视图主字段已对齐；但新写入 `call_events` 仍未完整承载 `session_direction`、`target_endpoint_id`、`trace_id` |

## 7. 联调结论

```md
### Round 5 第三轮联调结论

- 联调日期：2026-04-22
- 联调环境：single fresh build on port 3203 + migrated / seeded QA DB `privacy_dialer`
- 覆盖任务卡：A / B / C / D
- 通过项：INT-PRE-01~06、INT-01、INT-02、INT-03、INT-04、INT-05、INT-07、INT-12
- 部分通过项：INT-09、INT-10、INT-11
- 未执行项：INT-06、INT-08
- 是否允许进入冒烟：是
- 结论签字：D（依据本轮真实命令、API 响应和数据库查询）
```
