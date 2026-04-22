import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_key_value_store.dart';
import '../../auth/data/auth_api.dart';
import '../domain/admin_models.dart';
import 'admin_api.dart';

class HttpAdminApi implements AdminApi {
  HttpAdminApi({
    required Dio dio,
    required SecureKeyValueStore secureStore,
  })  : _dio = dio,
        _secureStore = secureStore;

  final Dio _dio;
  final SecureKeyValueStore _secureStore;

  static const _accessTokenKey = 'admin_access_token';

  @override
  Future<ManagedAccount> createAccount(ManagedAccountCreateInput input) async {
    final response = await _dio.post<dynamic>(
      '/api/v1/admin/accounts',
      data: input.toJson(),
      options: Options(headers: await _authHeaders()),
    );
    final envelope = await decodeEnvelope<ManagedAccount>(
      response,
      decodeData: ManagedAccount.fromJson,
    );
    return envelope.data!;
  }

  @override
  Future<ManagedDialPrefix> createDialPrefix(
    ManagedDialPrefixUpsertInput input,
  ) async {
    final response = await _dio.post<dynamic>(
      '/api/v1/admin/config/dial-prefixes',
      data: input.toJson(),
      options: Options(headers: await _authHeaders()),
    );
    final envelope = await decodeEnvelope<ManagedDialPrefix>(
      response,
      decodeData: ManagedDialPrefix.fromJson,
    );
    return envelope.data!;
  }

  @override
  Future<ManagedNotice> createNotice(ManagedNoticeUpsertInput input) async {
    final response = await _dio.post<dynamic>(
      '/api/v1/admin/config/notices',
      data: input.toJson(),
      options: Options(headers: await _authHeaders()),
    );
    final envelope = await decodeEnvelope<ManagedNotice>(
      response,
      decodeData: ManagedNotice.fromJson,
    );
    return envelope.data!;
  }

  @override
  Future<List<ManagedAccount>> listAccounts() async {
    final response = await _dio.get<dynamic>(
      '/api/v1/admin/accounts',
      options: Options(headers: await _authHeaders()),
    );
    final envelope = await decodeEnvelope<List<ManagedAccount>>(
      response,
      decodeData: (value) {
        final items = value as List<dynamic>? ?? const <dynamic>[];
        return items.map(ManagedAccount.fromJson).toList();
      },
    );
    return envelope.data ?? const <ManagedAccount>[];
  }

  @override
  Future<List<ManagedDialPrefix>> listDialPrefixes() async {
    final response = await _dio.get<dynamic>(
      '/api/v1/admin/config/dial-prefixes',
      options: Options(headers: await _authHeaders()),
    );
    final envelope = await decodeEnvelope<List<ManagedDialPrefix>>(
      response,
      decodeData: (value) {
        final items = value as List<dynamic>? ?? const <dynamic>[];
        return items.map(ManagedDialPrefix.fromJson).toList();
      },
    );
    return envelope.data ?? const <ManagedDialPrefix>[];
  }

  @override
  Future<List<ManagedNotice>> listNotices() async {
    final response = await _dio.get<dynamic>(
      '/api/v1/admin/config/notices',
      options: Options(headers: await _authHeaders()),
    );
    final envelope = await decodeEnvelope<List<ManagedNotice>>(
      response,
      decodeData: (value) {
        final items = value as List<dynamic>? ?? const <dynamic>[];
        return items.map(ManagedNotice.fromJson).toList();
      },
    );
    return envelope.data ?? const <ManagedNotice>[];
  }

  @override
  Future<AuthTokenPair> login({
    required String username,
    required String password,
    required String deviceId,
  }) async {
    final response = await _dio.post<dynamic>(
      '/api/v1/admin/auth/login',
      data: <String, Object>{
        'username': username.trim(),
        'password': password,
        'deviceId': deviceId,
      },
    );
    final envelope = await decodeEnvelope<AuthTokenPair>(
      response,
      decodeData: (value) {
        final json = ensureAdminMap(value);
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
        '/api/v1/admin/auth/logout',
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
      '/api/v1/admin/auth/me',
      options: Options(headers: <String, String>{
        'Authorization': 'Bearer $accessToken',
      }),
    );
    final envelope = await decodeEnvelope<AuthProfile>(
      response,
      decodeData: (value) {
        final json = ensureAdminMap(value);
        return AuthProfile(
          id: json['id'] as String? ?? '',
          username: json['username'] as String? ?? '',
          displayName: json['displayName'] as String? ?? '',
          role: json['role'] as String? ?? 'admin',
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
      '/api/v1/admin/auth/refresh',
      data: <String, Object>{
        'refreshToken': refreshToken,
        'deviceId': deviceId,
      },
    );
    final envelope = await decodeEnvelope<AuthTokenPair>(
      response,
      decodeData: (value) {
        final json = ensureAdminMap(value);
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
  Future<ManagedAccount> updateAccount(
    String accountId,
    ManagedAccountUpdateInput input,
  ) async {
    final response = await _dio.patch<dynamic>(
      '/api/v1/admin/accounts/$accountId',
      data: input.toJson(),
      options: Options(headers: await _authHeaders()),
    );
    final envelope = await decodeEnvelope<ManagedAccount>(
      response,
      decodeData: ManagedAccount.fromJson,
    );
    return envelope.data!;
  }

  @override
  Future<ManagedDialPrefix> updateDialPrefix(
    String prefixId,
    ManagedDialPrefixUpsertInput input,
  ) async {
    final response = await _dio.patch<dynamic>(
      '/api/v1/admin/config/dial-prefixes/$prefixId',
      data: input.toJson(),
      options: Options(headers: await _authHeaders()),
    );
    final envelope = await decodeEnvelope<ManagedDialPrefix>(
      response,
      decodeData: ManagedDialPrefix.fromJson,
    );
    return envelope.data!;
  }

  @override
  Future<ManagedNotice> updateNotice(
    String noticeId,
    ManagedNoticeUpsertInput input,
  ) async {
    final response = await _dio.patch<dynamic>(
      '/api/v1/admin/config/notices/$noticeId',
      data: input.toJson(),
      options: Options(headers: await _authHeaders()),
    );
    final envelope = await decodeEnvelope<ManagedNotice>(
      response,
      decodeData: ManagedNotice.fromJson,
    );
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
