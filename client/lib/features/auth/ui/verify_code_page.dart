import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../shared/widgets/app_background.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../providers/auth_controller.dart';

class VerifyCodePage extends ConsumerStatefulWidget {
  const VerifyCodePage({super.key});

  @override
  ConsumerState<VerifyCodePage> createState() => _VerifyCodePageState();
}

class _VerifyCodePageState extends ConsumerState<VerifyCodePage> {
  final TextEditingController _codeController = TextEditingController();
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final authState = ref.read(authControllerProvider);
    final phone = authState.pendingPhone;
    if (phone == null || phone.isEmpty) {
      context.go(AppConstants.loginPath);
      return;
    }

    final session = await ref.read(authControllerProvider.notifier).login(
          phone: phone,
          code: _codeController.text,
        );
    if (!mounted) {
      return;
    }
    if (session != null) {
      context.go(AppConstants.homePath);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ref.read(authControllerProvider).errorMessage ?? '验证码错误')),
      );
    }
  }

  Future<void> _resend() async {
    final phone = ref.read(authControllerProvider).pendingPhone;
    if (phone == null) {
      context.go(AppConstants.loginPath);
      return;
    }
    final success = await ref.read(authControllerProvider.notifier).sendCode(phone);
    if (!mounted) {
      return;
    }
    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ref.read(authControllerProvider).errorMessage ?? '重新发送失败')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final countdown = authState.resendCountdownSeconds;
    final canResend = authState.canResendCode;

    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('验证码'),
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '输入验证码',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '已发送到：${authState.pendingPhone ?? '未填写手机号'}',
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    controller: _codeController,
                    label: '验证码',
                    hintText: AppConstants.mockVerificationCode,
                    keyboardType: TextInputType.number,
                    prefixIcon: Icons.lock_outline,
                    maxLength: 6,
                  ),
                  const SizedBox(height: 8),
                  AppPrimaryButton(
                    label: '登录',
                    icon: Icons.login_outlined,
                    isLoading: authState.status == AuthStatus.booting,
                    onPressed: _login,
                  ),
                  const SizedBox(height: 12),
                  AppSecondaryButton(
                    label: canResend
                        ? '重新发送'
                        : '重新发送（${countdown}s）',
                    icon: Icons.refresh_outlined,
                    onPressed: canResend ? _resend : null,
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
                    'Mock 说明',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  const Text('当前验证码页只做前端流程占位，真实验证码发送和校验后续接后端。'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
