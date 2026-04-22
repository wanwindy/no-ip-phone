# Round 5 目标与任务拆分

> 日期：2026-04-22  
> 轮次目标：为“多租户境外 DID 语音平台”建立第一轮可并行开发的工作切口。

## 1. Round 5 总目标

第一轮不追求完整语音平台上线，而是完成以下四件事：

1. 把“租户 / DID / trunk / callback / call session”这些核心域明确落库。
2. 把服务端的应用层切口切开，避免后续所有能力都挤进旧的 `auth/config/admin` 模块。
3. 把客户端从“直接拨号器”升级到“可切换为服务端编排模式”的抽象层。
4. 把 trunk/webhook/call-state/回拨匹配这些最容易返工的契约先冻结。

## 2. 第一轮拆分原则

- 按“数据域 / 应用层 / 契约文档 / QA 基线”拆。
- 优先切成低冲突写入面。
- 第一轮允许建骨架和占位，但不允许糊掉边界。
- 所有子线程都必须引用 `docs/多租户境外号码语音平台设计方案.md`。

## 3. 子线程任务卡

### 3.1 任务卡 A：多租户与语音领域建模

#### 任务目标

- 建立多租户和语音平台的第一批实体与迁移骨架。
- 至少覆盖 `tenants`、`tenant_members`、`did_inventory`、`tenant_did_assignments`、`call_sessions`、`callback_sessions`。
- 明确这些表与现有 `accounts` 的关系。
- 为行级租户隔离保留统一字段和索引策略。

#### 输入真源

- `docs/多租户境外号码语音平台设计方案.md`
- `docs/AgentTeams多租户语音平台开发模式.md`
- 当前 `server/src/database/migrations/*`
- 当前 `server/src/modules/account/entities/account.entity.ts`

#### 输出物

- 新的 migration
- 新的 entities
- 简短的数据建模说明

#### 边界与不做项

- 不写客户端
- 不实现 trunk 真实互联
- 不写完整应用层 controller/service
- 不改旧的 CLIR 前缀文案

#### 写入所有权

- `server/src/database/migrations`
- `server/src/modules/tenant/**`
- `server/src/modules/call-session/**`
- `server/src/modules/callback/**`
- 若需新增公共实体目录，需由主 agent 预先确认

#### 完成定义

- 迁移可执行
- 实体可编译
- 所有核心表都有 `tenant_id` 或说明为何不需要
- 与现有 `accounts` 关系清晰

### 3.2 任务卡 B：应用层与客户端迁移壳

#### 任务目标

- 在服务端建立可供后续编排调用的 API 壳。
- 在客户端建立 `server_orchestrated_mode` 抽象，不切断当前 `direct_prefix_mode`。
- 把拨号主流程改造成可切换实现的服务接口。
- 为后续展示“当前 DID / 回拨有效期 / 任务状态”预留 UI 数据结构。

#### 输入真源

- `docs/多租户境外号码语音平台设计方案.md`
- `client/lib/features/dialer/data/dial_service.dart`
- `server/src/app.module.ts`
- `server/src/modules/auth/**`

#### 输出物

- 服务端出呼任务 API skeleton
- 客户端新的 dial mode 抽象
- 前端状态模型或 DTO 占位
- 一份迁移说明

#### 边界与不做项

- 不写数据库迁移
- 不写 trunk 供应商接入
- 不写 QA 文档

#### 写入所有权

- `server/src/modules/calls/**`
- `server/src/modules/auth/**` 中被主线程明确允许的最小改动
- `client/lib/features/dialer/**`
- `client/lib/features/config/**` 中与新模式展示相关的最小改动

#### 完成定义

- 客户端拨号服务支持双模式抽象
- 服务端存在 `POST /calls/outbound` 类似的骨架入口
- 旧模式仍可运行
- 新模式可通过 mock 或占位对象走通基础状态流

### 3.3 任务卡 C：Telephony 契约冻结

#### 任务目标

- 冻结 trunk、inbound webhook、outbound status、recording event、call state 的契约。
- 明确 `call_session`、`callback_session`、`call_event` 的状态字典。
- 明确“同号回拨”的匹配键和 TTL 策略。

#### 输入真源

- `docs/多租户境外号码语音平台设计方案.md`
- 主线程本轮决策

#### 输出物

- 接入契约文档
- 事件字典
- 回拨匹配规则文档

#### 边界与不做项

- 不写生产代码
- 不替数据线程定数据库列类型
- 不替客户端线程改 UI

#### 写入所有权

- `docs/telephony/**`

#### 完成定义

- 契约文档可直接给后续 trunk/FreeSWITCH/Kamailio 对接使用
- 事件名称、方向、幂等键、核心字段均已冻结

### 3.4 任务卡 D：QA 与发布基线

#### 任务目标

- 建立多租户语音平台第一轮联调、回归和发布准入模板。
- 覆盖租户隔离、DID 外显、同号回拨、双模式拨号、API 契约变更风险。

#### 输入真源

- `docs/多租户境外号码语音平台设计方案.md`
- 本轮任务卡

#### 输出物

- 联调清单
- 冒烟和回归清单
- 多租户隔离测试点
- 回拨与 DID 显示验证模板
- 发布门禁清单

#### 边界与不做项

- 不写业务代码
- 不决定产品口径

#### 写入所有权

- `docs/qa/**`

#### 完成定义

- 测试项能映射到本轮四个任务卡
- 质量门禁可直接用于下一轮验收
