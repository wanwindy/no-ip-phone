# Round 5 第三轮任务卡

> 日期：2026-04-22  
> 适用轮次：Round 5 / 第三轮  
> 前置结论：Round 5 第二轮统一验收结果修正为 `CONDITIONAL GO`

## 1. 第三轮目标

Round 5 第三轮不直接进入真实 trunk 落地，而是优先把“可复测、可迁移、可验收”的最小闭环收口出来：

1. 统一为单一 `fresh build + fresh runtime + migrated QA DB` 的验收基线，不再混用旧实例或旧 dist。
2. 把数据层与第二轮已接受的 telephony 契约重新对齐，补齐 `session_direction`、目标终端和事件字段的持久化能力。
3. 让服务端真正消费这些字段，支持显式租户选择、稳定落库、稳定查询和最小事件写入。
4. 提供 QA 可直接复用的双租户、双 DID、有效 / 过期 TTL 样本，以及签名 / webhook fixture，减少“环境不完整”类阻塞。
5. 用一轮新的真实执行记录重新评估高风险区，不延续已经失效的旧阻塞结论。

## 2. 本轮统一硬边界

- `3000`、`3101` 之类旧实例仅允许作为环境漂移证据，不再作为本轮放行依据。
- QA 与主线程只认单一 fresh-build 运行面。
- `direct_prefix_mode` 继续只保留兼容，不再扩成主架构。
- 不引入新的 webhook / event 命名空间；继续统一使用 `telephony.*`。
- 不跳过 migration / seed / runtime 证据就宣布“可联调”。
- 所有子线程必须继续使用本文件的统一回报格式，且不得省略 `线程名`。

## 3. 子线程任务卡

### 3.1 线程 A：Tenant & Data Worker

#### 任务卡 ID

`R5-R3-A`

#### 任务目标

- 把数据模型与第二轮 telephony 契约对齐，至少补齐 `call_events` 对 `session_direction`、目标终端关联和最小逻辑字段的承载能力。
- 收口 `call_session.direction` 的长期语义：新实现只允许 `inbound / outbound` 作为正式业务方向，不再把 `callback` 当独立主方向扩散到新代码路径。
- 提供可重复执行的 QA 种子能力，至少覆盖：
  - 双租户
  - 双 DID
  - 每租户至少一个 `tenant_endpoint`
  - 一个有效 `callback_session`
  - 一个已过期 `callback_session`
- 产出真实的 migration + seed 执行证据，确保 QA 库从零到可测可复现。

#### 输入真源

- `docs/多租户境外号码语音平台设计方案.md`
- `docs/AgentTeams多租户语音平台开发模式.md`
- `docs/Round5第三轮主线程跟踪清单.md`
- `docs/telephony/telephony-contract.md`
- `docs/telephony/state-dictionaries.md`
- `docs/telephony/header-and-channel-mapping.md`
- `docs/qa/26-round5-r2-defect-log.md`
- `docs/qa/27-round5-r2-gate-review.md`

#### 输出物

- 新的 migration
- 必要的实体 / 模块调整
- 可重复执行的 QA seed 资产
- 一份“fresh DB 初始化顺序”说明

#### 边界与不做项

- 不写客户端
- 不写 `CallsController` / `CallsService`
- 不改 telephony 契约文档
- 不产出 QA 门禁文档

#### 写入所有权

- `server/src/database/migrations/**`
- `server/src/database/seeds/**`
- `server/src/modules/tenant/**`
- `server/src/modules/call-session/**`
- `server/src/modules/callback/**`
- `server/src/modules/call-event/**`
- 如需最小脚本接线，可触达 `server/package.json`

#### 完成定义

- QA 库可从零执行 migration 和 seed
- `tenant_members`、`tenant_endpoints`、`call_events`、`callback_sessions` 在 QA 库中真实存在
- `call_events` 逻辑字段不再落后于第二轮 telephony 真源
- 不新增跨租户引用漏洞

### 3.2 线程 B：API & App Worker

#### 任务卡 ID

`R5-R3-B`

#### 任务目标

- 交付单一 fresh-build 服务端运行面，不再依赖旧 dist 做联调。
- 让 `POST /calls/outbound` 真正消费 A 线程的租户 / DID / endpoint / callback 数据，至少做到：
  - 可显式选择租户上下文
  - 可稳定落库 `call_session`
  - 可条件创建并绑定 `callback_session.target_endpoint_id`
  - 可写入最小 `call_event`
- 强化 `GET /calls/:id`，返回与当前持久化状态一致的最小任务视图。
- 客户端继续保持双模式，但 `server_orchestrated_mode` 要能消费新的任务状态，不再只依赖旧占位语义。

#### 输入真源

- `docs/多租户境外号码语音平台设计方案.md`
- `docs/AgentTeams多租户语音平台开发模式.md`
- `docs/Round5第三轮主线程跟踪清单.md`
- `docs/telephony/telephony-contract.md`
- `docs/telephony/state-dictionaries.md`
- A 线程第三轮产出的 migration / seed / 实体
- `docs/qa/26-round5-r2-defect-log.md`

#### 输出物

- 稳定的 `POST /calls/outbound`
- 稳定的 `GET /calls/:id`
- 显式租户选择契约
- 一份 fresh-build 运行说明

#### 边界与不做项

- 不新建数据 migration
- 不改 telephony 契约文档
- 不接真实 trunk
- 不继续扩大客户端范围到完整租户管理 UI

#### 写入所有权

- `server/src/modules/calls/**`
- `server/src/modules/auth/**`
- `server/src/app.module.ts` 的最小集成改动
- `client/lib/features/dialer/**`
- 如需最小配置触达，仅限 `client/lib/features/config/**`

#### 完成定义

- `npm run build` 通过，且 fresh build 可直接启动
- `POST /calls/outbound` 在 fresh runtime + QA 种子库上返回成功
- `GET /calls/:id` 能读到最新持久化状态
- 显式租户选择可用于双租户 QA 验证
- `direct_prefix_mode` 仍然可用

### 3.3 线程 C：Telephony Contract Worker

#### 任务卡 ID

`R5-R3-C`

#### 任务目标

- 不再扩主契约语义，转为补齐“可执行 fixture”层资产。
- 提供 webhook 验签测试向量，至少覆盖：
  - 固定 body
  - 固定 timestamp
  - 固定 nonce
  - 固定 secret
  - 期望 canonical string
  - 期望 signature
- 提供最小 webhook payload fixture，至少覆盖：
  - `telephony.inbound.received`
  - `telephony.callback.target.ringing`
  - `telephony.callback.bridged`
  - `telephony.outbound.accepted`
  - `telephony.outbound.completed`
  - `telephony.recording.ready`
- 给 A/B/D 增补一份“字段对齐说明”，明确逻辑键、持久化列、API 字段之间的映射关系。

#### 输入真源

- `docs/多租户境外号码语音平台设计方案.md`
- `docs/AgentTeams多租户语音平台开发模式.md`
- `docs/Round5第三轮主线程跟踪清单.md`
- 第二轮已接受的 `docs/telephony/**`
- `docs/qa/26-round5-r2-defect-log.md`

#### 输出物

- 验签测试向量文档
- 最小 webhook payload fixtures
- 字段对齐说明

#### 边界与不做项

- 不写生产代码
- 不决定数据库列类型
- 不新增新的主状态或事件命名
- 不修改 QA 结论文档

#### 写入所有权

- `docs/telephony/**`

#### 完成定义

- A/B 可直接用 fixture 写最小实现或测试
- D 可直接用 fixture 做 QA 复测准备
- 不引入新的契约歧义

### 3.4 线程 D：QA & Release Worker

#### 任务卡 ID

`R5-R3-D`

#### 任务目标

- 只基于单一 fresh-build 运行面和已迁移 QA 库做复测。
- 重跑高风险区，不再把已失效的旧阻塞继续当成当前事实。
- 把第二轮缺陷单更新成“仍有效 / 已解决 / 已过时”三类，避免主线程继续背旧包袱。
- 重新产出执行记录、缺陷清单和门禁评审结论。

#### 输入真源

- `docs/qa/20-round5-traceability-and-risk-matrix.md`
- `docs/qa/21-round5-integration-checklist.md`
- `docs/qa/22-round5-smoke-and-regression-template.md`
- `docs/qa/23-round5-release-gate-and-next-round-entry.md`
- `docs/qa/24-round5-r2-integration-execution-record.md`
- `docs/qa/25-round5-r2-smoke-regression-record.md`
- `docs/qa/26-round5-r2-defect-log.md`
- `docs/qa/27-round5-r2-gate-review.md`
- A/B/C 第三轮输出物

#### 输出物

- 第三轮联调执行记录
- 第三轮冒烟 / 回归执行记录
- 第三轮缺陷清单
- 第三轮门禁评审结论

#### 边界与不做项

- 不新增原则性 QA 模板，除非主线程要求
- 不写业务代码
- 不替主线程修改边界或验收口径

#### 写入所有权

- `docs/qa/**`

#### 完成定义

- 只认单一 fresh-build 运行面
- 每条缺陷都标明“仍有效 / 已解决 / 已过时”
- 高风险区至少覆盖租户隔离、DID 选择、TTL 有效 / 过期、`server_orchestrated_mode`
- 能支撑主线程做 `GO / CONDITIONAL GO / NO-GO` 判断

## 4. 强制回报格式

所有子线程在第三轮结束后，必须严格使用以下模板回报，且不得省略 `线程名`：

```md
# 子线程回报

- 线程名：<Tenant & Data Worker / API & App Worker / Telephony Contract Worker / QA & Release Worker>
- 任务卡 ID：<例如 R5-R3-A>
- 当前状态：<completed / partial / blocked>
- 真源版本：<引用本轮实际采用的文档版本或日期>

## 1. 本轮完成内容
- ...

## 2. 文件清单
- [新增] <绝对路径>
- [修改] <绝对路径>

## 3. 关键决策与假设
- ...

## 4. 验证结果
- 命令：
- 结果：
- 未验证项：

## 5. 风险 / 阻塞
- ...

## 6. 需要主线程决策
- ...

## 7. 下一轮建议
- ...
```

### 补充要求

- `线程名` 必须与任务卡一一对应。
- `验证结果` 必须写明跑过的命令；如果没跑，要明确写“未执行”。
- `需要主线程决策` 不能为空；没有时写“无”。
- 文件清单必须使用绝对路径。
- 若引用旧缺陷或旧门禁，必须明确标注“仍有效 / 已解决 / 已过时”。
