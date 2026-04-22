import 'dial_mode.dart';

class DialPlan {
  const DialPlan({
    required this.rawNumber,
    required this.normalizedNumber,
    required this.mode,
    required this.prefix,
    required this.isPrivateDial,
    this.selectedTenantId,
  });

  final String rawNumber;
  final String normalizedNumber;
  final DialMode mode;
  final String prefix;
  final bool isPrivateDial;
  final String? selectedTenantId;

  bool get usesSystemDialer => mode.usesSystemDialer;

  String get dialString => isPrivateDial && prefix.isNotEmpty
      ? '$prefix$normalizedNumber'
      : normalizedNumber;

  Uri get uri => Uri(scheme: 'tel', path: dialString);
}
