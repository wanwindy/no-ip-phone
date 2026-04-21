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
import '../../dialer/providers/dialer_controller.dart';
import '../providers/settings_controller.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  final TextEditingController _prefixController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _prefixController.text = ref
        .read(settingsControllerProvider)
        .settings
        .defaultDialPrefix;
  }

  @override
  void dispose() {
    _prefixController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settingsState = ref.watch(settingsControllerProvider);
    final configState = ref.watch(configControllerProvider);

    _prefixController.value = _prefixController.value.copyWith(
      text: settingsState.settings.defaultDialPrefix,
      selection: TextSelection.collapsed(
        offset: settingsState.settings.defaultDialPrefix.length,
      ),
      composing: TextRange.empty,
    );

    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('设置'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('默认隐私前缀', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  AppTextField(
                    controller: _prefixController,
                    label: '前缀',
                    hintText: AppConstants.defaultDialPrefix,
                    keyboardType: TextInputType.text,
                    prefixIcon: Icons.local_phone_outlined,
                    onChanged: (value) {
                      ref
                          .read(settingsControllerProvider.notifier)
                          .updateDialPrefix(value.trim());
                    },
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '主页上的隐私拨打会直接使用这里的前缀。真机 smoke 时请先记下当前前缀；若隐私拨打失败，可先恢复默认前缀或改用普通拨打。',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '预览拨号串：${formatDialPreview(prefix: settingsState.settings.defaultDialPrefix, phoneNumber: '13800138000')}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  if (configState.errorMessage != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      '服务器前缀配置暂未刷新成功。预发布验证可先恢复默认前缀 ${AppConstants.defaultDialPrefix}，再重试隐私拨打。',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                  const SizedBox(height: 12),
                  AppSecondaryButton(
                    label: '恢复默认前缀 ${AppConstants.defaultDialPrefix}',
                    icon: Icons.restart_alt_outlined,
                    onPressed: () async {
                      await ref
                          .read(settingsControllerProvider.notifier)
                          .updateDialPrefix(AppConstants.defaultDialPrefix);
                      if (!context.mounted) {
                        return;
                      }
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            '已恢复默认前缀 ${AppConstants.defaultDialPrefix}，可重新进行隐私拨打验证。',
                          ),
                        ),
                      );
                    },
                  ),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      onPressed: () => context.go(AppConstants.helpPath),
                      child: const Text('查看帮助里的回退建议'),
                    ),
                  ),
                  if (configState.prefixes.isNotEmpty)
                    Text('推荐前缀', style: Theme.of(context).textTheme.bodyMedium),
                  if (configState.prefixes.isNotEmpty)
                    const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: configState.prefixes
                        .map(
                          (prefix) => ActionChip(
                            label: Text(
                              '${prefix.countryCode} ${prefix.prefix}',
                            ),
                            onPressed: () {
                              ref
                                  .read(settingsControllerProvider.notifier)
                                  .updateDialPrefix(prefix.prefix);
                            },
                          ),
                        )
                        .toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '隐私拨打风险提示',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('首次隐私拨打时显示说明'),
                    value: settingsState.settings.showDialDisclaimer,
                    onChanged: (value) {
                      ref
                          .read(settingsControllerProvider.notifier)
                          .updateDisclaimer(value);
                    },
                  ),
                  Text(
                    '关闭后会直接尝试拉起系统拨号器，不再弹出首次确认。',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '即使关闭提醒，应用也仍然只是尝试通过系统拨号器和运营商前缀隐藏来电显示，并不保证成功。',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('本地数据', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  AppSecondaryButton(
                    label: '清除本地拨号历史',
                    icon: Icons.delete_outline,
                    onPressed: () => ref
                        .read(dialControllerProvider.notifier)
                        .clearHistory(),
                  ),
                  const SizedBox(height: 12),
                  AppSecondaryButton(
                    label: '退出登录',
                    icon: Icons.logout_outlined,
                    onPressed: () async {
                      await ref.read(authControllerProvider.notifier).logout();
                      if (context.mounted) {
                        context.go(AppConstants.loginPath);
                      }
                    },
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
