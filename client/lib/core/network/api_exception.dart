class ApiException implements Exception {
  const ApiException({
    required this.code,
    required this.message,
    this.statusCode,
    this.data,
  });

  final int? code;
  final String message;
  final int? statusCode;
  final Object? data;

  bool get isUnauthorized =>
      code == 40103 ||
      code == 40104 ||
      statusCode == 401 ||
      statusCode == 403;

  @override
  String toString() => message;
}

class ApiCodes {
  static const int success = 0;
  static const int invalidPhone = 40001;
  static const int invalidCode = 40002;
  static const int codeWrong = 40101;
  static const int codeExpired = 40102;
  static const int accessTokenInvalid = 40103;
  static const int refreshTokenInvalid = 40104;
  static const int accountBlocked = 40301;
  static const int sendCodeRateLimited = 42901;
  static const int codeAttemptsExceeded = 42902;
  static const int ipRateLimited = 42903;
  static const int smsFailed = 50001;
  static const int internalError = 50002;
}

String apiErrorMessage({
  int? code,
  String? message,
  int? statusCode,
}) {
  final fallback = (message == null || message.trim().isEmpty)
      ? '请求失败，请稍后重试'
      : message.trim();

  switch (code) {
    case ApiCodes.invalidPhone:
      return '手机号格式不正确';
    case ApiCodes.invalidCode:
      return '验证码格式不正确';
    case ApiCodes.codeWrong:
      return '验证码错误';
    case ApiCodes.codeExpired:
      return '验证码已过期';
    case ApiCodes.accessTokenInvalid:
      return '登录态已失效，请重新登录';
    case ApiCodes.refreshTokenInvalid:
      return '登录态已过期，请重新登录';
    case ApiCodes.accountBlocked:
      return '账号已被封禁';
    case ApiCodes.sendCodeRateLimited:
      return '验证码发送过于频繁，请稍后再试';
    case ApiCodes.codeAttemptsExceeded:
      return '验证码错误次数过多，请稍后再试';
    case ApiCodes.ipRateLimited:
      return '当前网络请求过于频繁，请稍后再试';
    case ApiCodes.smsFailed:
      return '验证码发送失败，请稍后重试';
    case ApiCodes.internalError:
      return '服务暂时不可用，请稍后重试';
    default:
      if (statusCode == 401) {
        return '登录态已失效，请重新登录';
      }
      if (statusCode == 403) {
        return '当前账号无权限访问';
      }
      if (statusCode == 429) {
        return '请求过于频繁，请稍后重试';
      }
      if (statusCode != null && statusCode >= 500) {
        return '服务暂时不可用，请稍后重试';
      }
      return fallback;
  }
}
