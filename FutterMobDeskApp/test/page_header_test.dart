import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/core/widgets/page_header.dart';

/// Pumps a [PageHeader] inside a box of the given [width] and returns any layout exception.
Future<void> _pumpAt(WidgetTester tester, double width, PageHeader header) async {
  tester.view.physicalSize = const Size(1600, 900);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: Align(
          alignment: Alignment.topLeft,
          child: SizedBox(width: width, child: header),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  var historyBackTapped = false;
  var targetBackTapped = false;

  PageHeader buildHeader(PageHeaderBack back) => PageHeader(
        icon: Icons.groups_rounded,
        eyebrow: 'User Management & Directory',
        title: 'Member Directory & Register With A Deliberately Long Title',
        description: 'Search, filter, paginate, and export official membership rolls.',
        back: back,
        primaryAction: PageHeaderAction(
          label: 'Add Member',
          icon: Icons.person_add_rounded,
          style: PageHeaderActionStyle.primary,
          onPressed: () {},
        ),
        secondaryActions: [
          PageHeaderAction(
            label: 'Registration Form Builder',
            compactLabel: 'Form Builder',
            icon: Icons.dynamic_form_outlined,
            onPressed: () {},
          ),
        ],
      );

  setUp(() {
    historyBackTapped = false;
    targetBackTapped = false;
  });

  group('PageHeader tiers render without overflow', () {
    for (final width in [1400.0, 1000.0, 700.0, 420.0]) {
      testWidgets('width $width', (tester) async {
        await _pumpAt(tester, width, buildHeader(PageHeaderBack.previous(() {})));
        expect(tester.takeException(), isNull);
        expect(find.textContaining('Member Directory'), findsOneWidget);
      });
    }
  });

  testWidgets('wide tier shows description and full secondary label', (tester) async {
    await _pumpAt(tester, 1400, buildHeader(PageHeaderBack.none));
    expect(find.textContaining('Search, filter'), findsOneWidget);
    expect(find.text('Registration Form Builder'), findsOneWidget);
    expect(find.byIcon(Icons.arrow_back_rounded), findsNothing);
  });

  testWidgets('medium tier hides description and makes secondary icon-only', (tester) async {
    await _pumpAt(tester, 1000, buildHeader(PageHeaderBack.none));
    expect(find.textContaining('Search, filter'), findsNothing);
    expect(find.text('Registration Form Builder'), findsNothing);
    expect(find.byIcon(Icons.dynamic_form_outlined), findsOneWidget);
    expect(find.text('Add Member'), findsOneWidget);
  });

  testWidgets('compact tier moves secondary actions into overflow menu', (tester) async {
    await _pumpAt(tester, 700, buildHeader(PageHeaderBack.none));
    expect(find.byIcon(Icons.more_horiz_rounded), findsOneWidget);
    expect(find.text('Add Member'), findsOneWidget);
  });

  testWidgets('history back (previous) invokes callback with arrow only', (tester) async {
    await _pumpAt(tester, 1400, buildHeader(PageHeaderBack.previous(() => historyBackTapped = true)));
    await tester.tap(find.byIcon(Icons.arrow_back_rounded));
    expect(historyBackTapped, isTrue);
  });

  testWidgets('targeted back (to) shows destination label on wide and navigates', (tester) async {
    await _pumpAt(
      tester,
      1400,
      buildHeader(PageHeaderBack.to(() => targetBackTapped = true, label: 'Back to List')),
    );
    expect(find.text('Back to List'), findsOneWidget);
    await tester.tap(find.text('Back to List'));
    expect(targetBackTapped, isTrue);
  });

  testWidgets('targeted back collapses to arrow-only on compact', (tester) async {
    await _pumpAt(tester, 700, buildHeader(PageHeaderBack.to(() {}, label: 'Back to List')));
    expect(find.text('Back to List'), findsNothing);
    expect(find.byIcon(Icons.arrow_back_rounded), findsOneWidget);
  });
}
