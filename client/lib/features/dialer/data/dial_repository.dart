import '../domain/dial_plan.dart';
import '../domain/dial_mode.dart';
import 'dial_history_repository.dart';
import 'dial_service.dart';

abstract class DialRepository {
  DialPlan buildPlan({
    required DialMode mode,
    required String rawNumber,
    required bool isPrivateDial,
    required String prefix,
    String? selectedTenantId,
  });

  Future<DialExecutionResult> dial(DialPlan plan);

  Future<List<RecentDialEntry>> loadHistory();

  Future<void> clearHistory();
}

class DefaultDialRepository implements DialRepository {
  DefaultDialRepository({
    required Map<DialMode, DialService> dialServices,
    required DialHistoryRepository historyRepository,
  }) : _dialServices = dialServices,
       _historyRepository = historyRepository;

  final Map<DialMode, DialService> _dialServices;
  final DialHistoryRepository _historyRepository;

  @override
  Future<void> clearHistory() => _historyRepository.clear();

  @override
  DialPlan buildPlan({
    required DialMode mode,
    required String rawNumber,
    required bool isPrivateDial,
    required String prefix,
    String? selectedTenantId,
  }) {
    return _serviceFor(mode).buildPlan(
      rawNumber: rawNumber,
      isPrivateDial: isPrivateDial,
      prefix: prefix,
      selectedTenantId: selectedTenantId,
    );
  }

  @override
  Future<DialExecutionResult> dial(DialPlan plan) async {
    final result = await _serviceFor(plan.mode).launch(plan);
    await _historyRepository.add(
      recentEntryFromDialPlan(
        phoneNumber: result.plan.normalizedNumber,
        isPrivateDial: result.plan.isPrivateDial,
        mode: result.plan.mode,
      ),
    );
    return result;
  }

  @override
  Future<List<RecentDialEntry>> loadHistory() => _historyRepository.load();

  DialService _serviceFor(DialMode mode) {
    final service = _dialServices[mode];
    if (service == null) {
      throw StateError('未找到 ${mode.wireValue} 的拨号实现');
    }
    return service;
  }
}
