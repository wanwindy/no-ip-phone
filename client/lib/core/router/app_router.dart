import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_controller.dart';
import '../../features/auth/ui/login_page.dart';
import '../../features/auth/ui/verify_code_page.dart';
import '../../features/dialer/ui/home_page.dart';
import '../../features/help/ui/about_page.dart';
import '../../features/help/ui/help_page.dart';
import '../../features/settings/ui/settings_page.dart';
import '../../features/startup/providers/startup_controller.dart';
import '../../features/startup/ui/splash_page.dart';
import '../constants/app_constants.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);
  final startupState = ref.watch(startupControllerProvider);

  return GoRouter(
    initialLocation: AppConstants.splashPath,
    debugLogDiagnostics: false,
    routes: [
      GoRoute(
        path: AppConstants.splashPath,
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: AppConstants.loginPath,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: AppConstants.verifyPath,
        builder: (context, state) => const VerifyCodePage(),
      ),
      GoRoute(
        path: AppConstants.homePath,
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: AppConstants.settingsPath,
        builder: (context, state) => const SettingsPage(),
      ),
      GoRoute(
        path: AppConstants.helpPath,
        builder: (context, state) => const HelpPage(),
      ),
      GoRoute(
        path: AppConstants.aboutPath,
        builder: (context, state) => const AboutPage(),
      ),
    ],
    redirect: (context, state) {
      final location = state.matchedLocation;
      final isPublicRoute = <String>{
        AppConstants.splashPath,
        AppConstants.loginPath,
        AppConstants.verifyPath,
        AppConstants.helpPath,
        AppConstants.aboutPath,
      }.contains(location);

      if (startupState.status != StartupStatus.ready ||
          authState.status == AuthStatus.booting) {
        return location == AppConstants.splashPath ? null : AppConstants.splashPath;
      }

      if (authState.isAuthenticated &&
          (location == AppConstants.loginPath ||
              location == AppConstants.verifyPath ||
              location == AppConstants.splashPath)) {
        return AppConstants.homePath;
      }

      if (!authState.isAuthenticated) {
        if (location == AppConstants.verifyPath &&
            (authState.pendingPhone == null || authState.pendingPhone!.isEmpty)) {
          return AppConstants.loginPath;
        }
        if (!isPublicRoute) {
          return AppConstants.loginPath;
        }
      }

      return null;
    },
  );
});
