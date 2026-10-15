import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/tenant_avatar.dart';
import '../state/workspace_state.dart';
import 'workspace_entry_screen.dart';

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
                  message: '${ws.displayName}\n(${ws.primaryDomain})',
                  waitDuration: const Duration(milliseconds: 300),
                  child: InkWell(
                    onTap: () => notifier.switchWorkspace(ws.tenantKey),
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      height: 54,
                      alignment: Alignment.center,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Left Active Indicator Pill
                          if (isActive)
                            Positioned(
                              left: 0,
                              child: Container(
                                width: 4,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: const BorderRadius.only(
                                    topRight: Radius.circular(4),
                                    bottomRight: Radius.circular(4),
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.primary.withAlpha(120),
                                      blurRadius: 8,
                                    ),
                                  ],
                                ),
                              ),
                            ),

                          // Workspace Avatar with active highlight border
                          Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isActive ? AppColors.primary : Colors.transparent,
                                width: 2,
                              ),
                            ),
                            child: TenantAvatar(
                              logoUrl: ws.logoUrl,
                              name: ws.displayName,
                              size: 44,
                              borderRadius: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          const Divider(height: 1, indent: 14, endIndent: 14),
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
