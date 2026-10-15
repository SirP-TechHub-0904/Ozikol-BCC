import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Standardized contextual info button displaying rich domain guidance.
/// In accordance with repository standards, provides structured administrative advice:
/// Purpose, Expected Inputs/Formats, Impact, and Best Practices.
class ContextualInfoButton extends StatelessWidget {
  /// Header title for the dialog or bottom sheet.
  final String title;

  /// Explains why this section or data matters.
  final String purpose;

  /// Specific requirements, validation constraints, and formatted examples.
  final String? expectedInputs;

  /// Explains how actions taken in this section affect tenant billing, notifications, or members.
  final String? impact;

  /// Actionable domain advice and best practices for administrators.
  final String? bestPractices;

  /// Icon size (defaults to 16 for subtle elegance).
  final double size;

  const ContextualInfoButton({
    super.key,
    required this.title,
    required this.purpose,
    this.expectedInputs,
    this.impact,
    this.bestPractices,
    this.size = 16,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Tooltip(
      message: 'Help & Section Info: $title',
      child: InkWell(
        onTap: () => _showInfo(context, isDark),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: Icon(
            Icons.info_outline_rounded,
            size: size,
            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  void _showInfo(BuildContext context, bool isDark) {
    final isDesktop = MediaQuery.of(context).size.width >= 768;

    if (isDesktop) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(isDark ? 40 : 25),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.lightbulb_rounded, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          content: SizedBox(
            width: 480,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: _buildPillars(isDark),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Got it'),
            ),
          ],
        ),
      );
    } else {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withAlpha(isDark ? 40 : 25),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.lightbulb_rounded, color: AppColors.primary, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                ..._buildPillars(isDark),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('Dismiss', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }
  }

  List<Widget> _buildPillars(bool isDark) {
    return [
      _buildPillarSection(
        icon: Icons.track_changes_rounded,
        label: 'Purpose & Overview',
        content: purpose,
        accentColor: AppColors.primary,
        isDark: isDark,
      ),
      if (expectedInputs != null) ...[
        const SizedBox(height: 14),
        _buildPillarSection(
          icon: Icons.edit_note_rounded,
          label: 'Guidelines & Formats',
          content: expectedInputs!,
          accentColor: AppColors.info,
          isDark: isDark,
        ),
      ],
      if (impact != null) ...[
        const SizedBox(height: 14),
        _buildPillarSection(
          icon: Icons.bolt_rounded,
          label: 'Business Impact',
          content: impact!,
          accentColor: AppColors.warning,
          isDark: isDark,
        ),
      ],
      if (bestPractices != null) ...[
        const SizedBox(height: 14),
        _buildPillarSection(
          icon: Icons.verified_user_rounded,
          label: 'Best Practices',
          content: bestPractices!,
          accentColor: AppColors.success,
          isDark: isDark,
        ),
      ],
    ];
  }

  Widget _buildPillarSection({
    required IconData icon,
    required String label,
    required String content,
    required Color accentColor,
    required bool isDark,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 15, color: accentColor),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: accentColor,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Padding(
          padding: const EdgeInsets.only(left: 23),
          child: Text(
            content,
            style: TextStyle(
              fontSize: 12,
              height: 1.45,
              color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
            ),
          ),
        ),
      ],
    );
  }
}
