import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/core/widgets/primary_button.dart';
import 'package:ozikol_app/features/dashboard/data/account_repository.dart';
import 'package:ozikol_app/features/dashboard/presentation/screens/user_directory/user_create_view.dart';

class FakeAccountRepository extends Fake implements AccountRepository {
  @override
  Future<Map<String, dynamic>> getUserSettings() async => {'enableTitle': true, 'enableSuffix': false};
  @override
  Future<List<Map<String, dynamic>>> getCategories() async => [];
  @override
  Future<Map<String, dynamic>?> getMemberIdConfig() async => null;
}

void main() {
  testWidgets('UserCreateView renders without crashing', (tester) async {
    tester.binding.window.physicalSizeTestValue = const Size(1920, 1080);
    tester.binding.window.devicePixelRatioTestValue = 1.0;
    addTearDown(tester.binding.window.clearPhysicalSizeTestValue);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          accountRepositoryProvider.overrideWithValue(FakeAccountRepository()),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: UserCreateView(),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();
    expect(find.text('Create & Provision Member'), findsOneWidget);
  });

  testWidgets('PrimaryButton inside unconstrained Row does not throw infinite width assertion', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Row(
            children: [
              PrimaryButton(
                text: 'Test Unconstrained Button',
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
    );

    await tester.pump();
    expect(find.text('Test Unconstrained Button'), findsOneWidget);
  });
}
