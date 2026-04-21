# 客户端实现说明

这是 `client/` 的 Flutter 客户端。当前默认实现已切换到真实 HTTP 联调，mock 仅能通过显式开关启用。

## 当前状态

- 路由与登录态守卫已接入 `go_router`
- 会话状态与本地存储抽象已接入
- 拨号域模型、系统拨号封装和本地历史已接入
- 登录、验证码、主页、设置、帮助、关于、启动页都已具备基础壳
- `AuthApi` 和 `ConfigApi` 默认走真实 HTTP

## 联调开关

- `API_BASE_URL`：服务端地址，推荐通过 `--dart-define` 传入
- `USE_MOCK_API=true`：显式启用 mock，默认关闭

## 后续接入点

- 继续联调真实 `send-code/login/refresh/logout/me`
- 继续联调真实 `dial-prefixes/notices`
- 如需更强的自动刷新能力，可在下一轮补充 401 刷新拦截
