import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../admin/providers/admin_auth_controller.dart';
import '../../auth/providers/auth_controller.dart';
import '../../dialer/providers/dialer_controller.dart';
import '../../settings/providers/settings_controller.dart';

enum StartupStatus { idle, loading, ready }

class StartupState {
  const StartupState({
    required this.status,
    this.note,
  });

  const StartupState.idle() : this(status: StartupStatus.idle);

  final StartupStatus status;
  final String? note;

  StartupState copyWith({
    StartupStatus? status,
    String? note,
    bool clearNote = false,
  }) {
    return StartupState(
      status: status ?? this.status,
      note: clearNote ? null : note ?? this.note,
    );
  }
}

final startupControllerProvider =
    NotifierProvider<StartupController, StartupState>(StartupController.new);

class StartupController extends Notifier<StartupState> {
  @override
  StartupState build() => const StartupState.idle();

  Future<void> bootstrap() async {
    if (state.status == StartupStatus.loading ||
        state.status == StartupStatus.ready) {
      return;
    }

    state = state.copyWith(status: StartupStatus.loading, clearNote: true);

    await Future.wait([
      _safe(() => ref.read(authControllerProvider.notifier).initialize()),
      _safe(() => ref.read(adminAuthControllerProvider.notifier).initialize()),
      _safe(() => ref.read(settingsControllerProvider.notifier).load()),
      _safe(() => ref.read(dialControllerProvider.notifier).loadHistory()),
    ]);

    state = state.copyWith(status: StartupStatus.ready);
  }

  Future<void> _safe(Future<void> Function() task) async {
    try {
      await task();
    } catch (error) {
      state = state.copyWith(
        status: StartupStatus.loading,
        note: error.toString(),
      );
    }
  }
}
