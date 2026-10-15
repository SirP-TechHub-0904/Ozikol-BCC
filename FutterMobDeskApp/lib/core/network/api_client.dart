import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage_service.dart';
import 'tenant_interceptor.dart';

/// Central API client singleton wrapping Dio with automated multi-tenant headers and logging.
class ApiClient {
  late final Dio dio;

  ApiClient(SecureStorageService storageService, {String? customBaseUrl}) {
    final effectiveUrl = customBaseUrl ?? storageService.getCustomBaseUrl() ?? ApiConstants.defaultBaseUrl;
    final baseOptions = BaseOptions(
      baseUrl: effectiveUrl,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.receiveTimeout,
      responseType: ResponseType.json,
    );

    dio = Dio(baseOptions);

    // Attach multi-tenant injector interceptor
    dio.interceptors.add(TenantInterceptor(storageService));

    // Attach developer log interceptor in debug builds
    if (kDebugMode) {
      dio.interceptors.add(
        LogInterceptor(
          requestHeader: true,
          requestBody: true,
          responseHeader: false,
          responseBody: true,
          error: true,
        ),
      );
    }
  }
}
