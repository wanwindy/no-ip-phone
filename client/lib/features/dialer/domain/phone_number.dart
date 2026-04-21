import '../../../shared/utils/phone_utils.dart';

class PhoneNumber {
  const PhoneNumber._({
    required this.raw,
    required this.normalized,
  });

  final String raw;
  final String normalized;

  bool get isValid => isDialablePhoneNumber(normalized);

  String get display => normalizePhoneNumber(raw);

  static PhoneNumber parse(String input) {
    return PhoneNumber._(
      raw: input,
      normalized: normalizePhoneNumber(input),
    );
  }
}
