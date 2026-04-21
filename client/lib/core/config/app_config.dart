class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:3000',
  );

  static const bool useMockApi = bool.fromEnvironment(
    'USE_MOCK_API',
    defaultValue: false,
  );

  static const int connectTimeoutSeconds = int.fromEnvironment(
    'API_CONNECT_TIMEOUT_SECONDS',
    defaultValue: 10,
  );

  static const int receiveTimeoutSeconds = int.fromEnvironment(
    'API_RECEIVE_TIMEOUT_SECONDS',
    defaultValue: 15,
  );

  static const String appName = '隐私拨号';
}
