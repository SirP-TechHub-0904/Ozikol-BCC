import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/custom_text_field.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../../workspace_auth/data/auth_service.dart';
import '../../../../../core/widgets/page_header.dart';

/// Screen enabling users to configure, enroll, and manage Two-Factor Authentication (2FA).
class TwoFactorSecurityView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Creates a [TwoFactorSecurityView].
  const TwoFactorSecurityView({super.key, this.workspace});

  @override
  ConsumerState<TwoFactorSecurityView> createState() => _TwoFactorSecurityViewState();
}

class _TwoFactorSecurityViewState extends ConsumerState<TwoFactorSecurityView> {
  bool _isLoading = true;
  bool _isConfiguring = false;
  bool _isEnabling = false;
  bool _is2faEnabled = false;
  String _currentProvider = 'None';

  String? _secretKey;
  final _codeController = TextEditingController();

  String? _errorMessage;
  String? _successMessage;

  @override
  void initState() {
    super.initState();
    _loadMfaStatus();
  }

  Future<void> _loadMfaStatus() async {
    setState(() => _isLoading = true);
    try {
      final authService = ref.read(authServiceProvider);
      final res = await authService.getMfaStatus(tenantKey: widget.workspace?.tenantKey ?? '');
      setState(() {
        _is2faEnabled = res['mfaEnabled'] == true;
        _currentProvider = (res['provider'] ?? 'None').toString();
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _startConfiguration(String provider) async {
    setState(() {
      _isConfiguring = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final authService = ref.read(authServiceProvider);
      final res = await authService.configureMfa(
        provider: provider,
        tenantKey: widget.workspace?.tenantKey ?? '',
      );

      setState(() {
        _secretKey = res['secretKey']?.toString() ?? res['sharedKey']?.toString() ?? 'ABCDEF123456';
      });
    } catch (e) {
      setState(() {
        _isConfiguring = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '').trim();
      });
    }
  }

  Future<void> _handleVerifyActivation() async {
    final code = _codeController.text.trim();
    if (code.length < 6) {
      setState(() => _errorMessage = 'Please enter the complete 6-digit confirmation code.');
      return;
    }

    setState(() {
      _isEnabling = true;
      _errorMessage = null;
    });

    try {
      final authService = ref.read(authServiceProvider);
      await authService.verifyMfaActivation(
        provider: 'GoogleAuthenticator',
        code: code,
        tenantKey: widget.workspace?.tenantKey ?? '',
      );

      _codeController.clear();
      setState(() {
        _isEnabling = false;
        _isConfiguring = false;
        _is2faEnabled = true;
        _currentProvider = 'GoogleAuthenticator';
        _successMessage = 'Two-Factor Authentication activated successfully.';
      });
    } catch (e) {
      setState(() {
        _isEnabling = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '').trim();
      });
    }
  }

  Future<void> _handleDisable2FA() async {
    final messenger = ScaffoldMessenger.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Disable Two-Factor Authentication?'),
        content: const Text(
          'Are you sure you want to deactivate 2FA? Your workspace account will only be protected by your password credentials.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Disable 2FA'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final authService = ref.read(authServiceProvider);
      await authService.configureMfa(
        provider: 'None',
        tenantKey: widget.workspace?.tenantKey ?? '',
      );

      setState(() {
        _is2faEnabled = false;
        _currentProvider = 'None';
        _isConfiguring = false;
        _successMessage = 'Two-Factor Authentication disabled successfully.';
        _errorMessage = null;
      });

      if (mounted) {
        messenger.showSnackBar(
          const SnackBar(content: Text('Two-Factor Authentication disabled.')),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to disable 2FA. Please try again.';
      });
    }
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          // Shared PageHeader mold: top-level account destination, so no back control.
          PageHeader(
            icon: Icons.shield_outlined,
            eyebrow: 'Account Security',
            title: 'Two-Factor Authentication (2FA)',
            description: 'Fortify your account credentials by requiring a secondary verification step during sign-in.',
          ),
          const SizedBox(height: 24),

          // Messages
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

          // Status Card
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            ),
            child: Row(
              children: [
                Icon(
                  _is2faEnabled ? Icons.verified_user_rounded : Icons.gpp_maybe_rounded,
                  size: 36,
                  color: _is2faEnabled ? AppColors.success : AppColors.warning,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            _is2faEnabled ? '2FA Protection Active' : '2FA Protection Disabled',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: (_is2faEnabled ? AppColors.success : AppColors.warning).withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              _is2faEnabled ? 'Active' : 'Unprotected',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.bold,
                                color: _is2faEnabled ? AppColors.success : AppColors.warning,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _is2faEnabled
                            ? 'Your account is secured via $_currentProvider verification.'
                            : 'Enable two-factor authentication to safeguard your organization workspace from unauthorized access.',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: isDark ? AppColors.gray400 : AppColors.gray600,
                        ),
                      ),
                    ],
                  ),
                ),
                if (!_is2faEnabled && !_isConfiguring) ...[
                  const SizedBox(width: 12),
                  SizedBox(
                    width: 130,
                    child: PrimaryButton(
                      text: 'Enable 2FA',
                      height: 42,
                      onPressed: () => _startConfiguration('GoogleAuthenticator'),
                    ),
                  ),
                ] else if (_is2faEnabled && !_isConfiguring) ...[
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.lock_open_rounded, size: 16, color: AppColors.error),
                    label: const Text('Disable 2FA', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold, fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppColors.error.withValues(alpha: 0.4)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _handleDisable2FA,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Enrollment Wizard
          if (_isConfiguring) ...[
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.4), width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.qr_code_scanner_rounded, size: 20, color: AppColors.primary),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'Set Up Authenticator App',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '1. Open Google Authenticator, Microsoft Authenticator, or 1Password on your mobile device.\n'
                    '2. Scan the QR code or manually enter the secret setup key below.\n'
                    '3. Enter the 6-digit confirmation code to complete activation.',
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.6,
                      color: isDark ? AppColors.gray300 : AppColors.gray700,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Secret Key Display
                  if (_secretKey != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: SelectableText(
                              _secretKey!,
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy_rounded, size: 18),
                            tooltip: 'Copy Secret Key',
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: _secretKey!));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Secret key copied to clipboard.')),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                  ],

                  // 6-digit verification code input
                  CustomTextField(
                    controller: _codeController,
                    label: 'Confirmation Code',
                    placeholder: '123456',
                    prefixIcon: const Icon(Icons.lock_clock_outlined, size: 20, color: AppColors.primary),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 20),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => setState(() => _isConfiguring = false),
                        child: const Text('Cancel'),
                      ),
                      const SizedBox(width: 12),
                      SizedBox(
                        width: 160,
                        child: PrimaryButton(
                          text: 'Verify & Activate',
                          isLoading: _isEnabling,
                          onPressed: _handleVerifyActivation,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
