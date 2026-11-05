import '../localization/language_provider.dart';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// <summary>
/// Professional modal dialog requesting user reconfirmation before exiting or closing
/// the Ozikol Business Command Center (BCC) application.
/// </summary>
class ExitConfirmationDialog extends StatelessWidget {
  /// <summary>
  /// Initializes a new instance of <see cref="ExitConfirmationDialog"/>.
  /// </summary>
  const ExitConfirmationDialog({super.key});

  /// <summary>
  /// Displays the interactive application exit confirmation dialog.
  /// </summary>
  /// <param name="context">The active build context.</param>
  /// <returns>A future resolving to <c>true</c> if the user confirmed exit, or <c>false</c> otherwise.</returns>
  static Future<bool> show(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (dialogCtx) => const ExitConfirmationDialog(),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bgColor = isDark ? const Color(0xFF1E293B) : Colors.white;
    final titleColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final bodyColor = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
    final cardBorder = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final calloutBg = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);

    return Dialog(
      backgroundColor: bgColor,
      elevation: 16,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: cardBorder, width: 1),
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Warning Badge + Title + Subtitle
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.error.withAlpha(isDark ? 40 : 25),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.error.withAlpha(isDark ? 80 : 50),
                        width: 1,
                      ),
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.power_settings_new_rounded,
                        color: AppColors.error,
                        size: 24,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.trc('sh.quit_title', fallback: 'Quit Application?'),
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.3,
                            color: titleColor,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Ozikol',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Description Text
              Text(
                context.trc('sh.quit_body', fallback: 'Are you sure you want to close and exit the application? Active duplex telemetry streams and real-time push subscriptions will be gracefully paused.'),
                style: TextStyle(
                  fontSize: 13.5,
                  height: 1.5,
                  color: bodyColor,
                ),
              ),
              const SizedBox(height: 16),

              // Safe Persistence Callout Note
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: calloutBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: cardBorder, width: 1),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.shield_outlined,
                      size: 18,
                      color: AppColors.success,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        context.trc('sh.quit_note', fallback: 'Your enrolled workspaces, session credentials, and offline caches are safely preserved on your device.'),
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.4,
                          color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Action Buttons: "Stay in App" (Secondary) and "Close App" (Destructive Primary)
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                      side: BorderSide(color: cardBorder, width: 1),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: Text(
                      context.trc('sh.stay', fallback: 'Stay in App'),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white70 : const Color(0xFF334155),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.error,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.exit_to_app_rounded, size: 16, color: Colors.white),
                        SizedBox(width: 8),
                        Text(
                          context.trc('sh.close_app', fallback: 'Close App'),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
