import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/core/storage/secure_storage_service.dart';
import 'package:ozikol_app/core/storage/tenant_cache_service.dart';
import 'package:ozikol_app/core/theme/app_theme.dart';
import 'package:ozikol_app/core/models/app_update_info.dart';
import 'package:ozikol_app/core/theme/theme_provider.dart';
import 'package:ozikol_app/core/widgets/contextual_info_button.dart';
import 'package:ozikol_app/core/widgets/offline_status_bar.dart';
import 'package:ozikol_app/core/widgets/theme_mode_switcher.dart';
import 'package:ozikol_app/core/widgets/update_banner.dart';
import 'package:flutter/services.dart';
import 'package:ozikol_app/core/widgets/custom_text_field.dart';
import 'package:ozikol_app/core/models/workspace.dart';
import 'package:ozikol_app/core/network/api_client.dart';
import 'package:ozikol_app/features/notifications/domain/notification_model.dart';
import 'package:ozikol_app/features/notifications/presentation/notifications_sheet.dart';
import 'package:ozikol_app/features/workspace_auth/data/workspace_repository.dart';
import 'package:ozikol_app/features/workspace_auth/presentation/workspace_entry_screen.dart';
import 'package:ozikol_app/features/workspace_auth/state/workspace_state.dart';

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
    expect(find.text('Organization Code'), findsWidgets);

    // 3. Verify Continue button exists
    final continueButton = find.text('Continue');
    expect(continueButton, findsOneWidget);

    // 4. Tap Continue with empty input and verify validation error appears
    await tester.tap(continueButton);
    await tester.pumpAndSettle();
    expect(find.text('Please enter your organization code.'), findsOneWidget);

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

  test('ThemeModeNotifier updates state, toggles, and persists preferences to SecureStorageService', () async {
    final storage = SecureStorageService.inMemory();
    final notifier = ThemeModeNotifier(storage);

    // Initial state is system default
    expect(notifier.state, ThemeMode.system);

    // Set to dark mode
    await notifier.setThemeMode(ThemeMode.dark);
    expect(notifier.state, ThemeMode.dark);
    expect(storage.getThemeMode(), 'dark');

    // Set to light mode
    await notifier.setThemeMode(ThemeMode.light);
    expect(notifier.state, ThemeMode.light);
    expect(storage.getThemeMode(), 'light');

    // Create fresh notifier to test persisted load
    final restoredNotifier = ThemeModeNotifier(storage);
    expect(restoredNotifier.state, ThemeMode.light);
  });

  testWidgets('ThemeModeSwitcher renders segmented controls and updates theme mode upon selection', (WidgetTester tester) async {
    final storage = SecureStorageService.inMemory();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          storageServiceProvider.overrideWithValue(storage),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: ThemeModeSwitcher(),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify all 3 mode tooltips/icons exist
    expect(find.byTooltip('Light Mode'), findsOneWidget);
    expect(find.byTooltip('System Default'), findsOneWidget);
    expect(find.byTooltip('Dark Mode'), findsOneWidget);

    // Tap dark mode
    await tester.tap(find.byTooltip('Dark Mode'));
    await tester.pumpAndSettle();
    expect(storage.getThemeMode(), 'dark');

    // Tap light mode
    await tester.tap(find.byTooltip('Light Mode'));
    await tester.pumpAndSettle();
    expect(storage.getThemeMode(), 'light');
  });

  test('AppUpdateInfo serialization and deserialization preserves all metadata fields', () {
    final original = AppUpdateInfo(
      hasUpdate: true,
      isMandatory: false,
      latestVersion: '1.2.0',
      latestBuildNumber: 42,
      minSupportedVersion: '1.0.0',
      releaseNotes: '• Major update\n• New feature set',
      downloadUrl: 'https://releases.ozikol.cloud/Ozikol-Setup-1.2.0.exe',
      sha256Checksum: 'abcdef123456',
      fileSizeBytes: 52428800,
      publishedAtUtc: DateTime.utc(2026, 10, 15),
      platform: 'windows',
      channel: 'stable',
    );

    final json = original.toJson();
    final parsed = AppUpdateInfo.fromJson(json);

    expect(parsed.hasUpdate, isTrue);
    expect(parsed.isMandatory, isFalse);
    expect(parsed.latestVersion, '1.2.0');
    expect(parsed.latestBuildNumber, 42);
    expect(parsed.minSupportedVersion, '1.0.0');
    expect(parsed.downloadUrl, 'https://releases.ozikol.cloud/Ozikol-Setup-1.2.0.exe');
    expect(parsed.fileSizeBytes, 52428800);
    expect(parsed.platform, 'windows');
    expect(parsed.channel, 'stable');
  });

  testWidgets('UpdateBanner renders release version and opens UpdateDialog on click', (WidgetTester tester) async {
    const info = AppUpdateInfo(
      hasUpdate: true,
      isMandatory: false,
      latestVersion: '1.1.0',
      latestBuildNumber: 26,
      minSupportedVersion: '1.0.0',
      releaseNotes: '• Multi-tenant updates\n• Security patches',
      downloadUrl: 'https://releases.ozikol.cloud/setup.exe',
      sha256Checksum: '',
      fileSizeBytes: 48000000,
      platform: 'windows',
      channel: 'stable',
    );

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: Scaffold(
            body: UpdateBanner(updateInfo: info),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify banner content
    expect(find.text('Ozikol BCC v1.1.0 is available.'), findsOneWidget);
    expect(find.text('Update Now'), findsOneWidget);

    // Tap Update Now to open dialog
    await tester.tap(find.text('Update Now'));
    await tester.pumpAndSettle();

    // Verify dialog content
    expect(find.text('Update Ready: v1.1.0'), findsOneWidget);
    expect(find.text('Release Notes:'), findsOneWidget);
    expect(find.text('Update & Restart'), findsOneWidget);
    expect(find.text('Later'), findsOneWidget);
  });

  testWidgets('ContextualInfoButton renders info icon and opens 4-pillar guidance', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ContextualInfoButton(
            title: 'Workspace Metrics & Operations',
            purpose: 'Summarizes key operational telemetry and active tenant health.',
            expectedInputs: 'Automated live feed aggregated across financial records.',
            impact: 'Reflects real-time transactional performance.',
            bestPractices: 'Review feature subscriptions weekly.',
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify info icon
    expect(find.byIcon(Icons.info_outline_rounded), findsOneWidget);

    // Tap info icon
    await tester.tap(find.byIcon(Icons.info_outline_rounded));
    await tester.pumpAndSettle();

    // Verify 4-pillar sections
    expect(find.text('Workspace Metrics & Operations'), findsOneWidget);
    expect(find.text('Purpose & Overview'), findsOneWidget);
    expect(find.text('Guidelines & Formats'), findsOneWidget);
    expect(find.text('Business Impact'), findsOneWidget);
    expect(find.text('Best Practices'), findsOneWidget);
  });

  testWidgets('CustomTextField supports paste from clipboard and clear actions', (WidgetTester tester) async {
    String clipboardStore = 'rozzy-touchxcx.localhost:4200';
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, (MethodCall methodCall) async {
      if (methodCall.method == 'Clipboard.getData') {
        return <String, dynamic>{'text': clipboardStore};
      }
      if (methodCall.method == 'Clipboard.setData') {
        clipboardStore = methodCall.arguments['text'] as String;
        return null;
      }
      return null;
    });

    final controller = TextEditingController();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CustomTextField(
            controller: controller,
            label: 'Access Code or URL',
            placeholder: 'Access Code or URL',
            showPasteButton: true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. When empty, paste button is visible
    expect(find.byIcon(Icons.content_paste_rounded), findsOneWidget);

    // 2. Tap paste button
    await tester.tap(find.byIcon(Icons.content_paste_rounded));
    await tester.pumpAndSettle();

    // 3. Controller should now contain the pasted text
    expect(controller.text, 'rozzy-touchxcx.localhost:4200');

    // 4. Clear button should now be visible
    expect(find.byIcon(Icons.close_rounded), findsOneWidget);

    // 5. Tap clear button
    await tester.tap(find.byIcon(Icons.close_rounded));
    await tester.pumpAndSettle();

    // 6. Text is cleared
    expect(controller.text, '');
  });

  testWidgets('WorkspaceEntryScreen renders Remember this organization checkbox and toggles', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const WorkspaceEntryScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify checkbox and label exist
    expect(find.text('Remember this organization in future'), findsWidgets);
    final checkboxFinder = find.byType(Checkbox);
    expect(checkboxFinder, findsWidgets);

    // Initial value is checked
    Checkbox checkbox = tester.widget(checkboxFinder.first);
    expect(checkbox.value, isTrue);

    // Tap checkbox to toggle
    await tester.tap(checkboxFinder.first);
    await tester.pumpAndSettle();

    checkbox = tester.widget(checkboxFinder.first);
    expect(checkbox.value, isFalse);
  });

  test('WorkspaceNotifier bypasses entry screen when organization is remembered', () async {
    final storage = SecureStorageService.inMemory();
    await storage.setRememberOrganizationEnabled(true);
    await storage.setRememberedOrganizationCode('acme-globalbn');
    await storage.saveRememberedWorkspace(
      Workspace(
        tenantKey: 'acme-globalbn',
        organizationName: 'Acme Global',
        primaryDomain: 'acme-globalbn.localhost:4200',
        lastAccessed: DateTime(2026, 1, 1),
      ),
    );

    final client = ApiClient(storage);
    final repo = WorkspaceRepository(client);
    final notifier = WorkspaceNotifier(storage, repo);

    await notifier.init();

    // Verify bypass is enabled and pending workspace points to remembered organization
    expect(notifier.state.shouldBypassEntryScreen, isTrue);
    expect(notifier.state.pendingWorkspace?.tenantKey, 'acme-globalbn');

    // Verify cancelBypass resets the state to entry screen
    notifier.cancelBypass();
    expect(notifier.state.shouldBypassEntryScreen, isFalse);
    expect(notifier.state.pendingWorkspace, isNull);
  });

  test('WorkspaceNotifier signOutSession retains workspace enrollment and targets WorkspaceLoginScreen', () async {
    final storage = SecureStorageService.inMemory();
    final workspace = Workspace(
      tenantKey: 'paulc',
      organizationName: 'Paul Corp',
      primaryDomain: 'paulc.localhost:4200',
      authToken: 'sample-jwt-token',
      lastAccessed: DateTime(2026, 1, 1),
    );
    await storage.saveWorkspace(workspace);
    await storage.setActiveTenantKey('paulc');

    final client = ApiClient(storage);
    final repo = WorkspaceRepository(client);
    final notifier = WorkspaceNotifier(storage, repo);

    await notifier.init();
    expect(notifier.state.hasActiveSession, isTrue);

    // Call signOutSession
    await notifier.signOutSession('paulc');

    // Active session is ended, but workspace enrollment is preserved and set as pending for login
    expect(notifier.state.hasActiveSession, isFalse);
    expect(notifier.state.pendingWorkspace?.tenantKey, 'paulc');
    expect(notifier.state.shouldBypassEntryScreen, isTrue);

    // Verify token was wiped from secure storage
    final activeFromStorage = await storage.getActiveWorkspace();
    expect(activeFromStorage?.authToken, isNull);
  });
}

