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

    // 2. Inject active workspace credentials and headers
    final activeWorkspace = await _storageService.getActiveWorkspace();

    if (activeWorkspace != null) {
      if (!options.headers.containsKey(ApiConstants.headerTenantKey)) {
        options.headers[ApiConstants.headerTenantKey] = activeWorkspace.tenantKey;
      }
      if (!options.headers.containsKey(ApiConstants.headerTenantDomain)) {
        options.headers[ApiConstants.headerTenantDomain] =
            activeWorkspace.customDomain ?? activeWorkspace.primaryDomain;
      }

      if (activeWorkspace.authToken != null &&
          activeWorkspace.authToken!.isNotEmpty &&
          !options.headers.containsKey(ApiConstants.headerAuthorization)) {
        options.headers[ApiConstants.headerAuthorization] = 'Bearer ${activeWorkspace.authToken}';
      }
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
