import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/connectivity_service.dart';
import '../../../core/services/realtime_sync_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/services/in_app_update_service.dart';
import '../../../core/widgets/app_badge.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/app_top_bar.dart';
import '../../../core/widgets/contextual_info_button.dart';
import '../../../core/widgets/exit_confirmation_dialog.dart';
import '../../../core/widgets/offline_status_bar.dart';
import '../../../core/widgets/tenant_avatar.dart';
import '../../../core/widgets/tenant_cached_image.dart';
import '../../../core/widgets/update_banner.dart';
import '../../../core/models/workspace.dart';
import '../../../core/theme/theme_provider.dart';
import '../../workspace_auth/presentation/workspace_entry_screen.dart';
import '../../workspace_auth/presentation/workspace_login_screen.dart';
import '../../workspace_auth/presentation/workspace_switcher_dock.dart';
import '../../workspace_auth/state/workspace_state.dart';
import '../../notifications/data/notification_service.dart';
import '../../notifications/presentation/notifications_sheet.dart';
import '../../../core/localization/language_provider.dart';
import '../../../core/widgets/oz_lang_switcher.dart';
import '../data/dashboard_repository.dart';
import '../models/dashboard_metrics.dart';
import 'widgets/user_profile_end_drawer.dart';

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
  final GlobalKey<ScaffoldState> _mobileScaffoldKey = GlobalKey<ScaffoldState>();
  int _selectedNavIndex = 2; // 2 = Console Dashboard
  bool _isSidebarCollapsed = false;
  late AnimationController _refreshAnimController;

  /// Toggles the desktop sidebar between expanded (250px) and collapsed (68px) rail mode.
  void _toggleSidebarCollapse() {
    setState(() {
      _isSidebarCollapsed = !_isSidebarCollapsed;
    });
  }

  @override
  void initState() {
    super.initState();
    _refreshAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(realtimeSyncServiceProvider).connect();
    });
  }

  @override
  void dispose() {
    _refreshAnimController.dispose();
    super.dispose();
  }

  bool _isRefreshing = false;

  /// Remakes all requests across the workspace:
  /// 1. Tenant organization branding (logo, icon, organization name) via /api/SettingsApi/brand
  /// 2. Dashboard operational metrics, member counters, and telemetry audit trail via /api/DashboardApi/metrics
  /// 3. Unread notification counters and feed via /api/Notifications/feed
  Future<void> _triggerRefresh() async {
    if (_isRefreshing) return;
    setState(() => _isRefreshing = true);
    _refreshAnimController.repeat();

    try {
      // Evict in-memory and disk image caches so updated brand assets re-render immediately
      PaintingBinding.instance.imageCache.clear();
      PaintingBinding.instance.imageCache.clearLiveImages();

      // 1. Refresh tenant organization branding and custom assets
      await ref.read(workspaceStateProvider.notifier).refreshWorkspaceBranding();

      // 2. Refetch dashboard metrics and audit trail
      await ref.read(dashboardMetricsProvider.notifier).refresh();

      // 3. Refetch notifications feed and unread count
      await ref.read(notificationProvider.notifier).loadFeed();

      // Brief animation dwell so spin feels responsive and organic
      await Future.delayed(const Duration(milliseconds: 600));

      if (mounted) {
        setState(() {});
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle_rounded, color: Colors.white, size: 16),
                SizedBox(width: 8),
                Text('Workspace branding, telemetry, and metrics refreshed.'),
              ],
            ),
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (_) {
      // Gracefully handle network errors
    } finally {
      if (mounted) {
        _refreshAnimController.reset();
        setState(() => _isRefreshing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workspaceStateProvider);
    final notifState = ref.watch(notificationProvider);
    final updateAsync = ref.watch(appUpdateCheckProvider);
    final metricsAsync = ref.watch(dashboardMetricsProvider);
    final connStatus = ref.watch(connectivityStatusProvider);
    final isOnline = connStatus == ConnectivityStatus.online;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeWs = state.activeWorkspace;
    final metrics = metricsAsync.value ?? DashboardMetrics.empty();
    final isTelemetryLoading = metricsAsync.isLoading;

    if (isTelemetryLoading && !_refreshAnimController.isAnimating) {
      _refreshAnimController.repeat();
    } else if (!isTelemetryLoading && _refreshAnimController.isAnimating) {
      _refreshAnimController.reset();
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        // If the mobile navigation drawer is currently open, close it instead of prompting to exit the app
        if (_mobileScaffoldKey.currentState?.isDrawerOpen ?? false) {
          _mobileScaffoldKey.currentState?.closeDrawer();
          return;
        }
        if (_mobileScaffoldKey.currentState?.isEndDrawerOpen ?? false) {
          _mobileScaffoldKey.currentState?.closeEndDrawer();
          return;
        }
        final shouldQuit = await ExitConfirmationDialog.show(context);
        if (shouldQuit) {
          SystemNavigator.pop();
        }
      },
      child: LayoutBuilder(
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
              isOnline: isOnline,
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
            isOnline: isOnline,
          );
        },
      ),
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
    required bool isOnline,
  }) {
    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          Row(
            children: [
              // 1. Far Left Multi-Tenant Workspace Switcher Dock (68px)
              const WorkspaceSwitcherDock(),

              // 2. Persistent Navigation Sidebar (250px expanded / 68px collapsed) - Matches Angular BCC Admin
              AppDrawer(
                isPermanentSidebar: true,
                isCollapsed: _isSidebarCollapsed,
                width: 250,
                collapsedWidth: 68,
                onToggleCollapse: _toggleSidebarCollapse,
                header: _buildDesktopSidebarHeader(
                  isDark,
                  activeWs,
                  isCollapsed: _isSidebarCollapsed,
                ),
                sections: _buildNavigationSections(isDark, activeWs),
                footer: _buildDesktopSidebarFooter(
                  isDark,
                  activeWs,
                  isCollapsed: _isSidebarCollapsed,
                ),
              ),

              // 3. Main Workspace Canvas
              Expanded(
                child: Column(
                  children: [
                    // Top Application Bar matching Angular Web Header
                    _buildDesktopTopBar(
                      context,
                      isDark,
                      activeWs,
                      notifCount,
                      isOnline: isOnline,
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

                    // Central Feature Expiration Notice (Strictly visible to BCC Admins in Admin mode)
                    _buildFeatureExpirationBanner(isDark, activeWs),

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

          // Full Workspace Refresh Loading Overlay
          if (_isRefreshing)
            Positioned.fill(
              child: _buildRefreshingOverlay(isDark),
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
    required bool isOnline,
  }) {
    return Scaffold(
      key: _mobileScaffoldKey,
      backgroundColor: isDark ? AppColors.backgroundDark : const Color(0xFFF8FAFC),
      appBar: AppTopBar(
        leadingType: AppTopBarLeadingType.menu,
        centerContent: Row(
          children: [
            if (activeWs != null) ...[
              TenantAvatar(
                iconUrl: activeWs.iconUrl,
                logoUrl: activeWs.logoUrl,
                name: activeWs.displayName,
                tenantKey: activeWs.tenantKey,
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
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          activeWs?.displayName ?? 'Console Dashboard',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isOnline ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                        ),
                      ),
                    ],
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
            icon: Icons.refresh_rounded,
            tooltip: _isRefreshing ? 'Refreshing...' : 'Refresh Workspace & Telemetry',
            customWidget: _isRefreshing
                ? SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        isDark ? Colors.white : AppColors.primary,
                      ),
                    ),
                  )
                : null,
            onTap: () {
              if (!_isRefreshing) {
                _triggerRefresh();
              }
            },
          ),
          AppTopBarAction(
            icon: Icons.notifications_none_rounded,
            tooltip: 'Notifications',
            badge: notifCount > 0
                ? AppBadge(text: '$notifCount', backgroundColor: AppColors.error)
                : null,
            onTap: () => NotificationsSheet.show(context),
          ),
          AppTopBarAction(
            icon: Icons.person_rounded,
            tooltip: 'profile.user_profile'.tr(ref, fallback: 'User Profile & Settings'),
            customWidget: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () => _mobileScaffoldKey.currentState?.openEndDrawer(),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 30,
                    height: 30,
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
                        fontSize: 11,
                      ),
                    ),
                  ),
                  Positioned(
                    right: -1,
                    bottom: -1,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: isOnline ? const Color(0xFF22C55E) : const Color(0xFFDC2626),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isDark ? AppColors.surfaceDark : Colors.white,
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            onTap: () => _mobileScaffoldKey.currentState?.openEndDrawer(),
          ),
        ],
      ),
      drawer: AppDrawer(
        onClose: () => _mobileScaffoldKey.currentState?.closeDrawer(),
        header: _buildDesktopSidebarHeader(isDark, activeWs, isMobile: true),
        sections: _buildNavigationSections(isDark, activeWs),
        footer: _buildDesktopSidebarFooter(isDark, activeWs, isMobile: true),
      ),
      endDrawer: UserProfileEndDrawer(
        activeWorkspace: activeWs is Workspace ? activeWs : null,
        onSwitchWorkspace: () => _showMobileWorkspaceSheet(context),
        onSignOut: () => _handleSignOut(activeWs),
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
              _buildFeatureExpirationBanner(isDark, activeWs, isMobile: true),
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

          // Full Workspace Refresh Loading Overlay
          if (_isRefreshing)
            Positioned.fill(
              child: _buildRefreshingOverlay(isDark),
            ),
        ],
      ),
      bottomNavigationBar: _buildMobileBottomBar(isDark, activeWs),
    );
  }

  // =========================================================================
  // TOP BAR (DESKTOP)
  // =========================================================================

  Widget _buildDesktopTopBar(
    BuildContext context,
    bool isDark,
    dynamic activeWs,
    int notifCount, {
    bool isOnline = true,
  }) {
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
          // Sidebar minimize / maximize toggle button
          IconButton(
            icon: Icon(
              _isSidebarCollapsed ? Icons.menu_rounded : Icons.menu_open_rounded,
              size: 20,
              color: isDark ? AppColors.gray300 : const Color(0xFF475569),
            ),
            tooltip: _isSidebarCollapsed ? 'Maximize sidebar' : 'Minimize sidebar',
            splashRadius: 18,
            onPressed: _toggleSidebarCollapse,
          ),
          const SizedBox(width: 8),

          // Brand Emblem Icon (matching Angular Web BCC Admin topbar parity)
          if (activeWs != null) ...[
            Tooltip(
              message: '${activeWs.displayName} Workspace',
              child: TenantAvatar(
                iconUrl: activeWs.iconUrl,
                logoUrl: activeWs.logoUrl,
                name: activeWs.displayName,
                tenantKey: activeWs.tenantKey,
                size: 28,
                borderRadius: 7,
              ),
            ),
            const SizedBox(width: 10),
          ],

          // Search workspace bar (Flexible with responsive width limits)
          Flexible(
            flex: 2,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 280, minWidth: 120),
              child: Container(
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
                        'shell.search_placeholder'.tr(ref, fallback: 'Search workspace...'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? AppColors.gray400 : const Color(0xFF94A3B8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          const Spacer(),

          // Central Pattern Multi-Language Switcher Component
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 6),
            child: OzLangSwitcher(),
          ),

          // Utility Action Icons (Refresh, Calendar, Help, Dark Mode, Notifications)
          _buildTopRefreshBtn(isDark),
          _buildTopIconBtn(
            icon: Icons.calendar_today_outlined,
            tooltip: 'Calendar & Schedules',
            isDark: isDark,
            onTap: () => _showCalendarDialog(context, isDark),
          ),
          _buildTopIconBtn(
            icon: Icons.help_outline_rounded,
            tooltip: 'Help & Knowledge Base',
            isDark: isDark,
            onTap: () => _showHelpSupportDialog(context, isDark),
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

          const SizedBox(width: 10),

          // Live Online / Offline Presence Notice Badge
          _buildOnlineOfflineStatusPill(isDark, isOnline),

          const SizedBox(width: 10),

          // User Profile Pill (OP - Onwuka Peter - SuperAdmin) - Clickable with Presence Dot
          Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () => _showUserProfileDialog(context, isDark, activeWs),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Stack(
                      clipBehavior: Clip.none,
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
                        Positioned(
                          right: -1,
                          bottom: -1,
                          child: Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: isOnline ? const Color(0xFF22C55E) : const Color(0xFFEF4444),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isDark ? AppColors.surfaceDark : Colors.white,
                                width: 1.5,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 8),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 120),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            activeWs?.userFullName ?? 'Workspace Admin',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: textColor,
                            ),
                          ),
                          Text(
                            _getUserRoleBadge(activeWs),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopRefreshBtn(bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: IconButton(
        icon: _isRefreshing
            ? SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    isDark ? Colors.white : AppColors.primary,
                  ),
                ),
              )
            : RotationTransition(
                turns: _refreshAnimController,
                child: Icon(
                  Icons.refresh_rounded,
                  size: 20,
                  color: isDark ? AppColors.gray300 : const Color(0xFF475569),
                ),
              ),
        tooltip: _isRefreshing ? 'Refreshing...' : 'Refresh Workspace & Telemetry',
        onPressed: _isRefreshing ? null : _triggerRefresh,
      ),
    );
  }

  /// <summary>
  /// Renders a full-screen semi-transparent loading overlay during active workspace refresh.
  /// Blocks interaction while displaying a modern glassmorphic status card with progress indicator.
  /// </summary>
  /// <param name="isDark">Whether dark mode is currently active.</param>
  /// <returns>A centered overlay widget with glassmorphism blur and progress feedback.</returns>
  Widget _buildRefreshingOverlay(bool isDark) {
    return Material(
      color: Colors.transparent,
      child: Container(
        color: (isDark ? Colors.black : Colors.white).withAlpha(140),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 4, sigmaY: 4),
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 22),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(isDark ? 80 : 30),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(
                    width: 36,
                    height: 36,
                    child: CircularProgressIndicator(
                      strokeWidth: 3,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Refreshing Workspace...',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : AppColors.onBackgroundLight,
                      letterSpacing: 0.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Synchronizing branding, telemetry, and metrics',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: isDark ? AppColors.gray400 : AppColors.gray500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
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
          'nav.console_dashboard'.tr(ref, fallback: 'Console Dashboard'),
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
          onPressed: _isRefreshing ? null : _triggerRefresh,
          icon: _isRefreshing
              ? SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      isDark ? Colors.white : AppColors.primary,
                    ),
                  ),
                )
              : RotationTransition(
                  turns: _refreshAnimController,
                  child: Icon(
                    Icons.refresh_rounded,
                    size: 16,
                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF334155),
                  ),
                ),
          label: Text(
            _isRefreshing ? 'Refreshing...' : 'btn.refresh_telemetry'.tr(ref, fallback: 'Refresh Telemetry'),
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
          label: Text(
            'btn.new_web_page'.tr(ref, fallback: 'New Web Page'),
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
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
                        'kpi.core_performance'.tr(ref, fallback: 'Core Performance & Health Counters'),
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
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF16A34A)),
                    const SizedBox(width: 5),
                    Text(
                      'kpi.all_operational'.tr(ref, fallback: 'All Services Operational'),
                      style: const TextStyle(
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

  Widget _buildDesktopSidebarHeader(
    bool isDark,
    dynamic activeWs, {
    bool isCollapsed = false,
    bool isMobile = false,
  }) {
    if (isCollapsed) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            alignment: Alignment.center,
            child: TenantAvatar(
              iconUrl: activeWs?.iconUrl,
              logoUrl: activeWs?.logoUrl,
              name: activeWs?.displayName ?? 'Ozikol',
              tenantKey: activeWs?.tenantKey,
              size: 34,
              borderRadius: 8,
            ),
          ),
          if (activeWs?.canAccessAdminConsole ?? false)
            IconButton(
              iconSize: 18,
              tooltip: activeWs?.activeConsoleMode == 'administration'
                  ? 'Switch to Users Workspace'
                  : 'Switch to Administration Console',
              icon: Icon(
                activeWs?.activeConsoleMode == 'administration'
                    ? Icons.admin_panel_settings_rounded
                    : Icons.person_rounded,
                color: AppColors.primary,
              ),
              onPressed: () {
                final next = activeWs?.activeConsoleMode == 'administration'
                    ? 'workspace'
                    : 'administration';
                ref.read(workspaceStateProvider.notifier).switchConsoleMode(next);
              },
            ),
        ],
      );
    }

    final hasLogo = activeWs?.logoUrl != null && (activeWs!.logoUrl as String).trim().isNotEmpty;
    final canAccessAdmin = activeWs?.canAccessAdminConsole ?? false;
    final isAdministration = activeWs?.activeConsoleMode != 'workspace';

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (hasLogo)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            alignment: Alignment.centerLeft,
            child: TenantCachedImage(
              imageUrl: activeWs.logoUrl,
              tenantKey: activeWs?.tenantKey,
              height: 38,
              fit: BoxFit.contain,
              fallbackWidget: Row(
                children: [
                  TenantAvatar(
                    iconUrl: activeWs?.iconUrl,
                    logoUrl: activeWs?.logoUrl,
                    name: activeWs?.displayName ?? 'Ozikol',
                    tenantKey: activeWs?.tenantKey,
                    size: 34,
                    borderRadius: 8,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
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
            ),
          )
        else
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                TenantAvatar(
                  iconUrl: activeWs?.iconUrl,
                  logoUrl: activeWs?.logoUrl,
                  name: activeWs?.displayName ?? 'Ozikol',
                  tenantKey: activeWs?.tenantKey,
                  size: 34,
                  borderRadius: 8,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
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
          ),

        // Mode Switcher Widget (Strictly shown on Desktop for Admin / Privileged Roles; omitted on Mobile)
        if (!isMobile && canAccessAdmin)
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 2, 10, 8),
            child: Container(
              height: 32,
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: isDark ? AppColors.backgroundDark : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                ),
              ),
              child: Row(
                children: [
                  // Administration Tab
                  Expanded(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(6),
                      onTap: () {
                        if (activeWs?.activeConsoleMode != 'administration') {
                          ref.read(workspaceStateProvider.notifier).switchConsoleMode('administration');
                        }
                      },
                      child: Container(
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: isAdministration ? AppColors.primary : Colors.transparent,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.admin_panel_settings_rounded,
                              size: 13,
                              color: isAdministration
                                  ? Colors.white
                                  : (isDark ? AppColors.gray400 : const Color(0xFF64748B)),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Admin',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: isAdministration
                                    ? Colors.white
                                    : (isDark ? AppColors.gray400 : const Color(0xFF64748B)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Workspace Tab
                  Expanded(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(6),
                      onTap: () {
                        if (activeWs?.activeConsoleMode != 'workspace') {
                          ref.read(workspaceStateProvider.notifier).switchConsoleMode('workspace');
                        }
                      },
                      child: Container(
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: !isAdministration ? AppColors.primary : Colors.transparent,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.person_rounded,
                              size: 13,
                              color: !isAdministration
                                  ? Colors.white
                                  : (isDark ? AppColors.gray400 : const Color(0xFF64748B)),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Workspace',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: !isAdministration
                                    ? Colors.white
                                    : (isDark ? AppColors.gray400 : const Color(0xFF64748B)),
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
          ),
      ],
    );
  }

  /// Signs out of the current user session and returns to the organization's WorkspaceLoginScreen.
  Future<void> _handleSignOut(dynamic activeWs) async {
    if (activeWs == null) return;
    final ws = activeWs is Workspace ? activeWs : null;
    await ref.read(workspaceStateProvider.notifier).signOutSession(activeWs.tenantKey);
    if (!mounted) return;
    if (ws != null) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => WorkspaceLoginScreen(workspace: ws)),
        (route) => false,
      );
    } else {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const WorkspaceEntryScreen()),
        (route) => false,
      );
    }
  }

  Widget _buildDesktopSidebarFooter(
    bool isDark,
    dynamic activeWs, {
    bool isCollapsed = false,
    bool isMobile = false,
  }) {
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);

    if (isCollapsed) {
      return Container(
        padding: const EdgeInsets.only(top: 8),
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: borderColor)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const OzLangSwitcher(compact: true),
            const SizedBox(height: 4),
            IconButton(
              icon: Icon(
                Icons.help_outline_rounded,
                size: 18,
                color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
              ),
              tooltip: 'shell.help_support'.tr(ref, fallback: 'Help & Support'),
              splashRadius: 18,
              onPressed: () => _showHelpSupportDialog(context, isDark),
            ),
            const SizedBox(height: 2),
            IconButton(
              icon: Icon(
                Icons.logout_rounded,
                size: 18,
                color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
              ),
              tooltip: 'shell.sign_out'.tr(ref, fallback: 'Sign Out'),
              splashRadius: 18,
              onPressed: () => _handleSignOut(activeWs),
            ),
            const SizedBox(height: 6),
            Tooltip(
              message: 'shell.powered_by'.tr(ref, fallback: 'Powered by Ozikol'),
              child: Image.asset(
                isDark ? 'assets/images/oz-logo-white.png' : 'assets/images/oz-logo.png',
                width: 16,
                height: 16,
                errorBuilder: (context, error, stackTrace) => const Icon(
                  Icons.bolt_rounded,
                  size: 16,
                  color: AppColors.primary,
                ),
              ),
            ),
            const SizedBox(height: 4),
          ],
        ),
      );
    }

    if (isMobile) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: borderColor)),
        ),
        child: Row(
          children: [
            Image.asset(
              isDark ? 'assets/images/oz-logo-white.png' : 'assets/images/oz-logo.png',
              width: 16,
              height: 16,
              errorBuilder: (context, error, stackTrace) => const Icon(
                Icons.bolt_rounded,
                size: 16,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'shell.powered_by'.tr(ref, fallback: 'Powered by Ozikol BCC'),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.only(top: 8),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: borderColor)),
      ),
      child: Column(
        children: [
          // Language Switcher Row in Drawer
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'shell.select_language'.tr(ref, fallback: 'Language'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                const OzLangSwitcher(),
              ],
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: TextButton.icon(
                  onPressed: () => _showHelpSupportDialog(context, isDark),
                  icon: const Icon(Icons.help_outline_rounded, size: 14),
                  label: Text(
                    'shell.help_support'.tr(ref, fallback: 'Help & Support'),
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                  style: TextButton.styleFrom(
                    alignment: Alignment.centerLeft,
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.logout_rounded, size: 16),
                tooltip: 'shell.sign_out'.tr(ref, fallback: 'Sign Out'),
                onPressed: () => _handleSignOut(activeWs),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'shell.powered_by'.tr(ref, fallback: 'Powered by Ozikol'),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<AppDrawerSection> _buildNavigationSections(bool isDark, dynamic activeWs) {
    final canAccessAdmin = activeWs == null || (activeWs?.canAccessAdminConsole ?? false);
    final isAdministration = canAccessAdmin && (activeWs?.activeConsoleMode != 'workspace');

    if (isAdministration) {
      return _buildAdminConsoleSections(isDark, activeWs);
    }

    return _buildUsersWorkspaceSections(isDark, activeWs);
  }

  /// Builds the clean Administration Console navigation tree for administrators and managers.
  /// Web-only CMS and HTML website builder items (Suite 00) are omitted to maintain a fast, focused native app.
  /// On Mobile & Desktop, User Management (Suite 01) comes immediately after Executive Command / Dashboard.
  List<AppDrawerSection> _buildAdminConsoleSections(bool isDark, dynamic activeWs) {
    final soonBadge = _buildPillBadge('badge.soon'.tr(ref, fallback: 'Soon'), isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8));

    return [
      // Core Executive Command & Governance Hub
      AppDrawerSection(
        title: 'suite.core_command'.tr(ref, fallback: 'Executive Command & Governance'),
        items: [
          AppDrawerItem(
            icon: Icons.space_dashboard_rounded,
            title: 'nav.console_dashboard'.tr(ref, fallback: 'Console Dashboard'),
            isSelected: _selectedNavIndex == 0,
            onTap: () => setState(() => _selectedNavIndex = 0),
          ),
          AppDrawerItem(
            icon: Icons.insights_rounded,
            title: 'Analytics & Telemetry',
            trailing: _buildPillBadge('LIVE', const Color(0xFF16A34A)),
            isSelected: _selectedNavIndex == 1,
            onTap: () => setState(() => _selectedNavIndex = 1),
          ),
          AppDrawerItem(
            icon: Icons.shield_outlined,
            title: 'nav.security_audit'.tr(ref, fallback: 'Security Audit'),
            trailing: _buildPillBadge('AUDIT', AppColors.primary),
            isSelected: _selectedNavIndex == 2,
            onTap: () => setState(() => _selectedNavIndex = 2),
          ),
          AppDrawerItem(
            icon: Icons.tune_outlined,
            title: 'nav.brand_settings'.tr(ref, fallback: 'Brand & Settings'),
            trailing: _buildPillBadge('HOT', const Color(0xFFEA580C)),
            isSelected: _selectedNavIndex == 3,
            onTap: () => setState(() => _selectedNavIndex = 3),
          ),
          AppDrawerItem(
            icon: Icons.language_rounded,
            title: 'nav.custom_domain'.tr(ref, fallback: 'Custom Domain'),
            isSelected: _selectedNavIndex == 4,
            onTap: () => setState(() => _selectedNavIndex = 4),
          ),
          AppDrawerItem(
            icon: Icons.payment_outlined,
            title: 'nav.feature_billing'.tr(ref, fallback: 'Feature Billing & Licenses'),
            trailing: _buildPillBadge('CENTRAL', AppColors.primary),
            isSelected: _selectedNavIndex == 5,
            onTap: () => setState(() => _selectedNavIndex = 5),
          ),
        ],
      ),

      // SUITE 01: People, Community & Collaboration (immediately follows Executive Command)
      AppDrawerSection(
        title: 'suite.people_community'.tr(ref, fallback: 'People, Community & Collaboration'),
        items: [
          AppDrawerItem(
            icon: Icons.people_outline_rounded,
            title: 'nav.user_management'.tr(ref, fallback: 'User Management & Directory'),
            isSelected: _selectedNavIndex == 6,
            onTap: () => setState(() => _selectedNavIndex = 6),
          ),
          AppDrawerItem(
            icon: Icons.admin_panel_settings_outlined,
            title: 'nav.identity_control'.tr(ref, fallback: 'Identity & Access Control'),
            isSelected: _selectedNavIndex == 7,
            onTap: () => setState(() => _selectedNavIndex = 7),
          ),
          AppDrawerItem(
            icon: Icons.verified_user_outlined,
            title: 'nav.roles_permissions'.tr(ref, fallback: 'Roles & Permissions'),
            isSelected: _selectedNavIndex == 8,
            onTap: () => setState(() => _selectedNavIndex = 8),
          ),
          AppDrawerItem(
            icon: Icons.mail_outline_rounded,
            title: 'nav.user_invitations'.tr(ref, fallback: 'Member Invitations'),
            isSelected: _selectedNavIndex == 9,
            onTap: () => setState(() => _selectedNavIndex = 9),
          ),
          AppDrawerItem(
            icon: Icons.policy_outlined,
            title: 'nav.global_policies'.tr(ref, fallback: 'Global Security Policies'),
            isSelected: _selectedNavIndex == 10,
            onTap: () => setState(() => _selectedNavIndex = 10),
          ),
          AppDrawerItem(
            icon: Icons.groups_outlined,
            title: 'nav.groups_directory'.tr(ref, fallback: 'Group Channels'),
            isSelected: _selectedNavIndex == 11,
            onTap: () => setState(() => _selectedNavIndex = 11),
          ),
          AppDrawerItem(
            icon: Icons.forum_outlined,
            title: 'nav.chat_messenger'.tr(ref, fallback: 'Ozikol Chat Messenger'),
            trailing: _buildPillBadge('LIVE', const Color(0xFF16A34A)),
            isSelected: _selectedNavIndex == 12,
            onTap: () => setState(() => _selectedNavIndex = 12),
          ),
          AppDrawerItem(
            icon: Icons.school_outlined,
            title: 'nav.alumni_network'.tr(ref, fallback: 'Alumni Network'),
            isSelected: _selectedNavIndex == 13,
            onTap: () => setState(() => _selectedNavIndex = 13),
          ),
          AppDrawerItem(
            icon: Icons.feedback_outlined,
            title: 'nav.whistleblowing'.tr(ref, fallback: 'Whistleblowing & Feedback'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 14,
            onTap: () => setState(() => _selectedNavIndex = 14),
          ),
        ],
      ),

      // SUITE 02: Workforce, Shifts & Scheduling
      AppDrawerSection(
        title: 'suite.workforce_shifts'.tr(ref, fallback: 'Workforce, Shifts & Scheduling'),
        items: [
          AppDrawerItem(
            icon: Icons.calendar_month_outlined,
            title: 'nav.staff_rota'.tr(ref, fallback: 'Staff & Volunteer Rota'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 15,
            onTap: () => setState(() => _selectedNavIndex = 15),
          ),
          AppDrawerItem(
            icon: Icons.swap_horiz_rounded,
            title: 'nav.shift_swaps'.tr(ref, fallback: 'Shift Swaps & Leave'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 16,
            onTap: () => setState(() => _selectedNavIndex = 16),
          ),
          AppDrawerItem(
            icon: Icons.timer_outlined,
            title: 'nav.attendance_tracking'.tr(ref, fallback: 'Attendance & Clock-In'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 17,
            onTap: () => setState(() => _selectedNavIndex = 17),
          ),
          AppDrawerItem(
            icon: Icons.event_repeat_rounded,
            title: 'nav.calendar_followups'.tr(ref, fallback: 'Calendar & Follow-Ups'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 18,
            onTap: () => setState(() => _selectedNavIndex = 18),
          ),
        ],
      ),

      // SUITE 03: Data Collection, Reports & Forms
      AppDrawerSection(
        title: 'suite.reports_forms'.tr(ref, fallback: 'Data Collection, Reports & Forms'),
        items: [
          AppDrawerItem(
            icon: Icons.summarize_outlined,
            title: 'nav.dynamic_reports'.tr(ref, fallback: 'Dynamic Reports'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 19,
            onTap: () => setState(() => _selectedNavIndex = 19),
          ),
          AppDrawerItem(
            icon: Icons.dynamic_form_outlined,
            title: 'nav.forms_surveys'.tr(ref, fallback: 'Forms & Surveys'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 20,
            onTap: () => setState(() => _selectedNavIndex = 20),
          ),
          AppDrawerItem(
            icon: Icons.fact_check_outlined,
            title: 'nav.reference_forms'.tr(ref, fallback: 'Reference Form System'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 21,
            onTap: () => setState(() => _selectedNavIndex = 21),
          ),
          AppDrawerItem(
            icon: Icons.menu_book_outlined,
            title: 'nav.knowledge_base'.tr(ref, fallback: 'Knowledge Base'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 22,
            onTap: () => setState(() => _selectedNavIndex = 22),
          ),
        ],
      ),

      // SUITE 04: Events, Ticketing & Training
      AppDrawerSection(
        title: 'suite.events_training'.tr(ref, fallback: 'Events, Ticketing & Training'),
        items: [
          AppDrawerItem(
            icon: Icons.confirmation_number_outlined,
            title: 'nav.event_ticketing'.tr(ref, fallback: 'Event Ticketing & Passes'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 23,
            onTap: () => setState(() => _selectedNavIndex = 23),
          ),
          AppDrawerItem(
            icon: Icons.record_voice_over_outlined,
            title: 'nav.speaker_sessions'.tr(ref, fallback: 'Speaker & Session Tracks'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 24,
            onTap: () => setState(() => _selectedNavIndex = 24),
          ),
          AppDrawerItem(
            icon: Icons.people_outline_rounded,
            title: 'nav.attendee_management'.tr(ref, fallback: 'Attendee Management'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 25,
            onTap: () => setState(() => _selectedNavIndex = 25),
          ),
        ],
      ),

      // SUITE 05: Finance, Contributions & Revenue
      AppDrawerSection(
        title: 'suite.finance_revenue'.tr(ref, fallback: 'Finance, Contributions & Revenue'),
        items: [
          AppDrawerItem(
            icon: Icons.account_balance_wallet_outlined,
            title: 'nav.invoicing_dues'.tr(ref, fallback: 'Invoicing & Member Dues'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 26,
            onTap: () => setState(() => _selectedNavIndex = 26),
          ),
          AppDrawerItem(
            icon: Icons.account_balance_outlined,
            title: 'nav.embedded_banking'.tr(ref, fallback: 'Embedded Banking & Rails'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 27,
            onTap: () => setState(() => _selectedNavIndex = 27),
          ),
          AppDrawerItem(
            icon: Icons.request_quote_outlined,
            title: 'nav.grant_ledger'.tr(ref, fallback: 'Proposal & Grant Ledger'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 28,
            onTap: () => setState(() => _selectedNavIndex = 28),
          ),
        ],
      ),

      // SUITE 06: Operations, Logistics & Facilities
      AppDrawerSection(
        title: 'suite.operations_logistics'.tr(ref, fallback: 'Operations, Logistics & Facilities'),
        items: [
          AppDrawerItem(
            icon: Icons.storefront_outlined,
            title: 'Commerce Studio',
            trailing: _buildPillBadge('NEW', const Color(0xFF0D9488)),
            isSelected: _selectedNavIndex == 29,
            onTap: () => setState(() => _selectedNavIndex = 29),
          ),
          AppDrawerItem(
            icon: Icons.how_to_vote_outlined,
            title: 'nav.elections_voting'.tr(ref, fallback: 'Elections & E-Voting'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 30,
            onTap: () => setState(() => _selectedNavIndex = 30),
          ),
          AppDrawerItem(
            icon: Icons.meeting_room_outlined,
            title: 'nav.facilities_equipment'.tr(ref, fallback: 'Facilities & Equipment Checkout'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 31,
            onTap: () => setState(() => _selectedNavIndex = 31),
          ),
        ],
      ),

      // SUITE 07: Communication, AI & Support
      AppDrawerSection(
        title: 'suite.communication_ai'.tr(ref, fallback: 'Communication, AI & Support'),
        items: [
          AppDrawerItem(
            icon: Icons.campaign_outlined,
            title: 'nav.notification_studio'.tr(ref, fallback: 'Notification Studio'),
            isSelected: _selectedNavIndex == 32,
            onTap: () => setState(() => _selectedNavIndex = 32),
          ),
          AppDrawerItem(
            icon: Icons.phone_in_talk_outlined,
            title: 'nav.gocall_dispatch'.tr(ref, fallback: 'GoCall AI Dispatch'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 33,
            onTap: () => setState(() => _selectedNavIndex = 33),
          ),
          AppDrawerItem(
            icon: Icons.support_agent_outlined,
            title: 'nav.helpdesk_support'.tr(ref, fallback: 'Helpdesk & Support Desk'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 34,
            onTap: () => setState(() => _selectedNavIndex = 34),
          ),
        ],
      ),

      // SUITE 08: Governance, Compliance & Safeguarding
      AppDrawerSection(
        title: 'suite.compliance_governance'.tr(ref, fallback: 'Governance, Compliance & Safeguarding'),
        items: [
          AppDrawerItem(
            icon: Icons.folder_zip_outlined,
            title: 'nav.document_vault'.tr(ref, fallback: 'Document Vault & Archive'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 35,
            onTap: () => setState(() => _selectedNavIndex = 35),
          ),
          AppDrawerItem(
            icon: Icons.school_outlined,
            title: 'nav.lms_training'.tr(ref, fallback: 'Learning Management (LMS)'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 36,
            onTap: () => setState(() => _selectedNavIndex = 36),
          ),
          AppDrawerItem(
            icon: Icons.verified_outlined,
            title: 'nav.certificate_verification'.tr(ref, fallback: 'Certificate Verification'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 37,
            onTap: () => setState(() => _selectedNavIndex = 37),
          ),
          AppDrawerItem(
            icon: Icons.badge_outlined,
            title: 'nav.kyc_verification'.tr(ref, fallback: 'KYC Verification'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 38,
            onTap: () => setState(() => _selectedNavIndex = 38),
          ),
        ],
      ),

      // SUITE 09: Demographics, Census & Analytics
      AppDrawerSection(
        title: 'suite.demographics_census'.tr(ref, fallback: 'Demographics, Census & Analytics'),
        items: [
          AppDrawerItem(
            icon: Icons.map_outlined,
            title: 'nav.community_census'.tr(ref, fallback: 'Community Census & Mapping'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 39,
            onTap: () => setState(() => _selectedNavIndex = 39),
          ),
          AppDrawerItem(
            icon: Icons.pin_drop_outlined,
            title: 'nav.field_surveyor'.tr(ref, fallback: 'Field Surveyor Tools'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 40,
            onTap: () => setState(() => _selectedNavIndex = 40),
          ),
          AppDrawerItem(
            icon: Icons.badge_outlined,
            title: 'nav.digital_id_cards'.tr(ref, fallback: 'Digital Member ID Cards'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 41,
            onTap: () => setState(() => _selectedNavIndex = 41),
          ),
        ],
      ),

      // Member Workspace Cross-Link Hub
      AppDrawerSection(
        title: 'suite.member_workspace'.tr(ref, fallback: 'Personal Workspace Hub'),
        items: [
          AppDrawerItem(
            icon: Icons.assignment_ind_outlined,
            title: 'nav.my_cv_biography'.tr(ref, fallback: 'My CV Biography'),
            isSelected: _selectedNavIndex == 42,
            onTap: () => setState(() => _selectedNavIndex = 42),
          ),
          AppDrawerItem(
            icon: Icons.chat_bubble_outline_rounded,
            title: 'nav.chat_messenger'.tr(ref, fallback: 'Ozikol Chat Messenger'),
            isSelected: _selectedNavIndex == 43,
            onTap: () => setState(() => _selectedNavIndex = 43),
          ),
          AppDrawerItem(
            icon: Icons.groups_outlined,
            title: 'nav.groups_directory'.tr(ref, fallback: 'Groups Directory'),
            isSelected: _selectedNavIndex == 44,
            onTap: () => setState(() => _selectedNavIndex = 44),
          ),
          AppDrawerItem(
            icon: Icons.school_outlined,
            title: 'nav.alumni_network'.tr(ref, fallback: 'Alumni Network'),
            isSelected: _selectedNavIndex == 45,
            onTap: () => setState(() => _selectedNavIndex = 45),
          ),
        ],
      ),
    ];
  }

  /// Builds the personal Users Workspace navigation tree for regular members and personal tasks.
  List<AppDrawerSection> _buildUsersWorkspaceSections(bool isDark, dynamic activeWs) {
    final soonBadge = _buildPillBadge('badge.soon'.tr(ref, fallback: 'Soon'), isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8));

    return [
      AppDrawerSection(
        title: 'suite.member_workspace'.tr(ref, fallback: 'Personal Workspace Hub'),
        items: [
          AppDrawerItem(
            icon: Icons.space_dashboard_outlined,
            title: 'nav.workspace_home'.tr(ref, fallback: 'Workspace Home'),
            isSelected: _selectedNavIndex == 0,
            onTap: () => setState(() => _selectedNavIndex = 0),
          ),
          AppDrawerItem(
            icon: Icons.person_outline_rounded,
            title: 'nav.my_profile'.tr(ref, fallback: 'My Profile'),
            isSelected: _selectedNavIndex == 1,
            onTap: () => setState(() => _selectedNavIndex = 1),
          ),
          AppDrawerItem(
            icon: Icons.assignment_ind_outlined,
            title: 'nav.my_cv_biography'.tr(ref, fallback: 'My CV Biography'),
            isSelected: _selectedNavIndex == 2,
            onTap: () => setState(() => _selectedNavIndex = 2),
          ),
          AppDrawerItem(
            icon: Icons.insights_rounded,
            title: 'nav.my_kpis'.tr(ref, fallback: 'My KPIs & Performance'),
            isSelected: _selectedNavIndex == 3,
            onTap: () => setState(() => _selectedNavIndex = 3),
          ),
          AppDrawerItem(
            icon: Icons.lock_outline_rounded,
            title: 'nav.security_password'.tr(ref, fallback: 'Security & Password'),
            isSelected: _selectedNavIndex == 4,
            onTap: () => setState(() => _selectedNavIndex = 4),
          ),
          AppDrawerItem(
            icon: Icons.notifications_none_rounded,
            title: 'nav.notifications_alerts'.tr(ref, fallback: 'Notifications & Alerts'),
            isSelected: _selectedNavIndex == 5,
            onTap: () => setState(() => _selectedNavIndex = 5),
          ),
        ],
      ),
      AppDrawerSection(
        title: 'suite.people_community'.tr(ref, fallback: 'People, Community & Collaboration'),
        items: [
          AppDrawerItem(
            icon: Icons.forum_outlined,
            title: 'nav.chat_messenger'.tr(ref, fallback: 'Ozikol Chat Messenger'),
            trailing: _buildPillBadge('LIVE', const Color(0xFF16A34A)),
            isSelected: _selectedNavIndex == 6,
            onTap: () => setState(() => _selectedNavIndex = 6),
          ),
          AppDrawerItem(
            icon: Icons.groups_outlined,
            title: 'nav.groups_directory'.tr(ref, fallback: 'Groups Directory'),
            isSelected: _selectedNavIndex == 7,
            onTap: () => setState(() => _selectedNavIndex = 7),
          ),
          AppDrawerItem(
            icon: Icons.school_outlined,
            title: 'nav.alumni_network'.tr(ref, fallback: 'Alumni Network'),
            isSelected: _selectedNavIndex == 8,
            onTap: () => setState(() => _selectedNavIndex = 8),
          ),
          AppDrawerItem(
            icon: Icons.calendar_month_outlined,
            title: 'Alumni Cohorts & Sets',
            isSelected: _selectedNavIndex == 9,
            onTap: () => setState(() => _selectedNavIndex = 9),
          ),
        ],
      ),
      AppDrawerSection(
        title: 'suite.workforce_shifts'.tr(ref, fallback: 'Workforce, Shifts & Scheduling'),
        items: [
          AppDrawerItem(
            icon: Icons.calendar_today_outlined,
            title: 'nav.staff_rota'.tr(ref, fallback: 'Staff & Volunteer Rota'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 10,
            onTap: () => setState(() => _selectedNavIndex = 10),
          ),
          AppDrawerItem(
            icon: Icons.schedule_rounded,
            title: 'nav.attendance_tracking'.tr(ref, fallback: 'Attendance & Clock-In'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 11,
            onTap: () => setState(() => _selectedNavIndex = 11),
          ),
        ],
      ),
      AppDrawerSection(
        title: 'suite.finance_revenue'.tr(ref, fallback: 'Finance, Contributions & Revenue'),
        items: [
          AppDrawerItem(
            icon: Icons.shopping_bag_outlined,
            title: 'nav.my_purchases'.tr(ref, fallback: 'My Purchases'),
            isSelected: _selectedNavIndex == 12,
            onTap: () => setState(() => _selectedNavIndex = 12),
          ),
          AppDrawerItem(
            icon: Icons.confirmation_number_outlined,
            title: 'nav.event_ticketing'.tr(ref, fallback: 'Event Ticketing & Passes'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 13,
            onTap: () => setState(() => _selectedNavIndex = 13),
          ),
          AppDrawerItem(
            icon: Icons.payments_outlined,
            title: 'nav.invoicing_dues'.tr(ref, fallback: 'Invoicing & Member Dues'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 14,
            onTap: () => setState(() => _selectedNavIndex = 14),
          ),
        ],
      ),
      AppDrawerSection(
        title: 'suite.compliance_governance'.tr(ref, fallback: 'Governance, Compliance & Safeguarding'),
        items: [
          AppDrawerItem(
            icon: Icons.badge_outlined,
            title: 'nav.digital_id_cards'.tr(ref, fallback: 'Digital Member ID Cards'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 15,
            onTap: () => setState(() => _selectedNavIndex = 15),
          ),
          AppDrawerItem(
            icon: Icons.verified_outlined,
            title: 'nav.certificate_verification'.tr(ref, fallback: 'Certificate Verification'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 16,
            onTap: () => setState(() => _selectedNavIndex = 16),
          ),
          AppDrawerItem(
            icon: Icons.support_agent_outlined,
            title: 'nav.helpdesk_support'.tr(ref, fallback: 'Helpdesk & Support Desk'),
            trailing: soonBadge,
            isSelected: _selectedNavIndex == 17,
            onTap: () => setState(() => _selectedNavIndex = 17),
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

  Widget _buildMobileBottomBar(bool isDark, dynamic activeWs) {
    final canAccessAdmin = activeWs == null || (activeWs?.canAccessAdminConsole ?? false);
    final isAdministration = canAccessAdmin && (activeWs?.activeConsoleMode != 'workspace');

    final items = isAdministration
        ? const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_rounded),
              label: 'Console',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.insights_rounded),
              label: 'Analytics',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.people_outline_rounded),
              label: 'Directory',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.settings_outlined),
              label: 'Settings',
            ),
          ]
        : const [
            BottomNavigationBarItem(
              icon: Icon(Icons.space_dashboard_outlined),
              label: 'Dashboard',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.groups_outlined),
              label: 'Channels',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.calendar_month_outlined),
              label: 'Events',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.account_circle_outlined),
              label: 'Profile',
            ),
          ];

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
        currentIndex: _selectedNavIndex.clamp(0, items.length - 1),
        onTap: (index) => setState(() => _selectedNavIndex = index),
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: isDark ? AppColors.gray400 : const Color(0xFF64748B),
        type: BottomNavigationBarType.fixed,
        selectedFontSize: 11,
        unselectedFontSize: 11,
        items: items,
      ),
    );
  }

  /// Feature Expiration Alert Banner visible strictly to administrators in Administration mode.
  Widget _buildFeatureExpirationBanner(bool isDark, dynamic activeWs, {bool isMobile = false}) {
    if (activeWs == null || !(activeWs.isAdmin as bool) || activeWs.activeConsoleMode == 'workspace') {
      return const SizedBox.shrink();
    }

    return Container(
      margin: EdgeInsets.fromLTRB(
        isMobile ? 16 : 28,
        isMobile ? 8 : 12,
        isMobile ? 16 : 28,
        isMobile ? 4 : 4,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF2D2010) : const Color(0xFFFFFBEB),
        border: Border.all(
          color: isDark ? const Color(0xFF78350F) : const Color(0xFFFDE68A),
        ),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline_rounded, color: Color(0xFFD97706), size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Central Feature Subscriptions Active (Admin Notice)',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFB45309),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Organization capabilities are governed by Central Master Catalog licenses.',
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? const Color(0xFFD97706) : const Color(0xFF92400E),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B),
              borderRadius: BorderRadius.circular(5),
            ),
            child: const Text(
              'LICENSES',
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: 0.4,
              ),
            ),
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
                  leading: TenantAvatar(
                    iconUrl: ws.iconUrl,
                    logoUrl: ws.logoUrl,
                    name: ws.displayName,
                    tenantKey: ws.tenantKey,
                    size: 36,
                  ),
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

  // =========================================================================
  // TOP BAR INTERACTION MODALS & PRESENCE INDICATORS
  // =========================================================================

  /// Live presence indicator pill reflecting network connectivity state.
  Widget _buildOnlineOfflineStatusPill(bool isDark, bool isOnline) {
    final bg = isOnline
        ? const Color(0xFF22C55E).withValues(alpha: 0.12)
        : const Color(0xFFEF4444).withValues(alpha: 0.12);
    final border = isOnline
        ? const Color(0xFF22C55E).withValues(alpha: 0.3)
        : const Color(0xFFEF4444).withValues(alpha: 0.3);
    final fg = isOnline ? const Color(0xFF16A34A) : const Color(0xFFDC2626);

    return Tooltip(
      message: isOnline
          ? 'Network Online • Real-Time Connected to Ozikol Cloud'
          : 'Network Offline • Showing Cached Workspace Data',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: fg,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              isOnline ? 'Online' : 'Offline',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: fg,
                letterSpacing: 0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Displays the interactive Calendar & Schedules modal dialog.
  void _showCalendarDialog(BuildContext context, bool isDark) {
    final dialogBg = isDark ? AppColors.surfaceDark : Colors.white;
    final textColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);
    final subColor = isDark ? AppColors.gray400 : const Color(0xFF64748B);
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);

    final now = DateTime.now();
    final dateStr = '${_monthName(now.month)} ${now.day}, ${now.year}';

    showDialog(
      context: context,
      builder: (dialogCtx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        backgroundColor: dialogBg,
        child: Container(
          width: 520,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.calendar_today_rounded,
                      color: AppColors.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Calendar & Schedules',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: textColor,
                          ),
                        ),
                        Text(
                          'Workspace Operations • $dateStr',
                          style: TextStyle(fontSize: 12, color: subColor),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: subColor),
                    onPressed: () => Navigator.of(dialogCtx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                'UPCOMING WORKSPACE SCHEDULES',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: subColor,
                ),
              ),
              const SizedBox(height: 12),
              _buildCalendarEventItem(
                isDark,
                title: 'Daily Telemetry & Membership Sync',
                time: '08:00 AM UTC • Automated',
                category: 'HEALTH',
                categoryColor: const Color(0xFF16A34A),
              ),
              const SizedBox(height: 8),
              _buildCalendarEventItem(
                isDark,
                title: 'CMS Page Cache & Asset Purge',
                time: '12:00 PM UTC • Scheduled',
                category: 'CMS',
                categoryColor: const Color(0xFF0284C7),
              ),
              const SizedBox(height: 8),
              _buildCalendarEventItem(
                isDark,
                title: 'Tenant Security & Access Audit Review',
                time: 'Tomorrow, 09:30 AM • Operations',
                category: 'SECURITY',
                categoryColor: const Color(0xFFF59E0B),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: () => Navigator.of(dialogCtx).pop(),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: borderColor),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Close'),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(dialogCtx).pop();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Opening Follow-Up scheduler...')),
                      );
                    },
                    icon: const Icon(Icons.add_rounded, size: 16, color: Colors.white),
                    label: const Text(
                      'New Event',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Displays the Help & Knowledge Base modal dialog.
  void _showHelpSupportDialog(BuildContext context, bool isDark) {
    final dialogBg = isDark ? AppColors.surfaceDark : Colors.white;
    final textColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);
    final subColor = isDark ? AppColors.gray400 : const Color(0xFF64748B);
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);

    showDialog(
      context: context,
      builder: (dialogCtx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        backgroundColor: dialogBg,
        child: Container(
          width: 540,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.help_outline_rounded,
                      color: AppColors.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Help & Knowledge Base',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: textColor,
                          ),
                        ),
                        Text(
                          'Ozikol Business Command Center Documentation',
                          style: TextStyle(fontSize: 12, color: subColor),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: subColor),
                    onPressed: () => Navigator.of(dialogCtx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: borderColor),
                ),
                child: Row(
                  children: [
                    Icon(Icons.search_rounded, size: 18, color: subColor),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Search documentation, guides, and FAQs...',
                        style: TextStyle(fontSize: 13, color: subColor),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'QUICK GUIDANCE & WORKFLOWS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: subColor,
                ),
              ),
              const SizedBox(height: 10),
              _buildHelpTopicTile(
                isDark,
                icon: Icons.dashboard_outlined,
                title: 'Console Dashboard Telemetry',
                description: 'Understand live counters, health metrics, and audit log activities.',
              ),
              const SizedBox(height: 6),
              _buildHelpTopicTile(
                isDark,
                icon: Icons.layers_outlined,
                title: 'Dynamic Web Page & Hero Customizer',
                description: 'Build sections, configure brand tokens, and publish HTML templates.',
              ),
              const SizedBox(height: 6),
              _buildHelpTopicTile(
                isDark,
                icon: Icons.domain_rounded,
                title: 'Multi-Tenant Workspace & Domains',
                description: 'Manage custom domains, database partitioning, and tenant vaults.',
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'Need assistance? Contact support@ozikol.cloud',
                      style: TextStyle(fontSize: 11, color: subColor),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: () => Navigator.of(dialogCtx).pop(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Done', style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Displays the user profile, role credentials, and presence details modal dialog.
  void _showUserProfileDialog(BuildContext context, bool isDark, dynamic activeWs) {
    final dialogBg = isDark ? AppColors.surfaceDark : Colors.white;
    final textColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);
    final subColor = isDark ? AppColors.gray400 : const Color(0xFF64748B);
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final connStatus = ref.read(connectivityStatusProvider);
    final isOnline = connStatus == ConnectivityStatus.online;

    showDialog(
      context: context,
      builder: (dialogCtx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        backgroundColor: dialogBg,
        child: Container(
          width: 420,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
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
                          _getUserInitials(activeWs?.userFullName),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 18,
                          ),
                        ),
                      ),
                      Positioned(
                        right: -2,
                        bottom: -2,
                        child: Container(
                          width: 14,
                          height: 14,
                          decoration: BoxDecoration(
                            color: isOnline ? const Color(0xFF22C55E) : const Color(0xFFEF4444),
                            shape: BoxShape.circle,
                            border: Border.all(color: dialogBg, width: 2),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          activeWs?.userFullName ?? 'Workspace Member',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: textColor,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                _getUserRoleBadge(activeWs),
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              isOnline ? 'Online' : 'Offline Mode',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: isOnline ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: subColor),
                    onPressed: () => Navigator.of(dialogCtx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Divider(color: borderColor, height: 1),
              const SizedBox(height: 16),
              _buildProfileDetailRow(
                isDark,
                icon: Icons.business_rounded,
                label: 'Active Workspace',
                value: activeWs?.displayName ?? 'Ozikol BCC',
              ),
              const SizedBox(height: 10),
              _buildProfileDetailRow(
                isDark,
                icon: Icons.language_rounded,
                label: 'Primary Domain',
                value: activeWs?.primaryDomain ?? 'mb-cocacola.localhost:4200',
              ),
              const SizedBox(height: 10),
              _buildProfileDetailRow(
                isDark,
                icon: Icons.wifi_rounded,
                label: 'Network Status',
                value: isOnline ? 'Online • Real-Time Connected' : 'Offline • Local Cache Active',
                valueColor: isOnline ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.of(dialogCtx).pop();
                    _showPrivilegesDialog(context, isDark, activeWs);
                  },
                  icon: const Icon(Icons.verified_user_outlined, size: 16, color: AppColors.primary),
                  label: Text(
                    'rbac.view_privileges'.tr(ref, fallback: 'View Privileges & Access'),
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.of(dialogCtx).pop();
                        _showMobileWorkspaceSheet(context);
                      },
                      icon: const Icon(Icons.swap_horiz_rounded, size: 16),
                      label: const Text('Switch Tenant'),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: borderColor),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(dialogCtx).pop();
                        _handleSignOut(activeWs);
                      },
                      icon: const Icon(Icons.logout_rounded, size: 16, color: Colors.white),
                      label: const Text('Sign Out', style: TextStyle(color: Colors.white)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEF4444),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCalendarEventItem(
    bool isDark, {
    required String title,
    required String time,
    required String category,
    required Color categoryColor,
  }) {
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final cardBg = isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC);
    final textColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);
    final subColor = isDark ? AppColors.gray400 : const Color(0xFF64748B);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: categoryColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              category,
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w800,
                color: categoryColor,
              ),
            ),
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
                    color: textColor,
                  ),
                ),
                Text(time, style: TextStyle(fontSize: 11, color: subColor)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHelpTopicTile(
    bool isDark, {
    required IconData icon,
    required String title,
    required String description,
  }) {
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final cardBg = isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC);
    final textColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);
    final subColor = isDark ? AppColors.gray400 : const Color(0xFF64748B);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
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
                    color: textColor,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: TextStyle(fontSize: 11, color: subColor),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileDetailRow(
    bool isDark, {
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    final textColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);
    final subColor = isDark ? AppColors.gray400 : const Color(0xFF64748B);

    return Row(
      children: [
        Icon(icon, size: 16, color: subColor),
        const SizedBox(width: 10),
        Text(
          label,
          style: TextStyle(fontSize: 12, color: subColor),
        ),
        const SizedBox(width: 8),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: valueColor ?? textColor,
            ),
          ),
        ),
      ],
    );
  }

  String _monthName(int month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[(month - 1).clamp(0, 11)];
  }

  /// Resolves the user's role badge (SuperAdmin, Administrator, or Member).
  String _getUserRoleBadge(dynamic activeWs) {
    if (activeWs == null) return 'Member';
    final roles = (activeWs.userRoles as List<dynamic>?)?.map((r) => r.toString().toLowerCase()).toList() ?? [];
    if (activeWs.isSuperAdmin == true || roles.contains('superadmin') || roles.contains('systemadministrator')) {
      return 'SuperAdmin';
    }
    if (activeWs.isAdmin == true || roles.any((r) => ['admin', 'administrator', 'identitymanager', 'cmsmanager', 'storemanager'].contains(r))) {
      return 'Administrator';
    }
    return 'Member';
  }

  /// Displays the account roles, granted capabilities, and unlocked suites modal dialog or bottom sheet.
  void _showPrivilegesDialog(BuildContext context, bool isDark, dynamic activeWs) {
    final dialogBg = isDark ? AppColors.surfaceDark : Colors.white;
    final textColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);
    final subColor = isDark ? AppColors.gray400 : const Color(0xFF64748B);
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final roleBadge = _getUserRoleBadge(activeWs);

    final List<String> roles = (activeWs?.userRoles as List<dynamic>?)?.map((r) => r.toString()).toList() ?? [];
    if (roles.isEmpty) {
      roles.add(roleBadge);
    }

    final List<String> capabilities = roleBadge == 'SuperAdmin'
        ? [
            'Full System Executive Administration',
            'Identity & RBAC Governance',
            'Security Audit & User Forensics',
            'Emergency 2FA Bypass & Log Analysis',
            'Suite Entitlements & Feature Billing',
            'Remote Session Kill & Revocation',
            'Brand Configuration & Custom Domains',
            'Cross-Platform Parity Management',
          ]
        : roleBadge == 'Administrator'
            ? [
                'User Directory & Invitation Dispatch',
                'Content CMS & Category Publishing',
                'Role Assignment & Membership Control',
                'Broadcast Studio Notifications',
                'Commerce Products & Order Management',
                'Community & Cohort Moderation',
                'Personal Workspace & Collaborative Tools',
                'Audit Log Verification',
              ]
            : [
                'Personal Workspace & Profile',
                'Dynamic CV Biography Portfolio',
                'Encrypted Real-Time Chat Messenger',
                'Community Groups & Cohort Forums',
                'Alumni Directory Access',
                'Personal Order & Purchase History',
                'Two-Factor Authentication Setup',
                'Account Security & Active Session View',
              ];

    final List<Map<String, dynamic>> accessibleSuites = roleBadge == 'SuperAdmin'
        ? [
            {'name': 'Executive Command & Governance', 'icon': Icons.space_dashboard_rounded},
            {'name': 'Suite 01: People & Community', 'icon': Icons.groups_outlined},
            {'name': 'Suite 02: Workforce & Shifts', 'icon': Icons.calendar_month_outlined},
            {'name': 'Suite 03: Reports & Forms', 'icon': Icons.summarize_outlined},
            {'name': 'Suite 04: Events & Ticketing', 'icon': Icons.confirmation_number_outlined},
            {'name': 'Suite 05: Finance & Revenue', 'icon': Icons.account_balance_wallet_outlined},
            {'name': 'Suite 06: Operations & Logistics', 'icon': Icons.storefront_outlined},
            {'name': 'Suite 07: Communication & AI', 'icon': Icons.campaign_outlined},
            {'name': 'Suite 08: Governance & Compliance', 'icon': Icons.folder_zip_outlined},
            {'name': 'Suite 09: Demographics & Census', 'icon': Icons.map_outlined},
            {'name': 'Personal Workspace Hub', 'icon': Icons.person_outline_rounded},
          ]
        : roleBadge == 'Administrator'
            ? [
                {'name': 'Executive Command & Governance', 'icon': Icons.space_dashboard_rounded},
                {'name': 'Suite 01: People & Community', 'icon': Icons.groups_outlined},
                {'name': 'Suite 06: Operations & Logistics', 'icon': Icons.storefront_outlined},
                {'name': 'Suite 07: Communication & AI', 'icon': Icons.campaign_outlined},
                {'name': 'Personal Workspace Hub', 'icon': Icons.person_outline_rounded},
              ]
            : [
                {'name': 'Personal Workspace Hub', 'icon': Icons.person_outline_rounded},
                {'name': 'Community Channels & Groups', 'icon': Icons.groups_outlined},
                {'name': 'Chat Messenger', 'icon': Icons.chat_bubble_outline_rounded},
                {'name': 'Alumni Network', 'icon': Icons.school_outlined},
                {'name': 'My Purchases & Dues', 'icon': Icons.shopping_bag_outlined},
              ];

    Widget buildContent(BuildContext ctx) => SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.verified_user_rounded,
                  color: AppColors.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'rbac.privileges_modal_title'.tr(ref, fallback: 'Account Roles & Security Privileges'),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${activeWs?.userFullName ?? 'Member'} • $roleBadge',
                      style: TextStyle(fontSize: 12, color: subColor, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(Icons.close_rounded, color: subColor),
                onPressed: () => Navigator.of(ctx).pop(),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Divider(color: borderColor, height: 1),
          const SizedBox(height: 16),

          // Section 1: Assigned Roles
          Row(
            children: [
              const Icon(Icons.badge_outlined, size: 16, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                'rbac.assigned_roles'.tr(ref, fallback: 'Assigned Platform Roles'),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                  color: textColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: roles.map((role) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: Text(
                  role,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 18),

          // Section 2: Unlocked Capabilities
          Row(
            children: [
              const Icon(Icons.lock_open_rounded, size: 16, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                'rbac.unlocked_capabilities'.tr(ref, fallback: 'Granted System Capabilities'),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                  color: textColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Column(
            children: capabilities.map((cap) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: borderColor),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_rounded, size: 16, color: Color(0xFF16A34A)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          cap,
                          style: TextStyle(fontSize: 12, color: textColor),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 18),

          // Section 3: Accessible Suites
          Row(
            children: [
              const Icon(Icons.grid_view_rounded, size: 16, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                'rbac.accessible_pages'.tr(ref, fallback: 'Unlocked Suites & Modules'),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                  color: textColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: accessibleSuites.map((suite) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: borderColor),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(suite['icon'] as IconData, size: 14, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Text(
                      suite['name'] as String,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: textColor,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 24),
          Align(
            alignment: Alignment.centerRight,
            child: ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              ),
              child: const Text('Done', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );

    final isMobile = MediaQuery.of(context).size.width < 600;
    if (isMobile) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: dialogBg,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (sheetCtx) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: buildContent(sheetCtx),
          ),
        ),
      );
    } else {
      showDialog(
        context: context,
        builder: (dialogCtx) => Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          backgroundColor: dialogBg,
          child: Container(
            width: 520,
            constraints: const BoxConstraints(maxHeight: 640),
            padding: const EdgeInsets.all(24),
            child: buildContent(dialogCtx),
          ),
        ),
      );
    }
  }
}
