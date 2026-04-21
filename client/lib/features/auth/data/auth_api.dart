import '../../../core/constants/app_constants.dart';
import '../../../shared/utils/phone_utils.dart';

class SendCodeResponse {
  const SendCodeResponse({
    required this.cooldownSeconds,
    this.mockCode,
  });

  final int cooldownSeconds;
  final String? mockCode;
}

class AuthTokenPair {
  const AuthTokenPair({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });

  final String accessToken;
  final String refreshToken;
  final Duration expiresIn;

  DateTime get expiresAt => DateTime.now().add(expiresIn);
}

class AuthProfile {
  const AuthProfile({
    required this.id,
    required this.phone,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String phone;
  final String status;
  final DateTime createdAt;

  String get displayPhone => phone;
}

abstract class AuthApi {
  Future<SendCodeResponse> sendCode(String phone);

  Future<AuthTokenPair> login({
    required String phone,
    required String code,
    required String deviceId,
  });

  Future<AuthTokenPair> refresh({
    required String refreshToken,
    required String deviceId,
  });

  Future<AuthProfile> me(String accessToken);

  Future<void> logout(String refreshToken);
}

class MockAuthApi implements AuthApi {
  final Map<String, String> _accessTokenPhoneMap = <String, String>{};
  final Map<String, String> _refreshTokenPhoneMap = <String, String>{};

  @override
  Future<AuthTokenPair> login({
    required String phone,
    required String code,
    required String deviceId,
  }) async {
    if (code != AppConstants.mockVerificationCode) {
      throw StateError('验证码错误，当前 mock 只接受 123456');
    }

    final normalizedPhone = normalizePhoneNumber(phone);
    final accessToken = 'mock-access-${normalizedPhone.hashCode}-${code.hashCode}';
    final refreshToken = 'mock-refresh-${normalizedPhone.hashCode}-${deviceId.hashCode}';
    _accessTokenPhoneMap[accessToken] = normalizedPhone;
    _refreshTokenPhoneMap[refreshToken] = normalizedPhone;
    return AuthTokenPair(
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: const Duration(hours: 2),
    );
  }

  @override
  Future<void> logout(String refreshToken) async {
    await Future<void>.delayed(const Duration(milliseconds: 150));
  }

  @override
  Future<SendCodeResponse> sendCode(String phone) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
    return const SendCodeResponse(
      cooldownSeconds: AppConstants.resendCooldownSeconds,
      mockCode: AppConstants.mockVerificationCode,
    );
  }

  @override
  Future<AuthProfile> me(String accessToken) async {
    final phone = _accessTokenPhoneMap[accessToken] ?? '13800138000';
    return AuthProfile(
      id: 'mock-user-${phone.hashCode}',
      phone: maskPhoneNumber(phone),
      status: 'active',
      createdAt: DateTime.now().subtract(const Duration(days: 7)),
    );
  }

  @override
  Future<AuthTokenPair> refresh({
    required String refreshToken,
    required String deviceId,
  }) async {
    final normalizedPhone =
        _refreshTokenPhoneMap[refreshToken] ?? '13800138000';
    final accessToken = 'mock-access-${normalizedPhone.hashCode}-${refreshToken.hashCode}';
    final nextRefreshToken = 'mock-refresh-${normalizedPhone.hashCode}-${deviceId.hashCode}-${DateTime.now().microsecondsSinceEpoch}';
    _accessTokenPhoneMap[accessToken] = normalizedPhone;
    _refreshTokenPhoneMap[nextRefreshToken] = normalizedPhone;
    return AuthTokenPair(
      accessToken: accessToken,
      refreshToken: nextRefreshToken,
      expiresIn: const Duration(hours: 2),
    );
  }
}
