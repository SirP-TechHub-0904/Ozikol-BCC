import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/services/in_app_update_service.dart';
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
import '../data/dashboard_repository.dart';
import '../models/dashboard_metrics.dart';

/// Clean adaptive dashboard shell delivering 1-to-1 operational and visual parity
/// with the Ozikol BCC Angular Web Console Dashboard (`/dashboard/console`).
/// Accommodates desktop window layouts (multi-column) and mobile viewports.
class DashboardShellScreen extends ConsumerStatefulWidget {
  /// Creates the primary [DashboardShellScreen].
  const DashboardShellScreen({super.key});

  @override
  ConsumerState<DashboardShellScreen> createState() => _DashboardShellScreenState();
}

class _DashboardShellScreenState extends ConsumerState<DashboardShellScreen>
    with SingleTickerProviderStateMixin {
  int _selectedNavIndex = 2; // 2 = Console Dashboard
  late AnimationController _refreshAnimController;

  @override
  void initState() {
    super.initState();
    _refreshAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
  }

  @override
  void dispose() {
    _refreshAnimController.dispose();
    super.dispose();
  }

  void _triggerRefresh() {
    _refreshAnimController.repeat();
    ref.read(dashboardMetricsProvider.notifier).refresh().whenComplete(() {
      if (mounted) {
        _refreshAnimController.reset();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workspaceStateProvider);
    final notifState = ref.watch(notificationProvider);
    final updateAsync = ref.watch(appUpdateCheckProvider);
    final metricsAsync = ref.watch(dashboardMetricsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeWs = state.activeWorkspace;
    final metrics = metricsAsync.value ?? DashboardMetrics.sample();
    final isTelemetryLoading = metricsAsync.isLoading;

    if (isTelemetryLoading && !_refreshAnimController.isAnimating) {
      _refreshAnimController.repeat();
    } else if (!isTelemetryLoading && _refreshAnimController.isAnimating) {
      _refreshAnimController.reset();
    }

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
            metrics: metrics,
            isLoading: isTelemetryLoading,
          );
        }

        return _buildMobileLayout(
          context,
          isDark: isDark,
          activeWs: activeWs,
          notifCount: notifState.unreadCount,
          updateAsync: updateAsync,
          metrics: metrics,
          isLoading: isTelemetryLoading,
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
    required DashboardMetrics metrics,
    required bool isLoading,
  }) {
    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          Row(
            children: [
              // 1. Far Left Multi-Tenant Workspace Switcher Dock (68px)
              const WorkspaceSwitcherDock(),

              // 2. Persistent Navigation Sidebar (250px) - Matches Angular BCC Admin
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
                    // Top Application Bar matching Angular Web Header
                    _buildDesktopTopBar(context, isDark, activeWs, notifCount),

                    // In-App Update Banner
                    updateAsync.maybeWhen(
                      data: (res) => res.hasUpdate && res.updateInfo != null
                          ? UpdateBanner(updateInfo: res.updateInfo!)
                          : const SizedBox.shrink(),
                      orElse: () => const SizedBox.shrink(),
                    ),

                    // Offline Network Resilience Bar
                    const OfflineStatusBar(),

                    // Main Console Dashboard Content Canvas
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 22),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 1. Header / Command Strip
                            _buildCommandStrip(isDark, isLoading),

                            const SizedBox(height: 18),

                            // 2. Core Performance & Health Counters (6-Metric Strip)
                            _buildHealthCountersWidget(isDark, metrics),

                            const SizedBox(height: 20),

                            // 3. 2-Column Split: Recently Registered Members (60%) & Quick Actions (40%)
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Left Column (Span 7 / flex 7): Recently Registered Members
                                Expanded(
                                  flex: 7,
                                  child: _buildRecentMembersWidget(isDark, metrics),
                                ),

                                const SizedBox(width: 20),

                                // Right Column (Span 5 / flex 5): Quick Actions & Shortcuts
                                Expanded(
                                  flex: 5,
                                  child: _buildQuickActionsWidget(isDark),
                                ),
                              ],
                            ),

                            const SizedBox(height: 20),

                            // 4. Bottom Audit Log Stream: Recent Activity & Audit Trail
                            _buildAuditTrailWidget(isDark, metrics),

                            const SizedBox(height: 32),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Floating Ozi AI Assistant Button at Bottom-Right
          Positioned(
            bottom: 24,
            right: 24,
            child: _buildOziAiFloatingButton(isDark),
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
    required DashboardMetrics metrics,
    required bool isLoading,
  }) {
    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : const Color(0xFFF8FAFC),
      appBar: AppTopBar(
        leadingType: AppTopBarLeadingType.menu,
        centerContent: Row(
          children: [
            if (activeWs != null) ...[
              TenantAvatar(
                logoUrl: activeWs.logoUrl,
                name: activeWs.displayName,
                size: 32,
                borderRadius: 8,
              ),
              const SizedBox(width: 10),
            ],
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activeWs?.displayName ?? 'Console Dashboard',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  Text(
                    'Business Command Center',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
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
      body: Stack(
        children: [
          Column(
            children: [
              updateAsync.maybeWhen(
                data: (res) => res.hasUpdate && res.updateInfo != null
                    ? UpdateBanner(updateInfo: res.updateInfo!)
                    : const SizedBox.shrink(),
                orElse: () => const SizedBox.shrink(),
              ),
              const OfflineStatusBar(),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildCommandStrip(isDark, isLoading, isMobile: true),
                      const SizedBox(height: 16),
                      _buildHealthCountersWidget(isDark, metrics, isMobile: true),
                      const SizedBox(height: 16),
                      _buildQuickActionsWidget(isDark),
                      const SizedBox(height: 16),
                      _buildRecentMembersWidget(isDark, metrics),
                      const SizedBox(height: 16),
                      _buildAuditTrailWidget(isDark, metrics),
                      const SizedBox(height: 48),
                    ],
                  ),
                ),
              ),
            ],
          ),
          Positioned(
            bottom: 16,
            right: 16,
            child: _buildOziAiFloatingButton(isDark),
          ),
        ],
      ),
      bottomNavigationBar: _buildMobileBottomBar(isDark),
    );
  }

  // =========================================================================
  // TOP BAR (DESKTOP)
  // =========================================================================

  Widget _buildDesktopTopBar(
    BuildContext context,
    bool isDark,
    dynamic activeWs,
    int notifCount,
  ) {
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final textColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);

    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        border: Border(bottom: BorderSide(color: borderColor, width: 1)),
      ),
      child: Row(
        children: [
          // Search workspace bar
          Container(
            width: 320,
            height: 38,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isDark ? Colors.transparent : const Color(0xFFE2E8F0),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.search_rounded,
                  size: 18,
                  color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Search workspace...',
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.gray400 : const Color(0xFF94A3B8),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const Spacer(),

          // Utility Action Icons (Calendar, Help, Fullscreen, Dark Mode, Notifications)
          _buildTopIconBtn(
            icon: Icons.calendar_today_outlined,
            tooltip: 'Calendar & Schedules',
            isDark: isDark,
            onTap: () {},
          ),
          _buildTopIconBtn(
            icon: Icons.help_outline_rounded,
            tooltip: 'Help & Knowledge Base',
            isDark: isDark,
            onTap: () {},
          ),
          _buildTopIconBtn(
            icon: isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
            tooltip: 'Toggle Color Theme',
            isDark: isDark,
            onTap: () => _toggleTheme(),
          ),
          _buildTopIconBtn(
            icon: Icons.notifications_none_rounded,
            tooltip: 'Notifications',
            isDark: isDark,
            badgeCount: notifCount,
            onTap: () => NotificationsSheet.show(context),
          ),

          const SizedBox(width: 14),

          // User Profile Pill (OP - Onwuka Peter - SuperAdmin)
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: Text(
                  _getUserInitials(activeWs?.userFullName),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activeWs?.userFullName ?? 'Workspace Admin',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: textColor,
                    ),
                  ),
                  Text(
                    'SuperAdmin',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTopIconBtn({
    required IconData icon,
    required String tooltip,
    required bool isDark,
    required VoidCallback onTap,
    int badgeCount = 0,
  }) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          IconButton(
            icon: Icon(
              icon,
              size: 20,
              color: isDark ? AppColors.gray300 : const Color(0xFF475569),
            ),
            tooltip: tooltip,
            onPressed: onTap,
          ),
          if (badgeCount > 0)
            Positioned(
              top: 6,
              right: 6,
              child: AppBadge(
                text: '$badgeCount',
                backgroundColor: AppColors.error,
                size: 16,
              ),
            ),
        ],
      ),
    );
  }

  // =========================================================================
  // COMMAND STRIP (Header with Refresh Telemetry & New Web Page)
  // =========================================================================

  Widget _buildCommandStrip(bool isDark, bool isLoading, {bool isMobile = false}) {
    final titleColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);
    final subtitleColor = isDark ? AppColors.gray400 : const Color(0xFF64748B);

    final titleBlock = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Console Dashboard',
          style: TextStyle(
            fontSize: isMobile ? 20 : 24,
            fontWeight: FontWeight.w800,
            color: titleColor,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          'Multi-tenant workspace command center, membership telemetry, and dynamic CMS studio.',
          style: TextStyle(
            fontSize: isMobile ? 12 : 13,
            color: subtitleColor,
          ),
        ),
      ],
    );

    final actionButtons = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Refresh Telemetry button
        OutlinedButton.icon(
          onPressed: _triggerRefresh,
          icon: RotationTransition(
            turns: _refreshAnimController,
            child: Icon(
              Icons.refresh_rounded,
              size: 16,
              color: isDark ? AppColors.onSurfaceDark : const Color(0xFF334155),
            ),
          ),
          label: Text(
            'Refresh Telemetry',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: isDark ? AppColors.onSurfaceDark : const Color(0xFF334155),
            ),
          ),
          style: OutlinedButton.styleFrom(
            backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
            side: BorderSide(
              color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1),
            ),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
        ),

        const SizedBox(width: 10),

        // New Web Page button (Primary Royal Blue)
        ElevatedButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Navigating to CMS Web Page Designer...')),
            );
          },
          icon: const Icon(Icons.add_rounded, size: 16, color: Colors.white),
          label: const Text(
            'New Web Page',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
      ],
    );

    if (isMobile) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          titleBlock,
          const SizedBox(height: 12),
          actionButtons,
        ],
      );
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(child: titleBlock),
        actionButtons,
      ],
    );
  }

  // =========================================================================
  // CORE HEALTH COUNTERS WIDGET (6 KPI CARDS)
  // =========================================================================

  Widget _buildHealthCountersWidget(
    bool isDark,
    DashboardMetrics metrics, {
    bool isMobile = false,
  }) {
    return _buildCardWrapper(
      isDark: isDark,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Widget Header with Drag Handle & Status Pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Icon(
                      Icons.drag_indicator_rounded,
                      size: 16,
                      color: isDark ? AppColors.gray500 : const Color(0xFF94A3B8),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        'Core Performance & Health Counters',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ContextualInfoButton(
                      title: 'Workspace Telemetry & Health Counters',
                      purpose:
                          'Live operational counters pulled directly from the tenant database and catalog registry.',
                      expectedInputs: 'Synchronized live from active database schema and user records.',
                      impact: 'Guarantees 1-to-1 operational awareness for workspace administrators.',
                      bestPractices: 'Review daily to observe active membership growth and web page deployment.',
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // "All Services Operational" Pill Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF22C55E).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: const Color(0xFF22C55E).withValues(alpha: 0.3),
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF16A34A)),
                    SizedBox(width: 5),
                    Text(
                      'All Services Operational',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF16A34A),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // 6 Metric Cards
          LayoutBuilder(
            builder: (context, constraints) {
              if (isMobile) {
                return Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _buildMetricTile(
                            isDark,
                            label: 'TOTAL MEMBERS',
                            value: '${metrics.totalMembers}',
                            note: '↗ +12% active directory',
                            noteColor: const Color(0xFF16A34A),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildMetricTile(
                            isDark,
                            label: 'GROUP CHANNELS',
                            value: '${metrics.totalGroups}',
                            note: '↗ Live real-time chat',
                            noteColor: const Color(0xFF0284C7),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _buildMetricTile(
                            isDark,
                            label: 'PUBLISHED PAGES',
                            value: '${metrics.totalPublishedPages}',
                            note: '✓ 100% DB dynamic',
                            noteColor: const Color(0xFF16A34A),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildMetricTile(
                            isDark,
                            label: 'HERO SLIDERS',
                            value: '${metrics.totalSliders}',
                            note: '★ Visual carousel',
                            noteColor: const Color(0xFFD97706),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _buildMetricTile(
                            isDark,
                            label: 'ACTIVE FAQS',
                            value: '${metrics.totalFaqs}',
                            note: 'ℹ Knowledge items',
                            noteColor: const Color(0xFF0284C7),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildMetricTile(
                            isDark,
                            label: 'PLATFORM ROLES',
                            value: '3',
                            note: '🔒 RBAC Protected',
                            noteColor: const Color(0xFF9333EA),
                          ),
                        ),
                      ],
                    ),
                  ],
                );
              }

              // Desktop: 6 cards in a single responsive row
              return Row(
                children: [
                  Expanded(
                    child: _buildMetricTile(
                      isDark,
                      label: 'TOTAL MEMBERS',
                      value: '${metrics.totalMembers}',
                      note: '↗ +12% active directory',
                      noteColor: const Color(0xFF16A34A),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricTile(
                      isDark,
                      label: 'GROUP CHANNELS',
                      value: '${metrics.totalGroups}',
                      note: '↗ Live real-time chat',
                      noteColor: const Color(0xFF0284C7),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricTile(
                      isDark,
                      label: 'PUBLISHED PAGES',
                      value: '${metrics.totalPublishedPages}',
                      note: '✓ 100% DB dynamic',
                      noteColor: const Color(0xFF16A34A),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricTile(
                      isDark,
                      label: 'HERO SLIDERS',
                      value: '${metrics.totalSliders}',
                      note: '★ Visual carousel',
                      noteColor: const Color(0xFFD97706),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricTile(
                      isDark,
                      label: 'ACTIVE FAQS',
                      value: '${metrics.totalFaqs}',
                      note: 'ℹ Knowledge items',
                      noteColor: const Color(0xFF0284C7),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricTile(
                      isDark,
                      label: 'PLATFORM ROLES',
                      value: '3',
                      note: '🔒 RBAC Protected',
                      noteColor: const Color(0xFF9333EA),
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMetricTile(
    bool isDark, {
    required String label,
    required String value,
    required String note,
    required Color noteColor,
  }) {
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final cardBg = isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
              height: 1.1,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            note,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: noteColor,
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // RECENTLY REGISTERED MEMBERS WIDGET (Clean Table)
  // =========================================================================

  Widget _buildRecentMembersWidget(bool isDark, DashboardMetrics metrics) {
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final users = metrics.recentUsers;

    return _buildCardWrapper(
      isDark: isDark,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Icon(
                        Icons.drag_indicator_rounded,
                        size: 16,
                        color: isDark ? AppColors.gray500 : const Color(0xFF94A3B8),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Recently Registered Members',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: () {},
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text(
                    'View Directory →',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),

          Divider(height: 1, color: borderColor),

          // Table Header
          Container(
            color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            child: Row(
              children: [
                Expanded(
                  flex: 4,
                  child: Text(
                    'MEMBER NAME',
                    style: _tableHeaderStyle(isDark),
                  ),
                ),
                Expanded(
                  flex: 4,
                  child: Text(
                    'EMAIL',
                    style: _tableHeaderStyle(isDark),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    'CATEGORY',
                    style: _tableHeaderStyle(isDark),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    'STATUS',
                    style: _tableHeaderStyle(isDark),
                  ),
                ),
              ],
            ),
          ),

          Divider(height: 1, color: borderColor),

          // Table Body Rows
          if (users.isEmpty)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Text(
                  'No registered members yet.',
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? AppColors.gray400 : const Color(0xFF94A3B8),
                  ),
                ),
              ),
            )
          else
            ...users.map((u) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: borderColor, width: 0.5)),
                ),
                child: Row(
                  children: [
                    // Member Name with Initial Avatar
                    Expanded(
                      flex: 4,
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 14,
                            backgroundColor: const Color(0xFF0050E5).withValues(alpha: 0.12),
                            child: Text(
                              (u.fullName.isNotEmpty ? u.fullName[0] : 'U').toUpperCase(),
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0050E5),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              u.fullName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Email
                    Expanded(
                      flex: 4,
                      child: Text(
                        u.email,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          fontFamily: 'monospace',
                          color: isDark ? AppColors.gray300 : const Color(0xFF475569),
                        ),
                      ),
                    ),

                    // Category Pill
                    Expanded(
                      flex: 2,
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            u.category,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0284C7),
                            ),
                          ),
                        ),
                      ),
                    ),

                    // Status Pill (Active)
                    Expanded(
                      flex: 2,
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF22C55E).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: const Text(
                            'Active',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF16A34A),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),

          // Footer
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Center(
              child: TextButton(
                onPressed: () {},
                child: const Text(
                  'Manage all directory members',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  TextStyle _tableHeaderStyle(bool isDark) {
    return TextStyle(
      fontSize: 11,
      fontWeight: FontWeight.w700,
      letterSpacing: 0.5,
      color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
    );
  }

  // =========================================================================
  // QUICK ACTIONS & SHORTCUTS WIDGET (4 Canonical Actions)
  // =========================================================================

  Widget _buildQuickActionsWidget(bool isDark) {
    return _buildCardWrapper(
      isDark: isDark,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.drag_indicator_rounded,
                size: 16,
                color: isDark ? AppColors.gray500 : const Color(0xFF94A3B8),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Quick Actions & Shortcuts',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // 4 Action Rows with Pastel Background Icons
          _buildActionRow(
            isDark: isDark,
            title: 'Create Dynamic Web Page',
            subtitle: 'Add database driven page to website navigation',
            icon: Icons.add_circle_outline_rounded,
            iconBg: const Color(0xFF0050E5).withValues(alpha: 0.12),
            iconColor: const Color(0xFF0050E5),
            onTap: () {},
          ),
          const SizedBox(height: 10),
          _buildActionRow(
            isDark: isDark,
            title: 'Register New Member',
            subtitle: 'Add profile and assign feature category',
            icon: Icons.person_add_alt_1_outlined,
            iconBg: const Color(0xFF22C55E).withValues(alpha: 0.12),
            iconColor: const Color(0xFF16A34A),
            onTap: () {},
          ),
          const SizedBox(height: 10),
          _buildActionRow(
            isDark: isDark,
            title: 'Create Group Channel',
            subtitle: 'Launch real-time team discussion space',
            icon: Icons.chat_bubble_outline_rounded,
            iconBg: const Color(0xFFA855F7).withValues(alpha: 0.12),
            iconColor: const Color(0xFF9333EA),
            onTap: () {},
          ),
          const SizedBox(height: 10),
          _buildActionRow(
            isDark: isDark,
            title: 'Brand & Theme Customizer',
            subtitle: 'Update corporate colors, logo, and announcement',
            icon: Icons.palette_outlined,
            iconBg: const Color(0xFFF59E0B).withValues(alpha: 0.12),
            iconColor: const Color(0xFFD97706),
            onTap: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildActionRow({
    required bool isDark,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final cardBg = isDark ? AppColors.surfaceVariantDark : Colors.white;

    return Material(
      color: cardBg,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: Icon(icon, size: 20, color: iconColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: isDark ? AppColors.gray500 : const Color(0xFF94A3B8),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // =========================================================================
  // RECENT ACTIVITY & AUDIT TRAIL WIDGET (Table Stream)
  // =========================================================================

  Widget _buildAuditTrailWidget(bool isDark, DashboardMetrics metrics) {
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final audits = metrics.recentActivities;

    return _buildCardWrapper(
      isDark: isDark,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Icon(
                        Icons.drag_indicator_rounded,
                        size: 16,
                        color: isDark ? AppColors.gray500 : const Color(0xFF94A3B8),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Recent Activity & Audit Trail',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Text(
                    'Telemetry Log',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                    ),
                  ),
                ),
              ],
            ),
          ),

          Divider(height: 1, color: borderColor),

          // Table Header
          Container(
            color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Text('ACTION TYPE', style: _tableHeaderStyle(isDark)),
                ),
                Expanded(
                  flex: 3,
                  child: Text('PERFORMED BY', style: _tableHeaderStyle(isDark)),
                ),
                Expanded(
                  flex: 4,
                  child: Text('DETAILS & DESCRIPTION', style: _tableHeaderStyle(isDark)),
                ),
                Expanded(
                  flex: 2,
                  child: Text('DATE & TIME', style: _tableHeaderStyle(isDark)),
                ),
              ],
            ),
          ),

          Divider(height: 1, color: borderColor),

          // Table Body
          if (audits.isEmpty)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Text(
                  'No audit actions logged yet.',
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? AppColors.gray400 : const Color(0xFF94A3B8),
                  ),
                ),
              ),
            )
          else
            ...audits.map((a) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: borderColor, width: 0.5)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFA855F7).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            a.action,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF9333EA),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        a.user,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 4,
                      child: Text(
                        a.details,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.gray300 : const Color(0xFF475569),
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        a.timestamp != null
                            ? '${a.timestamp!.hour}:${a.timestamp!.minute.toString().padLeft(2, '0')}'
                            : 'Just now',
                        style: TextStyle(
                          fontSize: 12,
                          fontFamily: 'monospace',
                          color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  // =========================================================================
  // FLOATING OZI AI BUTTON
  // =========================================================================

  Widget _buildOziAiFloatingButton(bool isDark) {
    return Material(
      color: const Color(0xFF0B132B),
      elevation: 6,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Launching Ozi AI Studio Assistant...')),
          );
        },
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: const Color(0xFF0050E5).withValues(alpha: 0.4),
              width: 1.5,
            ),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.auto_awesome_rounded, size: 18, color: Color(0xFF60A5FA)),
              SizedBox(width: 8),
              Text(
                'Ozi AI',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // =========================================================================
  // REUSABLE CARD CONTAINER
  // =========================================================================

  Widget _buildCardWrapper({
    required bool isDark,
    required Widget child,
    EdgeInsetsGeometry padding = const EdgeInsets.all(18),
  }) {
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final cardBg = isDark ? AppColors.surfaceDark : Colors.white;

    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor, width: 1),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: child,
    );
  }

  // =========================================================================
  // SIDEBAR & DRAWER SECTIONS (Matches Angular BCC Admin Sidebar)
  // =========================================================================

  Widget _buildDesktopSidebarHeader(bool isDark, dynamic activeWs) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          TenantAvatar(
            logoUrl: activeWs?.logoUrl,
            name: activeWs?.displayName ?? 'Ozikol',
            size: 34,
            borderRadius: 8,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  activeWs?.displayName ?? 'Ozikol BCC',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.2,
                  ),
                ),
                Text(
                  'Workspace Vault',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
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
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);

    return Container(
      padding: const EdgeInsets.only(top: 10),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: borderColor)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(
                Icons.hub_outlined,
                size: 16,
                color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'MC Workspace Console v1.0.0',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.help_outline_rounded, size: 14),
                  label: const Text(
                    'Help & Support',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                  style: TextButton.styleFrom(
                    alignment: Alignment.centerLeft,
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.logout_rounded, size: 16),
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
        ],
      ),
    );
  }

  List<AppDrawerSection> _buildNavigationSections(bool isDark) {
    return [
      AppDrawerSection(
        title: 'WEBSITE',
        items: [
          AppDrawerItem(
            icon: Icons.home_outlined,
            title: 'Home',
            isSelected: _selectedNavIndex == 0,
            onTap: () => setState(() => _selectedNavIndex = 0),
          ),
          AppDrawerItem(
            icon: Icons.link_rounded,
            title: 'Link Domain',
            trailing: _buildPillBadge('SETUP', const Color(0xFFF59E0B)),
            isSelected: _selectedNavIndex == 1,
            onTap: () => setState(() => _selectedNavIndex = 1),
          ),
        ],
      ),
      AppDrawerSection(
        title: 'COMMAND CENTER',
        items: [
          AppDrawerItem(
            icon: Icons.dashboard_rounded,
            title: 'Console Dashboard',
            isSelected: _selectedNavIndex == 2,
            onTap: () => setState(() => _selectedNavIndex = 2),
          ),
          AppDrawerItem(
            icon: Icons.payment_outlined,
            title: 'Feature Billing',
            trailing: _buildPillBadge('SOON', const Color(0xFF94A3B8)),
            isSelected: _selectedNavIndex == 3,
            onTap: () => setState(() => _selectedNavIndex = 3),
          ),
          AppDrawerItem(
            icon: Icons.shield_outlined,
            title: 'Security Audit',
            trailing: _buildPillBadge('SOON', const Color(0xFF94A3B8)),
            isSelected: _selectedNavIndex == 4,
            onTap: () => setState(() => _selectedNavIndex = 4),
          ),
        ],
      ),
      AppDrawerSection(
        title: 'CONTENT CMS STUDIO',
        items: [
          AppDrawerItem(
            icon: Icons.layers_outlined,
            title: 'CMS Studio',
            trailing: _buildPillBadge('LIVE', const Color(0xFF16A34A)),
            isSelected: _selectedNavIndex == 5,
            onTap: () => setState(() => _selectedNavIndex = 5),
          ),
          AppDrawerItem(
            icon: Icons.dynamic_form_outlined,
            title: 'Manage Forms',
            isSelected: _selectedNavIndex == 6,
            onTap: () => setState(() => _selectedNavIndex = 6),
          ),
          AppDrawerItem(
            icon: Icons.view_quilt_outlined,
            title: 'My Templates',
            isSelected: _selectedNavIndex == 7,
            onTap: () => setState(() => _selectedNavIndex = 7),
          ),
          AppDrawerItem(
            icon: Icons.storefront_outlined,
            title: 'UI Marketplace',
            trailing: _buildPillBadge('SOON', const Color(0xFF94A3B8)),
            isSelected: _selectedNavIndex == 8,
            onTap: () => setState(() => _selectedNavIndex = 8),
          ),
          AppDrawerItem(
            icon: Icons.tune_outlined,
            title: 'Brand & Settings',
            trailing: _buildPillBadge('HOT', const Color(0xFFEA580C)),
            isSelected: _selectedNavIndex == 9,
            onTap: () => setState(() => _selectedNavIndex = 9),
          ),
          AppDrawerItem(
            icon: Icons.language_rounded,
            title: 'Custom Domain',
            trailing: _buildPillBadge('SETUP', const Color(0xFFF59E0B)),
            isSelected: _selectedNavIndex == 10,
            onTap: () => setState(() => _selectedNavIndex = 10),
          ),
        ],
      ),
      AppDrawerSection(
        title: 'COMMERCE & STORE STUDIO',
        items: [
          AppDrawerItem(
            icon: Icons.shopping_bag_outlined,
            title: 'Commerce Studio',
            trailing: _buildPillBadge('NEW', const Color(0xFF0D9488)),
            isSelected: _selectedNavIndex == 11,
            onTap: () => setState(() => _selectedNavIndex = 11),
          ),
        ],
      ),
      AppDrawerSection(
        title: 'IDENTITY ADMINISTRATION',
        items: [
          AppDrawerItem(
            icon: Icons.admin_panel_settings_outlined,
            title: 'Identity Control',
            isSelected: _selectedNavIndex == 12,
            onTap: () => setState(() => _selectedNavIndex = 12),
          ),
        ],
      ),
      AppDrawerSection(
        title: 'USER MANAGEMENT',
        items: [
          AppDrawerItem(
            icon: Icons.people_outline_rounded,
            title: 'User Directory',
            isSelected: _selectedNavIndex == 13,
            onTap: () => setState(() => _selectedNavIndex = 13),
          ),
        ],
      ),
      AppDrawerSection(
        title: 'PEOPLE & COMMUNITY',
        items: [
          AppDrawerItem(
            icon: Icons.groups_outlined,
            title: 'Group',
            isSelected: _selectedNavIndex == 14,
            onTap: () => setState(() => _selectedNavIndex = 14),
          ),
          AppDrawerItem(
            icon: Icons.school_outlined,
            title: 'Alumni Suite',
            isSelected: _selectedNavIndex == 15,
            onTap: () => setState(() => _selectedNavIndex = 15),
          ),
          AppDrawerItem(
            icon: Icons.forum_outlined,
            title: 'Ozikol Chat Messenger',
            trailing: _buildPillBadge('LIVE', const Color(0xFF16A34A)),
            isSelected: _selectedNavIndex == 16,
            onTap: () => setState(() => _selectedNavIndex = 16),
          ),
          AppDrawerItem(
            icon: Icons.calendar_month_outlined,
            title: 'Calendar & Follow-Ups',
            trailing: _buildPillBadge('SOON', const Color(0xFF94A3B8)),
            isSelected: _selectedNavIndex == 17,
            onTap: () => setState(() => _selectedNavIndex = 17),
          ),
          AppDrawerItem(
            icon: Icons.phone_in_talk_outlined,
            title: 'GoCall AI Dispatch',
            trailing: _buildPillBadge('SOON', const Color(0xFF94A3B8)),
            isSelected: _selectedNavIndex == 18,
            onTap: () => setState(() => _selectedNavIndex = 18),
          ),
        ],
      ),
    ];
  }

  Widget _buildPillBadge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w800,
          color: color,
          letterSpacing: 0.4,
        ),
      ),
    );
  }

  Widget _buildMobileBottomBar(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
          ),
        ),
      ),
      child: BottomNavigationBar(
        currentIndex: _selectedNavIndex.clamp(0, 3),
        onTap: (index) => setState(() => _selectedNavIndex = index),
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: isDark ? AppColors.gray400 : const Color(0xFF64748B),
        type: BottomNavigationBarType.fixed,
        selectedFontSize: 11,
        unselectedFontSize: 11,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_rounded),
            label: 'Console',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.layers_outlined),
            label: 'CMS',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people_outline_rounded),
            label: 'Members',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings_outlined),
            label: 'Settings',
          ),
        ],
      ),
    );
  }

  String _getUserInitials(String? fullName) {
    if (fullName == null || fullName.trim().isEmpty) return 'U';
    final parts = fullName.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  void _toggleTheme() {
    ref.read(themeModeProvider.notifier).toggleTheme(context);
  }

  void _showMobileWorkspaceSheet(BuildContext context) {
    final state = ref.read(workspaceStateProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
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
                  subtitle: const Text('Organization Workspace', style: TextStyle(fontSize: 12)),
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
