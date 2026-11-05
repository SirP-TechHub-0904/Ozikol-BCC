import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/workspace.dart';
import '../../state/committees_state.dart';
import '../widgets/committee_info_icon.dart';
import '../widgets/committee_tour_guide_sheet.dart';

/// Administrator Overview Dashboard for bcp-committees (`/committees/console/dashboard`).
class CommitteesAdminDashboardView extends ConsumerStatefulWidget {
  final Workspace? workspace;
  final ValueChanged<int>? onNavigateToTab;

  const CommitteesAdminDashboardView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
  });

  @override
  ConsumerState<CommitteesAdminDashboardView> createState() => _CommitteesAdminDashboardViewState();
}

class _CommitteesAdminDashboardViewState extends ConsumerState<CommitteesAdminDashboardView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(committeesProvider.notifier).loadDashboard();
      _checkTourGuide();
    });
  }

  void _checkTourGuide({bool force = false}) {
    final aliases = ref.read(committeesProvider).aliases;
    CommitteeTourGuideSheet.checkAndShow(
      context,
      screenKey: 'committees_admin_dashboard',
      screenTitle: '${aliases.aliasPlural} Console Dashboard',
      steps: [
        TourStep(
          title: 'Executive KPIs',
          description: 'Monitor active ${aliases.aliasPlural.toLowerCase()}, sub-units, total enrolled members, and roll-call health.',
          icon: Icons.dashboard_customize_outlined,
        ),
        TourStep(
          title: 'Intake Pipeline',
          description: 'Keep track of pending membership registrations submitted via internal portals or external QR landing pages.',
          icon: Icons.how_to_reg_outlined,
        ),
        TourStep(
          title: 'Meeting Attendance Health',
          description: 'Ensure operational units maintain high attendance and timely minutes filings.',
          icon: Icons.insights_outlined,
        ),
      ],
      force: force,
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(committeesProvider);
    final aliases = state.aliases;
    final metrics = state.dashboardMetrics;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Row(
          children: [
            Text('${aliases.aliasPlural} Overview', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(width: 8),
            CommitteeInfoIcon(
              title: '${aliases.aliasPlural} Dashboard Overview',
              purpose: 'Provides executive-level oversight into group structures, meeting velocity, and applicant intake.',
              inputs: 'Data reflects live metrics aggregated across all active groups and sub-units.',
              impact: 'Helps leaders spot underperforming groups and bottlenecks in registration reviews.',
              bestPractices: 'Review pending intake registrations weekly to keep membership friction minimal.',
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline_rounded, color: Color(0xFF0050E5)),
            onPressed: () => _checkTourGuide(force: true),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.read(committeesProvider.notifier).loadDashboard(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => ref.read(committeesProvider.notifier).loadDashboard(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top Metric Cards Grid
                    LayoutBuilder(
                      builder: (ctx, constraints) {
                        final crossAxisCount = constraints.maxWidth >= 1000
                            ? 4
                            : constraints.maxWidth >= 600
                                ? 2
                                : 1;
                        return GridView.count(
                          crossAxisCount: crossAxisCount,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisSpacing: 14,
                          mainAxisSpacing: 14,
                          childAspectRatio: 1.8,
                          children: [
                            _buildKpiCard(
                              'Active ${aliases.aliasPlural}',
                              '${metrics.activeCommitteesCount}',
                              Icons.groups_rounded,
                              const Color(0xFF0050E5),
                            ),
                            _buildKpiCard(
                              'Active ${aliases.subGroupAliasPlural}',
                              '${metrics.activeSubUnitsCount}',
                              Icons.account_tree_rounded,
                              const Color(0xFF0284C7),
                            ),
                            _buildKpiCard(
                              'Enrolled Members',
                              '${metrics.totalEnrolledMembers}',
                              Icons.badge_rounded,
                              const Color(0xFF10B981),
                            ),
                            _buildKpiCard(
                              'Roll-Call Health',
                              '${(metrics.averageAttendanceRate * 100).toStringAsFixed(0)}%',
                              Icons.fact_check_rounded,
                              const Color(0xFFF59E0B),
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 24),

                    // Quick Nav Navigation Shortcuts
                    const Text('Management Shortcuts', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 12),
                    LayoutBuilder(
                      builder: (ctx, constraints) {
                        final crossAxisCount = constraints.maxWidth >= 900 ? 3 : 1;
                        return GridView.count(
                          crossAxisCount: crossAxisCount,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 2.8,
                          children: [
                            _buildShortcutCard(
                              'Manage ${aliases.aliasPlural}',
                              'Add, configure and appoint leaders',
                              Icons.settings_outlined,
                              () => widget.onNavigateToTab?.call(1),
                            ),
                            _buildShortcutCard(
                              'Intake Registrations',
                              '${metrics.pendingRegistrationsCount} pending review',
                              Icons.assignment_ind_outlined,
                              () => widget.onNavigateToTab?.call(2),
                              badge: metrics.pendingRegistrationsCount > 0 ? '${metrics.pendingRegistrationsCount} New' : null,
                            ),
                            _buildShortcutCard(
                              'Meeting Minutes & AI',
                              'Minutes review and executive AI digest',
                              Icons.auto_stories_outlined,
                              () => widget.onNavigateToTab?.call(3),
                            ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildKpiCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(color: Colors.black.withAlpha(4), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(8)),
                child: Icon(icon, color: color, size: 20),
              ),
            ],
          ),
          Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildShortcutCard(String title, String subtitle, IconData icon, VoidCallback onTap, {String? badge}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: const Color(0xFF0050E5).withAlpha(15), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: const Color(0xFF0050E5), size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    children: [
                      Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      if (badge != null) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: Colors.orange, borderRadius: BorderRadius.circular(4)),
                          child: Text(badge, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.grey, size: 18),
          ],
        ),
      ),
    );
  }
}

