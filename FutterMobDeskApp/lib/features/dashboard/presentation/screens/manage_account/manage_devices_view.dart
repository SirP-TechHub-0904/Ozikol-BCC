import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';

/// Screen presenting the active logged-in device sessions for the authenticated member.
/// 100% white-labeled per tenant governance rules (zero vendor branding in device names).
class ManageDevicesView extends ConsumerStatefulWidget {
  /// The active workspace organization context.
  final Workspace? workspace;

  /// Creates a [ManageDevicesView].
  const ManageDevicesView({super.key, this.workspace});

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

  IconData _resolveDeviceIcon(String deviceType, String os) {
    final lowerType = deviceType.toLowerCase();
    final lowerOs = os.toLowerCase();
    if (lowerType.contains('mobile') || lowerOs.contains('android') || lowerOs.contains('ios') || lowerOs.contains('iphone')) {
      return Icons.smartphone_rounded;
    }
    if (lowerType.contains('tablet') || lowerOs.contains('ipad')) {
      return Icons.tablet_mac_rounded;
    }
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
          // Header Card
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.devices_rounded, size: 26, color: AppColors.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Manage Devices & Connected Sessions',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Review and govern all active desktop and mobile device connections signed into your workspace.',
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ],
                ),
              ),
              if (_sessions.length > 1) ...[
                const SizedBox(width: 12),
                OutlinedButton.icon(
                  onPressed: _isTerminatingOthers ? null : _handleTerminateOthers,
                  icon: const Icon(Icons.phonelink_erase_rounded, size: 16, color: AppColors.error),
                  label: Text(
                    _isTerminatingOthers ? 'Terminating...' : 'Terminate Other Sessions',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.error),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: AppColors.error.withValues(alpha: 0.4)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 24),

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
                  TextButton(onPressed: _loadSessions, child: const Text('Retry')),
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
                  const Text('No Active Sessions Found', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text(
                    'Active device sessions will appear here automatically upon sign-in.',
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
                final deviceTitle = session['friendlyDeviceTitle'] ?? session['device'] ?? 'Desktop App on Windows';
                final browserDetails = session['friendlyBrowserDetails'] ?? session['browser'] ?? 'Desktop App • Desktop';
                final os = (session['operatingSystem'] ?? session['os'] ?? 'Unknown OS').toString();
                final deviceType = (session['deviceType'] ?? 'Desktop').toString();
                final ip = session['ipAddress'] ?? '127.0.0.1';
                final lastActive = session['lastActive'] ?? session['lastUsedAt'] ?? 'Active Now';
                final sessionId = session['sessionId'] ?? session['id'] ?? '';

                return Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isCurrent
                          ? AppColors.primary.withValues(alpha: 0.5)
                          : (isDark ? AppColors.outlineDark : AppColors.outlineLight),
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
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: isCurrent
                              ? AppColors.primary.withValues(alpha: 0.12)
                              : (isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          _resolveDeviceIcon(deviceType, os),
                          size: 22,
                          color: isCurrent ? AppColors.primary : (isDark ? AppColors.gray400 : AppColors.gray600),
                        ),
                      ),
                      const SizedBox(width: 16),

                      // Device Telemetry Details (White-Labeled)
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
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                    ),
                                  ),
                                ),
                                if (isCurrent) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                                    decoration: BoxDecoration(
                                      color: AppColors.success.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(100),
                                    ),
                                    child: const Text(
                                      'Current Session',
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.success,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '$browserDetails • IP: $ip • Last active: $lastActive',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? AppColors.gray400 : AppColors.gray600,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Revoke Button (only for remote sessions)
                      if (!isCurrent) ...[
                        const SizedBox(width: 12),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, size: 20, color: AppColors.error),
                          tooltip: 'Revoke Session',
                          onPressed: () => _handleRevoke(sessionId, deviceTitle),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}
