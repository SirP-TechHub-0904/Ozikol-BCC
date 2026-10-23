import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Screen presenting the Identity & Access Control Security Console Overview.
/// Features 1-to-1 operational and visual parity with the web client, including
/// clickable telemetry cards, MFA method distribution, security posture indicators,
/// fast navigation shortcuts, and recent security access events.
/// </summary>
class IdentityDashboardView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Optional callback to navigate to a sub-page index in the dashboard shell.
  final ValueChanged<int>? onNavigateToTab;

  /// Creates an [IdentityDashboardView].
  const IdentityDashboardView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
  });

  @override
  ConsumerState<IdentityDashboardView> createState() => _IdentityDashboardViewState();
}

class _IdentityDashboardViewState extends ConsumerState<IdentityDashboardView> {
  bool _isLoading = true;

  // Real telemetry data from IdentityApi/telemetry
  int _totalUsers = 0;
  int _lockedOutCount = 0;
  int _retryAlertsCount = 0;
  int _mfaPercentage = 0;

  // MFA Distribution Breakdown
  int _mfaGoogle = 0;
  int _mfaMicrosoft = 0;
  int _mfaEmail = 0;
  int _mfaSms = 0;
  int _mfaNone = 0;

  List<Map<String, dynamic>> _recentSecurityAudits = [];

  @override
  void initState() {
    super.initState();
    _loadIdentityData();
  }

  Future<void> _loadIdentityData() async {
    setState(() => _isLoading = true);
    final repo = ref.read(accountRepositoryProvider);

    try {
      final telemetryFuture = repo.getIdentityTelemetry();
      final countsFuture = repo.getUserCounts();
      final auditsFuture = repo.getLoginHistory(page: 1, pageSize: 6);

      final results = await Future.wait([telemetryFuture, countsFuture, auditsFuture]);

      final telemetry = results[0];
      final counts = results[1];
      final auditsMap = results[2];
      final auditsList = (auditsMap['items'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];

      if (mounted) {
        final totalUsers = (telemetry['totalUsers'] as num?)?.toInt() ?? (counts['total'] as num?)?.toInt() ?? 0;
        final lockedOut = (telemetry['lockedOutCount'] as num?)?.toInt() ?? (counts['locked'] as num?)?.toInt() ?? 0;
        final retries = (telemetry['retryAlertsCount'] as num?)?.toInt() ?? 0;

        final google = (telemetry['mfaGoogleCount'] as num?)?.toInt() ?? 0;
        final microsoft = (telemetry['mfaMicrosoftCount'] as num?)?.toInt() ?? 0;
        final email = (telemetry['mfaEmailCount'] as num?)?.toInt() ?? 0;
        final sms = (telemetry['mfaSmsCount'] as num?)?.toInt() ?? 0;
        final none = (telemetry['mfaNoneCount'] as num?)?.toInt() ?? (totalUsers > 0 ? totalUsers - (google + microsoft + email + sms) : 0);

        final enrolledCount = google + microsoft + email + sms;
        final pct = totalUsers > 0 ? ((enrolledCount / totalUsers) * 100).round() : 0;

        setState(() {
          _totalUsers = totalUsers;
          _lockedOutCount = lockedOut;
          _retryAlertsCount = retries;
          _mfaPercentage = pct;
          _mfaGoogle = google;
          _mfaMicrosoft = microsoft;
          _mfaEmail = email;
          _mfaSms = sms;
          _mfaNone = none < 0 ? 0 : none;
          _recentSecurityAudits = auditsList;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
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
          // Standardized Page Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'IDENTITY SECURITY CONTROL',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Security Console Overview',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'Real-time telemetry, 2FA adoption metrics, brute-force retry flags, and remote session controls.',
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                tooltip: 'Refresh Telemetry',
                onPressed: _loadIdentityData,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // 4 Clickable Interactive Telemetry Cards (exact match with web!)
          LayoutBuilder(
            builder: (context, constraints) {
              final isNarrow = constraints.maxWidth < 800;
              final cardWidth = isNarrow ? (constraints.maxWidth - 12) / 2 : (constraints.maxWidth - 36) / 4;

              return Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  // Card 1: Total Users -> User Directory (tab 1)
                  _buildInteractiveCard(
                    title: 'TOTAL USERS',
                    value: '$_totalUsers',
                    subtitle: 'Registered Members',
                    subtitleColor: AppColors.primary,
                    icon: Icons.people_alt_outlined,
                    width: cardWidth,
                    isDark: isDark,
                    tooltip: 'Click to view all registered members in User Directory',
                    onTap: () => widget.onNavigateToTab?.call(1),
                  ),

                  // Card 2: Locked Accounts -> Filtered User Directory (tab 1)
                  _buildInteractiveCard(
                    title: 'LOCKED ACCOUNTS',
                    value: '$_lockedOutCount',
                    subtitle: _lockedOutCount > 0 ? 'Requires Attention' : 'Active Safeguard',
                    subtitleColor: _lockedOutCount > 0 ? AppColors.error : AppColors.success,
                    valueColor: _lockedOutCount > 0 ? AppColors.error : null,
                    icon: Icons.lock_outline_rounded,
                    width: cardWidth,
                    isDark: isDark,
                    tooltip: 'Click to inspect locked user accounts in User Directory',
                    onTap: () => widget.onNavigateToTab?.call(1),
                  ),

                  // Card 3: Brute-Force Retries -> Security Logs (tab 15)
                  _buildInteractiveCard(
                    title: 'BRUTE-FORCE RETRIES',
                    value: '$_retryAlertsCount',
                    subtitle: _retryAlertsCount > 0 ? 'Suspicious Retries' : 'Clean Audit Stream',
                    subtitleColor: _retryAlertsCount > 0 ? AppColors.warning : AppColors.success,
                    valueColor: _retryAlertsCount > 0 ? AppColors.warning : null,
                    icon: Icons.shield_outlined,
                    width: cardWidth,
                    isDark: isDark,
                    tooltip: 'Click to inspect authentication events in Security Logs',
                    onTap: () => widget.onNavigateToTab?.call(15),
                  ),

                  // Card 4: MFA Enrolled -> Global Policies (tab 10)
                  _buildInteractiveCard(
                    title: 'MFA ENROLLED',
                    value: '$_mfaPercentage%',
                    subtitle: 'Preferred Authentication',
                    subtitleColor: AppColors.success,
                    valueColor: AppColors.success,
                    icon: Icons.phonelink_lock_outlined,
                    width: cardWidth,
                    isDark: isDark,
                    tooltip: 'Click to configure two-factor authentication and security policies',
                    onTap: () => widget.onNavigateToTab?.call(10),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 24),

          // 2 Governance Widgets (MFA Method Distribution & Threat Posture)
          LayoutBuilder(
            builder: (context, constraints) {
              final isStacked = constraints.maxWidth < 800;

              final mfaWidget = _buildMfaDistributionWidget(isDark);
              final postureWidget = _buildOperationalOverviewWidget(isDark);

              if (isStacked) {
                return Column(
                  children: [
                    mfaWidget,
                    const SizedBox(height: 16),
                    postureWidget,
                  ],
                );
              }

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: mfaWidget),
                  const SizedBox(width: 16),
                  Expanded(child: postureWidget),
                ],
              );
            },
          ),
          const SizedBox(height: 28),

          // Identity Control Panels (Quick Shortcuts matching web)
          Text(
            'Identity Control Panels',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            ),
          ),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, constraints) {
              final isNarrow = constraints.maxWidth < 800;
              final cardWidth = isNarrow ? (constraints.maxWidth - 12) / 2 : (constraints.maxWidth - 36) / 4;

              return Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _buildConsoleShortcut(
                    title: 'Roles & Scopes',
                    description: 'Assign fine-grained feature editing permissions.',
                    icon: Icons.shield_outlined,
                    iconBg: AppColors.primary,
                    width: cardWidth,
                    isDark: isDark,
                    onTap: () => widget.onNavigateToTab?.call(8),
                  ),
                  _buildConsoleShortcut(
                    title: 'User Invitations',
                    description: 'Issue secure registration tokens to admins & members.',
                    icon: Icons.mail_outline_rounded,
                    iconBg: const Color(0xFFA855F7),
                    width: cardWidth,
                    isDark: isDark,
                    onTap: () => widget.onNavigateToTab?.call(9),
                  ),
                  _buildConsoleShortcut(
                    title: 'Security Logs',
                    description: 'Analyze login audit stream and tracking events.',
                    icon: Icons.history_rounded,
                    iconBg: const Color(0xFF22C55E),
                    width: cardWidth,
                    isDark: isDark,
                    onTap: () => widget.onNavigateToTab?.call(15),
                  ),
                  _buildConsoleShortcut(
                    title: 'Global Policies',
                    description: 'Set global password complexity and MFA triggers.',
                    icon: Icons.password_outlined,
                    iconBg: const Color(0xFFF59E0B),
                    width: cardWidth,
                    isDark: isDark,
                    onTap: () => widget.onNavigateToTab?.call(10),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 28),

          // Recent Security Access Events Table
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(18),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.history_rounded, size: 20, color: AppColors.primary),
                          const SizedBox(width: 8),
                          Text(
                            'Recent Security Events',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                            ),
                          ),
                        ],
                      ),
                      TextButton.icon(
                        icon: const Icon(Icons.arrow_forward, size: 14),
                        label: const Text('View All Logs'),
                        onPressed: () => widget.onNavigateToTab?.call(15),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                if (_recentSecurityAudits.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(32),
                    child: Center(
                      child: Text(
                        'No recent security events recorded in workspace audit stream.',
                        style: TextStyle(
                          color: isDark ? AppColors.gray400 : AppColors.gray600,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  )
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _recentSecurityAudits.length,
                    separatorBuilder: (_, index) => const Divider(height: 1),
                    itemBuilder: (context, idx) {
                      final item = _recentSecurityAudits[idx];
                      final ip = item['ipAddress'] ?? '127.0.0.1';
                      final device = item['deviceSummary'] ?? item['userAgent'] ?? 'Desktop App';
                      final time = item['timestamp'] ?? item['loginTime'] ?? item['createdAt'] ?? 'Recently';
                      final status = (item['status'] ?? (item['isSuccessful'] == false ? 'Failed' : 'Success')).toString();
                      final isSuccess = !status.toLowerCase().contains('fail');

                      return ListTile(
                        leading: CircleAvatar(
                          radius: 16,
                          backgroundColor: isSuccess
                              ? AppColors.success.withValues(alpha: 0.1)
                              : AppColors.error.withValues(alpha: 0.1),
                          child: Icon(
                            isSuccess ? Icons.check_circle_outline_rounded : Icons.error_outline_rounded,
                            size: 18,
                            color: isSuccess ? AppColors.success : AppColors.error,
                          ),
                        ),
                        title: Text(
                          device.toString(),
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                          ),
                        ),
                        subtitle: Text(
                          'IP: $ip • $time',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? AppColors.gray400 : AppColors.gray600,
                          ),
                        ),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: isSuccess
                                ? AppColors.success.withValues(alpha: 0.12)
                                : AppColors.error.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: Text(
                            isSuccess ? 'Success' : 'Failed',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isSuccess ? AppColors.success : AppColors.error,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Builds a clickable interactive telemetry card matching web styling.
  Widget _buildInteractiveCard({
    required String title,
    required String value,
    required String subtitle,
    required Color subtitleColor,
    required IconData icon,
    required double width,
    required bool isDark,
    required String tooltip,
    required VoidCallback onTap,
    Color? valueColor,
  }) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            width: width,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const Icon(Icons.arrow_forward_rounded, size: 14, color: AppColors.gray400),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: valueColor ?? (isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: subtitleColor,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Builds MFA Verification Method Distribution Console Widget.
  Widget _buildMfaDistributionWidget(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
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
              const Icon(Icons.phonelink_lock_outlined, size: 20, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                'MFA Verification Method Distribution',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildMethodRow('Google Authenticator', _mfaGoogle, AppColors.primary, isDark),
          _buildMethodRow('Microsoft Authenticator', _mfaMicrosoft, const Color(0xFF3B82F6), isDark),
          _buildMethodRow('Email OTP', _mfaEmail, const Color(0xFF10B981), isDark),
          _buildMethodRow('SMS OTP', _mfaSms, const Color(0xFFF59E0B), isDark),
          _buildMethodRow('Disabled', _mfaNone, AppColors.gray400, isDark),
        ],
      ),
    );
  }

  Widget _buildMethodRow(String name, int count, Color color, bool isDark) {
    final total = _totalUsers > 0 ? _totalUsers : 1;
    final percent = ((count / total) * 100).round();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              name,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w500,
                color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
              ),
            ),
          ),
          Text(
            '$count ($percent%)',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.gray300 : AppColors.gray700,
            ),
          ),
        ],
      ),
    );
  }

  /// Builds Identity Operational Overview Widget (Active Guards vs Locked Out vs Retries).
  Widget _buildOperationalOverviewWidget(bool isDark) {
    final activeGuards = _totalUsers > _lockedOutCount ? _totalUsers - _lockedOutCount : 0;

    return Container(
      padding: const EdgeInsets.all(20),
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
              const Icon(Icons.gpp_maybe_outlined, size: 20, color: Color(0xFF8B5CF6)),
              const SizedBox(width: 8),
              Text(
                'Identity Operational Overview',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildPostureMetricRow('Active Guards', '$activeGuards', AppColors.success, isDark),
          _buildPostureMetricRow('Locked Out Accounts', '$_lockedOutCount', AppColors.error, isDark),
          _buildPostureMetricRow('Brute-Force Retries', '$_retryAlertsCount', AppColors.warning, isDark),
        ],
      ),
    );
  }

  Widget _buildPostureMetricRow(String label, String value, Color color, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              value,
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color),
            ),
          ),
        ],
      ),
    );
  }

  /// Builds Quick Shortcut Card matching web console actions.
  Widget _buildConsoleShortcut({
    required String title,
    required String description,
    required IconData icon,
    required Color iconBg,
    required double width,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: width,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 20, color: Colors.white),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
