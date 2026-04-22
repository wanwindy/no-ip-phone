# Telephony 契约冻结（Round 5）

> 日期：2026-04-22  
> 适用范围：`D:\no-ip-phone\docs\telephony\**`  
> 真源优先级：  
> 1. `docs/多租户境外号码语音平台设计方案.md`  
> 2. `docs/AgentTeams多租户语音平台开发模式.md`  
> 3. `docs/Round5第四轮任务卡.md`  
> 4. `docs/Round5第四轮主线程跟踪清单.md`  
> 5. 第三轮已接受的 `docs/telephony/**`  
> 6. `docs/qa/32-round5-r4-seed-login-reference.md`  
> 7. `docs/qa/30-round5-r3-defect-log.md`

## 1. 本目录目标

本目录用于冻结 Round 5 的 telephony 对接契约，只定义：

- trunk 逻辑契约
- inbound webhook 契约
- outbound status 契约
- recording event 契约
- `call_session` / `callback_session` / `call_event` 的状态字典
- 同号回拨的匹配键、TTL、幂等键和失败回退规则

本目录明确不做：

- 不决定数据库列类型
- 不决定 migration 结构
- 不写生产代码
- 不改 Flutter 页面或交互

## 2. 文档索引

- `telephony-contract.md`：接入契约、字段、方向、幂等键、响应约定
- `state-dictionaries.md`：状态字典、事件字典、状态迁移语义
- `callback-same-number-rules.md`：同号回拨匹配、TTL、回退、冲突处理
- `header-and-channel-mapping.md`：SIP header / FreeSWITCH channel variable 到逻辑键的映射
- `integration-sequence.md`：最小对接顺序与实现先后关系
- `field-alignment.md`：逻辑键、持久化列、API 字段的对齐说明
- `signed-replay-cookbook.md`：把 fixture、签名向量和 QA seed 串起来的复放手册
- `fixtures/README.md`：第四轮可执行 fixture 索引与 alias 说明
- `fixtures/webhook-signature-test-vectors.md`：固定 webhook 验签测试向量
- `fixtures/webhook/*.json`：最小 webhook payload fixtures

## 3. 共同冻结项

- 平台目标是“多租户境外 DID 语音平台”，不是 CLIR 前缀拨号器。
- 同号回拨的业务匹配基线保持为 `display_did + remote_number + TTL`。
- `direct_prefix_mode` 仅为兼容模式，不进入本目录的 telephony 主契约。
- 展示号底层统一使用 E.164；`0061...` 仅属于 UI 展示派生，不属于接口入参格式。
- `callback_session` 默认继续采用“首次成功桥接即 `fulfilled`”。
- `session_direction` 已接受为正式公共逻辑键。
- Round 5 第四轮只刷新字段对齐、fixture alias 和 signed replay 手册，不扩主契约语义。
