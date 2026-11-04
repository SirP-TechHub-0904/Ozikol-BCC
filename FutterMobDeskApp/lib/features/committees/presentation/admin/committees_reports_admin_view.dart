import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/workspace.dart';
import '../../models/committee_models.dart';
import '../../services/committees_api_service.dart';
import '../../state/committees_state.dart';
import '../widgets/committee_info_icon.dart';
import '../widgets/committee_tour_guide_sheet.dart';

/// Meeting Reports Oversight & AI Digest view (`/committees/console/reports`).
class CommitteesReportsAdminView extends ConsumerStatefulWidget {
  final Workspace? workspace;

  const CommitteesReportsAdminView({super.key, this.workspace});

  @override
  ConsumerState<CommitteesReportsAdminView> createState() => _CommitteesReportsAdminViewState();
}

class _CommitteesReportsAdminViewState extends ConsumerState<CommitteesReportsAdminView> {
  String? _generatingDigestReportId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(committeesProvider.notifier).loadReports();
      _checkTourGuide();
    });
  }

  void _checkTourGuide({bool force = false}) {
    CommitteeTourGuideSheet.checkAndShow(
      context,
      screenKey: 'committees_reports_admin',
      screenTitle: 'Meeting Minutes & AI Digest',
      steps: [
        TourStep(
          title: 'Minutes Oversight',
          description: 'Review formal minutes and discussions submitted by group secretaries and chairs.',
          icon: Icons.description_outlined,
        ),
        TourStep(
          title: 'Ozi AI Executive Digest',
          description: 'Synthesize verbose meeting discussions into 1-minute leadership briefs.',
          icon: Icons.auto_awesome_rounded,
        ),
      ],
      force: force,
    );
  }

  Future<void> _generateAiDigest(CommitteeReport report) async {
    setState(() => _generatingDigestReportId = report.id);
    try {
      final api = ref.read(committeesApiServiceProvider);
      final digest = await api.generateAiDigest(report.id);
      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Row(
              children: [
                const Icon(Icons.auto_awesome, color: Color(0xFF0050E5), size: 22),
                const SizedBox(width: 8),
                const Text('Ozi AI Executive Digest', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
            content: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 500),
              child: SingleChildScrollView(
                child: Text(digest, style: const TextStyle(fontSize: 14, height: 1.5)),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Close')),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to generate AI digest: $e')));
      }
    } finally {
      if (mounted) setState(() => _generatingDigestReportId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(committeesProvider);
    final reports = state.reports;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Meeting Minutes Oversight', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(width: 8),
            CommitteeInfoIcon(
              title: 'Reports & Minutes Management',
              purpose: 'Maintains archival records of all committee meetings and resolutions.',
              inputs: 'Examine attendance roll-call, decisions, and action item task lists.',
              impact: 'Powers workspace AI digests and leadership executive reporting.',
              bestPractices: 'Run AI digests for rapid executive briefing before board review meetings.',
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
            onPressed: () => ref.read(committeesProvider.notifier).loadReports(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : reports.isEmpty
              ? Center(child: Text('No meeting reports filed yet.', style: TextStyle(color: Colors.grey.shade600)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: reports.length,
                  itemBuilder: (_, i) {
                    final r = reports[i];
                    final isAiGenerating = _generatingDigestReportId == r.id;

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
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(r.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                      Text('${r.committeeName ?? "Group"} • ${r.meetingDate.toLocal().toString().split(' ')[0]}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                                    ],
                                  ),
                                ),
                                ElevatedButton.icon(
                                  onPressed: isAiGenerating ? null : () => _generateAiDigest(r),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF0050E5).withAlpha(20),
                                    foregroundColor: const Color(0xFF0050E5),
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  icon: isAiGenerating
                                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                                      : const Icon(Icons.auto_awesome, size: 16),
                                  label: const Text('Ozi AI Digest', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                            if (r.executiveSummary != null && r.executiveSummary!.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Text(r.executiveSummary!, style: const TextStyle(fontSize: 13, height: 1.4)),
                            ],
                            const Divider(height: 20),
                            Row(
                              children: [
                                _buildBadge('Present: ${r.presentCount}', Colors.green),
                                const SizedBox(width: 8),
                                _buildBadge('Excused: ${r.excusedCount}', Colors.amber),
                                const SizedBox(width: 8),
                                _buildBadge('Absent: ${r.absentCount}', Colors.red),
                                const Spacer(),
                                if (r.actionItems.isNotEmpty)
                                  Text('${r.actionItems.length} Actions', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }

  Widget _buildBadge(String text, MaterialColor color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: color.shade50, borderRadius: BorderRadius.circular(4)),
      child: Text(text, style: TextStyle(color: color.shade700, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}

