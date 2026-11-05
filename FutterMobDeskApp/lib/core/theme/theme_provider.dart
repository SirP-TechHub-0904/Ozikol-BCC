import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/secure_storage_service.dart';

/// Supported application theme modes aligned with Ozikol design system.
enum AppThemeMode {
  /// Follows the operating system brightness (automatic switching)
  system,

  /// Clean crisp light canvas (#F8FAFC) with pure white cards (#FFFFFF)
  light,

  /// Deep slate canvas (#0F172A) with navy slate cards (#1E293B)
  dark,
}

/// Riverpod StateNotifier managing the active ThemeMode and persisting user choice.
class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  final SecureStorageService _storageService;

  /// Creates a [ThemeModeNotifier] and restores persisted theme preference.
  ///
  /// [storageService] provides persistent key-value access across platforms.
  ThemeModeNotifier(this._storageService) : super(ThemeMode.system) {
    _loadPersistedTheme();
  }

  /// Restores user-selected theme from local persistent storage.
  /// Defaults to [ThemeMode.system] if no preference was previously saved.
  void _loadPersistedTheme() {
    try {
      final raw = _storageService.getThemeMode();
      if (raw == 'light') {
        state = ThemeMode.light;
      } else if (raw == 'dark') {
        state = ThemeMode.dark;
      } else {
        state = ThemeMode.system;
      }
    } catch (_) {
      // In case of parsing discrepancies, safely maintain system mode
      state = ThemeMode.system;
    }
  }

  /// Sets the active theme mode and persists the preference to local storage.
  ///
  /// [mode] the new target [ThemeMode] (system, light, or dark).
  Future<void> setThemeMode(ThemeMode mode) async {
    state = mode;
    final serialized = switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    };
    await _storageService.setThemeMode(serialized);
  }

  /// Convenience toggle between light and dark modes based on current context.
  ///
  /// [context] BuildContext used to determine current platform brightness.
  Future<void> toggleTheme(BuildContext context) async {
    final isCurrentlyDark = Theme.of(context).brightness == Brightness.dark;
    if (isCurrentlyDark) {
      await setThemeMode(ThemeMode.light);
    } else {
      await setThemeMode(ThemeMode.dark);
    }
  }
}

/// Global Riverpod provider exposing the reactive [ThemeMode] state.
final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return ThemeModeNotifier(storage);
});
