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

    test('DashboardMetrics.empty() provides strict zero dummy telemetry', () {
      final empty = DashboardMetrics.empty();

      expect(empty.totalMembers, 0);
      expect(empty.totalPublishedPages, 0);
      expect(empty.recentUsers.length, 0);
      expect(empty.recentActivities.length, 0);
    });

    testWidgets('DashboardShellScreen renders Member Management & Directory Hub and Metric Cards',
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

      // 1. Verify Page Header
      expect(find.text('Member Management & Directory Hub'), findsOneWidget);
      expect(find.text('Directory Register'), findsOneWidget);
      expect(find.text('Add Member'), findsOneWidget);

      // 2. Verify Metric Cards
      expect(find.text('TOTAL MEMBERS'), findsOneWidget);
      expect(find.text('ACTIVE ACCOUNTS'), findsOneWidget);
      expect(find.text('SUSPICIOUS / FLAGGED'), findsOneWidget);
      expect(find.text('SUSPENDED'), findsOneWidget);

      // 3. Verify Floating AI Assistant button
      expect(find.text('AI Assistant'), findsOneWidget);
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

      // 1. Initially expanded: 'User Directory' is visible, single top-bar minimize button is present
      expect(find.text('User Directory'), findsOneWidget);
      expect(find.byTooltip('Minimize sidebar'), findsOneWidget);

      // 2. Click 'Minimize sidebar' from the top bar
      await tester.tap(find.byTooltip('Minimize sidebar'));
      await tester.pumpAndSettle();

      // 3. Sidebar is now collapsed into icon rail:
      // 'User Directory' text is removed from view, and 'Maximize sidebar' appears in the top bar
      expect(find.text('User Directory'), findsNothing);
      expect(find.byTooltip('Maximize sidebar'), findsOneWidget);

      // 4. Click 'Maximize sidebar'
      await tester.tap(find.byTooltip('Maximize sidebar'));
      await tester.pumpAndSettle();

      // 5. Sidebar is restored back to expanded mode
      expect(find.text('User Directory'), findsOneWidget);
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

    testWidgets('DashboardShellScreen renders Powered by Ozikol, Online notice, and functional top bar dialogs', (tester) async {
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

      // 1. Verify "Powered by Ozikol" in the sidebar footer
      expect(find.text('Powered by Ozikol'), findsOneWidget);

      // 2. Verify Online status notice in top bar
      expect(find.text('Online'), findsOneWidget);

      // 3. Tap Calendar icon to open Calendar dialog
      await tester.tap(find.byIcon(Icons.calendar_today_outlined));
      await tester.pumpAndSettle();
      expect(find.text('Calendar & Schedules'), findsOneWidget);
      expect(find.text('Daily Telemetry & Membership Sync'), findsOneWidget);

      // Close Calendar dialog
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();

      // 4. Tap Help icon to open Help & Knowledge Base dialog
      await tester.tap(find.byIcon(Icons.help_outline_rounded).first);
      await tester.pumpAndSettle();
      expect(find.text('Help & Knowledge Base'), findsOneWidget);

      // Close Help dialog
      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();

      // 5. Tap User Profile Pill to open Account & Workspace Profile dialog
      await tester.tap(find.text('Member'));
      await tester.pumpAndSettle();
      expect(find.text('Active Workspace'), findsWidgets);
      expect(find.text('Primary Domain'), findsOneWidget);

      // Close Profile dialog
      await tester.tap(find.byIcon(Icons.close_rounded));
      await tester.pumpAndSettle();

      // 6. Tap Top Bar Refresh button
      expect(find.byTooltip('Refresh Workspace & Telemetry'), findsWidgets);
      await tester.tap(find.byTooltip('Refresh Workspace & Telemetry').first);
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 700));
    });
  });
}
