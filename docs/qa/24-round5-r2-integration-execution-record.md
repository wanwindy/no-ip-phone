# Round 5 第二轮联调执行记录

> 日期：2026-04-22  
> 线程：QA & Release Worker  
> 任务卡 ID：`R5-R2-D`  
> 结论：本轮已形成真实联调记录，但联调结论为 `NO-GO`

## 1. 执行范围

- 依据 `docs/qa/20-round5-traceability-and-risk-matrix.md`、`21-round5-integration-checklist.md` 执行第二轮首轮联调。
- 本记录不新增原则模板，只记录真实命令、真实结果、真实阻塞。
- 本次联调同时区分了三类运行面：
  - `http://127.0.0.1:3000`：本地已有旧服务实例，可用于基础 smoke。
  - `http://127.0.0.1:3101`：基于旧 dist 启动的隔离实例，验证到第一轮 skeleton 行为。
  - `http://127.0.0.1:3102`：在最新工作树执行 `npm run build` 后由 emitted dist 启动的隔离实例，验证第二轮最新运行面。

## 2. 联调前准备结果

| ID | 结果 | 说明 | owner |
|----|------|------|-------|
| `INT-PRE-01` | 通过 | 四份真源与 20 -> 23 QA 资产已复核。 | D |
| `INT-PRE-02` | 未通过 | 没有可直接复用的双租户、双 DID、有效 / 过期 TTL 测试数据；最新运行面还缺 `tenant_members` 表。 | A |
| `INT-PRE-03` | 部分通过 | 已拿到 `POST /calls/outbound` 真实请求 / 响应样例，但样例分裂为“旧 dist skeleton 成功”和“最新 emitted dist 返回 500”。 | B |
| `INT-PRE-04` | 未通过 | callback / state 字典存在，但 `header-and-channel-mapping.md`、`integration-sequence.md` 缺失，签名细节未冻结。 | C |
| `INT-PRE-05` | 部分通过 | 客户端源码已具备 `direct_prefix_mode` / `server_orchestrated_mode` 和任务状态刷新入口，`flutter analyze` / `flutter test` 通过；未做真机直拨执行。 | B |
| `INT-PRE-06` | 通过 | 本轮缺陷口径统一落到 `docs/qa/26-round5-r2-defect-log.md`。 | D |

## 3. 命令记录

### 3.1 基础命令

```powershell
npm run smoke:minimal
flutter analyze
flutter test
npm run build
```

结果：

- `npm run smoke:minimal`：通过，旧实例 `3000` 上 auth/config 基础链路可用。
- `flutter analyze`：通过。
- `flutter test`：通过。
- `npm run build`：以最新工作树重跑时失败，阻断 fresh build 放行。

### 3.2 运行面验证命令

```powershell
Invoke-WebRequest http://127.0.0.1:3000/api/v1/config/notices
```

结果：

- 返回 `401`，确认本地 `3000` 端口已有服务存活。

```powershell
POST http://127.0.0.1:3101/api/v1/auth/login
POST http://127.0.0.1:3101/api/v1/calls/outbound
GET  http://127.0.0.1:3101/api/v1/calls/{taskId}
```

结果：

- `3101` 上 `POST /calls/outbound` 返回 `201`，但响应仍是第一轮 skeleton：
  - `status=accepted`
  - `displayDid=+617676021983`
  - `callbackWindow.ttlSeconds=7200`
  - `note=Round 5 skeleton only. Trunk orchestration is not connected yet.`
- `GET /calls/{taskId}` 返回 `404`。

```powershell
POST http://127.0.0.1:3102/api/v1/auth/login
POST http://127.0.0.1:3102/api/v1/calls/outbound
```

结果：

- `3102` 上最新 emitted dist 已映射 `POST /calls/outbound` 和 `GET /calls/:id`。
- 但 `POST /calls/outbound` 返回 `500`。
- 服务日志给出根因：`relation "tenant_members" does not exist`。

### 3.3 静态核对命令

```powershell
Test-Path server/src/modules/tenant/entities/tenant-endpoint.entity.ts
Test-Path server/src/modules/call-event/entities/call-event.entity.ts
Test-Path docs/telephony/header-and-channel-mapping.md
Test-Path docs/telephony/integration-sequence.md
```

结果：

- `tenant-endpoint.entity.ts`：存在。
- `call-event.entity.ts`：存在。
- `header-and-channel-mapping.md`：不存在。
- `integration-sequence.md`：不存在。

## 4. 联调执行结果

| ID | 结果 | 说明 | owner |
|----|------|------|-------|
| `INT-01` | 部分通过 | 源码已补 `tenant_id`、`tenant_endpoints`、`call_events` 相关结构；但最新运行面无法完成依赖这些表的联调。 | A |
| `INT-02` | 阻塞 | 无法执行跨租户验证；本地库缺 `tenant_members` 表，且无双租户测试数据。 | A |
| `INT-03` | 未通过 | `3101` 只返回占位 DID；`3102` 在 DID 选择前即因租户表缺失失败。 | A, B |
| `INT-04` | 未通过 | `POST /calls/outbound` 在最新 emitted dist 上返回 `500`，不满足第二轮联调标准。 | B |
| `INT-05` | 未通过 | `server_orchestrated_mode` 最新运行面无法成功创建任务。 | B |
| `INT-06` | 未验证 | 客户端兼容直拨代码路径存在，但本轮未做真机 / 系统拨号器执行。 | B |
| `INT-07` | 阻塞 | 无法基于最新运行面核对 `call_session` / `callback_session` 实际落库。 | A, B |
| `INT-08` | 未验证 | 本轮未具备可执行 callback 命中环境。 | A, C |
| `INT-09` | 未验证 | 本轮未具备错误 DID / TTL / 跨租户回拨执行环境。 | A, C |
| `INT-10` | 部分通过 | 客户端源码已有状态刷新按钮和 `GET /calls/:id` API；但服务端最新运行面未跑通。 | B |
| `INT-11` | 未通过 | C 线程第二轮文档缺 `header-and-channel-mapping.md`、`integration-sequence.md`，签名要求不完整。 | C |
| `INT-12` | 未通过 | 高风险区证据不足，无法进入门禁放行。 | D |

## 5. 本轮联调结论

```md
### Round 5 第二轮联调结论

- 联调日期：2026-04-22
- 联调环境：本地旧实例 3000；隔离实例 3101（旧 dist）；隔离实例 3102（最新 emitted dist）
- 覆盖任务卡：A / B / C / D
- 通过项：INT-PRE-01、INT-PRE-06
- 部分通过项：INT-PRE-03、INT-PRE-05、INT-01、INT-10
- 未通过项：INT-PRE-02、INT-PRE-04、INT-03、INT-04、INT-05、INT-11、INT-12
- 阻塞项：INT-02、INT-07
- 未验证项：INT-06、INT-08、INT-09
- 是否允许进入冒烟：否
- 结论签字：D（执行）；主线程待判定
```
