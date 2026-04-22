enum DialMode { directPrefixMode, serverOrchestratedMode }

extension DialModeX on DialMode {
  String get wireValue {
    switch (this) {
      case DialMode.directPrefixMode:
        return 'direct_prefix_mode';
      case DialMode.serverOrchestratedMode:
        return 'server_orchestrated_mode';
    }
  }

  String get label {
    switch (this) {
      case DialMode.directPrefixMode:
        return '兼容直拨';
      case DialMode.serverOrchestratedMode:
        return '平台编排';
    }
  }

  String get description {
    switch (this) {
      case DialMode.directPrefixMode:
        return '继续通过系统拨号器和前缀发起拨号，作为兼容回退路径。';
      case DialMode.serverOrchestratedMode:
        return '先向服务端提交外呼任务，再由后续编排层接管 DID、回拨和状态流。';
    }
  }

  bool get usesSystemDialer => this == DialMode.directPrefixMode;
}

DialMode dialModeFromWireValue(String? value) {
  switch (value) {
    case 'server_orchestrated_mode':
      return DialMode.serverOrchestratedMode;
    case 'direct_prefix_mode':
    default:
      return DialMode.directPrefixMode;
  }
}
