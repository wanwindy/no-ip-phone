# Round 3 验收结论

## 1. 验收范围

- 客户端：拨号失败分类、首次风险提示、最近号码回填、帮助/关于/设置页文案。
- 服务端：`memory/redis` 双驱动限流、Redis 降级策略、环境变量与本地说明。
- QA / Release：真机兼容矩阵执行版、现场执行指南、现场记录模板、异常回退清单。

## 2. 本轮校验结果

执行日期：2026-04-21

- `client`：`flutter analyze` 通过。
- `client`：`flutter test` 通过。
- `server`：`npm run build` 通过。
- `server`：Redis 模式健康链路烟测通过。
- `server`：Redis 写入失败后的回退与恢复烟测通过。

## 3. 验收结论

结论：通过。

说明：

1. 客户端 Round 3 交付可验收，主链路与失败回退文案一致。
2. QA / Release 交付可验收，真机执行资产已具备现场使用条件。
3. 服务端 Redis 风险项已回收，并完成本地 Redis 真烟测。

## 4. 已回收风险

### 4.1 Redis 限流降级已改为“可恢复回退”

修复内容：

1. `FailoverRateLimitStore` 不再永久停留在 memory，而是按冷却时间重试主存储。
2. `RedisRateLimitStore` 补上了可重连逻辑，连接失效后会重新建连。
3. 新增 `RATE_LIMIT_ALLOW_FALLBACK`，把“开发可回退、生产默认不静默回退”的策略显式化。
4. 新增 `RATE_LIMIT_RETRY_COOLDOWN_MS`，把恢复重试窗口配置化。

验证结果：

1. 健康链路 `send-code -> login -> me -> dial-prefixes -> notices -> refresh -> logout` 在 Redis 模式下通过。
2. 通过把 Redis 临时切成只读从库，验证了写入失败后服务端会回退到 memory，接口仍可成功返回。
3. 把 Redis 切回主库后，下一轮请求成功恢复到 Redis，并在日志中记录 recovery。
4. 恢复后的重复 `send-code` 返回 `429`，且 Redis 内存在对应限流 key，说明已重新接回 Redis。

## 5. 已验收项

- 客户端首页已补齐首次隐私拨打提醒、失败回退提示、最近号码回填与反馈入口。
- 客户端帮助 / 关于 / 设置页的能力边界口径一致，没有把“尝试隐藏来电显示”写成“保证成功”。
- QA 文档已经从模板升级为执行版，包含真机矩阵、执行顺序、日报模板和异常回退清单。
- 服务端已完成 Redis 依赖、环境变量示例和本地说明补齐。
- 服务端已完成 Redis 驱动健康链路、回退路径和恢复路径的本机烟测。

## 6. 未覆盖项

1. 还没有执行 Round 3 真机兼容矩阵的现场实测，当前完成的是执行资产与服务端收尾。
