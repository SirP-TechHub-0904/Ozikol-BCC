import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/tenant_avatar.dart';
import '../state/workspace_state.dart';
import 'workspace_entry_screen.dart';
import 'workspace_login_screen.dart';

/// Desktop vertical workspace dock (Slack / Discord style).
/// Displays enrolled organization avatars, active workspace indicator pill, and "+ Add Workspace" button.
class WorkspaceSwitcherDock extends ConsumerWidget {
  const WorkspaceSwitcherDock({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(workspaceStateProvider);
    final notifier = ref.read(workspaceStateProvider.notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final dockBg = isDark ? AppColors.dockBackgroundDark : AppColors.dockBackgroundLight;
    final borderColor = isDark ? AppColors.outlineDark : AppColors.outlineLight;

    return Container(
      width: 72,
      decoration: BoxDecoration(
        color: dockBg,
        border: Border(
          right: BorderSide(color: borderColor, width: 1),
        ),
      ),
      child: Column(
        children: [
          const SizedBox(height: 14),

          // Enrolled Workspaces List
          Expanded(
            child: ListView.separated(
              itemCount: state.enrolledWorkspaces.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final ws = state.enrolledWorkspaces[index];
                final isActive = ws.tenantKey.toLowerCase() == state.activeWorkspace?.tenantKey.toLowerCase();

                return Tooltip(
                  message: ws.displayName,
                  waitDuration: const Duration(milliseconds: 300),
                  child: InkWell(
                    onTap: () {
                      if (isActive) return;
                      if (!ws.isAuthenticated) {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => WorkspaceLoginScreen(workspace: ws),
                          ),
                        );
                      } else {
                        notifier.switchWorkspace(ws.tenantKey);
                      }
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 6),
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      decoration: BoxDecoration(
                        color: isActive
                            ? (isDark ? AppColors.primary.withAlpha(35) : AppColors.primary.withAlpha(20))
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isActive ? AppColors.primary.withAlpha(100) : Colors.transparent,
                          width: 1.5,
                        ),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Left Active Indicator Pill
                          if (isActive)
                            Positioned(
                              left: 0,
                              child: Container(
                                width: 4.5,
                                height: 34,
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: const BorderRadius.only(
                                    topRight: Radius.circular(4),
                                    bottomRight: Radius.circular(4),
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.primary.withAlpha(180),
                                      blurRadius: 8,
                                      spreadRadius: 1,
                                    ),
                                  ],
                                ),
                              ),
                            ),

                          // Avatar + Subtext
                          Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: isActive ? AppColors.primary : Colors.transparent,
                                    width: isActive ? 2.5 : 1,
                                  ),
                                  boxShadow: isActive
                                      ? [
                                          BoxShadow(
                                            color: AppColors.primary.withAlpha(90),
                                            blurRadius: 10,
                                            offset: const Offset(0, 2),
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Opacity(
                                  opacity: isActive ? 1.0 : 0.85,
                                  child: TenantAvatar(
                                    iconUrl: ws.iconUrl,
                                    logoUrl: ws.logoUrl,
                                    name: ws.displayName,
                                    size: 38,
                                    borderRadius: 12,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 3),
                              if (isActive)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary,
                                    borderRadius: BorderRadius.circular(4),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppColors.primary.withAlpha(100),
                                        blurRadius: 4,
                                      ),
                                    ],
                                  ),
                                  child: const Text(
                                    'ACTIVE',
                                    style: TextStyle(
                                      fontSize: 7.5,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                )
                              else
                                Text(
                                  ws.tenantKey.length > 5 ? ws.tenantKey.substring(0, 5) : ws.tenantKey,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 8,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? AppColors.gray500 : const Color(0xFF94A3B8),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: 12),

          // "+ Add Workspace" Button
          Tooltip(
            message: 'Add Another Organization Workspace',
            child: InkWell(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const WorkspaceEntryScreen()),
                );
              },
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                  ),
                ),
                child: const Icon(
                  Icons.add_rounded,
                  color: AppColors.primary,
                  size: 22,
                ),
              ),
            ),
          ),

          const SizedBox(height: 18),
        ],
      ),
    );
  }
}
