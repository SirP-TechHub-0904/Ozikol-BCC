import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Polished draggable handle bar placed at the top of modal bottom sheets.
class BottomSheetHandle extends StatelessWidget {
  /// Custom width of the handle bar.
  final double width;

  /// Custom height of the handle bar.
  final double height;

  /// Creates a standard modal [BottomSheetHandle].
  const BottomSheetHandle({
    super.key,
    this.width = 40,
    this.height = 4,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: Container(
        width: width,
        height: height,
        margin: const EdgeInsets.only(top: 8, bottom: 12),
        decoration: BoxDecoration(
          color: isDark ? AppColors.gray700 : AppColors.gray300,
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    );
  }
}
