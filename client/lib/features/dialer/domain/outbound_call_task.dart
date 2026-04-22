import 'dial_mode.dart';

class OutboundCallTaskSnapshot {
  const OutboundCallTaskSnapshot({
    required this.taskId,
    required this.tenantId,
    required this.mode,
    required this.status,
    required this.destinationNumber,
    required this.createdAt,
    required this.updatedAt,
    this.currentDidE164,
    this.currentDidDisplayLabel,
    this.targetEndpointId,
    this.targetEndpointType,
    this.targetEndpointValue,
    this.targetEndpointLabel,
    this.callbackStatus,
    this.callbackExpiresAt,
    this.latestEventName,
    this.latestEventDirection,
    this.latestEventAt,
    this.note,
  });

  final String taskId;
  final String tenantId;
  final DialMode mode;
  final String status;
  final String destinationNumber;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? currentDidE164;
  final String? currentDidDisplayLabel;
  final String? targetEndpointId;
  final String? targetEndpointType;
  final String? targetEndpointValue;
  final String? targetEndpointLabel;
  final String? callbackStatus;
  final DateTime? callbackExpiresAt;
  final String? latestEventName;
  final String? latestEventDirection;
  final DateTime? latestEventAt;
  final String? note;

  OutboundCallTaskSnapshot copyWith({
    String? tenantId,
    String? status,
    DateTime? updatedAt,
    String? currentDidE164,
    String? currentDidDisplayLabel,
    String? targetEndpointId,
    String? targetEndpointType,
    String? targetEndpointValue,
    String? targetEndpointLabel,
    String? callbackStatus,
    DateTime? callbackExpiresAt,
    String? latestEventName,
    String? latestEventDirection,
    DateTime? latestEventAt,
    String? note,
  }) {
    return OutboundCallTaskSnapshot(
      taskId: taskId,
      tenantId: tenantId ?? this.tenantId,
      mode: mode,
      status: status ?? this.status,
      destinationNumber: destinationNumber,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      currentDidE164: currentDidE164 ?? this.currentDidE164,
      currentDidDisplayLabel:
          currentDidDisplayLabel ?? this.currentDidDisplayLabel,
      targetEndpointId: targetEndpointId ?? this.targetEndpointId,
      targetEndpointType: targetEndpointType ?? this.targetEndpointType,
      targetEndpointValue: targetEndpointValue ?? this.targetEndpointValue,
      targetEndpointLabel: targetEndpointLabel ?? this.targetEndpointLabel,
      callbackStatus: callbackStatus ?? this.callbackStatus,
      callbackExpiresAt: callbackExpiresAt ?? this.callbackExpiresAt,
      latestEventName: latestEventName ?? this.latestEventName,
      latestEventDirection: latestEventDirection ?? this.latestEventDirection,
      latestEventAt: latestEventAt ?? this.latestEventAt,
      note: note ?? this.note,
    );
  }

  String get currentDidLabel =>
      currentDidDisplayLabel ?? currentDidE164 ?? '待分配';

  String get targetEndpointDisplay =>
      targetEndpointLabel ?? targetEndpointValue ?? '待选择';

  String get latestEventDisplay => latestEventName ?? '待写入';
}
