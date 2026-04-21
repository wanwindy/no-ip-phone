# Round 4 Server Release Gate

## Frozen Redis policy

Round 4 starts treating pre-release and production the same way on rate limit storage:

1. `NODE_ENV=production`
2. `RATE_LIMIT_DRIVER=redis`
3. `RATE_LIMIT_ALLOW_FALLBACK=false`
4. Redis connection must be explicit with `REDIS_URL` or `REDIS_HOST` + `REDIS_PORT`
5. `SMS_PROVIDER` must not be `noop`

The server now fails fast at startup when `NODE_ENV=production` but the release baseline above is not met. The goal is to stop a release from silently running with in-memory rate limiting or fake SMS delivery.

## Minimal executable checks

1. Build: `npm run build`
2. Release preflight: `npm run preflight:release`
3. Start the server with the actual pre-release or production env
4. Run minimal smoke: `npm run smoke:minimal`

Notes:

- `preflight:release` loads `.env` by default. If the release env file is elsewhere, run `ENV_FILE=path/to/file npm run preflight:release`.
- `smoke:minimal` loads `.env` by default and targets `http://127.0.0.1:${PORT}` unless `SMOKE_BASE_URL` or `SERVER_BASE_URL` is provided.
- In non-production, the smoke script can reuse `AUTH_FIXED_CODE`.
- In production-like env, set `SMOKE_AUTH_CODE` explicitly from the configured real SMS provider. `SMS_PROVIDER=noop` is now rejected by startup and preflight.
- The current build still only implements `noop`; release validation is expected to fail until a real SMS provider is integrated.

## Block / rollback rule

Block the release or roll back immediately when any of the following happens:

1. `npm run preflight:release` fails
2. The service cannot start because Redis baseline validation fails
3. The service cannot start because `SMS_PROVIDER=noop` or another unimplemented provider is configured
4. `npm run smoke:minimal` fails on the auth/config chain
5. Redis is unreachable and the running version can only recover by switching to memory

Rollback action:

1. Redeploy the previous verified server build
2. Keep the Redis release baseline unchanged instead of hot-editing `RATE_LIMIT_DRIVER=memory`
3. Re-run `npm run preflight:release` and `npm run smoke:minimal` on the rollback target before reopening traffic
