import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:ozikol_app/core/localization/language_provider.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';
import 'widgets/account_security_header.dart';

/// Screen presenting the active logged-in device sessions for the authenticated member.
/// 100% white-labeled per tenant governance rules (zero vendor branding in device names).
class ManageDevicesView extends ConsumerStatefulWidget {
  /// The active workspace organization context.
  final Workspace? workspace;

  /// Callback to switch account navigation tabs.
  final ValueChanged<String>? onSelectTab;

  /// Creates a [ManageDevicesView].
  const ManageDevicesView({
    super.key,
    this.workspace,
    this.onSelectTab,
  });

  @override
  ConsumerState<ManageDevicesView> createState() => _ManageDevicesViewState();
}

class _ManageDevicesViewState extends ConsumerState<ManageDevicesView> {
  bool _isLoading = true;
  bool _isTerminatingOthers = false;
  List<Map<String, dynamic>> _sessions = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  Future<void> _loadSessions() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(accountRepositoryProvider);
      final list = await repo.getActiveSessions();
      setState(() {
        _sessions = list;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Unable to retrieve connected devices.';
      });
    }
  }

  /// <summary>
  /// Formats raw UTC timestamp into clean, exact local device time (e.g. Oct 24, 2026 • 7:45 AM).
  /// </summary>
  /// <param name="raw">The raw ISO string or timestamp from the backend.</param>
  /// <returns>Formatted local date and time string.</returns>
  String _formatExactTime(dynamic raw) {
    if (raw == null) return 'account.active_now'.tr(ref, fallback: 'Active Now');
    final str = raw.toString().trim();
    if (str.isEmpty || str == 'Active Now') return 'account.active_now'.tr(ref, fallback: 'Active Now');
    final dt = DateTime.tryParse(str);
    if (dt == null) return str;
    final localDt = dt.toLocal();
    return DateFormat('MMM d, yyyy • h:mm a').format(localDt);
  }

  /// <summary>
  /// Determines whether a session is actively in communication (within last 15 mins) or idle.
  /// </summary>
  /// <param name="raw">The raw lastActive timestamp.</param>
  /// <param name="isCurrent">Whether this is the current active client session.</param>
  /// <returns>True if active, false if idle.</returns>
  bool _isSessionActive(dynamic raw, bool isCurrent) {
    if (isCurrent) return true;
    if (raw == null) return false;
    final dt = DateTime.tryParse(raw.toString().trim());
    if (dt == null) return false;
    final diff = DateTime.now().toUtc().difference(dt.toUtc());
    return diff.inMinutes <= 15;
  }

  Future<void> _handleRevoke(String sessionId, String deviceName) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Revoke Device Session?'),
        content: Text('Are you sure you want to log out "$deviceName"? The device will need to re-authenticate.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Revoke Session'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final repo = ref.read(accountRepositoryProvider);
    final success = await repo.revokeSession(sessionId);
    if (success) {
      _loadSessions();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Device session revoked successfully.')),
        );
      }
    }
  }

  Future<void> _handleTerminateOthers() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Terminate All Other Sessions?'),
        content: const Text('This will immediately log out all connected devices except this current session.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Terminate Others'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isTerminatingOthers = true);
    final repo = ref.read(accountRepositoryProvider);
    final success = await repo.terminateOtherSessions();
    setState(() => _isTerminatingOthers = false);

    if (success) {
      _loadSessions();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('All other remote device sessions terminated.')),
        );
      }
    }
  }

  IconData _resolveDeviceIcon(String deviceType, String os, {String? clientType, String? browserName, String? deviceTitle}) {
    final lowerTitle = (deviceTitle ?? '').toLowerCase();
    final lowerBrowser = (browserName ?? '').toLowerCase();
    final lowerClient = (clientType ?? '').toLowerCase();
    final lowerType = deviceType.toLowerCase();
    final lowerOs = os.toLowerCase();

    // 1. Mobile or Tablet
    if (lowerType.contains('mobile') || lowerClient.contains('mobile') || lowerOs.contains('android') || lowerOs.contains('ios') || lowerOs.contains('iphone')) {
      return Icons.smartphone_rounded;
    }
    if (lowerType.contains('tablet') || lowerOs.contains('ipad')) {
      return Icons.tablet_mac_rounded;
    }

    // 2. Web Browsers (Chrome, Edge, Firefox, Safari, Web)
    if (lowerClient.contains('web') ||
        lowerBrowser.contains('chrome') ||
        lowerBrowser.contains('firefox') ||
        lowerBrowser.contains('edge') ||
        lowerBrowser.contains('safari') ||
        lowerTitle.contains('chrome') ||
        lowerTitle.contains('firefox') ||
        lowerTitle.contains('edge') ||
        lowerTitle.contains('safari') ||
        lowerTitle.contains('web browser')) {
      return Icons.language_rounded;
    }

    // 3. Desktop Application
    if (lowerOs.contains('mac') || lowerOs.contains('darwin')) {
      return Icons.laptop_mac_rounded;
    }
    return Icons.desktop_windows_rounded;
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
            activeTab: 'devices',
            onSelectTab: widget.onSelectTab,
            workspace: widget.workspace,
            activeDevicesCount: _sessions.length,
          ),
          const SizedBox(height: 20),

          // Section Card matching Web .card-section and .section-card-head
          AccountSectionCard(
            icon: Icons.devices_rounded,
            title: 'account.tab_devices'.tr(ref, fallback: 'Manage Devices & Connected Sessions'),
            description: 'account.manage_devices_desc'.tr(ref, fallback: 'Review and revoke active login sessions and trusted devices logged into your account.'),
            action: _sessions.length > 1
                ? OutlinedButton.icon(
                    onPressed: _isTerminatingOthers ? null : _handleTerminateOthers,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: BorderSide(color: AppColors.error.withValues(alpha: 0.5)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: _isTerminatingOthers
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.error),
                          )
                        : const Icon(Icons.phonelink_erase_rounded, size: 16),
                    label: Text(
                      _isTerminatingOthers
                          ? 'account.terminate_others'.tr(ref, fallback: 'Terminating...')
                          : 'account.terminate_others'.tr(ref, fallback: 'Terminate All Other Sessions'),
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                    ),
                  )
                : null,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [

          // Error Banner
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
                  TextButton(
                    onPressed: _loadSessions,
                    child: Text('btn.retry'.tr(ref, fallback: 'Retry')),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Loading Skeleton
          if (_isLoading) ...[
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: CircularProgressIndicator(),
              ),
            ),
          ] else if (_sessions.isEmpty) ...[
            // Empty State
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(40),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
              ),
              child: Column(
                children: [
                  Icon(Icons.devices_other_rounded, size: 48, color: isDark ? AppColors.gray400 : AppColors.gray500),
                  const SizedBox(height: 12),
                  Text(
                    'account.no_devices'.tr(ref, fallback: 'No active device sessions found.'),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'account.manage_devices_desc'.tr(ref, fallback: 'Active device sessions will appear here automatically upon sign-in.'),
                    style: TextStyle(fontSize: 13, color: isDark ? AppColors.gray400 : AppColors.gray600),
                  ),
                ],
              ),
            ),
          ] else ...[
            // Sessions List
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _sessions.length,
              separatorBuilder: (_, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final session = _sessions[index];
                final isCurrent = session['isCurrent'] == true || session['isCurrentSession'] == true;
                final isTrusted = session['isTrusted'] == true;
                final deviceTitle = session['friendlyDeviceTitle'] ?? session['device'] ?? 'Desktop App on Windows';
                final browserDetails = session['friendlyBrowserDetails'] ?? session['browser'] ?? 'Desktop App • Desktop';
                final clientType = session['clientType']?.toString();
                final browserName = session['browserName']?.toString();
                final os = (session['operatingSystem'] ?? session['os'] ?? 'Unknown OS').toString();
                final deviceType = (session['deviceType'] ?? 'Desktop').toString();
                final rawLastActive = session['lastActive'] ?? session['lastUsedAt'];
                final isActive = _isSessionActive(rawLastActive, isCurrent);
                final formattedTime = _formatExactTime(rawLastActive);
                final sessionId = session['sessionId'] ?? session['id'] ?? '';

                return Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => _showDeviceDetailsModal(session),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isCurrent
                              ? AppColors.primary.withValues(alpha: 0.5)
                              : (isTrusted
                                  ? AppColors.success.withValues(alpha: 0.4)
                                  : (isDark ? AppColors.outlineDark : AppColors.outlineLight)),
                          width: isCurrent ? 1.5 : 1.0,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          // Device Form Factor Avatar
                          Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              color: isCurrent
                                  ? AppColors.primary.withValues(alpha: 0.12)
                                  : (isTrusted
                                      ? AppColors.success.withValues(alpha: 0.12)
                                      : (isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9))),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              _resolveDeviceIcon(deviceType, os, clientType: clientType, browserName: browserName, deviceTitle: deviceTitle),
                              size: 20,
                              color: isCurrent
                                  ? AppColors.primary
                                  : (isTrusted ? AppColors.success : (isDark ? AppColors.gray400 : AppColors.gray600)),
                            ),
                          ),
                          const SizedBox(width: 12),

                          // Device Telemetry Details (Minimized for maximum mobile clarity)
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        deviceTitle,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.bold,
                                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    if (isCurrent)
                                      _buildStatusBadge(
                                        text: 'account.this_device'.tr(ref, fallback: 'Current'),
                                        color: AppColors.primary,
                                      )
                                    else if (isActive)
                                      _buildStatusBadge(
                                        text: 'status.active'.tr(ref, fallback: 'Active'),
                                        color: AppColors.success,
                                        isDot: true,
                                      )
                                    else
                                      _buildStatusBadge(
                                        text: 'account.idle'.tr(ref, fallback: 'Idle'),
                                        color: const Color(0xFFD97706),
                                        isDot: true,
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  '$browserDetails • $formattedTime',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    color: isDark ? AppColors.gray400 : AppColors.gray600,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(width: 4),

                          // Info Action (Opens Modal)
                          IconButton(
                            icon: Icon(
                              Icons.info_outline_rounded,
                              size: 19,
                              color: isDark ? AppColors.gray400 : AppColors.gray500,
                            ),
                            tooltip: 'account.view_details'.tr(ref, fallback: 'View Details'),
                            onPressed: () => _showDeviceDetailsModal(session),
                          ),

                          // Revoke Button (only for remote sessions)
                          if (!isCurrent)
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, size: 19, color: AppColors.error),
                              tooltip: 'account.terminate_session'.tr(ref, fallback: 'Revoke Session'),
                              onPressed: () => _handleRevoke(sessionId, deviceTitle),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ],
      ),
    ),
    // Safe bottom spacing to prevent floating AI assistant button from obstructing list content
    const SizedBox(height: 80),
  ],
),
);
  }

  /// <summary>
  /// Builds a compact status badge pill for list items.
  /// </summary>
  /// <param name="text">The label text to display.</param>
  /// <param name="color">The theme accent color.</param>
  /// <param name="isDot">Whether to render a pulsing indicator dot.</param>
  /// <returns>A styled badge widget.</returns>
  Widget _buildStatusBadge({
    required String text,
    required Color color,
    bool isDot = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isDot) ...[
            Container(
              width: 5,
              height: 5,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color,
              ),
            ),
            const SizedBox(width: 4),
          ],
          Text(
            text,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  /// <summary>
  /// Displays a comprehensive bottom sheet modal presenting the full device telemetry,
  /// verified trust status, client browser fingerprints, and remote session termination controls.
  /// </summary>
  /// <param name="session">The device session map.</param>
  void _showDeviceDetailsModal(Map<String, dynamic> session) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isCurrent = session['isCurrent'] == true || session['isCurrentSession'] == true;
    final isTrusted = session['isTrusted'] == true;
    final deviceTitle = session['friendlyDeviceTitle'] ?? session['device'] ?? 'Desktop App on Windows';
    final browserDetails = session['friendlyBrowserDetails'] ?? session['browser'] ?? 'Desktop App • Desktop';
    final clientType = session['clientType']?.toString();
    final browserName = session['browserName']?.toString();
    final os = (session['operatingSystem'] ?? session['os'] ?? 'Unknown OS').toString();
    final deviceType = (session['deviceType'] ?? 'Desktop').toString();
    final ip = session['ipAddress'] ?? '127.0.0.1';
    final rawLastActive = session['lastActive'] ?? session['lastUsedAt'];
    final isActive = _isSessionActive(rawLastActive, isCurrent);
    final formattedTime = _formatExactTime(rawLastActive);
    final rawCreatedAt = session['createdAt'] ?? session['firstLoginAt'] ?? session['created'];
    final formattedCreatedTime = rawCreatedAt != null ? _formatExactTime(rawCreatedAt) : 'Unknown';
    final sessionId = session['sessionId'] ?? session['id'] ?? '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) {
        return Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 540),
            margin: EdgeInsets.only(
              bottom: MediaQuery.of(modalContext).viewInsets.bottom,
            ),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 20,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Pull Handle
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Header: Avatar + Title + Badges
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            color: isCurrent
                                ? AppColors.primary.withValues(alpha: 0.12)
                                : (isTrusted
                                    ? AppColors.success.withValues(alpha: 0.12)
                                    : (isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9))),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Icon(
                            _resolveDeviceIcon(deviceType, os, clientType: clientType, browserName: browserName, deviceTitle: deviceTitle),
                            size: 26,
                            color: isCurrent
                                ? AppColors.primary
                                : (isTrusted ? AppColors.success : (isDark ? AppColors.gray400 : AppColors.gray600)),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                deviceTitle,
                                style: TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Wrap(
                                spacing: 8,
                                runSpacing: 6,
                                children: [
                                  if (isCurrent)
                                    _buildBadge(
                                      text: 'account.this_device'.tr(ref, fallback: 'Current Device'),
                                      bg: AppColors.primary.withValues(alpha: 0.12),
                                      fg: AppColors.primary,
                                      border: AppColors.primary.withValues(alpha: 0.3),
                                    ),
                                  _buildBadge(
                                    text: isActive
                                        ? (isCurrent
                                            ? 'account.active_now'.tr(ref, fallback: 'Active Now')
                                            : 'status.active'.tr(ref, fallback: 'Active'))
                                        : 'account.idle'.tr(ref, fallback: 'Idle'),
                                    bg: isActive
                                        ? AppColors.success.withValues(alpha: 0.12)
                                        : const Color(0xFFF59E0B).withValues(alpha: 0.12),
                                    fg: isActive ? AppColors.success : const Color(0xFFD97706),
                                    border: isActive
                                        ? AppColors.success.withValues(alpha: 0.3)
                                        : const Color(0xFFF59E0B).withValues(alpha: 0.3),
                                    dotColor: isActive ? AppColors.success : const Color(0xFFF59E0B),
                                  ),
                                  if (isTrusted)
                                    _buildBadge(
                                      text: 'account.trusted_device'.tr(ref, fallback: 'Trusted Device'),
                                      bg: AppColors.success.withValues(alpha: 0.12),
                                      fg: AppColors.success,
                                      border: AppColors.success.withValues(alpha: 0.3),
                                      icon: Icons.verified_user_rounded,
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => Navigator.of(modalContext).pop(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    const Divider(height: 1),
                    const SizedBox(height: 16),

                    // Details Section Title
                    Text(
                      'account.session_telemetry'.tr(ref, fallback: 'Session Telemetry & Security'),
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Telemetry Tiles
                    _buildModalTile(
                      icon: Icons.devices_rounded,
                      label: 'account.client_and_os'.tr(ref, fallback: 'Client & Platform'),
                      value: '$browserDetails • $os',
                      isDark: isDark,
                    ),
                    _buildModalTile(
                      icon: Icons.language_rounded,
                      label: 'account.ip_address'.tr(ref, fallback: 'IP Address'),
                      value: ip,
                      isDark: isDark,
                      trailing: IconButton(
                        icon: const Icon(Icons.copy_rounded, size: 16),
                        tooltip: 'Copy IP',
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: ip));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('IP address copied to clipboard')),
                          );
                        },
                      ),
                    ),
                    _buildModalTile(
                      icon: Icons.login_rounded,
                      label: 'account.logged_in_since'.tr(ref, fallback: 'Logged In Since'),
                      value: formattedCreatedTime,
                      isDark: isDark,
                    ),
                    _buildModalTile(
                      icon: Icons.schedule_rounded,
                      label: 'account.last_active'.tr(ref, fallback: 'Last Active'),
                      value: formattedTime,
                      isDark: isDark,
                    ),
                    if (sessionId.isNotEmpty)
                      _buildModalTile(
                        icon: Icons.fingerprint_rounded,
                        label: 'account.session_id'.tr(ref, fallback: 'Session Identifier'),
                        value: sessionId,
                        isDark: isDark,
                        trailing: IconButton(
                          icon: const Icon(Icons.copy_rounded, size: 16),
                          tooltip: 'Copy Session ID',
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: sessionId));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Session ID copied to clipboard')),
                            );
                          },
                        ),
                      ),

                    const SizedBox(height: 24),

                    // Action Buttons
                    Row(
                      children: [
                        if (!isCurrent) ...[
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {
                                Navigator.of(modalContext).pop();
                                _handleRevoke(sessionId, deviceTitle);
                              },
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.error,
                                side: BorderSide(color: AppColors.error.withValues(alpha: 0.5)),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              icon: const Icon(Icons.delete_outline_rounded, size: 18),
                              label: Text(
                                'account.terminate_session'.tr(ref, fallback: 'Terminate Session'),
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                        ],
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () => Navigator.of(modalContext).pop(),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                              foregroundColor: isDark ? Colors.white : const Color(0xFF1E293B),
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: const Text('Close', style: TextStyle(fontWeight: FontWeight.w600)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  /// <summary>
  /// Builds a colored pill badge for status highlights.
  /// </summary>
  Widget _buildBadge({
    required String text,
    required Color bg,
    required Color fg,
    Color? border,
    Color? dotColor,
    IconData? icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(100),
        border: border != null ? Border.all(color: border) : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dotColor != null) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: dotColor,
              ),
            ),
            const SizedBox(width: 5),
          ],
          if (icon != null) ...[
            Icon(icon, size: 12, color: fg),
            const SizedBox(width: 4),
          ],
          Text(
            text,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }

  /// <summary>
  /// Builds a key-value detail tile for the modal dialog.
  /// </summary>
  Widget _buildModalTile({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
    Widget? trailing,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: isDark ? AppColors.gray400 : AppColors.gray500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                  ),
                ),
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}
