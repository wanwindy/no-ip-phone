import '../../../core/network/api_exception.dart';
import '../../../core/storage/secure_key_value_store.dart';
import '../../auth/data/session_store.dart';
import '../../auth/domain/auth_session.dart';
import '../domain/admin_models.dart';
import 'admin_api.dart';

abstract class AdminRepository {
  Future<AuthSession> login({
    required String username,
    required String password,
  });

  Future<AuthSession?> restoreSession();

  Future<AuthSession> refreshSession();

  Future<void> logout();

  Future<AdminConsoleBundle> loadConsole();

  Future<ManagedAccount> createAccount(ManagedAccountCreateInput input);

  Future<ManagedAccount> updateAccount(String accountId, ManagedAccountUpdateInput input);

  Future<ManagedDialPrefix> createDialPrefix(ManagedDialPrefixUpsertInput input);

  Future<ManagedDialPrefix> updateDialPrefix(
    String prefixId,
    ManagedDialPrefixUpsertInput input,
  );

  Future<ManagedNotice> createNotice(ManagedNoticeUpsertInput input);

  Future<ManagedNotice> updateNotice(String noticeId, ManagedNoticeUpsertInput input);
}

class DefaultAdminRepository implements AdminRepository {
  DefaultAdminRepository({
    required AdminApi api,
    required SessionStore sessionStore,
    required SecureKeyValueStore secureStore,
  })  : _api = api,
        _sessionStore = sessionStore,
        _secureStore = secureStore;

  final AdminApi _api;
  final SessionStore _sessionStore;
  final SecureKeyValueStore _secureStore;

  static const _deviceIdKey = 'admin_device_id';
  static const _deviceIdValue = 'mock-device-admin-001';

  @override
  Future<ManagedAccount> createAccount(ManagedAccountCreateInput input) {
    return _withRefresh(() => _api.createAccount(input));
  }

  @override
  Future<ManagedDialPrefix> createDialPrefix(ManagedDialPrefixUpsertInput input) {
    return _withRefresh(() => _api.createDialPrefix(input));
  }

  @override
  Future<ManagedNotice> createNotice(ManagedNoticeUpsertInput input) {
    return _withRefresh(() => _api.createNotice(input));
  }

  @override
  Future<AuthSession> login({
    required String username,
    required String password,
  }) async {
    final tokens = await _api.login(
      username: username.trim(),
      password: password,
      deviceId: await _deviceId(),
    );
    final profile = await _api.me(tokens.accessToken);
    final session = AuthSession(
      user: AuthUser(
        username: profile.username,
        displayName: profile.displayName,
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
  Future<AdminConsoleBundle> loadConsole() async {
    final accounts = await _withRefresh(() => _api.listAccounts());
    final prefixes = await _withRefresh(() => _api.listDialPrefixes());
    final notices = await _withRefresh(() => _api.listNotices());

    return AdminConsoleBundle(
      accounts: accounts,
      prefixes: prefixes,
      notices: notices,
    );
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
        return await refreshSession();
      } catch (_) {
        await _sessionStore.clear();
        return null;
      }
    }

    try {
      final profile = await _api.me(session.tokens.accessToken);
      final updated = session.copyWith(
        user: session.user.copyWith(
          username: profile.username,
          displayName: profile.displayName,
        ),
      );
      await _sessionStore.write(updated);
      return updated;
    } catch (error) {
      if (error is ApiException && error.isUnauthorized) {
        try {
          return await refreshSession();
        } catch (_) {
          await _sessionStore.clear();
          return null;
        }
      }
      return session;
    }
  }

  @override
  Future<AuthSession> refreshSession() async {
    final session = await _sessionStore.read();
    if (session == null) {
      throw StateError('当前没有可刷新管理员会话');
    }

    final tokens = await _api.refresh(
      refreshToken: session.tokens.refreshToken,
      deviceId: await _deviceId(),
    );
    final profile = await _api.me(tokens.accessToken);
    final refreshed = session.copyWith(
      user: session.user.copyWith(
        username: profile.username,
        displayName: profile.displayName,
      ),
      tokens: AuthTokens(
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      ),
    );
    await _sessionStore.write(refreshed);
    return refreshed;
  }

  @override
  Future<ManagedAccount> updateAccount(
    String accountId,
    ManagedAccountUpdateInput input,
  ) {
    return _withRefresh(() => _api.updateAccount(accountId, input));
  }

  @override
  Future<ManagedDialPrefix> updateDialPrefix(
    String prefixId,
    ManagedDialPrefixUpsertInput input,
  ) {
    return _withRefresh(() => _api.updateDialPrefix(prefixId, input));
  }

  @override
  Future<ManagedNotice> updateNotice(
    String noticeId,
    ManagedNoticeUpsertInput input,
  ) {
    return _withRefresh(() => _api.updateNotice(noticeId, input));
  }

  Future<T> _withRefresh<T>(Future<T> Function() task) async {
    try {
      return await task();
    } catch (error) {
      if (error is ApiException && error.isUnauthorized) {
        await refreshSession();
        return task();
      }
      rethrow;
    }
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
