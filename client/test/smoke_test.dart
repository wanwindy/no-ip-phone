import 'package:client/core/constants/app_constants.dart';
import 'package:client/shared/utils/phone_utils.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('phone utilities normalize and preview dial strings', () {
    expect(normalizePhoneNumber(' 138-0013-8000 '), '13800138000');
    expect(maskPhoneNumber('13800138000'), '138****8000');
    expect(
      formatDialPreview(prefix: '#31#', phoneNumber: '13800138000'),
      '#31#13800138000',
    );
    expect(AppConstants.defaultDialPrefix, '#31#');
    expect(AppConstants.mockAccountUsername, 'demo_user');
  });
}
