# Round 5 第四轮联调真实执行记录

> 日期：2026-04-22  
> 线程：QA & Release Worker  
> 任务卡 ID：`R5-R4-D`

## 1. 执行基线

- 真源顺序：`docs/多租户境外号码语音平台设计方案.md -> docs/AgentTeams多租户语音平台开发模式.md -> docs/Round5第四轮任务卡.md -> docs/Round5第四轮主线程跟踪清单.md -> docs/qa/20 -> 21 -> 22 -> 23 -> 28 -> 29 -> 30 -> 31 -> docs/qa/32 -> docs/telephony/signed-replay-cookbook.md -> docs/telephony/field-alignment.md`
- 本轮只认单一 fresh runtime：`cd server && npm run build` 后直接启动 `dist/main.js`，实际验收端口固定为 `3205`。
- QA 库基线：`privacy_dialer`；先执行 `npm run migration:run`，再执行 `npm run seed:qa:r5-r3`。
- 标准登录路径冻结为 `POST /api/v1/auth/login`；本轮未使用临时 JWT 或手工伪造 access token。
- 旧实例、旧端口和非本轮 runtime 只作为环境漂移证据，不进入当前事实判定。

## 2. A / B / C 第四轮输入物核对

| 线程 | 当前输入物 | 结果 | 说明 |
|------|------------|------|------|
| A | `docs/qa/32-round5-r4-seed-login-reference.md`、`round5-r3-qa.seed.ts` | 通过 | 已提供可登录 QA 账号、双租户 membership、alpha / beta DID 和 callback 样本 |
| B | `TelephonyModule`、`TelephonyController`、`TelephonyService`、`CallsService` fresh build | 通过 | fresh runtime 可消费签名 webhook，并能推进 `GET /calls/:id` 最新状态 |
| C | `docs/telephony/signed-replay-cookbook.md`、`docs/telephony/field-alignment.md`、`docs/telephony/fixtures/**` | 通过 | cookbook、fixture 和字段对齐说明均可直接用于第四轮回放 |

## 3. 执行前说明

- 标准登录和双租户切换优先使用 A 线程提供的 `shared_switcher`：`seed_alpha_owner / Round5!AlphaBeta1`。
- beta 正向 DID / endpoint 选择使用 A / C 文档中已明确给出的 `beta_owner`：`seed_beta_owner / Round5!BetaOwner1`；不把 `shared_switcher` 在 beta 下无固定 DID / endpoint 视为当前产品缺陷。
- signed replay 严格按 C 线程 cookbook 使用 fixture、真实 seed 样本和运行时 HMAC key / secret。
- fixture 回放只证明当前 webhook 消费闭环成立，不等价于真实 trunk 商用稳定。

## 4. 联调前置结果

| ID | 结果 | 说明 |
|----|------|------|
| `INT-PRE-01` | 通过 | 第四轮真源、第三轮结论、A / B / C 当前输出物已重新核对 |
| `INT-PRE-02` | 通过 | QA 库已具备双租户、双 DID、双 endpoint、active / expired callback 样本 |
| `INT-PRE-03` | 通过 | `POST /calls/outbound` 可真实返回 `taskId`、`tenantId`、`mode`、`displayDid`、`targetEndpoint`、`callbackWindow`、`latestEvent` |
| `INT-PRE-04` | 通过 | callback 规则、签名头、fixture alias 和字段对齐文档均已冻结 |
| `INT-PRE-05` | 阻塞 | 客户端仍保留 `direct_prefix_mode` / `server_orchestrated_mode` 双模式，但当前 QA 主机没有 Android / iOS 真机或模拟器 |
| `INT-PRE-06` | 通过 | 第三轮缺陷已可按“仍有效 / 已解决 / 已过时”口径更新 |

## 5. 联调执行结果

| ID | 关联任务卡 | 结果 | 证据 / 说明 |
|----|------------|------|-------------|
| `INT-01` | A, D | 通过 | `tenant_members`、`tenant_did_assignments`、`tenant_endpoints`、`call_sessions`、`callback_sessions`、`call_events` 已按本轮 fresh DB 真实可查；`tenant_id`、DID、endpoint 关联完整 |
| `INT-02` | A, B, D | 通过 | `shared_switcher` 走标准 `/auth/login` 后，不带 `X-Tenant-Id` 默认落到 `alpha`；同 token 带 `X-Tenant-Id=beta` 可切到 `beta`；跨租户 `GET /calls/:id` 返回 `404` |
| `INT-03` | A, B, D | 通过 | `alpha` 正向出呼稳定返回 `+617676021983 / QA Alpha Agent Endpoint`；`beta_owner` 正向出呼稳定返回 `+442080001111 / QA Beta SIP Endpoint`，无串租户串号 |
| `INT-04` | B, C, D | 通过 | `POST /calls/outbound` 在标准登录路径下返回冻结契约字段；fresh runtime 未出现第二套租户选择契约 |
| `INT-05` | B, D | 通过 | `server_orchestrated_mode` 在 `alpha` 和 `beta_owner` 场景均可创建任务并被 `GET /calls/:id` 稳定回读 |
| `INT-06` | B, D | 阻塞 | 当前仅有 Windows / Chrome / Edge 目标；`flutter emulators` 为空、`adb` 不可用，无法给出真机或模拟器 `direct_prefix_mode` 证据 |
| `INT-07` | A, C, D | 通过 | 新建外呼后，`call_sessions.callback_session_id`、`callback_sessions.target_endpoint_id`、`call_events.target_endpoint_id` 都已真实关联；accepted 事件字段 gap 已关闭 |
| `INT-08` | A, C, D | 通过 | 回放 `telephony.inbound.received` 命中 active callback 后返回 `route_callback`，并产出真实 `call_session_ref`、`callback_session_ref`、`target_endpoint_ref` |
| `INT-09` | A, C, D | 通过 | 回放过期 TTL、错 DID、错号码三类场景均返回 `reject`，决策原因分别为 `callback_expired` 或 `callback_not_found`，无误命中 |
| `INT-10` | B, D | 阻塞 | `server_orchestrated_mode` 已验证；但 `direct_prefix_mode` 的真实模式切换、最近号码和系统拨号器链路无法在当前主机完成 |
| `INT-11` | C, D | 通过 | `call_events.session_direction`、`target_endpoint_id`、`trace_id` 在 accepted、callback、completed、recording 事件中均已真实落库；当前剩余差异仅为 API 最小视图未直接回出 trace / provider 字段 |
| `INT-12` | D | 通过 | 本轮高风险区已覆盖租户隔离、DID 选择、TTL 有效 / 过期、`server_orchestrated_mode`、webhook 命中 / 误命中 / 录音回流 |

## 6. 高风险区复测结果

| 高风险区 | 结果 | 说明 |
|----------|------|------|
| 租户隔离 | 通过 | 标准登录 + `X-Tenant-Id` 切租户路径成立；跨租户查询返回 `404`，未见数据泄漏 |
| DID 选择 | 通过 | `alpha` 与 `beta_owner` 两套样本均返回本租户 DID 和 endpoint；DID 归属不串租户 |
| TTL 有效 / 过期 | 通过 | active callback 命中返回 `matched_active_callback`；expired callback 返回 `callback_expired` |
| `server_orchestrated_mode` | 通过 | 新建和查询任务都稳定返回 `mode=server_orchestrated_mode`，并能被 webhook 推进 |
| webhook 命中 / 误命中 / 录音回流 | 通过 | 已真实回放 inbound hit、expired、wrong DID、wrong number、outbound completed、recording ready |
| `direct_prefix_mode` | 阻塞 | 当前 QA 主机缺少 Android / iOS 真机或模拟器，无法给出兼容模式真实链路证据 |

## 7. 联调结论

```md
### Round 5 第四轮联调结论

- 联调日期：2026-04-22
- 联调环境：single fresh build on port 3205 + migrated / seeded QA DB `privacy_dialer`
- 覆盖任务卡：A / B / C / D
- 通过项：INT-PRE-01、INT-PRE-02、INT-PRE-03、INT-PRE-04、INT-PRE-06、INT-01、INT-02、INT-03、INT-04、INT-05、INT-07、INT-08、INT-09、INT-11、INT-12
- 阻塞项：INT-PRE-05、INT-06、INT-10
- 是否允许进入冒烟：是
- 结论签字：D（依据本轮标准登录、signed replay、DB 查询与 fresh runtime 真实响应）
```
