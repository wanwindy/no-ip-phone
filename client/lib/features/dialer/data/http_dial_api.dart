import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_key_value_store.dart';
import '../domain/dial_mode.dart';
import '../domain/outbound_call_task.dart';
import 'dial_api.dart';

class HttpDialApi implements DialApi {
  HttpDialApi({required Dio dio, required SecureKeyValueStore secureStore})
    : _dio = dio,
      _secureStore = secureStore;

  final Dio _dio;
  final SecureKeyValueStore _secureStore;

  static const _accessTokenKey = 'access_token';
  static const _tenantHeader = 'X-Tenant-Id';

  @override
  Future<OutboundCallTaskSnapshot> createOutboundCall({
    required String destinationNumber,
    String? tenantId,
  }) async {
    final response = await _dio.post<dynamic>(
      '/api/v1/calls/outbound',
      data: <String, Object>{'destinationNumber': destinationNumber},
      options: Options(headers: await _authHeaders(tenantId: tenantId)),
    );
    final envelope = await decodeEnvelope<OutboundCallTaskSnapshot>(
      response,
      decodeData: _decodeTaskSnapshot,
    );
    return envelope.data!;
  }

  @override
  Future<OutboundCallTaskSnapshot> getOutboundCallTask({
    required String taskId,
    String? tenantId,
  }) async {
    final response = await _dio.get<dynamic>(
      '/api/v1/calls/$taskId',
      options: Options(headers: await _authHeaders(tenantId: tenantId)),
    );
    final envelope = await decodeEnvelope<OutboundCallTaskSnapshot>(
      response,
      decodeData: _decodeTaskSnapshot,
    );
    return envelope.data!;
  }

  Future<Map<String, String>> _authHeaders({String? tenantId}) async {
    final token = await _secureStore.read(_accessTokenKey);
    final headers = <String, String>{};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    final normalizedTenantId = tenantId?.trim();
    if (normalizedTenantId != null && normalizedTenantId.isNotEmpty) {
      headers[_tenantHeader] = normalizedTenantId;
    }

    return headers;
  }

  OutboundCallTaskSnapshot _decodeTaskSnapshot(dynamic value) {
    final json = _asMap(value);
    final displayDid = _asNullableMap(json['displayDid']);
    final callbackWindow = _asNullableMap(json['callbackWindow']);
    final targetEndpoint = _asNullableMap(json['targetEndpoint']);
    final latestEvent = _asNullableMap(json['latestEvent']);
    return OutboundCallTaskSnapshot(
      taskId: json['taskId'] as String? ?? '',
      tenantId: json['tenantId'] as String? ?? '',
      mode: dialModeFromWireValue(json['mode'] as String?),
      status: json['status'] as String? ?? 'created',
      destinationNumber: json['destinationNumber'] as String? ?? '',
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      updatedAt:
          DateTime.tryParse(json['updatedAt'] as String? ?? '') ??
          DateTime.now(),
      currentDidE164: displayDid?['e164'] as String?,
      currentDidDisplayLabel: displayDid?['displayLabel'] as String?,
      targetEndpointId: targetEndpoint?['endpointId'] as String?,
      targetEndpointType: targetEndpoint?['endpointType'] as String?,
      targetEndpointValue: targetEndpoint?['endpointValue'] as String?,
      targetEndpointLabel: targetEndpoint?['endpointLabel'] as String?,
      callbackStatus: callbackWindow?['status'] as String?,
      callbackExpiresAt: DateTime.tryParse(
        callbackWindow?['expiresAt'] as String? ?? '',
      ),
      latestEventName: latestEvent?['eventName'] as String?,
      latestEventDirection: latestEvent?['eventDirection'] as String?,
      latestEventAt: DateTime.tryParse(
        latestEvent?['occurredAt'] as String? ?? '',
      ),
      note: json['note'] as String?,
    );
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

Map<String, dynamic>? _asNullableMap(dynamic value) {
  if (value == null) {
    return null;
  }
  return _asMap(value);
}
