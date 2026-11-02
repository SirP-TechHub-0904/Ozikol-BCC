import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/core/constants/api_constants.dart';
import 'package:ozikol_app/core/network/tenant_interceptor.dart';
import 'package:ozikol_app/core/storage/secure_storage_service.dart';

void main() {
  group('Device Trust Token Tests', () {
    test('SecureStorageService stores, retrieves, and clears device trust tokens', () async {
      final storage = SecureStorageService.inMemory();

      // Initially null
      expect(await storage.getDeviceTrustToken('test-tenant'), isNull);

      // Persist trust token for tenant
      await storage.setDeviceTrustToken('token_abc123', 'test-tenant');
      expect(await storage.getDeviceTrustToken('test-tenant'), equals('token_abc123'));
      // Fallback global check
      expect(await storage.getDeviceTrustToken(), equals('token_abc123'));

      // Clear trust token
      await storage.clearDeviceTrustToken('test-tenant');
      expect(await storage.getDeviceTrustToken('test-tenant'), isNull);
    });

    test('TenantInterceptor injects X-Device-Trust-Token into outbound requests', () async {
      final storage = SecureStorageService.inMemory();
      await storage.setDeviceTrustToken('trust_xyz987', 'acme-corp');

      final interceptor = TenantInterceptor(storage);
      final options = RequestOptions(
        path: ApiConstants.loginEndpoint,
        headers: {
          ApiConstants.headerTenantKey: 'acme-corp',
        },
      );

      final handler = RequestInterceptorHandler();
      // Invoke onRequest
      await interceptor.onRequest(options, handler);

      expect(options.headers['X-Device-Trust-Token'], equals('trust_xyz987'));
    });
  });
}
