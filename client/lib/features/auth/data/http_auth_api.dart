import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_key_value_store.dart';
import 'auth_api.dart';

class HttpAuthApi implements AuthApi {
  HttpAuthApi({
    required Dio dio,
    required SecureKeyValueStore secureStore,
  })  : _dio = dio,
        _secureStore = secureStore;

  final Dio _dio;
  final SecureKeyValueStore _secureStore;

  static const _accessTokenKey = 'access_token';

  @override
  Future<AuthTokenPair> login({
    required String username,
    required String password,
    required String deviceId,
  }) async {
    final response = await _dio.post<dynamic>(
      '/api/v1/auth/login',
      data: <String, Object>{
        'username': username.trim(),
        'password': password,
        'deviceId': deviceId,
      },
    );
    final envelope = await decodeEnvelope<AuthTokenPair>(
      response,
      decodeData: (value) {
        final json = _asMap(value);
        return AuthTokenPair(
          accessToken: json['accessToken'] as String? ?? '',
          refreshToken: json['refreshToken'] as String? ?? '',
          expiresIn: Duration(
            seconds: (json['expiresIn'] as num?)?.toInt() ?? 7200,
          ),
        );
      },
    );
    await _secureStore.write(_accessTokenKey, envelope.data!.accessToken);
    return envelope.data!;
  }

  @override
  Future<void> logout(String refreshToken) async {
    try {
      final response = await _dio.post<dynamic>(
        '/api/v1/auth/logout',
        data: <String, Object>{
          'refreshToken': refreshToken,
        },
        options: Options(headers: await _authHeaders()),
      );
      await decodeEnvelope<Object?>(
        response,
        decodeData: (value) => value,
      );
    } finally {
      await _secureStore.delete(_accessTokenKey);
    }
  }

  @override
  Future<AuthProfile> me(String accessToken) async {
    final response = await _dio.get<dynamic>(
      '/api/v1/auth/me',
      options: Options(headers: <String, String>{
        'Authorization': 'Bearer $accessToken',
      }),
    );
    final envelope = await decodeEnvelope<AuthProfile>(
      response,
      decodeData: (value) {
        final json = _asMap(value);
        return AuthProfile(
          id: json['id'] as String? ?? '',
          username: json['username'] as String? ?? '',
          displayName: json['displayName'] as String? ?? '',
          role: json['role'] as String? ?? 'app_user',
          status: json['status'] as String? ?? 'active',
          createdAt:
              DateTime.tryParse(json['createdAt'] as String? ?? '') ??
                  DateTime.now(),
        );
      },
    );
    return envelope.data!;
  }

  @override
  Future<AuthTokenPair> refresh({
    required String refreshToken,
    required String deviceId,
  }) async {
    final response = await _dio.post<dynamic>(
      '/api/v1/auth/refresh',
      data: <String, Object>{
        'refreshToken': refreshToken,
        'deviceId': deviceId,
      },
    );
    final envelope = await decodeEnvelope<AuthTokenPair>(
      response,
      decodeData: (value) {
        final json = _asMap(value);
        return AuthTokenPair(
          accessToken: json['accessToken'] as String? ?? '',
          refreshToken: json['refreshToken'] as String? ?? '',
          expiresIn: Duration(
            seconds: (json['expiresIn'] as num?)?.toInt() ?? 7200,
          ),
        );
      },
    );
    await _secureStore.write(_accessTokenKey, envelope.data!.accessToken);
    return envelope.data!;
  }

  Future<Map<String, String>> _authHeaders() async {
    final token = await _secureStore.read(_accessTokenKey);
    if (token == null || token.isEmpty) {
      return const <String, String>{};
    }
    return <String, String>{
      'Authorization': 'Bearer $token',
    };
  }
}

Map<String, dynamic> _asMap(dynamic value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return value.map((key, element) => MapEntry(key.toString(), element));
  }
  throw const FormatException('响应 data 格式不正确');
}
