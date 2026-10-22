import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Screen presenting Global Security Policies under Identity & Access Control.
/// Allows administrators to govern password complexity, MFA enforcement, session timeouts,
/// and brute-force account lockout thresholds across the tenant workspace.
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
  bool _isSaving = false;

  // Password Policy
  double _minPasswordLength = 8.0;
  bool _requireUppercase = true;
  bool _requireLowercase = true;
  bool _requireNumbers = true;
  bool _requireSpecialCharacters = true;

  // MFA Policy
  String _mfaPolicy = 'Optional'; // 'Disabled', 'Optional', 'MandatoryAdmins', 'MandatoryAll'
  int _rememberDeviceDays = 30;

  // Session & Lockout Policy
  int _sessionIdleTimeout = 60;
  int _maxConcurrentSessions = 3;
  int _lockoutThreshold = 5;
  int _lockoutDuration = 15;

  @override
  void initState() {
    super.initState();
    _loadPolicies();
  }

  Future<void> _loadPolicies() async {
    setState(() => _isLoading = true);
    final repo = ref.read(accountRepositoryProvider);
    final policies = await repo.getSecurityPolicies();

    if (mounted) {
      setState(() {
        _minPasswordLength = (policies['minPasswordLength'] as num?)?.toDouble() ?? 8.0;
        _requireUppercase = policies['requireUppercase'] ?? true;
        _requireLowercase = policies['requireLowercase'] ?? true;
        _requireNumbers = policies['requireNumbers'] ?? true;
        _requireSpecialCharacters = policies['requireSpecialCharacters'] ?? true;
        _mfaPolicy = policies['mfaPolicy'] ?? 'Optional';
        _rememberDeviceDays = policies['rememberDeviceDays'] ?? 30;
        _sessionIdleTimeout = policies['sessionIdleTimeoutMinutes'] ?? 60;
        _maxConcurrentSessions = policies['maxConcurrentSessions'] ?? 3;
        _lockoutThreshold = policies['lockoutThresholdAttempts'] ?? 5;
        _lockoutDuration = policies['lockoutDurationMinutes'] ?? 15;
        _isLoading = false;
      });
    }
  }

  Future<void> _savePolicies() async {
    setState(() => _isSaving = true);
    final repo = ref.read(accountRepositoryProvider);

    final success = await repo.updateSecurityPolicies({
      'minPasswordLength': _minPasswordLength.toInt(),
      'requireUppercase': _requireUppercase,
      'requireLowercase': _requireLowercase,
      'requireNumbers': _requireNumbers,
      'requireSpecialCharacters': _requireSpecialCharacters,
      'mfaPolicy': _mfaPolicy,
      'rememberDeviceDays': _rememberDeviceDays,
      'sessionIdleTimeoutMinutes': _sessionIdleTimeout,
      'maxConcurrentSessions': _maxConcurrentSessions,
      'lockoutThresholdAttempts': _lockoutThreshold,
      'lockoutDurationMinutes': _lockoutDuration,
    });

    if (mounted) {
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success ? 'Global security policies updated successfully' : 'Failed to update security policies',
          ),
          backgroundColor: success ? AppColors.success : AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Global Security Policies',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Enterprise governance: passwords, multi-factor enforcement, and session life cycle',
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                ],
              ),
              PrimaryButton(
                text: _isSaving ? 'Saving...' : 'Save Policies',
                icon: const Icon(Icons.save_outlined, size: 18),
                onPressed: _isSaving ? null : _savePolicies,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Password Complexity Policy
          _buildPolicyCard(
            isDark: isDark,
            title: 'Password Complexity & Hygiene',
            subtitle: 'Enforce strong entropy rules across all user accounts',
            icon: Icons.password_outlined,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Minimum Password Length',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        ),
                      ),
                      Text(
                        '${_minPasswordLength.toInt()} characters',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  Slider(
                    value: _minPasswordLength,
                    min: 8,
                    max: 24,
                    divisions: 16,
                    label: '${_minPasswordLength.toInt()}',
                    activeColor: AppColors.primary,
                    onChanged: (val) => setState(() => _minPasswordLength = val),
                  ),
                ],
              ),
              const Divider(height: 24),
              _buildSwitchTile(
                title: 'Require Uppercase Letter (A-Z)',
                subtitle: 'At least one uppercase character must be included',
                value: _requireUppercase,
                onChanged: (val) => setState(() => _requireUppercase = val),
                isDark: isDark,
              ),
              const Divider(height: 24),
              _buildSwitchTile(
                title: 'Require Lowercase Letter (a-z)',
                subtitle: 'At least one lowercase character must be included',
                value: _requireLowercase,
                onChanged: (val) => setState(() => _requireLowercase = val),
                isDark: isDark,
              ),
              const Divider(height: 24),
              _buildSwitchTile(
                title: 'Require Numeric Digit (0-9)',
                subtitle: 'At least one number must be included',
                value: _requireNumbers,
                onChanged: (val) => setState(() => _requireNumbers = val),
                isDark: isDark,
              ),
              const Divider(height: 24),
              _buildSwitchTile(
                title: 'Require Special Symbol (!@#\$%^&*)',
                subtitle: 'At least one special non-alphanumeric character is required',
                value: _requireSpecialCharacters,
                onChanged: (val) => setState(() => _requireSpecialCharacters = val),
                isDark: isDark,
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Multi-Factor Authentication (MFA)
          _buildPolicyCard(
            isDark: isDark,
            title: 'Multi-Factor Authentication (MFA / 2FA)',
            subtitle: 'Govern two-factor authentication adoption and enforcement',
            icon: Icons.shield_outlined,
            children: [
              Text(
                'MFA Enforcement Mode',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                  borderRadius: BorderRadius.circular(10),
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: _mfaPolicy,
                    items: const [
                      DropdownMenuItem(value: 'Disabled', child: Text('Disabled - Do not allow 2FA')),
                      DropdownMenuItem(value: 'Optional', child: Text('Optional - Users may self-enroll')),
                      DropdownMenuItem(
                        value: 'MandatoryAdmins',
                        child: Text('Mandatory for Administrators (Recommended)'),
                      ),
                      DropdownMenuItem(value: 'MandatoryAll', child: Text('Mandatory for All Members')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _mfaPolicy = val);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Remember Trusted Device Duration',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        ),
                      ),
                      Text(
                        'Days before 2FA challenge is re-prompted on trusted devices',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.gray400 : AppColors.gray600,
                        ),
                      ),
                    ],
                  ),
                  DropdownButton<int>(
                    value: _rememberDeviceDays,
                    items: const [
                      DropdownMenuItem(value: 7, child: Text('7 days')),
                      DropdownMenuItem(value: 14, child: Text('14 days')),
                      DropdownMenuItem(value: 30, child: Text('30 days')),
                      DropdownMenuItem(value: 60, child: Text('60 days')),
                      DropdownMenuItem(value: 90, child: Text('90 days')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _rememberDeviceDays = val);
                    },
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Session & Brute-Force Lockout Policy
          _buildPolicyCard(
            isDark: isDark,
            title: 'Sessions & Brute-Force Defense',
            subtitle: 'Control session lifetimes and automated brute-force protection',
            icon: Icons.timer_outlined,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Session Inactivity Timeout',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        ),
                      ),
                      Text(
                        'Automatically lock or terminate idle client sessions',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.gray400 : AppColors.gray600,
                        ),
                      ),
                    ],
                  ),
                  DropdownButton<int>(
                    value: _sessionIdleTimeout,
                    items: const [
                      DropdownMenuItem(value: 15, child: Text('15 minutes')),
                      DropdownMenuItem(value: 30, child: Text('30 minutes')),
                      DropdownMenuItem(value: 60, child: Text('1 hour')),
                      DropdownMenuItem(value: 120, child: Text('2 hours')),
                      DropdownMenuItem(value: 480, child: Text('8 hours')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _sessionIdleTimeout = val);
                    },
                  ),
                ],
              ),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Max Concurrent Sessions per User',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        ),
                      ),
                      Text(
                        'Maximum simultaneously connected devices per account',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.gray400 : AppColors.gray600,
                        ),
                      ),
                    ],
                  ),
                  DropdownButton<int>(
                    value: _maxConcurrentSessions,
                    items: const [
                      DropdownMenuItem(value: 1, child: Text('1 session')),
                      DropdownMenuItem(value: 2, child: Text('2 sessions')),
                      DropdownMenuItem(value: 3, child: Text('3 sessions')),
                      DropdownMenuItem(value: 5, child: Text('5 sessions')),
                      DropdownMenuItem(value: 10, child: Text('10 sessions')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _maxConcurrentSessions = val);
                    },
                  ),
                ],
              ),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Failed Login Lockout Threshold',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        ),
                      ),
                      Text(
                        'Consecutive failed attempts before account is temporarily locked',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.gray400 : AppColors.gray600,
                        ),
                      ),
                    ],
                  ),
                  DropdownButton<int>(
                    value: _lockoutThreshold,
                    items: const [
                      DropdownMenuItem(value: 3, child: Text('3 attempts')),
                      DropdownMenuItem(value: 5, child: Text('5 attempts')),
                      DropdownMenuItem(value: 10, child: Text('10 attempts')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _lockoutThreshold = val);
                    },
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPolicyCard({
    required bool isDark,
    required String title,
    required String subtitle,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
        ),
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
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    required bool isDark,
  }) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                ),
              ),
            ],
          ),
        ),
        Switch(
          value: value,
          onChanged: onChanged,
          activeThumbColor: AppColors.primary,
        ),
      ],
    );
  }
}
