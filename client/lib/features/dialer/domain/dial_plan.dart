class DialPlan {
  const DialPlan({
    required this.rawNumber,
    required this.normalizedNumber,
    required this.prefix,
    required this.isPrivateDial,
  });

  final String rawNumber;
  final String normalizedNumber;
  final String prefix;
  final bool isPrivateDial;

  String get dialString =>
      isPrivateDial && prefix.isNotEmpty ? '$prefix$normalizedNumber' : normalizedNumber;

  Uri get uri => Uri(scheme: 'tel', path: dialString);
}
