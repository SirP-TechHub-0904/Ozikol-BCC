import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';

/// Screen presenting the personal Workspace Home dashboard for regular workspace members.
/// Features a personalized welcome hero, quick action shortcuts, and workspace announcements.
class WorkspaceHomeView extends ConsumerWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Callback to navigate to a sub-feature index in the shell.
  final void Function(int navIndex)? onNavigate;

  /// Creates a [WorkspaceHomeView].
  const WorkspaceHomeView({
    super.key,
    this.workspace,
    this.onNavigate,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ws = workspace;
    final fullName = ws?.userFullName ?? 'Member';

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Personalized Welcome Hero
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0050E5), Color(0xFF1F6BFF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0050E5).withValues(alpha: 0.25),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: Text(
                          ws?.organizationName ?? 'Workspace Member Portal',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Welcome back, $fullName!',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Here is your personal workspace overview. Access your account credentials, security settings, and notifications.',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.white.withValues(alpha: 0.85),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                const Icon(
                  Icons.space_dashboard_rounded,
                  size: 56,
                  color: Colors.white24,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 2. Quick Action Shortcuts Section
          Text(
            'Quick Shortcuts',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            ),
          ),
          const SizedBox(height: 12),

          GridView.count(
            crossAxisCount: MediaQuery.of(context).size.width >= 900 ? 4 : 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.5,
            children: [
              _buildShortcutCard(
                context,
                isDark: isDark,
                title: 'My Profile',
                subtitle: 'Personal details & contact info',
                icon: Icons.account_circle_outlined,
                color: const Color(0xFF0050E5),
                onTap: () => onNavigate?.call(101), // My Account
              ),
              _buildShortcutCard(
                context,
                isDark: isDark,
                title: 'Change Password',
                subtitle: 'Update your security credentials',
                icon: Icons.key_outlined,
                color: const Color(0xFF0AB39C),
                onTap: () => onNavigate?.call(102), // Change Password
              ),
              _buildShortcutCard(
                context,
                isDark: isDark,
                title: '2FA Security',
                subtitle: 'Two-factor authenticator setup',
                icon: Icons.shield_outlined,
                color: const Color(0xFFF7B84B),
                onTap: () => onNavigate?.call(103), // 2FA Security
              ),
              _buildShortcutCard(
                context,
                isDark: isDark,
                title: 'Manage Devices',
                subtitle: 'Review active connected sessions',
                icon: Icons.devices_outlined,
                color: const Color(0xFF38BDF8),
                onTap: () => onNavigate?.call(104), // Manage Devices
              ),
            ],
          ),
          const SizedBox(height: 24),

          // 3. Workspace Security & Activity Summary Card
          Container(
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
                    const Icon(Icons.security_rounded, size: 20, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Text(
                      'Account Security Status',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: () => onNavigate?.call(105), // Login Activity
                      child: const Text('View Login History'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Your account was last accessed from your current device session. Review your connected devices regularly to maintain optimal workspace safety.',
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? AppColors.gray400 : AppColors.gray600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShortcutCard(
    BuildContext context, {
    required bool isDark,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 20, color: color),
            ),
            const SizedBox(height: 10),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
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
    );
  }
}
