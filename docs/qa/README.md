# QA / Release 交付索引

## 适用范围

本目录面向阶段 1 到 Round 4 的 QA / Release 资产，既覆盖基础测试，也包含 Round 2 联调材料、Round 3 真机执行材料，以及 Round 4 的放行与问题收敛资产。

## 交付物清单

| 文件 | 用途 |
|------|------|
| [01-stage1-test-strategy.md](./01-stage1-test-strategy.md) | 阶段 1 测试策略、准入/准出标准、质量门槛 |
| [02-requirements-traceability.md](./02-requirements-traceability.md) | 需求追踪矩阵，确保测试点可回溯到方案/设计/计划 |
| [03-api-integration-cases.md](./03-api-integration-cases.md) | 接口联调用例，覆盖 auth/config 主链路 |
| [04-smoke-regression-checklists.md](./04-smoke-regression-checklists.md) | 冒烟清单与回归清单 |
| [05-compatibility-matrix-template.md](./05-compatibility-matrix-template.md) | 机型/系统/运营商/前缀真机兼容矩阵（执行版） |
| [06-preprod-release-checklist.md](./06-preprod-release-checklist.md) | 预生产验收与发布检查表 |
| [07-risk-blocker-rollback-plan.md](./07-risk-blocker-rollback-plan.md) | 风险、阻塞与回滚预案清单 |
| [08-round2-integration-guide.md](./08-round2-integration-guide.md) | Round 2 联调执行顺序与操作说明 |
| [09-round2-integration-record-template.md](./09-round2-integration-record-template.md) | Round 2 联调记录与验收模板 |
| [10-round2-test-data-env-checklist.md](./10-round2-test-data-env-checklist.md) | Round 2 联调测试数据与环境准备清单 |
| [11-round2-local-smoke-record.md](./11-round2-local-smoke-record.md) | Round 2 本地 smoke 执行记录与通过结论 |
| [12-round3-real-device-execution-guide.md](./12-round3-real-device-execution-guide.md) | Round 3 真机验证执行顺序、记录要求、失败分流 |
| [13-round3-field-record-and-daily-template.md](./13-round3-field-record-and-daily-template.md) | Round 3 现场记录 / 日报模板，支持多机并行 |
| [14-round3-dial-exception-fallback-checklist.md](./14-round3-dial-exception-fallback-checklist.md) | Round 3 拨号异常与回退验证清单 |
| [15-round3-redis-smoke-record.md](./15-round3-redis-smoke-record.md) | Round 3 服务端 Redis 健康链路、回退与恢复烟测记录 |
| [16-round4-minimum-real-device-coverage-plan.md](./16-round4-minimum-real-device-coverage-plan.md) | Round 4 真机最小覆盖计划，定义最小放行样本与执行顺序 |
| [17-round4-defect-severity-and-release-gate.md](./17-round4-defect-severity-and-release-gate.md) | Round 4 缺陷分级、阻塞口径与放行门槛 |
| [18-round4-pre-release-smoke-and-conclusion-template.md](./18-round4-pre-release-smoke-and-conclusion-template.md) | Round 4 预发布 smoke 清单与结论模板 |
| [19-round4-issue-convergence-daily-template.md](./19-round4-issue-convergence-daily-template.md) | Round 4 真机问题收敛日报与阶段结论模板 |

## 统一边界

- 覆盖阶段 1 到 Round 4 的测试、联调、发布保障。
- 不写客户端或服务端业务实现。
- 不替代主 agent 调整产品能力边界。
- 所有测试点默认遵循“尝试隐藏来电显示，不承诺 100% 成功”的产品边界。
- Round 2 的 auth 契约保持不变，`logout` 仍然表示“注销当前 refresh token”。
- Round 4 不允许在没有真机结果的前提下伪造“已通过”结论。

## 主要依赖

| 依赖项 | 归属 |
|--------|------|
| 登录、鉴权、配置接口契约 | Server Worker |
| 客户端登录态守卫、拨号页壳、前缀选择与系统拨号器调起 | Client Worker |
| 真机、SIM 卡、运营商环境、预生产环境 | QA / Release + 运维 |
| 产品边界、文案、范围冻结 | 主 agent / 产品 |

## 使用顺序

1. 先看 [01-stage1-test-strategy.md](./01-stage1-test-strategy.md)。
2. 再看 [02-requirements-traceability.md](./02-requirements-traceability.md)。
3. Round 2 联调和基础 smoke 参考 [03-api-integration-cases.md](./03-api-integration-cases.md)、[04-smoke-regression-checklists.md](./04-smoke-regression-checklists.md)、[08-round2-integration-guide.md](./08-round2-integration-guide.md)、[09-round2-integration-record-template.md](./09-round2-integration-record-template.md)、[10-round2-test-data-env-checklist.md](./10-round2-test-data-env-checklist.md) 和 [11-round2-local-smoke-record.md](./11-round2-local-smoke-record.md)。
4. Round 3 真机现场执行优先看 [05-compatibility-matrix-template.md](./05-compatibility-matrix-template.md)、[12-round3-real-device-execution-guide.md](./12-round3-real-device-execution-guide.md)、[13-round3-field-record-and-daily-template.md](./13-round3-field-record-and-daily-template.md) 与 [14-round3-dial-exception-fallback-checklist.md](./14-round3-dial-exception-fallback-checklist.md)。
5. Round 4 真机放行与预发布收口优先看 [16-round4-minimum-real-device-coverage-plan.md](./16-round4-minimum-real-device-coverage-plan.md)、[17-round4-defect-severity-and-release-gate.md](./17-round4-defect-severity-and-release-gate.md)、[18-round4-pre-release-smoke-and-conclusion-template.md](./18-round4-pre-release-smoke-and-conclusion-template.md) 和 [19-round4-issue-convergence-daily-template.md](./19-round4-issue-convergence-daily-template.md)。
6. 如果要复核通用发布检查和回滚基线，查看 [06-preprod-release-checklist.md](./06-preprod-release-checklist.md) 与 [07-risk-blocker-rollback-plan.md](./07-risk-blocker-rollback-plan.md)。
7. 如果要复核服务端 Redis 收尾结果，查看 [15-round3-redis-smoke-record.md](./15-round3-redis-smoke-record.md)。
