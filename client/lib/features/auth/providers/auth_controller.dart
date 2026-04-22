import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_store_provider.dart';
import '../../config/providers/config_controller.dart';
import '../data/auth_api.dart';
import '../data/auth_repository.dart';
import '../data/http_auth_api.dart';
import '../data/session_store.dart';
import '../domain/auth_session.dart';

enum AuthStatus { booting, unauthenticated, authenticated, error }

class AuthState {
  const AuthState({
    required this.status,
    this.session,
    this.errorMessage,
  });

  factory AuthState.initial() => const AuthState(status: AuthStatus.booting);

  final AuthStatus status;
  final AuthSession? session;
  final String? errorMessage;

  bool get isAuthenticated =>
      status == AuthStatus.authenticated && session?.isAuthenticated == true;

  AuthState copyWith({
    AuthStatus? status,
    AuthSession? session,
    String? errorMessage,
    bool clearSession = false,
    bool clearError = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      session: clearSession ? null : session ?? this.session,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

final sessionStoreProvider = Provider<SessionStore>((ref) {
  return SecureSessionStore(ref.watch(secureKeyValueStoreProvider));
});

final authApiProvider = Provider<AuthApi>((ref) {
  if (AppConfig.useMockApi) {
    return MockAuthApi();
  }
  return HttpAuthApi(
    dio: ref.read(dioProvider),
    secureStore: ref.read(secureKeyValueStoreProvider),
  );
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return DefaultAuthRepository(
    api: ref.watch(authApiProvider),
    sessionStore: ref.watch(sessionStoreProvider),
    secureStore: ref.watch(secureKeyValueStoreProvider),
  );
});

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);

class AuthController extends Notifier<AuthState> {
  late final AuthRepository _repository;

  @override
  AuthState build() {
    _repository = ref.read(authRepositoryProvider);
    return AuthState.initial();
  }

  Future<void> initialize() async {
    if (state.status != AuthStatus.booting) {
      return;
    }

    state = state.copyWith(status: AuthStatus.booting, clearError: true);
    final session = await _repository.restoreSession();
    if (session == null) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        clearSession: true,
      );
      return;
    }

    state = state.copyWith(
      status: AuthStatus.authenticated,
      session: session,
      clearError: true,
    );
    await ref.read(configControllerProvider.notifier).load();
  }

  Future<AuthSession?> login({
    required String username,
    required String password,
  }) async {
    state = state.copyWith(status: AuthStatus.booting, clearError: true);
    try {
      final session = await _repository.login(
        username: username,
        password: password,
      );
      state = state.copyWith(
        status: AuthStatus.authenticated,
        session: session,
      );
      await ref.read(configControllerProvider.notifier).load();
      return session;
    } catch (error) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: error.toString(),
      );
      return null;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = state.copyWith(
      status: AuthStatus.unauthenticated,
      clearSession: true,
      clearError: true,
    );
  }

  Future<void> refreshSession() async {
    final session = await _repository.refreshSession();
    state = state.copyWith(
      status: AuthStatus.authenticated,
      session: session,
      clearError: true,
    );
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }
}
