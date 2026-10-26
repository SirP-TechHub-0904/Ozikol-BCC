import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

/// Screen enabling users to configure, enroll, and manage Two-Factor Authentication (2FA).
class TwoFactorSecurityView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Callback to switch account navigation tabs.
  final ValueChanged<String>? onSelectTab;

  /// Creates a [TwoFactorSecurityView].
  const TwoFactorSecurityView({
    super.key,
    this.workspace,
    this.onSelectTab,
  });

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
  String? _qrCodeUrl;
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

      final key = res['secretKey']?.toString() ?? res['sharedKey']?.toString() ?? 'ABCDEF123456';
      final qrUrl = res['qrCodeUrl']?.toString() ?? res['qrCodeUri']?.toString() ?? res['QrCodeUrl']?.toString();

      final brand = Uri.encodeComponent(widget.workspace?.organizationName ?? 'Workspace');
      final email = Uri.encodeComponent(widget.workspace?.userEmail ?? 'user');
      final fallbackOtpAuth = 'otpauth://totp/$brand:$email?secret=$key&issuer=$brand';

      setState(() {
        _secretKey = key;
        _qrCodeUrl = (qrUrl != null && qrUrl.isNotEmpty) ? qrUrl : fallbackOtpAuth;
      });
    } catch (e) {
      setState(() {
        _isConfiguring = false;
        _errorMessage = WorkspaceNotifier.sanitizeError(e);
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

      // Synchronize in-app notification center feed immediately
      ref.read(notificationProvider.notifier).loadFeed();
    } catch (e) {
      setState(() {
        _isEnabling = false;
        _errorMessage = WorkspaceNotifier.sanitizeError(e);
      });
    }
  }

  Future<void> _handleDisable2FA() async {
    final messenger = ScaffoldMessenger.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('account.disable_2fa_title'.tr(ref, fallback: 'Disable Two-Factor Authentication?')),
        content: Text(
          'account.disable_2fa_confirm'.tr(ref, fallback: 'Are you sure you want to deactivate 2FA? Your workspace account will only be protected by your password credentials.'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text('btn.cancel'.tr(ref, fallback: 'Cancel'))),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: Text('account.disable_2fa'.tr(ref, fallback: 'Disable 2FA')),
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

      // Synchronize in-app notification center feed immediately
      ref.read(notificationProvider.notifier).loadFeed();

      if (mounted) {
        messenger.showSnackBar(
          SnackBar(content: Text('ui.twofa_disabled'.tr(ref, fallback: 'Two-Factor Authentication disabled.'))),
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
          // Unified Account Header & Navigation Tabs
          AccountSecurityHeader(
            activeTab: '2fa',
            onSelectTab: widget.onSelectTab,
            workspace: widget.workspace,
            is2faEnabled: _is2faEnabled,
          ),
          const SizedBox(height: 20),

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
          LayoutBuilder(
            builder: (context, constraints) {
              final isNarrow = constraints.maxWidth < 560;

              final badgeWidget = Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                decoration: BoxDecoration(
                  color: (_is2faEnabled ? AppColors.success : AppColors.warning).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Text(
                  _is2faEnabled ? 'badge.active'.tr(ref, fallback: 'Active') : 'account.mfa_unprotected'.tr(ref, fallback: 'Unprotected'),
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                    color: _is2faEnabled ? AppColors.success : AppColors.warning,
                  ),
                ),
              );

              final titleText = Text(
                _is2faEnabled ? 'account.mfa_active'.tr(ref, fallback: '2FA Protection Active') : 'account.mfa_disabled'.tr(ref, fallback: '2FA Protection Disabled'),
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                ),
              );

              final descText = Text(
                _is2faEnabled
                    ? 'Your account is secured via $_currentProvider verification.'
                    : 'account.mfa_desc'.tr(ref, fallback: 'Enable two-factor authentication to safeguard your organization workspace from unauthorized access.'),
                style: TextStyle(
                  fontSize: 12.5,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                ),
              );

              final actionButton = (!_is2faEnabled && !_isConfiguring)
                  ? SizedBox(
                      width: isNarrow ? double.infinity : null,
                      child: PrimaryButton(
                        isFullWidth: isNarrow,
                        text: 'account.enable_2fa'.tr(ref, fallback: 'Enable 2FA'),
                        height: 42,
                        onPressed: () => _startConfiguration('GoogleAuthenticator'),
                      ),
                    )
                  : (_is2faEnabled && !_isConfiguring)
                      ? SizedBox(
                          width: isNarrow ? double.infinity : null,
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.lock_open_rounded, size: 16, color: AppColors.error),
                            label: Text('account.disable_2fa'.tr(ref, fallback: 'Disable 2FA'), style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.bold, fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: AppColors.error.withValues(alpha: 0.4)),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: _handleDisable2FA,
                          ),
                        )
                      : null;

              if (isNarrow) {
                return Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            _is2faEnabled ? Icons.verified_user_rounded : Icons.gpp_maybe_rounded,
                            size: 32,
                            color: _is2faEnabled ? AppColors.success : AppColors.warning,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 4,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    titleText,
                                    badgeWidget,
                                  ],
                                ),
                                const SizedBox(height: 4),
                                descText,
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (actionButton != null) ...[
                        const SizedBox(height: 14),
                        actionButton,
                      ],
                    ],
                  ),
                );
              }

              return Container(
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
                          Wrap(
                            spacing: 8,
                            runSpacing: 4,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              titleText,
                              badgeWidget,
                            ],
                          ),
                          const SizedBox(height: 3),
                          descText,
                        ],
                      ),
                    ),
                    if (actionButton != null) ...[
                      const SizedBox(width: 14),
                      actionButton,
                    ],
                  ],
                ),
              );
            },
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
              child: AutofillGroup(
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
                        'account.setup_authenticator'.tr(ref, fallback: 'Set Up Authenticator App'),
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

                  // QR Code Display for Scanning with Authenticator Apps
                  if (_qrCodeUrl != null) ...[
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: CachedNetworkImage(
                                imageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${Uri.encodeComponent(_qrCodeUrl!)}',
                                width: 165,
                                height: 165,
                                fit: BoxFit.contain,
                                placeholder: (context, url) => Container(
                                  width: 165,
                                  height: 165,
                                  color: const Color(0xFFF8FAFC),
                                  child: const Center(
                                    child: SizedBox(
                                      width: 24,
                                      height: 24,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    ),
                                  ),
                                ),
                                errorWidget: (context, url, error) => Container(
                                  width: 165,
                                  height: 165,
                                  color: const Color(0xFFF8FAFC),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.qr_code_2_rounded, size: 48, color: AppColors.gray400),
                                      const SizedBox(height: 6),
                                      Text('ui.scan_qr'.tr(ref, fallback: 'Scan QR Code'), style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Scan with your authenticator camera',
                              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Expanded(child: Divider()),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text(
                            'OR ENTER KEY MANUALLY',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                              color: isDark ? AppColors.gray400 : AppColors.gray600,
                            ),
                          ),
                        ),
                        const Expanded(child: Divider()),
                      ],
                    ),
                    const SizedBox(height: 14),
                  ],

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
                            tooltip: 'account.copy_secret'.tr(ref, fallback: 'Copy Secret Key'),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: _secretKey!));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('ui.secret_copied'.tr(ref, fallback: 'Secret key copied to clipboard.'))),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                  ],

                  // 6-digit verification code input with 1-tap paste & SMS OTP autofill
                  CustomTextField(
                    controller: _codeController,
                    label: 'account.confirmation_code'.tr(ref, fallback: 'Confirmation Code'),
                    placeholder: '123456',
                    prefixIcon: const Icon(Icons.lock_clock_outlined, size: 20, color: AppColors.primary),
                    keyboardType: TextInputType.number,
                    showPasteButton: true,
                    autofillHints: const [AutofillHints.oneTimeCode],
                    onSubmitted: (_) => _handleVerifyActivation(),
                  ),
                  const SizedBox(height: 20),

                  Wrap(
                    alignment: WrapAlignment.end,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 12,
                    runSpacing: 10,
                    children: [
                      TextButton(
                        onPressed: () => setState(() => _isConfiguring = false),
                        child: Text('btn.cancel'.tr(ref, fallback: 'Cancel')),
                      ),
                      SizedBox(
                        child: PrimaryButton(
                          isFullWidth: false,
                          text: 'account.verify_activate'.tr(ref, fallback: 'Verify & Activate'),
                          isLoading: _isEnabling,
                          onPressed: _handleVerifyActivation,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          ],
        ],
      ),
    );
  }
}
