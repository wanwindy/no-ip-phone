class DialPrefixConfig {
  const DialPrefixConfig({
    required this.countryCode,
    required this.carrierName,
    required this.prefix,
    required this.remark,
    required this.priority,
  });

  final String countryCode;
  final String carrierName;
  final String prefix;
  final String remark;
  final int priority;

  bool get isWildcardCarrier => carrierName == '*';
}
