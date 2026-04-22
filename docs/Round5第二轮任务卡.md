# Round 5 第二轮任务卡

> 日期：2026-04-22  
> 适用轮次：Round 5 / 第二轮  
> 前置结论：Round 5 第一轮统一验收结果为 `CONDITIONAL GO`

## 1. 第二轮目标

Round 5 第二轮不直接进入真实 trunk 落地，而是优先完成以下收口与集成动作：

1. 把第一轮的多租户与语音核心数据模型接成“可运行、可迁移、可联调”的最小后端闭环。
2. 把 `POST /calls/outbound` 从占位 API 推进到“带租户上下文、可持久化、可查询状态”的应用层骨架。
3. 把 telephony 契约里尚未收口的入呼回拨生命周期、签名和逻辑键映射补齐。
4. 用真实执行记录替代原则型 QA 文档，拿到首轮联调与门禁证据。

## 2. 本轮统一硬边界

- 不把 `direct_prefix_mode` 再扩成目标架构。
- 不引入“未知号码/匿名号码/伪造本地号”能力。
- 不绕过多租户建模直接写平台级逻辑。
- 不在契约未冻结前硬编码新的 webhook/event 名称。
- 所有线程必须使用本文件和 `docs/AgentTeams多租户语音平台开发模式.md` 中的统一回报格式。

## 3. 子线程任务卡

### 3.1 线程 A：Tenant & Data Worker

#### 任务卡 ID

`R5-R2-A`

#### 任务目标

- 新增 `tenant_endpoints`，把回拨目标从 `target_member_id` 升级为“可路由终端”模型。
- 新增 `call_events` 最小持久化结构，承接 C 线程冻结的 event 字典。
- 在不破坏现有语义的前提下，对 `call_sessions`、`callback_sessions` 做必要字段补强。
- 产出真实 migration 执行证据，而不只是 TypeScript 编译通过。

#### 输入真源

- `docs/多租户境外号码语音平台设计方案.md`
- `docs/AgentTeams多租户语音平台开发模式.md`
- `docs/Round5主线程跟踪清单.md`
- `docs/Round5第二轮主线程跟踪清单.md`
- `docs/telephony/state-dictionaries.md`
- `docs/telephony/callback-same-number-rules.md`

#### 输出物

- 新的 migration
- `tenant_endpoints`、`call_events` 对应实体和模块骨架
- 如有必要，对 `callback_sessions` 做最小字段迁移
- migration 实跑证据说明

#### 边界与不做项

- 不写客户端
- 不写 `CallsController` / `CallsService`
- 不决定 webhook 签名算法
- 不改 QA 文档

#### 写入所有权

- `server/src/database/migrations/**`
- `server/src/modules/tenant/**`
- `server/src/modules/call-session/**`
- `server/src/modules/callback/**`
- 如需新增 `call-event` 模块，仅限 `server/src/modules/call-event/**`

#### 完成定义

- `tenant_endpoints` 与 `callback_session` 的目标路由关系清晰
- `call_events` 能承载最小逻辑字段，不违背 C 线程冻结语义
- migration 实际可跑，并有执行结果
- 不新增跨租户引用漏洞

### 3.2 线程 B：API & App Worker

#### 任务卡 ID

`R5-R2-B`

#### 任务目标

- 给 `CallsService` 接上真实持久化和租户上下文，摆脱纯内存占位响应。
- 新增 `GET /calls/:id` 最小状态查询接口。
- 在客户端为 `server_orchestrated_mode` 增加最小状态刷新能力。
- 把 `CallsModule` 与 A 线程新增的实体安全接入，不继续扩大运行时边界漂移。

#### 输入真源

- `docs/多租户境外号码语音平台设计方案.md`
- `docs/AgentTeams多租户语音平台开发模式.md`
- `docs/Round5第二轮主线程跟踪清单.md`
- `docs/telephony/state-dictionaries.md`
- `docs/telephony/telephony-contract.md`
- A 线程第二轮产出的实体 / migration

#### 输出物

- `POST /calls/outbound` 的持久化版本
- `GET /calls/:id` 接口
- 客户端任务状态刷新或轮询骨架
- 一份字段映射说明

#### 边界与不做项

- 不新建数据 migration
- 不实现真实 trunk 互联
- 不改 telephony 契约文档
- 不扩写 QA 原则文档

#### 写入所有权

- `server/src/modules/calls/**`
- `server/src/modules/auth/**` 中与租户上下文解析相关的最小改动
- `server/src/app.module.ts` 的最小集成改动
- `client/lib/features/dialer/**`
- `client/lib/features/config/**` 仅在主线程明确需要时最小触达

#### 完成定义

- 创建外呼任务后能落库
- 可通过 `GET /calls/:id` 查到最小状态
- 客户端 `server_orchestrated_mode` 不再只显示“创建时快照”
- `direct_prefix_mode` 仍然可用

### 3.3 线程 C：Telephony Contract Worker

#### 任务卡 ID

`R5-R2-C`

#### 任务目标

- 补齐“入呼命中回拨后，如何推进 `call_session` 生命周期”的事件口径。
- 冻结 webhook 鉴权头、签名语义、失败响应边界。
- 冻结 SIP header / channel variable 到逻辑键的映射表。
- 补一份最小对接顺序说明，供后续 trunk / FS / Kamailio 实现线程直接照表接。

#### 输入真源

- `docs/多租户境外号码语音平台设计方案.md`
- `docs/AgentTeams多租户语音平台开发模式.md`
- `docs/Round5第二轮主线程跟踪清单.md`
- 第一轮 `docs/telephony/**`
- A/B 第二轮集成诉求

#### 输出物

- `docs/telephony/telephony-contract.md` 增补版
- `docs/telephony/state-dictionaries.md` 增补版
- `docs/telephony/header-and-channel-mapping.md`
- `docs/telephony/integration-sequence.md`

#### 边界与不做项

- 不写生产代码
- 不决定数据库列类型
- 不改客户端展示逻辑
- 不替主线程放宽 callback 规则

#### 写入所有权

- `docs/telephony/**`

#### 完成定义

- 回拨命中后的生命周期事件无歧义
- webhook 最小鉴权和签名要求可直接实现
- 逻辑键映射表完整，不需要实现线程再猜字段

### 3.4 线程 D：QA & Release Worker

#### 任务卡 ID

`R5-R2-D`

#### 任务目标

- 停止扩原则文档，改为产出真实执行记录。
- 按第一轮已落地的 `20 -> 21 -> 22 -> 23` 资产执行一次联调、冒烟和门禁评审。
- 记录首轮真实缺陷、阻塞和 owner。
- 给主线程一个可判定“是否允许进入下一阶段实现”的执行结论。

#### 输入真源

- `docs/qa/20-round5-traceability-and-risk-matrix.md`
- `docs/qa/21-round5-integration-checklist.md`
- `docs/qa/22-round5-smoke-and-regression-template.md`
- `docs/qa/23-round5-release-gate-and-next-round-entry.md`
- A/B/C 第二轮交付物

#### 输出物

- 联调执行记录
- 冒烟 / 回归执行记录
- 首轮缺陷清单
- 第二轮门禁评审结论

#### 边界与不做项

- 不再新增原则性 QA 模板，除非主线程要求
- 不写业务代码
- 不替产品或主线程修改边界

#### 写入所有权

- `docs/qa/**`

#### 完成定义

- 至少产出一轮真实执行记录
- 每个未过项都有 owner、优先级和下一步
- 能支撑主线程做 `GO / CONDITIONAL GO / NO-GO` 判断

## 4. 强制回报格式

所有子线程在第二轮结束后，必须严格使用以下模板回报，且不得省略 `线程名`：

```md
# 子线程回报

- 线程名：<Tenant & Data Worker / API & App Worker / Telephony Contract Worker / QA & Release Worker>
- 任务卡 ID：<例如 R5-R2-A>
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
