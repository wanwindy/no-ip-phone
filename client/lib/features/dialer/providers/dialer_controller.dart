import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_store_provider.dart';
import '../../settings/providers/settings_controller.dart';
import '../data/dial_api.dart';
import '../data/dial_history_repository.dart';
import '../data/dial_repository.dart';
import '../data/dial_service.dart';
import '../data/http_dial_api.dart';
import '../domain/dial_failure.dart';
import '../domain/dial_mode.dart';
import '../domain/dial_plan.dart';
import '../domain/outbound_call_task.dart';
import '../domain/phone_number.dart';

class DialState {
  const DialState({
    required this.isDialing,
    required this.isRefreshingTask,
    required this.recentEntries,
    required this.selectedMode,
    this.lastPlan,
    this.activeTask,
    this.errorMessage,
  });

  const DialState.initial()
    : this(
        isDialing: false,
        isRefreshingTask: false,
        recentEntries: const [],
        selectedMode: DialMode.directPrefixMode,
      );

  final bool isDialing;
  final bool isRefreshingTask;
  final List<RecentDialEntry> recentEntries;
  final DialMode selectedMode;
  final DialPlan? lastPlan;
  final OutboundCallTaskSnapshot? activeTask;
  final String? errorMessage;

  DialState copyWith({
    bool? isDialing,
    bool? isRefreshingTask,
    List<RecentDialEntry>? recentEntries,
    DialMode? selectedMode,
    DialPlan? lastPlan,
    OutboundCallTaskSnapshot? activeTask,
    String? errorMessage,
    bool clearError = false,
    bool clearPlan = false,
    bool clearTask = false,
  }) {
    return DialState(
      isDialing: isDialing ?? this.isDialing,
      isRefreshingTask: isRefreshingTask ?? this.isRefreshingTask,
      recentEntries: recentEntries ?? this.recentEntries,
      selectedMode: selectedMode ?? this.selectedMode,
      lastPlan: clearPlan ? null : lastPlan ?? this.lastPlan,
      activeTask: clearTask ? null : activeTask ?? this.activeTask,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

final dialApiProvider = Provider<DialApi>((ref) {
  if (AppConfig.useMockApi) {
    return MockDialApi();
  }
  return HttpDialApi(
    dio: ref.read(dioProvider),
    secureStore: ref.read(secureKeyValueStoreProvider),
  );
});

final directDialServiceProvider = Provider<DialService>((ref) {
  return UrlLauncherDialService();
});

final serverOrchestratedDialServiceProvider = Provider<DialService>((ref) {
  return ServerOrchestratedDialService(api: ref.watch(dialApiProvider));
});

final dialHistoryRepositoryProvider = Provider<DialHistoryRepository>((ref) {
  return LocalDialHistoryRepository(ref.watch(preferencesStoreProvider));
});

final dialRepositoryProvider = Provider<DialRepository>((ref) {
  return DefaultDialRepository(
    dialServices: <DialMode, DialService>{
      DialMode.directPrefixMode: ref.watch(directDialServiceProvider),
      DialMode.serverOrchestratedMode: ref.watch(
        serverOrchestratedDialServiceProvider,
      ),
    },
    historyRepository: ref.watch(dialHistoryRepositoryProvider),
  );
});

final dialControllerProvider = NotifierProvider<DialController, DialState>(
  DialController.new,
);

class DialController extends Notifier<DialState> {
  late final DialRepository _repository;
  late final DialApi _dialApi;

  @override
  DialState build() {
    _repository = ref.read(dialRepositoryProvider);
    _dialApi = ref.read(dialApiProvider);
    return const DialState.initial();
  }

  Future<void> loadHistory() async {
    final entries = await _repository.loadHistory();
    state = state.copyWith(recentEntries: entries);
  }

  void selectMode(DialMode mode) {
    if (state.selectedMode == mode) {
      return;
    }
    state = state.copyWith(
      selectedMode: mode,
      clearError: true,
      clearTask: mode == DialMode.directPrefixMode,
    );
  }

  Future<DialExecutionResult?> dial({
    required String rawNumber,
    required bool privateDial,
    String? selectedTenantId,
  }) async {
    final number = PhoneNumber.parse(rawNumber);
    if (!number.isValid) {
      state = state.copyWith(
        isDialing: false,
        errorMessage: dialFailureMessage(DialFailureType.invalidNumber),
      );
      return null;
    }

    final mode = state.selectedMode;
    final settings = ref.read(settingsControllerProvider).settings;
    final normalizedPrivateDial =
        mode == DialMode.directPrefixMode && privateDial;
    final prefix = normalizedPrivateDial ? settings.defaultDialPrefix : '';
    if (normalizedPrivateDial && prefix.trim().isEmpty) {
      state = state.copyWith(
        isDialing: false,
        errorMessage: dialFailureMessage(DialFailureType.configUnavailable),
      );
      return null;
    }

    final plan = _repository.buildPlan(
      mode: mode,
      rawNumber: rawNumber,
      isPrivateDial: normalizedPrivateDial,
      prefix: normalizedPrivateDial ? prefix : AppConstants.defaultDialPrefix,
      selectedTenantId: selectedTenantId,
    );

    state = state.copyWith(
      isDialing: true,
      clearError: true,
      lastPlan: plan,
      clearTask: mode == DialMode.directPrefixMode,
    );
    try {
      final result = await _repository.dial(plan);
      await loadHistory();
      state = state.copyWith(
        isDialing: false,
        lastPlan: result.plan,
        activeTask: result.taskSnapshot,
        clearTask: result.taskSnapshot == null,
      );
      return result;
    } catch (error) {
      state = state.copyWith(
        isDialing: false,
        errorMessage: error is DialLaunchException
            ? error.toString()
            : dialFailureMessage(DialFailureType.unknown),
      );
      return null;
    }
  }

  Future<void> clearHistory() async {
    await _repository.clearHistory();
    await loadHistory();
  }

  Future<OutboundCallTaskSnapshot?> refreshActiveTaskStatus() async {
    final activeTask = state.activeTask;
    if (activeTask == null) {
      return null;
    }

    state = state.copyWith(isRefreshingTask: true, clearError: true);
    try {
      final refreshed = await _dialApi.getOutboundCallTask(
        taskId: activeTask.taskId,
        tenantId: activeTask.tenantId,
      );
      state = state.copyWith(isRefreshingTask: false, activeTask: refreshed);
      return refreshed;
    } catch (error) {
      state = state.copyWith(
        isRefreshingTask: false,
        errorMessage: error.toString(),
      );
      return null;
    }
  }
}
