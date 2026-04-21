import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_store_provider.dart';
import '../data/auth_api.dart';
import '../data/auth_repository.dart';
import '../data/http_auth_api.dart';
import '../data/session_store.dart';
import '../domain/auth_session.dart';
import '../../config/providers/config_controller.dart';

enum AuthStatus { booting, unauthenticated, codeSent, authenticated, error }

class AuthState {
  const AuthState({
    required this.status,
    this.session,
    this.pendingPhone,
    this.cooldownUntil,
    this.errorMessage,
    this.mockVerificationCode,
  });

  factory AuthState.initial() => const AuthState(status: AuthStatus.booting);

  final AuthStatus status;
  final AuthSession? session;
  final String? pendingPhone;
  final DateTime? cooldownUntil;
  final String? errorMessage;
  final String? mockVerificationCode;

  bool get isAuthenticated =>
      status == AuthStatus.authenticated && session?.isAuthenticated == true;

  bool get canResendCode =>
      cooldownUntil == null || DateTime.now().isAfter(cooldownUntil!);

  int get resendCountdownSeconds {
    if (cooldownUntil == null) {
      return 0;
    }
    final remaining = cooldownUntil!.difference(DateTime.now()).inSeconds;
    return remaining.isNegative ? 0 : remaining;
  }

  AuthState copyWith({
    AuthStatus? status,
    AuthSession? session,
    String? pendingPhone,
    DateTime? cooldownUntil,
    String? errorMessage,
    String? mockVerificationCode,
    bool clearSession = false,
    bool clearPendingPhone = false,
    bool clearCooldown = false,
    bool clearError = false,
    bool clearMockCode = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      session: clearSession ? null : session ?? this.session,
      pendingPhone: clearPendingPhone ? null : pendingPhone ?? this.pendingPhone,
      cooldownUntil: clearCooldown ? null : cooldownUntil ?? this.cooldownUntil,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      mockVerificationCode:
          clearMockCode ? null : mockVerificationCode ?? this.mockVerificationCode,
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
        clearPendingPhone: true,
        clearCooldown: true,
        clearMockCode: true,
      );
      return;
    }

    state = state.copyWith(
      status: AuthStatus.authenticated,
      session: session,
      pendingPhone: session.user.phone,
      clearError: true,
      clearCooldown: true,
    );
    await ref.read(configControllerProvider.notifier).load();
  }

  Future<bool> sendCode(String phone) async {
    state = state.copyWith(status: AuthStatus.booting, clearError: true);
    try {
      final response = await _repository.sendCode(phone);
      state = state.copyWith(
        status: AuthStatus.codeSent,
        pendingPhone: phone,
        cooldownUntil: DateTime.now().add(
          Duration(seconds: response.cooldownSeconds),
        ),
        mockVerificationCode: response.mockCode,
      );
      return true;
    } catch (error) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: error.toString(),
      );
      return false;
    }
  }

  Future<AuthSession?> login({
    required String phone,
    required String code,
  }) async {
    state = state.copyWith(status: AuthStatus.booting, clearError: true);
    try {
      final session = await _repository.login(phone: phone, code: code);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        session: session,
        pendingPhone: phone,
        clearMockCode: true,
        clearCooldown: true,
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
      clearPendingPhone: true,
      clearCooldown: true,
      clearError: true,
      clearMockCode: true,
    );
  }

  Future<void> refreshSession() async {
    final session = await _repository.refreshSession();
    state = state.copyWith(
      status: AuthStatus.authenticated,
      session: session,
      pendingPhone: session.user.phone,
      clearError: true,
    );
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }
}
