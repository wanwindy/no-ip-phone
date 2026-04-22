# Round 5 第三轮冒烟 / 回归真实执行记录

> 日期：2026-04-22  
> 线程：QA & Release Worker  
> 任务卡 ID：`R5-R3-D`

## 1. 执行信息

- 执行日期：2026-04-22
- 执行环境：`D:\no-ip-phone`
- 构建标识：single fresh build，`server/dist/main.js`，运行端口 `3203`
- 执行人：QA & Release Worker
- 关联真源版本：Round 5 第三轮任务卡与第三轮主线程跟踪清单，日期均为 `2026-04-22`
- 是否完成联调前置：是

## 2. 真实执行命令

| 命令 | 结果 | 说明 |
|------|------|------|
| `cd server && npm run build` | 通过 | fresh build 成功 |
| `cd server && npm run migration:run` | 通过 | 第三轮 3 个新 migration 在 QA 库成功落地 |
| `cd server && npm run seed:qa:r5-r3` | 通过 | 双租户、双 DID、双终端、有效 / 过期 TTL 样本成功写入 |
| `Start-Process node dist/main.js` | 通过 | fresh runtime 在 `3203` 启动成功 |
| `cd server && npm run smoke:minimal` | 通过 | `demo_user` 在 fresh runtime 完成 login / me / config / refresh / logout |
| `cd client && flutter analyze` | 通过 | 无静态分析问题 |
| `cd client && flutter test` | 通过 | 现有 Flutter 测试全部通过 |
| Node API replay + DB query | 通过 | 完成 `alpha` / `beta` 出呼、查询、跨租户负向、TTL 有效 / 过期验证 |

## 3. 冒烟结果

| ID | 关联任务卡 | 高风险区 | 结果 | 缺陷单 / 证据 |
|----|------------|----------|------|----------------|
| `SMK-01` | A, D | 租户隔离 | 通过 | `npm run smoke:minimal` 在 fresh runtime 成功跑通基础资料与配置链路 |
| `SMK-02` | A, B, D | 租户隔离 | 通过 | `alpha` 带错租户头返回 `403`；`alpha` 查询 `beta` 任务返回 `404` |
| `SMK-03` | B, C, D | API 契约变更 | 通过 | `POST /calls/outbound` happy path 在 `alpha` / `beta` 两个租户均返回 `201` 和完整任务视图 |
| `SMK-04` | B, D | DID 外显 | 通过 | 新模式返回的 `displayDid` 与 DID 分配一致，同时带回 `callbackWindow` |
| `SMK-05` | A, C, D | 回拨命中 | 未执行 | 本轮未接入真实 inbound webhook / route_callback 复测 |
| `SMK-06` | A, C, D | 回拨命中 | 部分通过 | 已验证“过期 TTL=0”和“跨租户失败”；未重放“错 DID / 错号码”真实入呼链路 |
| `SMK-07` | B, D | 双模式切换 | 通过 | `POST /calls/outbound` 与 `GET /calls/:id` 都返回 `mode=server_orchestrated_mode` |
| `SMK-08` | B, D | 双模式切换 | 未执行 | fresh runtime 下未做真机 `direct_prefix_mode` 兼容拨号 |
| `SMK-09` | C, D | API 契约变更 | 部分通过 | 文档、fixture、命名和事件字典已齐；但新写入 `call_events` 的字段对齐仍有 gap |
| `SMK-10` | D | 综合放行 | 通过 | 当前无 P0；遗留项都有 owner、优先级和下一步 |

## 4. 回归结果

| ID | 触发变更 | 结果 | 缺陷单 / 证据 |
|----|----------|------|----------------|
| `REG-01` | A 线程迁移或实体调整 | 通过 | migration + seed 后 `tenant_members=2`、`tenant_endpoints=2`、`callback_sessions=6`、`call_events=9` |
| `REG-02` | B 线程 API 字段调整 | 部分通过 | `POST /calls/outbound` / `GET /calls/:id` 已稳定；但新写入 `call_events` 未完整对齐 telephony 逻辑字段 |
| `REG-03` | B 线程拨号壳调整 | 部分通过 | `server_orchestrated_mode` 真实执行通过；`direct_prefix_mode` 只保留了源码和 Flutter 测试证据 |
| `REG-04` | C 线程状态字典调整 | 通过 | `README`、映射表、字段对齐说明、fixture 均在当前工作区 |
| `REG-05` | 回拨规则调整 | 未执行 | 本轮只验证了 TTL active / expired 状态，没有重放 inbound callback 命中 / 误命中 |
| `REG-06` | DID 分配策略调整 | 部分通过 | 已验证固定租户映射不串租户、不串展示号；`shared_pool` 未在本轮 fresh runtime 复测 |
| `REG-07` | QA 门禁更新 | 通过 | 第三轮执行记录、缺陷清单、门禁评审已按 28 -> 29 -> 30 -> 31 更新 |

## 5. 冒烟 / 回归结论

```md
### Round 5 第三轮冒烟 / 回归结论

- 冒烟结果：通过 6 项，部分通过 2 项，未执行 2 项
- 回归结果：通过 3 项，部分通过 3 项，未执行 1 项
- 新增缺陷：
  - R5-R3-D-DEF-01
  - R5-R3-D-DEF-02
  - R5-R3-D-DEF-03
- 遗留缺陷：
  - R5-R3-D-DEF-01（P1）
  - R5-R3-D-DEF-02（P2）
  - R5-R3-D-DEF-03（P2）
- 高风险区结论：租户隔离通过；DID 选择通过；TTL 有效 / 过期通过；`server_orchestrated_mode` 通过；callback 真实入呼回放与 `direct_prefix_mode` 真机兼容仍待补测
- 是否满足发布门禁：条件满足，可进入 `CONDITIONAL GO` 评审
- 是否满足下一轮启动门禁：是，但需带着 P1 / P2 约束进入
```
