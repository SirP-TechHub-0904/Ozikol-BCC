import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';
import '../../../../../core/widgets/page_header.dart';
import '../../../../../core/localization/language_provider.dart';

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
          // Standardized Page Header
          // Shared PageHeader mold: top-level sidebar destination, so no back control.
          PageHeader(
            icon: Icons.shield_outlined,
            eyebrow: context.trc('identity.eyebrow', fallback: 'Identity Security Control'),
            title: context.trc('identity.title', fallback: 'Security Console Overview'),
            description: context.trc('identity.desc', fallback: 'Real-time telemetry, 2FA adoption metrics, brute-force retry flags, and remote session controls.'),
            secondaryActions: [
            PageHeaderAction(
              label: context.trc('identity.refresh_telemetry', fallback: 'Refresh Telemetry'),
              compactLabel: context.trc('identity.refresh', fallback: 'Refresh'),
              icon: Icons.refresh_rounded,
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
                    title: context.trc('identity.total_users', fallback: 'TOTAL USERS'),
                    value: '$_totalUsers',
                    subtitle: context.trc('identity.registered_members', fallback: 'Registered Members'),
                    subtitleColor: AppColors.primary,
                    icon: Icons.people_alt_outlined,
                    width: cardWidth,
                    isDark: isDark,
                    tooltip: context.trc('identity.click_users', fallback: 'Click to view all registered members in User Directory'),
                    onTap: () => widget.onNavigateToTab?.call(1),
                  ),

                  // Card 2: Locked Accounts -> Filtered User Directory (tab 1)
                  _buildInteractiveCard(
                    title: context.trc('identity.locked_accounts', fallback: 'LOCKED ACCOUNTS'),
                    value: '$_lockedOutCount',
                    subtitle: _lockedOutCount > 0
                        ? context.trc('identity.requires_attention', fallback: 'Requires Attention')
                        : context.trc('identity.active_safeguard', fallback: 'Active Safeguard'),
                    subtitleColor: _lockedOutCount > 0 ? AppColors.error : AppColors.success,
                    valueColor: _lockedOutCount > 0 ? AppColors.error : null,
                    icon: Icons.lock_outline_rounded,
                    width: cardWidth,
                    isDark: isDark,
                    tooltip: context.trc('identity.click_locked', fallback: 'Click to inspect locked user accounts in User Directory'),
                    onTap: () => widget.onNavigateToTab?.call(1),
                  ),

                  // Card 3: Brute-Force Retries -> Security Logs (tab 15)
                  _buildInteractiveCard(
                    title: context.trc('identity.brute_force_retries', fallback: 'BRUTE-FORCE RETRIES'),
                    value: '$_retryAlertsCount',
                    subtitle: _retryAlertsCount > 0
                        ? context.trc('identity.suspicious_retries', fallback: 'Suspicious Retries')
                        : context.trc('identity.clean_audit_stream', fallback: 'Clean Audit Stream'),
                    subtitleColor: _retryAlertsCount > 0 ? AppColors.warning : AppColors.success,
                    valueColor: _retryAlertsCount > 0 ? AppColors.warning : null,
                    icon: Icons.shield_outlined,
                    width: cardWidth,
                    isDark: isDark,
                    tooltip: context.trc('identity.click_brute_force', fallback: 'Click to inspect authentication events in Security Logs'),
                    onTap: () => widget.onNavigateToTab?.call(15),
                  ),

                  // Card 4: MFA Enrolled -> Global Policies (tab 10)
                  _buildInteractiveCard(
                    title: context.trc('identity.mfa_enrolled', fallback: 'MFA ENROLLED'),
                    value: '$_mfaPercentage%',
                    subtitle: context.trc('identity.preferred_auth', fallback: 'Preferred Authentication'),
                    subtitleColor: AppColors.success,
                    valueColor: AppColors.success,
                    icon: Icons.phonelink_lock_outlined,
                    width: cardWidth,
                    isDark: isDark,
                    tooltip: context.trc('identity.click_mfa', fallback: 'Click to configure two-factor authentication and security policies'),
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
            context.trc('identity.control_panels', fallback: 'Identity Control Panels'),
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
                    title: context.trc('identity.shortcut_roles', fallback: 'Roles & Scopes'),
                    description: context.trc('identity.shortcut_roles_desc', fallback: 'Assign fine-grained feature editing permissions.'),
                    icon: Icons.shield_outlined,
                    iconBg: AppColors.primary,
                    width: cardWidth,
                    isDark: isDark,
                    onTap: () => widget.onNavigateToTab?.call(8),
                  ),
                  _buildConsoleShortcut(
                    title: context.trc('identity.shortcut_invitations', fallback: 'User Invitations'),
                    description: context.trc('identity.shortcut_invitations_desc', fallback: 'Issue secure registration tokens to admins & members.'),
                    icon: Icons.mail_outline_rounded,
                    iconBg: const Color(0xFFA855F7),
                    width: cardWidth,
                    isDark: isDark,
                    onTap: () => widget.onNavigateToTab?.call(9),
                  ),
                  _buildConsoleShortcut(
                    title: context.trc('identity.shortcut_logs', fallback: 'Security Logs'),
                    description: context.trc('identity.shortcut_logs_desc', fallback: 'Analyze login audit stream and tracking events.'),
                    icon: Icons.history_rounded,
                    iconBg: const Color(0xFF22C55E),
                    width: cardWidth,
                    isDark: isDark,
                    onTap: () => widget.onNavigateToTab?.call(15),
                  ),
                  _buildConsoleShortcut(
                    title: context.trc('identity.shortcut_policies', fallback: 'Global Policies'),
                    description: context.trc('identity.shortcut_policies_desc', fallback: 'Set global password complexity and MFA triggers.'),
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
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            const Icon(Icons.history_rounded, size: 20, color: AppColors.primary),
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                context.trc('identity.recent_events', fallback: 'Recent Security Events'),
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      TextButton.icon(
                        icon: const Icon(Icons.arrow_forward, size: 14),
                        label: Text(context.trc('identity.view_all_logs', fallback: 'View All Logs'), style: const TextStyle(fontSize: 12)),
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
                        context.trc('identity.no_recent_events', fallback: 'No recent security events recorded in workspace audit stream.'),
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

                      return InkWell(
                        onTap: () => _showSecurityEventDetailsModal(context, item, isDark),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 13,
                                backgroundColor: isSuccess
                                    ? AppColors.success.withValues(alpha: 0.1)
                                    : AppColors.error.withValues(alpha: 0.1),
                                child: Icon(
                                  isSuccess ? Icons.check_circle_outline_rounded : Icons.error_outline_rounded,
                                  size: 14,
                                  color: isSuccess ? AppColors.success : AppColors.error,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _formatDeviceSummary(device.toString()),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                      ),
                                    ),
                                    const SizedBox(height: 1),
                                    Text(
                                      'IP: $ip • $time',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isSuccess
                                      ? AppColors.success.withValues(alpha: 0.12)
                                      : AppColors.error.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(100),
                                ),
                                child: Text(
                                  isSuccess
                                      ? context.trc('identity.success', fallback: 'Success')
                                      : context.trc('identity.failed', fallback: 'Failed'),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: isSuccess ? AppColors.success : AppColors.error,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(Icons.chevron_right_rounded, size: 16, color: isDark ? AppColors.gray500 : AppColors.gray400),
                            ],
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

  String _formatDeviceSummary(String raw) {
    if (raw.isEmpty) return 'Desktop / Mobile App';
    if (raw.contains('Windows')) return 'Windows Workstation';
    if (raw.contains('iPhone') || raw.contains('iPad')) return 'Apple iOS Device';
    if (raw.contains('Android')) return 'Android Mobile';
    if (raw.contains('Macintosh') || raw.contains('Mac OS')) return 'macOS Computer';
    if (raw.contains('Linux')) return 'Linux Station';
    if (raw.length > 32) return '${raw.substring(0, 32)}...';
    return raw;
  }

  void _showSecurityEventDetailsModal(BuildContext context, Map<String, dynamic> item, bool isDark) {
    final ip = item['ipAddress'] ?? '127.0.0.1';
    final rawDevice = item['deviceSummary'] ?? item['userAgent'] ?? 'Desktop App';
    final time = item['timestamp'] ?? item['loginTime'] ?? item['createdAt'] ?? 'Recently';
    final status = (item['status'] ?? (item['isSuccessful'] == false ? 'Failed' : 'Success')).toString();
    final isSuccess = !status.toLowerCase().contains('fail');
    final eventType = item['eventType'] ?? item['action'] ?? item['activity'] ?? 'User Authentication';
    final location = item['location'] ?? item['country'] ?? 'Secure Network';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 16,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.gray700 : AppColors.gray300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: isSuccess
                      ? AppColors.success.withValues(alpha: 0.12)
                      : AppColors.error.withValues(alpha: 0.12),
                  child: Icon(
                    isSuccess ? Icons.check_circle_rounded : Icons.error_rounded,
                    size: 20,
                    color: isSuccess ? AppColors.success : AppColors.error,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.trc('identity.event_audit_record', fallback: 'Security Event Audit Record'),
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        ),
                      ),
                      Text(
                        '$time • $status',
                        style: TextStyle(
                          fontSize: 12,
                          color: isSuccess ? AppColors.success : AppColors.error,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildAuditDetailRow(context.trc('identity.event_activity', fallback: 'Event Activity'), eventType.toString(), isDark),
            const SizedBox(height: 10),
            _buildAuditDetailRow(context.trc('identity.ip_address', fallback: 'IP Address'), ip.toString(), isDark, canCopy: true),
            const SizedBox(height: 10),
            _buildAuditDetailRow(context.trc('identity.location_origin', fallback: 'Location / Origin'), location.toString(), isDark),
            const SizedBox(height: 10),
            _buildAuditDetailRow(context.trc('identity.client_details', fallback: 'Full User Agent / Client Details'), rawDevice.toString(), isDark, canCopy: true),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.of(ctx).pop(),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: Text(context.trc('identity.close', fallback: 'Close')),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAuditDetailRow(String label, String value, bool isDark, {bool canCopy = false}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label.toUpperCase(),
                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, letterSpacing: 0.5, color: isDark ? AppColors.gray400 : AppColors.gray600),
              ),
              if (canCopy)
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: value));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('${context.trc('identity.copied_clipboard', fallback: 'Copied to clipboard')}: $label'), duration: const Duration(seconds: 1)),
                    );
                  },
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    child: Icon(Icons.copy_rounded, size: 14, color: AppColors.primary),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          SelectableText(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
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
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
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
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.3,
                          color: isDark ? AppColors.gray400 : AppColors.gray600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_forward_rounded, size: 13, color: AppColors.gray400),
                  ],
                ),
                const SizedBox(height: 8),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    value,
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: valueColor ?? (isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight),
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11.5,
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

  /// <summary>
  /// Builds MFA Verification Method Distribution Console Widget featuring an interactive Donut Chart and legend.
  /// </summary>
  /// <param name="isDark">Indicates whether the current theme is dark mode.</param>
  /// <returns>A decorated container hosting the MFA donut chart and category legend.</returns>
  Widget _buildMfaDistributionWidget(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
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
            children: [
              const Icon(Icons.phonelink_lock_outlined, size: 20, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                context.trc('identity.mfa_distribution', fallback: 'MFA Verification Method Distribution'),
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 260,
            child: _MfaDonutChart(
              mfaGoogle: _mfaGoogle,
              mfaMicrosoft: _mfaMicrosoft,
              mfaEmail: _mfaEmail,
              mfaSms: _mfaSms,
              mfaNone: _mfaNone,
              totalUsers: _totalUsers,
              isDark: isDark,
            ),
          ),
        ],
      ),
    );
  }

  /// <summary>
  /// Builds Identity Operational Overview Widget featuring an interactive Bar Chart with gridlines and Y-axis scale.
  /// </summary>
  /// <param name="isDark">Indicates whether the current theme is dark mode.</param>
  /// <returns>A decorated container hosting the operational bar chart.</returns>
  Widget _buildOperationalOverviewWidget(bool isDark) {
    final activeGuards = _totalUsers > _lockedOutCount ? _totalUsers - _lockedOutCount : 0;

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
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
            children: [
              const Icon(Icons.gpp_maybe_outlined, size: 20, color: Color(0xFF8B5CF6)),
              const SizedBox(width: 8),
              Text(
                context.trc('identity.operational_overview', fallback: 'Identity Operational Overview'),
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 260,
            child: _OperationalBarChart(
              activeGuards: activeGuards,
              lockedOut: _lockedOutCount,
              retries: _retryAlertsCount,
              isDark: isDark,
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

/// <summary>
/// Data container representing an individual slice in the MFA verification distribution donut chart.
/// </summary>
class _MfaSliceData {
  /// The human-readable label of the MFA method.
  final String label;

  /// The count of users enrolled with this MFA method.
  final int count;

  /// The percentage of total users enrolled with this MFA method.
  final int percent;

  /// The color assigned to this slice and legend indicator.
  final Color color;

  /// Creates a new [_MfaSliceData] instance.
  const _MfaSliceData({
    required this.label,
    required this.count,
    required this.percent,
    required this.color,
  });
}

/// <summary>
/// Interactive Donut Chart widget visualizing MFA verification method distribution.
/// Replicates Chart.js doughnut chart behavior with smooth entrance animations and right-aligned legend.
/// </summary>
class _MfaDonutChart extends StatefulWidget {
  final int mfaGoogle;
  final int mfaMicrosoft;
  final int mfaEmail;
  final int mfaSms;
  final int mfaNone;
  final int totalUsers;
  final bool isDark;

  const _MfaDonutChart({
    required this.mfaGoogle,
    required this.mfaMicrosoft,
    required this.mfaEmail,
    required this.mfaSms,
    required this.mfaNone,
    required this.totalUsers,
    required this.isDark,
  });

  @override
  State<_MfaDonutChart> createState() => _MfaDonutChartState();
}

class _MfaDonutChartState extends State<_MfaDonutChart> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );
    _animation = CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic);
    _animController.forward();
  }

  @override
  void didUpdateWidget(covariant _MfaDonutChart oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.mfaGoogle != widget.mfaGoogle ||
        oldWidget.mfaMicrosoft != widget.mfaMicrosoft ||
        oldWidget.mfaEmail != widget.mfaEmail ||
        oldWidget.mfaSms != widget.mfaSms ||
        oldWidget.mfaNone != widget.mfaNone ||
        oldWidget.totalUsers != widget.totalUsers) {
      _animController.forward(from: 0.0);
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final effectiveTotal = widget.totalUsers > 0
        ? widget.totalUsers
        : (widget.mfaGoogle + widget.mfaMicrosoft + widget.mfaEmail + widget.mfaSms + widget.mfaNone > 0
            ? widget.mfaGoogle + widget.mfaMicrosoft + widget.mfaEmail + widget.mfaSms + widget.mfaNone
            : 1);

    final slices = [
      _MfaSliceData(
        label: context.trc('mfa.google_authenticator', fallback: 'Google Authenticator'),
        count: widget.mfaGoogle,
        percent: ((widget.mfaGoogle / effectiveTotal) * 100).round(),
        color: const Color(0xFF0050E5), // Royal blue matching web Chart.js
      ),
      _MfaSliceData(
        label: context.trc('mfa.microsoft_authenticator', fallback: 'Microsoft Authenticator'),
        count: widget.mfaMicrosoft,
        percent: ((widget.mfaMicrosoft / effectiveTotal) * 100).round(),
        color: const Color(0xFF3B82F6), // Light blue matching web Chart.js
      ),
      _MfaSliceData(
        label: context.trc('mfa.email_otp', fallback: 'Email OTP'),
        count: widget.mfaEmail,
        percent: ((widget.mfaEmail / effectiveTotal) * 100).round(),
        color: const Color(0xFF10B981), // Emerald green matching web Chart.js
      ),
      _MfaSliceData(
        label: context.trc('mfa.sms_otp', fallback: 'SMS OTP'),
        count: widget.mfaSms,
        percent: ((widget.mfaSms / effectiveTotal) * 100).round(),
        color: const Color(0xFFF59E0B), // Amber matching web Chart.js
      ),
      _MfaSliceData(
        label: context.trc('mfa.disabled_label', fallback: 'Disabled'),
        count: widget.mfaNone,
        percent: ((widget.mfaNone / effectiveTotal) * 100).round(),
        color: widget.isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1), // Gray matching web Chart.js
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 360;

        final donutCanvas = AnimatedBuilder(
          animation: _animation,
          builder: (context, child) {
            return CustomPaint(
              size: Size.infinite,
              painter: _MfaDonutPainter(
                slices: slices,
                animationProgress: _animation.value,
                isDark: widget.isDark,
              ),
            );
          },
        );

        final legendList = Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: slices.map((slice) {
            return _buildLegendItem(
              color: slice.color,
              label: slice.label,
              count: slice.count,
              percent: slice.percent,
              isDark: widget.isDark,
            );
          }).toList(),
        );

        if (isNarrow) {
          return Column(
            children: [
              Expanded(flex: 3, child: donutCanvas),
              const SizedBox(height: 12),
              Expanded(flex: 2, child: SingleChildScrollView(child: legendList)),
            ],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              flex: 11,
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: donutCanvas,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              flex: 10,
              child: legendList,
            ),
          ],
        );
      },
    );
  }

  Widget _buildLegendItem({
    required Color color,
    required String label,
    required int count,
    required int percent,
    required bool isDark,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.5),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2.5),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            '$count ($percent%)',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.gray400 : AppColors.gray600,
            ),
          ),
        ],
      ),
    );
  }
}

/// <summary>
/// CustomPainter that renders a smooth anti-aliased Donut Chart for MFA method distribution.
/// </summary>
class _MfaDonutPainter extends CustomPainter {
  final List<_MfaSliceData> slices;
  final double animationProgress;
  final bool isDark;

  _MfaDonutPainter({
    required this.slices,
    required this.animationProgress,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final total = slices.fold<int>(0, (sum, item) => sum + item.count);
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) * 0.44;
    final strokeWidth = radius * 0.45; // Generates clean cutout hole matching Chart.js
    final arcRadius = radius - strokeWidth / 2;

    if (total == 0) {
      // Empty state circular ring
      final emptyPaint = Paint()
        ..color = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth;
      canvas.drawCircle(center, arcRadius, emptyPaint);
      return;
    }

    double currentAngle = -math.pi / 2; // Starts at 12 o'clock matching Chart.js
    final totalSweep = 2 * math.pi * animationProgress;

    for (final slice in slices) {
      if (slice.count <= 0) continue;
      final sweepAngle = (slice.count / total) * totalSweep;
      if (sweepAngle <= 0) continue;

      final paint = Paint()
        ..color = slice.color
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.butt;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: arcRadius),
        currentAngle,
        sweepAngle,
        false,
        paint,
      );

      currentAngle += sweepAngle;
    }
  }

  @override
  bool shouldRepaint(covariant _MfaDonutPainter oldDelegate) {
    return oldDelegate.animationProgress != animationProgress ||
        oldDelegate.slices != slices ||
        oldDelegate.isDark != isDark;
  }
}

/// <summary>
/// Interactive Bar Chart widget visualizing Identity Operational Posture.
/// Replicates Chart.js bar chart behavior with gridlines, vertical rounded bars, and Y-axis scale.
/// </summary>
class _OperationalBarChart extends StatefulWidget {
  final int activeGuards;
  final int lockedOut;
  final int retries;
  final bool isDark;

  const _OperationalBarChart({
    required this.activeGuards,
    required this.lockedOut,
    required this.retries,
    required this.isDark,
  });

  @override
  State<_OperationalBarChart> createState() => _OperationalBarChartState();
}

class _OperationalBarChartState extends State<_OperationalBarChart> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );
    _animation = CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic);
    _animController.forward();
  }

  @override
  void didUpdateWidget(covariant _OperationalBarChart oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.activeGuards != widget.activeGuards ||
        oldWidget.lockedOut != widget.lockedOut ||
        oldWidget.retries != widget.retries) {
      _animController.forward(from: 0.0);
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final values = [widget.activeGuards, widget.lockedOut, widget.retries];
    final labels = [
      context.trc('identity.chart_active_guards', fallback: 'Active Guards'),
      context.trc('identity.chart_locked_out', fallback: 'Locked Out'),
      context.trc('identity.chart_brute_force', fallback: 'Brute Force Attempts'),
    ];
    final colors = [
      const Color(0xFF10B981), // Emerald green matching web Chart.js
      const Color(0xFFEF4444), // Crimson red matching web Chart.js
      const Color(0xFFF59E0B), // Amber warning matching web Chart.js
    ];

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return CustomPaint(
          size: Size.infinite,
          painter: _OperationalBarChartPainter(
            values: values,
            labels: labels,
            colors: colors,
            animationProgress: _animation.value,
            isDark: widget.isDark,
          ),
        );
      },
    );
  }
}

/// <summary>
/// CustomPainter that renders vertical rounded bars with Y-axis scale, horizontal gridlines, and category labels.
/// </summary>
class _OperationalBarChartPainter extends CustomPainter {
  final List<int> values;
  final List<String> labels;
  final List<Color> colors;
  final double animationProgress;
  final bool isDark;

  _OperationalBarChartPainter({
    required this.values,
    required this.labels,
    required this.colors,
    required this.animationProgress,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    const leftMargin = 34.0;
    const rightMargin = 16.0;
    const topMargin = 16.0;
    const bottomMargin = 38.0;

    final chartWidth = size.width - leftMargin - rightMargin;
    final chartHeight = size.height - topMargin - bottomMargin;
    if (chartWidth <= 0 || chartHeight <= 0) return;

    final rawMax = values.fold<int>(0, math.max);
    final effectiveMax = rawMax == 0 ? 5 : (rawMax < 5 ? 5 : rawMax);

    // Calculate integer ticks matching web Chart.js
    final tickStep = effectiveMax <= 8
        ? 1
        : (effectiveMax <= 12 ? 2 : (effectiveMax <= 25 ? 5 : (effectiveMax / 5).ceil()));

    final List<int> ticks = [];
    for (int t = 0; t <= effectiveMax; t += tickStep) {
      ticks.add(t);
    }
    if (!ticks.contains(effectiveMax)) {
      ticks.add(effectiveMax);
    }

    final gridPaint = Paint()
      ..color = isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9)
      ..strokeWidth = 1.0;

    final axisTickColor = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    // 1. Draw horizontal grid lines & Y-axis numbers
    for (final tickVal in ticks) {
      final normalizedY = tickVal / effectiveMax;
      final y = (topMargin + chartHeight) - (normalizedY * chartHeight);

      // Grid line
      canvas.drawLine(
        Offset(leftMargin, y),
        Offset(size.width - rightMargin, y),
        gridPaint,
      );

      // Y-axis tick label
      final textSpan = TextSpan(
        text: '$tickVal',
        style: TextStyle(
          color: axisTickColor,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      );
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
      )..layout();

      textPainter.paint(
        canvas,
        Offset(leftMargin - textPainter.width - 8, y - textPainter.height / 2),
      );
    }

    // 2. Draw 3 Vertical Rounded Bars
    final slotWidth = chartWidth / values.length;
    final barWidth = math.min(slotWidth * 0.44, 54.0);

    for (int i = 0; i < values.length; i++) {
      final val = values[i];
      final centerX = leftMargin + (i + 0.5) * slotWidth;
      final barLeft = centerX - barWidth / 2;
      final barRight = centerX + barWidth / 2;
      final bottomY = topMargin + chartHeight;

      final animatedVal = val * animationProgress;
      final barHeight = (animatedVal / effectiveMax) * chartHeight;
      final topY = bottomY - barHeight;

      if (val > 0 && barHeight > 1.0) {
        final barPaint = Paint()
          ..color = colors[i]
          ..style = PaintingStyle.fill;

        final rrect = RRect.fromRectAndCorners(
          Rect.fromLTRB(barLeft, topY, barRight, bottomY),
          topLeft: const Radius.circular(6),
          topRight: const Radius.circular(6),
        );
        canvas.drawRRect(rrect, barPaint);
      } else {
        // Subtle indicator baseline bar if value is 0
        final zeroPaint = Paint()
          ..color = colors[i].withValues(alpha: 0.25)
          ..style = PaintingStyle.fill;
        canvas.drawRRect(
          RRect.fromRectAndCorners(
            Rect.fromLTRB(barLeft, bottomY - 2.5, barRight, bottomY),
            topLeft: const Radius.circular(2),
            topRight: const Radius.circular(2),
          ),
          zeroPaint,
        );
      }

      // 3. Draw X-axis label centered under each bar
      final labelSpan = TextSpan(
        text: labels[i],
        style: TextStyle(
          color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      );
      final labelPainter = TextPainter(
        text: labelSpan,
        textDirection: TextDirection.ltr,
        textAlign: TextAlign.center,
      )..layout(maxWidth: slotWidth + 8);

      labelPainter.paint(
        canvas,
        Offset(centerX - labelPainter.width / 2, bottomY + 10),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _OperationalBarChartPainter oldDelegate) {
    return oldDelegate.animationProgress != animationProgress ||
        oldDelegate.values != values ||
        oldDelegate.isDark != isDark;
  }
}

