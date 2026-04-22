import '../../../core/constants/app_constants.dart';

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
    required this.username,
    required this.displayName,
    required this.role,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String username;
  final String displayName;
  final String role;
  final String status;
  final DateTime createdAt;
}

abstract class AuthApi {
  Future<AuthTokenPair> login({
    required String username,
    required String password,
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
  final Map<String, String> _accessTokenUserMap = <String, String>{};
  final Map<String, String> _refreshTokenUserMap = <String, String>{};

  @override
  Future<AuthTokenPair> login({
    required String username,
    required String password,
    required String deviceId,
  }) async {
    if (username != AppConstants.mockAccountUsername ||
        password != AppConstants.mockAccountPassword) {
      throw StateError('账号或密码错误，当前 mock 只接受 demo_user / Demo12345');
    }

    final accessToken = 'mock-access-${username.hashCode}-${deviceId.hashCode}';
    final refreshToken = 'mock-refresh-${username.hashCode}-${deviceId.hashCode}';
    _accessTokenUserMap[accessToken] = username;
    _refreshTokenUserMap[refreshToken] = username;
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
  Future<AuthProfile> me(String accessToken) async {
    final username =
        _accessTokenUserMap[accessToken] ?? AppConstants.mockAccountUsername;
    return AuthProfile(
      id: 'mock-account-${username.hashCode}',
      username: username,
      displayName:
          username == AppConstants.mockAccountUsername ? '演示账号' : username,
      role: 'app_user',
      status: 'active',
      createdAt: DateTime.now().subtract(const Duration(days: 7)),
    );
  }

  @override
  Future<AuthTokenPair> refresh({
    required String refreshToken,
    required String deviceId,
  }) async {
    final username =
        _refreshTokenUserMap[refreshToken] ?? AppConstants.mockAccountUsername;
    final accessToken = 'mock-access-${username.hashCode}-${refreshToken.hashCode}';
    final nextRefreshToken =
        'mock-refresh-${username.hashCode}-${deviceId.hashCode}-${DateTime.now().microsecondsSinceEpoch}';
    _accessTokenUserMap[accessToken] = username;
    _refreshTokenUserMap[nextRefreshToken] = username;
    return AuthTokenPair(
      accessToken: accessToken,
      refreshToken: nextRefreshToken,
      expiresIn: const Duration(hours: 2),
    );
  }
}
