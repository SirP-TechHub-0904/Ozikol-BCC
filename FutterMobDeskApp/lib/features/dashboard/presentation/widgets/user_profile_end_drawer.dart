import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/localization/language_provider.dart';
import '../../../../core/models/workspace.dart';
import '../../../../core/services/connectivity_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/oz_lang_switcher.dart';
import '../../../../core/widgets/tenant_avatar.dart';
import '../../../workspace_auth/state/workspace_state.dart';

/// <summary>
/// Right-floating slide-out profile and governance drawer (endDrawer).
/// Houses user profile summary, console mode switching (Admin vs. Member),
/// multi-tenant organization switching, account management & 2FA security,
/// and language selection.
/// </summary>
class UserProfileEndDrawer extends ConsumerWidget {
  /// The active workspace descriptor for the current session.
  final Workspace? activeWorkspace;

  /// Callback to invoke when switching workspace / tenant organization.
  final VoidCallback onSwitchWorkspace;

  /// Callback to invoke when signing out of the active workspace.
  final VoidCallback onSignOut;

  /// Creates a [UserProfileEndDrawer].
  const UserProfileEndDrawer({
    super.key,
    required this.activeWorkspace,
    required this.onSwitchWorkspace,
    required this.onSignOut,
  });

  String _getUserInitials(String? name) {
    if (name == null || name.trim().isEmpty) return 'U';
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      final f = parts[0].isNotEmpty ? parts[0][0] : '';
      final s = parts[1].isNotEmpty ? parts[1][0] : '';
      return '$f$s'.toUpperCase();
    }
    return name.substring(0, name.length >= 2 ? 2 : name.length).toUpperCase();
  }

  String _getUserRoleBadge(Workspace? ws) {
    if (ws == null) return 'Member';
    if (ws.isSuperAdmin) return 'SuperAdmin';
    if (ws.isAdmin) return 'Admin';
    if (ws.userRoles.isNotEmpty) {
      final role = ws.userRoles.first;
      return role[0].toUpperCase() + role.substring(1);
    }
    return 'Member';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final drawerBg = isDark ? AppColors.surfaceDark : Colors.white;
    final cardBg = isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC);
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final textColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);
    final subColor = isDark ? AppColors.gray400 : const Color(0xFF64748B);

    final connStatus = ref.watch(connectivityStatusProvider);
    final isOnline = connStatus == ConnectivityStatus.online;

    final ws = activeWorkspace;
    final canAccessAdmin = ws?.canAccessAdminConsole ?? false;
    final isAdministration = ws?.activeConsoleMode != 'workspace';
    final userName = (ws?.userFullName != null && ws!.userFullName!.trim().isNotEmpty)
        ? ws.userFullName!
        : 'Workspace Member';
    final userEmail = ws?.userEmail ?? '';

    return Drawer(
      backgroundColor: drawerBg,
      width: 330,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.horizontal(left: Radius.circular(20)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            // Drawer Top Bar with Title and Close Icon
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'profile.user_profile'.tr(ref, fallback: 'User Profile'),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: textColor,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Close',
                    icon: Icon(Icons.close_rounded, size: 22, color: subColor),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            Divider(height: 1, color: borderColor),

            // Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. User Identity Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: borderColor),
                      ),
                      child: Row(
                        children: [
                          Stack(
                            clipBehavior: Clip.none,
                            children: [
                              Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  _getUserInitials(userName),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 17,
                                  ),
                                ),
                              ),
                              Positioned(
                                right: 0,
                                bottom: 0,
                                child: Container(
                                  width: 13,
                                  height: 13,
                                  decoration: BoxDecoration(
                                    color: isOnline ? const Color(0xFF22C55E) : const Color(0xFFEF4444),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: cardBg, width: 2),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  userName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: textColor,
                                  ),
                                ),
                                if (userEmail.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    userEmail,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontFamily: 'monospace',
                                      color: subColor,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 5),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    _getUserRoleBadge(ws),
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.primary,
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 18),

                    // 2. Switch Between Admin & Member Mode (Strictly if Privileged)
                    if (canAccessAdmin) ...[
                      Text(
                        'profile.workspace_mode'.tr(ref, fallback: 'WORKSPACE MODE'),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                          color: subColor,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        height: 38,
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: cardBg,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: borderColor),
                        ),
                        child: Row(
                          children: [
                            // Administration Option
                            Expanded(
                              child: InkWell(
                                borderRadius: BorderRadius.circular(8),
                                onTap: () {
                                  if (ws?.activeConsoleMode != 'administration') {
                                    ref.read(workspaceStateProvider.notifier).switchConsoleMode('administration');
                                  }
                                },
                                child: Container(
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: isAdministration ? AppColors.primary : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.admin_panel_settings_rounded,
                                        size: 14,
                                        color: isAdministration ? Colors.white : subColor,
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        'Admin',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: isAdministration ? Colors.white : subColor,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            // Member Workspace Option
                            Expanded(
                              child: InkWell(
                                borderRadius: BorderRadius.circular(8),
                                onTap: () {
                                  if (ws?.activeConsoleMode != 'workspace') {
                                    ref.read(workspaceStateProvider.notifier).switchConsoleMode('workspace');
                                  }
                                },
                                child: Container(
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: !isAdministration ? AppColors.primary : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.person_rounded,
                                        size: 14,
                                        color: !isAdministration ? Colors.white : subColor,
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        'Member',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: !isAdministration ? Colors.white : subColor,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                    ],

                    // 3. Switch Organization / Namespace Section
                    Text(
                      'profile.active_workspace'.tr(ref, fallback: 'ORGANIZATION NAMESPACE'),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                        color: subColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: borderColor),
                      ),
                      child: Row(
                        children: [
                          TenantAvatar(
                            iconUrl: ws?.iconUrl,
                            logoUrl: ws?.logoUrl,
                            name: ws?.displayName ?? 'Business Command Center',
                            tenantKey: ws?.tenantKey ?? 'workspace',
                            size: 36,
                            borderRadius: 8,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  ws?.displayName ?? 'Business Command Center',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: textColor,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  ws?.primaryDomain ?? 'workspace.domain.com',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: subColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.of(context).pop();
                              onSwitchWorkspace();
                            },
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.swap_horiz_rounded, size: 16, color: AppColors.primary),
                                const SizedBox(width: 4),
                                Text(
                                  'Switch',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 18),

                    // 4. Account Management & 2FA Security
                    Text(
                      'profile.account_security'.tr(ref, fallback: 'ACCOUNT & SECURITY'),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                        color: subColor,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Profile Settings
                    _buildActionTile(
                      isDark: isDark,
                      icon: Icons.person_outline_rounded,
                      title: 'profile.manage_account'.tr(ref, fallback: 'Manage Account & Profile'),
                      subtitle: 'Edit name, photo, password',
                      onTap: () {
                        Navigator.of(context).pop();
                        _showManageAccountDialog(context, isDark, ws);
                      },
                    ),

                    const SizedBox(height: 8),

                    // 2FA Two-Factor Authentication
                    _buildActionTile(
                      isDark: isDark,
                      icon: Icons.security_rounded,
                      iconColor: const Color(0xFF16A34A),
                      iconBg: const Color(0xFF22C55E).withValues(alpha: 0.12),
                      title: 'profile.two_factor_auth'.tr(ref, fallback: 'Two-Factor Authentication (2FA)'),
                      subtitle: 'Email, SMS, App OTP, WhatsApp',
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF22C55E).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'profile.two_factor_status_enabled'.tr(ref, fallback: '2FA Active'),
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF16A34A),
                          ),
                        ),
                      ),
                      onTap: () {
                        Navigator.of(context).pop();
                        _show2FaDialog(context, isDark, ws);
                      },
                    ),

                    const SizedBox(height: 8),

                    // Linked Devices & Active Sessions
                    _buildActionTile(
                      isDark: isDark,
                      icon: Icons.devices_rounded,
                      title: 'profile.linked_devices'.tr(ref, fallback: 'Linked Devices & Sessions'),
                      subtitle: 'Active app, desktop & web logins',
                      onTap: () {
                        Navigator.of(context).pop();
                        _showLinkedDevicesDialog(context, isDark, ws);
                      },
                    ),

                    const SizedBox(height: 8),

                    // User Activity Logs
                    _buildActionTile(
                      isDark: isDark,
                      icon: Icons.history_rounded,
                      title: 'profile.activity_logs'.tr(ref, fallback: 'User Activity Logs'),
                      subtitle: 'Recent sign-ins & security audit',
                      onTap: () {
                        Navigator.of(context).pop();
                        _showActivityLogsDialog(context, isDark, ws);
                      },
                    ),

                    const SizedBox(height: 18),

                    // 5. Language Switcher (Central Frosted Glass Pattern)
                    Text(
                      'shell.select_language'.tr(ref, fallback: 'LANGUAGE'),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                        color: subColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: borderColor),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.language_rounded, size: 18, color: AppColors.primary),
                              SizedBox(width: 10),
                              Text(
                                'Display Language',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                          OzLangSwitcher(),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // 6. Sign Out Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.of(context).pop();
                          onSignOut();
                        },
                        icon: const Icon(Icons.logout_rounded, size: 16, color: Colors.white),
                        label: Text(
                          'shell.sign_out'.tr(ref, fallback: 'Sign Out'),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEF4444),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionTile({
    required bool isDark,
    required IconData icon,
    required String title,
    required String subtitle,
    Color? iconBg,
    Color? iconColor,
    Widget? trailing,
    required VoidCallback onTap,
  }) {
    final cardBg = isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC);
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final textColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);
    final subColor = isDark ? AppColors.gray400 : const Color(0xFF64748B);

    return Material(
      color: cardBg,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: iconBg ?? AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: Icon(icon, size: 18, color: iconColor ?? AppColors.primary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 10.5,
                        color: subColor,
                      ),
                    ),
                  ],
                ),
              ),
              if (trailing != null) ...[
                const SizedBox(width: 8),
                trailing,
              ],
              const SizedBox(width: 4),
              Icon(Icons.chevron_right_rounded, size: 18, color: subColor),
            ],
          ),
        ),
      ),
    );
  }

  void _showManageAccountDialog(BuildContext context, bool isDark, Workspace? ws) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.person_outline_rounded, color: AppColors.primary),
            SizedBox(width: 8),
            Text('Manage Profile & Account', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Full Name: ${ws?.userFullName ?? 'Workspace Member'}'),
            const SizedBox(height: 6),
            Text('Email: ${ws?.userEmail ?? 'Not specified'}'),
            const SizedBox(height: 6),
            Text('Organization: ${ws?.displayName ?? 'Business Command Center'}'),
            const SizedBox(height: 12),
            const Text(
              'Profile credentials, authentication methods, and notification preferences can be customized in the security center.',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _show2FaDialog(BuildContext context, bool isDark, Workspace? ws) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.shield_rounded, color: Color(0xFF16A34A)),
            SizedBox(width: 8),
            Text('Two-Factor Authentication', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Secure your account with multi-channel one-time passcode verification.',
              style: TextStyle(fontSize: 12.5),
            ),
            const SizedBox(height: 14),
            _build2FaMethodRow(Icons.mail_outline_rounded, 'Email OTP Verification', 'Active • Primary', true),
            const SizedBox(height: 8),
            _build2FaMethodRow(Icons.sms_outlined, 'SMS Text Verification', 'Active', true),
            const SizedBox(height: 8),
            _build2FaMethodRow(Icons.app_registration_rounded, 'Google / Microsoft Authenticator', 'Supported', true),
            const SizedBox(height: 8),
            _build2FaMethodRow(Icons.chat_bubble_outline_rounded, 'WhatsApp OTP Verification', 'Available', true),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  Widget _build2FaMethodRow(IconData icon, String title, String status, bool enabled) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF22C55E).withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: const Color(0xFF16A34A)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ),
          Text(
            status,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF16A34A)),
          ),
        ],
      ),
    );
  }

  void _showLinkedDevicesDialog(BuildContext context, bool isDark, Workspace? ws) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.devices_rounded, color: AppColors.primary),
            SizedBox(width: 8),
            Text('Linked Devices & Sessions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildDeviceRow(Icons.laptop_chromebook_rounded, 'Current Application Session', 'Windows / Desktop • Active now', true),
            const SizedBox(height: 8),
            _buildDeviceRow(Icons.phone_android_rounded, 'Mobile BCC App', 'Android / iOS • Last seen today', false),
            const SizedBox(height: 8),
            _buildDeviceRow(Icons.public_rounded, 'BCC Web Console', 'Chrome on Windows • Active session', false),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceRow(IconData icon, String title, String subtitle, bool isCurrent) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: isCurrent ? AppColors.primary.withValues(alpha: 0.08) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: isCurrent ? AppColors.primary.withValues(alpha: 0.3) : const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: isCurrent ? AppColors.primary : const Color(0xFF64748B)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                Text(subtitle, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
              ],
            ),
          ),
          if (isCurrent)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text('Current', style: TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.w700)),
            ),
        ],
      ),
    );
  }

  void _showActivityLogsDialog(BuildContext context, bool isDark, Workspace? ws) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.history_rounded, color: AppColors.primary),
            SizedBox(width: 8),
            Text('User Activity Logs', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildLogItem('Session Authenticated', 'Successful sign-in to workspace', 'Just now'),
            const SizedBox(height: 6),
            _buildLogItem('Organization Verified', 'Resolved tenant catalog credentials', '1 hour ago'),
            const SizedBox(height: 6),
            _buildLogItem('2FA Token Validated', 'Email OTP confirmation completed', 'Today'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildLogItem(String action, String details, String time) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle_outline_rounded, size: 14, color: Color(0xFF16A34A)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(action, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                Text(details, style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
              ],
            ),
          ),
          Text(time, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
        ],
      ),
    );
  }
}
