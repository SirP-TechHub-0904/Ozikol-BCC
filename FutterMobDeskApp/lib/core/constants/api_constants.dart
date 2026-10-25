import 'dart:io';
import 'package:flutter/foundation.dart';

/// Central API route constants and networking configurations.
class ApiConstants {
  ApiConstants._();

  /// Production cloud API URL
  static const String productionBaseUrl = 'https://api.ozikol.cloud';

  /// Dynamically active host for local Android development (127.0.0.1 for physical device via adb reverse, or 10.0.2.2 for emulator)
  static String _activeAndroidHost = '10.0.2.2';

  /// Sets the active host for Android local development.
  static void setActiveAndroidHost(String host) {
    _activeAndroidHost = host;
  }

  /// Auto-resolves whether the Android device is a physical phone connecting via
  /// 'adb reverse' (127.0.0.1) or an emulator using virtual NAT loopback (10.0.2.2).
  static Future<void> resolveAndroidHost() async {
    try {
      // 1. Try 127.0.0.1 with short timeout (physical device connected via adb reverse tcp:51025 tcp:51025)
      final socket = await Socket.connect('127.0.0.1', 51025, timeout: const Duration(milliseconds: 350));
      socket.destroy();
      _activeAndroidHost = '127.0.0.1';
      return;
    } catch (_) {}

    // 2. Default to standard Android emulator loopback
    _activeAndroidHost = '10.0.2.2';
  }

  /// Default API base URL dynamically resolved based on current runtime platform for local development.
  static String get defaultBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:51025';
    }
    if (Platform.isAndroid) {
      return 'http://$_activeAndroidHost:51025';
    }
    // Windows, macOS, Linux desktop and iOS simulator connect directly via localhost
    return 'http://localhost:51025';
  }

  // Auth & Tenant Endpoints
  static const String loginEndpoint = '/api/Auth/login';
  static const String sessionEndpoint = '/api/Auth/me';
  static const String verifyOtpEndpoint = '/api/Auth/verify-otp';
  static const String resendOtpEndpoint = '/api/Auth/resend-otp';
  static const String verifyLoginMfaEndpoint = '/api/Auth/login/verify-mfa';
  static const String resendLoginMfaEndpoint = '/api/Auth/login/resend-mfa';
  static const String forgotPasswordEndpoint = '/api/Auth/password/request-otp';
  static const String resetPasswordEndpoint = '/api/Auth/password/reset-with-otp';
  static const String forceChangePasswordEndpoint = '/api/Auth/password/force-change';
  static const String changePasswordEndpoint = '/api/Auth/password/change';
  static const String mfaStatusEndpoint = '/api/Auth/mfa';
  static const String mfaConfigureEndpoint = '/api/Auth/mfa/configure';
  static const String mfaVerifyEndpoint = '/api/Auth/mfa/verify';
  static const String tenantsEndpoint = '/api/TenantsApi';
  static const String resolveTenantEndpoint = '/api/TenantsApi/resolve';
  static const String clientConfigEndpoint = '/api/SetupApi/client-config';
  static const String brandSettingsEndpoint = '/api/SettingsApi/brand';

  // Workspace & Dashboard Endpoints
  static const String dashboardMetricsEndpoint = '/api/DashboardApi/metrics';
  static const String workspaceDashboardEndpoint = '/api/WorkspaceApi/dashboard';
  static const String notificationsEndpoint = '/api/WorkspaceApi/notifications';

  // SignalR Real-Time Hub Endpoints
  static const String notificationHubEndpoint = '/hubs/notifications';
  static const String groupChatHubEndpoint = '/hubs/group-chat';

  // Request Headers
  static const String headerTenantKey = 'X-Tenant-Key';
  static const String headerTenantDomain = 'X-Tenant-Domain';
  static const String headerAuthorization = 'Authorization';
  static const String headerSystemId = 'X-System-Id';
  static const String headerPlatform = 'X-Platform';

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 20);
}
