# 隐私拨号 Client

这是 `client/` 的 Flutter 客户端。Round 2 已把默认实现切到真实 HTTP 联调，mock 仅能通过显式开关启用。

## 本地联调

先启动本地服务端，再启动客户端。

```bash
cd client
flutter pub get
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:3000
```

如果服务端跑在 Android 模拟器上，`API_BASE_URL` 需要改成 `http://10.0.2.2:3000`；真机则改成同网段可访问的局域网地址。

## 显式 mock

只有在明确需要离线联调时才打开 mock：

```bash
flutter run \
  --dart-define=API_BASE_URL=http://127.0.0.1:3000 \
  --dart-define=USE_MOCK_API=true
```

默认不会启用 mock。

## 接口约定

- `AuthApi` 默认走真实 HTTP：`send-code`、`login`、`refresh`、`logout`、`me`
- `ConfigApi` 默认走真实 HTTP：`dial-prefixes`、`notices`
- 统一响应结构为 `{ code, message, data }`
- 联调环境的验证码由服务端环境变量固定为 `123456`，不会出现在 `send-code` 响应里

## 当前状态

- 路由、登录态守卫、主页、设置页、帮助页、关于页已保留
- 默认 API 实现已切到 HTTP
- mock 仅通过 `USE_MOCK_API=true` 启用
- `flutter analyze` 和 `flutter test` 通过
