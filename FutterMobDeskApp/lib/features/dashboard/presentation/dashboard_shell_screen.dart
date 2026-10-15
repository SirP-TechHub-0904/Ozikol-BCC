import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/services/in_app_update_service.dart';
import '../../../core/widgets/activity_tile.dart';
import '../../../core/widgets/app_badge.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/app_top_bar.dart';
import '../../../core/widgets/contextual_info_button.dart';
import '../../../core/widgets/offline_status_bar.dart';
import '../../../core/widgets/tenant_avatar.dart';
import '../../../core/widgets/update_banner.dart';
import '../../../core/theme/theme_provider.dart';
import '../../workspace_auth/presentation/workspace_entry_screen.dart';
import '../../workspace_auth/presentation/workspace_switcher_dock.dart';
import '../../workspace_auth/state/workspace_state.dart';
import '../../notifications/data/notification_service.dart';
import '../../notifications/presentation/notifications_sheet.dart';

/// Clean adaptive dashboard shell accommodating desktop window layouts (multi-column)
/// and mobile viewports (bottom navigation + drawer), powered by the unified UI kit.
class DashboardShellScreen extends ConsumerStatefulWidget {
  /// Creates the primary [DashboardShellScreen].
  const DashboardShellScreen({super.key});

  @override
  ConsumerState<DashboardShellScreen> createState() => _DashboardShellScreenState();
}

class _DashboardShellScreenState extends ConsumerState<DashboardShellScreen> {
  int _selectedNavIndex = 0;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workspaceStateProvider);
    final notifState = ref.watch(notificationProvider);
    final updateAsync = ref.watch(appUpdateCheckProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeWs = state.activeWorkspace;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= 900;

        if (isDesktop) {
          return _buildDesktopLayout(
            context,
            isDark: isDark,
            activeWs: activeWs,
            notifCount: notifState.unreadCount,
            updateAsync: updateAsync,
          );
        }

        return _buildMobileLayout(
          context,
          isDark: isDark,
          activeWs: activeWs,
          notifCount: notifState.unreadCount,
          updateAsync: updateAsync,
        );
      },
    );
  }

  // =========================================================================
  // DESKTOP LAYOUT (>= 900px)
  // =========================================================================

  Widget _buildDesktopLayout(
    BuildContext context, {
    required bool isDark,
    required dynamic activeWs,
    required int notifCount,
    required AsyncValue<dynamic> updateAsync,
  }) {
    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      body: Row(
        children: [
          // 1. Far Left Multi-Tenant Workspace Switcher Dock (68px)
          const WorkspaceSwitcherDock(),

          // 2. Persistent Adaptive Left Navigation Sidebar (250px)
          AppDrawer(
            isPermanentSidebar: true,
            width: 250,
            header: _buildDesktopSidebarHeader(isDark, activeWs),
            sections: _buildNavigationSections(isDark),
            footer: _buildDesktopSidebarFooter(isDark, activeWs),
          ),

          // 3. Main Workspace Canvas
          Expanded(
            child: Column(
              children: [
                // Top Application Bar with Notifications & Theme Switcher
                AppTopBar(
                  leadingType: AppTopBarLeadingType.none,
                  title: activeWs?.displayName ?? 'Workspace',
                  subtitle: activeWs?.primaryDomain ?? 'domain.ozikol.cloud',
                  actions: [
                    AppTopBarAction(
                      icon: Icons.notifications_none_rounded,
                      tooltip: 'Notifications',
                      badge: notifCount > 0
                          ? AppBadge(text: '$notifCount', backgroundColor: AppColors.error)
                          : null,
                      onTap: () => NotificationsSheet.show(context),
                    ),
                    AppTopBarAction(
                      icon: isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                      tooltip: 'Toggle Theme',
                      onTap: () => _toggleTheme(),
                    ),
                  ],
                ),

                // In-App Update Banner
                updateAsync.maybeWhen(
                  data: (res) => res.hasUpdate && res.updateInfo != null
                      ? UpdateBanner(updateInfo: res.updateInfo!)
                      : const SizedBox.shrink(),
                  orElse: () => const SizedBox.shrink(),
                ),

                // Offline Network Resilience Bar
                const OfflineStatusBar(),

                // 2-Column Responsive Landing Content Area
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(28),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Left Column (60%): Hero, KPIs & Quick Action Capabilities
                        Expanded(
                          flex: 6,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildWorkspaceHeroCard(isDark, activeWs),
                              const SizedBox(height: 24),
                              _buildSectionHeader(
                                isDark,
                                title: 'Workspace Overview',
                                infoTitle: 'Workspace Telemetry & Capabilities',
                                infoPurpose:
                                    'Summarizes live operational metrics, member directory counts, and active modular capabilities for this tenant organization.',
                              ),
                              const SizedBox(height: 14),
                              _buildMetricsGrid(isDark, activeWs),
                              const SizedBox(height: 28),
                              _buildSectionHeader(
                                isDark,
                                title: 'Quick Operations',
                                infoTitle: 'Modular Operational Actions',
                                infoPurpose:
                                    'Launch common administrative workflows, invite new members, or engage the Ozi AI studio assistant.',
                              ),
                              const SizedBox(height: 14),
                              _buildQuickActionsGrid(isDark),
                            ],
                          ),
                        ),

                        const SizedBox(width: 24),

                        // Right Column (40%): Live Activity Feed & Audit Log
                        Expanded(
                          flex: 4,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSectionHeader(
                                isDark,
                                title: 'Recent Activity & Telemetry',
                                infoTitle: 'Audit Logs & Telemetry Stream',
                                infoPurpose:
                                    'Real-time stream of member actions, system events, and notification dispatches for compliance and auditing.',
                              ),
                              const SizedBox(height: 14),
                              _buildLiveActivityStream(isDark),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // MOBILE LAYOUT (< 900px)
  // =========================================================================

  Widget _buildMobileLayout(
    BuildContext context, {
    required bool isDark,
    required dynamic activeWs,
    required int notifCount,
    required AsyncValue<dynamic> updateAsync,
  }) {
    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      appBar: AppTopBar(
        leadingType: AppTopBarLeadingType.menu,
        title: activeWs?.displayName ?? 'Workspace',
        subtitle: activeWs?.primaryDomain ?? 'domain.ozikol.cloud',
        actions: [
          AppTopBarAction(
            icon: Icons.notifications_none_rounded,
            tooltip: 'Notifications',
            badge: notifCount > 0
                ? AppBadge(text: '$notifCount', backgroundColor: AppColors.error)
                : null,
            onTap: () => NotificationsSheet.show(context),
          ),
          AppTopBarAction(
            icon: Icons.swap_horiz_rounded,
            tooltip: 'Switch Workspace',
            onTap: () => _showMobileWorkspaceSheet(context),
          ),
        ],
      ),
      drawer: AppDrawer(
        header: _buildDesktopSidebarHeader(isDark, activeWs),
        sections: _buildNavigationSections(isDark),
        footer: _buildDesktopSidebarFooter(isDark, activeWs),
      ),
      body: Column(
        children: [
          // Update Banner
          updateAsync.maybeWhen(
            data: (res) => res.hasUpdate && res.updateInfo != null
                ? UpdateBanner(updateInfo: res.updateInfo!)
                : const SizedBox.shrink(),
            orElse: () => const SizedBox.shrink(),
          ),

          // Offline Status Bar
          const OfflineStatusBar(),

          // Single-Column Mobile Feed
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildWorkspaceHeroCard(isDark, activeWs),
                  const SizedBox(height: 20),
                  _buildSectionHeader(
                    isDark,
                    title: 'Workspace Metrics',
                    infoTitle: 'Tenant Metrics',
                    infoPurpose: 'Operational statistics and capability status.',
                  ),
                  const SizedBox(height: 12),
                  _buildMetricsGrid(isDark, activeWs, isMobile: true),
                  const SizedBox(height: 24),
                  _buildSectionHeader(
                    isDark,
                    title: 'Quick Actions',
                    infoTitle: 'Workspace Operations',
                    infoPurpose: 'Core administrative shortcuts.',
                  ),
                  const SizedBox(height: 12),
                  _buildQuickActionsGrid(isDark, isMobile: true),
                  const SizedBox(height: 24),
                  _buildSectionHeader(
                    isDark,
                    title: 'Recent Activity',
                    infoTitle: 'Audit Logs',
                    infoPurpose: 'Recent tenant events and audit history.',
                  ),
                  const SizedBox(height: 12),
                  _buildLiveActivityStream(isDark),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildMobileBottomBar(isDark),
    );
  }

  // =========================================================================
  // REUSABLE DASHBOARD CANVAS COMPONENTS
  // =========================================================================

  /// Prominent Workspace Hero Banner
  Widget _buildWorkspaceHeroCard(bool isDark, dynamic activeWs) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              TenantAvatar(
                logoUrl: activeWs?.logoUrl,
                name: activeWs?.displayName ?? 'Ozikol',
                size: 46,
                borderRadius: 14,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      activeWs?.displayName ?? 'Active Workspace',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      activeWs?.primaryDomain ?? 'domain.ozikol.cloud',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ],
                ),
              ),
              AppBadge(
                text: 'Connected',
                backgroundColor: AppColors.success,
                textColor: Colors.white,
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Tenant Key: ${activeWs?.tenantKey ?? "Default"}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                ),
              ),
              Text(
                'Channel: Live Sync Active',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Metric Counter Cards Grid
  Widget _buildMetricsGrid(bool isDark, dynamic activeWs, {bool isMobile = false}) {
    final metrics = [
      _MetricData(
        title: 'Organization Members',
        value: 'Active',
        subtitle: 'Directory Synced',
        icon: Icons.people_outline_rounded,
        iconBg: AppColors.primaryContainer,
        iconColor: AppColors.primary,
      ),
      _MetricData(
        title: 'Modular Capabilities',
        value: 'Enabled',
        subtitle: 'Enterprise Tier',
        icon: Icons.extension_outlined,
        iconBg: AppColors.secondaryContainer,
        iconColor: AppColors.secondary,
      ),
      _MetricData(
        title: 'Subscription Status',
        value: 'Active',
        subtitle: 'Monthly Recurring Plan',
        icon: Icons.verified_outlined,
        iconBg: isDark ? AppColors.surfaceVariantDark : const Color(0xFFE0F2FE),
        iconColor: AppColors.info,
      ),
    ];

    if (isMobile) {
      return Column(
        children: metrics
            .map((m) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _buildMetricTile(isDark, m),
                ))
            .toList(),
      );
    }

    return Row(
      children: metrics
          .map((m) => Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(right: 14),
                  child: _buildMetricTile(isDark, m),
                ),
              ))
          .toList(),
    );
  }

  Widget _buildMetricTile(bool isDark, _MetricData data) {
    return Container(
      padding: const EdgeInsets.all(18),
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                data.title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                ),
              ),
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: data.iconBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(data.icon, size: 18, color: data.iconColor),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            data.value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            data.subtitle,
            style: TextStyle(
              fontSize: 11,
              color: isDark ? AppColors.gray400 : AppColors.gray500,
            ),
          ),
        ],
      ),
    );
  }

  /// Quick Operational Actions Grid
  Widget _buildQuickActionsGrid(bool isDark, {bool isMobile = false}) {
    final actions = [
      _ActionData(
        title: 'Invite Member',
        subtitle: 'Grant workspace access',
        icon: Icons.person_add_alt_1_rounded,
        onTap: () {},
      ),
      _ActionData(
        title: 'Modular Capabilities',
        subtitle: 'Configure tenant features',
        icon: Icons.apps_rounded,
        onTap: () {},
      ),
      _ActionData(
        title: 'Audit Activity',
        subtitle: 'Review security logs',
        icon: Icons.shield_outlined,
        onTap: () {},
      ),
      _ActionData(
        title: 'Ozi AI Studio',
        subtitle: 'Smart workspace assist',
        icon: Icons.auto_awesome_rounded,
        onTap: () {},
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: isMobile ? 2 : 4,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: isMobile ? 1.3 : 1.4,
      ),
      itemCount: actions.length,
      itemBuilder: (context, index) {
        final action = actions[index];
        return Material(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: action.onTap,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(action.icon, size: 22, color: AppColors.primary),
                  const SizedBox(height: 10),
                  Text(
                    action.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    action.subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 10,
                      color: isDark ? AppColors.gray400 : AppColors.gray500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  /// Live Activity Stream powered by ActivityTile
  Widget _buildLiveActivityStream(bool isDark) {
    final activities = [
      _ActivityEntry(
        title: 'Workspace Session Active',
        subtitle: 'System initialized on host machine',
        timestamp: 'Just now',
        status: 'Success',
        severity: 'success',
        icon: Icons.login_rounded,
      ),
      _ActivityEntry(
        title: 'Central Database Synced',
        subtitle: 'Tenant configuration resolved',
        timestamp: '10m ago',
        status: 'Active',
        severity: 'info',
        icon: Icons.sync_rounded,
      ),
      _ActivityEntry(
        title: 'Multi-Tenant Security Check',
        subtitle: 'Vault keys verified cleanly',
        timestamp: '1h ago',
        status: 'Verified',
        severity: 'success',
        icon: Icons.verified_user_outlined,
      ),
    ];

    return Column(
      children: activities
          .map((a) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ActivityTile(
                  title: a.title,
                  subtitle: a.subtitle,
                  timestamp: a.timestamp,
                  statusBadge: a.status,
                  statusSeverity: a.severity,
                  icon: a.icon,
                ),
              ))
          .toList(),
    );
  }

  /// Section Header with Contextual Info Icon (Rule 13)
  Widget _buildSectionHeader(
    bool isDark, {
    required String title,
    required String infoTitle,
    required String infoPurpose,
  }) {
    return Row(
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: isDark ? AppColors.onBackgroundDark : AppColors.onBackgroundLight,
          ),
        ),
        const SizedBox(width: 8),
        ContextualInfoButton(
          title: infoTitle,
          purpose: infoPurpose,
          expectedInputs: 'Synchronized live from active tenant database records.',
          impact: 'Ensures workspace administrators possess full situational awareness.',
          bestPractices: 'Review audit events daily to maintain tenant organization compliance.',
        ),
      ],
    );
  }

  // =========================================================================
  // SIDEBAR & DRAWER SECTIONS
  // =========================================================================

  Widget _buildDesktopSidebarHeader(bool isDark, dynamic activeWs) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceVariantDark : AppColors.surfaceVariantLight,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          TenantAvatar(
            logoUrl: activeWs?.logoUrl,
            name: activeWs?.displayName ?? 'Ozikol',
            size: 32,
            borderRadius: 10,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  activeWs?.displayName ?? 'Workspace',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                ),
                Text(
                  activeWs?.primaryDomain ?? 'domain.ozikol.cloud',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10,
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

  Widget _buildDesktopSidebarFooter(bool isDark, dynamic activeWs) {
    return Container(
      padding: const EdgeInsets.only(top: 12),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
          ),
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 15,
            backgroundColor: AppColors.primaryContainer,
            child: Text(
              activeWs?.userFullName?.isNotEmpty == true
                  ? activeWs!.userFullName![0].toUpperCase()
                  : 'U',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              activeWs?.userFullName ?? 'Staff Member',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, size: 18),
            tooltip: 'Sign Out',
            onPressed: () {
              if (activeWs != null) {
                ref.read(workspaceStateProvider.notifier).logoutWorkspace(activeWs.tenantKey);
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const WorkspaceEntryScreen()),
                  (route) => false,
                );
              }
            },
          ),
        ],
      ),
    );
  }

  List<AppDrawerSection> _buildNavigationSections(bool isDark) {
    return [
      AppDrawerSection(
        title: 'WORKSPACE HUB',
        items: [
          AppDrawerItem(
            icon: Icons.dashboard_rounded,
            title: 'Overview & Landing',
            isSelected: _selectedNavIndex == 0,
            onTap: () => setState(() => _selectedNavIndex = 0),
          ),
          AppDrawerItem(
            icon: Icons.extension_outlined,
            title: 'Modular Capabilities',
            isSelected: _selectedNavIndex == 1,
            onTap: () => setState(() => _selectedNavIndex = 1),
          ),
          AppDrawerItem(
            icon: Icons.people_outline_rounded,
            title: 'Member Directory',
            isSelected: _selectedNavIndex == 2,
            onTap: () => setState(() => _selectedNavIndex = 2),
          ),
        ],
      ),
      AppDrawerSection(
        title: 'OPERATIONS & COMPLIANCE',
        items: [
          AppDrawerItem(
            icon: Icons.receipt_long_outlined,
            title: 'Audit & Activity Log',
            isSelected: _selectedNavIndex == 3,
            onTap: () => setState(() => _selectedNavIndex = 3),
          ),
          AppDrawerItem(
            icon: Icons.auto_awesome_rounded,
            title: 'Ozi AI Studio',
            isSelected: _selectedNavIndex == 4,
            onTap: () => setState(() => _selectedNavIndex = 4),
          ),
          AppDrawerItem(
            icon: Icons.settings_outlined,
            title: 'Workspace Settings',
            isSelected: _selectedNavIndex == 5,
            onTap: () => setState(() => _selectedNavIndex = 5),
          ),
        ],
      ),
    ];
  }

  Widget _buildMobileBottomBar(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
          ),
        ),
      ),
      child: BottomNavigationBar(
        currentIndex: _selectedNavIndex.clamp(0, 3),
        onTap: (index) => setState(() => _selectedNavIndex = index),
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: isDark ? AppColors.gray400 : AppColors.gray500,
        type: BottomNavigationBarType.fixed,
        selectedFontSize: 11,
        unselectedFontSize: 11,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_rounded),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.extension_rounded),
            label: 'Features',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_rounded),
            label: 'Activity',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings_rounded),
            label: 'Settings',
          ),
        ],
      ),
    );
  }

  void _toggleTheme() {
    ref.read(themeModeProvider.notifier).toggleTheme(context);
  }

  void _showMobileWorkspaceSheet(BuildContext context) {
    final state = ref.read(workspaceStateProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.gray700 : AppColors.gray300,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Switch Tenant Workspace',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              ...state.enrolledWorkspaces.map((ws) {
                final isCurrent = ws.tenantKey == state.activeWorkspace?.tenantKey;
                return ListTile(
                  leading: TenantAvatar(logoUrl: ws.logoUrl, name: ws.displayName, size: 36),
                  title: Text(ws.displayName, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(ws.primaryDomain, style: const TextStyle(fontSize: 12)),
                  trailing: isCurrent
                      ? const Icon(Icons.check_circle_rounded, color: AppColors.primary)
                      : null,
                  onTap: () {
                    ref.read(workspaceStateProvider.notifier).switchWorkspace(ws.tenantKey);
                    Navigator.of(context).pop();
                  },
                );
              }),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }
}

class _MetricData {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color iconBg;
  final Color iconColor;

  const _MetricData({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.iconBg,
    required this.iconColor,
  });
}

class _ActionData {
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  const _ActionData({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });
}

class _ActivityEntry {
  final String title;
  final String subtitle;
  final String timestamp;
  final String status;
  final String severity;
  final IconData icon;

  const _ActivityEntry({
    required this.title,
    required this.subtitle,
    required this.timestamp,
    required this.status,
    required this.severity,
    required this.icon,
  });
}
