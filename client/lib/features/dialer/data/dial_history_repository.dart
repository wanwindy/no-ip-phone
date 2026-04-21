import 'dart:convert';

import '../../../core/constants/app_constants.dart';
import '../../../core/storage/preferences_store.dart';
import '../../../shared/utils/phone_utils.dart';

class RecentDialEntry {
  const RecentDialEntry({
    required this.phoneNumber,
    required this.displayNumber,
    required this.isPrivateDial,
    required this.createdAt,
  });

  final String phoneNumber;
  final String displayNumber;
  final bool isPrivateDial;
  final DateTime createdAt;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'phoneNumber': phoneNumber,
      'displayNumber': displayNumber,
      'isPrivateDial': isPrivateDial,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory RecentDialEntry.fromJson(Map<String, dynamic> json) {
    return RecentDialEntry(
      phoneNumber: json['phoneNumber'] as String? ?? '',
      displayNumber: json['displayNumber'] as String? ?? '',
      isPrivateDial: json['isPrivateDial'] as bool? ?? false,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

abstract class DialHistoryRepository {
  Future<List<RecentDialEntry>> load();

  Future<void> add(RecentDialEntry entry);

  Future<void> clear();
}

class LocalDialHistoryRepository implements DialHistoryRepository {
  LocalDialHistoryRepository(this._store);

  final PreferencesStore _store;

  static const _historyKey = 'recent_dial_history';

  @override
  Future<void> add(RecentDialEntry entry) async {
    final current = await load();
    final next = <RecentDialEntry>[
      entry,
      ...current.where((item) => item.phoneNumber != entry.phoneNumber),
    ].take(AppConstants.recentNumbersLimit).toList();
    await _store.writeStringList(
      _historyKey,
      next.map((entry) => jsonEncode(entry.toJson())).toList(),
    );
  }

  @override
  Future<void> clear() => _store.remove(_historyKey);

  @override
  Future<List<RecentDialEntry>> load() async {
    final items = await _store.readStringList(_historyKey) ?? <String>[];
    return items
        .map((item) => RecentDialEntry.fromJson(
              jsonDecode(item) as Map<String, dynamic>,
            ))
        .toList();
  }
}

RecentDialEntry recentEntryFromDialPlan({
  required String phoneNumber,
  required bool isPrivateDial,
}) {
  return RecentDialEntry(
    phoneNumber: phoneNumber,
    displayNumber: maskPhoneNumber(phoneNumber),
    isPrivateDial: isPrivateDial,
    createdAt: DateTime.now(),
  );
}
