# Round 2 最终验收

## 1. 结论

Round 2 已完成，可进入 Round 3。

本轮已同时满足以下条件：

- 客户端默认走真实 API，而不是 mock。
- 服务端在开发环境中能用固定验证码 `123456` 完成登录闭环。
- 主线程已完成一轮真实本地烟测，跑通 `send-code -> login -> me -> dial-prefixes -> notices -> refresh -> logout`。
- QA 已形成可执行联调资产，并留存了本地烟测记录。

## 2. 主线程复核结果

### 2.1 代码级复核

- `flutter analyze` 通过
- `flutter test` 通过
- `npm run build` 通过
- `npm run migration:run` 通过

### 2.2 环境级复核

- PostgreSQL 已连通并完成库初始化
- `privacy_dialer` 数据库已创建
- 默认前缀和公告种子已写入
- 服务端已在本机 `3000` 端口成功启动并通过 smoke 测试

## 3. 真实烟测结果

本轮真实烟测结果如下：

| 步骤 | 结果 |
|------|------|
| `send-code` | 通过 |
| `login` | 通过 |
| `me` | 通过 |
| `dial-prefixes` | 通过 |
| `notices` | 通过 |
| `refresh` | 通过 |
| `logout` | 通过 |
| `logout` 后旧 `refreshToken` 再 `refresh` | `401`，通过 |
| 60 秒内重复 `send-code` | `429`，通过 |

详细记录见 `docs/qa/11-round2-local-smoke-record.md`。

## 4. 契约澄清

Round 2 已确认以下契约：

- `logout` 的当前语义是“注销当前 refresh token”。
- 当前实现不要求已签发 access token 在 logout 后立即失效。
- 因此 QA 不应把“logout 后 `me` 必须 401”作为 Round 2 的通过标准。

## 5. Round 3 入口

Round 3 优先进入以下主题：

1. 拨号真机联调
2. 异常回退与错误提示优化
3. 兼容矩阵实测回填
4. Redis 化限流
