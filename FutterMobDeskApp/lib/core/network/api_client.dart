import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage_service.dart';
import 'tenant_interceptor.dart';

/// Central API client singleton wrapping Dio with automated multi-tenant headers and logging.
class ApiClient {
  late final Dio dio;

  ApiClient(SecureStorageService storageService, {String? customBaseUrl}) {
    final rawUrl = customBaseUrl ?? storageService.getCustomBaseUrl() ?? ApiConstants.defaultBaseUrl;
    final effectiveUrl = rawUrl.endsWith('/') ? rawUrl : '$rawUrl/';
    final baseOptions = BaseOptions(
      baseUrl: effectiveUrl,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.receiveTimeout,
      responseType: ResponseType.json,
    );

    dio = Dio(baseOptions);

    // Attach multi-tenant injector interceptor
    dio.interceptors.add(TenantInterceptor(storageService));

    // Attach clean, lightweight logging in debug builds (avoids freezing ADB logcat with huge JSON payloads)
    if (kDebugMode) {
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            debugPrint('🌐 [DIO REQ] ${options.method} ${options.uri.path}');
            handler.next(options);
          },
          onResponse: (response, handler) {
            debugPrint('✅ [DIO RES] ${response.statusCode} ${response.requestOptions.uri.path}');
            handler.next(response);
          },
          onError: (DioException err, handler) {
            debugPrint('❌ [DIO ERR] ${err.response?.statusCode} ${err.requestOptions.uri.path}: ${err.message}');
            handler.next(err);
          },
        ),
      );
    }
  }
}
