import 'dart:convert';

import '../../../core/storage/secure_key_value_store.dart';
import '../domain/auth_session.dart';

abstract class SessionStore {
  Future<AuthSession?> read();

  Future<void> write(AuthSession session);

  Future<void> clear();
}

class SecureSessionStore implements SessionStore {
  SecureSessionStore(this._store);

  final SecureKeyValueStore _store;

  static const _sessionKey = 'auth_session';

  @override
  Future<void> clear() => _store.delete(_sessionKey);

  @override
  Future<AuthSession?> read() async {
    final raw = await _store.read(_sessionKey);
    if (raw == null || raw.isEmpty) {
      return null;
    }

    return AuthSession.fromJson(
      jsonDecode(raw) as Map<String, dynamic>,
    );
  }

  @override
  Future<void> write(AuthSession session) async {
    await _store.write(_sessionKey, jsonEncode(session.toJson()));
  }
}
