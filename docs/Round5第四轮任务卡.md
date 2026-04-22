# Round 5 第四轮任务卡

> 日期：2026-04-22  
> 适用轮次：Round 5 / 第四轮  
> 前置结论：Round 5 第三轮统一验收结果为 `CONDITIONAL GO`

## 1. 第四轮目标

Round 5 第四轮不直接进入真实 trunk 商用接入，而是优先完成“可登录 QA 身份 + 签名 webhook 回放 + callback 命中链路 + 兼容模式证据”的最小闭环：

1. 让 QA seed 从“可落库样本”升级为“可登录、可切租户、可复测”的真实测试身份。
2. 在 fresh runtime 上补齐最小 webhook 消费闭环，允许用第三轮 fixture 与签名向量回放 inbound / callback / recording 事件。
3. 用同一套 seed、fixture 和 fresh runtime 复测 callback 命中 / 误命中、出呼状态推进、录音回流。
4. 继续保留 `direct_prefix_mode` 兼容模式，但补上至少一轮真机或模拟器兼容证据。
5. 清理第三轮仍然过时的 gap 文档和缺陷结论，避免主线程继续背旧包袱。

## 2. 本轮统一硬边界

- 仍然只认单一 `fresh build + fresh runtime + migrated / seeded QA DB` 运行面。
- 不把“第三轮已被当前代码推翻”的旧缺陷继续沿用为当前事实。
- 不引入新的 telephony 主状态、事件命名或第二套租户选择契约。
- `direct_prefix_mode` 继续仅作兼容模式，不扩成主架构。
- 不把“fixture 回放通过”等同于“真实 trunk 全链路稳定”。
- 所有子线程必须继续使用本文件的统一回报格式，且不得省略 `线程名`。

## 3. 子线程任务卡

### 3.1 线程 A：Tenant & Data Worker

#### 任务卡 ID

`R5-R4-A`

#### 任务目标

- 把第三轮 QA seed 账号升级为真实可登录凭据，至少给出稳定用户名 / 密码。
- 新增“单账号双租户 membership”样本，支持同一 app_user 在 `alpha / beta` 两租户间显式切换。
- 如有必要，补一份最小 seed 说明，明确：
  - 可登录 QA 账号
  - 默认租户
  - 可选租户
  - 对应 DID / endpoint / callback 样本
- 不破坏第三轮已成立的 migration / seed 可重复执行能力。

#### 输入真源

- `docs/多租户境外号码语音平台设计方案.md`
- `docs/AgentTeams多租户语音平台开发模式.md`
- `docs/Round5第四轮主线程跟踪清单.md`
- `docs/qa/30-round5-r3-defect-log.md`
- `docs/qa/31-round5-r3-gate-review.md`
- 第三轮 seed / migration 现状

#### 输出物

- QA seed 更新
- 如有必要的最小 migration
- 一份 seed 身份与样本说明

#### 边界与不做项

- 不写客户端
- 不写 webhook controller / service
- 不改 telephony 契约文档
- 不直接改 QA 门禁结论

#### 写入所有权

- `server/src/database/migrations/**`
- `server/src/database/seeds/**`
- `server/src/modules/tenant/**`
- 如需最小说明文档，仅限 `docs/qa/**` 或 `docs/telephony/fixtures/**` 的数据样本说明补充

#### 完成定义

- D 线程可以使用 seed 账号走标准 `/auth/login`
- 至少有一个账号拥有双租户 active membership
- seed 可重复执行
- 不破坏第三轮已通过的 QA 样本结构

### 3.2 线程 B：API & App Worker

#### 任务卡 ID

`R5-R4-B`

#### 任务目标

- 在 fresh runtime 上实现最小 webhook 消费闭环：
  - `POST /webhooks/inbound-call`
  - `POST /webhooks/call-status`
  - `POST /webhooks/recording-ready`
- 接入第三轮签名规则和 fixture，至少支持：
  - inbound callback 命中返回 `route_callback`
  - inbound callback 未命中 / 过期返回 `reject`
  - `telephony.callback.target.ringing`
  - `telephony.callback.bridged`
  - `telephony.outbound.completed`
  - `telephony.recording.ready`
- 不再把 accepted 事件字段 gap 作为现行问题带入；若有真实 gap，以 fresh runtime 和查库结果重新界定。
- 如时间允许，在不扩完整租户管理 UI 的前提下，把客户端“手输租户 ID”升级成最小只读租户来源；若做不到，保持现状但不要新增第二套租户选择契约。

#### 输入真源

- `docs/多租户境外号码语音平台设计方案.md`
- `docs/AgentTeams多租户语音平台开发模式.md`
- `docs/Round5第四轮主线程跟踪清单.md`
- `docs/telephony/telephony-contract.md`
- `docs/telephony/state-dictionaries.md`
- `docs/telephony/header-and-channel-mapping.md`
- `docs/telephony/fixtures/**`
- A 线程第四轮 seed 更新
- `docs/qa/30-round5-r3-defect-log.md`

#### 输出物

- webhook 运行时最小实现
- fresh runtime 验证说明
- 如有改动，客户端最小租户来源能力

#### 边界与不做项

- 不改 telephony 主契约语义
- 不接真实 trunk 供应商
- 不扩成完整租户管理 UI
- 不回退第三轮已成立的 `X-Tenant-Id` 单一契约

#### 写入所有权

- `server/src/modules/calls/**`
- 如需新增 webhook 模块，仅限 `server/src/modules/telephony/**`
- `server/src/modules/auth/**` 中与单一租户契约相关的最小改动
- `server/src/app.module.ts` 的最小集成改动
- `client/lib/features/dialer/**`

#### 完成定义

- D 线程可用 fixture 和签名向量在 fresh runtime 上回放 webhook
- inbound callback 至少能区分命中 / 过期 / 未命中
- `GET /calls/:id` 能读到 webhook 推进后的最新持久化状态
- 不出现第二套显式租户选择契约

### 3.3 线程 C：Telephony Contract Worker

#### 任务卡 ID

`R5-R4-C`

#### 任务目标

- 刷新 `field-alignment.md`，移除第三轮已经过时的 gap，并只保留当前 fresh runtime 仍真实存在的字段差异。
- 补一份“signed replay cookbook”，把第三轮 fixture、签名向量和 A 线程 seed 别名串起来，给 B / D 直接复放使用。
- 若 A 线程新增了真实 QA 账号或 shared membership 样本，更新 fixture 别名映射说明。

#### 输入真源

- `docs/多租户境外号码语音平台设计方案.md`
- `docs/AgentTeams多租户语音平台开发模式.md`
- `docs/Round5第四轮主线程跟踪清单.md`
- 第三轮已接受的 `docs/telephony/**`
- A 线程第四轮 seed 说明
- `docs/qa/30-round5-r3-defect-log.md`

#### 输出物

- 更新后的 `field-alignment.md`
- signed replay cookbook
- 如有必要，fixture alias 说明更新

#### 边界与不做项

- 不扩主契约
- 不写生产代码
- 不决定数据库列类型
- 不新增新的事件名或状态机

#### 写入所有权

- `docs/telephony/**`

#### 完成定义

- `field-alignment.md` 不再包含已被当前代码推翻的旧 gap
- B / D 可以直接按 cookbook 回放 fixture
- 不引入新的契约歧义

### 3.4 线程 D：QA & Release Worker

#### 任务卡 ID

`R5-R4-D`

#### 任务目标

- 继续只基于单一 fresh runtime 做复测。
- 使用 A 线程提供的真实 QA 登录账号，走标准 `/auth/login` 后再做双租户切换验证。
- 使用 C 的 cookbook 和 fixture，对 B 的 webhook 运行面至少回放：
  - inbound callback 命中
  - inbound callback 过期
  - inbound callback 错 DID / 错号码
  - outbound completed
  - recording ready
- 补一轮 `direct_prefix_mode` 真机或模拟器证据；若环境不具备，明确记录阻塞条件。
- 重新产出执行记录、缺陷清单和门禁评审结论。

#### 输入真源

- `docs/qa/20-round5-traceability-and-risk-matrix.md`
- `docs/qa/21-round5-integration-checklist.md`
- `docs/qa/22-round5-smoke-and-regression-template.md`
- `docs/qa/23-round5-release-gate-and-next-round-entry.md`
- `docs/qa/28-round5-r3-integration-execution-record.md`
- `docs/qa/29-round5-r3-smoke-regression-record.md`
- `docs/qa/30-round5-r3-defect-log.md`
- `docs/qa/31-round5-r3-gate-review.md`
- A / B / C 第四轮输出物

#### 输出物

- 第四轮联调执行记录
- 第四轮冒烟 / 回归执行记录
- 第四轮缺陷清单
- 第四轮门禁评审结论

#### 边界与不做项

- 不新增原则性 QA 模板，除非主线程要求
- 不写业务代码
- 不替主线程修改验收口径

#### 写入所有权

- `docs/qa/**`

#### 完成定义

- 只认单一 fresh runtime
- 使用标准登录路径完成双租户切换验证
- webhook 回放覆盖命中 / 误命中 / 过期 / 录音回流
- `direct_prefix_mode` 有真机或模拟器证据，或有明确不可执行阻塞记录
- 能支撑主线程做 `GO / CONDITIONAL GO / NO-GO` 判断

## 4. 强制回报格式

所有子线程在第四轮结束后，必须严格使用以下模板回报，且不得省略 `线程名`：

```md
# 子线程回报

- 线程名：<Tenant & Data Worker / API & App Worker / Telephony Contract Worker / QA & Release Worker>
- 任务卡 ID：<例如 R5-R4-A>
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
- 若引用第三轮缺陷，必须明确标注“仍有效 / 已解决 / 已过时”。
