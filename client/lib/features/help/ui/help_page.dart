import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../shared/widgets/app_background.dart';
import '../../../shared/widgets/app_card.dart';

class HelpPage extends StatelessWidget {
  const HelpPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('帮助'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.canPop()
                ? context.pop()
                : context.go(AppConstants.loginPath),
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '能力边界',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  SizedBox(height: 8),
                  Text('本应用只会通过系统拨号器和运营商前缀尝试隐藏来电显示，不会把“尝试隐藏”表述成“保证成功”。'),
                  SizedBox(height: 8),
                  Text('我们不会检测是否真正接通，也不会伪造通话结果；真机验证需要你在设备上确认“系统拨号器是否成功拉起”。'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '真机验证最小检查',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  const Text('1. 先记下主页显示的当前默认前缀，便于反馈兼容结果。'),
                  const SizedBox(height: 6),
                  const Text('2. 先确认普通拨打能够拉起系统拨号器；隐私拨打失败时，普通拨打就是回退路径。'),
                  const SizedBox(height: 6),
                  Text(
                    '3. 若配置异常，先到设置页恢复默认前缀 ${AppConstants.defaultDialPrefix}，再继续隐私拨打验证。',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '失败时可以做什么',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  const Text('号码非法：先回到主页检查号码格式，或从最近号码点击回填后再改。'),
                  const SizedBox(height: 6),
                  const Text('设备不支持 / 拉起失败：检查系统默认电话应用、拨号权限，必要时切回普通拨打。'),
                  const SizedBox(height: 6),
                  Text(
                    '配置不可用：到设置页点击“恢复默认前缀 ${AppConstants.defaultDialPrefix}”，再重新尝试隐私拨打。',
                  ),
                  const SizedBox(height: 6),
                  const Text('仍然异常：记录机型、系统版本、运营商、当前前缀和本次拨号串，作为兼容反馈。'),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => context.go(AppConstants.settingsPath),
                    child: const Text('前往设置检查前缀'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '合规提示',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  SizedBox(height: 8),
                  Text('请仅在合法、合规的场景下使用隐私拨打能力；预发布验证也不应把“尝试隐藏”误解为“保证隐藏成功”。'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
