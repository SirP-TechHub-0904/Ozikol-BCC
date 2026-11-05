import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage_service.dart';

/// Intercepts all outbound HTTP requests made by Dio to automatically inject
/// multi-tenant routing headers (`X-Tenant-Key`, `X-Tenant-Domain`), Bearer JWT tokens,
/// and persistent client system identification (`X-System-Id`, `X-Platform`).
class TenantInterceptor extends Interceptor {
  final SecureStorageService _storageService;

  TenantInterceptor(this._storageService);

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // 1. Inject persistent unique system/device identification
    final systemDeviceId = await _storageService.getOrCreateSystemDeviceId();
    if (!options.headers.containsKey(ApiConstants.headerSystemId)) {
      options.headers[ApiConstants.headerSystemId] = systemDeviceId;
    }

    if (!options.headers.containsKey(ApiConstants.headerPlatform)) {
      options.headers[ApiConstants.headerPlatform] = kIsWeb ? 'web' : Platform.operatingSystem;
    }

    // Inject accurate platform User-Agent for connected device identification and audit trails
    if (!options.headers.containsKey('User-Agent')) {
      final isMobile = !kIsWeb && (Platform.isAndroid || Platform.isIOS);
      final os = kIsWeb ? 'Web' : Platform.operatingSystem;
      final form = isMobile ? 'Mobile' : 'Desktop';
      options.headers['User-Agent'] = 'BCC-Client/1.0 ($os; $form)';
    }

    // 2. Inject active workspace credentials and headers
    final activeWorkspace = await _storageService.getActiveWorkspace();

    if (activeWorkspace != null) {
      final hasExplicitTenantKey = options.headers.containsKey(ApiConstants.headerTenantKey);
      if (!hasExplicitTenantKey) {
        options.headers[ApiConstants.headerTenantKey] = activeWorkspace.tenantKey;
      }
      if (!options.headers.containsKey(ApiConstants.headerTenantDomain) &&
          (!hasExplicitTenantKey || options.headers[ApiConstants.headerTenantKey] == activeWorkspace.tenantKey)) {
        options.headers[ApiConstants.headerTenantDomain] =
            activeWorkspace.customDomain ?? activeWorkspace.primaryDomain;
      }

      final explicitKey = options.headers[ApiConstants.headerTenantKey]?.toString().trim();
      final isTargetingDifferentTenant = explicitKey != null &&
          explicitKey.isNotEmpty &&
          explicitKey.toLowerCase() != activeWorkspace.tenantKey.toLowerCase();

      final normalizedPath = options.path.toLowerCase();
      final isPublicOrDiscoveryPath = normalizedPath.contains('/auth/login') ||
          normalizedPath.contains('/auth/password') ||
          normalizedPath.contains('/auth/verify') ||
          normalizedPath.contains('/auth/resend') ||
          normalizedPath.contains('/settingsapi/brand') ||
          normalizedPath.contains('/setupapi/client-config') ||
          normalizedPath.contains('/tenantsapi');

      if (!isPublicOrDiscoveryPath &&
          !isTargetingDifferentTenant &&
          activeWorkspace.authToken != null &&
          activeWorkspace.authToken!.isNotEmpty &&
          !options.headers.containsKey(ApiConstants.headerAuthorization)) {
        options.headers[ApiConstants.headerAuthorization] = 'Bearer ${activeWorkspace.authToken}';
      }
    }

    // 3. Inject Device Trust Token for seamless 2FA bypass on trusted devices
    final effectiveTenantKey = options.headers[ApiConstants.headerTenantKey]?.toString() ?? activeWorkspace?.tenantKey;
    final trustToken = await _storageService.getDeviceTrustToken(effectiveTenantKey);
    if (trustToken != null && trustToken.isNotEmpty && !options.headers.containsKey('X-Device-Trust-Token')) {
      options.headers['X-Device-Trust-Token'] = trustToken;
    }

    // Always accept application/json
    options.headers['Accept'] = 'application/json';

    return handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Handle unauthorized (session expired)
    } else if (err.response?.statusCode == 404) {
      // Workspace not found
    }
    return handler.next(err);
  }
}
