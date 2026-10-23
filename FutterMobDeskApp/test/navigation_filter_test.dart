import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/features/dashboard/data/account_repository.dart';
import 'package:ozikol_app/features/dashboard/presentation/screens/user_directory/all_members_view.dart';

class MockAccountRepository extends Fake implements AccountRepository {
  @override
  Future<List<Map<String, dynamic>>> getUsers({String? search, String? category, String? status}) async {
    return [
      {
        'id': '1',
        'fullName': 'Alice Active',
        'email': 'alice@company.com',
        'userStatus': 'Active',
        'roles': ['Member'],
        'accessFailedCount': 0,
        'isLockedOut': false,
        'isSuspicious': false,
      },
      {
        'id': '2',
        'fullName': 'Bob Suspended',
        'email': 'bob@company.com',
        'userStatus': 'Suspended',
        'roles': ['Member'],
        'accessFailedCount': 0,
        'isLockedOut': false,
        'isSuspicious': false,
      },
      {
        'id': '3',
        'fullName': 'Charlie Suspicious',
        'email': 'charlie@company.com',
        'userStatus': 'Active',
        'roles': ['Member'],
        'accessFailedCount': 3,
        'isLockedOut': true,
        'isSuspicious': true,
      },
    ];
  }

  @override
  Future<List<Map<String, dynamic>>> getCategories() async => [];
}

void main() {
  testWidgets('AllMembersView filters correctly with initialStatusFilter: Suspended', (tester) async {
    tester.binding.window.physicalSizeTestValue = const Size(1920, 1080);
    tester.binding.window.devicePixelRatioTestValue = 1.0;
    addTearDown(tester.binding.window.clearPhysicalSizeTestValue);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          accountRepositoryProvider.overrideWithValue(MockAccountRepository()),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: AllMembersView(
              initialStatusFilter: 'Suspended',
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Bob Suspended'), findsOneWidget);
    expect(find.text('Alice Active'), findsNothing);
    expect(find.text('Charlie Suspicious'), findsNothing);
  });

  testWidgets('AllMembersView filters correctly with initialStatusFilter: Suspicious', (tester) async {
    tester.binding.window.physicalSizeTestValue = const Size(1920, 1080);
    tester.binding.window.devicePixelRatioTestValue = 1.0;
    addTearDown(tester.binding.window.clearPhysicalSizeTestValue);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          accountRepositoryProvider.overrideWithValue(MockAccountRepository()),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: AllMembersView(
              initialStatusFilter: 'Suspicious',
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Charlie Suspicious'), findsOneWidget);
    expect(find.text('Alice Active'), findsNothing);
    expect(find.text('Bob Suspended'), findsNothing);
  });
}
