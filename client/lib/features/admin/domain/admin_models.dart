class AdminConsoleBundle {
  const AdminConsoleBundle({
    required this.accounts,
    required this.prefixes,
    required this.notices,
  });

  final List<ManagedAccount> accounts;
  final List<ManagedDialPrefix> prefixes;
  final List<ManagedNotice> notices;
}

class ManagedAccount {
  const ManagedAccount({
    required this.id,
    required this.username,
    required this.displayName,
    required this.role,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String username;
  final String displayName;
  final String role;
  final String status;
  final DateTime createdAt;

  factory ManagedAccount.fromJson(dynamic raw) {
    final json = ensureAdminMap(raw);
    return ManagedAccount(
      id: json['id'] as String? ?? '',
      username: json['username'] as String? ?? '',
      displayName: json['displayName'] as String? ?? '',
      role: json['role'] as String? ?? 'app_user',
      status: json['status'] as String? ?? 'active',
      createdAt: parseAdminDateTime(json['createdAt']),
    );
  }
}

class ManagedDialPrefix {
  const ManagedDialPrefix({
    required this.id,
    required this.countryCode,
    required this.carrierName,
    required this.prefix,
    required this.remark,
    required this.priority,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String countryCode;
  final String carrierName;
  final String prefix;
  final String? remark;
  final int priority;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory ManagedDialPrefix.fromJson(dynamic raw) {
    final json = ensureAdminMap(raw);
    return ManagedDialPrefix(
      id: json['id'] as String? ?? '',
      countryCode: json['countryCode'] as String? ?? 'CN',
      carrierName: json['carrierName'] as String? ?? '*',
      prefix: json['prefix'] as String? ?? '',
      remark: json['remark'] as String?,
      priority: (json['priority'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'active',
      createdAt: parseAdminDateTime(json['createdAt']),
      updatedAt: parseAdminDateTime(json['updatedAt']),
    );
  }
}

class ManagedNotice {
  const ManagedNotice({
    required this.id,
    required this.title,
    required this.content,
    required this.type,
    required this.status,
    required this.startAt,
    required this.endAt,
    required this.createdAt,
  });

  final String id;
  final String title;
  final String content;
  final String type;
  final String status;
  final DateTime? startAt;
  final DateTime? endAt;
  final DateTime createdAt;

  factory ManagedNotice.fromJson(dynamic raw) {
    final json = ensureAdminMap(raw);
    return ManagedNotice(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      type: json['type'] as String? ?? 'info',
      status: json['status'] as String? ?? 'active',
      startAt: parseNullableAdminDateTime(json['startAt']),
      endAt: parseNullableAdminDateTime(json['endAt']),
      createdAt: parseAdminDateTime(json['createdAt']),
    );
  }
}

class ManagedAccountCreateInput {
  const ManagedAccountCreateInput({
    required this.username,
    required this.displayName,
    required this.password,
    required this.status,
  });

  final String username;
  final String displayName;
  final String password;
  final String status;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'username': username.trim(),
      'displayName': displayName.trim(),
      'password': password,
      'status': status,
    };
  }
}

class ManagedAccountUpdateInput {
  const ManagedAccountUpdateInput({
    this.displayName,
    this.password,
    this.status,
  });

  final String? displayName;
  final String? password;
  final String? status;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      if (displayName != null) 'displayName': displayName!.trim(),
      if (password != null && password!.isNotEmpty) 'password': password,
      if (status != null) 'status': status,
    };
  }
}

class ManagedDialPrefixUpsertInput {
  const ManagedDialPrefixUpsertInput({
    required this.countryCode,
    required this.carrierName,
    required this.prefix,
    required this.priority,
    required this.status,
    this.remark,
  });

  final String countryCode;
  final String carrierName;
  final String prefix;
  final int priority;
  final String status;
  final String? remark;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'countryCode': countryCode.trim().toUpperCase(),
      'carrierName': carrierName.trim(),
      'prefix': prefix.trim(),
      'priority': priority,
      'status': status,
      'remark': remark?.trim(),
    };
  }
}

class ManagedNoticeUpsertInput {
  const ManagedNoticeUpsertInput({
    required this.title,
    required this.content,
    required this.type,
    required this.status,
    this.startAt,
    this.endAt,
  });

  final String title;
  final String content;
  final String type;
  final String status;
  final String? startAt;
  final String? endAt;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'title': title.trim(),
      'content': content.trim(),
      'type': type,
      'status': status,
      'startAt': startAt?.trim().isEmpty == true ? null : startAt?.trim(),
      'endAt': endAt?.trim().isEmpty == true ? null : endAt?.trim(),
    };
  }
}

Map<String, dynamic> ensureAdminMap(dynamic raw) {
  if (raw is Map<String, dynamic>) {
    return raw;
  }
  if (raw is Map) {
    return raw.map((key, value) => MapEntry(key.toString(), value));
  }
  throw const FormatException('响应 data 格式不正确');
}

DateTime parseAdminDateTime(dynamic raw) {
  return DateTime.tryParse(raw as String? ?? '') ?? DateTime.now();
}

DateTime? parseNullableAdminDateTime(dynamic raw) {
  final value = raw as String?;
  if (value == null || value.trim().isEmpty) {
    return null;
  }
  return DateTime.tryParse(value);
}
