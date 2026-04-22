# Round 5 第三轮门禁评审结论

> 日期：2026-04-22  
> 线程：QA & Release Worker  
> 任务卡 ID：`R5-R3-D`  
> 最终结论：`CONDITIONAL GO`

## 1. 本轮输入

- 联调执行记录：`docs/qa/28-round5-r3-integration-execution-record.md`
- 冒烟 / 回归记录：`docs/qa/29-round5-r3-smoke-regression-record.md`
- 缺陷清单：`docs/qa/30-round5-r3-defect-log.md`

## 2. 第三轮门禁评审

| 门禁项 | 结果 | 说明 |
|--------|------|------|
| A 线程：migration / seed / QA DB 初始化 | 通过 | fresh DB 已成功执行 migration 和 `round5-r3` seed，`tenant_members`、`tenant_endpoints`、`callback_sessions`、`call_events` 都在库中真实可用。 |
| B 线程：single fresh build / `POST /calls/outbound` / `GET /calls/:id` / 显式租户选择 | 通过 | `npm run build` 通过，fresh runtime 可启动，`x-tenant-id` 已可用于双租户验证，POST / GET 都能返回稳定任务视图。 |
| C 线程：fixture / 状态字典 / 字段对齐说明 | 通过 | 第二轮缺失文档和 fixture 已补齐，D 线程可直接引用。 |
| D 线程：只基于 fresh runtime 的复测 | 通过 | 第三轮已明确放弃旧实例结论，只用单一 fresh runtime 和已迁移 QA 库复测。 |
| API 字段对齐完整性 | 条件通过 | 任务视图主字段已通过，但新写入 `call_events` 仍有字段未补齐。 |
| 兼容模式与 callback 复测完整性 | 条件通过 | 第三轮硬要求的高风险区已覆盖，但 `direct_prefix_mode` 真机链路和 inbound callback 真正回放仍未完成。 |

## 3. 第二轮缺陷状态收口

| 分类 | 数量 | 说明 |
|------|------|------|
| 已解决 | 4 | build、缺表、缺文档、缺样本均已被 fresh runtime 或当前工作区证据覆盖 |
| 已过时 | 1 | 旧 dist 漂移不再属于第三轮门禁事实 |
| 仍有效 | 0 | 第二轮旧缺陷没有直接延续到第三轮 |
| 第三轮新增仍有效缺陷 | 3 | 1 个 P1、2 个 P2 |

## 4. 高风险区结论

| 高风险区 | 结果 | 说明 |
|----------|------|------|
| 租户隔离 | 通过 | 错租户头 `403`，跨租户任务读取 `404`，single fresh runtime 下未见数据泄漏 |
| DID 选择 | 通过 | `alpha` / `beta` 两个租户的 DID、终端、任务视图都稳定隔离 |
| TTL 有效 / 过期 | 通过 | 通过 QA seed 的 active / expired callback 样本真实返回不同 TTL 状态 |
| `server_orchestrated_mode` | 通过 | create / get 两个链路都稳定返回该模式并能读回最新状态 |
| callback 真实命中 / 误命中回放 | 条件通过 | 本轮只验证了 TTL active / expired 与跨租户负向，未重放真正 inbound webhook 命中链路 |
| `direct_prefix_mode` 兼容 | 条件通过 | 源码和 Flutter 测试还在，但没有 fresh runtime 下的真机兼容拨号证据 |

## 5. 评审结论

```md
### Round 5 第三轮发布 / 下一轮准入结论

- 评审日期：2026-04-22
- 评审人：QA & Release Worker
- 当前结论：CONDITIONAL GO
- 已通过门禁：
  - A 线程 migration / seed / QA DB 初始化通过
  - B 线程 build、fresh runtime、POST / GET、显式租户选择通过
  - C 线程 fixture、映射表、字段对齐说明通过
  - D 线程只基于 fresh runtime 完成复测
  - 第三轮要求的高风险区最小覆盖已达成
- 条件项：
  - R5-R3-D-DEF-01：新建 `call_events` 的字段对齐仍有 gap
  - R5-R3-D-DEF-02：`direct_prefix_mode` 真机兼容复测缺失
  - R5-R3-D-DEF-03：真实 inbound callback 命中 / 误命中回放未完成
- 高风险区结论：租户隔离通过；DID 选择通过；TTL 有效 / 过期通过；`server_orchestrated_mode` 通过；callback 回放与兼容模式仍为条件项
- 是否允许进入下一阶段实现：是，但仅限受控推进，不得对外宣称“真实 trunk / callback 全链路稳定”
```

## 6. 建议的解锁顺序

1. B 线程先补 `R5-R3-D-DEF-01`，把 accepted 事件的 `session_direction`、`target_endpoint_id`、`trace_id` 补齐。
2. B 线程补一轮 `direct_prefix_mode` 真机或模拟器复测，关闭 `R5-R3-D-DEF-02`。
3. B / C 线程在下一阶段 webhook 运行面可用后，用现有 fixture 重跑 inbound callback 命中 / 误命中，关闭 `R5-R3-D-DEF-03`。
4. D 线程基于同一 fresh runtime 重新执行 `29 -> 30 -> 31`，再决定是否从 `CONDITIONAL GO` 提升到 `GO`。
