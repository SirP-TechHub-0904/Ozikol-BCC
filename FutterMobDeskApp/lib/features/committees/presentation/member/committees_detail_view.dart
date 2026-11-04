import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/models/workspace.dart';
import '../../models/committee_models.dart';
import '../../services/committees_api_service.dart';
import '../../state/committees_state.dart';
import '../widgets/committee_cloud_shelf_dialog.dart';
import '../widgets/committee_info_icon.dart';

/// 360-degree Group Command Hub (`/committees/workspace/view/:id`).
class CommitteesDetailView extends ConsumerStatefulWidget {
  final String committeeId;
  final Workspace? workspace;
  final VoidCallback? onNavigateBack;
  final VoidCallback? onComposeReport;

  const CommitteesDetailView({
    super.key,
    required this.committeeId,
    this.workspace,
    this.onNavigateBack,
    this.onComposeReport,
  });

  @override
  ConsumerState<CommitteesDetailView> createState() => _CommitteesDetailViewState();
}

class _CommitteesDetailViewState extends ConsumerState<CommitteesDetailView> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Committee? _committee;
  List<CommitteeReport> _reports = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final api = ref.read(committeesApiServiceProvider);
      final details = await api.getCommitteeDetails(widget.committeeId);
      final reports = await api.getReports(committeeId: widget.committeeId);
      if (mounted) {
        setState(() {
          _committee = details;
          _reports = reports;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _pinCloudDocument(Map<String, dynamic> payload) async {
    final api = ref.read(committeesApiServiceProvider);
    await api.linkCloudDocument(payload);
    await _loadData();
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(committeesProvider);
    final aliases = state.aliases;

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Loading Hub...')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_committee == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Group Not Found')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              const Text('Could not load group details.'),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: widget.onNavigateBack, child: const Text('Go Back')),
            ],
          ),
        ),
      );
    }

    final c = _committee!;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: widget.onNavigateBack,
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                c.name,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ),
            const SizedBox(width: 8),
            CommitteeInfoIcon(
              title: '${c.name} Hub',
              purpose: 'Serves as the collaborative home for this team roster, sub-units, minutes, and cloud assets.',
              inputs: 'Authorized leaders can pin documents, file reports, and manage sub-units.',
              impact: 'All enrolled members receive real-time notifications on new minutes and pinned files.',
              bestPractices: 'Keep cloud document permissions set to Anyone with Link or Workspace Domain to avoid access blocks.',
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: _loadData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF0050E5),
          unselectedLabelColor: Colors.grey.shade600,
          indicatorColor: const Color(0xFF0050E5),
          indicatorWeight: 3,
          isScrollable: true,
          tabs: [
            Tab(icon: const Icon(Icons.people_outline, size: 18), text: 'Roster & Roles (${c.members.length})'),
            Tab(icon: const Icon(Icons.account_tree_outlined, size: 18), text: '${aliases.subGroupAliasPlural} (${c.subCommittees.length})'),
            Tab(icon: const Icon(Icons.description_outlined, size: 18), text: 'Meeting Reports (${_reports.length})'),
            Tab(icon: const Icon(Icons.cloud_outlined, size: 18), text: 'Cloud Shelf (${c.cloudDocuments.length})'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildRosterTab(c, aliases),
          _buildSubUnitsTab(c, aliases),
          _buildReportsTab(c),
          _buildCloudShelfTab(c),
        ],
      ),
      floatingActionButton: _tabController.index == 2
          ? FloatingActionButton.extended(
              onPressed: widget.onComposeReport,
              backgroundColor: const Color(0xFF0050E5),
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: const Text('Compose Report', style: TextStyle(fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }

  Widget _buildRosterTab(Committee c, CommitteeAliases aliases) {
    if (c.members.isEmpty) {
      return Center(
        child: Text('No members enrolled yet.', style: TextStyle(color: Colors.grey.shade600)),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: c.members.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (_, i) {
        final m = c.members[i];
        return ListTile(
          tileColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          leading: CircleAvatar(
            backgroundColor: const Color(0xFF0050E5).withAlpha(20),
            foregroundColor: const Color(0xFF0050E5),
            child: Text(m.fullName.isNotEmpty ? m.fullName[0].toUpperCase() : 'M'),
          ),
          title: Row(
            children: [
              Text(m.fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(width: 8),
              if (m.isLeader)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0050E5),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    m.customRoleTitle ?? m.role,
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
            ],
          ),
          subtitle: Text(m.email ?? 'Workspace member', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        );
      },
    );
  }

  Widget _buildSubUnitsTab(Committee c, CommitteeAliases aliases) {
    if (c.subCommittees.isEmpty) {
      return Center(
        child: Text('No ${aliases.subGroupAliasPlural.toLowerCase()} formed under this group.', style: TextStyle(color: Colors.grey.shade600)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: c.subCommittees.length,
      itemBuilder: (_, i) {
        final sub = c.subCommittees[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: const Icon(Icons.subdirectory_arrow_right_rounded, color: Color(0xFF0050E5)),
            title: Text(sub.name, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('${sub.memberCount} members', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => CommitteesDetailView(
                    committeeId: sub.id,
                    workspace: widget.workspace,
                    onNavigateBack: () => Navigator.of(context).pop(),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildReportsTab(Committee c) {
    if (_reports.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.description_outlined, size: 48, color: Colors.grey),
            const SizedBox(height: 12),
            Text('No meeting reports filed yet.', style: TextStyle(color: Colors.grey.shade600)),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: widget.onComposeReport,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0050E5),
                foregroundColor: Colors.white,
              ),
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Compose First Report'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _reports.length,
      itemBuilder: (_, i) {
        final r = _reports[i];
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
                    Text(
                      r.title,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: r.reviewStatus == 'Reviewed' ? Colors.green.shade50 : Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        r.reviewStatus,
                        style: TextStyle(
                          color: r.reviewStatus == 'Reviewed' ? Colors.green.shade700 : const Color(0xFF0050E5),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Meeting Date: ${r.meetingDate.toLocal().toString().split(' ')[0]}',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                if (r.executiveSummary != null && r.executiveSummary!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(r.executiveSummary!, style: const TextStyle(fontSize: 13, height: 1.4)),
                ],
                const Divider(height: 20),
                Row(
                  children: [
                    _buildPill('Present: ${r.presentCount}', Colors.green),
                    const SizedBox(width: 8),
                    _buildPill('Excused: ${r.excusedCount}', Colors.amber),
                    const SizedBox(width: 8),
                    _buildPill('Absent: ${r.absentCount}', Colors.red),
                    const Spacer(),
                    if (r.actionItems.isNotEmpty)
                      Text('${r.actionItems.length} Action Items', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCloudShelfTab(Committee c) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Shared Google Docs & Cloud Shelf', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ElevatedButton.icon(
                onPressed: () => CommitteeCloudShelfDialog.show(
                  context,
                  committeeId: c.id,
                  onPin: _pinCloudDocument,
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0050E5),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.add_link, size: 16),
                label: const Text('Pin Document'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (c.cloudDocuments.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.cloud_off_outlined, size: 48, color: Colors.grey),
                    const SizedBox(height: 12),
                    Text('No documents pinned to this shelf yet.', style: TextStyle(color: Colors.grey.shade600)),
                    const SizedBox(height: 6),
                    Text('Pin spreadsheets, agendas, slides, or notebook links for your team.', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                itemCount: c.cloudDocuments.length,
                itemBuilder: (_, i) {
                  final doc = c.cloudDocuments[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: ListTile(
                      leading: Icon(_getProviderIcon(doc.provider), color: _getProviderColor(doc.provider), size: 28),
                      title: Text(doc.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: Text(doc.url, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                      trailing: IconButton(
                        icon: const Icon(Icons.open_in_new_rounded, color: Color(0xFF0050E5)),
                        tooltip: 'Open in Browser',
                        onPressed: () => _openUrl(doc.url),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPill(String label, MaterialColor color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: color.shade50, borderRadius: BorderRadius.circular(4)),
      child: Text(label, style: TextStyle(color: color.shade700, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }

  IconData _getProviderIcon(String provider) {
    switch (provider) {
      case 'google_sheets':
        return Icons.table_chart_rounded;
      case 'google_slides':
        return Icons.slideshow_rounded;
      case 'notebook_lm':
        return Icons.auto_stories_rounded;
      case 'excel_online':
        return Icons.grid_on_rounded;
      case 'google_docs':
      default:
        return Icons.description_rounded;
    }
  }

  Color _getProviderColor(String provider) {
    switch (provider) {
      case 'google_sheets':
        return const Color(0xFF0F9D58);
      case 'google_slides':
        return const Color(0xFFF4B400);
      case 'notebook_lm':
        return const Color(0xFF8E24AA);
      case 'excel_online':
        return const Color(0xFF107C41);
      case 'google_docs':
      default:
        return const Color(0xFF4285F4);
    }
  }
}

