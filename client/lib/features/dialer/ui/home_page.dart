import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../shared/utils/phone_utils.dart';
import '../../../shared/widgets/app_background.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../auth/providers/auth_controller.dart';
import '../../config/providers/config_controller.dart';
import '../../settings/providers/settings_controller.dart';
import '../data/dial_history_repository.dart';
import '../domain/dial_mode.dart';
import '../domain/dial_plan.dart';
import '../providers/dialer_controller.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _tenantController = TextEditingController();

  @override
  void dispose() {
    _phoneController.dispose();
    _tenantController.dispose();
    super.dispose();
  }

  void _fillPhoneNumber(String phoneNumber) {
    _phoneController.value = TextEditingValue(
      text: phoneNumber,
      selection: TextSelection.collapsed(offset: phoneNumber.length),
    );
  }

  Future<bool> _confirmPrivateDial() async {
    final shouldShowDisclaimer = ref
        .read(settingsControllerProvider)
        .settings
        .showDialDisclaimer;
    if (!shouldShowDisclaimer) {
      return true;
    }

    var dontShowAgain = false;
    final proceed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('隐私拨打提醒'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('该功能会通过系统拨号器和运营商前缀尝试隐藏来电显示，但不能保证所有设备与运营商都生效。'),
                  const SizedBox(height: 12),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    value: dontShowAgain,
                    onChanged: (value) {
                      setState(() {
                        dontShowAgain = value ?? false;
                      });
                    },
                    title: const Text('下次不再提示'),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(false),
                  child: const Text('取消'),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(dialogContext).pop(true),
                  child: const Text('继续'),
                ),
              ],
            );
          },
        );
      },
    );

    if (proceed == true && dontShowAgain) {
      await ref
          .read(settingsControllerProvider.notifier)
          .updateDisclaimer(false);
    }

    return proceed == true;
  }

  Future<void> _showLaunchFeedback(DialPlan plan) async {
    if (!mounted) {
      return;
    }

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('系统拨号器是否成功拉起？'),
          content: Text(
            '我们不会检测通话结果。若这个设备存在兼容问题，请反馈机型、系统版本、运营商，以及刚刚使用的拨号串：${plan.dialString}',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('已成功拉起'),
            ),
            FilledButton.tonal(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('建议反馈兼容结果'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _dial(bool privateDial) async {
    final selectedMode = ref.read(dialControllerProvider).selectedMode;
    if (selectedMode == DialMode.directPrefixMode &&
        privateDial &&
        !await _confirmPrivateDial()) {
      return;
    }

    final controller = ref.read(dialControllerProvider.notifier);
    final result = await controller.dial(
      rawNumber: _phoneController.text,
      privateDial: privateDial,
      selectedTenantId: _tenantController.text,
    );

    if (!mounted) {
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    if (result != null) {
      if (selectedMode == DialMode.serverOrchestratedMode) {
        final task = result.taskSnapshot;
        messenger.showSnackBar(
          SnackBar(
            content: Text(
              task == null
                  ? '已提交平台外呼任务'
                  : '已创建外呼任务：${task.status} · 租户 ${task.tenantId} · 当前 DID ${task.currentDidLabel}',
            ),
            duration: const Duration(seconds: 4),
          ),
        );
      } else {
        messenger.showSnackBar(
          SnackBar(
            content: Text(
              privateDial
                  ? '已调起隐私拨号：${result.plan.dialString}'
                  : '已调起普通拨号：${result.plan.dialString}',
            ),
            action: SnackBarAction(
              label: '反馈兼容',
              onPressed: () => _showLaunchFeedback(result.plan),
            ),
          ),
        );
      }
    } else {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            ref.read(dialControllerProvider).errorMessage ?? '拨号失败',
          ),
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  Future<void> _redialFromHistory(RecentDialEntry entry) async {
    _fillPhoneNumber(entry.phoneNumber);
    ref.read(dialControllerProvider.notifier).selectMode(entry.mode);
    await _dial(entry.mode == DialMode.directPrefixMode && entry.isPrivateDial);
  }

  Future<void> _refreshActiveTaskStatus() async {
    final refreshed = await ref
        .read(dialControllerProvider.notifier)
        .refreshActiveTaskStatus();
    if (!mounted) {
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    if (refreshed != null) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            '已刷新任务状态：${refreshed.status} · 最新事件 ${refreshed.latestEventDisplay}',
          ),
          duration: const Duration(seconds: 3),
        ),
      );
      return;
    }

    messenger.showSnackBar(
      SnackBar(
        content: Text(ref.read(dialControllerProvider).errorMessage ?? '刷新失败'),
        duration: const Duration(seconds: 4),
      ),
    );
  }

  String _formatTaskDateTime(DateTime? value) {
    if (value == null) {
      return '待服务端补充';
    }

    final local = value.toLocal();
    final month = local.month.toString().padLeft(2, '0');
    final day = local.day.toString().padLeft(2, '0');
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '$month-$day $hour:$minute';
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final dialState = ref.watch(dialControllerProvider);
    final settingsState = ref.watch(settingsControllerProvider);
    final configState = ref.watch(configControllerProvider);
    final isDirectMode = dialState.selectedMode == DialMode.directPrefixMode;

    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text(AppConstants.appName),
          actions: [
            IconButton(
              icon: const Icon(Icons.settings_outlined),
              onPressed: () => context.go(AppConstants.settingsPath),
            ),
            IconButton(
              icon: const Icon(Icons.help_outline),
              onPressed: () => context.go(AppConstants.helpPath),
            ),
            PopupMenuButton<String>(
              onSelected: (value) {
                context.go(value);
              },
              itemBuilder: (context) => const [
                PopupMenuItem(
                  value: AppConstants.adminDashboardPath,
                  child: Text('管理后台'),
                ),
                PopupMenuItem(value: AppConstants.aboutPath, child: Text('关于')),
              ],
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '你好，${authState.session?.user.displayName ?? '未登录'}',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text('当前拨号模式：${dialState.selectedMode.label}'),
                  const SizedBox(height: 8),
                  Text(
                    dialState.selectedMode.description,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: DialMode.values
                        .map(
                          (mode) => ChoiceChip(
                            label: Text(mode.label),
                            selected: dialState.selectedMode == mode,
                            onSelected: (_) => ref
                                .read(dialControllerProvider.notifier)
                                .selectMode(mode),
                          ),
                        )
                        .toList(),
                  ),
                  if (isDirectMode) ...[
                    const SizedBox(height: 8),
                    Text('当前默认前缀：${settingsState.settings.defaultDialPrefix}'),
                    const SizedBox(height: 8),
                    Text(
                      '真机验证时请先记下当前前缀；我们只会尝试拉起系统拨号器，是否真正隐藏来电显示仍需人工确认。',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ] else ...[
                    const SizedBox(height: 8),
                    Text(
                      '当前服务端编排已接入持久化任务骨架；可返回租户、当前 DID、回拨目标、回拨窗口和最新事件，并通过查询接口刷新状态。',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      TextButton.icon(
                        onPressed: () => context.go(AppConstants.settingsPath),
                        icon: const Icon(Icons.tune_outlined),
                        label: Text(isDirectMode ? '检查前缀与回退' : '查看兼容回退'),
                      ),
                      TextButton.icon(
                        onPressed: () => context.go(AppConstants.helpPath),
                        icon: const Icon(Icons.help_outline),
                        label: Text(isDirectMode ? '查看验证边界' : '查看平台说明'),
                      ),
                    ],
                  ),
                  if (configState.notices.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      configState.notices.first.content,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                  if (isDirectMode && configState.errorMessage != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      '前缀配置暂时没有刷新成功，请先到设置页使用“恢复默认前缀”，再重试隐私拨打；普通拨打仍可作为回退路径。',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('拨号入口', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 12),
                  AppTextField(
                    controller: _phoneController,
                    label: '输入号码',
                    hintText: '13800138000 / 01012345678 / +85212345678',
                    keyboardType: TextInputType.phone,
                    prefixIcon: Icons.dialpad_outlined,
                  ),
                  if (isDirectMode) ...[
                    const SizedBox(height: 8),
                    Text(
                      '普通拨打：${formatDialPreview(prefix: '', phoneNumber: _phoneController.text.isEmpty ? '13800138000' : _phoneController.text)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    Text(
                      '隐私拨打：${formatDialPreview(prefix: settingsState.settings.defaultDialPrefix, phoneNumber: _phoneController.text.isEmpty ? '13800138000' : _phoneController.text)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '失败时请先检查号码格式、系统默认电话应用和当前前缀；隐私拨打失败时，普通拨打始终可以作为回退路径。',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: AppPrimaryButton(
                            label: '普通拨打',
                            icon: Icons.call_outlined,
                            isLoading: dialState.isDialing,
                            onPressed: () => _dial(false),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: AppPrimaryButton(
                            label: '隐私拨打',
                            icon: Icons.shield_outlined,
                            isLoading: dialState.isDialing,
                            onPressed: () => _dial(true),
                          ),
                        ),
                      ],
                    ),
                  ] else ...[
                    const SizedBox(height: 8),
                    AppTextField(
                      controller: _tenantController,
                      label: '租户 ID（可选）',
                      hintText: '留空使用默认租户；双租户 QA 可显式填写',
                      keyboardType: TextInputType.text,
                      prefixIcon: Icons.apartment_outlined,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '平台编排模式会向服务端提交 `POST /calls/outbound`，并在填写租户 ID 时通过同一 `X-Tenant-Id` 头显式选择租户上下文。',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '当前输入号码：${normalizePhoneNumber(_phoneController.text.isEmpty ? '13800138000' : _phoneController.text)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 16),
                    AppPrimaryButton(
                      label: '发起平台外呼',
                      icon: Icons.hub_outlined,
                      isLoading: dialState.isDialing,
                      onPressed: () => _dial(false),
                    ),
                  ],
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      onPressed: () => context.go(AppConstants.helpPath),
                      child: Text(
                        isDirectMode ? '查看回退路径、验证边界和反馈建议' : '查看平台编排说明与兼容回退路径',
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (dialState.activeTask != null) ...[
              const SizedBox(height: 16),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '平台外呼任务',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text('任务状态：${dialState.activeTask!.status}'),
                    const SizedBox(height: 8),
                    Text('当前 DID：${dialState.activeTask!.currentDidLabel}'),
                    const SizedBox(height: 8),
                    Text(
                      '回拨窗口状态：${dialState.activeTask!.callbackStatus ?? '未建立'}',
                    ),
                    const SizedBox(height: 8),
                    Text('租户 ID：${dialState.activeTask!.tenantId}'),
                    const SizedBox(height: 8),
                    Text('回拨目标：${dialState.activeTask!.targetEndpointDisplay}'),
                    const SizedBox(height: 8),
                    Text(
                      '回拨有效期：${_formatTaskDateTime(dialState.activeTask!.callbackExpiresAt)}',
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '任务创建时间：${_formatTaskDateTime(dialState.activeTask!.createdAt)}',
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '状态更新时间：${_formatTaskDateTime(dialState.activeTask!.updatedAt)}',
                    ),
                    const SizedBox(height: 8),
                    Text('最新事件：${dialState.activeTask!.latestEventDisplay}'),
                    const SizedBox(height: 8),
                    Text(
                      '事件时间：${_formatTaskDateTime(dialState.activeTask!.latestEventAt)}',
                    ),
                    if ((dialState.activeTask!.note ?? '').isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        dialState.activeTask!.note!,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: dialState.isRefreshingTask
                            ? null
                            : _refreshActiveTaskStatus,
                        icon: dialState.isRefreshingTask
                            ? const SizedBox(
                                height: 16,
                                width: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.refresh_outlined),
                        label: Text(
                          dialState.isRefreshingTask ? '刷新中...' : '刷新任务状态',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '最近号码',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      TextButton(
                        onPressed: dialState.recentEntries.isEmpty
                            ? null
                            : () => ref
                                  .read(dialControllerProvider.notifier)
                                  .clearHistory(),
                        child: const Text('清空'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (dialState.recentEntries.isEmpty)
                    const Text('暂无本地记录，拨号后会出现在这里，点击历史号码可直接回填。')
                  else
                    ...dialState.recentEntries.map(
                      (entry) => ListTile(
                        onTap: () {
                          _fillPhoneNumber(entry.phoneNumber);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('已回填最近号码，可直接修改后再次拨打。'),
                            ),
                          );
                        },
                        contentPadding: EdgeInsets.zero,
                        leading: Icon(
                          entry.mode == DialMode.serverOrchestratedMode
                              ? Icons.hub_outlined
                              : entry.isPrivateDial
                              ? Icons.visibility_off_outlined
                              : Icons.phone_outlined,
                        ),
                        title: Text(entry.displayNumber),
                        subtitle: Text(
                          entry.mode == DialMode.serverOrchestratedMode
                              ? '平台编排 · 点击回填号码'
                              : entry.isPrivateDial
                              ? '兼容直拨 · 隐私拨打 · 点击回填号码'
                              : '兼容直拨 · 普通拨打 · 点击回填号码',
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.refresh_outlined),
                          tooltip: '再次拨打',
                          onPressed: () => _redialFromHistory(entry),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
