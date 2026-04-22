# Server

NestJS backend skeleton for the privacy dial app.

## What is included

- NestJS app bootstrap with global prefix `/api/v1`
- Unified success/error response envelope
- `@Public()` decorator and JWT auth guard
- Phone validation pipe
- Auth and config modules with minimal endpoints
- Rate limit supports `memory` and `redis` drivers behind a single auth-facing service
- TypeORM entities and first migration for:
  - `users`
  - `auth_codes`
  - `refresh_tokens`
  - `dial_prefix_configs`
- `notices`

## Startup

```bash
cp .env.example .env
npm install
npm run migration:run
npm run start:dev
```

## Round 4 release gate

- Pre-release / production now freezes Redis policy to `NODE_ENV=production`, `RATE_LIMIT_DRIVER=redis`, `RATE_LIMIT_ALLOW_FALLBACK=false`.
- The server will fail fast on startup if `NODE_ENV=production` but the Redis release baseline is missing.
- 登录体系已切换为账号密码，不再依赖短信 provider。
- Release checks:
  - `npm run build`
  - `npm run preflight:release`
  - `npm run smoke:minimal`
- Detailed rollout / rollback notes are in `ROUND4_RELEASE.md`.

## Local联调

- App 登录改为 `username + password`。
- 后台登录走 `/api/v1/admin/auth/login`，同样使用账号密码。
- 首个管理员和演示账号可通过 `ADMIN_BOOTSTRAP_*`、`APP_BOOTSTRAP_*` 环境变量自动初始化。
- `RATE_LIMIT_DRIVER=memory` 是默认值，适合本地直跑和 CI；不需要 Redis 服务。
- 如果想验证分布式限流，把 `RATE_LIMIT_DRIVER` 改成 `redis`，并确保 `REDIS_URL` 或 `REDIS_HOST`/`REDIS_PORT` 可连通。
- `RATE_LIMIT_ALLOW_FALLBACK` 用于控制 Redis 不可用时是否允许回退到 memory；默认在非生产环境为 `true`，生产环境为 `false`。
- `RATE_LIMIT_RETRY_COOLDOWN_MS` 用于控制 Redis 降级后的重试冷却时间，默认 30 秒。
- 当前实现对 Redis 采取可恢复的受控降级策略：驱动选为 `redis` 且允许回退时，会在 Redis 不可用时临时回退到 memory，并在冷却后自动重试 Redis，避免一次抖动后永久停留在 memory。
- Round 4 起，`NODE_ENV=production` 不再接受默认 `memory` 限流，也不接受 `RATE_LIMIT_ALLOW_FALLBACK=true`。
- 本地可直接用 `docker run --rm -p 6379:6379 redis:7-alpine` 起一个临时 Redis，再切换 `RATE_LIMIT_DRIVER=redis` 做联调。

## Notes

- 短信模块已不再参与登录主链路，当前账号体系由后台创建账号并通过用户名密码登录。
- Login rate limiting now uses a driver abstraction with memory as the default backend and Redis as the optional backend.
- The response filter returns the contract shape from the design document.
- Database schema and seed data follow `docs/设计文档.md`.
