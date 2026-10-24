import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/core/models/workspace.dart';
import 'package:ozikol_app/core/network/api_client.dart';
import 'package:ozikol_app/core/storage/secure_storage_service.dart';
import 'package:ozikol_app/features/workspace_auth/data/workspace_repository.dart';
import 'package:ozikol_app/features/workspace_auth/presentation/widgets/workspace_switch_dialog.dart';
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

String _generateMockJwt({required bool expired}) {
  final header = base64Url.encode(utf8.encode(jsonEncode({'alg': 'HS256', 'typ': 'JWT'})));
  final expTime = expired
      ? (DateTime.now().subtract(const Duration(hours: 2)).millisecondsSinceEpoch ~/ 1000)
      : (DateTime.now().add(const Duration(hours: 24)).millisecondsSinceEpoch ~/ 1000);
  final payload = base64Url.encode(utf8.encode(jsonEncode({
    'sub': 'user-123',
    'email': 'admin@mbco.com',
    'exp': expTime,
  })));
  return '$header.$payload.mockSignature';
}

void main() {
  group('Desktop Workspace Switch & Session Verification Tests', () {
    late SecureStorageService storage;
    late ApiClient apiClient;
    late WorkspaceRepository repository;

    setUp(() {
      storage = SecureStorageService.inMemory();
      apiClient = ApiClient(storage);
      repository = WorkspaceRepository(apiClient);
    });

    test('Switch to workspace without active login triggers requiresLogin status', () async {
      final notifier = WorkspaceNotifier(storage, repository);

      final targetWorkspace = Workspace(
        tenantKey: 'mb-co',
        organizationName: 'MB & Co Enterprises',
        primaryDomain: 'mb-co.ozikol.cloud',
        lastAccessed: DateTime.now(),
      );

      final result = await notifier.verifyAndSwitchWorkspace(targetWorkspace);

      expect(result.status, equals(WorkspaceSwitchStatus.requiresLogin));
      expect(result.isAuthenticated, isFalse);
      expect(notifier.state.hasActiveSession, isFalse);
      expect(notifier.state.pendingWorkspace?.tenantKey, equals('mb-co'));
      expect(notifier.state.shouldBypassEntryScreen, isTrue);
    });

    test('Switch to workspace with valid active session authenticates and restores state', () async {
      final validJwt = _generateMockJwt(expired: false);

      apiClient.dio.httpClientAdapter = MockHttpClientAdapter((options) {
        if (options.path.contains('/api/Auth/me')) {
          return {
            'statusCode': 200,
            'data': {
              'success': true,
              'data': {
                'userId': 'usr-999',
                'email': 'lead@paulc.com',
                'fullName': 'Paul C',
                'roles': ['Admin'],
                'effectivePermissions': {'isAdmin': true, 'canAccessAdminConsole': true},
                'licensedTenantFeatures': ['USERS', 'CMS'],
                'token': validJwt,
              }
            }
          };
        }
        return {'statusCode': 404, 'data': {}};
      });

      final notifier = WorkspaceNotifier(storage, repository);

      final targetWorkspace = Workspace(
        tenantKey: 'paulc',
        organizationName: 'Paul C Global',
        primaryDomain: 'paulc.ozikol.cloud',
        authToken: validJwt,
        lastAccessed: DateTime.now(),
      );

      await storage.saveWorkspace(targetWorkspace);

      final result = await notifier.verifyAndSwitchWorkspace(targetWorkspace);

      expect(result.status, equals(WorkspaceSwitchStatus.authenticated));
      expect(result.isAuthenticated, isTrue);
      expect(notifier.state.hasActiveSession, isTrue);
      expect(notifier.state.activeWorkspace?.tenantKey, equals('paulc'));
      expect(notifier.state.activeWorkspace?.userEmail, equals('lead@paulc.com'));
      expect(storage.getActiveTenantKey(), equals('paulc'));
    });

    test('Switch to workspace with expired JWT token safely redirects to login', () async {
      final expiredJwt = _generateMockJwt(expired: true);

      final notifier = WorkspaceNotifier(storage, repository);

      final targetWorkspace = Workspace(
        tenantKey: 'expired-org',
        organizationName: 'Expired Org',
        primaryDomain: 'expired.ozikol.cloud',
        authToken: expiredJwt,
        lastAccessed: DateTime.now(),
      );

      await storage.saveWorkspace(targetWorkspace);

      final result = await notifier.verifyAndSwitchWorkspace(targetWorkspace);

      expect(result.status, equals(WorkspaceSwitchStatus.requiresLogin));
      expect(result.isAuthenticated, isFalse);
      expect(notifier.state.hasActiveSession, isFalse);
      expect(notifier.state.pendingWorkspace?.tenantKey, equals('expired-org'));
    });

    testWidgets('WorkspaceSwitchConfirmDialog renders question and action buttons', (tester) async {
      final targetWs = Workspace(
        tenantKey: 'mb-co',
        organizationName: 'MB Company',
        primaryDomain: 'mb-co.ozikol.cloud',
        lastAccessed: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => ElevatedButton(
                  onPressed: () => showWorkspaceSwitchDialog(context, targetWs),
                  child: const Text('Open Switch Dialog'),
                ),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Switch Dialog'));
      await tester.pumpAndSettle();

      expect(find.text('Switch Workspace'), findsOneWidget);
      expect(find.byType(RichText), findsWidgets);
      expect(find.text('Cancel'), findsOneWidget);
      expect(find.text('Yes, Switch'), findsOneWidget);
    });
  });
}
