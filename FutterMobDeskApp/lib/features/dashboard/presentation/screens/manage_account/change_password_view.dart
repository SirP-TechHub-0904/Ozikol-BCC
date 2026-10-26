import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/custom_text_field.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../../notifications/data/notification_service.dart';
import '../../../../workspace_auth/data/auth_service.dart';
import '../../../../workspace_auth/state/workspace_state.dart';
import 'widgets/account_security_header.dart';

/// Screen enabling authenticated members to update their account password.
class ChangePasswordView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Callback to switch account navigation tabs.
  final ValueChanged<String>? onSelectTab;

  /// Creates a [ChangePasswordView].
  const ChangePasswordView({
    super.key,
    this.workspace,
    this.onSelectTab,
  });

  @override
  ConsumerState<ChangePasswordView> createState() => _ChangePasswordViewState();
}

class _ChangePasswordViewState extends ConsumerState<ChangePasswordView> {
  final _oldPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isSubmitting = false;
  String? _errorMessage;
  String? _successMessage;

  bool _hasMinLength = false;
  bool _hasUppercase = false;
  bool _hasNumber = false;
  bool _hasSpecialChar = false;

  @override
  void initState() {
    super.initState();
    _newPasswordController.addListener(_checkPasswordComplexity);
  }

  void _checkPasswordComplexity() {
    final text = _newPasswordController.text;
    setState(() {
      _hasMinLength = text.length >= 8;
      _hasUppercase = text.contains(RegExp(r'[A-Z]'));
      _hasNumber = text.contains(RegExp(r'[0-9]'));
      _hasSpecialChar = text.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'));
    });
  }

  @override
  void dispose() {
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  /// Displays a floating bottom SnackBar notification for user action feedback.
  ///
  /// <param name="message">The status message to present.</param>
  /// <param name="isSuccess">True if operation succeeded, false if error.</param>
  void _showBottomAlert(String message, {required bool isSuccess}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isSuccess ? Icons.check_circle_rounded : Icons.error_outline_rounded,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: isSuccess ? AppColors.success : AppColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        duration: const Duration(seconds: 4),
      ),
    );
  }

  /// Validates and submits the password change request to the API, displaying
  /// immediate dual-level feedback (inline card alert and bottom floating notification).
  Future<void> _handleChangePassword() async {
    final oldPassword = _oldPasswordController.text;
    final newPassword = _newPasswordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (oldPassword.isEmpty) {
      final msg = 'account.enter_current_password'.tr(ref, fallback: 'Please enter your current active password.');
      setState(() => _errorMessage = msg);
      _showBottomAlert(msg, isSuccess: false);
      return;
    }

    if (!_hasMinLength || !_hasUppercase || !_hasNumber || !_hasSpecialChar) {
      final msg = 'account.complexity_unmet'.tr(ref, fallback: 'New password does not satisfy all complexity requirements.');
      setState(() => _errorMessage = msg);
      _showBottomAlert(msg, isSuccess: false);
      return;
    }

    if (newPassword != confirmPassword) {
      final msg = 'account.passwords_do_not_match'.tr(ref, fallback: 'New password and confirmation do not match.');
      setState(() => _errorMessage = msg);
      _showBottomAlert(msg, isSuccess: false);
      return;
    }

    if (newPassword == oldPassword) {
      final msg = 'account.passwords_identical'.tr(ref, fallback: 'New password cannot be identical to your current password.');
      setState(() => _errorMessage = msg);
      _showBottomAlert(msg, isSuccess: false);
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final authService = ref.read(authServiceProvider);
      await authService.changePassword(
        oldPassword: oldPassword,
        newPassword: newPassword,
        tenantKey: widget.workspace?.tenantKey ?? '',
      );

      _oldPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();

      final successMsg = 'account.password_update_success'.tr(ref, fallback: 'Your password was successfully updated.');
      setState(() {
        _isSubmitting = false;
        _successMessage = successMsg;
      });

      // Show bottom alert banner so user doesn't need to scroll to top
      _showBottomAlert(successMsg, isSuccess: true);

      // Synchronize in-app notification center feed immediately
      ref.read(notificationProvider.notifier).loadFeed();
    } catch (e) {
      final errorMsg = WorkspaceNotifier.sanitizeError(e);
      setState(() {
        _isSubmitting = false;
        _errorMessage = errorMsg;
      });
      _showBottomAlert(errorMsg, isSuccess: false);
    }
  }

  Widget _buildComplexityRow(String label, bool isSatisfied) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        children: [
          Icon(
            isSatisfied ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
            size: 14,
            color: isSatisfied ? AppColors.success : Colors.grey,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: isSatisfied ? AppColors.success : Colors.grey,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Unified Account Header & Navigation Tabs
          AccountSecurityHeader(
            activeTab: 'password',
            onSelectTab: widget.onSelectTab,
            workspace: widget.workspace,
          ),
          const SizedBox(height: 20),

          // Success / Error Banner
          if (_successMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline_rounded, size: 18, color: AppColors.success),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _successMessage!,
                      style: const TextStyle(fontSize: 12, color: AppColors.success, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, size: 18, color: AppColors.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(fontSize: 12, color: AppColors.error, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Password Form Section Card matching Web DOM
          AccountSectionCard(
            icon: Icons.key_rounded,
            title: 'account.update_password'.tr(ref, fallback: 'Change Account Password'),
            description: 'account.change_password_desc'.tr(ref, fallback: 'Update your administrator password regularly to maintain workspace security.'),
            action: Tooltip(
              message: 'account.password_requirements'.tr(ref, fallback: 'Password Requirements'),
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.info_outline_rounded, size: 18, color: AppColors.primary),
              ),
            ),
            child: AutofillGroup(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CustomTextField(
                    controller: _oldPasswordController,
                    label: 'account.current_password'.tr(ref, fallback: 'Current Password'),
                    placeholder: '••••••••',
                    prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.primary),
                    isPassword: true,
                    showPasteButton: true,
                    autofillHints: const [AutofillHints.password],
                  ),
                  const SizedBox(height: 16),
                  CustomTextField(
                    controller: _newPasswordController,
                    label: 'account.new_password'.tr(ref, fallback: 'New Password'),
                    placeholder: 'ui.create_strong_password'.tr(ref, fallback: 'Create a strong password'),
                    prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.primary),
                    isPassword: true,
                    showPasteButton: true,
                    autofillHints: const [AutofillHints.newPassword],
                  ),
                  const SizedBox(height: 12),

                  // Complexity Checklist
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${'account.password_requirements'.tr(ref, fallback: 'Password Requirements')}:',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.gray400 : AppColors.gray600,
                          ),
                        ),
                        const SizedBox(height: 6),
                        _buildComplexityRow('account.req_length'.tr(ref, fallback: 'At least 8 characters'), _hasMinLength),
                        _buildComplexityRow('account.req_uppercase'.tr(ref, fallback: 'At least one uppercase letter (A-Z)'), _hasUppercase),
                        _buildComplexityRow('account.req_number'.tr(ref, fallback: 'At least one numeric digit (0-9)'), _hasNumber),
                        _buildComplexityRow('account.req_special'.tr(ref, fallback: 'At least one special symbol (!@#\$%)'), _hasSpecialChar),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  CustomTextField(
                    controller: _confirmPasswordController,
                    label: 'account.confirm_password'.tr(ref, fallback: 'Confirm New Password'),
                    placeholder: 'auth.reenter_new_password'.tr(ref, fallback: 'Re-enter your new password'),
                    prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.primary),
                    isPassword: true,
                    showPasteButton: true,
                    autofillHints: const [AutofillHints.newPassword],
                    onSubmitted: (_) => _handleChangePassword(),
                  ),
                  const SizedBox(height: 20),

                  // Bottom inline alert directly above the action button so user sees immediate feedback without scrolling
                  if (_successMessage != null || _errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                      decoration: BoxDecoration(
                        color: (_successMessage != null ? AppColors.success : AppColors.error).withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: (_successMessage != null ? AppColors.success : AppColors.error).withValues(alpha: 0.35),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _successMessage != null ? Icons.check_circle_outline_rounded : Icons.error_outline_rounded,
                            size: 18,
                            color: _successMessage != null ? AppColors.success : AppColors.error,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _successMessage ?? _errorMessage!,
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                                color: _successMessage != null ? AppColors.success : AppColors.error,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isMobile = constraints.maxWidth < 450;
                      return Align(
                        alignment: isMobile ? Alignment.center : Alignment.centerRight,
                        child: SizedBox(
                          width: isMobile ? double.infinity : null,
                          child: PrimaryButton(
                            isFullWidth: isMobile,
                            text: 'account.update_password'.tr(ref, fallback: 'Update Password'),
                            isLoading: _isSubmitting,
                            onPressed: _handleChangePassword,
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
