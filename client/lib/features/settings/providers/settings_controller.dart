import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/storage/preferences_store.dart';
import '../../auth/providers/auth_controller.dart';
import '../data/settings_repository.dart';
import '../domain/user_settings.dart';

class SettingsState {
  const SettingsState({
    required this.isLoading,
    required this.settings,
    this.errorMessage,
  });

  const SettingsState.initial()
    : this(isLoading: false, settings: const UserSettings.defaults());

  final bool isLoading;
  final UserSettings settings;
  final String? errorMessage;

  SettingsState copyWith({
    bool? isLoading,
    UserSettings? settings,
    String? errorMessage,
    bool clearError = false,
  }) {
    return SettingsState(
      isLoading: isLoading ?? this.isLoading,
      settings: settings ?? this.settings,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

final preferencesStoreProvider = Provider<PreferencesStore>((ref) {
  return SharedPreferencesStore();
});

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  return LocalSettingsRepository(ref.watch(preferencesStoreProvider));
});

final settingsControllerProvider =
    NotifierProvider<SettingsController, SettingsState>(SettingsController.new);

class SettingsController extends Notifier<SettingsState> {
  late final SettingsRepository _repository;

  @override
  SettingsState build() {
    _repository = ref.read(settingsRepositoryProvider);
    return const SettingsState.initial();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final settings = await _repository.load();
      state = state.copyWith(isLoading: false, settings: settings);
    } catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> updateDialPrefix(String prefix) async {
    final updated = state.settings.copyWith(defaultDialPrefix: prefix);
    state = state.copyWith(settings: updated, clearError: true);
    await _repository.save(updated);
  }

  Future<void> updateDisclaimer(bool value) async {
    final updated = state.settings.copyWith(showDialDisclaimer: value);
    state = state.copyWith(settings: updated, clearError: true);
    await _repository.save(updated);
  }

  Future<void> resetToDefaults() async {
    await updateDialPrefix(AppConstants.defaultDialPrefix);
    await updateDisclaimer(true);
  }

  Future<void> clearLocalData() async {
    await _repository.clearLocalData();
    await load();
  }

  Future<void> logout() async {
    await ref.read(authControllerProvider.notifier).logout();
  }
}
