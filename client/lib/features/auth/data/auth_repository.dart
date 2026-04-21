import '../../../core/network/api_exception.dart';
import '../../../core/storage/secure_key_value_store.dart';
import '../../../shared/utils/phone_utils.dart';
import '../domain/auth_session.dart';
import 'auth_api.dart';
import 'session_store.dart';

abstract class AuthRepository {
  Future<SendCodeResponse> sendCode(String phone);

  Future<AuthSession> login({
    required String phone,
    required String code,
  });

  Future<AuthSession?> restoreSession();

  Future<AuthSession> refreshSession();

  Future<void> logout();
}

class DefaultAuthRepository implements AuthRepository {
  DefaultAuthRepository({
    required AuthApi api,
    required SessionStore sessionStore,
    required SecureKeyValueStore secureStore,
  })  : _api = api,
        _sessionStore = sessionStore,
        _secureStore = secureStore;

  final AuthApi _api;
  final SessionStore _sessionStore;
  final SecureKeyValueStore _secureStore;

  static const _deviceIdKey = 'device_id';
  static const _deviceIdValue = 'mock-device-client-001';

  @override
  Future<AuthSession> login({
    required String phone,
    required String code,
  }) async {
    final tokens = await _api.login(
      phone: normalizePhoneNumber(phone),
      code: code,
      deviceId: await _deviceId(),
    );
    final session = AuthSession(
      user: AuthUser(
        phone: normalizePhoneNumber(phone),
        displayPhone: maskPhoneNumber(phone),
      ),
      tokens: AuthTokens(
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      ),
    );
    await _sessionStore.write(session);
    return session;
  }

  @override
  Future<void> logout() async {
    final session = await _sessionStore.read();
    try {
      if (session != null) {
        await _api.logout(session.tokens.refreshToken);
      }
    } finally {
      await _sessionStore.clear();
    }
  }

  @override
  Future<AuthSession?> restoreSession() async {
    final session = await _sessionStore.read();
    if (session == null) {
      return null;
    }

    if (!session.isAuthenticated) {
      try {
        final refreshed = await refreshSession();
        return refreshed;
      } catch (_) {
        await _sessionStore.clear();
        return null;
      }
    }

    try {
      final profile = await _api.me(session.tokens.accessToken);
      final updated = session.copyWith(
        user: session.user.copyWith(displayPhone: profile.phone),
      );
      await _sessionStore.write(updated);
      return updated;
    } catch (error) {
      if (error is ApiException && error.isUnauthorized) {
        try {
          final refreshed = await refreshSession();
          return refreshed;
        } catch (_) {
          await _sessionStore.clear();
          return null;
        }
      }
      return session;
    }
  }

  @override
  Future<SendCodeResponse> sendCode(String phone) => _api.sendCode(phone);

  @override
  Future<AuthSession> refreshSession() async {
    final session = await _sessionStore.read();
    if (session == null) {
      throw StateError('当前没有可刷新会话');
    }

    final tokens = await _api.refresh(
      refreshToken: session.tokens.refreshToken,
      deviceId: await _deviceId(),
    );
    final refreshed = session.copyWith(
      tokens: AuthTokens(
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      ),
    );
    await _sessionStore.write(refreshed);
    return refreshed;
  }

  Future<String> _deviceId() async {
    final stored = await _secureStore.read(_deviceIdKey);
    if (stored != null && stored.isNotEmpty) {
      return stored;
    }

    await _secureStore.write(_deviceIdKey, _deviceIdValue);
    return _deviceIdValue;
  }
}
