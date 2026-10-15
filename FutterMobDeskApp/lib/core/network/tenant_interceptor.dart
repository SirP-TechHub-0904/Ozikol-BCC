import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage_service.dart';

/// Intercepts all outbound HTTP requests made by Dio to automatically inject
/// multi-tenant routing headers (`X-Tenant-Key`, `X-Tenant-Domain`) and Bearer JWT tokens.
class TenantInterceptor extends Interceptor {
  final SecureStorageService _storageService;

  TenantInterceptor(this._storageService);

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final activeWorkspace = await _storageService.getActiveWorkspace();

    if (activeWorkspace != null) {
      // 1. Inject active tenant routing headers
      if (!options.headers.containsKey(ApiConstants.headerTenantKey)) {
        options.headers[ApiConstants.headerTenantKey] = activeWorkspace.tenantKey;
      }
      if (!options.headers.containsKey(ApiConstants.headerTenantDomain)) {
        options.headers[ApiConstants.headerTenantDomain] =
            activeWorkspace.customDomain ?? activeWorkspace.primaryDomain;
      }

      // 2. Inject JWT Bearer Token if available
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
