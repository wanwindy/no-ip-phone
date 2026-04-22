import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_store_provider.dart';
import '../../auth/data/session_store.dart';
import '../../auth/domain/auth_session.dart';
import '../data/admin_api.dart';
import '../data/admin_repository.dart';
import '../data/http_admin_api.dart';

enum AdminAuthStatus { booting, unauthenticated, authenticated, error }

class AdminAuthState {
  const AdminAuthState({
    required this.status,
    this.session,
    this.errorMessage,
  });

  factory AdminAuthState.initial() =>
      const AdminAuthState(status: AdminAuthStatus.booting);

  final AdminAuthStatus status;
  final AuthSession? session;
  final String? errorMessage;

  bool get isAuthenticated =>
      status == AdminAuthStatus.authenticated &&
      session?.isAuthenticated == true;

  AdminAuthState copyWith({
    AdminAuthStatus? status,
    AuthSession? session,
    String? errorMessage,
    bool clearSession = false,
    bool clearError = false,
  }) {
    return AdminAuthState(
      status: status ?? this.status,
      session: clearSession ? null : session ?? this.session,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

final adminSessionStoreProvider = Provider<SessionStore>((ref) {
  return SecureSessionStore(
    ref.watch(secureKeyValueStoreProvider),
    sessionKey: 'admin_auth_session',
  );
});

final adminApiProvider = Provider<AdminApi>((ref) {
  if (AppConfig.useMockApi) {
    return MockAdminApi();
  }
  return HttpAdminApi(
    dio: ref.read(dioProvider),
    secureStore: ref.read(secureKeyValueStoreProvider),
  );
});

final adminRepositoryProvider = Provider<AdminRepository>((ref) {
  return DefaultAdminRepository(
    api: ref.watch(adminApiProvider),
    sessionStore: ref.watch(adminSessionStoreProvider),
    secureStore: ref.watch(secureKeyValueStoreProvider),
  );
});

final adminAuthControllerProvider =
    NotifierProvider<AdminAuthController, AdminAuthState>(
  AdminAuthController.new,
);

class AdminAuthController extends Notifier<AdminAuthState> {
  late final AdminRepository _repository;

  @override
  AdminAuthState build() {
    _repository = ref.read(adminRepositoryProvider);
    return AdminAuthState.initial();
  }

  Future<void> initialize() async {
    if (state.status != AdminAuthStatus.booting) {
      return;
    }

    state = state.copyWith(status: AdminAuthStatus.booting, clearError: true);
    final session = await _repository.restoreSession();
    if (session == null) {
      state = state.copyWith(
        status: AdminAuthStatus.unauthenticated,
        clearSession: true,
      );
      return;
    }

    state = state.copyWith(
      status: AdminAuthStatus.authenticated,
      session: session,
      clearError: true,
    );
  }

  Future<AuthSession?> login({
    required String username,
    required String password,
  }) async {
    state = state.copyWith(status: AdminAuthStatus.booting, clearError: true);
    try {
      final session = await _repository.login(
        username: username,
        password: password,
      );
      state = state.copyWith(
        status: AdminAuthStatus.authenticated,
        session: session,
      );
      return session;
    } catch (error) {
      state = state.copyWith(
        status: AdminAuthStatus.error,
        errorMessage: error.toString(),
      );
      return null;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = state.copyWith(
      status: AdminAuthStatus.unauthenticated,
      clearSession: true,
      clearError: true,
    );
  }

  Future<void> refreshSession() async {
    final session = await _repository.refreshSession();
    state = state.copyWith(
      status: AdminAuthStatus.authenticated,
      session: session,
      clearError: true,
    );
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }
}
