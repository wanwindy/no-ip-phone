import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'secure_key_value_store.dart';

final secureKeyValueStoreProvider = Provider<SecureKeyValueStore>((ref) {
  return const FlutterSecureKeyValueStore();
});
