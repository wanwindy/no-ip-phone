# Round 4 验收与下一步计划

## 1. 本轮验收结论

结论：Round 4 第一阶段通过。

说明：

1. Client Worker 已完成真机验证与预发布收口所需的客户端侧可见入口、回退入口与文案一致性补强。
2. Server Worker 已完成预发布 / 生产 Redis 口径冻结、发布前预检入口与最小 smoke 入口。
3. QA / Release Worker 已完成最小真机覆盖计划、缺陷分级、预发布 smoke 模板与问题收敛模板。

## 2. 主线程复核结果

- `flutter analyze` 通过。
- `flutter test` 通过。
- `npm run build` 通过。
- 服务端 `release-preflight` 在生产口径环境变量下通过。
- 服务端 `minimal-smoke` 已复跑通过。

## 3. 当前状态判断

Round 4 现在已经从“准备阶段”进入“执行阶段”。

也就是说：

1. 不是继续补文档和脚本。
2. 也不是立即进入 Round 5。
3. 下一步应当使用本轮资产去做真实真机执行、问题收敛和预发布判断。

## 4. 下一步计划

### 4.1 先做真机执行

按 `docs/qa/16-round4-minimum-real-device-coverage-plan.md` 锁定：

1. Android 4 台 + iPhone 2 台最小设备池
2. 三大运营商真实资源
3. 证据路径、日报入口、问题池编号规则

### 4.2 每日收敛问题

执行过程中同步使用：

1. `docs/qa/05-compatibility-matrix-template.md`
2. `docs/qa/14-round3-dial-exception-fallback-checklist.md`
3. `docs/qa/19-round4-issue-convergence-daily-template.md`

要求：

- 每个异常必须进入问题池
- 每个问题必须有等级、责任人、下次动作
- 开放 `P1` 默认不进入放行结论

### 4.3 候选包冻结后跑预发布 smoke

候选包冻结后，按以下顺序执行：

1. `server` 侧执行 `npm run preflight:release`
2. `server` 侧执行 `npm run smoke:minimal`
3. QA 执行 `docs/qa/18-round4-pre-release-smoke-and-conclusion-template.md`

### 4.4 再决定是否进入发布准备

只有当以下条件满足时，才建议从 Round 4 进入发布准备：

1. 最小真机覆盖计划已执行完
2. 没有开放 `P0/P1`
3. 预发布 smoke 阻塞项通过
4. 风险说明、回滚条件、责任人已冻结

## 5. 当前不建议做的事

1. 现在不建议直接开 Round 5。
2. 现在不建议继续扩新功能。
3. 现在不建议在没有真机结果的前提下给“建议发布”结论。
