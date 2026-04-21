# Round 3 Redis 烟测记录

## 1. 执行信息

- 执行日期：2026-04-21
- 执行环境：`D:\\no-ip-phone\\server`
- Redis：本机 `localhost:6379`
- 服务端驱动：`RATE_LIMIT_DRIVER=redis`
- 回退策略：`RATE_LIMIT_ALLOW_FALLBACK=true`
- 重试冷却：`RATE_LIMIT_RETRY_COOLDOWN_MS=3000`（仅本次烟测）

## 2. 健康链路结果

测试手机号：`13900001041`

| 步骤 | 结果 |
|------|------|
| `POST /api/v1/auth/send-code` | `200` |
| `POST /api/v1/auth/login` | `200` |
| `GET /api/v1/auth/me` | `200` |
| `GET /api/v1/config/dial-prefixes` | `200` |
| `GET /api/v1/config/notices` | `200` |
| `POST /api/v1/auth/refresh` | `200` |
| `POST /api/v1/auth/logout` | `200` |

补充验证：

1. Redis 中可查到 `send-code:cooldown:13900001041`。
2. 说明健康路径下限流 key 已写入 Redis，而不是只落在内存。

## 3. 回退与恢复验证

### 3.1 人工制造 Redis 写入失败

为了不依赖本机服务控制权限，本次没有直接停 Windows 服务，而是临时把 Redis 切成只读从库：

1. `SLAVEOF 127.0.0.1 1`
2. 发送 `POST /api/v1/auth/send-code`，测试手机号 `13900001052`

结果：

- 接口返回 `200`
- 说明 Redis 写入失败后，服务端已成功回退到 memory，没有把请求打成 `500`

### 3.2 恢复 Redis 主库并验证自动接回

恢复步骤：

1. `SLAVEOF NO ONE`
2. 等待超过 `RATE_LIMIT_RETRY_COOLDOWN_MS`
3. 发送 `POST /api/v1/auth/send-code`，测试手机号 `13900001053`

结果：

- 首次请求返回 `200`
- 紧接着再次发送同一手机号返回 `429`
- Redis 中可查到 `send-code:cooldown:13900001053`

说明：

1. 服务端已经从 memory fallback 恢复回 Redis。
2. 恢复后限流继续生效，不是永久停留在 memory。

## 4. 日志证据

关键日志如下：

1. `Rate limit driver initialized with Redis and recoverable memory fallback`
2. `Redis rate limit store failed during reserveOnce: READONLY ... Using memory fallback until ...`
3. `Redis rate limit store recovered during reserveOnce, resuming primary usage`

## 5. 结论

Round 3 服务端 Redis 收尾通过：

1. Redis 正常路径可用。
2. Redis 写入失败时可受控回退。
3. Redis 恢复后可自动接回主存储。
