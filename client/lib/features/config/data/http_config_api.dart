import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_key_value_store.dart';
import '../domain/app_notice.dart';
import '../domain/dial_prefix_config.dart';
import 'config_api.dart';

class HttpConfigApi implements ConfigApi {
  HttpConfigApi({
    required Dio dio,
    required SecureKeyValueStore secureStore,
  })  : _dio = dio,
        _secureStore = secureStore;

  final Dio _dio;
  final SecureKeyValueStore _secureStore;

  static const _accessTokenKey = 'access_token';

  @override
  Future<List<AppNotice>> fetchNotices() async {
    final response = await _dio.get<dynamic>(
      '/api/v1/config/notices',
      options: Options(headers: await _authHeaders()),
    );
    final envelope = await decodeEnvelope<List<AppNotice>>(
      response,
      decodeData: (value) {
        final items = _asList(value);
        return items
            .map(
              (item) => AppNotice(
                title: _asMap(item)['title'] as String? ?? '',
                content: _asMap(item)['content'] as String? ?? '',
                type: _noticeTypeFrom(_asMap(item)['type'] as String?),
              ),
            )
            .toList();
      },
    );
    return envelope.data ?? const <AppNotice>[];
  }

  @override
  Future<List<DialPrefixConfig>> fetchDialPrefixes() async {
    final response = await _dio.get<dynamic>(
      '/api/v1/config/dial-prefixes',
      options: Options(headers: await _authHeaders()),
    );
    final envelope = await decodeEnvelope<List<DialPrefixConfig>>(
      response,
      decodeData: (value) {
        final items = _asList(value);
        return items
            .map(
              (item) => DialPrefixConfig(
                countryCode: _asMap(item)['countryCode'] as String? ?? 'CN',
                carrierName: _asMap(item)['carrierName'] as String? ?? '*',
                prefix: _asMap(item)['prefix'] as String? ?? '#31#',
                remark: _asMap(item)['remark'] as String? ?? '',
                priority: (_asMap(item)['priority'] as num?)?.toInt() ?? 0,
              ),
            )
            .toList();
      },
    );
    return envelope.data ?? const <DialPrefixConfig>[];
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

List<dynamic> _asList(dynamic value) {
  if (value is List<dynamic>) {
    return value;
  }
  if (value is List) {
    return List<dynamic>.from(value);
  }
  return const <dynamic>[];
}

AppNoticeType _noticeTypeFrom(String? value) {
  switch (value) {
    case 'warning':
      return AppNoticeType.warning;
    case 'critical':
      return AppNoticeType.critical;
    default:
      return AppNoticeType.info;
  }
}
