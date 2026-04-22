import 'package:url_launcher/url_launcher.dart';

import '../../../core/constants/app_constants.dart';
import '../../../shared/utils/phone_utils.dart';
import '../domain/dial_plan.dart';
import '../domain/dial_mode.dart';
import '../domain/dial_failure.dart';
import '../domain/outbound_call_task.dart';
import 'dial_api.dart';

abstract class DialService {
  DialMode get mode;

  DialPlan buildPlan({
    required String rawNumber,
    required bool isPrivateDial,
    required String prefix,
    String? selectedTenantId,
  });

  Future<DialExecutionResult> launch(DialPlan plan);
}

class DialExecutionResult {
  const DialExecutionResult({required this.plan, this.taskSnapshot});

  final DialPlan plan;
  final OutboundCallTaskSnapshot? taskSnapshot;
}

class UrlLauncherDialService implements DialService {
  @override
  DialMode get mode => DialMode.directPrefixMode;

  @override
  DialPlan buildPlan({
    required String rawNumber,
    required bool isPrivateDial,
    required String prefix,
    String? selectedTenantId,
  }) {
    final normalized = normalizePhoneNumber(rawNumber);
    return DialPlan(
      rawNumber: rawNumber,
      normalizedNumber: normalized,
      mode: mode,
      prefix: prefix.isEmpty ? AppConstants.defaultDialPrefix : prefix,
      isPrivateDial: isPrivateDial,
      selectedTenantId: null,
    );
  }

  @override
  Future<DialExecutionResult> launch(DialPlan plan) async {
    if (!await canLaunchUrl(plan.uri)) {
      throw const DialLaunchException(
        DialFailureType.unsupportedDevice,
        message: '当前设备没有可用的系统电话应用，请检查默认拨号器后再试。',
      );
    }

    final launched = await launchUrl(
      plan.uri,
      mode: LaunchMode.externalApplication,
    );
    if (!launched) {
      throw const DialLaunchException(
        DialFailureType.launchFailed,
        message: '系统拨号器未能成功拉起，请稍后重试，或切换普通拨打。',
      );
    }

    return DialExecutionResult(plan: plan);
  }
}

class ServerOrchestratedDialService implements DialService {
  ServerOrchestratedDialService({required DialApi api}) : _api = api;

  final DialApi _api;

  @override
  DialMode get mode => DialMode.serverOrchestratedMode;

  @override
  DialPlan buildPlan({
    required String rawNumber,
    required bool isPrivateDial,
    required String prefix,
    String? selectedTenantId,
  }) {
    final normalized = normalizePhoneNumber(rawNumber);
    return DialPlan(
      rawNumber: rawNumber,
      normalizedNumber: normalized,
      mode: mode,
      prefix: '',
      isPrivateDial: false,
      selectedTenantId: selectedTenantId?.trim().isNotEmpty == true
          ? selectedTenantId!.trim()
          : null,
    );
  }

  @override
  Future<DialExecutionResult> launch(DialPlan plan) async {
    try {
      final taskSnapshot = await _api.createOutboundCall(
        destinationNumber: plan.normalizedNumber,
        tenantId: plan.selectedTenantId,
      );
      return DialExecutionResult(plan: plan, taskSnapshot: taskSnapshot);
    } catch (_) {
      throw const DialLaunchException(DialFailureType.outboundTaskFailed);
    }
  }
}
