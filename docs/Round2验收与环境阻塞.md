# Round 2 验收与环境阻塞

## 1. Round 2 验收结论

### 1.1 总体结论

Round 2 在代码层面通过，环境层面存在单一关键阻塞：本机 PostgreSQL 需要账号口令，当前未拿到可用凭据，导致主线程无法完成最后一轮本地 HTTP 烟测。

### 1.2 主线程复核结果

主线程已复核以下结果：

- `client/` 再次通过 `flutter analyze`
- `client/` 再次通过 `flutter test`
- `server/` 再次通过 `npm run build`
- 本机存在 PostgreSQL 客户端与服务进程，`localhost:5432` 可达
- 本机不存在 Docker，不能用 `docker compose` 临时补环境

### 1.3 Round 2 接受项

- 接受客户端默认从 mock 切换到真实 HTTP API 的改造
- 接受服务端固定验证码策略、最小限流和 notice/prefix 联调兜底
- 接受 QA 的 Round 2 联调指南、记录模板与环境准备清单

## 2. 已确认可用能力

### 2.1 客户端

- 默认走真实 API
- 支持 `API_BASE_URL`
- 能解析 `{ code, message, data }`
- 能处理常见错误码与错误文案

### 2.2 服务端

- 支持开发态固定验证码 `123456`
- `send-code/login/refresh/logout/me` 代码路径已补齐
- `config/dial-prefixes` 与 `config/notices` 可稳定返回
- 发送频率与错误次数已有最小限流实现

### 2.3 QA

- 已具备可执行的 Round 2 联调顺序
- 已具备联调记录模板
- 已具备环境准备清单

## 3. 当前唯一关键阻塞

### 3.1 阻塞描述

主线程无法直接连接本机 PostgreSQL 完成最终烟测，原因不是端口不可达，而是数据库账号需要密码：

- `psql` 可用
- `localhost:5432` 可达
- 使用常见联调账号 `app` 或 `postgres` 时，连接被 `fe_sendauth: no password supplied` 拒绝

### 3.2 阻塞性质

这是环境级阻塞，不是代码级阻塞。

现阶段没有证据表明客户端、服务端或 QA 资产之间仍存在代码契约冲突。

## 4. 解除阻塞所需最小信息

要完成主线程的 Round 2 最后烟测，只需要以下任一组可用数据库连接信息：

1. `DB_HOST`
2. `DB_PORT`
3. `DB_NAME`
4. `DB_USER`
5. `DB_PASSWORD`

如果 Redis 也需要参与验证，再补：

1. `REDIS_HOST`
2. `REDIS_PORT`

## 5. 一旦拿到凭据后的立即动作

主线程将按以下顺序执行：

1. 生成 `server/.env`
2. 运行 `npm run migration:run`
3. 启动服务端
4. 执行 `send-code -> login -> me -> dial-prefixes -> notices -> refresh -> logout` 本地烟测
5. 按 `docs/qa/09-round2-integration-record-template.md` 回填结果
6. 正式进入 Round 3

## 6. Round 3 候选主题

当上述烟测通过后，Round 3 优先进入以下主题：

1. 拨号真机验证
2. 异常回退与错误提示优化
3. 兼容矩阵实测回填
4. Redis 化限流
