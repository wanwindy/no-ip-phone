import 'package:shared_preferences/shared_preferences.dart';

abstract class PreferencesStore {
  Future<String?> readString(String key);

  Future<void> writeString(String key, String value);

  Future<bool?> readBool(String key);

  Future<void> writeBool(String key, bool value);

  Future<List<String>?> readStringList(String key);

  Future<void> writeStringList(String key, List<String> value);

  Future<void> remove(String key);
}

class SharedPreferencesStore implements PreferencesStore {
  SharedPreferences? _prefs;

  Future<SharedPreferences> _instance() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  @override
  Future<bool?> readBool(String key) async => (await _instance()).getBool(key);

  @override
  Future<List<String>?> readStringList(String key) async =>
      (await _instance()).getStringList(key);

  @override
  Future<String?> readString(String key) async =>
      (await _instance()).getString(key);

  @override
  Future<void> remove(String key) async {
    await (await _instance()).remove(key);
  }

  @override
  Future<void> writeBool(String key, bool value) async {
    await (await _instance()).setBool(key, value);
  }

  @override
  Future<void> writeString(String key, String value) async {
    await (await _instance()).setString(key, value);
  }

  @override
  Future<void> writeStringList(String key, List<String> value) async {
    await (await _instance()).setStringList(key, value);
  }
}
