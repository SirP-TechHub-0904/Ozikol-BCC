import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Central floating notification toast / snackbar dispatcher for Ozikol MIS.
/// Provides consistent visual feedback for success, error, warning, and info states.
class AppSnackBar {
  AppSnackBar._();

  /// Displays a floating success snackbar.
  static void showSuccess(BuildContext context, String message, {String? title}) {
    _show(
      context,
      message: message,
      title: title,
      backgroundColor: AppColors.success,
      icon: Icons.check_circle_outline_rounded,
    );
  }

  /// Displays a floating error/failure snackbar.
  static void showError(BuildContext context, String message, {String? title}) {
    _show(
      context,
      message: message,
      title: title,
      backgroundColor: AppColors.error,
      icon: Icons.error_outline_rounded,
    );
  }

  /// Displays a floating warning snackbar.
  static void showWarning(BuildContext context, String message, {String? title}) {
    _show(
      context,
      message: message,
      title: title,
      backgroundColor: AppColors.warning,
      icon: Icons.warning_amber_rounded,
      textColor: Colors.black,
    );
  }

  /// Displays a floating informational snackbar.
  static void showInfo(BuildContext context, String message, {String? title}) {
    _show(
      context,
      message: message,
      title: title,
      backgroundColor: AppColors.info,
      icon: Icons.info_outline_rounded,
    );
  }

  static void _show(
    BuildContext context, {
    required String message,
    required Color backgroundColor,
    required IconData icon,
    String? title,
    Color textColor = Colors.white,
    Duration duration = const Duration(seconds: 3),
  }) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: textColor, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (title != null) ...[
                    Text(
                      title,
                      style: TextStyle(
                        color: textColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 2),
                  ],
                  Text(
                    message,
                    style: TextStyle(
                      color: textColor,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        backgroundColor: backgroundColor,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 6,
        duration: duration,
      ),
    );
  }
}
