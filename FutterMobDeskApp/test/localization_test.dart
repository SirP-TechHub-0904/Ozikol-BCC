import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/core/localization/app_translations.dart';
import 'package:ozikol_app/core/localization/language_provider.dart';
import 'package:ozikol_app/core/storage/secure_storage_service.dart';
import 'package:ozikol_app/core/widgets/oz_lang_switcher.dart';

void main() {
  group('AppTranslations Dictionary Tests', () {
    test('Resolves English tokens correctly', () {
      expect(AppTranslations.get('shell.console', 'en'), equals('Console'));
      expect(AppTranslations.get('shell.workspace', 'en'), equals('Workspace'));
      expect(AppTranslations.get('btn.refresh_telemetry', 'en'), equals('Refresh Telemetry'));
      expect(AppTranslations.get('nav.console_dashboard', 'en'), equals('Console Dashboard'));
    });

    test('Resolves French tokens correctly', () {
      expect(AppTranslations.get('shell.console', 'fr'), equals('Console'));
      expect(AppTranslations.get('shell.workspace', 'fr'), equals('Espace'));
      expect(AppTranslations.get('shell.sign_out', 'fr'), equals('Déconnexion'));
      expect(AppTranslations.get('btn.refresh_telemetry', 'fr'), equals('Actualiser télémétrie'));
    });

    test('Resolves Spanish tokens correctly', () {
      expect(AppTranslations.get('shell.console', 'es'), equals('Consola'));
      expect(AppTranslations.get('shell.workspace', 'es'), equals('Espacio'));
      expect(AppTranslations.get('shell.sign_out', 'es'), equals('Cerrar Sesión'));
      expect(AppTranslations.get('btn.refresh_telemetry', 'es'), equals('Actualizar Telemetría'));
    });

    test('Resolves German tokens correctly', () {
      expect(AppTranslations.get('shell.console', 'de'), equals('Konsole'));
      expect(AppTranslations.get('shell.workspace', 'de'), equals('Arbeitsbereich'));
      expect(AppTranslations.get('shell.sign_out', 'de'), equals('Abmelden'));
      expect(AppTranslations.get('btn.refresh_telemetry', 'de'), equals('Telemetrie aktualisieren'));
    });

    test('Falls back gracefully to English when key is absent in target language', () {
      final text = AppTranslations.get('shell.console', 'non_existent_lang');
      expect(text, equals('Console'));
    });

    test('Falls back to provided fallback string when key is absent everywhere', () {
      final text = AppTranslations.get('unknown.token.key', 'fr', fallback: 'Default Fallback');
      expect(text, equals('Default Fallback'));
    });

    test('Resolves language descriptors accurately', () {
      final en = AppTranslations.getLanguage('en');
      expect(en.name, equals('English'));
      expect(en.flag, equals('🇬🇧'));
      expect(en.shortLabel, equals('🇬🇧 EN'));

      final fr = AppTranslations.getLanguage('fr');
      expect(fr.nativeName, equals('Français'));
      expect(fr.flag, equals('🇫🇷'));
      expect(fr.shortLabel, equals('🇫🇷 FR'));
    });
  });

  group('LanguageNotifier & State Tests', () {
    test('Initializes with stored language or default en', () async {
      final storage = SecureStorageService.inMemory();
      await storage.setLanguage('fr');

      final notifier = LanguageNotifier(storage);
      expect(notifier.state, equals('fr'));
      expect(notifier.currentLanguage.nativeName, equals('Français'));
    });

    test('Updates language and persists change to SecureStorageService', () async {
      final storage = SecureStorageService.inMemory();
      final notifier = LanguageNotifier(storage);
      expect(notifier.state, equals('en'));

      await notifier.setLanguage('es');
      expect(notifier.state, equals('es'));
      expect(storage.getLanguage(), equals('es'));

      await notifier.setLanguage('de');
      expect(notifier.state, equals('de'));
      expect(storage.getLanguage(), equals('de'));
    });

    test('Ignores invalid language codes', () async {
      final storage = SecureStorageService.inMemory();
      final notifier = LanguageNotifier(storage);

      await notifier.setLanguage('invalid_code');
      expect(notifier.state, equals('en'));
    });
  });

  group('OzLangSwitcher Widget Tests', () {
    testWidgets('Renders Central pill button with active language flag and code', (tester) async {
      final storage = SecureStorageService.inMemory();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            storageServiceProvider.overrideWithValue(storage),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: Center(
                child: OzLangSwitcher(),
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify flag and short uppercase ISO code are visible
      expect(find.text('🇬🇧'), findsOneWidget);
      expect(find.text('EN'), findsOneWidget);
      expect(find.byIcon(Icons.keyboard_arrow_down_rounded), findsOneWidget);
    });

    testWidgets('Renders compact trigger mode cleanly', (tester) async {
      final storage = SecureStorageService.inMemory();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            storageServiceProvider.overrideWithValue(storage),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: Center(
                child: OzLangSwitcher(compact: true),
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('🇬🇧'), findsOneWidget);
    });

    testWidgets('Opens modal bottom sheet on mobile and switches language to French', (tester) async {
      final storage = SecureStorageService.inMemory();

      // Configure a mobile viewport (< 768px)
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            storageServiceProvider.overrideWithValue(storage),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: Center(
                child: OzLangSwitcher(),
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap the pill trigger
      await tester.tap(find.byType(OzLangSwitcher));
      await tester.pumpAndSettle();

      // Verify bottom sheet title and language options are rendered
      expect(find.text('Select Language'), findsOneWidget);
      expect(find.text('Français'), findsOneWidget);
      expect(find.text('Español'), findsOneWidget);
      expect(find.text('Deutsch'), findsOneWidget);

      // Tap French
      await tester.tap(find.text('Français'));
      await tester.pumpAndSettle();

      // Verify pill updated to French flag and FR label
      expect(find.text('🇫🇷'), findsOneWidget);
      expect(find.text('FR'), findsOneWidget);
      expect(storage.getLanguage(), equals('fr'));
    });
  });
}
