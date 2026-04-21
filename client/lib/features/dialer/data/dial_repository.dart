import '../domain/dial_plan.dart';
import 'dial_history_repository.dart';
import 'dial_service.dart';

abstract class DialRepository {
  DialPlan buildPlan({
    required String rawNumber,
    required bool isPrivateDial,
    required String prefix,
  });

  Future<void> dial(DialPlan plan);

  Future<List<RecentDialEntry>> loadHistory();

  Future<void> clearHistory();
}

class DefaultDialRepository implements DialRepository {
  DefaultDialRepository({
    required DialService dialService,
    required DialHistoryRepository historyRepository,
  })  : _dialService = dialService,
        _historyRepository = historyRepository;

  final DialService _dialService;
  final DialHistoryRepository _historyRepository;

  @override
  Future<void> clearHistory() => _historyRepository.clear();

  @override
  DialPlan buildPlan({
    required String rawNumber,
    required bool isPrivateDial,
    required String prefix,
  }) {
    return _dialService.buildPlan(
      rawNumber: rawNumber,
      isPrivateDial: isPrivateDial,
      prefix: prefix,
    );
  }

  @override
  Future<void> dial(DialPlan plan) async {
    await _dialService.launch(plan);
    await _historyRepository.add(
      recentEntryFromDialPlan(
        phoneNumber: plan.normalizedNumber,
        isPrivateDial: plan.isPrivateDial,
      ),
    );
  }

  @override
  Future<List<RecentDialEntry>> loadHistory() => _historyRepository.load();
}
