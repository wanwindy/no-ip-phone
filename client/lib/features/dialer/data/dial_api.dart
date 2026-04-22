import '../domain/dial_mode.dart';
import '../domain/outbound_call_task.dart';

abstract class DialApi {
  Future<OutboundCallTaskSnapshot> createOutboundCall({
    required String destinationNumber,
    String? tenantId,
  });

  Future<OutboundCallTaskSnapshot> getOutboundCallTask({
    required String taskId,
    String? tenantId,
  });
}

class MockDialApi implements DialApi {
  final Map<String, OutboundCallTaskSnapshot> _tasks =
      <String, OutboundCallTaskSnapshot>{};

  static const List<String> _statusProgression = <String>[
    'created',
    'dispatching',
    'ringing',
    'answered',
    'bridged',
    'completed',
  ];

  @override
  Future<OutboundCallTaskSnapshot> createOutboundCall({
    required String destinationNumber,
    String? tenantId,
  }) async {
    final now = DateTime.now();
    final task = OutboundCallTaskSnapshot(
      taskId: 'mock-call-${now.microsecondsSinceEpoch}',
      tenantId: tenantId?.trim().isNotEmpty == true
          ? tenantId!.trim()
          : 'mock-tenant-default',
      mode: DialMode.serverOrchestratedMode,
      status: 'dispatching',
      destinationNumber: destinationNumber,
      createdAt: now,
      updatedAt: now,
      currentDidE164: '+617676021983',
      currentDidDisplayLabel: '00617676021983',
      targetEndpointId: 'mock-endpoint-primary',
      targetEndpointType: 'app_user',
      targetEndpointValue: 'member:mock-agent-001',
      targetEndpointLabel: 'Mock Agent Endpoint',
      callbackStatus: 'active',
      callbackExpiresAt: now.add(const Duration(hours: 2)),
      latestEventName: 'telephony.outbound.accepted',
      latestEventDirection: 'outbound',
      latestEventAt: now,
      note: 'Mock 编排任务已落库；可通过刷新按钮模拟状态推进。',
    );
    _tasks[task.taskId] = task;
    return task;
  }

  @override
  Future<OutboundCallTaskSnapshot> getOutboundCallTask({
    required String taskId,
    String? tenantId,
  }) async {
    final existing = _tasks[taskId];
    if (existing == null) {
      throw StateError('外呼任务不存在或已过期');
    }

    if (tenantId != null &&
        tenantId.trim().isNotEmpty &&
        tenantId.trim() != existing.tenantId) {
      throw StateError('当前租户上下文下找不到该外呼任务');
    }

    final currentIndex = _statusProgression.indexOf(existing.status);
    final nextStatus =
        currentIndex >= 0 && currentIndex < _statusProgression.length - 1
        ? _statusProgression[currentIndex + 1]
        : existing.status;
    final now = DateTime.now();
    String? nextEventName;
    switch (nextStatus) {
      case 'dispatching':
        nextEventName = 'telephony.outbound.accepted';
        break;
      case 'ringing':
        nextEventName = 'telephony.outbound.ringing';
        break;
      case 'answered':
        nextEventName = 'telephony.outbound.answered';
        break;
      case 'bridged':
        nextEventName = 'telephony.outbound.bridged';
        break;
      case 'completed':
        nextEventName = 'telephony.outbound.completed';
        break;
      default:
        nextEventName = existing.latestEventName;
        break;
    }

    final refreshed = existing.copyWith(
      status: nextStatus,
      updatedAt: now,
      latestEventName: nextEventName,
      latestEventDirection: 'outbound',
      latestEventAt: now,
      note: 'Mock 状态刷新完成；当前进度已推进到 $nextStatus。',
    );
    _tasks[taskId] = refreshed;
    return refreshed;
  }
}
