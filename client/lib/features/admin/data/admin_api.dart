import '../../../core/constants/app_constants.dart';
import '../../auth/data/auth_api.dart';
import '../domain/admin_models.dart';

abstract class AdminApi {
  Future<AuthTokenPair> login({
    required String username,
    required String password,
    required String deviceId,
  });

  Future<AuthTokenPair> refresh({
    required String refreshToken,
    required String deviceId,
  });

  Future<AuthProfile> me(String accessToken);

  Future<void> logout(String refreshToken);

  Future<List<ManagedAccount>> listAccounts();

  Future<ManagedAccount> createAccount(ManagedAccountCreateInput input);

  Future<ManagedAccount> updateAccount(String accountId, ManagedAccountUpdateInput input);

  Future<List<ManagedDialPrefix>> listDialPrefixes();

  Future<ManagedDialPrefix> createDialPrefix(ManagedDialPrefixUpsertInput input);

  Future<ManagedDialPrefix> updateDialPrefix(
    String prefixId,
    ManagedDialPrefixUpsertInput input,
  );

  Future<List<ManagedNotice>> listNotices();

  Future<ManagedNotice> createNotice(ManagedNoticeUpsertInput input);

  Future<ManagedNotice> updateNotice(String noticeId, ManagedNoticeUpsertInput input);
}

class MockAdminApi implements AdminApi {
  MockAdminApi();

  final Map<String, String> _accessTokenUserMap = <String, String>{};
  final Map<String, String> _refreshTokenUserMap = <String, String>{};
  final List<ManagedAccount> _accounts = <ManagedAccount>[
    ManagedAccount(
      id: 'mock-account-1',
      username: AppConstants.mockAccountUsername,
      displayName: '演示账号',
      role: 'app_user',
      status: 'active',
      createdAt: DateTime.now().subtract(const Duration(days: 7)),
    ),
  ];
  final List<ManagedDialPrefix> _prefixes = <ManagedDialPrefix>[
    ManagedDialPrefix(
      id: 'mock-prefix-cn',
      countryCode: 'CN',
      carrierName: '*',
      prefix: '#31#',
      remark: '中国通用 CLIR 前缀',
      priority: 100,
      status: 'active',
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 8)),
    ),
  ];
  final List<ManagedNotice> _notices = <ManagedNotice>[
    ManagedNotice(
      id: 'mock-notice-1',
      title: '功能说明',
      content: '隐私拨打效果受运营商、地区和终端环境影响，实际结果可能不同。',
      type: 'info',
      status: 'active',
      startAt: null,
      endAt: null,
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
  ];

  @override
  Future<ManagedAccount> createAccount(ManagedAccountCreateInput input) async {
    final username = input.username.trim().toLowerCase();
    final exists = _accounts.any((item) => item.username == username);
    if (exists) {
      throw StateError('账号名已存在');
    }

    final account = ManagedAccount(
      id: 'mock-account-${DateTime.now().microsecondsSinceEpoch}',
      username: username,
      displayName:
          input.displayName.trim().isEmpty ? username : input.displayName.trim(),
      role: 'app_user',
      status: input.status,
      createdAt: DateTime.now(),
    );
    _accounts.add(account);
    return account;
  }

  @override
  Future<ManagedDialPrefix> createDialPrefix(
    ManagedDialPrefixUpsertInput input,
  ) async {
    final item = ManagedDialPrefix(
      id: 'mock-prefix-${DateTime.now().microsecondsSinceEpoch}',
      countryCode: input.countryCode.trim().toUpperCase(),
      carrierName: input.carrierName.trim(),
      prefix: input.prefix.trim(),
      remark: input.remark?.trim().isEmpty == true ? null : input.remark?.trim(),
      priority: input.priority,
      status: input.status,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    _prefixes.add(item);
    return item;
  }

  @override
  Future<ManagedNotice> createNotice(ManagedNoticeUpsertInput input) async {
    final item = ManagedNotice(
      id: 'mock-notice-${DateTime.now().microsecondsSinceEpoch}',
      title: input.title.trim(),
      content: input.content.trim(),
      type: input.type,
      status: input.status,
      startAt: parseNullableAdminDateTime(input.startAt),
      endAt: parseNullableAdminDateTime(input.endAt),
      createdAt: DateTime.now(),
    );
    _notices.add(item);
    return item;
  }

  @override
  Future<List<ManagedAccount>> listAccounts() async {
    return List<ManagedAccount>.from(_accounts);
  }

  @override
  Future<List<ManagedDialPrefix>> listDialPrefixes() async {
    return List<ManagedDialPrefix>.from(_prefixes);
  }

  @override
  Future<List<ManagedNotice>> listNotices() async {
    return List<ManagedNotice>.from(_notices);
  }

  @override
  Future<AuthTokenPair> login({
    required String username,
    required String password,
    required String deviceId,
  }) async {
    if (username.trim() != AppConstants.mockAdminUsername ||
        password != AppConstants.mockAdminPassword) {
      throw StateError('管理员账号或密码错误，当前 mock 只接受 admin / Admin12345');
    }

    final accessToken = 'mock-admin-access-${username.hashCode}-${deviceId.hashCode}';
    final refreshToken =
        'mock-admin-refresh-${username.hashCode}-${deviceId.hashCode}';
    _accessTokenUserMap[accessToken] = username.trim();
    _refreshTokenUserMap[refreshToken] = username.trim();
    return AuthTokenPair(
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: const Duration(hours: 2),
    );
  }

  @override
  Future<void> logout(String refreshToken) async {
    _refreshTokenUserMap.remove(refreshToken);
  }

  @override
  Future<AuthProfile> me(String accessToken) async {
    final username =
        _accessTokenUserMap[accessToken] ?? AppConstants.mockAdminUsername;
    return AuthProfile(
      id: 'mock-admin-${username.hashCode}',
      username: username,
      displayName: '系统管理员',
      role: 'admin',
      status: 'active',
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
    );
  }

  @override
  Future<AuthTokenPair> refresh({
    required String refreshToken,
    required String deviceId,
  }) async {
    final username =
        _refreshTokenUserMap[refreshToken] ?? AppConstants.mockAdminUsername;
    final accessToken =
        'mock-admin-access-${username.hashCode}-${refreshToken.hashCode}';
    final nextRefreshToken =
        'mock-admin-refresh-${username.hashCode}-${deviceId.hashCode}-${DateTime.now().microsecondsSinceEpoch}';
    _accessTokenUserMap[accessToken] = username;
    _refreshTokenUserMap[nextRefreshToken] = username;
    return AuthTokenPair(
      accessToken: accessToken,
      refreshToken: nextRefreshToken,
      expiresIn: const Duration(hours: 2),
    );
  }

  @override
  Future<ManagedAccount> updateAccount(
    String accountId,
    ManagedAccountUpdateInput input,
  ) async {
    final index = _accounts.indexWhere((item) => item.id == accountId);
    if (index < 0) {
      throw StateError('账号不存在');
    }
    final current = _accounts[index];
    final next = ManagedAccount(
      id: current.id,
      username: current.username,
      displayName: input.displayName?.trim().isNotEmpty == true
          ? input.displayName!.trim()
          : current.displayName,
      role: current.role,
      status: input.status ?? current.status,
      createdAt: current.createdAt,
    );
    _accounts[index] = next;
    return next;
  }

  @override
  Future<ManagedDialPrefix> updateDialPrefix(
    String prefixId,
    ManagedDialPrefixUpsertInput input,
  ) async {
    final index = _prefixes.indexWhere((item) => item.id == prefixId);
    if (index < 0) {
      throw StateError('前缀配置不存在');
    }
    final current = _prefixes[index];
    final next = ManagedDialPrefix(
      id: current.id,
      countryCode: input.countryCode.trim().toUpperCase(),
      carrierName: input.carrierName.trim(),
      prefix: input.prefix.trim(),
      remark: input.remark?.trim().isEmpty == true ? null : input.remark?.trim(),
      priority: input.priority,
      status: input.status,
      createdAt: current.createdAt,
      updatedAt: DateTime.now(),
    );
    _prefixes[index] = next;
    return next;
  }

  @override
  Future<ManagedNotice> updateNotice(
    String noticeId,
    ManagedNoticeUpsertInput input,
  ) async {
    final index = _notices.indexWhere((item) => item.id == noticeId);
    if (index < 0) {
      throw StateError('公告不存在');
    }
    final current = _notices[index];
    final next = ManagedNotice(
      id: current.id,
      title: input.title.trim(),
      content: input.content.trim(),
      type: input.type,
      status: input.status,
      startAt: parseNullableAdminDateTime(input.startAt),
      endAt: parseNullableAdminDateTime(input.endAt),
      createdAt: current.createdAt,
    );
    _notices[index] = next;
    return next;
  }
}
