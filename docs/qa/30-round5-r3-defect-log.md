# Round 5 第三轮缺陷清单与第二轮缺陷状态更新

> 日期：2026-04-22  
> 线程：QA & Release Worker  
> 任务卡 ID：`R5-R3-D`

## 1. 第二轮缺陷状态更新

| ID | 优先级 | 第三轮状态 | 说明 | owner | 下一步 |
|----|--------|------------|------|-------|--------|
| `R5-R2-D-DEF-01` | `P0` | 已解决 | `npm run build` 在当前工作树已通过，第二轮 fresh build 类型错误不再成立。 | B | 无；后续只需继续防止 build 回退。 |
| `R5-R2-D-DEF-02` | `P0` | 已解决 | `npm run migration:run` 已把 `tenant_members` 等表真实建到 QA 库；fresh runtime 的 `POST /calls/outbound` 不再因缺表返回 `500`。 | A | 无；后续把 migration / seed 顺序继续固化。 |
| `R5-R2-D-DEF-03` | `P1` | 已过时 | 第三轮已明确只认单一 fresh-build 运行面，旧 dist 漂移不再作为当前门禁事实。 | B | 无；继续禁止把旧实例结果带入本轮评审。 |
| `R5-R2-D-DEF-04` | `P1` | 已解决 | `docs/telephony/header-and-channel-mapping.md`、`docs/telephony/integration-sequence.md` 与 fixture 文档都已落地。 | C | 无；后续只需随主契约变更同步维护。 |
| `R5-R2-D-DEF-05` | `P1` | 已解决 | A 线程已提供双租户、双 DID、有效 / 过期 TTL 样本；C 线程 fixture 也已补齐，第二轮“缺数据 / 缺样本”阻塞不再成立。 | A, C | 无；继续复用当前 seed 和 fixture。 |

## 2. 第三轮仍有效缺陷

| ID | 优先级 | 状态 | 问题 | 证据 | owner | 下一步 |
|----|--------|------|------|------|-------|--------|
| `R5-R3-D-DEF-01` | `P1` | 仍有效 | fresh runtime 新建外呼任务时，`call_events` 已能落库，但新写入的 `telephony.outbound.accepted` 事件仍把 `session_direction`、`target_endpoint_id`、`trace_id` 留空，未完全对齐第三轮字段映射目标。 | 数据库查询显示新建任务 `d6ae8090-63b5-44da-ad0f-7e7ed03a6464`、`f7d25f4d-5500-4f7d-9f96-f942fa8fe8ba` 对应事件行以上三列均为 `null`。 | B | 在 `CallsService` 写 accepted 事件时补齐最小逻辑字段，再重跑 `REG-02` / `SMK-09`。 |
| `R5-R3-D-DEF-02` | `P2` | 仍有效 | `direct_prefix_mode` 在第三轮 single fresh runtime 上未做真机或模拟器兼容拨号复测，当前只有源码、`flutter analyze` 和 `flutter test` 证据。 | `INT-06`、`SMK-08` 未执行；`REG-03` 仅部分通过。 | B | 用一台真机或模拟器重跑模式切换和兼容拨号，补齐 `INT-06` / `SMK-08` 证据。 |
| `R5-R3-D-DEF-03` | `P2` | 仍有效 | callback 高风险区已验证 TTL active / expired 与跨租户失败，但第三轮 fresh runtime 仍未重放真实 inbound webhook 的命中 / 误命中链路。 | `INT-08` 未执行；`INT-09` / `SMK-06` / `REG-05` 仅部分通过。 | B, C | 以后续 webhook / trunk 集成运行面为基线，用 C 线程 fixture 重跑正确命中、错 DID、错号码、过期 TTL 四类场景。 |

## 3. 当前 owner 视图

### B 线程

- `R5-R3-D-DEF-01`
- `R5-R3-D-DEF-02`
- `R5-R3-D-DEF-03`

### C 线程

- `R5-R3-D-DEF-03`

## 4. 第三轮状态汇总

- 第二轮遗留缺陷：`已解决 4`、`已过时 1`、`仍有效 0`
- 第三轮新增仍有效缺陷：`3`
- 当前结论：`无 P0；存在 1 个 P1 和 2 个 P2`
