import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Clean on-screen numeric keypad for quick PIN or numerical entry.
class PinKeyboard extends StatelessWidget {
  /// Callback invoked when a numeric digit is tapped.
  final ValueChanged<String> onKeyTap;

  /// Callback invoked when the backspace key is tapped.
  final VoidCallback onBackspace;

  /// Optional callback invoked when the biometric action icon is tapped.
  final VoidCallback? onBiometricTap;

  /// Whether the keyboard accepts input.
  final bool enabled;

  /// Whether the biometric icon should be displayed instead of an empty slot.
  final bool biometricEnabled;

  /// Creates a standard [PinKeyboard].
  const PinKeyboard({
    super.key,
    required this.onKeyTap,
    required this.onBackspace,
    this.onBiometricTap,
    this.enabled = true,
    this.biometricEnabled = false,
  });

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final keySize = (screenWidth * 0.18).clamp(58.0, 72.0);
    final numberFontSize = (keySize * 0.34).clamp(22.0, 26.0);
    final iconSize = (keySize * 0.34).clamp(22.0, 28.0);
    final rowSpacing = (screenWidth * 0.025).clamp(8.0, 12.0);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _buildRow(
          context: context,
          values: const ['1', '2', '3'],
          keySize: keySize,
          numberFontSize: numberFontSize,
        ),
        SizedBox(height: rowSpacing),
        _buildRow(
          context: context,
          values: const ['4', '5', '6'],
          keySize: keySize,
          numberFontSize: numberFontSize,
        ),
        SizedBox(height: rowSpacing),
        _buildRow(
          context: context,
          values: const ['7', '8', '9'],
          keySize: keySize,
          numberFontSize: numberFontSize,
        ),
        SizedBox(height: rowSpacing),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildActionButton(
              context: context,
              icon: Icons.fingerprint,
              onTap: biometricEnabled && enabled ? onBiometricTap : null,
              isVisible: biometricEnabled,
              keySize: keySize,
              iconSize: iconSize,
            ),
            _buildKey(
              context: context,
              value: '0',
              keySize: keySize,
              numberFontSize: numberFontSize,
            ),
            _buildActionButton(
              context: context,
              icon: Icons.backspace_outlined,
              onTap: enabled ? onBackspace : null,
              isVisible: true,
              keySize: keySize,
              iconSize: iconSize,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRow({
    required BuildContext context,
    required List<String> values,
    required double keySize,
    required double numberFontSize,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: values
          .map(
            (val) => _buildKey(
              context: context,
              value: val,
              keySize: keySize,
              numberFontSize: numberFontSize,
            ),
          )
          .toList(),
    );
  }

  Widget _buildKey({
    required BuildContext context,
    required String value,
    required double keySize,
    required double numberFontSize,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: enabled ? () => onKeyTap(value) : null,
        borderRadius: BorderRadius.circular(keySize / 2),
        child: Container(
          width: keySize,
          height: keySize,
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            shape: BoxShape.circle,
            border: Border.all(
              color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            value,
            style: TextStyle(
              fontSize: numberFontSize,
              fontWeight: FontWeight.w600,
              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required BuildContext context,
    required IconData icon,
    required VoidCallback? onTap,
    required bool isVisible,
    required double keySize,
    required double iconSize,
  }) {
    if (!isVisible) {
      return SizedBox(width: keySize, height: keySize);
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(keySize / 2),
        child: Container(
          width: keySize,
          height: keySize,
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            shape: BoxShape.circle,
            border: Border.all(
              color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
            ),
          ),
          alignment: Alignment.center,
          child: Icon(
            icon,
            size: iconSize,
            color: AppColors.primary,
          ),
        ),
      ),
    );
  }
}
