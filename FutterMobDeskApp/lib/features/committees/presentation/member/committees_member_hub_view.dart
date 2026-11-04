import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/workspace.dart';
import '../../models/committee_models.dart';
import '../../state/committees_state.dart';
import '../widgets/committee_info_icon.dart';
import '../widgets/committee_tour_guide_sheet.dart';

/// Personal Member Workspace Hub view (`/committees/workspace/my`).
/// Provides:
/// - Enrolled groups cards with leadership badge and meeting countdown
/// - Pending personal action items checklist
/// - Quick action buttons to Browse & Join Directory and Compose Meeting Reports
class CommitteesMemberHubView extends ConsumerStatefulWidget {
  final Workspace? workspace;
  final ValueChanged<String>? onOpenCommitteeDetail;
  final VoidCallback? onNavigateToDiscover;
  final VoidCallback? onNavigateToComposeReport;

  const CommitteesMemberHubView({
    super.key,
    this.workspace,
    this.onOpenCommitteeDetail,
    this.onNavigateToDiscover,
    this.onNavigateToComposeReport,
  });

  @override
  ConsumerState<CommitteesMemberHubView> createState() => _CommitteesMemberHubViewState();
}

class _CommitteesMemberHubViewState extends ConsumerState<CommitteesMemberHubView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(committeesProvider.notifier).loadMyCommittees();
      _checkTourGuide();
    });
  }

  void _checkTourGuide({bool force = false}) {
    final aliases = ref.read(committeesProvider).aliases;
    CommitteeTourGuideSheet.checkAndShow(
      context,
      screenKey: 'committees_member_hub',
      screenTitle: 'My ${aliases.aliasPlural}',
      steps: [
        TourStep(
          title: 'Your Enrolled Hub',
          description: 'Access all ${aliases.aliasPlural} and sub-units where you have an active seat or leadership role.',
          icon: Icons.groups_outlined,
        ),
        TourStep(
          title: 'Meeting Schedule & Roll-Calls',
          description: 'Keep track of upcoming meetings, locations, and personal attendance performance.',
          icon: Icons.event_available_outlined,
        ),
        TourStep(
          title: 'Action Items & Deliverables',
          description: 'Review assigned tasks and checklist action items agreed upon in past meeting minutes.',
          icon: Icons.checklist_rtl_outlined,
        ),
        TourStep(
          title: 'Shared Cloud Shelf',
          description: 'Collaborate seamlessly on pinned Google Docs, Sheets, and cloud project assets.',
          icon: Icons.cloud_outlined,
        ),
      ],
      force: force,
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(committeesProvider);
    final aliases = state.aliases;
    final isDesktop = MediaQuery.of(context).size.width >= 900;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Row(
          children: [
            Text(
              'My ${aliases.aliasPlural}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
            const SizedBox(width: 8),
            CommitteeInfoIcon(
              title: 'My ${aliases.aliasPlural} Hub',
              purpose: 'Serves as your primary workspace dashboard for all groups and teams you belong to.',
              inputs: 'Enrolled groups are populated automatically upon administrative approval or open self-join.',
              impact: 'Keeps you aligned with team agendas, action items, and shared cloud resources.',
              bestPractices: 'Review pending action items prior to scheduled meetings to maintain high execution rates.',
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline_rounded, color: Color(0xFF0050E5)),
            tooltip: 'Replay Tour Guide',
            onPressed: () => _checkTourGuide(force: true),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () => ref.read(committeesProvider.notifier).loadMyCommittees(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => ref.read(committeesProvider.notifier).loadMyCommittees(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top Actions Banner
                    _buildTopActionsCard(context, aliases, isDesktop),
                    const SizedBox(height: 20),

                    // Upcoming Meetings & Action Items Row
                    if (state.pendingActionItems.isNotEmpty || state.upcomingMeetings.isNotEmpty) ...[
                      if (isDesktop)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(child: _buildUpcomingMeetingsCard(state.upcomingMeetings, aliases)),
                            const SizedBox(width: 16),
                            Expanded(child: _buildPendingActionItemsCard(state.pendingActionItems)),
                          ],
                        )
                      else ...[
                        _buildUpcomingMeetingsCard(state.upcomingMeetings, aliases),
                        const SizedBox(height: 16),
                        _buildPendingActionItemsCard(state.pendingActionItems),
                      ],
                      const SizedBox(height: 24),
                    ],

                    // Section Heading
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Enrolled ${aliases.aliasPlural} (${state.myCommittees.length})',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        if (state.myCommittees.isNotEmpty)
                          TextButton.icon(
                            onPressed: widget.onNavigateToDiscover,
                            icon: const Icon(Icons.search, size: 16),
                            label: Text('Browse All ${aliases.aliasPlural}'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Groups List or Empty State
                    if (state.myCommittees.isEmpty)
                      _buildEmptyState(context, aliases)
                    else
                      LayoutBuilder(
                        builder: (ctx, constraints) {
                          final crossAxisCount = constraints.maxWidth >= 1100
                              ? 3
                              : constraints.maxWidth >= 700
                                  ? 2
                                  : 1;
                          return GridView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: crossAxisCount,
                              crossAxisSpacing: 16,
                              mainAxisSpacing: 16,
                              mainAxisExtent: 210,
                            ),
                            itemCount: state.myCommittees.length,
                            itemBuilder: (_, i) => _buildCommitteeCard(state.myCommittees[i], aliases),
                          );
                        },
                      ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildTopActionsCard(BuildContext context, CommitteeAliases aliases, bool isDesktop) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(5),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF0050E5).withAlpha(20),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.people_alt_rounded, color: Color(0xFF0050E5), size: 30),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Collaborate with Fellow Workspace Members',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                const SizedBox(height: 4),
                Text(
                  'Join new ${aliases.aliasPlural.toLowerCase()}, submit meeting minutes, or view shared cloud documents.',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          if (isDesktop) ...[
            const SizedBox(width: 16),
            OutlinedButton.icon(
              onPressed: widget.onNavigateToDiscover,
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF0050E5),
                side: const BorderSide(color: Color(0xFF0050E5)),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: const Icon(Icons.explore_outlined, size: 16),
              label: Text('Browse & Join ${aliases.aliasPlural}'),
            ),
            const SizedBox(width: 10),
            ElevatedButton.icon(
              onPressed: widget.onNavigateToComposeReport,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0050E5),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: const Icon(Icons.edit_note_rounded, size: 16),
              label: const Text('Compose Report', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildUpcomingMeetingsCard(List<Map<String, dynamic>> upcoming, CommitteeAliases aliases) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.calendar_month_rounded, color: Color(0xFF0050E5), size: 18),
              const SizedBox(width: 8),
              const Text('Upcoming Meetings', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
          const Divider(height: 20),
          if (upcoming.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: Text('No upcoming meetings scheduled.', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
              ),
            )
          else
            ...upcoming.take(3).map((m) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.schedule, size: 16, color: Color(0xFF0050E5)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(m['committeeName']?.toString() ?? 'Meeting', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          Text(m['meetingSchedule']?.toString() ?? 'TBD', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                        ],
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

  Widget _buildPendingActionItemsCard(List<ReportActionItem> items) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.assignment_turned_in_outlined, color: Color(0xFF10B981), size: 18),
              const SizedBox(width: 8),
              const Text('My Action Items', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
          const Divider(height: 20),
          if (items.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: Text('All action items completed!', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
              ),
            )
          else
            ...items.take(3).map((item) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Icon(
                      item.isCompleted ? Icons.check_circle : Icons.radio_button_unchecked,
                      size: 16,
                      color: item.isCompleted ? const Color(0xFF10B981) : Colors.grey,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        item.task,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          decoration: item.isCompleted ? TextDecoration.lineThrough : null,
                          color: item.isCompleted ? Colors.grey : Colors.black87,
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

  Widget _buildCommitteeCard(Committee committee, CommitteeAliases aliases) {
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
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF0050E5).withAlpha(15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  committee.isSubUnit ? aliases.subGroupAliasSingular : aliases.aliasSingular,
                  style: const TextStyle(color: Color(0xFF0050E5), fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withAlpha(20),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('Enrolled', style: TextStyle(color: Color(0xFF059669), fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            committee.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 4),
          Text(
            committee.description ?? 'Collaborate with fellow workspace members.',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const Spacer(),
          const Divider(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.people_outline, size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text('${committee.memberCount} members', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () => widget.onOpenCommitteeDetail?.call(committee.id),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0050E5),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  minimumSize: const Size(0, 32),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.launch_rounded, size: 12),
                label: const Text('Open Hub', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, CommitteeAliases aliases) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.groups_outlined, size: 40, color: Colors.grey),
          ),
          const SizedBox(height: 16),
          Text(
            'You are not enrolled in any ${aliases.aliasPlural.toLowerCase()} yet.',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'Explore the open directory to discover and join groups matching your skills.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: widget.onNavigateToDiscover,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0050E5),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.search, size: 16),
            label: Text('Browse & Join ${aliases.aliasPlural}', style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

