enum DialFailureType {
  invalidNumber,
  configUnavailable,
  unsupportedDevice,
  launchFailed,
  outboundTaskFailed,
  unknown,
}

String dialFailureMessage(DialFailureType type) {
  switch (type) {
    case DialFailureType.invalidNumber:
      return '号码格式不正确，请输入 11 位手机号码、带区号的座机，或完整国际号码。';
    case DialFailureType.configUnavailable:
      return '隐私前缀未配置，请先到设置中恢复默认前缀后再试。';
    case DialFailureType.unsupportedDevice:
      return '当前设备没有可用的系统电话应用，请检查默认拨号器后再试。';
    case DialFailureType.launchFailed:
      return '系统拨号器未能成功拉起，请稍后重试，或切换普通拨打。';
    case DialFailureType.outboundTaskFailed:
      return '平台外呼任务创建失败，请稍后重试，或切回兼容直拨。';
    case DialFailureType.unknown:
      return '拨号失败，请稍后重试。';
  }
}

class DialLaunchException implements Exception {
  const DialLaunchException(this.type, {String? message})
    : message = message ?? '';

  final DialFailureType type;
  final String message;

  @override
  String toString() => message.isEmpty ? dialFailureMessage(type) : message;
}
