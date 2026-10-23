import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';
import '../../../../../core/widgets/page_header.dart';

/// <summary>
/// Screen presenting Global Security Policies under Identity & Access Control.
/// Configures system-wide password complexity thresholds, account brute-force lockouts,
/// and multi-factor enforcement options with 1-to-1 operational parity to the web client.
/// </summary>
class GlobalSecurityPoliciesView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Creates a [GlobalSecurityPoliciesView].
  const GlobalSecurityPoliciesView({super.key, this.workspace});

  @override
  ConsumerState<GlobalSecurityPoliciesView> createState() => _GlobalSecurityPoliciesViewState();
}

class _GlobalSecurityPoliciesViewState extends ConsumerState<GlobalSecurityPoliciesView> {
  bool _isLoading = true;
  bool _isSavingPassword = false;
  bool _isSavingMfa = false;

  // Password Policy
  double _minPasswordLength = 8.0;
  bool _requireUppercase = true;
  bool _requireLowercase = true;
  bool _requireNumbers = true;
  bool _requireSpecialCharacters = true;
  int _maxFailedAccessAttempts = 5;
  int _defaultLockoutTimeSpanMinutes = 15;

  // MFA Policy
  bool _enforceMfaForAllUsers = false;
  bool _enforceMfaForAdmins = false;
  final List<String> _allowedMethods = [
    'Google Authenticator',
    'Microsoft Authenticator',
    'Email OTP',
    'SMS OTP',
  ];

  @override
  void initState() {
    super.initState();
    _loadPolicies();
  }

  Future<void> _loadPolicies() async {
    setState(() => _isLoading = true);
    final repo = ref.read(accountRepositoryProvider);

    try {
      final pwdFuture = repo.getPasswordPolicy();
      final mfaFuture = repo.getMfaPolicy();
      final results = await Future.wait([pwdFuture, mfaFuture]);

      final pwd = results[0];
      final mfa = results[1];

      if (mounted) {
        setState(() {
          _minPasswordLength = (pwd['minLength'] as num?)?.toDouble() ??
              (pwd['minPasswordLength'] as num?)?.toDouble() ??
              8.0;
          _requireUppercase = pwd['requireUppercase'] ?? true;
          _requireLowercase = pwd['requireLowercase'] ?? true;
          _requireNumbers = pwd['requireDigit'] ?? pwd['requireNumbers'] ?? true;
          _requireSpecialCharacters = pwd['requireNonAlphanumeric'] ?? pwd['requireSpecialCharacters'] ?? true;
          _maxFailedAccessAttempts = (pwd['maxFailedAccessAttempts'] as num?)?.toInt() ?? 5;
          _defaultLockoutTimeSpanMinutes = (pwd['defaultLockoutTimeSpanMinutes'] as num?)?.toInt() ??
              (pwd['lockoutDurationMinutes'] as num?)?.toInt() ??
              15;

          _enforceMfaForAllUsers = mfa['enforceMfaForAllUsers'] ?? false;
          _enforceMfaForAdmins = mfa['enforceMfaForAdmins'] ?? false;

          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _savePasswordPolicy() async {
    setState(() => _isSavingPassword = true);
    final messenger = ScaffoldMessenger.of(context);
    final repo = ref.read(accountRepositoryProvider);

    final success = await repo.updatePasswordPolicy({
      'minLength': _minPasswordLength.toInt(),
      'requireUppercase': _requireUppercase,
      'requireLowercase': _requireLowercase,
      'requireDigit': _requireNumbers,
      'requireNonAlphanumeric': _requireSpecialCharacters,
      'maxFailedAccessAttempts': _maxFailedAccessAttempts,
      'defaultLockoutTimeSpanMinutes': _defaultLockoutTimeSpanMinutes,
    });

    if (mounted) {
      setState(() => _isSavingPassword = false);
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            success ? 'Password complexity policies updated successfully' : 'Failed to save password policy',
          ),
          backgroundColor: success ? AppColors.success : AppColors.error,
        ),
      );
    }
  }

  Future<void> _saveMfaPolicy() async {
    setState(() => _isSavingMfa = true);
    final messenger = ScaffoldMessenger.of(context);
    final repo = ref.read(accountRepositoryProvider);

    final success = await repo.updateMfaPolicy({
      'enforceMfaForAllUsers': _enforceMfaForAllUsers,
      'enforceMfaForAdmins': _enforceMfaForAdmins,
    });

    if (mounted) {
      setState(() => _isSavingMfa = false);
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            success ? 'Multi-factor authentication policy updated successfully' : 'Failed to save MFA policy',
          ),
          backgroundColor: success ? AppColors.success : AppColors.error,
        ),
      );
    }
  }

  Future<void> _saveAllPolicies() async {
    await _savePasswordPolicy();
    await _saveMfaPolicy();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final isSavingAny = _isSavingPassword || _isSavingMfa;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          // Header
          // Shared PageHeader mold: top-level sidebar destination, so no back control.
          PageHeader(
            icon: Icons.policy_outlined,
            eyebrow: 'Security Standards',
            title: 'Global Security Policies',
            description: 'Configure system-wide password complexity thresholds, account brute-force lockouts, and multi-factor enforcement options.',
            primaryAction: PageHeaderAction(label: isSavingAny ? 'Saving...' : 'Save All Policies', compactLabel: 'Save', icon: Icons.save_outlined, style: PageHeaderActionStyle.primary, isLoading: isSavingAny, onPressed: _saveAllPolicies),
            secondaryActions: [
            PageHeaderAction(
              label: 'Refresh Policies',
              compactLabel: 'Refresh',
              icon: Icons.refresh_rounded,
              onPressed: _loadPolicies,
            ),
            ],
          ),
          const SizedBox(height: 24),

          // Two Panels (Password Complexity & Multi-Factor Authentication)
          LayoutBuilder(
            builder: (context, constraints) {
              final isStacked = constraints.maxWidth < 900;

              final passwordPanel = _buildPasswordPanel(isDark);
              final mfaPanel = _buildMfaPanel(isDark);

              if (isStacked) {
                return Column(
                  children: [
                    passwordPanel,
                    const SizedBox(height: 20),
                    mfaPanel,
                  ],
                );
              }

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: passwordPanel),
                  const SizedBox(width: 20),
                  Expanded(child: mfaPanel),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildPasswordPanel(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.password_rounded, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              Text(
                'Password Complexity Controls',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Min length slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Minimum Character Length',
                style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${_minPasswordLength.toInt()} characters',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 13),
                ),
              ),
            ],
          ),
          Slider(
            value: _minPasswordLength,
            min: 6,
            max: 30,
            divisions: 24,
            activeColor: AppColors.primary,
            onChanged: (val) => setState(() => _minPasswordLength = val),
          ),
          const Divider(height: 20),

          // Switches
          _buildSwitchRow(
            title: 'Require Uppercase Letter',
            description: 'At least one uppercase character (A-Z) in the password.',
            value: _requireUppercase,
            onChanged: (val) => setState(() => _requireUppercase = val),
            isDark: isDark,
          ),
          const Divider(height: 20),

          _buildSwitchRow(
            title: 'Require Lowercase Letter',
            description: 'At least one lowercase character (a-z) in the password.',
            value: _requireLowercase,
            onChanged: (val) => setState(() => _requireLowercase = val),
            isDark: isDark,
          ),
          const Divider(height: 20),

          _buildSwitchRow(
            title: 'Require Numeric Digit',
            description: 'At least one number (0-9) in the password.',
            value: _requireNumbers,
            onChanged: (val) => setState(() => _requireNumbers = val),
            isDark: isDark,
          ),
          const Divider(height: 20),

          _buildSwitchRow(
            title: 'Require Non-Alphanumeric Symbol',
            description: 'At least one special character (e.g. @, #, \$, %) in the password.',
            value: _requireSpecialCharacters,
            onChanged: (val) => setState(() => _requireSpecialCharacters = val),
            isDark: isDark,
          ),
          const Divider(height: 20),

          // Lockout Controls
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Max Failed Attempts',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isDark ? AppColors.gray300 : AppColors.gray700),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<int>(
                      initialValue: _maxFailedAccessAttempts,
                      decoration: const InputDecoration(border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                      items: [3, 5, 8, 10, 15]
                          .map((n) => DropdownMenuItem(value: n, child: Text('$n attempts')))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _maxFailedAccessAttempts = val);
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Lockout Duration',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isDark ? AppColors.gray300 : AppColors.gray700),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<int>(
                      initialValue: _defaultLockoutTimeSpanMinutes,
                      decoration: const InputDecoration(border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                      items: [5, 15, 30, 60, 120]
                          .map((m) => DropdownMenuItem(value: m, child: Text('$m minutes')))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _defaultLockoutTimeSpanMinutes = val);
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),

          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              PrimaryButton(
                text: _isSavingPassword ? 'Saving...' : 'Save Password Policy',
                icon: const Icon(Icons.save_outlined, size: 16),
                onPressed: _isSavingPassword ? null : _savePasswordPolicy,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMfaPanel(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.phonelink_lock_rounded, color: Color(0xFFA855F7), size: 20),
              const SizedBox(width: 8),
              Text(
                'Multi-Factor Authentication (MFA)',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          _buildSwitchRow(
            title: 'Enforce MFA Globally',
            description: 'Every platform user is required to set up and verify through MFA before accessing workspaces.',
            value: _enforceMfaForAllUsers,
            onChanged: (val) => setState(() => _enforceMfaForAllUsers = val),
            isDark: isDark,
          ),
          const Divider(height: 20),

          _buildSwitchRow(
            title: 'Enforce MFA for Administrators',
            description: 'Requires users in Admin, SuperAdmin, or Identity Manager groups to complete secondary challenges.',
            value: _enforceMfaForAdmins,
            onChanged: (val) => setState(() => _enforceMfaForAdmins = val),
            isDark: isDark,
          ),
          const Divider(height: 20),

          Text(
            'Allowed Methods Matrix',
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _allowedMethods.map((m) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle_rounded, size: 16, color: Color(0xFF10B981)),
                    const SizedBox(width: 6),
                    Text(
                      m,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 26),

          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              PrimaryButton(
                text: _isSavingMfa ? 'Saving...' : 'Save MFA Policy',
                icon: const Icon(Icons.save_outlined, size: 16),
                onPressed: _isSavingMfa ? null : _saveMfaPolicy,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSwitchRow({
    required String title,
    required String description,
    required bool value,
    required ValueChanged<bool> onChanged,
    required bool isDark,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: TextStyle(
                  fontSize: 11.5,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Switch.adaptive(
          value: value,
          activeTrackColor: AppColors.primary,
          onChanged: onChanged,
        ),
      ],
    );
  }
}
