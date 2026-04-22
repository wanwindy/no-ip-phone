import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/app_config.dart';
import '../../../core/constants/app_constants.dart';
import '../../../shared/widgets/app_background.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../providers/admin_auth_controller.dart';

class AdminLoginPage extends ConsumerStatefulWidget {
  const AdminLoginPage({super.key});

  @override
  ConsumerState<AdminLoginPage> createState() => _AdminLoginPageState();
}

class _AdminLoginPageState extends ConsumerState<AdminLoginPage> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text;
    if (username.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请输入管理员账号和密码')),
      );
      return;
    }

    final session = await ref.read(adminAuthControllerProvider.notifier).login(
          username: username,
          password: password,
        );
    if (!mounted) {
      return;
    }

    if (session != null) {
      context.go(AppConstants.adminDashboardPath);
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          ref.read(adminAuthControllerProvider).errorMessage ?? '管理员登录失败',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(adminAuthControllerProvider);
    final canLogin = _usernameController.text.trim().isNotEmpty &&
        _passwordController.text.isNotEmpty;

    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('管理后台登录'),
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '管理员登录',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    AppConfig.useMockApi
                        ? '当前为 mock 联调模式，可直接使用 admin / Admin12345 进入后台。'
                        : '当前连接真实 HTTP 接口，请使用服务端 bootstrap 初始化的管理员账号登录。',
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    controller: _usernameController,
                    label: '管理员账号',
                    hintText: 'admin',
                    prefixIcon: Icons.person_outline,
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    controller: _passwordController,
                    label: '管理员密码',
                    hintText: '请输入密码',
                    prefixIcon: Icons.lock_outline,
                    keyboardType: TextInputType.visiblePassword,
                    obscureText: _obscurePassword,
                    suffixIcon: IconButton(
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                      ),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 16),
                  AppPrimaryButton(
                    label: '进入后台',
                    icon: Icons.admin_panel_settings_outlined,
                    isLoading: authState.status == AdminAuthStatus.booting,
                    onPressed: canLogin ? _login : null,
                  ),
                  const SizedBox(height: 12),
                  AppSecondaryButton(
                    label: '返回用户登录',
                    icon: Icons.arrow_back_outlined,
                    onPressed: () => context.go(AppConstants.loginPath),
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
                    '当前能力',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  const Text('这一版后台已接入用户账号、拨号前缀和公告三块基础管理能力。'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
