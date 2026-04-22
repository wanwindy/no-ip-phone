# QA / Release 交付索引

## 适用范围

本目录当前聚焦 Round 5 “多租户境外 DID 语音平台”的 QA 与发布基线，覆盖第一轮到第四轮的真实执行与门禁结论，不包含客户端或服务端业务实现。

## 当前可用交付物

| 文件 | 用途 |
|------|------|
| [20-round5-traceability-and-risk-matrix.md](./20-round5-traceability-and-risk-matrix.md) | Round 5 测试追踪矩阵、高风险区和最小证据要求 |
| [21-round5-integration-checklist.md](./21-round5-integration-checklist.md) | Round 5 联调准备项、执行顺序、失败分流和结论模板 |
| [22-round5-smoke-and-regression-template.md](./22-round5-smoke-and-regression-template.md) | Round 5 冒烟与回归执行模板 |
| [23-round5-release-gate-and-next-round-entry.md](./23-round5-release-gate-and-next-round-entry.md) | Round 5 发布门禁与下一轮启动准入清单 |
| [24-round5-r2-integration-execution-record.md](./24-round5-r2-integration-execution-record.md) | Round 5 第二轮首轮联调真实执行记录 |
| [25-round5-r2-smoke-regression-record.md](./25-round5-r2-smoke-regression-record.md) | Round 5 第二轮首轮冒烟 / 回归真实执行记录 |
| [26-round5-r2-defect-log.md](./26-round5-r2-defect-log.md) | Round 5 第二轮首轮缺陷、owner、优先级和下一步 |
| [27-round5-r2-gate-review.md](./27-round5-r2-gate-review.md) | Round 5 第二轮门禁评审与 GO / NO-GO 结论 |
| [28-round5-r3-integration-execution-record.md](./28-round5-r3-integration-execution-record.md) | Round 5 第三轮 fresh runtime 联调真实执行记录 |
| [29-round5-r3-smoke-regression-record.md](./29-round5-r3-smoke-regression-record.md) | Round 5 第三轮冒烟 / 回归真实执行记录 |
| [30-round5-r3-defect-log.md](./30-round5-r3-defect-log.md) | Round 5 第三轮缺陷清单，以及第二轮缺陷的已解决 / 已过时 / 仍有效更新 |
| [31-round5-r3-gate-review.md](./31-round5-r3-gate-review.md) | Round 5 第三轮门禁评审与 CONDITIONAL GO 结论 |
| [32-round5-r4-seed-login-reference.md](./32-round5-r4-seed-login-reference.md) | Round 5 第四轮 QA seed 登录账号、双租户 membership 与样本说明 |
| [33-round5-r4-integration-execution-record.md](./33-round5-r4-integration-execution-record.md) | Round 5 第四轮标准登录、双租户切换与 signed webhook 回放联调记录 |
| [34-round5-r4-smoke-regression-record.md](./34-round5-r4-smoke-regression-record.md) | Round 5 第四轮冒烟 / 回归真实执行记录 |
| [35-round5-r4-defect-log.md](./35-round5-r4-defect-log.md) | Round 5 第四轮缺陷清单，以及第三轮缺陷的已解决 / 仍有效更新 |
| [36-round5-r4-gate-review.md](./36-round5-r4-gate-review.md) | Round 5 第四轮门禁评审与 CONDITIONAL GO 结论 |

## 统一边界

- 只覆盖 `docs/多租户境外号码语音平台设计方案.md` 及 Round 5 真源定义的质量基线。
- 不写客户端或服务端业务实现。
- 不替主线程调整任务卡边界或产品口径。
- `direct_prefix_mode` 仅为兼容模式，新模式必须走服务端编排抽象。
- 数据隔离按“共享库 + 行级租户隔离”验证。
- 回拨命中规则按 `display_did + remote_number + TTL` 验证。

## 使用顺序

1. 先看 [20-round5-traceability-and-risk-matrix.md](./20-round5-traceability-and-risk-matrix.md)，确认测试项与 A/B/C/D 任务卡映射。
2. 再看 [21-round5-integration-checklist.md](./21-round5-integration-checklist.md)，按准备项和执行顺序开展联调。
3. 若要看第二轮真实执行结果，直接阅读 [24-round5-r2-integration-execution-record.md](./24-round5-r2-integration-execution-record.md)、[25-round5-r2-smoke-regression-record.md](./25-round5-r2-smoke-regression-record.md)、[26-round5-r2-defect-log.md](./26-round5-r2-defect-log.md) 和 [27-round5-r2-gate-review.md](./27-round5-r2-gate-review.md)。
4. 若要看第三轮 fresh runtime 复测结果，直接阅读 [28-round5-r3-integration-execution-record.md](./28-round5-r3-integration-execution-record.md)、[29-round5-r3-smoke-regression-record.md](./29-round5-r3-smoke-regression-record.md)、[30-round5-r3-defect-log.md](./30-round5-r3-defect-log.md) 和 [31-round5-r3-gate-review.md](./31-round5-r3-gate-review.md)。
5. 若要看第四轮标准登录、双租户切换、signed webhook 回放与门禁结果，直接阅读 [32-round5-r4-seed-login-reference.md](./32-round5-r4-seed-login-reference.md)、[33-round5-r4-integration-execution-record.md](./33-round5-r4-integration-execution-record.md)、[34-round5-r4-smoke-regression-record.md](./34-round5-r4-smoke-regression-record.md)、[35-round5-r4-defect-log.md](./35-round5-r4-defect-log.md) 和 [36-round5-r4-gate-review.md](./36-round5-r4-gate-review.md)。
6. 若后续继续复用模板，再回看 [22-round5-smoke-and-regression-template.md](./22-round5-smoke-and-regression-template.md) 与 [23-round5-release-gate-and-next-round-entry.md](./23-round5-release-gate-and-next-round-entry.md)。

## 缺失说明

- 旧版 README 中引用的 Round 1 到 Round 4 资产当前不在本工作区内，不能作为本轮可执行交付物。
- 如后续需要补回历史 QA 资产，应单独恢复文件后再更新索引，不继续保留失效链接。
