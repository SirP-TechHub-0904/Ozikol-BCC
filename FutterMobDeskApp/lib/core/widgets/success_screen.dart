import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'primary_button.dart';

/// Standardized action success / completion confirmation view.
/// Suitable for successful workspace enrollment, invite acceptance, and system setup milestones.
class SuccessScreen extends StatelessWidget {
  /// Prominent headline text.
  final String title;

  /// Explanatory message or subtitle.
  final String message;

  /// Text label for primary continuation button.
  final String buttonText;

  /// Callback executed when the primary button is tapped.
  final VoidCallback onButtonPressed;

  /// Optional icon to display inside the green circle badge (defaults to checkmark).
  final IconData icon;

  /// Creates a standard [SuccessScreen].
  const SuccessScreen({
    super.key,
    required this.title,
    required this.message,
    required this.buttonText,
    required this.onButtonPressed,
    this.icon = Icons.check_rounded,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const Spacer(),

              // Animated Pulse Badge
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: const BoxDecoration(
                      color: AppColors.success,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      icon,
                      size: 40,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 28),

              // Title
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.onBackgroundDark : AppColors.onBackgroundLight,
                ),
              ),

              const SizedBox(height: 12),

              // Message
              Text(
                message,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                  height: 1.5,
                ),
              ),

              const Spacer(),

              // Primary Action Button
              PrimaryButton(
                text: buttonText,
                onPressed: onButtonPressed,
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
