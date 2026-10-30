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
import '../../../core/widgets/exit_confirmation_dialog.dart';
import '../../../core/widgets/offline_status_bar.dart';
import '../../../core/widgets/tenant_avatar.dart';
import '../../../core/widgets/tenant_cached_image.dart';
import '../../../core/widgets/update_banner.dart';
import '../../../core/models/workspace.dart';
import '../../../core/theme/theme_provider.dart';
import '../../workspace_auth/presentation/workspace_login_screen.dart';
import '../../workspace_auth/presentation/workspace_switcher_dock.dart';
import '../../workspace_auth/presentation/widgets/workspace_switch_dialog.dart';
import '../../workspace_auth/state/workspace_state.dart';
import '../../notifications/data/notification_service.dart';
import '../../notifications/presentation/notifications_sheet.dart';
import '../../../core/localization/language_provider.dart';
import '../../../core/widgets/oz_lang_switcher.dart';
import '../data/dashboard_repository.dart';
import '../models/dashboard_metrics.dart';
import 'widgets/user_profile_end_drawer.dart';
import 'screens/user_directory/user_dashboard_overview_view.dart';
import 'screens/user_directory/all_members_view.dart';
import 'screens/user_directory/user_categories_view.dart';
import 'screens/user_directory/auth_page_setup_view.dart';
import 'screens/user_directory/kpis_leaderboard_view.dart';
import 'screens/user_directory/user_settings_view.dart';
import 'screens/user_directory/user_create_view.dart';
import 'screens/user_directory/user_details_view.dart';
import 'screens/user_directory/user_edit_view.dart';
import 'screens/identity_access/identity_dashboard_view.dart';
import 'screens/identity_access/roles_permissions_view.dart';
import 'screens/identity_access/member_invitations_view.dart';
import 'screens/identity_access/member_invitation_create_view.dart';
import 'screens/identity_access/global_security_policies_view.dart';
import 'screens/manage_account/my_account_profile_view.dart';
import 'screens/manage_account/change_password_view.dart';
import 'screens/manage_account/two_factor_security_view.dart';
import 'screens/manage_account/manage_devices_view.dart';
import 'screens/manage_account/login_activity_view.dart';
import 'screens/manage_account/account_roles_privileges_view.dart';
import 'screens/billing/subscription_plans_view.dart';
import 'screens/billing/subscriptions_invoices_view.dart';
import 'screens/identity_access/security_audit_logs_view.dart';
import 'screens/identity_access/error_codes_view.dart';
import 'screens/member_workspace/workspace_home_view.dart';

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
  int _selectedNavIndex = 0;
  final List<int> _navHistory = [0];
  String? _activeStatusFilter;
  String? _activeCategoryFilter;
  bool _isSidebarCollapsed = false;
  late AnimationController _refreshAnimController;
  Map<String, dynamic>? _selectedMember;

  /// <summary>
  /// Navigates to the full-page 360-degree Member Command Center view for a member.
  /// </summary>
  void _navigateToMemberDetails(Map<String, dynamic> member) {
    setState(() {
      _selectedMember = member;
    });
    _navigateToTab(17);
  }

  /// <summary>
  /// Navigates to the full-page Member Edit view for a member.
  /// </summary>
  void _navigateToMemberEdit(Map<String, dynamic> member) {
    setState(() {
      _selectedMember = member;
    });
    _navigateToTab(18);
  }

  /// <summary>
  /// Navigates to a specific screen index with optional filtering and history tracking.
  /// </summary>
  /// <param name="index">Target tab index.</param>
  /// <param name="filterStatus">Optional member status filter to pre-select.</param>
  /// <param name="categoryFilter">Optional category filter (ID or name) to pre-select.</param>
  /// <param name="clearHistory">If true, resets navigation history stack.</param>
  void _navigateToTab(int index, {String? filterStatus, String? categoryFilter, bool clearHistory = false}) {
    if (_selectedNavIndex == index &&
        _activeStatusFilter == filterStatus &&
        _activeCategoryFilter == categoryFilter) {
      return;
    }
    setState(() {
      if (clearHistory) {
        _navHistory.clear();
        if (index != 0) {
          _navHistory.add(0);
        }
        _navHistory.add(index);
      } else {
        if (_navHistory.isEmpty) {
          _navHistory.add(0);
        }
        if (_navHistory.last != _selectedNavIndex) {
          _navHistory.add(_selectedNavIndex);
        }
        _navHistory.add(index);
      }
      _selectedNavIndex = index;
      _activeStatusFilter = filterStatus;
      _activeCategoryFilter = categoryFilter;
    });
  }

  /// <summary>
  /// Pops the navigation history stack and returns to the previous screen.
  /// </summary>
  void _navigateBack() {
    setState(() {
      if (_navHistory.length > 1) {
        _navHistory.removeLast();
        _selectedNavIndex = _navHistory.last;
      } else {
        _selectedNavIndex = 0;
        _navHistory.clear();
        _navHistory.add(0);
      }
      _activeStatusFilter = null;
      _activeCategoryFilter = null;
    });
  }

  /// Toggles the desktop sidebar between expanded (250px) and collapsed (68px) rail mode.
  void _toggleSidebarCollapse() {
    setState(() {
      _isSidebarCollapsed = !_isSidebarCollapsed;
    });
  }

  /// <summary>
  /// Switches between Account &amp; Security suite tabs when operating in Administration Console mode.
  /// Synchronizes horizontal tab navigation with the desktop sidebar menu selection.
  /// </summary>
  /// <param name="tabKey">The selected account sub-tab key ('password', '2fa', 'devices', 'activity', 'roles').</param>
  void _handleAccountTabAdmin(String tabKey) {
    switch (tabKey) {
      case 'password':
        _navigateToTab(12);
        break;
      case '2fa':
        _navigateToTab(13);
        break;
      case 'devices':
        _navigateToTab(14);
        break;
      case 'activity':
        _navigateToTab(15);
        break;
      case 'roles':
      default:
        _navigateToTab(20);
        break;
    }
  }

  /// <summary>
  /// Switches between Account &amp; Security suite tabs when operating in Personal Member Workspace mode.
  /// Synchronizes horizontal tab navigation with the desktop sidebar menu selection.
  /// </summary>
  /// <param name="tabKey">The selected account sub-tab key ('password', '2fa', 'devices', 'activity', 'roles').</param>
  void _handleAccountTabMember(String tabKey) {
    switch (tabKey) {
      case 'password':
        _navigateToTab(2);
        break;
      case '2fa':
        _navigateToTab(3);
        break;
      case 'devices':
        _navigateToTab(4);
        break;
      case 'activity':
        _navigateToTab(5);
        break;
      case 'roles':
      default:
        _navigateToTab(6);
        break;
    }
  }

  /// <summary>
  /// Navigates to an in-app destination triggered by a notification action URL.
  /// Seamlessly parses path and query parameters (e.g., '?tab=devices', '?tab=password').
  /// </summary>
  /// <param name="actionUrl">Relative or absolute action destination path.</param>
  void _handleNotificationAction(String actionUrl) {
    try {
      final uri = Uri.parse(actionUrl);
      final path = uri.path.toLowerCase();
      final tab = uri.queryParameters['tab']?.toLowerCase();

      final activeWs = ref.read(workspaceStateProvider).activeWorkspace;
      final canAccessAdmin = activeWs == null || activeWs.canAccessAdminConsole;
      final isAdministration = canAccessAdmin && (activeWs?.activeConsoleMode != 'workspace');

      if (path.contains('account') || path.contains('security') || path.contains('identity')) {
        if (isAdministration) {
          _handleAccountTabAdmin(tab ?? 'devices');
        } else {
          _handleAccountTabMember(tab ?? 'devices');
        }
      } else if (path.contains('member') || path.contains('user')) {
        _navigateToTab(isAdministration ? 1 : 0);
      } else {
        _navigateToTab(0);
      }
    } catch (_) {}
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
  int _activeCanvasRefreshTick = 0;

  /// Remakes all requests across the workspace:
  /// 1. Tenant organization branding (logo, icon, organization name) via /api/SettingsApi/brand
  /// 2. Dashboard operational metrics, member counters, and telemetry audit trail via /api/DashboardApi/metrics
  /// 3. Unread notification counters and feed via /api/Notifications/feed
  /// 4. Invalidate and re-fetch currently active screen canvas
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

      // 4. Force reload signal on active canvas view
      _activeCanvasRefreshTick++;

      // Brief animation dwell so spin feels responsive and organic
      await Future.delayed(const Duration(milliseconds: 600));

      if (mounted) {
        setState(() {});
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'dashboard.workspace_refreshed'.tr(ref, fallback: 'Workspace refreshed.'),
                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
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

    ref.listen<AsyncValue<DashboardMetrics>>(dashboardMetricsProvider, (prev, next) {
      if (next.isLoading && !_refreshAnimController.isAnimating) {
        _refreshAnimController.repeat();
      } else if (!next.isLoading && _refreshAnimController.isAnimating && !_isRefreshing) {
        _refreshAnimController.reset();
      }
    });

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
    required Workspace? activeWs,
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

                    // Main Active View Canvas
                    Expanded(
                      child: _buildActiveViewCanvas(
                        isDark: isDark,
                        isOnline: isOnline,
                        isLoading: isLoading,
                        metrics: metrics,
                        activeWs: activeWs,
                        isMobile: false,
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
            child: _buildOziAiFloatingButton(isDark, isMobile: false),
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
    required Workspace? activeWs,
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
        leadingType: (_selectedNavIndex != 0 || _navHistory.length > 1)
            ? AppTopBarLeadingType.back
            : AppTopBarLeadingType.menu,
        onLeadingPressed: (_selectedNavIndex != 0 || _navHistory.length > 1) ? _navigateBack : null,
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
            tooltip: 'shell.notifications'.tr(ref, fallback: 'Notifications'),
            badge: notifCount > 0
                ? AppBadge(text: '$notifCount', backgroundColor: AppColors.error)
                : null,
            onTap: () => NotificationsSheet.show(context, onNavigate: _handleNotificationAction),
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
                    right: 0,
                    bottom: 0,
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
      body: Theme(
        data: Theme.of(context).copyWith(
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(0, 36),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 36),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          outlinedButtonTheme: OutlinedButtonThemeData(
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(0, 36),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ),
        child: Stack(
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
              // Main Active View Canvas
              Expanded(
                child: _buildActiveViewCanvas(
                  isDark: isDark,
                  isOnline: isOnline,
                  isLoading: isLoading,
                  metrics: metrics,
                  activeWs: activeWs,
                  isMobile: true,
                ),
              ),
            ],
          ),
          Positioned(
            bottom: 12,
            right: 12,
            child: _buildOziAiFloatingButton(isDark, isMobile: true),
          ),

          // Full Workspace Refresh Loading Overlay
          if (_isRefreshing)
            Positioned.fill(
              child: _buildRefreshingOverlay(isDark),
            ),
        ],
        ),
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
    Workspace? activeWs,
    int notifCount, {
    bool isOnline = true,
  }) {
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final textColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);

    return LayoutBuilder(
      builder: (context, constraints) {
        final topBarWidth = constraints.maxWidth;

        // Progressive responsive breakpoints
        final isWide = topBarWidth >= 1050;
        final isMedium = topBarWidth >= 780 && topBarWidth < 1050;
        final isCompact = topBarWidth < 780;
        final isUltraNarrow = topBarWidth < 620;

        final canAccessAdmin = activeWs == null || activeWs.canAccessAdminConsole;
        final isAdministration = canAccessAdmin && (activeWs?.activeConsoleMode != 'workspace');

        // Adaptive search box sizing: scales gracefully with the viewport
        final double searchMaxWidth;
        if (isWide) {
          searchMaxWidth = (topBarWidth * 0.28).clamp(280.0, 440.0);
        } else if (isMedium) {
          searchMaxWidth = (topBarWidth * 0.24).clamp(190.0, 280.0);
        } else {
          searchMaxWidth = (topBarWidth * 0.22).clamp(130.0, 190.0);
        }

        return Container(
          height: 64,
          padding: EdgeInsets.symmetric(horizontal: isCompact ? 12 : 20),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            border: Border(bottom: BorderSide(color: borderColor, width: 1)),
          ),
          child: Row(
            children: [
              // 1. Sidebar toggle button
              IconButton(
                icon: Icon(
                  _isSidebarCollapsed ? Icons.menu_rounded : Icons.menu_open_rounded,
                  size: 20,
                  color: isDark ? AppColors.gray300 : const Color(0xFF475569),
                ),
                tooltip: _isSidebarCollapsed
                    ? 'shell.maximize_sidebar'.tr(ref, fallback: 'Maximize sidebar')
                    : 'shell.minimize_sidebar'.tr(ref, fallback: 'Minimize sidebar'),
                splashRadius: 18,
                onPressed: _toggleSidebarCollapse,
              ),
              const SizedBox(width: 4),

              // 1b. Adaptive Back Navigation Button (visible whenever navigation history has depth > 1 or not on root dashboard)
              if (_selectedNavIndex != 0 || _navHistory.length > 1) ...[
                Tooltip(
                  message: 'shell.back_previous'.tr(ref, fallback: 'Back to previous view'),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: _navigateBack,
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isDark ? AppColors.outlineDark : const Color(0xFFBFDBFE),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.arrow_back_rounded, size: 16, color: AppColors.primary),
                            const SizedBox(width: 4),
                            Text(
                              'shell.back'.tr(ref, fallback: 'Back'),
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.white : AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
              ],

              // 2. Adaptive Search workspace bar
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: searchMaxWidth,
                  minWidth: isUltraNarrow ? 110 : 140,
                ),
                child: Container(
                  height: 38,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
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
                          isCompact
                              ? 'shell.search_short'.tr(ref, fallback: 'Search...')
                              : 'shell.search_placeholder'.tr(ref, fallback: 'Search workspace...'),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? AppColors.gray400 : const Color(0xFF94A3B8),
                          ),
                        ),
                      ),
                      if (isWide) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.06),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '⌘K',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              const Spacer(),

              // 3b. Desktop Console Mode Switcher (Visible to Admins / SuperAdmins)
              if (canAccessAdmin) ...[
                _buildDesktopConsoleModeSwitcher(isDark, isAdministration, isCompact: isCompact || isMedium),
                const SizedBox(width: 8),
              ],

              // 4. Central Pattern Multi-Language Switcher (compact when space is tighter)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: OzLangSwitcher(compact: !isWide),
              ),

              // 5. Utility Action Icons (Progressively responsive)
              if (isWide) ...[
                _buildTopRefreshBtn(isDark),
                _buildTopIconBtn(
                  icon: Icons.calendar_today_outlined,
                  tooltip: 'shell.calendar_schedules'.tr(ref, fallback: 'Calendar & Schedules'),
                  isDark: isDark,
                  onTap: () => _showCalendarDialog(context, isDark),
                ),
                _buildTopIconBtn(
                  icon: Icons.help_outline_rounded,
                  tooltip: 'shell.help_support'.tr(ref, fallback: 'Help & Knowledge Base'),
                  isDark: isDark,
                  onTap: () => _showHelpSupportDialog(context, isDark),
                ),
              ] else if (isMedium) ...[
                _buildTopRefreshBtn(isDark),
                _buildTopMoreMenuBtn(context, isDark),
              ] else ...[
                _buildTopMoreMenuBtn(context, isDark, includeRefresh: true),
              ],

              // Theme Mode Toggle Icon
              _buildTopIconBtn(
                icon: isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                tooltip: 'shell.toggle_theme'.tr(ref, fallback: 'Toggle Color Theme'),
                isDark: isDark,
                onTap: () => _toggleTheme(),
              ),

              // Notifications Icon with live counter badge
              _buildTopIconBtn(
                icon: Icons.notifications_none_rounded,
                tooltip: 'notif.title'.tr(ref, fallback: 'Notifications'),
                isDark: isDark,
                badgeCount: notifCount,
                onTap: () => NotificationsSheet.show(context, onNavigate: _handleNotificationAction),
              ),

              // 6. Live Online / Offline Presence Notice Badge (on wider views)
              if (isWide) ...[
                const SizedBox(width: 8),
                _buildOnlineOfflineStatusPill(isDark, isOnline),
              ],

              const SizedBox(width: 8),

              // 7. Responsive User Profile Pill
              Material(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(10),
                child: InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () => _showUserProfileDialog(context, isDark, activeWs),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // User Avatar with live presence dot
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
                              right: 0,
                              bottom: 0,
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

                        // Name & Role labels (adapt based on available width)
                        if (!isCompact) ...[
                          const SizedBox(width: 8),
                          ConstrainedBox(
                            constraints: BoxConstraints(
                              maxWidth: isWide ? 130 : 90,
                            ),
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
                                if (isWide)
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
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Dropdown menu for secondary topbar actions on compact screen widths.
  Widget _buildTopMoreMenuBtn(
    BuildContext context,
    bool isDark, {
    bool includeRefresh = false,
  }) {
    return PopupMenuButton<String>(
      icon: Icon(
        Icons.more_horiz_rounded,
        size: 20,
        color: isDark ? AppColors.gray300 : const Color(0xFF475569),
      ),
      tooltip: 'shell.more_actions'.tr(ref, fallback: 'More actions'),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: isDark ? AppColors.surfaceDark : Colors.white,
      onSelected: (val) {
        switch (val) {
          case 'refresh':
            _triggerRefresh();
            break;
          case 'calendar':
            _showCalendarDialog(context, isDark);
            break;
          case 'help':
            _showHelpSupportDialog(context, isDark);
            break;
        }
      },
      itemBuilder: (context) => [
        if (includeRefresh)
          PopupMenuItem(
            value: 'refresh',
            child: Row(
              children: [
                Icon(
                  Icons.refresh_rounded,
                  size: 18,
                  color: isDark ? AppColors.gray300 : const Color(0xFF475569),
                ),
                const SizedBox(width: 10),
                Text('shell.refresh_workspace'.tr(ref, fallback: 'Refresh Workspace'), style: const TextStyle(fontSize: 13)),
              ],
            ),
          ),
        PopupMenuItem(
          value: 'calendar',
          child: Row(
            children: [
              Icon(
                Icons.calendar_today_outlined,
                size: 18,
                color: isDark ? AppColors.gray300 : const Color(0xFF475569),
              ),
              const SizedBox(width: 10),
              Text('shell.calendar_schedules'.tr(ref, fallback: 'Calendar & Schedules'), style: const TextStyle(fontSize: 13)),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'help',
          child: Row(
            children: [
              Icon(
                Icons.help_outline_rounded,
                size: 18,
                color: isDark ? AppColors.gray300 : const Color(0xFF475569),
              ),
              const SizedBox(width: 10),
              Text('shell.help_support'.tr(ref, fallback: 'Help & Knowledge Base'), style: const TextStyle(fontSize: 13)),
            ],
          ),
        ),
      ],
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
        tooltip: _isRefreshing
            ? 'shell.refreshing'.tr(ref, fallback: 'Refreshing...')
            : 'shell.refresh_title'.tr(ref, fallback: 'Refresh Workspace & Telemetry'),
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
    return AbsorbPointer(
      child: Material(
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
                      'shell.refreshing_workspace'.tr(ref, fallback: 'Refreshing Workspace...'),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : AppColors.onBackgroundLight,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'shell.sync_telemetry'.tr(ref, fallback: 'Synchronizing branding, telemetry, and metrics'),
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
      ),
    );
  }

  /// Builds a top bar icon button with an optional unread notification badge.
  /// Uses Flutter's native [Badge] widget positioned at the top-right corner of the icon
  /// to ensure the bell and action icons remain 100% visible, crisp, and unobstructed.
  Widget _buildTopIconBtn({
    required IconData icon,
    required String tooltip,
    required bool isDark,
    required VoidCallback onTap,
    int badgeCount = 0,
  }) {
    final iconColor = isDark ? AppColors.gray300 : const Color(0xFF475569);
    final iconWidget = Icon(
      icon,
      size: 20,
      color: iconColor,
    );

    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: IconButton(
        icon: badgeCount > 0
            ? Badge(
                isLabelVisible: true,
                label: Text(
                  badgeCount > 99 ? '99+' : '$badgeCount',
                  style: const TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    height: 1.0,
                  ),
                ),
                backgroundColor: AppColors.error,
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                offset: const Offset(4, -4),
                child: iconWidget,
              )
            : iconWidget,
        tooltip: tooltip,
        onPressed: onTap,
      ),
    );
  }

  // =========================================================================
  // COMMAND STRIP (Header with Refresh Telemetry & New Web Page)
  // =========================================================================

  // =========================================================================
  // SIDEBAR & DRAWER SECTIONS (Matches Angular BCC Admin Sidebar)
  // =========================================================================

  Widget _buildDesktopSidebarHeader(
    bool isDark,
    Workspace? activeWs, {
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
              name: activeWs?.displayName ?? 'Business Command Center',
              tenantKey: activeWs?.tenantKey,
              size: 34,
              borderRadius: 8,
            ),
          ),

        ],
      );
    }

    final hasLogo = activeWs?.logoUrl != null && (activeWs!.logoUrl as String).trim().isNotEmpty;

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
              tenantKey: activeWs.tenantKey,
              height: 38,
              fit: BoxFit.contain,
              fallbackWidget: Row(
                children: [
                  TenantAvatar(
                    iconUrl: activeWs.iconUrl,
                    logoUrl: activeWs.logoUrl,
                    name: activeWs.displayName,
                    tenantKey: activeWs.tenantKey,
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
                          activeWs.displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.2,
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: Color(0xFF10B981),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                'shell.active_workspace'.tr(ref, fallback: 'Active Workspace'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                  letterSpacing: 0.2,
                                ),
                              ),
                            ),
                          ],
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
                  name: activeWs?.displayName ?? 'Business Command Center',
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
                        activeWs?.displayName ?? 'Business Command Center',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.2,
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Color(0xFF10B981),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              'shell.active_workspace'.tr(ref, fallback: 'Active Workspace'),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                                letterSpacing: 0.2,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  /// Signs out of the current user session and returns to the organization's WorkspaceLoginScreen.
  Future<void> _handleSignOut(Workspace? activeWs) async {
    if (activeWs == null) return;
    await ref.read(workspaceStateProvider.notifier).signOutSession(activeWs.tenantKey);
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => WorkspaceLoginScreen(workspace: activeWs)),
      (route) => false,
    );
  }

  Widget _buildDesktopSidebarFooter(
    bool isDark,
    Workspace? activeWs, {
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
              message: 'shell.powered_by'.tr(ref, fallback: 'Business Command Center'),
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
                'shell.powered_by'.tr(ref, fallback: 'Business Command Center'),
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
                'shell.powered_by'.tr(ref, fallback: 'Business Command Center'),
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

  List<AppDrawerSection> _buildNavigationSections(bool isDark, Workspace? activeWs) {
    final canAccessAdmin = activeWs == null || activeWs.canAccessAdminConsole;
    final isAdministration = canAccessAdmin && (activeWs?.activeConsoleMode != 'workspace');

    if (isAdministration) {
      return _buildAdminConsoleSections(isDark, activeWs);
    }

    return _buildUsersWorkspaceSections(isDark, activeWs);
  }

  void _closeMobileDrawer() {
    if (_mobileScaffoldKey.currentState?.isDrawerOpen ?? false) {
      _mobileScaffoldKey.currentState?.closeDrawer();
    }
  }

  /// Builds the exact 3-Feature User Management Administration Console navigation tree:
  /// 1. User Directory (7 sub-items)
  /// 2. Identity & Access Control (4 sub-items)
  /// 3. Manage My Account (5 sub-items)
  List<AppDrawerSection> _buildAdminConsoleSections(bool isDark, Workspace? activeWs) {
    final rawAlias = activeWs?.categoryAlias?.trim();
    final categoryAlias = (rawAlias != null && rawAlias.isNotEmpty && rawAlias != 'User Categories')
        ? rawAlias
        : 'nav.user_categories'.tr(ref, fallback: 'User Categories');

    return [
      AppDrawerSection(
        title: 'nav.user_management'.tr(ref, fallback: 'USER MANAGEMENT').toUpperCase(),
        items: [
          // 1. User Directory (expandable)
          AppDrawerItem(
            icon: Icons.groups_rounded,
            title: 'nav.user_directory'.tr(ref, fallback: 'User Directory'),
            initiallyExpanded: _selectedNavIndex >= 0 && _selectedNavIndex <= 6,
            subItems: [
              AppDrawerSubItem(
                icon: Icons.dashboard_outlined,
                title: 'nav.console_dashboard'.tr(ref, fallback: 'Dashboard Overview'),
                isSelected: _selectedNavIndex == 0,
                onTap: () {
                  _navigateToTab(0, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.people_outline,
                title: 'nav.all_members'.tr(ref, fallback: 'All Members'),
                isSelected: _selectedNavIndex == 1,
                onTap: () {
                  _navigateToTab(1, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.category_outlined,
                title: categoryAlias,
                isSelected: _selectedNavIndex == 2,
                onTap: () {
                  _navigateToTab(2, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.leaderboard_outlined,
                title: 'nav.kpis_leaderboard'.tr(ref, fallback: 'KPIs & Leaderboard'),
                isSelected: _selectedNavIndex == 5,
                onTap: () {
                  _navigateToTab(5, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.settings_outlined,
                title: 'nav.user_settings'.tr(ref, fallback: 'User Settings'),
                isSelected: _selectedNavIndex == 6,
                onTap: () {
                  _navigateToTab(6, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
            ],
          ),

          // 2. Identity & Access Control (expandable)
          AppDrawerItem(
            icon: Icons.admin_panel_settings_outlined,
            title: 'nav.identity_control'.tr(ref, fallback: 'Identity & Access Control'),
            initiallyExpanded: _selectedNavIndex >= 7 && _selectedNavIndex <= 10,
            subItems: [
              AppDrawerSubItem(
                icon: Icons.shield_outlined,
                title: 'nav.identity_dashboard'.tr(ref, fallback: 'Identity Dashboard'),
                isSelected: _selectedNavIndex == 7,
                onTap: () {
                  _navigateToTab(7, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.vpn_key_outlined,
                title: 'nav.roles_permissions'.tr(ref, fallback: 'Roles & Permissions'),
                isSelected: _selectedNavIndex == 8,
                onTap: () {
                  _navigateToTab(8, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.lock_outline,
                title: 'nav.global_policies'.tr(ref, fallback: 'Global Security Policies'),
                isSelected: _selectedNavIndex == 10,
                onTap: () {
                  _navigateToTab(10, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
            ],
          ),

          // 3. Manage My Account (expandable)
          AppDrawerItem(
            icon: Icons.manage_accounts_outlined,
            title: 'profile.manage_account'.tr(ref, fallback: 'Manage My Account'),
            initiallyExpanded: (_selectedNavIndex >= 11 && _selectedNavIndex <= 15) || _selectedNavIndex == 20,
            subItems: [
              AppDrawerSubItem(
                icon: Icons.person_outline,
                title: 'nav.my_profile'.tr(ref, fallback: 'My Profile & Dossier'),
                isSelected: _selectedNavIndex == 11,
                onTap: () {
                  _navigateToTab(11, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.password_outlined,
                title: 'account.tab_password'.tr(ref, fallback: 'Change Password'),
                isSelected: _selectedNavIndex == 12,
                onTap: () {
                  _navigateToTab(12, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.security_outlined,
                title: 'account.tab_2fa'.tr(ref, fallback: '2FA Security'),
                isSelected: _selectedNavIndex == 13,
                onTap: () {
                  _navigateToTab(13, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.devices_outlined,
                title: 'account.tab_devices'.tr(ref, fallback: 'Manage Devices'),
                isSelected: _selectedNavIndex == 14,
                onTap: () {
                  _navigateToTab(14, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.history_outlined,
                title: 'account.tab_activity'.tr(ref, fallback: 'My Activity'),
                isSelected: _selectedNavIndex == 15,
                onTap: () {
                  _navigateToTab(15, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.verified_user_outlined,
                title: 'account.tab_roles'.tr(ref, fallback: 'Roles & Privileges'),
                isSelected: _selectedNavIndex == 20,
                onTap: () {
                  _navigateToTab(20, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
            ],
          ),
        ],
      ),

      // 4. BILLING & SUBSCRIPTIONS
      AppDrawerSection(
        title: 'BILLING & SUBSCRIPTIONS',
        onInfoTap: () {},
        infoTooltip: 'Billing, Add-on Features & Invoices Management',
        items: [
          AppDrawerItem(
            icon: Icons.extension_outlined,
            title: 'Subscription Plans',
            isSelected: _selectedNavIndex == 21,
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFEA580C),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text(
                'LIVE',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            onTap: () {
              _navigateToTab(21, clearHistory: true);
              _closeMobileDrawer();
            },
          ),
          AppDrawerItem(
            icon: Icons.receipt_long_outlined,
            title: 'Subscriptions & Invoices',
            isSelected: _selectedNavIndex == 22,
            onTap: () {
              _navigateToTab(22, clearHistory: true);
              _closeMobileDrawer();
            },
          ),
        ],
      ),

      // 5. SECURITY & AUDIT
      AppDrawerSection(
        title: 'SECURITY & AUDIT',
        onInfoTap: () {},
        infoTooltip: 'Audit Trail and Diagnostic Code Reference',
        items: [
          AppDrawerItem(
            icon: Icons.security_outlined,
            title: 'Security Audit',
            isSelected: _selectedNavIndex == 23,
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFEA580C),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text(
                'LIVE',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            onTap: () {
              _navigateToTab(23, clearHistory: true);
              _closeMobileDrawer();
            },
          ),
          AppDrawerItem(
            icon: Icons.menu_book_outlined,
            title: 'Error Codes',
            isSelected: _selectedNavIndex == 24,
            onTap: () {
              _navigateToTab(24, clearHistory: true);
              _closeMobileDrawer();
            },
          ),
        ],
      ),
    ];
  }

  /// Builds the exact 2-Feature Personal Workspace Hub navigation tree for members:
  /// 1. Workspace Home (single item)
  /// 2. Manage My Account (5 sub-items)
  List<AppDrawerSection> _buildUsersWorkspaceSections(bool isDark, Workspace? activeWs) {
    final memberIndex = _selectedNavIndex >= 100 ? _selectedNavIndex - 100 : _selectedNavIndex;

    return [
      AppDrawerSection(
        title: 'shell.users_workspace'.tr(ref, fallback: 'PERSONAL WORKSPACE HUB').toUpperCase(),
        items: [
          // 1. Workspace Home (single top-level item)
          AppDrawerItem(
            icon: Icons.space_dashboard_outlined,
            title: 'nav.workspace_home'.tr(ref, fallback: 'Workspace Home'),
            isSelected: memberIndex == 0,
            onTap: () {
              _navigateToTab(0, clearHistory: true);
              _closeMobileDrawer();
            },
          ),

          // 2. Manage My Account (expandable)
          AppDrawerItem(
            icon: Icons.manage_accounts_outlined,
            title: 'profile.manage_account'.tr(ref, fallback: 'Manage My Account'),
            initiallyExpanded: memberIndex >= 1 && memberIndex <= 6,
            subItems: [
              AppDrawerSubItem(
                icon: Icons.person_outline,
                title: 'nav.my_profile'.tr(ref, fallback: 'My Profile & Dossier'),
                isSelected: memberIndex == 1,
                onTap: () {
                  _navigateToTab(1, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.password_outlined,
                title: 'account.tab_password'.tr(ref, fallback: 'Change Password'),
                isSelected: memberIndex == 2,
                onTap: () {
                  _navigateToTab(2, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.security_outlined,
                title: 'account.tab_2fa'.tr(ref, fallback: '2FA Security'),
                isSelected: memberIndex == 3,
                onTap: () {
                  _navigateToTab(3, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.devices_outlined,
                title: 'account.tab_devices'.tr(ref, fallback: 'Manage Devices'),
                isSelected: memberIndex == 4,
                onTap: () {
                  _navigateToTab(4, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.history_outlined,
                title: 'account.tab_activity'.tr(ref, fallback: 'My Activity'),
                isSelected: memberIndex == 5,
                onTap: () {
                  _navigateToTab(5, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
              AppDrawerSubItem(
                icon: Icons.verified_user_outlined,
                title: 'account.tab_roles'.tr(ref, fallback: 'Roles & Privileges'),
                isSelected: memberIndex == 6,
                onTap: () {
                  _navigateToTab(6, clearHistory: true);
                  _closeMobileDrawer();
                },
              ),
            ],
          ),
        ],
      ),
    ];
  }

  /// Renders the active sub-feature view corresponding to the active mode and selected menu index.
  Widget _buildActiveViewCanvas({
    required bool isDark,
    required bool isOnline,
    required bool isLoading,
    required DashboardMetrics metrics,
    required Workspace? activeWs,
    bool isMobile = false,
  }) {
    return KeyedSubtree(
      key: ValueKey('active_canvas_${_selectedNavIndex}_$_activeCanvasRefreshTick'),
      child: _buildActiveViewContent(
        isDark: isDark,
        isOnline: isOnline,
        isLoading: isLoading,
        metrics: metrics,
        activeWs: activeWs,
        isMobile: isMobile,
      ),
    );
  }

  /// Inner content selector for the active sub-feature canvas.
  Widget _buildActiveViewContent({
    required bool isDark,
    required bool isOnline,
    required bool isLoading,
    required DashboardMetrics metrics,
    required Workspace? activeWs,
    bool isMobile = false,
  }) {
    final canAccessAdmin = activeWs == null || activeWs.canAccessAdminConsole;
    final isAdministration = canAccessAdmin && (activeWs?.activeConsoleMode != 'workspace');

    if (isAdministration) {
      switch (_selectedNavIndex) {
        case 0:
          return UserDashboardOverviewView(
            workspace: activeWs,
            onNavigateToTab: (idx, {filterStatus}) => _navigateToTab(idx, filterStatus: filterStatus),
          );
        case 1:
          return AllMembersView(
            workspace: activeWs,
            initialStatusFilter: _activeStatusFilter,
            initialCategoryFilter: _activeCategoryFilter,
            onNavigateToTab: (idx) => _navigateToTab(idx),
            onNavigateBack: _navigateBack,
            onNavigateToMemberDetails: _navigateToMemberDetails,
            onNavigateToMemberEdit: _navigateToMemberEdit,
          );
        case 2:
          return UserCategoriesView(
            workspace: activeWs,
            onNavigateToTab: (idx, {categoryFilter}) => _navigateToTab(idx, categoryFilter: categoryFilter),
            onNavigateBack: _navigateBack,
          );
        case 3:
          // Registration Form Builder is managed on the Web Admin Console (/users/console/registration-form)
          return AllMembersView(
            workspace: activeWs,
            initialStatusFilter: _activeStatusFilter,
            initialCategoryFilter: _activeCategoryFilter,
            onNavigateToTab: (idx) => _navigateToTab(idx),
            onNavigateBack: _navigateBack,
            onNavigateToMemberDetails: _navigateToMemberDetails,
            onNavigateToMemberEdit: _navigateToMemberEdit,
          );
        case 4:
          return AuthPageSetupView(
            workspace: activeWs,
            onNavigateToTab: (idx) => _navigateToTab(idx),
            onNavigateBack: _navigateBack,
          );
        case 5:
          return KpisLeaderboardView(
            workspace: activeWs,
            onNavigateToTab: (idx) => _navigateToTab(idx),
            onNavigateBack: _navigateBack,
          );
        case 6:
          return UserSettingsView(
            workspace: activeWs,
            onNavigateToTab: (idx) => _navigateToTab(idx),
            onNavigateBack: _navigateBack,
          );
        case 7:
          return IdentityDashboardView(
            workspace: activeWs,
            onNavigateToTab: (idx) => _navigateToTab(idx),
          );
        case 8:
          return RolesPermissionsView(
            workspace: activeWs,
            onNavigateToTab: (idx) => _navigateToTab(idx),
          );
        case 9:
          return MemberInvitationsView(
            workspace: activeWs,
            onNavigateToCreate: () => _navigateToTab(19),
          );
        case 10:
          return GlobalSecurityPoliciesView(workspace: activeWs);
        case 11:
          return MyAccountProfileView(
            workspace: activeWs,
            onSelectTab: _handleAccountTabAdmin,
          );
        case 12:
          return ChangePasswordView(
            workspace: activeWs,
            onSelectTab: _handleAccountTabAdmin,
          );
        case 13:
          return TwoFactorSecurityView(
            workspace: activeWs,
            onSelectTab: _handleAccountTabAdmin,
          );
        case 14:
          return ManageDevicesView(
            workspace: activeWs,
            onSelectTab: _handleAccountTabAdmin,
          );
        case 15:
          return LoginActivityView(
            workspace: activeWs,
            onSelectTab: _handleAccountTabAdmin,
          );
        case 16:
          return UserCreateView(
            workspace: activeWs,
            onNavigateBack: _navigateBack,
            onUserCreated: () => _navigateToTab(1, clearHistory: true),
          );
        case 17:
          return UserDetailsView(
            workspace: activeWs,
            member: _selectedMember ?? {},
            onNavigateBack: _navigateBack,
            onNavigateToEdit: (m) => _navigateToMemberEdit(m),
            onNavigateToTab: (idx) => _navigateToTab(idx),
          );
        case 18:
          return UserEditView(
            workspace: activeWs,
            member: _selectedMember ?? {},
            onNavigateBack: _navigateBack,
            onUserUpdated: () => _navigateToTab(1, clearHistory: true),
          );
        case 19:
          return MemberInvitationCreateView(
            workspace: activeWs,
            onNavigateBack: _navigateBack,
            onInvitationCreated: () => _navigateToTab(9, clearHistory: true),
          );
        case 20:
          return AccountRolesPrivilegesView(
            workspace: activeWs,
            onSelectTab: _handleAccountTabAdmin,
          );
        case 21:
          return SubscriptionPlansView(
            workspace: activeWs,
            onNavigateToSubscriptions: () => _navigateToTab(22),
            onOpenInvoice: (invId) => _navigateToTab(22),
          );
        case 22:
          return SubscriptionsInvoicesView(
            workspace: activeWs,
            onNavigateToPlans: () => _navigateToTab(21),
          );
        case 23:
          return SecurityAuditLogsView(workspace: activeWs);
        case 24:
          return ErrorCodesView(workspace: activeWs);
        default:
          return UserDashboardOverviewView(workspace: activeWs);
      }
    } else {
      // Member mode
      final memberIndex = _selectedNavIndex >= 100 ? _selectedNavIndex - 100 : _selectedNavIndex;
      switch (memberIndex) {
        case 0:
          return WorkspaceHomeView(
            workspace: activeWs,
            onNavigate: (idx) => _navigateToTab(idx >= 100 ? idx - 100 : idx),
          );
        case 1:
          return MyAccountProfileView(
            workspace: activeWs,
            onSelectTab: _handleAccountTabMember,
          );
        case 2:
          return ChangePasswordView(
            workspace: activeWs,
            onSelectTab: _handleAccountTabMember,
          );
        case 3:
          return TwoFactorSecurityView(
            workspace: activeWs,
            onSelectTab: _handleAccountTabMember,
          );
        case 4:
          return ManageDevicesView(
            workspace: activeWs,
            onSelectTab: _handleAccountTabMember,
          );
        case 5:
          return LoginActivityView(
            workspace: activeWs,
            onSelectTab: _handleAccountTabMember,
          );
        case 6:
          return AccountRolesPrivilegesView(
            workspace: activeWs,
            onSelectTab: _handleAccountTabMember,
          );
        default:
          return WorkspaceHomeView(
            workspace: activeWs,
            onNavigate: (idx) => setState(() => _selectedNavIndex = idx >= 100 ? idx - 100 : idx),
          );
      }
    }
  }

  Widget _buildMobileBottomBar(bool isDark, Workspace? activeWs) {
    final canAccessAdmin = activeWs == null || activeWs.canAccessAdminConsole;
    final isAdministration = canAccessAdmin && (activeWs?.activeConsoleMode != 'workspace');

    final items = isAdministration
        ? [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard_rounded),
              label: 'ui.tab_overview'.tr(ref, fallback: 'Overview'),
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.people_outline),
              activeIcon: Icon(Icons.people_rounded),
              label: 'ui.tab_members'.tr(ref, fallback: 'Members'),
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.shield_outlined),
              activeIcon: Icon(Icons.shield_rounded),
              label: 'ui.tab_identity'.tr(ref, fallback: 'Identity'),
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.manage_accounts_outlined),
              activeIcon: Icon(Icons.manage_accounts_rounded),
              label: 'ui.tab_account'.tr(ref, fallback: 'Account'),
            ),
          ]
        : [
            BottomNavigationBarItem(
              icon: Icon(Icons.space_dashboard_outlined),
              activeIcon: Icon(Icons.space_dashboard_rounded),
              label: 'ui.tab_home'.tr(ref, fallback: 'Home'),
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person_rounded),
              label: 'ui.tab_account'.tr(ref, fallback: 'Account'),
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.security_outlined),
              activeIcon: Icon(Icons.security_rounded),
              label: 'ui.tab_security'.tr(ref, fallback: 'Security'),
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.devices_outlined),
              activeIcon: Icon(Icons.devices_rounded),
              label: 'ui.tab_devices'.tr(ref, fallback: 'Devices'),
            ),
          ];

    int currentBottomIndex = 0;
    if (isAdministration) {
      if (_selectedNavIndex >= 0 && _selectedNavIndex <= 6) {
        currentBottomIndex = _selectedNavIndex == 1 ? 1 : 0;
      } else if (_selectedNavIndex >= 7 && _selectedNavIndex <= 10) {
        currentBottomIndex = 2;
      } else if (_selectedNavIndex >= 11 && _selectedNavIndex <= 15) {
        currentBottomIndex = 3;
      }
    } else {
      final mIdx = _selectedNavIndex >= 100 ? _selectedNavIndex - 100 : _selectedNavIndex;
      if (mIdx == 0) {
        currentBottomIndex = 0;
      } else if (mIdx == 1 || mIdx == 2 || mIdx == 5) {
        currentBottomIndex = 1;
      } else if (mIdx == 3) {
        currentBottomIndex = 2;
      } else if (mIdx == 4) {
        currentBottomIndex = 3;
      }
    }

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
        currentIndex: currentBottomIndex.clamp(0, items.length - 1),
        onTap: (index) {
          if (isAdministration) {
            switch (index) {
              case 0:
                setState(() => _selectedNavIndex = 0);
                break;
              case 1:
                setState(() => _selectedNavIndex = 1);
                break;
              case 2:
                setState(() => _selectedNavIndex = 7);
                break;
              case 3:
                setState(() => _selectedNavIndex = 11);
                break;
            }
          } else {
            switch (index) {
              case 0:
                setState(() => _selectedNavIndex = 0);
                break;
              case 1:
                setState(() => _selectedNavIndex = 1);
                break;
              case 2:
                setState(() => _selectedNavIndex = 3);
                break;
              case 3:
                setState(() => _selectedNavIndex = 4);
                break;
            }
          }
        },
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
  Widget _buildFeatureExpirationBanner(bool isDark, Workspace? activeWs, {bool isMobile = false}) {
    if (activeWs == null || !activeWs.isAdmin || activeWs.activeConsoleMode == 'workspace') {
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
                Text(
                  'billing.notice_title'.tr(ref, fallback: 'Central Feature Subscriptions Active (Admin Notice)'),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFB45309),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'billing.license_desc'.tr(ref, fallback: 'Organization capabilities are governed by Central Master Catalog licenses.'),
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
            child: Text(
              'billing.licenses'.tr(ref, fallback: 'LICENSES'),
              style: const TextStyle(
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
              Text(
                'ws.switch_title'.tr(ref, fallback: 'Switch Tenant Workspace'),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
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
                  subtitle: Text(
                    'profile.active_workspace'.tr(ref, fallback: 'Organization Workspace'),
                    style: const TextStyle(fontSize: 12),
                  ),
                  trailing: isCurrent
                      ? const Icon(Icons.check_circle_rounded, color: AppColors.primary)
                      : null,
                  onTap: () {
                    Navigator.of(context).pop();
                    if (isCurrent) return;
                    showWorkspaceSwitchDialog(context, ws);
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
          ? 'shell.net_online_tooltip'.tr(ref, fallback: 'Network Online • Real-Time Connected')
          : 'shell.net_offline_tooltip'.tr(ref, fallback: 'Network Offline • Showing Cached Workspace Data'),
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
              isOnline ? 'badge.online'.tr(ref, fallback: 'Online') : 'badge.offline'.tr(ref, fallback: 'Offline'),
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

  /// Builds the desktop top-bar console mode switcher allowing administrators to toggle
  /// between the full Administration Console and their Personal Workspace Hub.
  Widget _buildDesktopConsoleModeSwitcher(
    bool isDark,
    bool isAdministration, {
    bool isCompact = false,
  }) {
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1);
    final bg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);
    final activeBg = AppColors.primary;
    final inactiveTextColor = isDark ? AppColors.gray400 : const Color(0xFF64748B);

    return Container(
      height: 36,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Administration Console Tab
          Tooltip(
            message: 'shell.admin_console_tooltip'.tr(ref, fallback: 'Administration Console (User Management, Roles & Settings)'),
            child: InkWell(
              onTap: () {
                if (!isAdministration) {
                  ref.read(workspaceStateProvider.notifier).switchConsoleMode('administration');
                  _navigateToTab(0, clearHistory: true);
                }
              },
              borderRadius: BorderRadius.circular(6),
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: isCompact ? 8 : 12, vertical: 4),
                decoration: BoxDecoration(
                  color: isAdministration ? activeBg : Colors.transparent,
                  borderRadius: BorderRadius.circular(6),
                  boxShadow: isAdministration
                      ? [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.25),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          )
                        ]
                      : null,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.admin_panel_settings_rounded,
                      size: 15,
                      color: isAdministration ? Colors.white : inactiveTextColor,
                    ),
                    if (!isCompact) ...[
                      const SizedBox(width: 6),
                      Text(
                        'shell.admin_console_tab'.tr(ref, fallback: 'Admin Console'),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: isAdministration ? FontWeight.w700 : FontWeight.w500,
                          color: isAdministration ? Colors.white : inactiveTextColor,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 2),
          // Personal Workspace Hub Tab
          Tooltip(
            message: 'shell.personal_hub_tooltip'.tr(ref, fallback: 'Personal Workspace Hub (My Profile, Security & Personal Credentials)'),
            child: InkWell(
              onTap: () {
                if (isAdministration) {
                  ref.read(workspaceStateProvider.notifier).switchConsoleMode('workspace');
                  _navigateToTab(0, clearHistory: true);
                }
              },
              borderRadius: BorderRadius.circular(6),
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: isCompact ? 8 : 12, vertical: 4),
                decoration: BoxDecoration(
                  color: !isAdministration ? activeBg : Colors.transparent,
                  borderRadius: BorderRadius.circular(6),
                  boxShadow: !isAdministration
                      ? [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.25),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          )
                        ]
                      : null,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.person_rounded,
                      size: 15,
                      color: !isAdministration ? Colors.white : inactiveTextColor,
                    ),
                    if (!isCompact) ...[
                      const SizedBox(width: 6),
                      Text(
                        'shell.personal_hub_tab'.tr(ref, fallback: 'Personal Hub'),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: !isAdministration ? FontWeight.w700 : FontWeight.w500,
                          color: !isAdministration ? Colors.white : inactiveTextColor,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
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
                          'Business Command Center Documentation',
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
                description: 'Manage custom domains, workspace partitions, and tenant vaults.',
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'Need assistance? Contact your workspace administrator',
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
  void _showUserProfileDialog(BuildContext context, bool isDark, Workspace? activeWs) {
    final dialogBg = isDark ? AppColors.surfaceDark : Colors.white;
    final textColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);
    final subColor = isDark ? AppColors.gray400 : const Color(0xFF64748B);
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final connStatus = ref.read(connectivityStatusProvider);
    final isOnline = connStatus == ConnectivityStatus.online;
    final canAccessAdmin = activeWs == null || activeWs.canAccessAdminConsole;
    final isAdministration = canAccessAdmin && (activeWs?.activeConsoleMode != 'workspace');

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
                        right: 0,
                        bottom: 0,
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
                              isOnline ? 'badge.online'.tr(ref, fallback: 'Online') : 'badge.offline'.tr(ref, fallback: 'Offline Mode'),
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
              if (canAccessAdmin) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: borderColor),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            Navigator.of(dialogCtx).pop();
                            if (!isAdministration) {
                              ref.read(workspaceStateProvider.notifier).switchConsoleMode('administration');
                              _navigateToTab(0, clearHistory: true);
                            }
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: isAdministration ? AppColors.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.center,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.admin_panel_settings_rounded,
                                  size: 16,
                                  color: isAdministration ? Colors.white : subColor,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Admin Console',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: isAdministration ? FontWeight.w700 : FontWeight.w600,
                                    color: isAdministration ? Colors.white : textColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            Navigator.of(dialogCtx).pop();
                            if (isAdministration) {
                              ref.read(workspaceStateProvider.notifier).switchConsoleMode('workspace');
                              _navigateToTab(0, clearHistory: true);
                            }
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: !isAdministration ? AppColors.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.center,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.person_rounded,
                                  size: 16,
                                  color: !isAdministration ? Colors.white : subColor,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Personal Hub',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: !isAdministration ? FontWeight.w700 : FontWeight.w600,
                                    color: !isAdministration ? Colors.white : textColor,
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
              ],
              const SizedBox(height: 20),
              Divider(color: borderColor, height: 1),
              const SizedBox(height: 16),
              _buildProfileDetailRow(
                isDark,
                icon: Icons.business_rounded,
                label: 'shell.active_workspace'.tr(ref, fallback: 'Active Workspace'),
                value: activeWs?.displayName ?? 'Business Command Center',
              ),
              const SizedBox(height: 10),
              _buildProfileDetailRow(
                isDark,
                icon: Icons.language_rounded,
                label: 'nav.custom_domain'.tr(ref, fallback: 'Primary Domain'),
                value: activeWs?.primaryDomain ?? 'mb-cocacola.localhost:4200',
              ),
              const SizedBox(height: 10),
              _buildProfileDetailRow(
                isDark,
                icon: Icons.wifi_rounded,
                label: 'shell.network_status'.tr(ref, fallback: 'Network Status'),
                value: isOnline
                    ? 'shell.net_online_tooltip'.tr(ref, fallback: 'Online • Real-Time Connected')
                    : 'shell.net_offline_tooltip'.tr(ref, fallback: 'Offline • Local Cache Active'),
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
                      label: Text('ws.switch_title'.tr(ref, fallback: 'Switch Tenant')),
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
                      label: Text('shell.sign_out'.tr(ref, fallback: 'Sign Out'), style: const TextStyle(color: Colors.white)),
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
  String _getUserRoleBadge(Workspace? activeWs) {
    if (activeWs == null) return 'rbac.role_member'.tr(ref, fallback: 'Member');
    final roles = activeWs.userRoles.map((r) => r.toLowerCase()).toList();
    if (activeWs.isSuperAdmin || roles.contains('superadmin') || roles.contains('systemadministrator')) {
      return 'rbac.role_superadmin'.tr(ref, fallback: 'SuperAdmin');
    }
    if (activeWs.isAdmin || roles.any((r) => ['admin', 'administrator', 'identitymanager', 'cmsmanager', 'storemanager'].contains(r))) {
      return 'rbac.role_admin'.tr(ref, fallback: 'Administrator');
    }
    return 'rbac.role_member'.tr(ref, fallback: 'Member');
  }

  /// Displays the account roles, granted capabilities, and unlocked suites modal dialog or bottom sheet.
  void _showPrivilegesDialog(BuildContext context, bool isDark, Workspace? activeWs) {
    final dialogBg = isDark ? AppColors.surfaceDark : Colors.white;
    final textColor = isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A);
    final subColor = isDark ? AppColors.gray400 : const Color(0xFF64748B);
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final roleBadge = _getUserRoleBadge(activeWs);

    final List<String> roles = activeWs?.userRoles.toList() ?? [];
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

  Widget _buildOziAiFloatingButton(bool isDark, {bool isMobile = false}) {
    return _OziAiAnimatedFab(
      isMobile: isMobile,
      isDark: isDark,
      label: 'btn.ai_assistant'.tr(ref, fallback: 'AI Assistant'),
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('AI Assistant is available in the workspace studio.'),
            duration: Duration(seconds: 2),
          ),
        );
      },
    );
  }
}

/// <summary>
/// Minimized floating AI Assistant launcher.
/// On desktop: Displays the standard extended pill button with text.
/// On mobile: Minimized to a sleek 38x38 circular icon button with a subtle,
/// continuous pulsing circle ring animation to prevent blocking page actions.
/// </summary>
class _OziAiAnimatedFab extends StatefulWidget {
  final bool isMobile;
  final bool isDark;
  final String label;
  final VoidCallback onTap;

  const _OziAiAnimatedFab({
    required this.isMobile,
    required this.isDark,
    required this.label,
    required this.onTap,
  });

  @override
  State<_OziAiAnimatedFab> createState() => _OziAiAnimatedFabState();
}

class _OziAiAnimatedFabState extends State<_OziAiAnimatedFab>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseScale;
  late Animation<double> _pulseOpacity;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();

    _pulseScale = Tween<double>(begin: 1.0, end: 1.45).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOutCubic),
    );

    _pulseOpacity = Tween<double>(begin: 0.65, end: 0.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOutCubic),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isMobile) {
      return FloatingActionButton.extended(
        onPressed: widget.onTap,
        backgroundColor: AppColors.primary,
        elevation: 4,
        icon: const Icon(Icons.auto_awesome, color: Colors.white, size: 20),
        label: Text(
          widget.label,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      );
    }

    // Minimized Mobile Mode: 38x38 circular button with gentle pulsing animated circle ring
    return Tooltip(
      message: widget.label,
      child: GestureDetector(
        onTap: widget.onTap,
        child: SizedBox(
          width: 52,
          height: 52,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Subtle pulsing animated circle ring
              AnimatedBuilder(
                animation: _pulseController,
                builder: (context, child) {
                  return Container(
                    width: 38 * _pulseScale.value,
                    height: 38 * _pulseScale.value,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: const Color(0xFF0050E5).withValues(alpha: _pulseOpacity.value),
                        width: 1.5,
                      ),
                    ),
                  );
                },
              ),
              // Inner solid Royal Blue circular action button
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primary,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0050E5).withValues(alpha: 0.35),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.auto_awesome,
                  color: Colors.white,
                  size: 18,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
