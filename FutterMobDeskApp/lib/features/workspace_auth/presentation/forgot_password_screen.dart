import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/workspace.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/desktop_auth_layout.dart';
import '../../../core/widgets/custom_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/auth_service.dart';
import '../state/workspace_state.dart';

/// Screen guiding users through password recovery via email verification token / OTP.
/// Includes dynamic password strength criteria validation and clean two-step progression.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  /// The target workspace organization context.
  final Workspace workspace;

  /// Creates a [ForgotPasswordScreen].
  const ForgotPasswordScreen({
    super.key,
    required this.workspace,
  });

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  int _currentStep = 1; // 1 = Enter Email, 2 = Enter Token & New Password, 3 = Success
  final _emailController = TextEditingController();
  final _tokenController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isSubmitting = false;
  String? _errorMessage;
  String? _successMessage;

  // Password complexity rules state
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
    _emailController.dispose();
    _tokenController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleRequestOtp() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _errorMessage = 'Please enter a valid work email address.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final authService = ref.read(authServiceProvider);
      final msg = await authService.requestPasswordResetOtp(
        email: email,
        tenantKey: widget.workspace.tenantKey,
      );

      setState(() {
        _currentStep = 2;
        _isSubmitting = false;
        _successMessage = msg;
      });
    } catch (e) {
      setState(() {
        _isSubmitting = false;
        _errorMessage = WorkspaceNotifier.sanitizeError(e);
      });
    }
  }

  Future<void> _handleResetPassword() async {
    final token = _tokenController.text.trim();
    final newPassword = _newPasswordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (token.isEmpty) {
      setState(() => _errorMessage = 'Please enter the reset code sent to your email.');
      return;
    }

    if (!_hasMinLength || !_hasUppercase || !_hasNumber || !_hasSpecialChar) {
      setState(() => _errorMessage = 'Password does not satisfy all complexity requirements.');
      return;
    }

    if (newPassword != confirmPassword) {
      setState(() => _errorMessage = 'New password and confirmation do not match.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final authService = ref.read(authServiceProvider);
      await authService.resetPasswordWithToken(
        email: _emailController.text.trim(),
        token: token,
        newPassword: newPassword,
        tenantKey: widget.workspace.tenantKey,
      );

      setState(() {
        _currentStep = 3;
        _isSubmitting = false;
      });
    } catch (e) {
      setState(() {
        _isSubmitting = false;
        _errorMessage = WorkspaceNotifier.sanitizeError(e);
      });
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

    return DesktopAuthLayout(
      workspace: widget.workspace,
      title: _currentStep == 3 ? 'Password Reset Complete' : 'Reset Password',
      subtitle: _currentStep == 1
          ? 'Enter your registered work email to receive password reset instructions.'
          : (_currentStep == 2
              ? 'Enter the security code sent to ${_emailController.text.trim()} along with your new password.'
              : 'Your password has been successfully reset. You can now sign in.'),
      onBackTap: () => Navigator.of(context).pop(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
                        // Error Banner
                        if (_errorMessage != null) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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

                        // Step 1: Request OTP
                        if (_currentStep == 1) ...[
                          CustomTextField(
                            controller: _emailController,
                            label: 'Work Email Address',
                            placeholder: 'name@company.com',
                            prefixIcon: const Icon(Icons.email_outlined, size: 20, color: AppColors.primary),
                            keyboardType: TextInputType.emailAddress,
                            onSubmitted: (_) => _handleRequestOtp(),
                          ),
                          const SizedBox(height: 24),
                          PrimaryButton(
                            text: 'Send Reset Instructions',
                            isLoading: _isSubmitting,
                            onPressed: _handleRequestOtp,
                          ),
                        ],

                        // Step 2: Reset Form
                        if (_currentStep == 2) ...[
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
                          CustomTextField(
                            controller: _tokenController,
                            label: 'Reset Code',
                            placeholder: 'e.g. 6-digit code or reset token',
                            prefixIcon: const Icon(Icons.pin_outlined, size: 20, color: AppColors.primary),
                          ),
                          const SizedBox(height: 16),
                          CustomTextField(
                            controller: _newPasswordController,
                            label: 'New Password',
                            placeholder: 'Create a strong password',
                            prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.primary),
                            isPassword: true,
                          ),
                          const SizedBox(height: 12),
                          // Complexity rules strip
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
                                  'Password Requirements:',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? AppColors.gray400 : AppColors.gray600,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                _buildComplexityRow('At least 8 characters', _hasMinLength),
                                _buildComplexityRow('At least one uppercase letter (A-Z)', _hasUppercase),
                                _buildComplexityRow('At least one numeric digit (0-9)', _hasNumber),
                                _buildComplexityRow('At least one special symbol (!@#\$%)', _hasSpecialChar),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          CustomTextField(
                            controller: _confirmPasswordController,
                            label: 'Confirm New Password',
                            placeholder: 'Re-enter your new password',
                            prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.primary),
                            isPassword: true,
                            onSubmitted: (_) => _handleResetPassword(),
                          ),
                          const SizedBox(height: 24),
                          PrimaryButton(
                            text: 'Update Password',
                            isLoading: _isSubmitting,
                            onPressed: _handleResetPassword,
                          ),
                        ],

                        // Step 3: Success Confirmation
                        if (_currentStep == 3) ...[
                          Center(
                            child: Container(
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                color: AppColors.success.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.check_circle_rounded,
                                size: 36,
                                color: AppColors.success,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Center(
                            child: Text(
                              'Password Updated Successfully!',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Center(
                            child: Text(
                              'Your credentials have been securely updated. You can now sign into your organization workspace.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? AppColors.gray400 : AppColors.gray600,
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          PrimaryButton(
                            text: 'Back to Sign In',
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                        ],

                        if (_currentStep != 3) ...[
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(),
                            child: Text(
                              'Back to Sign In',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: isDark ? AppColors.gray400 : AppColors.gray600,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
    );
  }
}
