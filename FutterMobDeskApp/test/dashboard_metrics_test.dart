import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ozikol_app/core/widgets/app_drawer.dart';
import 'package:ozikol_app/features/dashboard/models/dashboard_metrics.dart';
import 'package:ozikol_app/features/dashboard/presentation/dashboard_shell_screen.dart';

void main() {
  group('DashboardMetrics & Console Dashboard Parity Tests', () {
    test('DashboardMetrics deserializes JSON from /api/DashboardApi/metrics cleanly', () {
      final json = {
        'resolvedDomain': 'mb-cocacola.localhost:4200',
        'resolvedDatabase': 'cocacola_db',
        'totalMembers': 1,
        'totalActiveMembers': 1,
        'totalGroups': 0,
        'totalPublishedPages': 18,
        'totalSliders': 0,
        'totalFaqs': 0,
        'recentUsers': [
          {
            'id': 'user-1',
            'fullName': 'Onwuka Peter',
            'email': 'admin@gmail.com',
            'category': 'Member',
          }
        ],
        'recentActivities': [
          {
            'action': 'LOGIN',
            'user': 'Onwuka Peter',
            'details': 'User signed in to workspace command center',
            'timestamp': '2026-10-15T18:00:00Z',
          }
        ],
      };

      final metrics = DashboardMetrics.fromJson(json);

      expect(metrics.totalMembers, 1);
      expect(metrics.totalPublishedPages, 18);
      expect(metrics.totalGroups, 0);
      expect(metrics.recentUsers.length, 1);
      expect(metrics.recentUsers.first.fullName, 'Onwuka Peter');
      expect(metrics.recentUsers.first.email, 'admin@gmail.com');
      expect(metrics.recentActivities.length, 1);
      expect(metrics.recentActivities.first.action, 'LOGIN');
    });

    test('DashboardMetrics.sample() provides canonical fallback telemetry', () {
      final sample = DashboardMetrics.sample();

      expect(sample.totalMembers, 1);
      expect(sample.totalPublishedPages, 18);
      expect(sample.recentUsers.length, 1);
      expect(sample.recentUsers.first.fullName, 'Onwuka Peter');
      expect(sample.recentUsers.first.email, 'admin@gmail.com');
    });

    testWidgets('DashboardShellScreen renders Console Dashboard, 6 Health Counters, and Quick Actions',
        (tester) async {
      tester.view.physicalSize = const Size(1440, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: DashboardShellScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 1. Verify Command Header (appears in sidebar and command strip header)
      expect(find.text('Console Dashboard'), findsNWidgets(2));
      expect(find.text('Refresh Telemetry'), findsOneWidget);
      expect(find.text('New Web Page'), findsOneWidget);

      // 2. Verify Core Performance & Health Counters Header & Pill
      expect(find.text('Core Performance & Health Counters'), findsOneWidget);
      expect(find.text('All Services Operational'), findsOneWidget);

      // 3. Verify Metric Cards
      expect(find.text('TOTAL MEMBERS'), findsOneWidget);
      expect(find.text('GROUP CHANNELS'), findsOneWidget);
      expect(find.text('PUBLISHED PAGES'), findsOneWidget);
      expect(find.text('HERO SLIDERS'), findsOneWidget);
      expect(find.text('ACTIVE FAQS'), findsOneWidget);
      expect(find.text('PLATFORM ROLES'), findsOneWidget);

      // 4. Verify Recently Registered Members Widget
      expect(find.text('Recently Registered Members'), findsOneWidget);
      expect(find.text('View Directory →'), findsOneWidget);

      // 5. Verify Quick Actions & Shortcuts
      expect(find.text('Quick Actions & Shortcuts'), findsOneWidget);
      expect(find.text('Create Dynamic Web Page'), findsOneWidget);
      expect(find.text('Register New Member'), findsOneWidget);
      expect(find.text('Create Group Channel'), findsOneWidget);
      expect(find.text('Brand & Theme Customizer'), findsOneWidget);

      // 6. Verify Recent Activity & Audit Trail
      expect(find.text('Recent Activity & Audit Trail'), findsOneWidget);
      expect(find.text('Telemetry Log'), findsOneWidget);

      // 7. Verify Floating Ozi AI button
      expect(find.text('Ozi AI'), findsOneWidget);
    });

    testWidgets('DashboardShellScreen minimizes and maximizes sidebar via toggle buttons', (tester) async {
      tester.view.physicalSize = const Size(1440, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: DashboardShellScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 1. Initially expanded: 'Workspace Vault' is visible, single top-bar minimize button is present
      expect(find.text('Workspace Vault'), findsOneWidget);
      expect(find.byTooltip('Minimize sidebar'), findsOneWidget);

      // 2. Click 'Minimize sidebar' from the top bar
      await tester.tap(find.byTooltip('Minimize sidebar'));
      await tester.pumpAndSettle();

      // 3. Sidebar is now collapsed into icon rail:
      // 'Workspace Vault' is removed from view, and 'Maximize sidebar' appears in the top bar
      expect(find.text('Workspace Vault'), findsNothing);
      expect(find.byTooltip('Maximize sidebar'), findsOneWidget);

      // 4. Click 'Maximize sidebar'
      await tester.tap(find.byTooltip('Maximize sidebar'));
      await tester.pumpAndSettle();

      // 5. Sidebar is restored back to expanded mode
      expect(find.text('Workspace Vault'), findsOneWidget);
      expect(find.byTooltip('Minimize sidebar'), findsOneWidget);
    });

    testWidgets('AppDrawer renders expanded mode with section titles and collapsed rail mode with centered icons', (tester) async {
      bool tapped = false;

      final sections = [
        AppDrawerSection(
          title: 'COMMAND CENTER',
          items: [
            AppDrawerItem(
              icon: Icons.dashboard_rounded,
              title: 'Console Dashboard',
              isSelected: true,
              onTap: () => tapped = true,
            ),
          ],
        ),
      ];

      // Test expanded mode
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppDrawer(
              isPermanentSidebar: true,
              isCollapsed: false,
              sections: sections,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('COMMAND CENTER'), findsOneWidget);
      expect(find.text('Console Dashboard'), findsOneWidget);

      // Test collapsed mode
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppDrawer(
              isPermanentSidebar: true,
              isCollapsed: true,
              sections: sections,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // In collapsed mode, section text is hidden, icon is present with tooltip
      expect(find.text('COMMAND CENTER'), findsNothing);
      expect(find.byIcon(Icons.dashboard_rounded), findsOneWidget);

      // Tap item in collapsed mode
      await tester.tap(find.byIcon(Icons.dashboard_rounded));
      expect(tapped, isTrue);
    });
  });
}
