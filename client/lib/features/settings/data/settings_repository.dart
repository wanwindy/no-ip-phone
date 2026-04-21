import '../../../core/constants/app_constants.dart';
import '../../../core/storage/preferences_store.dart';
import '../domain/user_settings.dart';

abstract class SettingsRepository {
  Future<UserSettings> load();

  Future<UserSettings> save(UserSettings settings);

  Future<void> clearLocalData();
}

class LocalSettingsRepository implements SettingsRepository {
  LocalSettingsRepository(this._store);

  final PreferencesStore _store;

  static const _defaultDialPrefixKey = 'default_dial_prefix';
  static const _showDisclaimerKey = 'show_dial_disclaimer';

  @override
  Future<void> clearLocalData() async {
    await _store.remove(_defaultDialPrefixKey);
    await _store.remove(_showDisclaimerKey);
  }

  @override
  Future<UserSettings> load() async {
    final prefix = await _store.readString(_defaultDialPrefixKey);
    final showDisclaimer = await _store.readBool(_showDisclaimerKey);
    return UserSettings(
      defaultDialPrefix: prefix?.trim().isEmpty == true
          ? AppConstants.defaultDialPrefix
          : prefix ?? AppConstants.defaultDialPrefix,
      showDialDisclaimer: showDisclaimer ?? true,
    );
  }

  @override
  Future<UserSettings> save(UserSettings settings) async {
    await _store.writeString(_defaultDialPrefixKey, settings.defaultDialPrefix);
    await _store.writeBool(_showDisclaimerKey, settings.showDialDisclaimer);
    return settings;
  }
}
