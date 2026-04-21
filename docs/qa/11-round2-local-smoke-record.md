# Round 2 本地烟测记录

## 1. 基本信息

| 项目 | 内容 |
|------|------|
| 联调日期 | 2026-04-21 |
| 环境 | 本机开发环境 |
| 服务地址 | `http://127.0.0.1:3000/api/v1` |
| 客户端状态 | 已切到真实 HTTP API |
| 服务端状态 | 本地启动成功，固定验证码策略生效 |
| 数据库 | PostgreSQL，本机 `localhost:5432` |
| 记录人 | 主 agent |

## 2. 环境前提

| 项目 | 结果 | 备注 |
|------|------|------|
| `NODE_ENV != production` | 是 | `development` |
| `SMS_PROVIDER=noop` | 是 | 本地联调策略 |
| `AUTH_FIXED_CODE=123456` | 是 | 已写入 `server/.env` |
| API Base URL 正确 | 是 | 指向本机 `3000` |
| DB 可连通 | 是 | 已完成迁移 |
| prefix 数据已准备 | 是 | 迁移已写入默认前缀 |
| notice 数据已准备 | 是 | 迁移已写入默认 notice |

## 3. 执行记录

| 步骤 | 接口 | 结果 | 关键响应 | 备注 |
|------|------|------|----------|------|
| 1 | `POST /auth/send-code` | 通过 | `code=0`，`cooldown=60` | 固定验证码策略可用 |
| 2 | `POST /auth/login` | 通过 | `code=0`，返回 token 对 | 使用 `123456` 登录成功 |
| 3 | `GET /auth/me` | 通过 | `code=0`，手机号脱敏返回 | 返回 `138****8000` |
| 4 | `GET /config/dial-prefixes` | 通过 | `code=0` | 返回 4 条前缀数据 |
| 5 | `GET /config/notices` | 通过 | `code=0` | 返回 1 条公告 |
| 6 | `POST /auth/refresh` | 通过 | `code=0` | 成功轮换 token |
| 7 | `POST /auth/logout` | 通过 | `code=0` | 当前 refresh token 被注销 |
| 8 | `logout` 后原 refreshToken 再 `refresh` | 通过 | HTTP `401` | 符合当前契约 |
| 9 | 60 秒内重复 `send-code` | 通过 | HTTP `429` | 最小限流已生效 |

## 4. 契约说明

- 当前 Round 2 契约是“`logout` 注销当前 refresh token”，不是“立即让已签发 access token 全部失效”。
- 因此，`logout` 后若复用尚未过期的 access token 调用 `me` 仍成功，不视为 Round 2 失败。
- Round 2 真正的通过标准是：登录闭环成立、配置接口稳定、refresh 可轮换、logout 后 refresh token 失效。

## 5. 结论

| 项目 | 结论 |
|------|------|
| send-code -> login -> me | 通过 |
| dial-prefixes -> notices | 通过 |
| refresh -> logout | 通过 |
| logout 后 refreshToken 失效 | 通过 |
| 限流相关用例 | 基础发送限流通过；更多细项待后续扩展 |
| 整体联调结论 | 可进入 Round 3 |

## 6. 建议下一步

1. 进入拨号真机联调，验证 `tel:`、前缀拼接和系统拨号器行为。
2. 回填兼容矩阵实测结果，重点覆盖 Android / iOS 与不同运营商。
3. 如需更稳定的限流，下一轮将内存限流替换为 Redis 实现。
