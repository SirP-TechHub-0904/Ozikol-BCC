import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/core/storage/secure_storage_service.dart';
import 'package:ozikol_app/core/storage/tenant_cache_service.dart';
import 'package:ozikol_app/core/theme/app_theme.dart';
import 'package:ozikol_app/core/widgets/offline_status_bar.dart';
import 'package:ozikol_app/features/notifications/domain/notification_model.dart';
import 'package:ozikol_app/features/notifications/presentation/notifications_sheet.dart';
import 'package:ozikol_app/features/workspace_auth/presentation/workspace_entry_screen.dart';

void main() {
  testWidgets('WorkspaceEntryScreen renders branding, placeholder, and validates input', (WidgetTester tester) async {
    // 1. Render the WorkspaceEntryScreen inside a test MaterialApp
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const WorkspaceEntryScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // 2. Verify "Enter Workspace" title and subtitle exist
    expect(find.text('Enter Workspace'), findsOneWidget);
    expect(find.text('Domain or Access Code'), findsOneWidget);
    expect(find.text('e.g. acmecorp or acme.ozikol.cloud'), findsOneWidget);

    // 3. Verify Continue button exists
    final continueButton = find.widgetWithText(ElevatedButton, 'Continue');
    expect(continueButton, findsOneWidget);

    // 4. Tap Continue with empty input and verify validation error appears
    await tester.tap(continueButton);
    await tester.pumpAndSettle();
    expect(find.text('Please enter your organization code or domain.'), findsOneWidget);

    // 5. Enter a company access code and verify text is updated
    final inputFinder = find.byType(TextFormField);
    expect(inputFinder, findsOneWidget);
    await tester.enterText(inputFinder, 'acmecorp');
    await tester.pumpAndSettle();
    expect(find.text('acmecorp'), findsOneWidget);
  });

  test('NotificationSeverity maps all 6 standard canonical severities and tokens correctly', () {
    // 1. Error
    expect(NotificationSeverity.fromString('Error'), NotificationSeverity.error);
    expect(NotificationSeverity.fromCode(1), NotificationSeverity.error);
    expect(NotificationSeverity.error.color, const Color(0xFFF06548));

    // 2. Failed
    expect(NotificationSeverity.fromString('Failed'), NotificationSeverity.failed);
    expect(NotificationSeverity.fromCode(2), NotificationSeverity.failed);
    expect(NotificationSeverity.failed.color, const Color(0xFFF7B84B));

    // 3. Success
    expect(NotificationSeverity.fromString('Success'), NotificationSeverity.success);
    expect(NotificationSeverity.fromCode(3), NotificationSeverity.success);
    expect(NotificationSeverity.success.color, const Color(0xFF0AB39C));

    // 4. New Feature
    expect(NotificationSeverity.fromString('NewFeature'), NotificationSeverity.newFeature);
    expect(NotificationSeverity.fromCode(4), NotificationSeverity.newFeature);
    expect(NotificationSeverity.newFeature.color, const Color(0xFF38BDF8));

    // 5. Update
    expect(NotificationSeverity.fromString('Update'), NotificationSeverity.update);
    expect(NotificationSeverity.fromCode(5), NotificationSeverity.update);
    expect(NotificationSeverity.update.color, const Color(0xFF1F6BFF));

    // 6. Maintenance
    expect(NotificationSeverity.fromString('Maintenance'), NotificationSeverity.maintenance);
    expect(NotificationSeverity.fromCode(6), NotificationSeverity.maintenance);
    expect(NotificationSeverity.maintenance.color, const Color(0xFF9333EA));
  });

  testWidgets('NotificationsSheet renders header, severity filters, and notification cards', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const Scaffold(
            body: NotificationsSheet(),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify Title and Filter Chips
    expect(find.text('Notifications'), findsOneWidget);
    expect(find.textContaining('All ('), findsOneWidget);
    expect(find.textContaining('Unread ('), findsOneWidget);
    expect(find.textContaining('Error ('), findsOneWidget);
    expect(find.textContaining('Success ('), findsOneWidget);
    expect(find.textContaining('Maintenance ('), findsOneWidget);

    // Verify Sample Notification Cards Rendered
    expect(find.text('Payment Gateway Synchronized'), findsOneWidget);
    expect(find.text('Bio Link Tree Module Released'), findsOneWidget);
    expect(find.text('Scheduled Cloud Maintenance'), findsOneWidget);
  });

  test('TenantCacheService enforces strict multi-tenant partition isolation and stale retrieval', () async {
    final storage = SecureStorageService.inMemory();
    final cache = TenantCacheService.inMemory(storage);

    // 1. Put data for tenant_acme
    await cache.put('profile', {'org': 'Acme Corporation'}, tenantKey: 'acme');

    // 2. Put data for tenant_globex
    await cache.put('profile', {'org': 'Globex Industries'}, tenantKey: 'globex');

    // 3. Verify strict isolation: acme cannot read globex and vice-versa
    final acmeData = cache.get<Map<String, dynamic>>('profile', tenantKey: 'acme');
    final globexData = cache.get<Map<String, dynamic>>('profile', tenantKey: 'globex');

    expect(acmeData?['org'], 'Acme Corporation');
    expect(globexData?['org'], 'Globex Industries');

    // 4. Test TTL and stale-while-revalidate
    await cache.put('temp_key', 'fresh_value', tenantKey: 'acme', ttl: const Duration(milliseconds: 10));
    await Future.delayed(const Duration(milliseconds: 20));

    // Normal get returns null because expired
    expect(cache.get<String>('temp_key', tenantKey: 'acme'), isNull);
    // Stale-while-revalidate returns expired value
    expect(cache.get<String>('temp_key', tenantKey: 'acme', allowStale: true), 'fresh_value');

    // 5. Test clearTenant wipes only acme data, preserving globex data
    await cache.clearTenant('acme');
    expect(cache.get<Map<String, dynamic>>('profile', tenantKey: 'acme', allowStale: true), isNull);
    expect(cache.get<Map<String, dynamic>>('profile', tenantKey: 'globex'), isNotNull);
  });

  testWidgets('OfflineStatusBar renders alert and retry button when offline', (WidgetTester tester) async {
    bool retryTriggered = false;

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          home: Scaffold(
            body: OfflineStatusBar(
              forceOffline: true,
              onRetry: () => retryTriggered = true,
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify offline text and icon
    expect(find.text('You are offline. Showing cached workspace data.'), findsOneWidget);
    expect(find.byIcon(Icons.wifi_off_rounded), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);

    // Tap retry
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(retryTriggered, isTrue);
  });

  testWidgets('OfflineStatusBar renders nothing when online', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: Scaffold(
            body: OfflineStatusBar(
              forceOffline: false,
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();
    expect(find.text('You are offline. Showing cached workspace data.'), findsNothing);
  });
}
