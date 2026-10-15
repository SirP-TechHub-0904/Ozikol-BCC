import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/services/in_app_update_service.dart';
import '../../../core/widgets/contextual_info_button.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/offline_status_bar.dart';
import '../../../core/widgets/tenant_avatar.dart';
import '../../../core/widgets/theme_mode_switcher.dart';
import '../../../core/widgets/update_banner.dart';
import '../../workspace_auth/presentation/workspace_entry_screen.dart';
import '../../workspace_auth/presentation/workspace_switcher_dock.dart';
import '../../workspace_auth/state/workspace_state.dart';
import '../../notifications/data/notification_service.dart';
import '../../notifications/presentation/notifications_sheet.dart';

/// Adaptive dashboard shell accommodating desktop window layouts (multi-pane)
/// and mobile viewports (bottom navigation + drawer).
class DashboardShellScreen extends ConsumerStatefulWidget {
  const DashboardShellScreen({super.key});

  @override
  ConsumerState<DashboardShellScreen> createState() => _DashboardShellScreenState();
}

class _DashboardShellScreenState extends ConsumerState<DashboardShellScreen> {
  int _selectedNavIndex = 0;

  final List<_NavCategory> _categories = const [
    _NavCategory(
      title: 'Workspace Hub',
      items: [
        _NavItem(id: 'kpi_dashboard', label: 'Dashboard & Analytics', icon: Icons.dashboard_rounded),
        _NavItem(id: 'members', label: 'Member Directory', icon: Icons.people_outline_rounded),
        _NavItem(id: 'announcements', label: 'Announcements', icon: Icons.campaign_outlined),
      ],
    ),
    _NavCategory(
      title: 'Communication & Chat',
      items: [
        _NavItem(id: 'group_chat', label: 'Team Group Chat', icon: Icons.chat_bubble_outline_rounded, isLocked: false),
        _NavItem(id: 'direct_messages', label: 'Direct Messages', icon: Icons.forum_outlined),
        _NavItem(id: 'message_templates', label: 'Message Templates', icon: Icons.dynamic_form_outlined),
      ],
    ),
    _NavCategory(
      title: 'Operations & MIS Core',
      items: [
        _NavItem(id: 'inventory', label: 'Inventory Management', icon: Icons.inventory_2_outlined, isLocked: true),
        _NavItem(id: 'billing', label: 'Invoices & Payments', icon: Icons.receipt_long_outlined, isLocked: true),
        _NavItem(id: 'page_forms', label: 'Custom Dynamic Forms', icon: Icons.table_chart_outlined),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workspaceStateProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeWs = state.activeWorkspace;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= 900;

        if (isDesktop) {
          return Scaffold(
            body: Row(
              children: [
                // 1. Far Left Workspace Switcher Dock (Multi-Tenant)
                const WorkspaceSwitcherDock(),

                // 2. Feature Navigation Sidebar (250px)
                _buildDesktopSidebar(isDark, activeWs),

                // 3. Main Dynamic Content Canvas with Offline Resilience Bar
                Expanded(
                  child: Column(
                    children: [
                      const OfflineStatusBar(),
                      Expanded(child: _buildMainCanvas(isDark, activeWs)),
                    ],
                  ),
                ),
              ],
            ),
          );
        }

        // Mobile Layout with Offline Resilience Bar
        return Scaffold(
          appBar: AppBar(
            backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            elevation: 0,
            title: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                TenantAvatar(
                  logoUrl: activeWs?.logoUrl,
                  name: activeWs?.displayName ?? 'Ozikol',
                  size: 28,
                  borderRadius: 8,
                ),
                const SizedBox(width: 10),
                Flexible(
                  child: Text(
                    activeWs?.displayName ?? 'Workspace',
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            actions: [
              const ThemeModeSwitcher(compact: true),
              Consumer(
                builder: (context, ref, _) {
                  final notifState = ref.watch(notificationProvider);
                  return Stack(
                    clipBehavior: Clip.none,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.notifications_none_rounded),
                        tooltip: 'Notifications',
                        onPressed: () => NotificationsSheet.show(context),
                      ),
                      if (notifState.unreadCount > 0)
                        Positioned(
                          right: 8,
                          top: 8,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: AppColors.error,
                              shape: BoxShape.circle,
                            ),
                            constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                            child: Center(
                              child: Text(
                                '${notifState.unreadCount > 99 ? '99+' : notifState.unreadCount}',
                                style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.white),
                              ),
                            ),
                          ),
                        ),
                    ],
                  );
                },
              ),
              IconButton(
                icon: const Icon(Icons.swap_horiz_rounded),
                tooltip: 'Switch Workspace',
                onPressed: () => _showMobileWorkspaceSheet(context),
              ),
            ],
          ),
          drawer: _buildMobileDrawer(isDark, activeWs),
          body: Column(
            children: [
              Consumer(
                builder: (context, ref, _) {
                  final updateAsync = ref.watch(appUpdateCheckProvider);
                  return updateAsync.maybeWhen(
                    data: (res) => res.hasUpdate && res.updateInfo != null
                        ? UpdateBanner(updateInfo: res.updateInfo!)
                        : const SizedBox.shrink(),
                    orElse: () => const SizedBox.shrink(),
                  );
                },
              ),
              const OfflineStatusBar(),
              Expanded(child: _buildMobileBody(isDark, activeWs)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDesktopSidebar(bool isDark, dynamic activeWs) {
    final sidebarBg = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.outlineDark : AppColors.outlineLight;

    return Container(
      width: 250,
      decoration: BoxDecoration(
        color: sidebarBg,
        border: Border(right: BorderSide(color: borderColor, width: 1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Workspace Header Card
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: borderColor)),
            ),
            child: Row(
              children: [
                TenantAvatar(
                  logoUrl: activeWs?.logoUrl,
                  name: activeWs?.displayName ?? 'Ozikol',
                  size: 38,
                  borderRadius: 12,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        activeWs?.displayName ?? 'Workspace',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        activeWs?.primaryDomain ?? 'domain.ozikol.cloud',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Categorized Feature Navigation List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 14),
              itemCount: _categories.length,
              itemBuilder: (context, catIdx) {
                final cat = _categories[catIdx];
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                      child: Text(
                        cat.title.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                          color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        ),
                      ),
                    ),
                    ...cat.items.asMap().entries.map((entry) {
                      final item = entry.value;
                      final globalIndex = catIdx * 10 + entry.key;
                      final isSelected = _selectedNavIndex == globalIndex;

                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                        child: InkWell(
                          onTap: () {
                            if (item.isLocked) {
                              _showLockedFeatureDialog(context, item.label);
                            } else {
                              setState(() => _selectedNavIndex = globalIndex);
                            }
                          },
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.primary.withAlpha(isDark ? 40 : 20)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  item.icon,
                                  size: 18,
                                  color: isSelected
                                      ? AppColors.primary
                                      : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    item.label,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                                      color: isSelected
                                          ? AppColors.primary
                                          : (isDark ? AppColors.onBackgroundDark : AppColors.onBackgroundLight),
                                    ),
                                  ),
                                ),
                                if (item.isLocked)
                                  const Icon(
                                    Icons.lock_outline_rounded,
                                    size: 14,
                                    color: AppColors.warning,
                                  ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 8),
                  ],
                );
              },
            ),
          ),

          // User Footer Profile
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: borderColor)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: AppColors.primaryContainer,
                  child: Text(
                    activeWs?.userFullName?.isNotEmpty == true
                        ? activeWs!.userFullName![0].toUpperCase()
                        : 'U',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        activeWs?.userFullName ?? 'Staff Member',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      Text(
                        activeWs?.userEmail ?? '',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.logout_rounded, size: 18, color: Color(0xFF64748B)),
                  tooltip: 'Sign Out of Workspace',
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
          ),
        ],
      ),
    );
  }

  Widget _buildMainCanvas(bool isDark, dynamic activeWs) {
    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      body: Column(
        children: [
          Consumer(
            builder: (context, ref, _) {
              final updateAsync = ref.watch(appUpdateCheckProvider);
              return updateAsync.maybeWhen(
                data: (res) => res.hasUpdate && res.updateInfo != null
                    ? UpdateBanner(updateInfo: res.updateInfo!)
                    : const SizedBox.shrink(),
                orElse: () => const SizedBox.shrink(),
              );
            },
          ),
          const OfflineStatusBar(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Spatial Welcome Banner
            GlassContainer(
              borderRadius: 20,
              padding: const EdgeInsets.all(28),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome back to ${activeWs?.displayName ?? "Workspace"}',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.5,
                            color: isDark ? AppColors.onBackgroundDark : AppColors.onBackgroundLight,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Multi-Tenant Cross-Platform MIS • Active Database Connected',
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.success.withAlpha(isDark ? 40 : 25),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.success.withAlpha(80)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.check_circle_rounded, color: AppColors.success, size: 16),
                        SizedBox(width: 8),
                        Text(
                          'Tenant Channel Active',
                          style: TextStyle(
                            color: AppColors.success,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Consumer(
                    builder: (context, ref, _) {
                      final notifState = ref.watch(notificationProvider);
                      return InkWell(
                        onTap: () => NotificationsSheet.show(context),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1E293B) : Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Stack(
                                clipBehavior: Clip.none,
                                children: [
                                  const Icon(Icons.notifications_outlined, size: 18),
                                  if (notifState.unreadCount > 0)
                                    Positioned(
                                      right: -2,
                                      top: -2,
                                      child: Container(
                                        width: 8,
                                        height: 8,
                                        decoration: const BoxDecoration(
                                          color: AppColors.error,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Alerts (${notifState.unreadCount})',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(width: 12),
                  const ThemeModeSwitcher(),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // Responsive KPI Widgets Showcase
            Row(
              children: [
                Text(
                  'Workspace Overview',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.onBackgroundDark : AppColors.onBackgroundLight,
                  ),
                ),
                const SizedBox(width: 8),
                const ContextualInfoButton(
                  title: 'Workspace Metrics & Operations',
                  purpose: 'Summarizes key operational telemetry, active member counts, and recurring feature subscription revenue for the active tenant organization.',
                  expectedInputs: 'Automated live feed aggregated across financial records and member registrations.',
                  impact: 'Reflects real-time transactional performance across web, desktop, and mobile channels.',
                  bestPractices: 'Monitor active feature subscriptions and recurring revenue weekly to track tenant organization growth.',
                ),
              ],
            ),
            const SizedBox(height: 16),

            LayoutBuilder(
              builder: (context, box) {
                final cardWidth = (box.maxWidth - 48) / 3;
                return Wrap(
                  spacing: 24,
                  runSpacing: 24,
                  children: [
                    _buildKpiCard('Active Members', '142', '+12% this month', Icons.people_outline_rounded, AppColors.primary, cardWidth),
                    _buildKpiCard('Active Discussions', '28', '8 unread messages', Icons.chat_bubble_outline_rounded, AppColors.secondary, cardWidth),
                    _buildKpiCard('Modular Features', '40+', 'Active plan tier', Icons.extension_outlined, AppColors.tertiary, cardWidth),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    ),
  ],
),
);
}

  Widget _buildKpiCard(String title, String value, String sub, IconData icon, Color color, double width) {
    return Container(
      width: width.clamp(240, 400),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).brightness == Brightness.dark ? AppColors.outlineDark : AppColors.outlineLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
              ),
              Icon(icon, size: 22, color: color),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            value,
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.5),
          ),
          const SizedBox(height: 4),
          Text(
            sub,
            style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileDrawer(bool isDark, dynamic activeWs) {
    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            UserAccountsDrawerHeader(
              currentAccountPicture: TenantAvatar(
                logoUrl: activeWs?.logoUrl,
                name: activeWs?.displayName ?? 'OZ',
                size: 50,
              ),
              accountName: Text(activeWs?.displayName ?? 'Workspace'),
              accountEmail: Text(activeWs?.primaryDomain ?? ''),
              decoration: const BoxDecoration(color: AppColors.primary),
            ),
            ListTile(
              leading: const Icon(Icons.swap_horiz_rounded),
              title: const Text('Switch Workspace'),
              onTap: () {
                Navigator.pop(context);
                _showMobileWorkspaceSheet(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.add_business_rounded),
              title: const Text('Add Another Workspace'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const WorkspaceEntryScreen()));
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMobileBody(bool isDark, dynamic activeWs) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome, ${activeWs?.displayName ?? "User"}',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _buildKpiCard('Active Members', '142', '+12%', Icons.people_outline_rounded, AppColors.primary, double.infinity),
          const SizedBox(height: 14),
          _buildKpiCard('Active Discussions', '28', '8 unread', Icons.chat_bubble_outline_rounded, AppColors.secondary, double.infinity),
        ],
      ),
    );
  }

  void _showMobileWorkspaceSheet(BuildContext context) {
    final state = ref.read(workspaceStateProvider);
    final notifier = ref.read(workspaceStateProvider.notifier);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Text('Enrolled Workspaces', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                ...state.enrolledWorkspaces.map((ws) {
                  final isActive = ws.tenantKey == state.activeWorkspace?.tenantKey;
                  return ListTile(
                    leading: TenantAvatar(logoUrl: ws.logoUrl, name: ws.displayName, size: 36),
                    title: Text(ws.displayName),
                    subtitle: Text(ws.primaryDomain),
                    trailing: isActive ? const Icon(Icons.check_circle_rounded, color: AppColors.primary) : null,
                    onTap: () {
                      notifier.switchWorkspace(ws.tenantKey);
                      Navigator.pop(context);
                    },
                  );
                }),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.add_rounded, color: AppColors.primary),
                  title: const Text('Add Another Workspace', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const WorkspaceEntryScreen()));
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showLockedFeatureDialog(BuildContext context, String featureName) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: Row(
            children: [
              const Icon(Icons.lock_rounded, color: AppColors.warning, size: 22),
              const SizedBox(width: 10),
              const Text('Feature Locked', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            ],
          ),
          content: Text(
            '$featureName is a modular capability not included in your organization\'s active subscription.\n\nPlease contact your system administrator or upgrade your subscription tier in the Central Works portal.',
            style: const TextStyle(fontSize: 13, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Dismiss'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => Navigator.pop(context),
              child: const Text('View Upgrade Options'),
            ),
          ],
        );
      },
    );
  }
}

class _NavCategory {
  final String title;
  final List<_NavItem> items;
  const _NavCategory({required this.title, required this.items});
}

class _NavItem {
  final String id;
  final String label;
  final IconData icon;
  final bool isLocked;
  const _NavItem({required this.id, required this.label, required this.icon, this.isLocked = false});
}
