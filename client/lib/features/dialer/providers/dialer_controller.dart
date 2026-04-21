import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_constants.dart';
import '../../settings/providers/settings_controller.dart';
import '../data/dial_history_repository.dart';
import '../data/dial_repository.dart';
import '../data/dial_service.dart';
import '../domain/dial_failure.dart';
import '../domain/dial_plan.dart';
import '../domain/phone_number.dart';

class DialState {
  const DialState({
    required this.isDialing,
    required this.recentEntries,
    this.lastPlan,
    this.errorMessage,
  });

  const DialState.initial() : this(isDialing: false, recentEntries: const []);

  final bool isDialing;
  final List<RecentDialEntry> recentEntries;
  final DialPlan? lastPlan;
  final String? errorMessage;

  DialState copyWith({
    bool? isDialing,
    List<RecentDialEntry>? recentEntries,
    DialPlan? lastPlan,
    String? errorMessage,
    bool clearError = false,
    bool clearPlan = false,
  }) {
    return DialState(
      isDialing: isDialing ?? this.isDialing,
      recentEntries: recentEntries ?? this.recentEntries,
      lastPlan: clearPlan ? null : lastPlan ?? this.lastPlan,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

final dialServiceProvider = Provider<DialService>((ref) {
  return UrlLauncherDialService();
});

final dialHistoryRepositoryProvider = Provider<DialHistoryRepository>((ref) {
  return LocalDialHistoryRepository(ref.watch(preferencesStoreProvider));
});

final dialRepositoryProvider = Provider<DialRepository>((ref) {
  return DefaultDialRepository(
    dialService: ref.watch(dialServiceProvider),
    historyRepository: ref.watch(dialHistoryRepositoryProvider),
  );
});

final dialControllerProvider = NotifierProvider<DialController, DialState>(
  DialController.new,
);

class DialController extends Notifier<DialState> {
  late final DialRepository _repository;

  @override
  DialState build() {
    _repository = ref.read(dialRepositoryProvider);
    return const DialState.initial();
  }

  Future<void> loadHistory() async {
    final entries = await _repository.loadHistory();
    state = state.copyWith(recentEntries: entries);
  }

  Future<DialPlan?> dial({
    required String rawNumber,
    required bool privateDial,
  }) async {
    final number = PhoneNumber.parse(rawNumber);
    if (!number.isValid) {
      state = state.copyWith(
        isDialing: false,
        errorMessage: dialFailureMessage(DialFailureType.invalidNumber),
      );
      return null;
    }

    final settings = ref.read(settingsControllerProvider).settings;
    final prefix = privateDial ? settings.defaultDialPrefix : '';
    if (privateDial && prefix.trim().isEmpty) {
      state = state.copyWith(
        isDialing: false,
        errorMessage: dialFailureMessage(DialFailureType.configUnavailable),
      );
      return null;
    }

    final plan = _repository.buildPlan(
      rawNumber: rawNumber,
      isPrivateDial: privateDial,
      prefix: privateDial ? prefix : AppConstants.defaultDialPrefix,
    );

    state = state.copyWith(isDialing: true, clearError: true, lastPlan: plan);
    try {
      await _repository.dial(plan);
      await loadHistory();
      state = state.copyWith(isDialing: false, lastPlan: plan);
      return plan;
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
}
