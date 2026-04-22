import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../shared/widgets/app_background.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../domain/admin_models.dart';
import '../providers/admin_auth_controller.dart';
import '../providers/admin_console_controller.dart';

class AdminDashboardPage extends ConsumerStatefulWidget {
  const AdminDashboardPage({super.key});

  @override
  ConsumerState<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends ConsumerState<AdminDashboardPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(adminConsoleControllerProvider.notifier).load();
    });
  }

  Future<void> _reload() async {
    final error = await ref.read(adminConsoleControllerProvider.notifier).load();
    if (!mounted || error == null) {
      return;
    }
    _showSnackBar(error);
  }

  Future<void> _logout() async {
    ref.read(adminConsoleControllerProvider.notifier).clear();
    await ref.read(adminAuthControllerProvider.notifier).logout();
    if (!mounted) {
      return;
    }
    context.go(AppConstants.adminLoginPath);
  }

  Future<void> _createAccount() async {
    final usernameController = TextEditingController();
    final displayNameController = TextEditingController();
    final passwordController = TextEditingController();
    var status = 'active';

    try {
      await showDialog<void>(
        context: context,
        builder: (dialogContext) {
          var isSubmitting = false;
          return StatefulBuilder(
            builder: (context, setState) {
              return AlertDialog(
                title: const Text('新增用户账号'),
                content: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AppTextField(
                        controller: usernameController,
                        label: '账号名',
                        hintText: 'demo_user',
                        prefixIcon: Icons.person_outline,
                      ),
                      const SizedBox(height: 12),
                      AppTextField(
                        controller: displayNameController,
                        label: '显示名称',
                        hintText: '演示账号',
                        prefixIcon: Icons.badge_outlined,
                      ),
                      const SizedBox(height: 12),
                      AppTextField(
                        controller: passwordController,
                        label: '初始密码',
                        hintText: '至少 8 位',
                        prefixIcon: Icons.lock_outline,
                        keyboardType: TextInputType.visiblePassword,
                        obscureText: true,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: status,
                        decoration: const InputDecoration(labelText: '状态'),
                        items: _accountStatuses
                            .map(
                              (value) => DropdownMenuItem<String>(
                                value: value,
                                child: Text(_statusLabel(value)),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value == null) {
                            return;
                          }
                          setState(() {
                            status = value;
                          });
                        },
                      ),
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: isSubmitting
                        ? null
                        : () => Navigator.of(dialogContext).pop(),
                    child: const Text('取消'),
                  ),
                  FilledButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            setState(() {
                              isSubmitting = true;
                            });
                            final error = await ref
                                .read(adminConsoleControllerProvider.notifier)
                                .createAccount(
                                  ManagedAccountCreateInput(
                                    username: usernameController.text,
                                    displayName: displayNameController.text,
                                    password: passwordController.text,
                                    status: status,
                                  ),
                                );
                            if (!mounted) {
                              return;
                            }
                            if (dialogContext.mounted) {
                              Navigator.of(dialogContext).pop();
                            }
                            _showSnackBar(error ?? '已创建用户账号');
                          },
                    child: const Text('创建'),
                  ),
                ],
              );
            },
          );
        },
      );
    } finally {
      usernameController.dispose();
      displayNameController.dispose();
      passwordController.dispose();
    }
  }

  Future<void> _editAccount(ManagedAccount account) async {
    final usernameController = TextEditingController(text: account.username);
    final displayNameController =
        TextEditingController(text: account.displayName);
    final passwordController = TextEditingController();
    var status = account.status;

    try {
      await showDialog<void>(
        context: context,
        builder: (dialogContext) {
          var isSubmitting = false;
          return StatefulBuilder(
            builder: (context, setState) {
              return AlertDialog(
                title: Text('编辑账号 ${account.username}'),
                content: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AppTextField(
                        controller: usernameController,
                        label: '账号名',
                        prefixIcon: Icons.person_outline,
                        readOnly: true,
                      ),
                      const SizedBox(height: 12),
                      AppTextField(
                        controller: displayNameController,
                        label: '显示名称',
                        prefixIcon: Icons.badge_outlined,
                      ),
                      const SizedBox(height: 12),
                      AppTextField(
                        controller: passwordController,
                        label: '重置密码',
                        hintText: '留空则不修改',
                        prefixIcon: Icons.lock_outline,
                        keyboardType: TextInputType.visiblePassword,
                        obscureText: true,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: status,
                        decoration: const InputDecoration(labelText: '状态'),
                        items: _accountStatuses
                            .map(
                              (value) => DropdownMenuItem<String>(
                                value: value,
                                child: Text(_statusLabel(value)),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value == null) {
                            return;
                          }
                          setState(() {
                            status = value;
                          });
                        },
                      ),
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: isSubmitting
                        ? null
                        : () => Navigator.of(dialogContext).pop(),
                    child: const Text('取消'),
                  ),
                  FilledButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            setState(() {
                              isSubmitting = true;
                            });
                            final error = await ref
                                .read(adminConsoleControllerProvider.notifier)
                                .updateAccount(
                                  account.id,
                                  ManagedAccountUpdateInput(
                                    displayName: displayNameController.text,
                                    password: passwordController.text,
                                    status: status,
                                  ),
                                );
                            if (!mounted) {
                              return;
                            }
                            if (dialogContext.mounted) {
                              Navigator.of(dialogContext).pop();
                            }
                            _showSnackBar(error ?? '已更新账号');
                          },
                    child: const Text('保存'),
                  ),
                ],
              );
            },
          );
        },
      );
    } finally {
      usernameController.dispose();
      displayNameController.dispose();
      passwordController.dispose();
    }
  }

  Future<void> _showDialPrefixEditor({ManagedDialPrefix? existing}) async {
    final countryCodeController =
        TextEditingController(text: existing?.countryCode ?? 'CN');
    final carrierController =
        TextEditingController(text: existing?.carrierName ?? '*');
    final prefixController =
        TextEditingController(text: existing?.prefix ?? '#31#');
    final priorityController =
        TextEditingController(text: '${existing?.priority ?? 0}');
    final remarkController =
        TextEditingController(text: existing?.remark ?? '');
    var status = existing?.status ?? 'active';

    try {
      await showDialog<void>(
        context: context,
        builder: (dialogContext) {
          var isSubmitting = false;
          return StatefulBuilder(
            builder: (context, setState) {
              return AlertDialog(
                title: Text(existing == null ? '新增拨号前缀' : '编辑拨号前缀'),
                content: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AppTextField(
                        controller: countryCodeController,
                        label: '国家/地区代码',
                        hintText: 'CN',
                        prefixIcon: Icons.public_outlined,
                      ),
                      const SizedBox(height: 12),
                      AppTextField(
                        controller: carrierController,
                        label: '运营商/渠道',
                        hintText: '*',
                        prefixIcon: Icons.sim_card_outlined,
                      ),
                      const SizedBox(height: 12),
                      AppTextField(
                        controller: prefixController,
                        label: '拨号前缀',
                        hintText: '#31#',
                        prefixIcon: Icons.local_phone_outlined,
                      ),
                      const SizedBox(height: 12),
                      AppTextField(
                        controller: priorityController,
                        label: '优先级',
                        hintText: '100',
                        keyboardType: TextInputType.number,
                        prefixIcon: Icons.low_priority_outlined,
                      ),
                      const SizedBox(height: 12),
                      AppTextField(
                        controller: remarkController,
                        label: '备注',
                        hintText: '可留空',
                        prefixIcon: Icons.notes_outlined,
                        maxLines: 3,
                        minLines: 3,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: status,
                        decoration: const InputDecoration(labelText: '状态'),
                        items: _simpleStatuses
                            .map(
                              (value) => DropdownMenuItem<String>(
                                value: value,
                                child: Text(_statusLabel(value)),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value == null) {
                            return;
                          }
                          setState(() {
                            status = value;
                          });
                        },
                      ),
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: isSubmitting
                        ? null
                        : () => Navigator.of(dialogContext).pop(),
                    child: const Text('取消'),
                  ),
                  FilledButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            setState(() {
                              isSubmitting = true;
                            });
                            final input = ManagedDialPrefixUpsertInput(
                              countryCode: countryCodeController.text,
                              carrierName: carrierController.text,
                              prefix: prefixController.text,
                              priority:
                                  int.tryParse(priorityController.text.trim()) ?? 0,
                              status: status,
                              remark: remarkController.text,
                            );
                            final controller =
                                ref.read(adminConsoleControllerProvider.notifier);
                            final error = existing == null
                                ? await controller.createDialPrefix(input)
                                : await controller.updateDialPrefix(existing.id, input);
                            if (!mounted) {
                              return;
                            }
                            if (dialogContext.mounted) {
                              Navigator.of(dialogContext).pop();
                            }
                            _showSnackBar(
                              error ?? (existing == null ? '已新增前缀' : '已更新前缀'),
                            );
                          },
                    child: Text(existing == null ? '创建' : '保存'),
                  ),
                ],
              );
            },
          );
        },
      );
    } finally {
      countryCodeController.dispose();
      carrierController.dispose();
      prefixController.dispose();
      priorityController.dispose();
      remarkController.dispose();
    }
  }

  Future<void> _showNoticeEditor({ManagedNotice? existing}) async {
    final titleController = TextEditingController(text: existing?.title ?? '');
    final contentController =
        TextEditingController(text: existing?.content ?? '');
    final startAtController = TextEditingController(
      text: existing?.startAt?.toIso8601String() ?? '',
    );
    final endAtController = TextEditingController(
      text: existing?.endAt?.toIso8601String() ?? '',
    );
    var type = existing?.type ?? 'info';
    var status = existing?.status ?? 'active';

    try {
      await showDialog<void>(
        context: context,
        builder: (dialogContext) {
          var isSubmitting = false;
          return StatefulBuilder(
            builder: (context, setState) {
              return AlertDialog(
                title: Text(existing == null ? '新增公告' : '编辑公告'),
                content: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AppTextField(
                        controller: titleController,
                        label: '标题',
                        hintText: '功能说明',
                        prefixIcon: Icons.campaign_outlined,
                      ),
                      const SizedBox(height: 12),
                      AppTextField(
                        controller: contentController,
                        label: '内容',
                        hintText: '输入展示给客户端的公告内容',
                        prefixIcon: Icons.notes_outlined,
                        maxLines: 4,
                        minLines: 4,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: type,
                        decoration: const InputDecoration(labelText: '类型'),
                        items: _noticeTypes
                            .map(
                              (value) => DropdownMenuItem<String>(
                                value: value,
                                child: Text(_noticeTypeLabel(value)),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value == null) {
                            return;
                          }
                          setState(() {
                            type = value;
                          });
                        },
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: status,
                        decoration: const InputDecoration(labelText: '状态'),
                        items: _simpleStatuses
                            .map(
                              (value) => DropdownMenuItem<String>(
                                value: value,
                                child: Text(_statusLabel(value)),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value == null) {
                            return;
                          }
                          setState(() {
                            status = value;
                          });
                        },
                      ),
                      const SizedBox(height: 12),
                      AppTextField(
                        controller: startAtController,
                        label: '开始时间',
                        hintText: '可留空，格式如 2026-04-22T09:00:00+08:00',
                        prefixIcon: Icons.schedule_outlined,
                      ),
                      const SizedBox(height: 12),
                      AppTextField(
                        controller: endAtController,
                        label: '结束时间',
                        hintText: '可留空，格式如 2026-04-30T18:00:00+08:00',
                        prefixIcon: Icons.event_available_outlined,
                      ),
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: isSubmitting
                        ? null
                        : () => Navigator.of(dialogContext).pop(),
                    child: const Text('取消'),
                  ),
                  FilledButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            setState(() {
                              isSubmitting = true;
                            });
                            final input = ManagedNoticeUpsertInput(
                              title: titleController.text,
                              content: contentController.text,
                              type: type,
                              status: status,
                              startAt: startAtController.text,
                              endAt: endAtController.text,
                            );
                            final controller =
                                ref.read(adminConsoleControllerProvider.notifier);
                            final error = existing == null
                                ? await controller.createNotice(input)
                                : await controller.updateNotice(existing.id, input);
                            if (!mounted) {
                              return;
                            }
                            if (dialogContext.mounted) {
                              Navigator.of(dialogContext).pop();
                            }
                            _showSnackBar(
                              error ?? (existing == null ? '已新增公告' : '已更新公告'),
                            );
                          },
                    child: Text(existing == null ? '创建' : '保存'),
                  ),
                ],
              );
            },
          );
        },
      );
    } finally {
      titleController.dispose();
      contentController.dispose();
      startAtController.dispose();
      endAtController.dispose();
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final adminAuthState = ref.watch(adminAuthControllerProvider);
    final consoleState = ref.watch(adminConsoleControllerProvider);

    return DefaultTabController(
      length: 3,
      child: AppBackground(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            title: const Text('管理后台'),
            bottom: const TabBar(
              tabs: [
                Tab(text: '账号'),
                Tab(text: '前缀'),
                Tab(text: '公告'),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_outlined),
                tooltip: '刷新',
                onPressed: consoleState.isLoading ? null : _reload,
              ),
              IconButton(
                icon: const Icon(Icons.phone_android_outlined),
                tooltip: '返回用户端',
                onPressed: () => context.go(AppConstants.homePath),
              ),
              IconButton(
                icon: const Icon(Icons.logout_outlined),
                tooltip: '退出后台',
                onPressed: _logout,
              ),
            ],
          ),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                child: AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '欢迎，${adminAuthState.session?.user.displayName ?? '管理员'}',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Text('当前账号：${adminAuthState.session?.user.username ?? '--'}'),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          Chip(label: Text('用户 ${consoleState.accounts.length}')),
                          Chip(label: Text('前缀 ${consoleState.prefixes.length}')),
                          Chip(label: Text('公告 ${consoleState.notices.length}')),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '这一版后台聚焦内部运营使用，支持用户账号、拨号前缀和公告的增改查。',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      if (consoleState.errorMessage != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          consoleState.errorMessage!,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Theme.of(context).colorScheme.error,
                              ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              Expanded(
                child: consoleState.isLoading &&
                        consoleState.accounts.isEmpty &&
                        consoleState.prefixes.isEmpty &&
                        consoleState.notices.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : TabBarView(
                        children: [
                          _AccountsTab(
                            accounts: consoleState.accounts,
                            isSaving: consoleState.isSaving,
                            onCreate: _createAccount,
                            onEdit: _editAccount,
                            onRefresh: _reload,
                          ),
                          _PrefixesTab(
                            prefixes: consoleState.prefixes,
                            isSaving: consoleState.isSaving,
                            onCreate: () => _showDialPrefixEditor(),
                            onEdit: (prefix) =>
                                _showDialPrefixEditor(existing: prefix),
                            onRefresh: _reload,
                          ),
                          _NoticesTab(
                            notices: consoleState.notices,
                            isSaving: consoleState.isSaving,
                            onCreate: () => _showNoticeEditor(),
                            onEdit: (notice) =>
                                _showNoticeEditor(existing: notice),
                            onRefresh: _reload,
                          ),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AccountsTab extends StatelessWidget {
  const _AccountsTab({
    required this.accounts,
    required this.isSaving,
    required this.onCreate,
    required this.onEdit,
    required this.onRefresh,
  });

  final List<ManagedAccount> accounts;
  final bool isSaving;
  final Future<void> Function() onCreate;
  final Future<void> Function(ManagedAccount account) onEdit;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('用户账号', style: Theme.of(context).textTheme.titleLarge),
                    AppSecondaryButton(
                      label: '新增账号',
                      icon: Icons.person_add_alt_1_outlined,
                      expand: false,
                      onPressed: isSaving ? null : onCreate,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text('这里维护客户端登录所使用的普通账号；管理员账号仍建议通过环境变量和数据库运维管理。'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (accounts.isEmpty)
            const AppCard(child: Text('还没有普通用户账号，先创建一个用于客户端登录的账号。'))
          else
            ...accounts.map(
              (account) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: AppCard(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      child: Text(
                        account.displayName.isEmpty
                            ? account.username.substring(0, 1).toUpperCase()
                            : account.displayName.substring(0, 1),
                      ),
                    ),
                    title: Text(account.displayName),
                    subtitle: Text(
                      '${account.username} · ${_statusLabel(account.status)}',
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.edit_outlined),
                      onPressed: () => onEdit(account),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _PrefixesTab extends StatelessWidget {
  const _PrefixesTab({
    required this.prefixes,
    required this.isSaving,
    required this.onCreate,
    required this.onEdit,
    required this.onRefresh,
  });

  final List<ManagedDialPrefix> prefixes;
  final bool isSaving;
  final Future<void> Function() onCreate;
  final Future<void> Function(ManagedDialPrefix prefix) onEdit;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('拨号前缀', style: Theme.of(context).textTheme.titleLarge),
                    AppSecondaryButton(
                      label: '新增前缀',
                      icon: Icons.add_link_outlined,
                      expand: false,
                      onPressed: isSaving ? null : onCreate,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text('客户端设置页里的推荐前缀会直接读取这里的配置，优先级越高越靠前。'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (prefixes.isEmpty)
            const AppCard(child: Text('还没有后台前缀配置，可先录入默认运营商前缀。'))
          else
            ...prefixes.map(
              (prefix) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: AppCard(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${prefix.countryCode} ${prefix.prefix}'),
                    subtitle: Text(
                      '${prefix.carrierName} · 优先级 ${prefix.priority} · ${_statusLabel(prefix.status)}',
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.edit_outlined),
                      onPressed: () => onEdit(prefix),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _NoticesTab extends StatelessWidget {
  const _NoticesTab({
    required this.notices,
    required this.isSaving,
    required this.onCreate,
    required this.onEdit,
    required this.onRefresh,
  });

  final List<ManagedNotice> notices;
  final bool isSaving;
  final Future<void> Function() onCreate;
  final Future<void> Function(ManagedNotice notice) onEdit;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('公告配置', style: Theme.of(context).textTheme.titleLarge),
                    AppSecondaryButton(
                      label: '新增公告',
                      icon: Icons.post_add_outlined,
                      expand: false,
                      onPressed: isSaving ? null : onCreate,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text('客户端首页顶部公告读取这里的 active 公告；支持选填开始和结束时间。'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (notices.isEmpty)
            const AppCard(child: Text('还没有公告，可先补一条功能说明或上线提醒。'))
          else
            ...notices.map(
              (notice) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: AppCard(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(notice.title),
                    subtitle: Text(
                      '${_noticeTypeLabel(notice.type)} · ${_statusLabel(notice.status)}',
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.edit_outlined),
                      onPressed: () => onEdit(notice),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

const List<String> _accountStatuses = <String>[
  'active',
  'disabled',
  'banned',
];

const List<String> _simpleStatuses = <String>[
  'active',
  'disabled',
];

const List<String> _noticeTypes = <String>[
  'info',
  'warning',
  'urgent',
];

String _statusLabel(String value) {
  switch (value) {
    case 'active':
      return '启用';
    case 'disabled':
      return '停用';
    case 'banned':
      return '封禁';
    default:
      return value;
  }
}

String _noticeTypeLabel(String value) {
  switch (value) {
    case 'info':
      return '信息';
    case 'warning':
      return '提醒';
    case 'urgent':
      return '紧急';
    default:
      return value;
  }
}
