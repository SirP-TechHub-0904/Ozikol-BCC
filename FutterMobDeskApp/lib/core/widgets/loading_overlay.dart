import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Translucent backdrop loading barrier with optional blur and status message.
/// Disables user interaction while asynchronous operations are underway.
class LoadingOverlay extends StatelessWidget {
  /// Whether the loading barrier should be displayed.
  final bool isLoading;

  /// Underlying child widget content.
  final Widget child;

  /// Optional contextual message (e.g. "Signing into workspace...").
  final String? message;

  /// Creates a [LoadingOverlay] covering [child] when [isLoading] is true.
  const LoadingOverlay({
    super.key,
    required this.isLoading,
    required this.child,
    this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (isLoading)
          Positioned.fill(
            child: ClipRect(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 4, sigmaY: 4),
                child: Container(
                  color: AppColors.black.withValues(alpha: 0.35),
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceDark.withValues(alpha: 0.85),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: AppColors.glassBorderLight,
                          width: 1,
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const CircularProgressIndicator(
                            strokeWidth: 3,
                            color: AppColors.primary,
                          ),
                          if (message != null) ...[
                            const SizedBox(height: 16),
                            Text(
                              message!,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
