import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Primary action button styled with Ozikol royal blue gradient and built-in loading spinner.
class PrimaryButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final Widget? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final double height;
  final double borderRadius;
  final bool isFullWidth;
  final double? width;

  const PrimaryButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.height = 48.0,
    this.borderRadius = 12.0,
    this.isFullWidth = true,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveBg = backgroundColor ?? AppColors.primary;
    final effectiveText = textColor ?? Colors.white;
    final labelStyle = TextStyle(
      color: effectiveText,
      fontSize: 14,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.3,
    );

    // Builds the row content. The label is only made Flexible (with ellipsis) when the width is
    // bounded, because flex children assert inside unbounded parents such as a plain Row.
    // This prevents right-overflow when the spinner and a long (or translated) label share the row.
    Widget buildContent(bool bounded) => Row(
          mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (isLoading) ...[
              SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  valueColor: AlwaysStoppedAnimation<Color>(effectiveText),
                ),
              ),
              const SizedBox(width: 12),
            ] else if (icon != null) ...[
              icon!,
              const SizedBox(width: 8),
            ],
            if (bounded)
              Flexible(
                child: Text(
                  text,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: labelStyle,
                ),
              )
            else
              Text(text, style: labelStyle),
          ],
        );

    return LayoutBuilder(
      builder: (context, constraints) {
        // Guard against infinite width assertion when placed inside unconstrained horizontal layouts (e.g. Row).
        final canExpand = isFullWidth && constraints.hasBoundedWidth;
        final effectiveWidth = width ?? (canExpand ? double.infinity : null);

        return SizedBox(
          height: height,
          width: effectiveWidth,
          child: ElevatedButton(
            onPressed: isLoading ? null : onPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor: effectiveBg,
              foregroundColor: effectiveText,
              disabledBackgroundColor: effectiveBg.withAlpha(140),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(borderRadius),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24),
            ),
            child: buildContent(constraints.hasBoundedWidth || width != null),
          ),
        );
      },
    );
  }
}
