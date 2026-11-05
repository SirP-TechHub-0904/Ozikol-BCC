import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/workspace.dart';
import '../../models/committee_models.dart';
import '../../state/committees_state.dart';
import '../widgets/committee_info_icon.dart';
import '../widgets/committee_tour_guide_sheet.dart';

/// Intake Registrations Console view (`/committees/console/registrations`).
class CommitteesRegistrationsView extends ConsumerStatefulWidget {
  final Workspace? workspace;

  const CommitteesRegistrationsView({super.key, this.workspace});

  @override
  ConsumerState<CommitteesRegistrationsView> createState() => _CommitteesRegistrationsViewState();
}

class _CommitteesRegistrationsViewState extends ConsumerState<CommitteesRegistrationsView> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(committeesProvider.notifier).loadRegistrations();
      _checkTourGuide();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _checkTourGuide({bool force = false}) {
    CommitteeTourGuideSheet.checkAndShow(
      context,
      screenKey: 'committees_registrations',
      screenTitle: 'Intake Registrations Review',
      steps: [
        TourStep(
          title: 'Applicant Intake Pipeline',
          description: 'Review prospective member submissions from internal discover or public registration landing pages.',
          icon: Icons.how_to_reg_outlined,
        ),
        TourStep(
          title: '1-Click Member Provisioning',
          description: 'Approving an applicant auto-provisions their member account and adds them directly to the roster.',
          icon: Icons.verified_user_outlined,
        ),
      ],
      force: force,
    );
  }

  void _showAnswersDialog(CommitteeRegistration reg) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${reg.fullName} — Answers', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Email: ${reg.email}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                if (reg.phone != null) Text('Phone: ${reg.phone}', style: const TextStyle(fontSize: 13)),
                const Divider(height: 20),
                if (reg.extraInfoResponses.isEmpty)
                  const Text('No extra-info questionnaire questions answered.')
                else
                  ...reg.extraInfoResponses.entries.map((e) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(e.key, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0050E5))),
                          const SizedBox(height: 2),
                          Text(e.value?.toString() ?? 'None', style: const TextStyle(fontSize: 13)),
                        ],
                      ),
                    );
                  }),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Close')),
        ],
      ),
    );
  }

  Future<void> _handleDecision(CommitteeRegistration reg, String decision) async {
    final success = await ref.read(committeesProvider.notifier).reviewRegistration(
          reg.id,
          decision: decision,
        );
    if (mounted && success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(decision == 'Approve' ? 'Applicant approved & provisioned!' : 'Registration marked rejected.'),
          backgroundColor: decision == 'Approve' ? const Color(0xFF059669) : Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(committeesProvider);
    final registrations = state.registrations;

    final pending = registrations.where((r) => r.status.toLowerCase() == 'pending').toList();
    final approved = registrations.where((r) => r.status.toLowerCase() == 'approved').toList();
    final rejected = registrations.where((r) => r.status.toLowerCase() == 'rejected').toList();

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Intake Registrations', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(width: 8),
            CommitteeInfoIcon(
              title: 'Intake Pipeline',
              purpose: 'Review and qualify candidates applying to join restricted or public groups.',
              inputs: 'Examine candidate qualifications, contact details, and custom questionnaire answers.',
              impact: 'Approval creates user account credentials if external, and assigns them to the roster.',
              bestPractices: 'Review pending applications regularly to keep onboarding smooth.',
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
            onPressed: () => ref.read(committeesProvider.notifier).loadRegistrations(),
          ),
          const SizedBox(width: 8),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF0050E5),
          indicatorColor: const Color(0xFF0050E5),
          tabs: [
            Tab(text: 'Pending (${pending.length})'),
            Tab(text: 'Approved (${approved.length})'),
            Tab(text: 'Rejected (${rejected.length})'),
          ],
        ),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildList(pending, isPending: true),
                _buildList(approved),
                _buildList(rejected),
              ],
            ),
    );
  }

  Widget _buildList(List<CommitteeRegistration> items, {bool isPending = false}) {
    if (items.isEmpty) {
      return Center(child: Text('No registrations in this category.', style: TextStyle(color: Colors.grey.shade600)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (_, i) {
        final r = items[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(r.fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    OutlinedButton(
                      onPressed: () => _showAnswersDialog(r),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 30),
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                      ),
                      child: const Text('View Answers', style: TextStyle(fontSize: 11)),
                    ),
                  ],
                ),
                Text(r.email, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                if (r.committeeName != null) ...[
                  const SizedBox(height: 4),
                  Text('Applied For: ${r.committeeName}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0050E5))),
                ],
                if (isPending) ...[
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      OutlinedButton(
                        onPressed: () => _handleDecision(r, 'Reject'),
                        style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red)),
                        child: const Text('Reject'),
                      ),
                      const SizedBox(width: 10),
                      ElevatedButton(
                        onPressed: () => _handleDecision(r, 'Approve'),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0050E5), foregroundColor: Colors.white),
                        child: const Text('Approve & Enroll'),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

