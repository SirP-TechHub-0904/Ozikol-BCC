import 'package:flutter/material.dart';
import '../localization/language_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_colors.dart';
import '../theme/theme_provider.dart';

/// Premium, responsive theme mode switcher widget.
/// Supports both full segmented pill control and compact icon button modes.
class ThemeModeSwitcher extends ConsumerWidget {
  /// If true, renders a compact icon button suitable for tight mobile app bars.
  /// If false, renders a full 3-segment pill control (System, Light, Dark).
  final bool compact;

  /// Creates a [ThemeModeSwitcher].
  const ThemeModeSwitcher({
    super.key,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentMode = ref.watch(themeModeProvider);
    final notifier = ref.read(themeModeProvider.notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (compact) {
      return _buildCompactButton(context, currentMode, notifier, isDark);
    }

    return _buildSegmentedPill(context, currentMode, notifier, isDark);
  }

  /// Builds a compact button with a dropdown/popup menu for mobile topbars
  Widget _buildCompactButton(
    BuildContext context,
    ThemeMode currentMode,
    ThemeModeNotifier notifier,
    bool isDark,
  ) {
    final currentIcon = switch (currentMode) {
      ThemeMode.system => Icons.brightness_auto_rounded,
      ThemeMode.light => Icons.light_mode_rounded,
      ThemeMode.dark => Icons.dark_mode_rounded,
    };

    final tooltip = switch (currentMode) {
      ThemeMode.system => 'Theme: System Default',
      ThemeMode.light => 'Theme: Light Mode',
      ThemeMode.dark => 'Theme: Dark Mode',
    };

    return PopupMenuButton<ThemeMode>(
      tooltip: tooltip,
      initialValue: currentMode,
      icon: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
          ),
        ),
        child: Icon(
          currentIcon,
          size: 18,
          color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
        ),
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      elevation: 6,
      onSelected: (mode) => notifier.setThemeMode(mode),
      itemBuilder: (context) => [
        _buildPopupItem(
          ThemeMode.system,
          'System Auto',
          Icons.brightness_auto_rounded,
          currentMode == ThemeMode.system,
          isDark,
        ),
        _buildPopupItem(
          ThemeMode.light,
          'Light Mode',
          Icons.light_mode_rounded,
          currentMode == ThemeMode.light,
          isDark,
        ),
        _buildPopupItem(
          ThemeMode.dark,
          'Dark Mode',
          Icons.dark_mode_rounded,
          currentMode == ThemeMode.dark,
          isDark,
        ),
      ],
    );
  }

  PopupMenuItem<ThemeMode> _buildPopupItem(
    ThemeMode mode,
    String label,
    IconData icon,
    bool isSelected,
    bool isDark,
  ) {
    return PopupMenuItem<ThemeMode>(
      value: mode,
      child: Row(
        children: [
          Icon(
            icon,
            size: 18,
            color: isSelected
                ? AppColors.primary
                : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
          ),
          const SizedBox(width: 10),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected
                  ? AppColors.primary
                  : (isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight),
            ),
          ),
          if (isSelected) ...[
            const Spacer(),
            const Icon(Icons.check_rounded, size: 16, color: AppColors.primary),
          ],
        ],
      ),
    );
  }

  /// Builds the modern 3-segment sliding control for desktop topbars & settings
  Widget _buildSegmentedPill(
    BuildContext context,
    ThemeMode currentMode,
    ThemeModeNotifier notifier,
    bool isDark,
  ) {
    final containerBg = isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9);
    final borderColor = isDark ? AppColors.outlineDark : AppColors.outlineLight;

    return Container(
      height: 36,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: containerBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildPillSegment(
            icon: Icons.light_mode_rounded,
            tooltip: context.trc('ui.light_mode', fallback: 'Light Mode'),
            isSelected: currentMode == ThemeMode.light,
            isDark: isDark,
            onTap: () => notifier.setThemeMode(ThemeMode.light),
          ),
          _buildPillSegment(
            icon: Icons.brightness_auto_rounded,
            tooltip: context.trc('ui.system_default', fallback: 'System Default'),
            isSelected: currentMode == ThemeMode.system,
            isDark: isDark,
            onTap: () => notifier.setThemeMode(ThemeMode.system),
          ),
          _buildPillSegment(
            icon: Icons.dark_mode_rounded,
            tooltip: context.trc('ui.dark_mode', fallback: 'Dark Mode'),
            isSelected: currentMode == ThemeMode.dark,
            isDark: isDark,
            onTap: () => notifier.setThemeMode(ThemeMode.dark),
          ),
        ],
      ),
    );
  }

  Widget _buildPillSegment({
    required IconData icon,
    required String tooltip,
    required bool isSelected,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    final activeBg = isDark ? const Color(0xFF1E293B) : Colors.white;
    final activeIconColor = isDark ? const Color(0xFF6EA2FF) : AppColors.primary;
    final inactiveIconColor = isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8);

    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(9),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: isSelected ? activeBg : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withAlpha(isDark ? 50 : 15),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ]
                : null,
          ),
          child: Icon(
            icon,
            size: 16,
            color: isSelected ? activeIconColor : inactiveIconColor,
          ),
        ),
      ),
    );
  }
}
