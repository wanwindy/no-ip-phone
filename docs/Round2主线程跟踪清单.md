# Round 2 主线程跟踪清单

## 1. Round 2 目标

Round 2 只聚焦“真实联调闭环”：

- 客户端从 mock 默认实现切到真实 HTTP API
- 服务端提供固定验证码下的开发联调闭环
- QA 资产从模板升级为可执行联调资产

## 2. 当前运行中的子线程

| 线程 | Agent ID | 所有权目录 | Round 2 目标 |
|------|----------|------------|--------------|
| Client Worker | `019dafe3-1054-7bd1-b16b-d36a4b805f24` | `client/` | 真实 Auth/Config API 接入、可配置 base URL、错误处理与联调 README |
| Server Worker | `019dafe3-1094-7e70-84cd-f6c500e1481d` | `server/` | 固定验证码、最小限流、auth/config 联调闭环、README 更新 |
| QA/Release Worker | `019dafe3-10f4-76c0-be1e-408023d8dbb9` | `docs/qa/` | 联调执行指南、联调记录模板、环境准备清单、用例更新 |

## 3. 主线程验收顺序

1. 目录边界是否继续被遵守
2. 是否执行了 Round 2 决策
3. 客户端与服务端的联调契约是否一致
4. QA 资产是否能直接驱动联调
5. 是否具备进入 Round 3 的前置条件

## 4. 核心验收点

### 4.1 Client Worker

- 默认走真实 API，不再默认走 mock
- 有 `API_BASE_URL` 或等效配置能力
- 能解析 `{ code, message, data }`
- 能处理登录、刷新、配置拉取的错误反馈
- `flutter analyze` / `flutter test` 继续通过

### 4.2 Server Worker

- 固定验证码 `123456` 在非生产 + noop SMS 下可用
- `send-code` 响应结构不变
- `auth/config` 主链路可供客户端联调
- 最小限流已落地，或明确标注开发态范围与后续 Redis 接点
- `npm run build` 继续通过

### 4.3 QA / Release Worker

- 联调用例已写入固定验证码和环境前置条件
- 有联调执行顺序
- 有联调记录模板
- 有环境准备清单
- 对尚未实现的服务端能力有清晰的“待验证/受实现影响”标记

## 5. 进入 Round 3 的条件

只有当以下条件满足时，主 agent 才进入 Round 3：

- 客户端可以对接真实后端完成登录与配置拉取
- 服务端的固定验证码联调方案可稳定执行
- QA 可以按文档执行一次完整 auth/config 联调
- 阻塞项已经收敛到“拨号真机表现与异常回退”范围
