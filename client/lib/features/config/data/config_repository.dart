import '../domain/app_notice.dart';
import '../domain/dial_prefix_config.dart';
import 'config_api.dart';

class ConfigBundle {
  const ConfigBundle({
    required this.prefixes,
    required this.notices,
  });

  final List<DialPrefixConfig> prefixes;
  final List<AppNotice> notices;
}

abstract class ConfigRepository {
  Future<ConfigBundle> load();
}

class DefaultConfigRepository implements ConfigRepository {
  DefaultConfigRepository(this._api);

  final ConfigApi _api;

  @override
  Future<ConfigBundle> load() async {
    final prefixes = await _api.fetchDialPrefixes();
    final notices = await _api.fetchNotices();
    return ConfigBundle(prefixes: prefixes, notices: notices);
  }
}
