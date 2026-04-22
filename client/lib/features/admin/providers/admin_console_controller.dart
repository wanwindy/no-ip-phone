import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/admin_repository.dart';
import '../domain/admin_models.dart';
import 'admin_auth_controller.dart';

class AdminConsoleState {
  const AdminConsoleState({
    required this.isLoading,
    required this.isSaving,
    required this.accounts,
    required this.prefixes,
    required this.notices,
    this.errorMessage,
  });

  const AdminConsoleState.initial()
      : this(
          isLoading: false,
          isSaving: false,
          accounts: const <ManagedAccount>[],
          prefixes: const <ManagedDialPrefix>[],
          notices: const <ManagedNotice>[],
        );

  final bool isLoading;
  final bool isSaving;
  final List<ManagedAccount> accounts;
  final List<ManagedDialPrefix> prefixes;
  final List<ManagedNotice> notices;
  final String? errorMessage;

  AdminConsoleState copyWith({
    bool? isLoading,
    bool? isSaving,
    List<ManagedAccount>? accounts,
    List<ManagedDialPrefix>? prefixes,
    List<ManagedNotice>? notices,
    String? errorMessage,
    bool clearError = false,
  }) {
    return AdminConsoleState(
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      accounts: accounts ?? this.accounts,
      prefixes: prefixes ?? this.prefixes,
      notices: notices ?? this.notices,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

final adminConsoleControllerProvider =
    NotifierProvider<AdminConsoleController, AdminConsoleState>(
  AdminConsoleController.new,
);

class AdminConsoleController extends Notifier<AdminConsoleState> {
  late final AdminRepository _repository;

  @override
  AdminConsoleState build() {
    _repository = ref.read(adminRepositoryProvider);
    return const AdminConsoleState.initial();
  }

  void clear() {
    state = const AdminConsoleState.initial();
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  Future<String?> createAccount(ManagedAccountCreateInput input) async {
    return _runMutation(() async {
      final account = await _repository.createAccount(input);
      state = state.copyWith(
        accounts: _sortAccounts(<ManagedAccount>[
          ...state.accounts.where((item) => item.id != account.id),
          account,
        ]),
      );
    });
  }

  Future<String?> createDialPrefix(ManagedDialPrefixUpsertInput input) async {
    return _runMutation(() async {
      final prefix = await _repository.createDialPrefix(input);
      state = state.copyWith(
        prefixes: _sortPrefixes(<ManagedDialPrefix>[
          ...state.prefixes.where((item) => item.id != prefix.id),
          prefix,
        ]),
      );
    });
  }

  Future<String?> createNotice(ManagedNoticeUpsertInput input) async {
    return _runMutation(() async {
      final notice = await _repository.createNotice(input);
      state = state.copyWith(
        notices: _sortNotices(<ManagedNotice>[
          ...state.notices.where((item) => item.id != notice.id),
          notice,
        ]),
      );
    });
  }

  Future<String?> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final bundle = await _repository.loadConsole();
      state = state.copyWith(
        isLoading: false,
        accounts: _sortAccounts(bundle.accounts),
        prefixes: _sortPrefixes(bundle.prefixes),
        notices: _sortNotices(bundle.notices),
        clearError: true,
      );
      return null;
    } catch (error) {
      final message = error.toString();
      state = state.copyWith(
        isLoading: false,
        errorMessage: message,
      );
      return message;
    }
  }

  Future<String?> updateAccount(
    String accountId,
    ManagedAccountUpdateInput input,
  ) async {
    return _runMutation(() async {
      final account = await _repository.updateAccount(accountId, input);
      state = state.copyWith(
        accounts: _sortAccounts(<ManagedAccount>[
          ...state.accounts.where((item) => item.id != account.id),
          account,
        ]),
      );
    });
  }

  Future<String?> updateDialPrefix(
    String prefixId,
    ManagedDialPrefixUpsertInput input,
  ) async {
    return _runMutation(() async {
      final prefix = await _repository.updateDialPrefix(prefixId, input);
      state = state.copyWith(
        prefixes: _sortPrefixes(<ManagedDialPrefix>[
          ...state.prefixes.where((item) => item.id != prefix.id),
          prefix,
        ]),
      );
    });
  }

  Future<String?> updateNotice(
    String noticeId,
    ManagedNoticeUpsertInput input,
  ) async {
    return _runMutation(() async {
      final notice = await _repository.updateNotice(noticeId, input);
      state = state.copyWith(
        notices: _sortNotices(<ManagedNotice>[
          ...state.notices.where((item) => item.id != notice.id),
          notice,
        ]),
      );
    });
  }

  Future<String?> _runMutation(Future<void> Function() task) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      await task();
      state = state.copyWith(
        isSaving: false,
        clearError: true,
      );
      return null;
    } catch (error) {
      final message = error.toString();
      state = state.copyWith(
        isSaving: false,
        errorMessage: message,
      );
      return message;
    }
  }

  List<ManagedAccount> _sortAccounts(List<ManagedAccount> items) {
    final sorted = List<ManagedAccount>.from(items);
    sorted.sort((left, right) {
      final created = left.createdAt.compareTo(right.createdAt);
      if (created != 0) {
        return created;
      }
      return left.username.compareTo(right.username);
    });
    return sorted;
  }

  List<ManagedDialPrefix> _sortPrefixes(List<ManagedDialPrefix> items) {
    final sorted = List<ManagedDialPrefix>.from(items);
    sorted.sort((left, right) {
      final country = left.countryCode.compareTo(right.countryCode);
      if (country != 0) {
        return country;
      }
      final priority = right.priority.compareTo(left.priority);
      if (priority != 0) {
        return priority;
      }
      return left.carrierName.compareTo(right.carrierName);
    });
    return sorted;
  }

  List<ManagedNotice> _sortNotices(List<ManagedNotice> items) {
    final sorted = List<ManagedNotice>.from(items);
    sorted.sort((left, right) => right.createdAt.compareTo(left.createdAt));
    return sorted;
  }
}
