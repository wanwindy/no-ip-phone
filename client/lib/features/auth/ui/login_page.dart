import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/app_config.dart';
import '../../../core/constants/app_constants.dart';
import '../../../shared/widgets/app_background.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../providers/auth_controller.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _agree = true;
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
        const SnackBar(content: Text('请输入账号和密码')),
      );
      return;
    }

    final session = await ref.read(authControllerProvider.notifier).login(
          username: username,
          password: password,
        );
    if (!mounted) {
      return;
    }
    if (session != null) {
      context.go(AppConstants.homePath);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ref.read(authControllerProvider).errorMessage ?? '登录失败')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final canLogin = _agree &&
        _usernameController.text.trim().isNotEmpty &&
        _passwordController.text.isNotEmpty;

    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('登录'),
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '账号密码登录',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    AppConfig.useMockApi
                        ? '当前为显式 mock 联调模式，演示账号为 demo_user / Demo12345。'
                        : '当前连接真实 HTTP 接口，请使用后台创建的账号登录。',
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    controller: _usernameController,
                    label: '账号',
                    hintText: 'demo_user',
                    keyboardType: TextInputType.text,
                    prefixIcon: Icons.person_outline,
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    controller: _passwordController,
                    label: '密码',
                    hintText: '请输入密码',
                    keyboardType: TextInputType.visiblePassword,
                    prefixIcon: Icons.lock_outline,
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
                  const SizedBox(height: 8),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: _agree,
                    onChanged: (value) => setState(() => _agree = value ?? false),
                    title: const Text('我已阅读并同意用户协议与隐私政策'),
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
                  const SizedBox(height: 8),
                  AppPrimaryButton(
                    label: '登录',
                    icon: Icons.login_outlined,
                    isLoading: authState.status == AuthStatus.booting,
                    onPressed: canLogin ? _login : null,
                  ),
                  const SizedBox(height: 12),
                  AppSecondaryButton(
                    label: '进入管理后台',
                    icon: Icons.admin_panel_settings_outlined,
                    onPressed: () => context.go(AppConstants.adminDashboardPath),
                  ),
                  const SizedBox(height: 12),
                  if (AppConfig.useMockApi)
                    Text(
                      'Mock 提示：演示账号 ${AppConstants.mockAccountUsername} / ${AppConstants.mockAccountPassword}',
                      style: Theme.of(context).textTheme.bodySmall,
                    )
                  else
                    Text(
                      '联调提示：首个管理员和演示账号可通过服务端 bootstrap 环境变量初始化。',
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
                  Text(
                    '管理后台',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    AppConfig.useMockApi
                        ? '管理后台已接入，可使用 ${AppConstants.mockAdminUsername} / ${AppConstants.mockAdminPassword} 登录。'
                        : '管理后台已接入，可用服务端 bootstrap 初始化的管理员账号登录并维护用户、前缀和公告。',
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
