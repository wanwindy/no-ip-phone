# Telephony Fixtures（Round 5 第四轮）

> 目标：为 A / B / D 线程提供可直接复用的 webhook fixture、验签测试向量和 signed replay 别名说明，不扩主契约语义。

## 1. 文件索引

- `webhook-signature-test-vectors.md`：固定 webhook 验签向量
- `../signed-replay-cookbook.md`：把 fixture、向量和 QA seed 串起来的复放手册
- `webhook/telephony.inbound.received.json`
- `webhook/telephony.callback.target.ringing.json`
- `webhook/telephony.callback.bridged.json`
- `webhook/telephony.outbound.accepted.json`
- `webhook/telephony.outbound.completed.json`
- `webhook/telephony.recording.ready.json`

## 2. 使用原则

- `webhook/*.json` 是语义 fixture，可直接给 A / B 写最小测试或给 D 做 QA 回放。
- `webhook-signature-test-vectors.md` 中的 body 是“精确字节级向量”，用于验签测试；不要直接拿格式化后的 JSON 文件字节去比对签名。
- 真实回放前，先按 `../signed-replay-cookbook.md` 把 fixture 占位值替换成第四轮 seed / fresh runtime 的真实值。
- 所有 fixture 都沿用第二轮已接受的事件名、方向和字段语义，不新增新的命名空间或状态值。

## 3. fixture 别名

本目录里的占位值采用稳定别名，便于 A 线程第四轮 seed、B 的最小实现和 D 的 QA 回放使用同一套样本：

- 登录账号别名：
  - `shared_switcher` -> `seed_alpha_owner / Round5!AlphaBeta1`
  - `beta_owner` -> `seed_beta_owner / Round5!BetaOwner1`
- 租户与 membership：
  - `tenant_alpha` -> `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
  - `tenant_beta` -> `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`
  - `membership_beta_shared` -> `bbbbaaaa-3333-4333-8333-333333333333`
- DID / endpoint / callback：
  - `did_alpha_e164` -> `+617676021983`
  - `did_beta_e164` -> `+442080001111`
  - `endpoint_alpha` -> `eeee1111-1111-4111-8111-111111111111`
  - `endpoint_beta` -> `eeee2222-2222-4222-8222-222222222222`
  - `callback_active_alpha` -> `fafa1111-1111-4111-8111-111111111111`
  - `callback_expired_beta` -> `fafa2222-2222-4222-8222-222222222222`
- fixture 占位引用：
  - `11111111-1111-4111-8111-111111111111`：占位 `call_session_ref`，回放前替换成真实命中返回值或明确指定的 seed 样本
  - `22222222-2222-4222-8222-222222222222`：占位 `callback_session_ref`，回放前替换成真实命中返回值或 `callback_active_alpha`
  - `33333333-3333-4333-8333-333333333333`：占位 `target_endpoint_ref`，回放前替换成真实命中返回值或 `endpoint_alpha`
  - `44444444-4444-4444-8444-444444444444`：占位出呼 `call_session_ref`，回放前替换成 fresh outbound `taskId`

这些值只是 fixture 级别稳定标识；真实复放时以 `docs/qa/32-round5-r4-seed-login-reference.md` 和 `../signed-replay-cookbook.md` 为准，不决定数据库列类型。
