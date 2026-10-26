/// <summary>
/// State management provider for active application language selection
/// across Ozikol BCC (Business Command Center) Flutter Desktop and Mobile applications.
/// Persists the user preference to SecureStorageService and triggers real-time UI updates.
/// </summary>
library;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/secure_storage_service.dart';
import 'app_translations.dart';

/// <summary>
/// State notifier managing the active language code ('en', 'fr', 'es', 'de').
/// Persists changes to [SecureStorageService].
/// </summary>
class LanguageNotifier extends StateNotifier<String> {
  final SecureStorageService _storageService;

  /// Creates a [LanguageNotifier] initialized from persistent storage or default 'en'.
  LanguageNotifier(this._storageService) : super('en') {
    _loadInitialLanguage();
  }

  /// Loads the stored language preference synchronously from the storage service.
  void _loadInitialLanguage() {
    final saved = _storageService.getLanguage();
    if (saved != null && AppTranslations.supportedLanguages.any((l) => l.code == saved)) {
      state = saved;
    }
  }

  /// <summary>
  /// Sets the active application language and persists it to disk.
  /// </summary>
  /// <param name="code">The language code to activate ('en', 'fr', 'es', 'de').</param>
  Future<void> setLanguage(String code) async {
    if (state == code) return;
    if (!AppTranslations.supportedLanguages.any((l) => l.code == code)) return;
    state = code;
    await _storageService.setLanguage(code);
  }

  /// <summary>
  /// Returns the [AppLanguage] descriptor for the currently active language.
  /// </summary>
  AppLanguage get currentLanguage => AppTranslations.getLanguage(state);
}

/// <summary>
/// Global Riverpod provider for active application language state.
/// </summary>
final languageProvider = StateNotifierProvider<LanguageNotifier, String>((ref) {
  final storageService = ref.watch(storageServiceProvider);
  return LanguageNotifier(storageService);
});

/// <summary>
/// Convenience extension on [String] for clean, declarative translation resolution.
/// </summary>
extension TranslationStringExtension on String {
  /// <summary>
  /// Translates the token using the active language from Riverpod [WidgetRef].
  /// </summary>
  /// <param name="ref">The active Riverpod WidgetRef.</param>
  /// <param name="fallback">Optional fallback text if token is not found.</param>
  /// <returns>Localized string.</returns>
  String tr(WidgetRef ref, {String? fallback}) {
    final lang = ref.watch(languageProvider);
    return AppTranslations.get(this, lang, fallback: fallback ?? this);
  }

  /// <summary>
  /// Translates the token by reading the current language without subscribing to rebuilds.
  /// </summary>
  /// <param name="ref">The active Riverpod WidgetRef.</param>
  /// <param name="fallback">Optional fallback text if token is not found.</param>
  /// <returns>Localized string.</returns>
  String trRead(WidgetRef ref, {String? fallback}) {
    final lang = ref.read(languageProvider);
    return AppTranslations.get(this, lang, fallback: fallback ?? this);
  }
}

/// <summary>
/// Translation helper for widgets that have a [BuildContext] but no Riverpod [WidgetRef]
/// (plain Stateless/Stateful widgets such as tooltips and shared form controls).
/// </summary>
extension ContextTranslationExtension on BuildContext {
  /// <summary>
  /// Resolves a localized string using the active language from the enclosing [ProviderScope].
  /// Falls back to <paramref name="fallback"/> when no scope exists (e.g. isolated widget tests).
  /// </summary>
  /// <param name="token">The dot-notated translation token key.</param>
  /// <param name="fallback">English fallback text if the token or scope is unavailable.</param>
  /// <returns>Localized string.</returns>
  String trc(String token, {String? fallback}) {
    try {
      final container = ProviderScope.containerOf(this, listen: false);
      final lang = container.read(languageProvider);
      return AppTranslations.get(token, lang, fallback: fallback ?? token);
    } catch (_) {
      // No ProviderScope in the tree: degrade gracefully to the English fallback.
      return fallback ?? token;
    }
  }
}
