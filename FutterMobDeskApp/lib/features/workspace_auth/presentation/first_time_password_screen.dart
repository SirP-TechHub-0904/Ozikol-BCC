import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/workspace.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/desktop_auth_layout.dart';
import '../../../core/widgets/custom_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../../dashboard/presentation/dashboard_shell_screen.dart';
import '../data/auth_service.dart';
import '../state/workspace_state.dart';

/// Screen enforcing a mandatory password update on initial login when `MustChangePassword` is active.
class FirstTimePasswordScreen extends ConsumerStatefulWidget {
  /// The organization workspace context.
  final Workspace workspace;

  /// The email address of the authenticated member.
  final String email;

  /// The initial/temporary password entered during login.
  final String temporaryPassword;

  /// Creates a [FirstTimePasswordScreen].
  const FirstTimePasswordScreen({
    super.key,
    required this.workspace,
    required this.email,
    required this.temporaryPassword,
  });

  @override
  ConsumerState<FirstTimePasswordScreen> createState() => _FirstTimePasswordScreenState();
}

class _FirstTimePasswordScreenState extends ConsumerState<FirstTimePasswordScreen> {
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isSubmitting = false;
  String? _errorMessage;

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
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleForceChange() async {
    final newPassword = _newPasswordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (!_hasMinLength || !_hasUppercase || !_hasNumber || !_hasSpecialChar) {
      setState(() => _errorMessage = 'Password does not satisfy all security requirements.');
      return;
    }

    if (newPassword != confirmPassword) {
      setState(() => _errorMessage = 'New password and confirmation do not match.');
      return;
    }

    if (newPassword == widget.temporaryPassword) {
      setState(() => _errorMessage = 'New password cannot be identical to your temporary password.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final authService = ref.read(authServiceProvider);
      await authService.forceChangePassword(
        oldPassword: widget.temporaryPassword,
        newPassword: newPassword,
        tenantKey: widget.workspace.tenantKey,
      );

      // Re-login with the updated credentials to ensure all tokens and state reflect the change
      final notifier = ref.read(workspaceStateProvider.notifier);
      final outcome = await notifier.login(
        email: widget.email,
        password: newPassword,
        targetWorkspace: widget.workspace,
      );

      if (outcome.isSuccess && mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const DashboardShellScreen()),
          (route) => false,
        );
      }
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
      title: 'Change Initial Password',
      subtitle: 'For your security, please replace your temporary password with a personalized, strong password.',
      onBackTap: () => Navigator.of(context).pop(),
      cardAvatar: Center(
        child: Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.key_rounded,
            size: 26,
            color: AppColors.primary,
          ),
        ),
      ),
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

                        // New Password Field
                        CustomTextField(
                          controller: _newPasswordController,
                          label: 'New Personalized Password',
                          placeholder: 'Enter new password',
                          prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.primary),
                          isPassword: true,
                        ),
                        const SizedBox(height: 12),

                        // Complexity Rules
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

                        // Confirm Password Field
                        CustomTextField(
                          controller: _confirmPasswordController,
                          label: 'Confirm New Password',
                          placeholder: 'Re-enter your new password',
                          prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.primary),
                          isPassword: true,
                          onSubmitted: (_) => _handleForceChange(),
                        ),
                        const SizedBox(height: 24),

                        // Submit Button
                        PrimaryButton(
                          text: 'Save Password & Enter Workspace',
                          isLoading: _isSubmitting,
                          onPressed: _handleForceChange,
                        ),
                      ],
                    ),
    );
  }
}
