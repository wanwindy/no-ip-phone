import 'package:url_launcher/url_launcher.dart';

import '../../../core/constants/app_constants.dart';
import '../../../shared/utils/phone_utils.dart';
import '../domain/dial_plan.dart';
import '../domain/dial_failure.dart';

abstract class DialService {
  DialPlan buildPlan({
    required String rawNumber,
    required bool isPrivateDial,
    required String prefix,
  });

  Future<void> launch(DialPlan plan);
}

class UrlLauncherDialService implements DialService {
  @override
  DialPlan buildPlan({
    required String rawNumber,
    required bool isPrivateDial,
    required String prefix,
  }) {
    final normalized = normalizePhoneNumber(rawNumber);
    return DialPlan(
      rawNumber: rawNumber,
      normalizedNumber: normalized,
      prefix: prefix.isEmpty ? AppConstants.defaultDialPrefix : prefix,
      isPrivateDial: isPrivateDial,
    );
  }

  @override
  Future<void> launch(DialPlan plan) async {
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
  }
}
