# Round 4 验收与下一步计划

## 1. 本轮验收结论

结论：Round 4 第一阶段继续执行，短信发布门槛误放行问题已关闭。

说明：

1. Client Worker 已完成真机验证与预发布收口所需的客户端侧可见入口、回退入口与文案一致性补强。
2. Server Worker 已完成预发布 / 生产 Redis 口径冻结、发布前预检入口与最小 smoke 入口；主线程已进一步补齐短信发布门槛，生产口径不再允许 `SMS_PROVIDER=noop` 误放行。
3. QA / Release Worker 已完成最小真机覆盖计划、缺陷分级、预发布 smoke 模板与问题收敛模板。

## 2. 主线程复核结果

- `flutter analyze` 通过。
- `flutter test` 通过。
- `npm run build` 通过。
- 服务端 `release-preflight` 在 `NODE_ENV=production + SMS_PROVIDER=noop` 下按预期失败。
- 服务端 `release-preflight` 在 `NODE_ENV=production + SMS_PROVIDER=aliyun` 下按预期失败，原因是当前构建尚未实现真实短信 provider。
- 服务端在 `NODE_ENV=production + SMS_PROVIDER=noop` 下启动即失败，符合 fail-fast 预期。
- 服务端 `minimal-smoke` 已在独立端口用开发态 `noop` 链路复跑通过。

## 3. 本次补充收口结果

### 3.1 `SMS_PROVIDER=noop` 误放行问题已关闭

本次补充处理后：

1. `release-preflight` 在 `NODE_ENV=production` 且 `SMS_PROVIDER=noop` 时会直接失败。
2. 服务启动时也会拒绝 `NODE_ENV=production + SMS_PROVIDER=noop`。
3. `docker-compose.yml` 不再把 production 环境写死为 `noop`。
4. `SmsService` 的 provider 解析已改成显式分支，不再出现“配置改了但实现仍然是 noop”的假象。

这意味着：

1. 之前的 `P0` 已从“隐藏风险”变成“显式阻塞”。
2. 当前版本仍然不能给出“可发布”判断，但原因已经变成“真实短信 provider 尚未接入”，而不是“预检放过了 noop”。
3. 后续只要接入真实短信 provider，再补一轮生产口径预检与 smoke，就可以继续推进放行判断。

## 4. 当前状态判断

Round 4 现在已经从“准备阶段”进入“执行阶段”。

也就是说：

1. 不是继续补文档和脚本。
2. 也不是立即进入 Round 5。
3. 下一步应当使用本轮资产去做真实真机执行、问题收敛和预发布判断。

但在进入最终放行判断前，仍需要补齐真实短信 provider 接入。

## 5. 下一步计划

### 5.1 先补真实短信 provider 接入

优先处理：

1. 按设计文档接入 `aliyun` 或 `tencent` 真实短信 provider
2. 补 provider 对应的密钥 / 签名 / 模板配置校验
3. 用真实短信验证码重新跑生产口径 `preflight:release` 与 `smoke:minimal`

### 5.2 再做真机执行

按 `docs/qa/16-round4-minimum-real-device-coverage-plan.md` 锁定：

1. Android 4 台 + iPhone 2 台最小设备池
2. 三大运营商真实资源
3. 证据路径、日报入口、问题池编号规则

### 5.3 每日收敛问题

执行过程中同步使用：

1. `docs/qa/05-compatibility-matrix-template.md`
2. `docs/qa/14-round3-dial-exception-fallback-checklist.md`
3. `docs/qa/19-round4-issue-convergence-daily-template.md`

要求：

- 每个异常必须进入问题池
- 每个问题必须有等级、责任人、下次动作
- 开放 `P1` 默认不进入放行结论

### 5.4 候选包冻结后跑预发布 smoke

候选包冻结后，按以下顺序执行：

1. `server` 侧执行 `npm run preflight:release`
2. `server` 侧执行 `npm run smoke:minimal`
3. QA 执行 `docs/qa/18-round4-pre-release-smoke-and-conclusion-template.md`

### 5.5 再决定是否进入发布准备

只有当以下条件满足时，才建议从 Round 4 进入发布准备：

1. 短信生产阻塞项已关闭
2. 最小真机覆盖计划已执行完
3. 没有开放 `P0/P1`
4. 预发布 smoke 阻塞项通过
5. 风险说明、回滚条件、责任人已冻结

## 6. 当前不建议做的事

1. 现在不建议直接开 Round 5。
2. 现在不建议继续扩新功能。
3. 现在不建议在真实短信 provider 尚未接入前给“建议发布”结论。
4. 现在不建议在没有真机结果的前提下给“建议发布”结论。
