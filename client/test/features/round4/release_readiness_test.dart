import 'package:client/core/constants/app_constants.dart';
import 'package:client/features/config/providers/config_controller.dart';
import 'package:client/features/help/ui/help_page.dart';
import 'package:client/features/settings/domain/user_settings.dart';
import 'package:client/features/settings/providers/settings_controller.dart';
import 'package:client/features/settings/ui/settings_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeSettingsController extends SettingsController {
  @override
  SettingsState build() {
    return const SettingsState(
      isLoading: false,
      settings: UserSettings(
        defaultDialPrefix: '17951',
        showDialDisclaimer: false,
      ),
    );
  }

  @override
  Future<void> updateDialPrefix(String prefix) async {
    state = state.copyWith(
      settings: state.settings.copyWith(defaultDialPrefix: prefix),
      clearError: true,
    );
  }
}

class FakeConfigController extends ConfigController {
  @override
  ConfigState build() {
    return const ConfigState(
      isLoading: false,
      prefixes: [],
      notices: [],
      errorMessage: 'refresh failed',
    );
  }
}

void main() {
  testWidgets(
    'settings page offers a restore-default fallback for smoke checks',
    (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            settingsControllerProvider.overrideWith(FakeSettingsController.new),
            configControllerProvider.overrideWith(FakeConfigController.new),
          ],
          child: const MaterialApp(home: SettingsPage()),
        ),
      );

      expect(
        find.text('恢复默认前缀 ${AppConstants.defaultDialPrefix}'),
        findsOneWidget,
      );
      expect(
        find.textContaining('预发布验证可先恢复默认前缀 ${AppConstants.defaultDialPrefix}'),
        findsOneWidget,
      );

      final beforeRestore = tester.widget<TextFormField>(
        find.byType(TextFormField).first,
      );
      expect(beforeRestore.controller?.text, '17951');

      await tester.tap(find.text('恢复默认前缀 ${AppConstants.defaultDialPrefix}'));
      await tester.pumpAndSettle();

      final afterRestore = tester.widget<TextFormField>(
        find.byType(TextFormField).first,
      );
      expect(afterRestore.controller?.text, AppConstants.defaultDialPrefix);
      expect(
        find.text('已恢复默认前缀 ${AppConstants.defaultDialPrefix}，可重新进行隐私拨打验证。'),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'help page explains round 4 validation boundary and fallback path',
    (tester) async {
      await tester.pumpWidget(const MaterialApp(home: HelpPage()));

      expect(find.text('真机验证最小检查'), findsOneWidget);
      expect(find.textContaining('普通拨打就是回退路径'), findsOneWidget);
      expect(find.textContaining('系统拨号器是否成功拉起'), findsOneWidget);
      expect(
        find.textContaining('恢复默认前缀 ${AppConstants.defaultDialPrefix}'),
        findsNWidgets(2),
      );
    },
  );
}
