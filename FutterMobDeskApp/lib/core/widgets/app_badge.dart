import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Reusable status and notification badge component.
/// Supports numerical counts, short pill labels, and severity indicators.
class AppBadge extends StatelessWidget {
  /// Display text or count inside the badge.
  final String text;

  /// Background fill color. Defaults to error/danger red.
  final Color backgroundColor;

  /// Text color. Defaults to white.
  final Color textColor;

  /// Minimum height/width dimension of the circular pill.
  final double size;

  /// Internal padding for pill badges with longer text.
  final EdgeInsetsGeometry padding;

  /// Creates a standardized [AppBadge].
  const AppBadge({
    super.key,
    required this.text,
    this.backgroundColor = AppColors.error,
    this.textColor = Colors.white,
    this.size = 18,
    this.padding = const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
  });

  /// Factory constructor for multi-channel severity levels (Rule 16: info, success, warning, danger, urgent, critical).
  factory AppBadge.severity(String text, String severity) {
    Color bg;
    Color fg = Colors.white;

    switch (severity.toLowerCase()) {
      case 'success':
        bg = AppColors.success;
        break;
      case 'warning':
        bg = AppColors.warning;
        fg = Colors.black;
        break;
      case 'danger':
      case 'urgent':
      case 'critical':
        bg = AppColors.error;
        break;
      case 'info':
      default:
        bg = AppColors.info;
        break;
    }

    return AppBadge(
      text: text,
      backgroundColor: bg,
      textColor: fg,
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool isSingleChar = text.length <= 1;

    return Container(
      constraints: BoxConstraints(
        minWidth: size,
        minHeight: size,
      ),
      padding: isSingleChar ? const EdgeInsets.all(2) : padding,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: Colors.white,
          width: 1.5,
        ),
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: TextStyle(
          color: textColor,
          fontSize: isSingleChar ? 11 : 10,
          fontWeight: FontWeight.w700,
          height: 1,
        ),
      ),
    );
  }
}

/// Compact circular dot badge for unread activity indicators.
class AppDotBadge extends StatelessWidget {
  /// Fill color of the indicator dot.
  final Color color;

  /// Diameter of the indicator dot.
  final double size;

  /// Creates an unread status [AppDotBadge].
  const AppDotBadge({
    super.key,
    this.color = AppColors.error,
    this.size = 10,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(
          color: Colors.white,
          width: 1.5,
        ),
      ),
    );
  }
}
