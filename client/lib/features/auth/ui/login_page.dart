import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/app_config.dart';
import '../../../core/constants/app_constants.dart';
import '../../../shared/utils/phone_utils.dart';
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
  final TextEditingController _phoneController = TextEditingController();
  bool _agree = true;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    final phone = _phoneController.text;
    if (!isDialablePhoneNumber(phone)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请输入合法手机号/座机/国际号码')),
      );
      return;
    }
    final success = await ref.read(authControllerProvider.notifier).sendCode(phone);
    if (!mounted) {
      return;
    }
    if (success) {
      context.go(AppConstants.verifyPath);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ref.read(authControllerProvider).errorMessage ?? '验证码发送失败')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final canSend = _agree && isDialablePhoneNumber(_phoneController.text);

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
                    '手机号验证码登录',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    AppConfig.useMockApi
                        ? '当前为显式 mock 联调模式，验证码固定为 123456。'
                        : '当前连接真实 HTTP 接口，开发环境验证码由服务端环境变量控制。',
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    controller: _phoneController,
                    label: '手机号',
                    hintText: '13800138000',
                    keyboardType: TextInputType.phone,
                    prefixIcon: Icons.phone_android_outlined,
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
                    label: '获取验证码',
                    icon: Icons.sms_outlined,
                    isLoading: authState.status == AuthStatus.booting,
                    onPressed: canSend ? _sendCode : null,
                  ),
                  const SizedBox(height: 12),
                  if (AppConfig.useMockApi)
                    Text(
                      'Mock 提示：验证码固定为 ${AppConstants.mockVerificationCode}',
                      style: Theme.of(context).textTheme.bodySmall,
                    )
                  else
                    Text(
                      '联调提示：请使用服务端配置的固定验证码进行验证。',
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
                    '待接入项',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  const Text('真实短信发送、验证码限流和后端登录态校验都在下一轮接入。'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
