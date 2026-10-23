import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// <summary>
/// Professional dropdown form field component designed to achieve 1-to-1 visual,
/// spatial, and typographical parity with [CustomTextField].
/// Guarantees consistent label styles, border radii, padding, and focus states.
/// </summary>
class CustomDropdownField<T> extends StatelessWidget {
  /// <summary>
  /// The currently selected value of the dropdown.
  /// </summary>
  final T? value;

  /// <summary>
  /// The field title label displayed directly above the dropdown input.
  /// </summary>
  final String label;

  /// <summary>
  /// Optional placeholder/hint text rendered when [value] is null.
  /// </summary>
  final String? placeholder;

  /// <summary>
  /// Optional helper text displayed below the field.
  /// </summary>
  final String? helperText;

  /// <summary>
  /// List of selectable dropdown items.
  /// </summary>
  final List<DropdownMenuItem<T>> items;

  /// <summary>
  /// Callback triggered when a new item is selected.
  /// </summary>
  final ValueChanged<T?>? onChanged;

  /// <summary>
  /// Optional form validation callback.
  /// </summary>
  final FormFieldValidator<T>? validator;

  /// <summary>
  /// Whether user interaction with the dropdown is enabled.
  /// </summary>
  final bool enabled;

  /// <summary>
  /// Whether the dropdown menu should expand to fill the horizontal layout width.
  /// </summary>
  final bool isExpanded;

  /// <summary>
  /// Creates a [CustomDropdownField] instance.
  /// </summary>
  /// <param name="label">The field title label.</param>
  /// <param name="items">The selectable items.</param>
  /// <param name="value">The initially selected value.</param>
  /// <param name="placeholder">The hint text placeholder.</param>
  /// <param name="helperText">Optional explanatory helper text.</param>
  /// <param name="onChanged">Selection change listener.</param>
  /// <param name="validator">Input validator function.</param>
  /// <param name="enabled">Whether interaction is allowed.</param>
  /// <param name="isExpanded">Whether to fill maximum width.</param>
  const CustomDropdownField({
    super.key,
    required this.label,
    required this.items,
    this.value,
    this.placeholder,
    this.helperText,
    this.onChanged,
    this.validator,
    this.enabled = true,
    this.isExpanded = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Standardized Field Label (identical to CustomTextField)
        Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 13,
            color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
            letterSpacing: 0.2,
          ),
        ),
        const SizedBox(height: 8),

        // Standardized Dropdown Input Decorator
        DropdownButtonFormField<T>(
          initialValue: value,
          items: items,
          onChanged: enabled ? onChanged : null,
          validator: validator,
          isExpanded: isExpanded,
          isDense: true,
          dropdownColor: isDark ? AppColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(12),
          icon: Icon(
            Icons.keyboard_arrow_down_rounded,
            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            size: 20,
          ),
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: isDark ? AppColors.onBackgroundDark : AppColors.onBackgroundLight,
          ),
          hint: placeholder != null
              ? Text(
                  placeholder!,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w400,
                    color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                  ),
                )
              : null,
          decoration: InputDecoration(
            isDense: true,
            constraints: const BoxConstraints(minHeight: 48),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            helperText: helperText,
            filled: true,
            fillColor: isDark ? const Color(0xFF151F30) : AppColors.surfaceLight,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF6EA2FF) : AppColors.primary,
                width: 2,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.error),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.error, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}
