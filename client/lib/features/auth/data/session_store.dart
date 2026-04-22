import 'dart:convert';

import '../../../core/storage/secure_key_value_store.dart';
import '../domain/auth_session.dart';

abstract class SessionStore {
  Future<AuthSession?> read();

  Future<void> write(AuthSession session);

  Future<void> clear();
}

class SecureSessionStore implements SessionStore {
  SecureSessionStore(
    this._store, {
    this.sessionKey = defaultSessionKey,
  });

  final SecureKeyValueStore _store;
  final String sessionKey;

  static const defaultSessionKey = 'auth_session';

  @override
  Future<void> clear() => _store.delete(sessionKey);

  @override
  Future<AuthSession?> read() async {
    final raw = await _store.read(sessionKey);
    if (raw == null || raw.isEmpty) {
      return null;
    }

    return AuthSession.fromJson(
      jsonDecode(raw) as Map<String, dynamic>,
    );
  }

  @override
  Future<void> write(AuthSession session) async {
    await _store.write(sessionKey, jsonEncode(session.toJson()));
  }
}
