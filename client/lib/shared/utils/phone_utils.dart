String normalizePhoneNumber(String input) {
  return input.trim().replaceAll(RegExp(r'[\s\-\(\)（）]'), '');
}

bool isDialablePhoneNumber(String input) {
  final normalized = normalizePhoneNumber(input);

  final mainlandMobile = RegExp(r'^1[3-9]\d{9}$');
  final mainlandLandline = RegExp(r'^0\d{2,3}\d{7,8}$');
  final international = RegExp(r'^\+\d{7,15}$');
  final serviceNumber = RegExp(r'^(?:400|800)\d{7}$');

  return mainlandMobile.hasMatch(normalized) ||
      mainlandLandline.hasMatch(normalized) ||
      international.hasMatch(normalized) ||
      serviceNumber.hasMatch(normalized);
}

String maskPhoneNumber(String input) {
  final normalized = normalizePhoneNumber(input);
  if (normalized.length == 11 && normalized.startsWith('1')) {
    return '${normalized.substring(0, 3)}****${normalized.substring(7)}';
  }
  if (normalized.length >= 7) {
    final head = normalized.substring(0, 3);
    final tail = normalized.substring(normalized.length - 2);
    return '$head****$tail';
  }
  return normalized;
}

String formatDialPreview({
  required String prefix,
  required String phoneNumber,
}) {
  final normalized = normalizePhoneNumber(phoneNumber);
  return prefix.isEmpty ? normalized : '$prefix$normalized';
}
