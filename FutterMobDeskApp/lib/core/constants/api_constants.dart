import 'dart:io';
import 'package:flutter/foundation.dart';

/// Central API route constants and networking configurations.
class ApiConstants {
  ApiConstants._();

  /// Default API base URL dynamically resolved based on current runtime platform.
  static String get defaultBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:51026';
    }
    if (Platform.isAndroid) {
      // Android emulator maps 10.0.2.2 to host machine's localhost
      return 'http://10.0.2.2:51026';
    }
    // Windows, macOS, Linux desktop and iOS simulator connect directly via localhost
    return 'http://localhost:51026';
  }

  // Auth & Tenant Endpoints
  static const String loginEndpoint = '/api/Auth/login';
  static const String sessionEndpoint = '/api/Auth/me';
  static const String verifyOtpEndpoint = '/api/Auth/verify-otp';
  static const String resendOtpEndpoint = '/api/Auth/resend-otp';
  static const String tenantsEndpoint = '/api/Tenants';
  static const String resolveTenantEndpoint = '/api/Tenants/resolve';
  static const String clientConfigEndpoint = '/api/Setup/client-config';

  // Workspace & Dashboard Endpoints
  static const String workspaceDashboardEndpoint = '/api/WorkspaceApi/dashboard';
  static const String notificationsEndpoint = '/api/WorkspaceApi/notifications';

  // Request Headers
  static const String headerTenantKey = 'X-Tenant-Key';
  static const String headerTenantDomain = 'X-Tenant-Domain';
  static const String headerAuthorization = 'Authorization';

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 20);
}
