# Round 5 第四轮冒烟 / 回归真实执行记录

> 日期：2026-04-22  
> 线程：QA & Release Worker  
> 任务卡 ID：`R5-R4-D`

## 1. 执行信息

- 执行日期：2026-04-22
- 执行环境：`D:\no-ip-phone`
- 构建标识：single fresh build，`server/dist/main.js`，运行端口 `3205`
- 执行人：QA & Release Worker
- 关联真源版本：Round 5 第四轮任务卡、第四轮主线程跟踪清单、第四轮 seed / cookbook / field-alignment，日期均为 `2026-04-22`
- 是否完成联调前置：是，但 `direct_prefix_mode` 兼容链路受设备环境阻塞

## 2. 真实执行命令

| 命令 | 结果 | 说明 |
|------|------|------|
| `cd server && npm run build` | 通过 | fresh build 成功 |
| `cd server && npm run migration:run` | 通过 | QA 库提示 `No migrations are pending`，当前库结构已与第四轮代码对齐 |
| `cd server && npm run seed:qa:r5-r3` | 通过 | 输出第四轮可登录账号、双租户 membership、DID / callback 样本摘要 |
| `Start-Process node dist/main.js` | 通过 | fresh runtime 在 `3205` 启动成功；先发现 `3204` 被旧进程占用，但未纳入本轮结论 |
| `cd server && $env:SMOKE_BASE_URL='http://127.0.0.1:3205'; $env:SMOKE_USERNAME='seed_alpha_owner'; $env:SMOKE_PASSWORD='Round5!AlphaBeta1'; $env:SMOKE_DEVICE_ID='qa-r5-r4-smoke'; npm run smoke:minimal` | 通过 | 在真实 QA 登录账号上跑通 login / me / dial-prefixes / notices / refresh / logout |
| `cd client && flutter analyze` | 通过 | 无静态分析问题 |
| `cd client && flutter test` | 通过 | 现有 Flutter 测试全部通过 |
| `flutter devices` | 通过 | 当前只检测到 `Windows / Chrome / Edge`，没有 Android / iOS 设备 |
| `flutter emulators` | 未通过 | 返回 `Unable to find any emulator sources` |
| `adb devices` | 未通过 | 当前环境无 `adb` 命令 |
| `flutter doctor -v` | 条件通过 | Android SDK 存在但为 `35.0.0`，Flutter 提示需要 SDK 36；当前无可用移动模拟器 |
| `Node 标准登录 + signed replay 脚本` | 通过 | 完成 `/auth/login`、双租户切换、callback hit / expired / wrong DID / wrong number、outbound completed、recording ready、`GET /calls/:id` 和 DB replay |

## 3. 冒烟结果

| ID | 关联任务卡 | 高风险区 | 结果 | 缺陷单 / 证据 |
|----|------------|----------|------|----------------|
| `SMK-01` | A, D | 租户隔离 | 通过 | `seed_alpha_owner` 走标准登录后可正常完成 `smoke:minimal` 基础链路 |
| `SMK-02` | A, B, D | 租户隔离 | 通过 | `shared_switcher` 在 `alpha / beta` 双租户间显式切换后，跨租户 `GET /calls/:id` 返回 `404` |
| `SMK-03` | B, C, D | API 契约变更 | 通过 | `POST /calls/outbound` happy path 与 signed webhook 回放均符合当前冻结契约 |
| `SMK-04` | B, D | DID 外显 | 通过 | `alpha` 与 `beta_owner` 两个正向样本都返回本租户 DID / endpoint |
| `SMK-05` | A, C, D | 回拨命中 | 通过 | inbound callback 命中 active callback 后返回 `route_callback`，并生成可查询会话 |
| `SMK-06` | A, C, D | 回拨命中 | 通过 | 错 DID、错号码、TTL 过期场景全部返回 `reject`，未出现误命中 |
| `SMK-07` | B, D | 双模式切换 | 通过 | `server_orchestrated_mode` 在 fresh runtime 上稳定执行并可被 webhook 推进 |
| `SMK-08` | B, D | 双模式切换 | 阻塞 | 当前 QA 主机没有 Android / iOS 真机或模拟器，无法执行 `direct_prefix_mode` |
| `SMK-09` | C, D | API 契约变更 | 通过 | `call_events` 的 `session_direction`、`target_endpoint_id`、`trace_id` 已在第四轮真实落库 |
| `SMK-10` | D | 综合放行 | 通过 | 当前无 P0 / P1 阻塞；剩余问题只有 1 个 P2 环境阻塞，且 owner / 下一步明确 |

## 4. 回归结果

| ID | 触发变更 | 结果 | 缺陷单 / 证据 |
|----|----------|------|----------------|
| `REG-01` | A 线程迁移或实体调整 | 通过 | migration 与 seed 可重复执行，双租户 membership 和 callback 样本未回退 |
| `REG-02` | B 线程 API 字段调整 | 通过 | `POST /calls/outbound`、`GET /calls/:id`、accepted / callback / completed / recording 事件字段已与当前代码对齐 |
| `REG-03` | B 线程拨号壳调整 | 阻塞 | `server_orchestrated_mode` 已通过，但 `direct_prefix_mode` 缺少移动端运行面 |
| `REG-04` | C 线程状态字典调整 | 通过 | `signed-replay-cookbook`、`field-alignment`、fixture alias 与当前实现一致 |
| `REG-05` | 回拨规则调整 | 通过 | active hit、expired、wrong DID、wrong number 四类场景均已真实回放 |
| `REG-06` | DID 分配策略调整 | 通过 | alpha / beta DID 与 endpoint 映射稳定；跨租户无串号 |
| `REG-07` | QA 门禁更新 | 通过 | 第四轮执行记录、缺陷清单、门禁评审已按 `33 -> 34 -> 35 -> 36` 归档 |

## 5. 冒烟 / 回归结论

```md
### Round 5 第四轮冒烟 / 回归结论

- 冒烟结果：通过 9 项，阻塞 1 项
- 回归结果：通过 6 项，阻塞 1 项
- 新增缺陷：无
- 遗留缺陷：
  - R5-R3-D-DEF-02（P2，仍有效）
- 高风险区结论：租户隔离通过；DID 选择通过；TTL 有效 / 过期通过；`server_orchestrated_mode` 通过；webhook 命中 / 误命中 / 录音回流通过；`direct_prefix_mode` 受环境阻塞
- 是否满足发布门禁：条件满足，可进入 `CONDITIONAL GO` 评审
- 是否满足下一轮启动门禁：条件满足，前提是主线程接受 `direct_prefix_mode` 环境阻塞口径
```
