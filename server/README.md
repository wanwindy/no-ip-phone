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
- The server also rejects `SMS_PROVIDER=noop` in `production`, and the current build blocks any non-implemented real SMS provider from booting.
- Release checks:
  - `npm run build`
  - `npm run preflight:release`
  - `npm run smoke:minimal`
- Detailed rollout / rollback notes are in `ROUND4_RELEASE.md`.

## Local联调

- `SMS_PROVIDER=noop` 时，开发环境会走固定验证码流程。
- 默认固定验证码是 `AUTH_FIXED_CODE=123456`。
- 该策略仅在 `NODE_ENV != production` 且 `SMS_PROVIDER=noop` 时生效。
- `POST /api/v1/auth/send-code` 不会返回调试验证码，客户端仍按正式登录流程输入验证码。
- `RATE_LIMIT_DRIVER=memory` 是默认值，适合本地直跑和 CI；不需要 Redis 服务。
- 如果想验证分布式限流，把 `RATE_LIMIT_DRIVER` 改成 `redis`，并确保 `REDIS_URL` 或 `REDIS_HOST`/`REDIS_PORT` 可连通。
- `RATE_LIMIT_ALLOW_FALLBACK` 用于控制 Redis 不可用时是否允许回退到 memory；默认在非生产环境为 `true`，生产环境为 `false`。
- `RATE_LIMIT_RETRY_COOLDOWN_MS` 用于控制 Redis 降级后的重试冷却时间，默认 30 秒。
- 当前实现对 Redis 采取可恢复的受控降级策略：驱动选为 `redis` 且允许回退时，会在 Redis 不可用时临时回退到 memory，并在冷却后自动重试 Redis，避免一次抖动后永久停留在 memory。
- Round 4 起，`NODE_ENV=production` 不再接受默认 `memory` 限流，也不接受 `RATE_LIMIT_ALLOW_FALLBACK=true`，同时不接受 `SMS_PROVIDER=noop`。
- 当前仓库仍只实现了 `noop` 短信 provider，因此发布前必须先补真实短信 provider 接入，再运行生产口径预检与 smoke。
- 本地可直接用 `docker run --rm -p 6379:6379 redis:7-alpine` 起一个临时 Redis，再切换 `RATE_LIMIT_DRIVER=redis` 做联调。

## Notes

- SMS delivery is still mocked with a noop provider in this build; production release is intentionally blocked until a real provider is implemented.
- Send-code/login rate limiting now uses a driver abstraction with memory as the default backend and Redis as the optional backend.
- The response filter returns the contract shape from the design document.
- Database schema and seed data follow `docs/设计文档.md`.
