import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import 'api_exception.dart';

final dioProvider = Provider<Dio>((ref) {
  return Dio(
    BaseOptions(
      baseUrl: _normalizeBaseUrl(AppConfig.apiBaseUrl),
      connectTimeout: Duration(seconds: AppConfig.connectTimeoutSeconds),
      receiveTimeout: Duration(seconds: AppConfig.receiveTimeoutSeconds),
      sendTimeout: Duration(seconds: AppConfig.connectTimeoutSeconds),
      headers: const <String, Object>{
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );
});

class ApiEnvelope<T> {
  const ApiEnvelope({
    required this.code,
    required this.message,
    required this.data,
  });

  final int code;
  final String message;
  final T? data;

  bool get isSuccess => code == 0;

  factory ApiEnvelope.fromJson(
    dynamic raw, {
    required T? Function(dynamic value) decodeData,
  }) {
    final json = _ensureMap(raw);
    return ApiEnvelope<T>(
      code: (json['code'] as num?)?.toInt() ?? -1,
      message: (json['message'] as String?)?.trim().isNotEmpty == true
          ? json['message'] as String
          : '请求失败，请稍后重试',
      data: decodeData(json['data']),
    );
  }
}

Map<String, dynamic> _ensureMap(dynamic raw) {
  if (raw is Map<String, dynamic>) {
    return raw;
  }
  if (raw is Map) {
    return raw.map((key, value) => MapEntry(key.toString(), value));
  }
  if (raw is String && raw.isNotEmpty) {
    final decoded = jsonDecode(raw);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }
    if (decoded is Map) {
      return decoded.map((key, value) => MapEntry(key.toString(), value));
    }
  }
  throw const FormatException('响应格式不正确');
}

String _normalizeBaseUrl(String baseUrl) {
  final trimmed = baseUrl.trim();
  if (trimmed.isEmpty) {
    return 'http://127.0.0.1:3000';
  }
  return trimmed.endsWith('/') ? trimmed.substring(0, trimmed.length - 1) : trimmed;
}

ApiException apiExceptionFromResponse(
  Response<dynamic> response, {
  String? fallbackMessage,
}) {
  try {
    final envelope = ApiEnvelope<Object?>.fromJson(
      response.data,
      decodeData: (value) => value,
    );
    return ApiException(
      code: envelope.code,
      message: apiErrorMessage(
        code: envelope.code,
        message: envelope.message,
        statusCode: response.statusCode,
      ),
      statusCode: response.statusCode,
      data: envelope.data,
    );
  } catch (_) {
    return ApiException(
      code: null,
      message: fallbackMessage ??
          apiErrorMessage(statusCode: response.statusCode, message: null),
      statusCode: response.statusCode,
      data: response.data,
    );
  }
}

Future<ApiEnvelope<T>> decodeEnvelope<T>(
  Response<dynamic> response, {
  required T? Function(dynamic value) decodeData,
}) async {
  final envelope = ApiEnvelope<T>.fromJson(
    response.data,
    decodeData: decodeData,
  );
  if (!envelope.isSuccess) {
    throw ApiException(
      code: envelope.code,
      message: apiErrorMessage(
        code: envelope.code,
        message: envelope.message,
        statusCode: response.statusCode,
      ),
      statusCode: response.statusCode,
      data: envelope.data,
    );
  }
  return envelope;
}

Future<Map<String, String>> authHeader(
  String? accessToken, {
  String? refreshToken,
}) async {
  final headers = <String, String>{};
  if (accessToken != null && accessToken.isNotEmpty) {
    headers['Authorization'] = 'Bearer $accessToken';
  }
  if (refreshToken != null && refreshToken.isNotEmpty) {
    headers['X-Refresh-Token'] = refreshToken;
  }
  return headers;
}
