import 'dart:async';
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

/// Screen presenting the two-factor authentication challenge during login.
/// Prompts for a 6-digit TOTP or email/SMS OTP with trust-device persistence and resend timer.
class TwoFactorChallengeScreen extends ConsumerStatefulWidget {
  /// The organization workspace context.
  final Workspace workspace;

  /// The authenticating user ID.
  final String userId;

  /// The resolved preferred MFA provider (e.g. 'GoogleAuthenticator', 'Email', 'SMS').
  final String provider;

  /// The email address of the user.
  final String email;

  /// Creates a [TwoFactorChallengeScreen].
  const TwoFactorChallengeScreen({
    super.key,
    required this.workspace,
    required this.userId,
    required this.provider,
    required this.email,
  });

  @override
  ConsumerState<TwoFactorChallengeScreen> createState() => _TwoFactorChallengeScreenState();
}

class _TwoFactorChallengeScreenState extends ConsumerState<TwoFactorChallengeScreen> {
  final _codeController = TextEditingController();
  bool _trustDevice = false;
  bool _isSubmitting = false;
  bool _isResending = false;
  String? _errorMessage;
  int _resendCooldown = 30;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startCooldownTimer();
  }

  void _startCooldownTimer() {
    setState(() => _resendCooldown = 30);
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_resendCooldown > 0) {
        setState(() => _resendCooldown--);
      } else {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _handleVerify() async {
    final code = _codeController.text.trim();
    if (code.length < 6) {
      setState(() => _errorMessage = 'Please enter the complete 6-digit verification code.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final authService = ref.read(authServiceProvider);
      final result = await authService.verifyLoginMfa(
        userId: widget.userId,
        code: code,
        trustDevice: _trustDevice,
        tenantKey: widget.workspace.tenantKey,
      );

      final authMap = (result['auth'] ?? result['Auth']) is Map
          ? Map<String, dynamic>.from((result['auth'] ?? result['Auth']) as Map)
          : result;

      // Persist Device Trust Token if the user opted to trust this device
      final trustToken = (result['trustToken'] ?? result['TrustToken'])?.toString();
      if (_trustDevice && trustToken != null && trustToken.isNotEmpty) {
        final storage = ref.read(storageServiceProvider);
        await storage.setDeviceTrustToken(trustToken, widget.workspace.tenantKey);
      }

      final token = (authMap['token'] ?? authMap['Token']) as String?;
      final fullName = (authMap['fullName'] ?? authMap['FullName'] ?? authMap['userName']) as String?;
      final roles = ((authMap['roles'] ?? authMap['Roles']) as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
      final effectivePerms = (authMap['effectivePermissions'] ?? authMap['EffectivePermissions']) is Map
          ? Map<String, dynamic>.from((authMap['effectivePermissions'] ?? authMap['EffectivePermissions']) as Map)
          : <String, dynamic>{};
      final licensedFeatures = ((authMap['licensedTenantFeatures'] ?? authMap['LicensedTenantFeatures'] ?? authMap['licensedFeatures']) as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          <String>[];

      // Automatically default SuperAdmin and Administrators to Administration Console mode
      final canAccessAdmin = (effectivePerms['canAccessAdminConsole'] == true) ||
          roles.any((r) => [
                'superadmin',
                'admin',
                'administrator',
                'identitymanager',
                'cmsmanager',
                'editor',
                'featureedit',
                'systemadministrator'
              ].contains(r.toLowerCase().trim()));
      final defaultMode = canAccessAdmin ? 'administration' : 'workspace';

      final updatedWorkspace = widget.workspace.copyWith(
        authToken: token,
        userId: widget.userId,
        userEmail: widget.email,
        userFullName: fullName,
        userRoles: roles,
        effectivePermissions: effectivePerms,
        licensedFeatures: licensedFeatures,
        activeConsoleMode: defaultMode,
        lastAccessed: DateTime.now(),
      );

      final notifier = ref.read(workspaceStateProvider.notifier);
      await notifier.activateAuthenticatedWorkspace(updatedWorkspace);

      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const DashboardShellScreen()),
          (route) => false,
        );
      }
    } catch (e) {
      setState(() {
        _isSubmitting = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '').trim();
      });
    }
  }

  Future<void> _handleResend() async {
    if (_resendCooldown > 0 || _isResending) return;

    setState(() {
      _isResending = true;
      _errorMessage = null;
    });

    try {
      final authService = ref.read(authServiceProvider);
      final msg = await authService.resendLoginMfa(
        userId: widget.userId,
        tenantKey: widget.workspace.tenantKey,
      );

      if (mounted) {
        _startCooldownTimer();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 16),
                const SizedBox(width: 8),
                Expanded(child: Text(msg)),
              ],
            ),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      setState(() => _errorMessage = e.toString().replaceFirst('Exception: ', '').trim());
    } finally {
      if (mounted) setState(() => _isResending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isAppTotp = widget.provider.contains('Authenticator');

    return DesktopAuthLayout(
      workspace: widget.workspace,
      title: 'Two-Factor Authentication',
      subtitle: isAppTotp
          ? 'Enter the 6-digit security code generated by your authenticator app.'
          : 'A 6-digit verification code has been dispatched to your registered address.',
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
            Icons.shield_rounded,
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

                        // 6-Digit Code Field
                        CustomTextField(
                          controller: _codeController,
                          label: 'Verification Code',
                          placeholder: '123456',
                          prefixIcon: const Icon(Icons.lock_clock_outlined, size: 20, color: AppColors.primary),
                          keyboardType: TextInputType.number,
                          onSubmitted: (_) => _handleVerify(),
                        ),
                        const SizedBox(height: 12),

                        // Trust this device checkbox
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          value: _trustDevice,
                          onChanged: (val) => setState(() => _trustDevice = val ?? false),
                          title: Text(
                            'Trust this device for 30 days',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                            ),
                          ),
                          controlAffinity: ListTileControlAffinity.leading,
                          dense: true,
                        ),
                        const SizedBox(height: 20),

                        // Verify Action Button
                        PrimaryButton(
                          text: 'Verify & Sign In',
                          isLoading: _isSubmitting,
                          onPressed: _handleVerify,
                        ),
                        const SizedBox(height: 16),

                        // Resend Code (if email/SMS)
                        if (!isAppTotp) ...[
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                "Didn't receive a code? ",
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                                ),
                              ),
                              TextButton(
                                onPressed: (_resendCooldown > 0 || _isResending) ? null : _handleResend,
                                child: Text(
                                  _resendCooldown > 0 ? 'Resend in ${_resendCooldown}s' : 'Resend Code',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: _resendCooldown > 0 ? Colors.grey : AppColors.primary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                        ],

                        // Cancel / Back to Login
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
                    ),
    );
  }
}
