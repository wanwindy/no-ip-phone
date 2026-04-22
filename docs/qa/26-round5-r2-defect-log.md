# Round 5 第二轮首轮缺陷清单

> 日期：2026-04-22  
> 线程：QA & Release Worker  
> 任务卡 ID：`R5-R2-D`

## 1. 缺陷列表

| ID | 优先级 | 状态 | 问题 | 证据 | owner | 下一步 |
|----|--------|------|------|------|-------|--------|
| `R5-R2-D-DEF-01` | `P0` | open | 最新工作树执行 `npm run build` 失败，`server/src/modules/calls/calls.service.ts` 存在类型错误，fresh build 不可发布。 | `npm run build` 输出 `TS2769`、`TS2339`、`TS2740` | B | 修正 `CallSessionEntity` / `CallbackSessionEntity` 的状态枚举与 `create()/save()` 类型，重新提交 build 结果。 |
| `R5-R2-D-DEF-02` | `P0` | open | 最新 emitted dist 在 `POST /calls/outbound` 上返回 `500`，日志根因是 `relation "tenant_members" does not exist`，说明第二轮运行面依赖的租户表未在当前库中可用。 | `3102` 运行日志；请求返回 `{ \"code\": 50002, \"message\": \"服务内部错误\" }` | A | 提供 migration 实跑证据，至少保证 `tenant_members`、`tenant_did_assignments`、`tenant_endpoints`、`call_sessions`、`callback_sessions` 可用。 |
| `R5-R2-D-DEF-03` | `P1` | open | QA 运行时存在旧 dist 漂移：`3101` 返回第一轮 skeleton 响应，导致 `GET /calls/:id`、持久化状态链路无法在当前发布物上确认。 | `3101` 返回 `note=Round 5 skeleton only. Trunk orchestration is not connected yet.` 且 `GET /calls/{taskId}=404` | B | 提供单一、可复现的第二轮 QA build，避免旧 dist / 新源码混用。 |
| `R5-R2-D-DEF-04` | `P1` | open | C 线程第二轮交付不完整：`docs/telephony/README.md` 引用了 `header-and-channel-mapping.md`、`integration-sequence.md`，但文件缺失；签名只停留在错误码层面。 | `Test-Path docs/telephony/header-and-channel-mapping.md = false`；`Test-Path docs/telephony/integration-sequence.md = false` | C | 补齐缺失文件，并把 webhook 签名头 / HMAC 语义落成可执行文档。 |
| `R5-R2-D-DEF-05` | `P1` | open | 高风险区缺真实测试数据：没有双租户、双 DID、有效 / 过期 TTL、callback 命中样本，导致租户隔离和回拨命中无法执行。 | 联调 `INT-PRE-02`、`INT-02`、`INT-08`、`INT-09` 均阻塞 | A, C | 由 A 提供测试数据与种子，由 C 提供 callback 事件流最小样本，再由 D 重测。 |

## 2. 当前 owner 视图

### A 线程

- `R5-R2-D-DEF-02`
- `R5-R2-D-DEF-05`

### B 线程

- `R5-R2-D-DEF-01`
- `R5-R2-D-DEF-03`

### C 线程

- `R5-R2-D-DEF-04`
- `R5-R2-D-DEF-05`

## 3. 关闭标准

- `P0` 必须附真实命令输出或运行日志，才能从 `open` 改为 `resolved`。
- `P1` 若仍影响高风险区门禁，主线程不得以 `CONDITIONAL GO` 方式绕过。
- 任一缺陷若 owner 未确认下一步，默认不满足第二轮门禁。
