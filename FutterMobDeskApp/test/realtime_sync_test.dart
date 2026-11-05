import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ozikol_app/core/models/workspace.dart';
import 'package:ozikol_app/core/network/api_client.dart';
import 'package:ozikol_app/core/services/realtime_sync_service.dart';
import 'package:ozikol_app/core/storage/secure_storage_service.dart';
import 'package:ozikol_app/features/workspace_auth/data/workspace_repository.dart';
import 'package:ozikol_app/features/workspace_auth/state/workspace_state.dart';

import 'package:flutter/services.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (MethodCall methodCall) async => '.',
    );
  });

  group('RealtimeSyncService & Live Push Synchronization Tests', () {
    test('RealtimeConnectionStatus enum defines canonical connection lifecycle states', () {
      expect(RealtimeConnectionStatus.values, [
        RealtimeConnectionStatus.disconnected,
        RealtimeConnectionStatus.connecting,
        RealtimeConnectionStatus.connected,
        RealtimeConnectionStatus.reconnecting,
      ]);
    });

    test('WorkspaceNotifier.applyLiveBranding updates active workspace in real time and evicts caches', () async {
      final storage = SecureStorageService.inMemory();
      final initialWorkspace = Workspace(
        tenantKey: 'acme-corp',
        organizationName: 'Acme Corporation',
        primaryDomain: 'acme-corp.localhost:4200',
        logoUrl: 'https://cdn.ozikol.cloud/old-logo.png',
        iconUrl: 'https://cdn.ozikol.cloud/old-icon.png',
        lastAccessed: DateTime.now(),
        isActive: true,
      );

      await storage.saveWorkspace(initialWorkspace);
      await storage.setActiveTenantKey('acme-corp');

      final client = ApiClient(storage);
      final repo = WorkspaceRepository(client);
      final notifier = WorkspaceNotifier(storage, repo);

      await notifier.init();

      expect(notifier.state.activeWorkspace, isNotNull);
      expect(notifier.state.activeWorkspace!.organizationName, 'Acme Corporation');
      expect(notifier.state.activeWorkspace!.logoUrl, 'https://cdn.ozikol.cloud/old-logo.png');
      expect(notifier.state.activeWorkspace!.iconUrl, 'https://cdn.ozikol.cloud/old-icon.png');

      // 1. Simulate incoming SignalR TenantBrandUpdated push event
      await notifier.applyLiveBranding(
        tenantKey: 'acme-corp',
        companyName: 'Acme Global Command Center',
        companyLogoUrl: 'https://cdn.ozikol.cloud/new-logo-v2.png',
        companyIconUrl: 'https://cdn.ozikol.cloud/new-icon-v2.png',
      );

      // Verify active workspace received immediate live mutations
      final updated = notifier.state.activeWorkspace!;
      expect(updated.organizationName, 'Acme Global Command Center');
      expect(updated.logoUrl, 'https://cdn.ozikol.cloud/new-logo-v2.png');
      expect(updated.iconUrl, 'https://cdn.ozikol.cloud/new-icon-v2.png');
      expect(updated.avatarUrl, 'https://cdn.ozikol.cloud/new-icon-v2.png');

      // Verify enrolled workspaces list was also synchronized
      final enrolled = notifier.state.enrolledWorkspaces.firstWhere((w) => w.tenantKey == 'acme-corp');
      expect(enrolled.organizationName, 'Acme Global Command Center');
      expect(enrolled.logoUrl, 'https://cdn.ozikol.cloud/new-logo-v2.png');
      expect(enrolled.iconUrl, 'https://cdn.ozikol.cloud/new-icon-v2.png');

      // Verify persistent storage was updated
      final persisted = await storage.getActiveWorkspace();
      expect(persisted, isNotNull);
      expect(persisted!.organizationName, 'Acme Global Command Center');
      expect(persisted.logoUrl, 'https://cdn.ozikol.cloud/new-logo-v2.png');
      expect(persisted.iconUrl, 'https://cdn.ozikol.cloud/new-icon-v2.png');
    });

    test('WorkspaceNotifier.applyLiveBranding matches tenant keys case-insensitively', () async {
      final storage = SecureStorageService.inMemory();
      final ws = Workspace(
        tenantKey: 'my-business-hub',
        organizationName: 'Old Business Name',
        primaryDomain: 'my-business-hub.localhost:4200',
        lastAccessed: DateTime.now(),
      );

      await storage.saveWorkspace(ws);
      await storage.setActiveTenantKey('my-business-hub');

      final client = ApiClient(storage);
      final repo = WorkspaceRepository(client);
      final notifier = WorkspaceNotifier(storage, repo);

      await notifier.init();

      // Dispatch with uppercase tenant key
      await notifier.applyLiveBranding(
        tenantKey: 'MY-BUSINESS-HUB',
        companyName: 'New Enterprise Title',
      );

      expect(notifier.state.activeWorkspace!.organizationName, 'New Enterprise Title');
    });

    test('WorkspaceNotifier.applyLiveBranding ignores pushes for unselected tenants', () async {
      final storage = SecureStorageService.inMemory();
      final ws = Workspace(
        tenantKey: 'selected-tenant',
        organizationName: 'Selected Org',
        primaryDomain: 'selected-tenant.localhost:4200',
        lastAccessed: DateTime.now(),
      );

      await storage.saveWorkspace(ws);
      await storage.setActiveTenantKey('selected-tenant');

      final client = ApiClient(storage);
      final repo = WorkspaceRepository(client);
      final notifier = WorkspaceNotifier(storage, repo);

      await notifier.init();

      // Push for a completely different tenant
      await notifier.applyLiveBranding(
        tenantKey: 'unrelated-tenant-key',
        companyName: 'Unrelated Org Name',
      );

      expect(notifier.state.activeWorkspace!.organizationName, 'Selected Org');
    });

    test('RealtimeSyncService provider instantiates cleanly with default disconnected status', () {
      final container = ProviderContainer(
        overrides: [
          storageServiceProvider.overrideWithValue(SecureStorageService.inMemory()),
        ],
      );

      final service = container.read(realtimeSyncServiceProvider);
      expect(service.status, RealtimeConnectionStatus.disconnected);
      expect(service.statusListenable.value, RealtimeConnectionStatus.disconnected);
      expect(service.activeTenantKey, isNull);

      container.dispose();
    });
  });
}
