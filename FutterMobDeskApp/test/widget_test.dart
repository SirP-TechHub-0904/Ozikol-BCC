import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/core/theme/app_theme.dart';
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
}
