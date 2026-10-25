import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_colors.dart';
import 'app_snackbar.dart';

/// Form text field with clean styling, professional placeholders, clipboard paste support,
/// and optional password visibility toggle.
class CustomTextField extends StatefulWidget {
  final TextEditingController? controller;
  final String? initialValue;
  final String label;
  final String placeholder;
  final String? helperText;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final bool isPassword;
  final TextInputType keyboardType;
  final TextInputAction textInputAction;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final void Function(String)? onSubmitted;
  final bool autofocus;
  final bool enabled;
  final bool showPasteButton;
  final Iterable<String>? autofillHints;
  final List<TextInputFormatter>? inputFormatters;

  const CustomTextField({
    super.key,
    this.controller,
    this.initialValue,
    required this.label,
    required this.placeholder,
    this.helperText,
    this.prefixIcon,
    this.suffixIcon,
    this.isPassword = false,
    this.keyboardType = TextInputType.text,
    this.textInputAction = TextInputAction.next,
    this.validator,
    this.onChanged,
    this.onSubmitted,
    this.autofocus = false,
    this.enabled = true,
    this.showPasteButton = false,
    this.autofillHints,
    this.inputFormatters,
  });

  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}

class _CustomTextFieldState extends State<CustomTextField> {
  late bool _obscureText;
  TextEditingController? _internalController;

  TextEditingController get _effectiveController =>
      widget.controller ?? (_internalController ??= TextEditingController(text: widget.initialValue ?? ''));

  @override
  void initState() {
    super.initState();
    _obscureText = widget.isPassword;
    if (widget.controller == null && widget.initialValue != null) {
      _internalController = TextEditingController(text: widget.initialValue);
    }
    _effectiveController.addListener(_onTextChanged);
  }

  @override
  void didUpdateWidget(covariant CustomTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller?.removeListener(_onTextChanged);
      _effectiveController.addListener(_onTextChanged);
    }
  }

  @override
  void dispose() {
    _effectiveController.removeListener(_onTextChanged);
    _internalController?.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  /// Pastes text directly from system clipboard into the input field
  Future<void> _pasteFromClipboard() async {
    try {
      final clipboardData = await Clipboard.getData(Clipboard.kTextPlain);
      var pastedText = clipboardData?.text?.trim();

      if (pastedText != null && pastedText.isNotEmpty) {
        // If this is an OTP or verification code field, extract digits if a full SMS/text message was copied
        final isOtpField = widget.keyboardType == TextInputType.number ||
            (widget.autofillHints?.contains(AutofillHints.oneTimeCode) ?? false);
        if (isOtpField) {
          // Check for standard 6-digit standalone code
          final sixDigitMatch = RegExp(r'\b\d{6}\b').firstMatch(pastedText);
          if (sixDigitMatch != null) {
            pastedText = sixDigitMatch.group(0)!;
          } else {
            // Check for hyphenated codes e.g. 123-456 or 123 456
            final formattedMatch = RegExp(r'\b\d{3}[-\s]\d{3}\b').firstMatch(pastedText);
            if (formattedMatch != null) {
              pastedText = formattedMatch.group(0)!.replaceAll(RegExp(r'[-\s]'), '');
            } else {
              // Check for any 4 to 8 digit code sequence in the message
              final digitMatch = RegExp(r'\b\d{4,8}\b').firstMatch(pastedText);
              if (digitMatch != null) {
                pastedText = digitMatch.group(0)!;
              } else {
                final digitsOnly = pastedText.replaceAll(RegExp(r'\D'), '');
                if (digitsOnly.length >= 4 && digitsOnly.length <= 8) {
                  pastedText = digitsOnly;
                }
              }
            }
          }
        }

        final ctrl = _effectiveController;
        ctrl.text = pastedText;
        ctrl.selection = TextSelection.collapsed(offset: pastedText.length);
        widget.onChanged?.call(pastedText);

        if (mounted) {
          AppSnackBar.showInfo(
            context,
            'Pasted: ${pastedText.length > 35 ? "${pastedText.substring(0, 35)}..." : pastedText}',
          );
        }
      } else {
        if (mounted) {
          AppSnackBar.showWarning(context, 'Clipboard is empty or does not contain text.');
        }
      }
    } catch (_) {
      if (mounted) {
        AppSnackBar.showError(context, 'Unable to read from clipboard.');
      }
    }
  }

  Widget? _buildSuffixIcon(bool isDark) {
    if (widget.isPassword) {
      if (widget.showPasteButton) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Tooltip(
              message: 'Paste from clipboard',
              child: IconButton(
                icon: const Icon(Icons.content_paste_rounded, size: 18),
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                onPressed: _pasteFromClipboard,
              ),
            ),
            IconButton(
              icon: Icon(
                _obscureText ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                size: 20,
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              ),
              onPressed: () => setState(() => _obscureText = !_obscureText),
            ),
          ],
        );
      }

      return IconButton(
        icon: Icon(
          _obscureText ? Icons.visibility_outlined : Icons.visibility_off_outlined,
          size: 20,
          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
        ),
        onPressed: () => setState(() => _obscureText = !_obscureText),
      );
    }

    if (widget.suffixIcon != null) {
      return widget.suffixIcon;
    }

    if (widget.showPasteButton) {
      final hasText = _effectiveController.text.isNotEmpty;

      if (!hasText) {
        return Tooltip(
          message: 'Paste from clipboard',
          child: IconButton(
            icon: const Icon(Icons.content_paste_rounded, size: 20),
            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            onPressed: _pasteFromClipboard,
          ),
        );
      }

      // When field has text, show clear button and paste to replace button
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Tooltip(
            message: 'Clear input',
            child: IconButton(
              icon: const Icon(Icons.close_rounded, size: 18),
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              onPressed: () {
                _effectiveController.clear();
                widget.onChanged?.call('');
                setState(() {});
              },
            ),
          ),
          Tooltip(
            message: 'Paste to replace',
            child: IconButton(
              icon: const Icon(Icons.content_paste_rounded, size: 18),
              color: AppColors.primary,
              onPressed: _pasteFromClipboard,
            ),
          ),
        ],
      );
    }

    return null;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasMultiSuffix = (widget.showPasteButton && !widget.isPassword && _effectiveController.text.isNotEmpty) ||
        (widget.showPasteButton && widget.isPassword);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          widget.label,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 13,
            color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
            letterSpacing: 0.2,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _effectiveController,
          obscureText: _obscureText,
          keyboardType: widget.keyboardType,
          textInputAction: widget.textInputAction,
          validator: widget.validator,
          onChanged: widget.onChanged,
          onFieldSubmitted: widget.onSubmitted,
          autofocus: widget.autofocus,
          enabled: widget.enabled,
          autofillHints: widget.autofillHints,
          inputFormatters: widget.inputFormatters,
          enableInteractiveSelection: true,
          contextMenuBuilder: (BuildContext context, EditableTextState editableTextState) {
            return AdaptiveTextSelectionToolbar.editableText(
              editableTextState: editableTextState,
            );
          },
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: isDark ? AppColors.onBackgroundDark : AppColors.onBackgroundLight,
          ),
          decoration: InputDecoration(
            isDense: true,
            constraints: const BoxConstraints(minHeight: 48),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            hintText: widget.placeholder,
            hintStyle: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w400,
              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
            ),
            helperText: widget.helperText,
            prefixIcon: widget.prefixIcon != null
                ? Padding(
                    padding: const EdgeInsets.only(left: 14, right: 10),
                    child: widget.prefixIcon,
                  )
                : null,
            prefixIconConstraints: const BoxConstraints(minWidth: 44, minHeight: 44),
            suffixIcon: _buildSuffixIcon(isDark),
            suffixIconConstraints: BoxConstraints(
              minWidth: hasMultiSuffix ? 80 : 44,
              minHeight: 44,
            ),
          ),
        ),
      ],
    );
  }
}
