/// <summary>
/// Central Pattern Multi-Language Switcher Component for Ozikol BCC (Business Command Center).
/// Delivers exact visual fidelity and operational parity with the Ozikol Central
/// .oz-lang-switcher pill button, desktop popup menu, and mobile bottom sheet.
/// </summary>
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../localization/app_translations.dart';
import '../localization/language_provider.dart';
import '../theme/app_colors.dart';
import 'bottom_sheet_handle.dart';

/// <summary>
/// Interactive language switcher replicating Ozikol Central's .oz-lang-switcher.
/// Adapts gracefully between desktop popups and mobile bottom sheets.
/// </summary>
class OzLangSwitcher extends ConsumerStatefulWidget {
  /// Whether to render in a compact icon mode for ultra-narrow bars.
  final bool compact;

  /// Optional custom padding for the pill button.
  final EdgeInsetsGeometry? padding;

  /// Creates a [OzLangSwitcher].
  const OzLangSwitcher({
    super.key,
    this.compact = false,
    this.padding,
  });

  @override
  ConsumerState<OzLangSwitcher> createState() => _OzLangSwitcherState();
}

class _OzLangSwitcherState extends ConsumerState<OzLangSwitcher> {
  bool _isMenuOpen = false;

  @override
  Widget build(BuildContext context) {
    final currentCode = ref.watch(languageProvider);
    final currentLang = AppTranslations.getLanguage(currentCode);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isDesktop = MediaQuery.of(context).size.width >= 768;

    if (widget.compact) {
      return _buildCompactTrigger(context, currentLang, isDark, isDesktop);
    }

    return _buildPillTrigger(context, currentLang, isDark, isDesktop);
  }

  /// <summary>
  /// Builds the canonical Ozikol Central pill trigger button (flag + ISO code + chevron).
  /// </summary>
  Widget _buildPillTrigger(
    BuildContext context,
    AppLanguage currentLang,
    bool isDark,
    bool isDesktop,
  ) {
    // Glassmorphism colors matching Central's .oz-lang-btn
    final bgColor = isDark
        ? const Color(0xFF1E293B).withValues(alpha: 0.75)
        : Colors.white.withValues(alpha: 0.85);

    final borderColor = _isMenuOpen
        ? AppColors.primary
        : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0));

    final textColor = isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _handleTriggerPressed(context, isDesktop),
        borderRadius: BorderRadius.circular(9999),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: widget.padding ?? const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(9999),
            border: Border.all(
              color: borderColor,
              width: _isMenuOpen ? 1.5 : 1,
            ),
            boxShadow: _isMenuOpen
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.18),
                      blurRadius: 8,
                      spreadRadius: 1,
                    )
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    )
                  ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                currentLang.flag,
                style: const TextStyle(fontSize: 14),
              ),
              const SizedBox(width: 5),
              Text(
                currentLang.code.toUpperCase(),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                  color: textColor,
                ),
              ),
              const SizedBox(width: 4),
              AnimatedRotation(
                turns: _isMenuOpen ? 0.5 : 0.0,
                duration: const Duration(milliseconds: 180),
                child: Icon(
                  Icons.keyboard_arrow_down_rounded,
                  size: 15,
                  color: textColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// <summary>
  /// Builds a compact square button trigger for tight mobile app bars.
  /// </summary>
  Widget _buildCompactTrigger(
    BuildContext context,
    AppLanguage currentLang,
    bool isDark,
    bool isDesktop,
  ) {
    return IconButton(
      icon: Container(
        padding: const EdgeInsets.all(5),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
          ),
        ),
        child: Text(
          currentLang.flag,
          style: const TextStyle(fontSize: 14),
        ),
      ),
      tooltip: 'Language: ${currentLang.nativeName}',
      onPressed: () => _handleTriggerPressed(context, isDesktop),
    );
  }

  /// <summary>
  /// Handles opening the language selection UI based on device form factor.
  /// </summary>
  void _handleTriggerPressed(BuildContext context, bool isDesktop) {
    if (isDesktop) {
      _showDesktopMenu(context);
    } else {
      _showMobileBottomSheet(context);
    }
  }

  /// <summary>
  /// Displays the Central style floating menu on desktop viewports.
  /// </summary>
  Future<void> _showDesktopMenu(BuildContext context) async {
    final RenderBox? button = context.findRenderObject() as RenderBox?;
    if (button == null) return;

    final RenderBox overlay = Overlay.of(context).context.findRenderObject() as RenderBox;
    final Offset buttonTopLeft = button.localToGlobal(Offset.zero, ancestor: overlay);
    final Size buttonSize = button.size;

    // Anchor menu directly beneath the trigger button with a 6px vertical offset:
    final RelativeRect position = RelativeRect.fromRect(
      Rect.fromLTWH(
        buttonTopLeft.dx,
        buttonTopLeft.dy + buttonSize.height + 6,
        buttonSize.width,
        0,
      ),
      Offset.zero & overlay.size,
    );

    setState(() => _isMenuOpen = true);

    final currentCode = ref.read(languageProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final selected = await showMenu<String>(
      context: context,
      position: position,
      color: isDark ? const Color(0xFF18191F) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isDark ? const Color(0xFF2E384D) : const Color(0xFFE2E8F0),
        ),
      ),
      elevation: 8,
      items: AppTranslations.supportedLanguages.map((lang) {
        final isSelected = lang.code == currentCode;
        return PopupMenuItem<String>(
          value: lang.code,
          height: 40,
          child: Row(
            children: [
              Text(lang.flag, style: const TextStyle(fontSize: 16)),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  lang.nativeName,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected
                        ? AppColors.primary
                        : (isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155)),
                  ),
                ),
              ),
              if (isSelected)
                const Icon(
                  Icons.check_rounded,
                  size: 16,
                  color: AppColors.primary,
                ),
            ],
          ),
        );
      }).toList(),
    );

    if (mounted) {
      setState(() => _isMenuOpen = false);
    }

    if (selected != null && context.mounted) {
      await _confirmAndSetLanguage(context, selected);
    }
  }

  /// <summary>
  /// Displays the sleek modal bottom sheet on mobile screens.
  /// </summary>
  void _showMobileBottomSheet(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currentCode = ref.read(languageProvider);

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF18191F) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (bottomSheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Center(child: BottomSheetHandle()),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.translate_rounded,
                        size: 18,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      AppTranslations.get('shell.select_language', currentCode, fallback: 'Select Language'),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                ...AppTranslations.supportedLanguages.map((lang) {
                  final isSelected = lang.code == currentCode;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Material(
                      color: isSelected
                          ? AppColors.primary.withValues(alpha: isDark ? 0.2 : 0.08)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      child: InkWell(
                        onTap: () async {
                          Navigator.of(bottomSheetContext).pop();
                          if (context.mounted) {
                            await _confirmAndSetLanguage(context, lang.code);
                          }
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          child: Row(
                            children: [
                              Text(lang.flag, style: const TextStyle(fontSize: 22)),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      lang.nativeName,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                                        color: isSelected
                                            ? AppColors.primary
                                            : (isDark ? Colors.white : const Color(0xFF0F172A)),
                                      ),
                                    ),
                                    Text(
                                      lang.name,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: isDark ? AppColors.gray400 : AppColors.gray500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (isSelected)
                                Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: AppColors.primary,
                                  ),
                                  child: const Icon(
                                    Icons.check_rounded,
                                    size: 14,
                                    color: Colors.white,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 12),
              ],
            ),
          ),
        );
      },
    );
  }

  /// <summary>
  /// Displays a modal confirmation dialog before applying system-wide language changes.
  /// When confirmed, updates persistent local storage and translates all UI chrome immediately.
  /// </summary>
  /// <param name="context">The active BuildContext.</param>
  /// <param name="newCode">The target language code ('en', 'fr', 'es', 'de').</param>
  Future<void> _confirmAndSetLanguage(BuildContext context, String newCode) async {
    final currentCode = ref.read(languageProvider);
    if (newCode == currentCode) return;

    final targetLang = AppTranslations.getLanguage(newCode);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
          ),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.translate_rounded, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'shell.confirm_lang_title'.tr(ref, fallback: 'Change System Language?'),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'shell.confirm_lang_desc'.tr(
                ref,
                fallback: 'Do you want to switch the interface language? All screens, navigation menus, and workspace labels will translate immediately.',
              ),
              style: TextStyle(
                fontSize: 13,
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                height: 1.45,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                ),
              ),
              child: Row(
                children: [
                  Text(targetLang.flag, style: const TextStyle(fontSize: 20)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          targetLang.nativeName,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          targetLang.name,
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      targetLang.code.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text(
              'btn.cancel'.tr(ref, fallback: 'Cancel'),
              style: TextStyle(
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            child: Text(
              'shell.confirm_lang_btn'.tr(ref, fallback: 'Change Language'),
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await ref.read(languageProvider.notifier).setLanguage(newCode);
    }
  }
}
