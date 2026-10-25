import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/core/network/api_client.dart';
import 'package:ozikol_app/core/storage/secure_storage_service.dart';
import 'package:ozikol_app/features/workspace_auth/data/workspace_repository.dart';
import 'package:ozikol_app/features/workspace_auth/state/workspace_state.dart';

class MockHttpClientAdapter implements HttpClientAdapter {
  final Map<String, dynamic> Function(RequestOptions options) handler;

  MockHttpClientAdapter(this.handler);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final response = handler(options);
    final statusCode = response['statusCode'] as int? ?? 200;
    final data = response['data'];
    final bytes = utf8.encode(jsonEncode(data));

    return ResponseBody.fromBytes(
      bytes,
      statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  group('Workspace Resolution & Custom Error Sanitization Tests', () {
    test('Resolves tenant from URL format https://rozzy-touchxcx.localhost:4200/', () async {
      final storage = SecureStorageService.inMemory();
      final apiClient = ApiClient(storage);

      apiClient.dio.httpClientAdapter = MockHttpClientAdapter((options) {
        if (options.path.contains('/api/TenantsApi')) {
          return {
            'statusCode': 200,
            'data': {
              'success': true,
              'data': [
                {
                  'id': 14,
                  'tenantKey': 'rozzy-touchxcx',
                  'organizationName': 'Rozzy Touchxcx',
                  'primaryDomain': 'rozzy-touchxcx.localhost:4200',
                  'websiteUrl': 'https://rozzy-touchxcx.localhost:4200',
                  'isActive': true,
                }
              ]
            }
          };
        }
        return {'statusCode': 404, 'data': {}};
      });

      final repo = WorkspaceRepository(apiClient);

      // 1. Test resolving via full URL
      final workspace = await repo.resolveWorkspace('https://rozzy-touchxcx.localhost:4200/');
      expect(workspace.tenantKey, 'rozzy-touchxcx');
      expect(workspace.organizationName, 'Rozzy Touchxcx');
      expect(workspace.primaryDomain, 'rozzy-touchxcx.localhost:4200');

      // 2. Test resolving via access code slug
      final workspaceBySlug = await repo.resolveWorkspace('rozzy-touchxcx');
      expect(workspaceBySlug.tenantKey, 'rozzy-touchxcx');
      expect(workspaceBySlug.organizationName, 'Rozzy Touchxcx');

      // 3. Test resolving via subdomain without port
      final workspaceByHost = await repo.resolveWorkspace('rozzy-touchxcx.localhost');
      expect(workspaceByHost.tenantKey, 'rozzy-touchxcx');
    });

    test('Throws custom user-friendly error without mentioning Master Catalog or DB on not found', () async {
      final storage = SecureStorageService.inMemory();
      final apiClient = ApiClient(storage);

      apiClient.dio.httpClientAdapter = MockHttpClientAdapter((options) {
        return {
          'statusCode': 200,
          'data': {
            'success': true,
            'data': [
              {
                'tenantKey': 'other-org',
                'organizationName': 'Other Org',
                'primaryDomain': 'other-org.localhost:4200',
              }
            ]
          }
        };
      });

      final repo = WorkspaceRepository(apiClient);

      try {
        await repo.resolveWorkspace('nonexistent-company');
        fail('Should have thrown an exception');
      } catch (e) {
        final msg = e.toString();
        // Verify custom error message
        expect(msg, contains('Workspace "nonexistent-company" could not be found'));
        expect(msg, contains('Please check your access code or web address'));
        // Verify absence of internal database terminology
        expect(msg.toLowerCase(), isNot(contains('master catalog')));
        expect(msg.toLowerCase(), isNot(contains('masterdb')));
        expect(msg.toLowerCase(), isNot(contains('master db')));
        expect(msg.toLowerCase(), isNot(contains('sql')));
      }
    });

    test('Throws clean validation error when access code is empty', () async {
      final storage = SecureStorageService.inMemory();
      final apiClient = ApiClient(storage);
      final repo = WorkspaceRepository(apiClient);

      expect(
        () => repo.resolveWorkspace('   '),
        throwsA(predicate((e) =>
            e.toString().contains('Please enter a valid organization access code or web domain'))),
      );
    });

    test('WorkspaceNotifier.sanitizeError guarantees Ozikol is never in error text and outputs friendly messages', () {
      // 1. Check vendor branding removal from connection error
      final sanitizedOzikolServer = WorkspaceNotifier.sanitizeError(
        Exception('Unable to connect to the Ozikol server. Please check your network connection.'),
      );
      expect(sanitizedOzikolServer, 'Unable to connect. Please check your network connection.');
      expect(sanitizedOzikolServer.toLowerCase(), isNot(contains('ozikol')));

      // 2. Check vendor branding removal from generic error
      final sanitizedGeneralOzikol = WorkspaceNotifier.sanitizeError(
        Exception('Ozikol tenant resolution failure [MasterDB]'),
      );
      expect(sanitizedGeneralOzikol, 'Workspace could not be found. Please check your access code or web address.');
      expect(sanitizedGeneralOzikol.toLowerCase(), isNot(contains('ozikol')));

      // 3. Check low-level socket and timeout exceptions
      final sanitizedSocket = WorkspaceNotifier.sanitizeError(
        Exception('SocketException: OS Error: Connection refused, errno = 111'),
      );
      expect(sanitizedSocket, 'Unable to connect. Please check your network connection.');

      final sanitizedTimeout = WorkspaceNotifier.sanitizeError(
        Exception('DioException [connection timeout]: The request connection took longer than 15000ms'),
      );
      expect(sanitizedTimeout, 'Unable to connect. Please check your network connection.');

      // 4. Check SQL, Database, and Server jargon sanitization
      final sanitizedSql = WorkspaceNotifier.sanitizeError(
        Exception('SqlException: Cannot open database "Ozikol_Tenant_Db" requested by login.'),
      );
      expect(sanitizedSql, 'Something went wrong. Please try again in a few moments.');
      expect(sanitizedSql.toLowerCase(), isNot(contains('ozikol')));
      expect(sanitizedSql.toLowerCase(), isNot(contains('sql')));
      expect(sanitizedSql.toLowerCase(), isNot(contains('database')));

      final sanitizedServer = WorkspaceNotifier.sanitizeError(
        Exception('Internal server error 500: Server rejected the request.'),
      );
      expect(sanitizedServer, 'Something went wrong. Please try again in a few moments.');
      expect(sanitizedServer.toLowerCase(), isNot(contains('server')));

      final sanitizedBrandedCustom = WorkspaceNotifier.sanitizeError(
        Exception('Ozikol operational limit reached.'),
      );
      expect(sanitizedBrandedCustom.toLowerCase(), isNot(contains('ozikol')));
    });
  });
}
