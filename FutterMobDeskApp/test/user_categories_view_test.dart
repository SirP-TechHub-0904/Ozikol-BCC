import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/features/dashboard/data/account_repository.dart';
import 'package:ozikol_app/features/dashboard/presentation/screens/user_directory/user_categories_view.dart';

class FakeCategoriesAccountRepository extends Fake implements AccountRepository {
  final List<Map<String, dynamic>> _data = [
    {
      'id': '4951ea6b-6741-451d-9bbb-c3e686aae6cb',
      'name': 'Engineering Department',
      'description': 'Core software and platform engineering',
      'colorCode': '#0050e5',
      'icon': 'folder_shared',
      'sortOrder': 0,
      'isActive': true,
      'memberCount': 3,
    },
  ];

  @override
  Future<List<Map<String, dynamic>>> getCategories() async => List.from(_data);

  @override
  Future<bool> createCategory(
    String name,
    String description, {
    String? colorCode,
    String? icon,
    int sortOrder = 0,
    bool isActive = true,
  }) async {
    _data.add({
      'id': 'new-id',
      'name': name,
      'description': description,
      'colorCode': colorCode ?? '#0050e5',
      'icon': icon ?? 'folder_shared',
      'sortOrder': sortOrder,
      'isActive': isActive,
      'memberCount': 0,
    });
    return true;
  }

  @override
  Future<bool> updateCategory(String id, Map<String, dynamic> data) async => true;

  @override
  Future<bool> deleteCategory(String id) async => true;
}

void main() {
  testWidgets('UserCategoriesView renders enterprise table and switches in-page with zero modals', (tester) async {
    tester.view.physicalSize = const Size(1920, 1080);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          accountRepositoryProvider.overrideWithValue(FakeCategoriesAccountRepository()),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: UserCategoriesView(),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // 1. Verify list table renders with correct title and columns
    expect(find.text('User Categories & Departments'), findsOneWidget);
    expect(find.text('ORGANIZATIONAL HIERARCHY'), findsOneWidget);
    expect(find.text('CATEGORY / DEPARTMENT'), findsOneWidget);
    expect(find.text('MEMBERS'), findsOneWidget);
    expect(find.text('SORT ORDER'), findsOneWidget);
    expect(find.text('STATUS'), findsOneWidget);
    expect(find.text('ACTIONS'), findsOneWidget);
    expect(find.text('Engineering Department'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(find.text('members'), findsOneWidget);
    expect(find.text('#0'), findsOneWidget);
    expect(find.text('Published'), findsOneWidget);

    // 2. Click "Create Category" -> Should switch in-page with ZERO AlertDialog
    final createBtn = find.text('Create Category');
    expect(createBtn, findsOneWidget);
    await tester.tap(createBtn);
    await tester.pumpAndSettle();

    // Verify in-page create view
    expect(find.byType(AlertDialog), findsNothing);
    expect(find.text('Create User Category'), findsOneWidget);
    expect(find.text('CATEGORY / DEPARTMENT NAME *'), findsOneWidget);
    expect(find.text('SORT ORDER / DISPLAY PRIORITY'), findsOneWidget);
    expect(find.text('DESCRIPTION (OPTIONAL)'), findsOneWidget);
    expect(find.text('Publication Status'), findsOneWidget);

    // 3. Click "Cancel" -> returns to list table
    final cancelBtn = find.text('Cancel');
    expect(cancelBtn, findsOneWidget);
    await tester.tap(cancelBtn);
    await tester.pumpAndSettle();

    expect(find.text('User Categories & Departments'), findsOneWidget);
    expect(find.text('Engineering Department'), findsOneWidget);

    // 4. Click "Edit" -> Should switch in-page with pre-populated values
    final editBtn = find.text('Edit');
    expect(editBtn, findsOneWidget);
    await tester.tap(editBtn);
    await tester.pumpAndSettle();

    expect(find.byType(AlertDialog), findsNothing);
    expect(find.text('Edit Category: Engineering Department'), findsOneWidget);
    expect(find.text('Engineering Department'), findsWidgets);

    // Return to list
    await tester.tap(find.text('Back to Categories'));
    await tester.pumpAndSettle();

    // 5. Click Delete (trash icon) -> Should switch to in-page Delete confirmation view
    final deleteIconBtn = find.byTooltip('Delete Category');
    expect(deleteIconBtn, findsOneWidget);
    await tester.tap(deleteIconBtn);
    await tester.pumpAndSettle();

    expect(find.byType(AlertDialog), findsNothing);
    expect(find.text('Confirm User Category Deletion'), findsOneWidget);
    expect(find.text('Consequences of Deleting this Category'), findsOneWidget);
    expect(find.text('TYPE CATEGORY NAME TO CONFIRM DELETION:'), findsOneWidget);

    // Return to list
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.text('User Categories & Departments'), findsOneWidget);
  });

  testWidgets('Clicking Members button triggers navigation with category filter', (tester) async {
    tester.view.physicalSize = const Size(1920, 1080);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    int? capturedIndex;
    String? capturedCategoryFilter;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          accountRepositoryProvider.overrideWithValue(FakeCategoriesAccountRepository()),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: UserCategoriesView(
              onNavigateToTab: (index, {categoryFilter}) {
                capturedIndex = index;
                capturedCategoryFilter = categoryFilter;
              },
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify Members button exists in the row
    final membersBtn = find.text('Members');
    expect(membersBtn, findsOneWidget);

    // Tap Members action button
    await tester.tap(membersBtn);
    await tester.pumpAndSettle();

    // Verify navigation was triggered with category filter
    expect(capturedIndex, equals(1));
    expect(capturedCategoryFilter, equals('4951ea6b-6741-451d-9bbb-c3e686aae6cb'));
  });
}
