import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/core/models/workspace.dart';
import 'package:ozikol_app/core/widgets/desktop_auth_layout.dart';
import 'package:ozikol_app/features/dashboard/data/account_repository.dart';
import 'package:ozikol_app/features/dashboard/presentation/screens/user_directory/auth_page_setup_view.dart';
import 'package:ozikol_app/features/workspace_auth/data/workspace_repository.dart';

/// Fake AccountRepository for testing auth page setup studio without live backend.
class FakeAuthSetupAccountRepository extends Fake implements AccountRepository {
  Map<String, dynamic> brand = {
    'loginLayout': 'centered',
    'loginBackgroundImageUrl': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80',
    'loginTitle': 'Welcome back',
    'loginSubtitle': 'Enter your credentials to continue',
    'loginNoteTitle': 'ENTERPRISE ACCESS',
    'loginComplianceNotice': 'Protected by enterprise encryption',
    'loginButtonText': 'Sign In',
    'allowPublicRegistration': true,
    'showRegisterLinkOnLogin': true,
    'useWhiteLogoInLogin': false,
  };

  @override
  Future<Map<String, dynamic>?> getTenantBrand() async => Map.from(brand);

  @override
  Future<bool> updateTenantBrand(Map<String, dynamic> data) async {
    brand.addAll(data);
    return true;
  }

  @override
  Future<Map<String, dynamic>?> uploadAsset({
    required List<int> fileBytes,
    required String fileName,
    String assetType = 'bg',
    String folder = 'brand-assets',
  }) async {
    return {
      'url': 'https://res.cloudinary.com/fake-cloud/image/upload/custom-bg.jpg',
      'publicId': 'custom-bg',
    };
  }
}

void main() {
  final testWorkspace = Workspace(
    tenantKey: 'demo-tenant',
    organizationName: 'Acme Test Corp',
    primaryDomain: 'demo.localhost:4200',
    lastAccessed: DateTime.now(),
  );

  group('DesktopAuthLayout Tests', () {
    testWidgets('renders Centered Glass Card layout when loginLayout is centered', (tester) async {
      tester.view.physicalSize = const Size(1400, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            tenantBrandingProvider('demo-tenant').overrideWith(
              (ref) async => const TenantBranding(
                isResolved: true,
                loginLayout: 'centered',
                organizationName: 'Acme Test Corp',
              ),
            ),
          ],
          child: MaterialApp(
            home: DesktopAuthLayout(
              workspace: testWorkspace,
              title: 'Test Sign In',
              subtitle: 'Please sign in',
              child: Text('Form Fields Here'),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Test Sign In'), findsOneWidget);
      expect(find.text('Please sign in'), findsOneWidget);
      expect(find.text('Form Fields Here'), findsOneWidget);
      expect(find.byTooltip('Back'), findsOneWidget);
    });

    testWidgets('renders Split Screen Showcase layout when loginLayout is split on large viewport', (tester) async {
      tester.view.physicalSize = const Size(1400, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            tenantBrandingProvider('demo-tenant').overrideWith(
              (ref) async => const TenantBranding(
                isResolved: true,
                loginLayout: 'split',
                loginNoteTitle: 'ENTERPRISE SUITE',
                loginTitle: 'Welcome to Enterprise BCC',
                loginSubtitle: 'Unified identity and business command suite.',
                organizationName: 'Acme Test Corp',
              ),
            ),
          ],
          child: MaterialApp(
            home: DesktopAuthLayout(
              workspace: testWorkspace,
              title: 'Sign In Credentials',
              child: Text('Credentials Content'),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('ENTERPRISE SUITE'), findsOneWidget);
      expect(find.text('Welcome to Enterprise BCC'), findsOneWidget);
      expect(find.text('Powered by Business Command Center'), findsOneWidget);
      expect(find.text('Credentials Content'), findsOneWidget);
      expect(find.byTooltip('Back'), findsOneWidget);
    });
  });

  group('AuthPageSetupView Tests', () {
    testWidgets('renders setup studio with layout architecture, wallpaper presets, and preview', (tester) async {
      tester.view.physicalSize = const Size(1600, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final fakeRepo = FakeAuthSetupAccountRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            accountRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: AuthPageSetupView(
                workspace: testWorkspace,
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify sections are visible
      expect(find.text('Auth Page Setup'), findsOneWidget);
      expect(find.text('Screen Layout Architecture'), findsOneWidget);
      expect(find.text('Split Screen Showcase'), findsWidgets);
      expect(find.text('Centered Card (Don\'t Split)'), findsWidgets);
      expect(find.text('Background Wallpaper & Visuals'), findsOneWidget);
      expect(find.text('Live Interactive Preview'), findsOneWidget);

      // Verify quick test actions
      expect(find.text('Open Live Sign In Page'), findsOneWidget);
      expect(find.text('Open Live Reset Password Page'), findsOneWidget);
    });
  });
}
