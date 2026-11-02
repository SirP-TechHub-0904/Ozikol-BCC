import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/core/theme/app_theme.dart';
import 'package:ozikol_app/core/widgets/exit_confirmation_dialog.dart';

void main() {
  group('ExitConfirmationDialog Tests', () {
    testWidgets('Renders quit warning, BCC subtitle, and action buttons', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => ExitConfirmationDialog.show(context),
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      // Tap button to open dialog
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      // Verify dialog header and domain terminology
      expect(find.text('Quit Application?'), findsOneWidget);
      expect(find.text('Ozikol Business Command Center'), findsOneWidget);
      expect(find.text('Stay in App'), findsOneWidget);
      expect(find.text('Close App'), findsOneWidget);
      expect(find.byIcon(Icons.power_settings_new_rounded), findsOneWidget);
      expect(find.byIcon(Icons.shield_outlined), findsOneWidget);
    });

    testWidgets('Tapping Stay in App cancels and returns false', (tester) async {
      bool? userResponse;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () async {
                  userResponse = await ExitConfirmationDialog.show(context);
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      // Tap 'Stay in App'
      await tester.tap(find.text('Stay in App'));
      await tester.pumpAndSettle();

      // Verify dialog dismissed and returned false
      expect(find.text('Quit Application?'), findsNothing);
      expect(userResponse, isFalse);
    });

    testWidgets('Tapping Close App confirms and returns true', (tester) async {
      bool? userResponse;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () async {
                  userResponse = await ExitConfirmationDialog.show(context);
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      // Tap 'Close App'
      await tester.tap(find.text('Close App'));
      await tester.pumpAndSettle();

      // Verify dialog dismissed and returned true
      expect(find.text('Quit Application?'), findsNothing);
      expect(userResponse, isTrue);
    });

    testWidgets('Renders properly under dark mode', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => ExitConfirmationDialog.show(context),
                child: const Text('Open Dark'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Dark'));
      await tester.pumpAndSettle();

      expect(find.text('Quit Application?'), findsOneWidget);
      expect(find.text('Close App'), findsOneWidget);
    });
  });
}
