import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/features/dashboard/data/account_repository.dart';
import 'package:ozikol_app/features/dashboard/presentation/screens/user_directory/user_details_view.dart';
import 'package:ozikol_app/features/dashboard/presentation/screens/user_directory/user_edit_view.dart';

class FakeAccountRepositoryForDetailsAndEdit extends Fake implements AccountRepository {
  @override
  Future<Map<String, dynamic>> getUserDossier(String userId) async => {
        'id': userId,
        'fullName': 'Mr. Onwuka Peter',
        'email': 'name@domain.com',
        'phoneNumber': '+0 (000) 000-0000',
        'designation': 'Senior Analyst',
        'roles': ['Member'],
        'userStatus': 'Active',
        'memberId': 'ID-2610-685',
        'categoryName': 'Engineering Department',
      };

  @override
  Future<List<Map<String, dynamic>>> getCategories() async => [
        {'id': 'cat-1', 'name': 'Engineering Department'},
      ];

  @override
  Future<Map<String, dynamic>> getUserSettings() async => {
        'enableTitle': true,
        'enableSuffix': false,
      };

  @override
  Future<bool> updateUserProfile(String userId, Map<String, dynamic> payload) async => true;

  @override
  Future<List<Map<String, dynamic>>> getUserKpiScores(String userId) async => [];

  Future<String?> generateActivationOtp(String userId) async => '839201';
}

void main() {
  final sampleMember = {
    'id': '6d491eb5-548b-4092-af04-3148b4e0e9b2',
    'fullName': 'Mr. Onwuka Peter',
    'firstName': 'Onwuka',
    'lastName': 'Peter',
    'title': 'Mr.',
    'email': 'name@domain.com',
    'phoneNumber': '+0 (000) 000-0000',
    'designation': 'Senior Analyst',
    'roles': ['Member'],
    'userStatus': 'Active',
    'memberId': 'ID-2610-685',
    'categoryName': 'Engineering Department',
  };

  testWidgets('UserDetailsView renders full 360 command center page properly', (tester) async {
    tester.binding.window.physicalSizeTestValue = const Size(1920, 1080);
    tester.binding.window.devicePixelRatioTestValue = 1.0;
    addTearDown(tester.binding.window.clearPhysicalSizeTestValue);

    bool backClicked = false;
    bool editClicked = false;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          accountRepositoryProvider.overrideWithValue(FakeAccountRepositoryForDetailsAndEdit()),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: UserDetailsView(
              member: sampleMember,
              onNavigateBack: () => backClicked = true,
              onNavigateToEdit: (m) => editClicked = true,
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('360° MEMBER COMMAND CENTER'), findsOneWidget);
    expect(find.text('Mr. Onwuka Peter'), findsWidgets);
    expect(find.text('Back to List'), findsOneWidget);
    expect(find.text('Edit Profile'), findsOneWidget);
    expect(find.text('Performance Scorecards & KPI History'), findsOneWidget);
    expect(find.text('Forensic Audit Trail & Security Logs'), findsOneWidget);
    expect(find.text('6-Digit OTP Security & Credentials'), findsOneWidget);

    // Tap Back button
    await tester.tap(find.text('Back to List'));
    await tester.pump();
    expect(backClicked, isTrue);

    // Tap Edit Profile button
    await tester.tap(find.text('Edit Profile'));
    await tester.pump();
    expect(editClicked, isTrue);
  });

  testWidgets('UserEditView renders profile management page with form fields', (tester) async {
    tester.binding.window.physicalSizeTestValue = const Size(1920, 1080);
    tester.binding.window.devicePixelRatioTestValue = 1.0;
    addTearDown(tester.binding.window.clearPhysicalSizeTestValue);

    bool backClicked = false;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          accountRepositoryProvider.overrideWithValue(FakeAccountRepositoryForDetailsAndEdit()),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: UserEditView(
              member: sampleMember,
              onNavigateBack: () => backClicked = true,
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('PROFILE MANAGEMENT'), findsOneWidget);
    expect(find.text('Save Profile Changes'), findsOneWidget);
    expect(find.text('Cancel & Back'), findsOneWidget);
    expect(find.text('Work Email Address'), findsOneWidget);
    expect(find.text('Organizational Hierarchy & System Role'), findsOneWidget);

    // Tap Back button
    await tester.tap(find.text('Cancel & Back'));
    await tester.pump();
    expect(backClicked, isTrue);
  });
}
