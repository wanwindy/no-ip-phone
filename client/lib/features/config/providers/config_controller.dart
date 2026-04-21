import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_store_provider.dart';
import '../data/config_api.dart';
import '../data/config_repository.dart';
import '../data/http_config_api.dart';
import '../domain/app_notice.dart';
import '../domain/dial_prefix_config.dart';

class ConfigState {
  const ConfigState({
    required this.isLoading,
    required this.prefixes,
    required this.notices,
    this.errorMessage,
  });

  const ConfigState.initial()
      : this(
          isLoading: false,
          prefixes: const [],
          notices: const [],
        );

  final bool isLoading;
  final List<DialPrefixConfig> prefixes;
  final List<AppNotice> notices;
  final String? errorMessage;

  ConfigState copyWith({
    bool? isLoading,
    List<DialPrefixConfig>? prefixes,
    List<AppNotice>? notices,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ConfigState(
      isLoading: isLoading ?? this.isLoading,
      prefixes: prefixes ?? this.prefixes,
      notices: notices ?? this.notices,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

final configApiProvider = Provider<ConfigApi>((ref) {
  if (AppConfig.useMockApi) {
    return MockConfigApi();
  }
  return HttpConfigApi(
    dio: ref.read(dioProvider),
    secureStore: ref.read(secureKeyValueStoreProvider),
  );
});

final configRepositoryProvider = Provider<ConfigRepository>((ref) {
  return DefaultConfigRepository(ref.watch(configApiProvider));
});

final configControllerProvider =
    NotifierProvider<ConfigController, ConfigState>(ConfigController.new);

class ConfigController extends Notifier<ConfigState> {
  late final ConfigRepository _repository;

  @override
  ConfigState build() {
    _repository = ref.read(configRepositoryProvider);
    return const ConfigState.initial();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final bundle = await _repository.load();
      state = state.copyWith(
        isLoading: false,
        prefixes: bundle.prefixes,
        notices: bundle.notices,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
    }
  }
}
