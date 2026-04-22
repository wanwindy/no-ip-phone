# Round 5 第二轮冒烟与回归执行记录

> 日期：2026-04-22  
> 线程：QA & Release Worker  
> 任务卡 ID：`R5-R2-D`  
> 结论：本轮真实冒烟已执行，但最新工作树结论为 `NO-GO`

## 1. 执行信息

- 执行环境：
  - `server` 旧实例：`http://127.0.0.1:3000`
  - `server` 旧 dist 隔离实例：`http://127.0.0.1:3101`
  - `server` 最新 emitted dist 隔离实例：`http://127.0.0.1:3102`
  - `client`：本地 Flutter 3.41.6 / Dart 3.11.4
- 构建标识：
  - `server`：`npm run build` latest run failed
  - `client`：`flutter analyze` / `flutter test` latest run passed
- 执行人：QA & Release Worker
- 关联真源版本：2026-04-22 真源集合
- 是否完成联调前置：否

## 2. 命令与结果

| 命令 | 结果 |
|------|------|
| `npm run smoke:minimal` | 通过，旧实例 `3000` 上 auth/config 基础链路正常 |
| `flutter analyze` | 通过 |
| `flutter test` | 通过 |
| `npm run build` | 未通过，`server/src/modules/calls/calls.service.ts` 存在 TypeScript 编译错误 |
| `POST /api/v1/calls/outbound` on `3101` | 通过，但仅返回第一轮 skeleton |
| `GET /api/v1/calls/{taskId}` on `3101` | 未通过，返回 `404` |
| `POST /api/v1/calls/outbound` on `3102` | 未通过，返回 `500`，根因是 `tenant_members` 表缺失 |

## 3. 冒烟结果

| ID | 结果 | 说明 | 缺陷 / 阻塞 |
|----|------|------|-------------|
| `SMK-01` | 阻塞 | 无法在最新运行面读取有效租户上下文；`tenant_members` 缺表。 | `R5-R2-D-DEF-02` |
| `SMK-02` | 阻塞 | 无双租户数据，且最新运行面在租户上下文阶段即失败。 | `R5-R2-D-DEF-02` / `R5-R2-D-DEF-05` |
| `SMK-03` | 未通过 | `3102` 上 `POST /calls/outbound` 返回 `500`。 | `R5-R2-D-DEF-01` / `R5-R2-D-DEF-02` |
| `SMK-04` | 未通过 | `3101` 只返回占位 DID；`3102` 无法走通。 | `R5-R2-D-DEF-03` |
| `SMK-05` | 未验证 | 没有可执行的 callback 命中数据与运行面。 | `R5-R2-D-DEF-05` |
| `SMK-06` | 未验证 | TTL / 错 DID / 错号码负向场景未具备执行环境。 | `R5-R2-D-DEF-05` |
| `SMK-07` | 未通过 | 最新运行面 `server_orchestrated_mode` 无法创建任务。 | `R5-R2-D-DEF-01` / `R5-R2-D-DEF-02` |
| `SMK-08` | 未验证 | 本轮未做真机系统拨号器执行。 | 环境限制 |
| `SMK-09` | 未通过 | `docs/telephony/README.md` 指向的第二轮文档未落地，签名 / 映射表缺失。 | `R5-R2-D-DEF-04` |
| `SMK-10` | 未通过 | 存在未关闭的 P0，且高风险区证据不完整。 | `R5-R2-D-DEF-01` / `R5-R2-D-DEF-02` |

## 4. 回归结果

| ID | 结果 | 说明 |
|----|------|------|
| `REG-01` | 阻塞 | A 线程结构已前进到 `tenant_endpoints` / `call_events`，但本地库未证明已迁移完成。 |
| `REG-02` | 未通过 | B 线程 `calls.service.ts` 最新源码编译失败。 |
| `REG-03` | 部分通过 | 客户端已补状态刷新源码，`flutter analyze` / `flutter test` 通过。 |
| `REG-04` | 未通过 | C 线程第二轮文档缺口仍在。 |
| `REG-05` | 未验证 | 回拨命中规则无真实执行证据。 |
| `REG-06` | 未验证 | DID 分配策略没有真实租户数据支撑回归。 |
| `REG-07` | 通过 | QA 编号、执行记录、门禁记录已对齐。 |

## 5. 冒烟 / 回归结论

```md
### Round 5 第二轮冒烟 / 回归结论

- 冒烟通过率：2 / 10（仅基础 smoke 与客户端静态验证通过）
- 回归通过率：2 / 7（REG-03 部分通过，REG-07 通过）
- 新增缺陷：5
- 遗留缺陷：5
- 高风险区结论：
  - 租户隔离：阻塞
  - 回拨命中：未验证
  - DID 外显：未通过
  - 双模式切换：部分通过
  - API 契约变更：未通过
- 是否满足发布门禁：否
- 是否满足下一轮启动门禁：否
```
