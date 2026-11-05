import 'dart:io';
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

    // Attach clean, lightweight logging and Android dev host failover
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (kDebugMode) {
            debugPrint('🌐 [DIO REQ] ${options.method} ${options.uri.path}');
          }
          handler.next(options);
        },
        onResponse: (response, handler) {
          if (kDebugMode) {
            debugPrint('✅ [DIO RES] ${response.statusCode} ${response.requestOptions.uri.path}');
          }
          handler.next(response);
        },
        onError: (DioException err, handler) async {
          // On Android local development, automatically failover between 10.0.2.2 and 127.0.0.1 at most once
          if (!kIsWeb && Platform.isAndroid) {
            final uri = err.requestOptions.uri;
            final isConnectionIssue = err.type == DioExceptionType.connectionTimeout ||
                err.type == DioExceptionType.connectionError;
            final alreadyFailedOver = err.requestOptions.extra['_hasFailedOver'] == true;

            if (!alreadyFailedOver && isConnectionIssue && (uri.host == '10.0.2.2' || uri.host == '127.0.0.1')) {
              final fallbackHost = uri.host == '10.0.2.2' ? '127.0.0.1' : '10.0.2.2';
              final fallbackBaseUrl = 'http://$fallbackHost:51025/';
              dio.options.baseUrl = fallbackBaseUrl;
              ApiConstants.setActiveAndroidHost(fallbackHost);

              if (kDebugMode) {
                debugPrint('🔄 [DIO HOST FAILOVER] Switched local host to $fallbackHost, retrying ${uri.path} once...');
              }

              try {
                final response = await dio.request(
                  uri.path,
                  data: err.requestOptions.data,
                  queryParameters: err.requestOptions.queryParameters,
                  options: Options(
                    method: err.requestOptions.method,
                    headers: err.requestOptions.headers,
                    responseType: err.requestOptions.responseType,
                    contentType: err.requestOptions.contentType,
                    extra: Map<String, dynamic>.from(err.requestOptions.extra)
                      ..['_hasFailedOver'] = true,
                  ),
                );
                return handler.resolve(response);
              } catch (retryErr) {
                if (retryErr is DioException) {
                  return handler.next(retryErr);
                }
              }
            }
          }

          if (kDebugMode) {
            debugPrint('❌ [DIO ERR] ${err.response?.statusCode} ${err.requestOptions.uri.path}: ${err.message}');
          }
          handler.next(err);
        },
      ),
    );
  }
}
