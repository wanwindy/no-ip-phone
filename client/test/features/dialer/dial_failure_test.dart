import 'package:client/features/dialer/domain/dial_failure.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('dial failure messages stay readable by category', () {
    expect(
      dialFailureMessage(DialFailureType.invalidNumber),
      contains('号码格式不正确'),
    );
    expect(
      dialFailureMessage(DialFailureType.configUnavailable),
      contains('隐私前缀未配置'),
    );
    expect(
      dialFailureMessage(DialFailureType.unsupportedDevice),
      contains('系统电话应用'),
    );
    expect(
      dialFailureMessage(DialFailureType.launchFailed),
      contains('未能成功拉起'),
    );
    expect(
      const DialLaunchException(DialFailureType.launchFailed).toString(),
      contains('未能成功拉起'),
    );
  });
}
