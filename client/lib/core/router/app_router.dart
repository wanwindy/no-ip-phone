import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/admin/providers/admin_auth_controller.dart';
import '../../features/admin/ui/admin_dashboard_page.dart';
import '../../features/admin/ui/admin_login_page.dart';
import '../../features/auth/providers/auth_controller.dart';
import '../../features/auth/ui/login_page.dart';
import '../../features/dialer/ui/home_page.dart';
import '../../features/help/ui/about_page.dart';
import '../../features/help/ui/help_page.dart';
import '../../features/settings/ui/settings_page.dart';
import '../../features/startup/providers/startup_controller.dart';
import '../../features/startup/ui/splash_page.dart';
import '../constants/app_constants.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);
  final adminAuthState = ref.watch(adminAuthControllerProvider);
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
        path: AppConstants.adminLoginPath,
        builder: (context, state) => const AdminLoginPage(),
      ),
      GoRoute(
        path: AppConstants.adminDashboardPath,
        builder: (context, state) => const AdminDashboardPage(),
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
      final isAdminRoute = location == AppConstants.adminLoginPath ||
          location == AppConstants.adminDashboardPath;
      final isPublicRoute = <String>{
        AppConstants.splashPath,
        AppConstants.loginPath,
        AppConstants.adminLoginPath,
        AppConstants.helpPath,
        AppConstants.aboutPath,
      }.contains(location);

      if (startupState.status != StartupStatus.ready ||
          authState.status == AuthStatus.booting ||
          adminAuthState.status == AdminAuthStatus.booting) {
        return location == AppConstants.splashPath ? null : AppConstants.splashPath;
      }

      if (isAdminRoute) {
        if (adminAuthState.isAuthenticated &&
            location == AppConstants.adminLoginPath) {
          return AppConstants.adminDashboardPath;
        }

        if (!adminAuthState.isAuthenticated &&
            location == AppConstants.adminDashboardPath) {
          return AppConstants.adminLoginPath;
        }

        return null;
      }

      if (authState.isAuthenticated &&
          (location == AppConstants.loginPath ||
              location == AppConstants.splashPath)) {
        return AppConstants.homePath;
      }

      if (!authState.isAuthenticated) {
        if (!isPublicRoute) {
          return AppConstants.loginPath;
        }
      }

      return null;
    },
  );
});
