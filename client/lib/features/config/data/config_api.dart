import '../domain/app_notice.dart';
import '../domain/dial_prefix_config.dart';

abstract class ConfigApi {
  Future<List<DialPrefixConfig>> fetchDialPrefixes();

  Future<List<AppNotice>> fetchNotices();
}

class MockConfigApi implements ConfigApi {
  @override
  Future<List<AppNotice>> fetchNotices() async {
    return const [
      AppNotice(
        title: '能力边界说明',
        content: '当前版本仅通过系统拨号器和运营商前缀尝试隐藏来电显示，不保证所有终端都生效。',
        type: AppNoticeType.warning,
      ),
    ];
  }

  @override
  Future<List<DialPrefixConfig>> fetchDialPrefixes() async {
    return const [
      DialPrefixConfig(
        countryCode: 'CN',
        carrierName: '*',
        prefix: '#31#',
        remark: '中国大陆通用 CLIR 前缀',
        priority: 100,
      ),
      DialPrefixConfig(
        countryCode: 'US',
        carrierName: '*',
        prefix: '*67',
        remark: '北美常见号码隐藏前缀',
        priority: 80,
      ),
      DialPrefixConfig(
        countryCode: 'JP',
        carrierName: '*',
        prefix: '184',
        remark: '日本常见隐藏前缀',
        priority: 80,
      ),
    ];
  }
}
