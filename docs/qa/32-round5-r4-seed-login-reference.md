# Round 5 第四轮 QA Seed 身份与样本说明

> 日期：2026-04-22
> owner：Tenant & Data Worker
> 适用 seed：`server/src/database/seeds/round5-r3-qa.seed.ts`

## 1. fresh QA DB 初始化顺序

1. 创建空 PostgreSQL 数据库，例如 `privacy_dialer_r5_r4_a`
2. 在 `server/` 目录执行 `DB_NAME=<qa_db> npm run migration:run`
3. 在 `server/` 目录执行 `DB_NAME=<qa_db> npm run seed:qa:r5-r3`
4. 启动 fresh runtime，再用下列账号走标准 `POST /api/v1/auth/login`

## 2. 可登录 QA 账号

### 2.1 双租户切换账号

- username：`seed_alpha_owner`
- password：`Round5!AlphaBeta1`
- 默认租户：`qa_alpha` / `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
- 可选租户：`qa_beta` / `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`
- 说明：同一 `app_user` 同时拥有 `qa_alpha` 与 `qa_beta` 的 active membership；若请求不带 `X-Tenant-Id`，当前 runtime 会按最早 active membership 落到 `qa_alpha`

### 2.2 Beta 单租户账号

- username：`seed_beta_owner`
- password：`Round5!BetaOwner1`
- 默认租户：`qa_beta` / `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`
- 可选租户：无

## 3. 样本映射

### 3.1 Alpha 租户

- tenant：`qa_alpha` / `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
- tenant member：`aaaabbbb-1111-4111-8111-111111111111`
- DID：`+617676021983` / `dddd1111-1111-4111-8111-111111111111`
- endpoint：`QA Alpha Agent Endpoint` / `eeee1111-1111-4111-8111-111111111111`
- active callback：`fafa1111-1111-4111-8111-111111111111`

### 3.2 Beta 租户

- shared membership：`bbbbaaaa-3333-4333-8333-333333333333`
- owner membership：`bbbbaaaa-2222-4222-8222-222222222222`
- DID：`+442080001111` / `dddd2222-2222-4222-8222-222222222222`
- endpoint：`QA Beta SIP Endpoint` / `eeee2222-2222-4222-8222-222222222222`
- expired callback：`fafa2222-2222-4222-8222-222222222222`

## 4. 标准登录与显式切租户

登录请求体示例：

```json
{
  "username": "seed_alpha_owner",
  "password": "Round5!AlphaBeta1",
  "deviceId": "qa-r4-device-01"
}
```

显式切到 `qa_beta` 时，继续复用 access token，并在后续业务请求头里带：

```text
X-Tenant-Id: bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
```
