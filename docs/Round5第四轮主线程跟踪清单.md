# Round 5 第四轮主线程跟踪清单

> 主 agent 使用  
> 日期：2026-04-22

## 1. 本轮冻结项

- Round 5 第三轮统一验收结果记为 `CONDITIONAL GO`
- QA 与主线程仍只认单一 `fresh build + fresh runtime + migrated / seeded QA DB`
- `X-Tenant-Id` 仍是唯一显式租户选择契约
- `session_direction` 仍是正式公共逻辑键
- 第三轮已被当前代码推翻的阻塞不得继续沿用为当前事实
- `direct_prefix_mode` 继续仅作兼容模式
- 本轮目标是“签名 webhook 回放 + callback 命中链路 + 登录态 QA 验证”，不是“真实 trunk 商用稳定”

## 2. 第四轮子线程状态

| 线程 | 名称 | 当前状态 | 第四轮目标 |
|------|------|----------|------------|
| A | Tenant & Data Worker | 待启动 | 可登录 QA 身份 + 单账号双租户 membership |
| B | API & App Worker | 待启动 | 最小 webhook 消费闭环 + fresh runtime 回放 |
| C | Telephony Contract Worker | 待启动 | field-alignment 收口 + signed replay cookbook |
| D | QA & Release Worker | 待启动 | 登录态双租户复测 + webhook 回放 + 兼容模式证据 |

## 3. 主线程重点盯防项

- A 是否真的让 seed 账号可登录，而不是只补文档说明
- A 是否提供“单账号双租户 membership”，而不是继续依赖两个独立账号模拟切换
- B 是否仍保持单一 `X-Tenant-Id` 契约，不新增 query/body 版本
- B 是否把第三轮已被推翻的 `accepted` 事件 gap 当成旧结论继续传播
- C 是否把 `field-alignment.md` 刷新到当前代码状态，而不是延续第三轮过时 gap
- D 是否真正用标准 `/auth/login` + fresh runtime 做复测，而不是再回退到临时 token
- D 是否把 fixture 回放通过与真实 trunk 稳定性清楚区分

## 4. 第四轮验收门槛

只有当以下条件同时满足，主线程才考虑把结论从 `CONDITIONAL GO` 继续上提：

1. A 线程：QA seed 账号可登录，且至少一个账号拥有双租户 active membership。
2. B 线程：fresh runtime 可消费签名 webhook，并在持久化层推进 inbound callback / outbound / recording 的最小状态。
3. C 线程：`field-alignment.md` 已收口，signed replay cookbook 可直接被 B / D 使用。
4. D 线程：标准登录路径、双租户切换、callback 命中 / 误命中回放、录音回流至少各有一轮真实执行证据。
5. D 线程：`direct_prefix_mode` 有真机或模拟器证据，或给出明确环境阻塞且主线程认可。

## 5. 主线程预设决策

- 若 A 线程仍不给可登录 seed 凭据，D 线程不得再用“临时 JWT”替代正式登录路径宣布通过。
- 若 B 线程新增第二套租户选择契约，主线程优先要求收口，不接受并行方案。
- 若 C 线程继续保留已过时 gap，主线程不采纳对应文档作为当前门禁依据。
- 若 D 线程把 fixture 回放通过表述成“真实 callback 全链路稳定”，主线程会直接回退该门禁结论。
