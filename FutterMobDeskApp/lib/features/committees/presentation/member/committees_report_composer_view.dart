import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/workspace.dart';
import '../../models/committee_models.dart';
import '../../services/committees_api_service.dart';
import '../../state/committees_state.dart';
import '../widgets/committee_info_icon.dart';
import '../widgets/committee_tour_guide_sheet.dart';

/// Multi-Modal Meeting Report Composer (`/committees/workspace/reports/compose`).
class CommitteesReportComposerView extends ConsumerStatefulWidget {
  final Workspace? workspace;
  final String? initialCommitteeId;
  final VoidCallback? onNavigateBack;

  const CommitteesReportComposerView({
    super.key,
    this.workspace,
    this.initialCommitteeId,
    this.onNavigateBack,
  });

  @override
  ConsumerState<CommitteesReportComposerView> createState() => _CommitteesReportComposerViewState();
}

class _CommitteesReportComposerViewState extends ConsumerState<CommitteesReportComposerView> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _titleCtrl = TextEditingController();
  final TextEditingController _summaryCtrl = TextEditingController();
  final TextEditingController _minutesCtrl = TextEditingController();
  final TextEditingController _decisionsCtrl = TextEditingController();

  String? _selectedCommitteeId;
  DateTime _meetingDate = DateTime.now();
  bool _isSubmitting = false;

  // Roll-Call state: MemberId -> 'present' | 'excused' | 'absent'
  final Map<String, String> _rollCall = {};

  // Action items
  final List<Map<String, dynamic>> _actionItems = [];
  final TextEditingController _newActionItemCtrl = TextEditingController();

  // Cloud links
  final List<Map<String, dynamic>> _cloudLinks = [];
  final TextEditingController _newCloudTitleCtrl = TextEditingController();
  final TextEditingController _newCloudUrlCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _selectedCommitteeId = widget.initialCommitteeId;

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final notif = ref.read(committeesProvider.notifier);
      await notif.loadMyCommittees();
      await notif.loadManagedCommittees();

      final state = ref.read(committeesProvider);
      final allAvailable = [...state.myCommittees, ...state.managedCommittees];
      if (_selectedCommitteeId == null && allAvailable.isNotEmpty) {
        setState(() {
          _selectedCommitteeId = allAvailable.first.id;
          _populateRollCall(allAvailable.first);
        });
      } else if (_selectedCommitteeId != null) {
        final match = allAvailable.where((c) => c.id == _selectedCommitteeId).firstOrNull;
        if (match != null) _populateRollCall(match);
      }
      _checkTourGuide();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _titleCtrl.dispose();
    _summaryCtrl.dispose();
    _minutesCtrl.dispose();
    _decisionsCtrl.dispose();
    _newActionItemCtrl.dispose();
    _newCloudTitleCtrl.dispose();
    _newCloudUrlCtrl.dispose();
    super.dispose();
  }

  void _checkTourGuide({bool force = false}) {
    CommitteeTourGuideSheet.checkAndShow(
      context,
      screenKey: 'committees_compose_report',
      screenTitle: 'Meeting Report Composer',
      steps: [
        TourStep(
          title: '3-in-1 Report Composer',
          description: 'Type rich meeting notes, attach documents, or connect live Google Docs & Sheets.',
          icon: Icons.edit_note_rounded,
        ),
        TourStep(
          title: '1-Tap Attendance Roll-Call',
          description: 'Tap chips to toggle member status between Present, Excused, and Absent.',
          icon: Icons.how_to_reg_rounded,
        ),
        TourStep(
          title: 'Action Item Tracker',
          description: 'Assign follow-up deliverables and deadlines to guarantee accountability.',
          icon: Icons.playlist_add_check_rounded,
        ),
      ],
      force: force,
    );
  }

  void _populateRollCall(Committee committee) {
    _rollCall.clear();
    for (final m in committee.members) {
      _rollCall[m.userProfileId] = 'present';
    }
  }

  void _addActionItem() {
    final task = _newActionItemCtrl.text.trim();
    if (task.isEmpty) return;
    setState(() {
      _actionItems.add({'task': task, 'isCompleted': false});
      _newActionItemCtrl.clear();
    });
  }

  void _addCloudLink() {
    final title = _newCloudTitleCtrl.text.trim();
    final url = _newCloudUrlCtrl.text.trim();
    if (title.isEmpty || url.isEmpty) return;

    setState(() {
      _cloudLinks.add({
        'title': title,
        'url': url,
        'provider': PinnedCloudResource.detectProvider(null, url),
      });
      _newCloudTitleCtrl.clear();
      _newCloudUrlCtrl.clear();
    });
  }

  Future<void> _handleSubmit() async {
    if (_selectedCommitteeId == null || _selectedCommitteeId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a group.')));
      return;
    }
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a meeting title.')));
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final rollCallList = _rollCall.entries
          .map((e) => {'memberId': e.key, 'status': e.value})
          .toList();

      final payload = {
        'committeeId': _selectedCommitteeId,
        'title': title,
        'meetingDate': _meetingDate.toIso8601String(),
        'executiveSummary': _summaryCtrl.text.trim(),
        'minutes': _minutesCtrl.text.trim(),
        'decisions': _decisionsCtrl.text.trim(),
        'actionItems': _actionItems,
        'attendanceRollCall': rollCallList,
        'pinnedResources': _cloudLinks,
      };

      final api = ref.read(committeesApiServiceProvider);
      await api.submitReport(payload);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Meeting report submitted successfully!'),
            backgroundColor: Color(0xFF059669),
          ),
        );
        widget.onNavigateBack?.call();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error submitting report: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(committeesProvider);
    final aliases = state.aliases;

    final allAvailable = <Committee>[];
    final seen = <String>{};
    for (final c in [...state.myCommittees, ...state.managedCommittees]) {
      if (!seen.contains(c.id)) {
        seen.add(c.id);
        allAvailable.add(c);
      }
    }

    final selectedCommittee = allAvailable.where((c) => c.id == _selectedCommitteeId).firstOrNull;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: widget.onNavigateBack),
        title: Row(
          children: [
            const Text('Compose Meeting Report', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(width: 8),
            CommitteeInfoIcon(
              title: 'Meeting Report Guidelines',
              purpose: 'Records formal minutes, decisions, roll-call attendance, and assigned tasks.',
              inputs: 'Choose a group, enter executive summary, agenda discussion notes, and tag attendance.',
              impact: 'Once submitted, enrolled members can inspect minutes and run Ozi AI digest summaries.',
              bestPractices: 'Assign an action item with a responsible person for every decision taken.',
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline_rounded, color: Color(0xFF0050E5)),
            onPressed: () => _checkTourGuide(force: true),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Group, Title, Date Form Row
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Group selector
                  Text('Select ${aliases.aliasSingular} *', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    value: _selectedCommitteeId,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    items: allAvailable.map((c) {
                      return DropdownMenuItem(
                        value: c.id,
                        child: Text(c.name, overflow: TextOverflow.ellipsis),
                      );
                    }).toList(),
                    onChanged: (val) {
                      setState(() {
                        _selectedCommitteeId = val;
                        final match = allAvailable.where((c) => c.id == val).firstOrNull;
                        if (match != null) _populateRollCall(match);
                      });
                    },
                  ),
                  const SizedBox(height: 14),

                  // Meeting Title
                  const Text('Meeting / Report Title *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _titleCtrl,
                    decoration: InputDecoration(
                      hintText: 'e.g. Monthly Strategy & Operations Review',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Executive Summary
                  const Text('Executive Summary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _summaryCtrl,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'Brief 1-2 sentence overview of key outcomes...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Tab bar for Modes
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: TabBar(
                controller: _tabController,
                labelColor: const Color(0xFF0050E5),
                unselectedLabelColor: Colors.grey.shade600,
                indicatorColor: const Color(0xFF0050E5),
                tabs: [
                  const Tab(icon: Icon(Icons.edit_note, size: 18), text: 'Minutes & Roll-Call'),
                  Tab(icon: const Icon(Icons.playlist_add_check, size: 18), text: 'Action Items (${_actionItems.length})'),
                  Tab(icon: const Icon(Icons.link, size: 18), text: 'Cloud Shelf (${_cloudLinks.length})'),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Tab View Area
            ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 280),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: [
                  _buildMinutesAndRollCallTab(selectedCommittee),
                  _buildActionItemsTab(),
                  _buildCloudShelfTab(),
                ][_tabController.index],
              ),
            ),
            const SizedBox(height: 24),

            // Submit Button
            ElevatedButton.icon(
              onPressed: _isSubmitting ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0050E5),
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(50),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: _isSubmitting
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.send_rounded, size: 18),
              label: Text(_isSubmitting ? 'Submitting Report...' : 'Submit Meeting Report', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMinutesAndRollCallTab(Committee? committee) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Meeting Minutes & Discussion Notes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        const SizedBox(height: 6),
        TextField(
          controller: _minutesCtrl,
          maxLines: 5,
          decoration: InputDecoration(
            hintText: 'Type agenda discussions, progress updates, and detailed meeting notes...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        const SizedBox(height: 16),
        const Text('Key Decisions & Resolutions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        const SizedBox(height: 6),
        TextField(
          controller: _decisionsCtrl,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Record formal resolutions or approved items...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        const SizedBox(height: 20),

        // Roll-Call Attendance Grid
        const Text('1-Tap Attendance Roll-Call', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 4),
        Text('Tap status to toggle member attendance.', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        const SizedBox(height: 12),
        if (committee == null || committee.members.isEmpty)
          Text('Select a group above to populate its roster roll-call.', style: TextStyle(fontSize: 12, color: Colors.grey.shade500))
        else
          ...committee.members.map((m) {
            final currentStatus = _rollCall[m.userProfileId] ?? 'present';
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  CircleAvatar(radius: 12, child: Text(m.fullName[0])),
                  const SizedBox(width: 10),
                  Expanded(child: Text(m.fullName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
                  _buildRollCallChip(m.userProfileId, 'present', 'Present', Colors.green, currentStatus),
                  const SizedBox(width: 6),
                  _buildRollCallChip(m.userProfileId, 'excused', 'Excused', Colors.amber, currentStatus),
                  const SizedBox(width: 6),
                  _buildRollCallChip(m.userProfileId, 'absent', 'Absent', Colors.red, currentStatus),
                ],
              ),
            );
          }),
      ],
    );
  }

  Widget _buildRollCallChip(String memberId, String status, String label, MaterialColor color, String current) {
    final isSelected = current.toLowerCase() == status;
    return InkWell(
      onTap: () => setState(() => _rollCall[memberId] = status),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? color : color.shade50,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : color.shade700,
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildActionItemsTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _newActionItemCtrl,
                decoration: InputDecoration(
                  hintText: 'Enter action item or task...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              onPressed: _addActionItem,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0050E5),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Add Task'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (_actionItems.isEmpty)
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text('No action items added yet.', style: TextStyle(color: Colors.grey.shade500)),
            ),
          )
        else
          ..._actionItems.asMap().entries.map((entry) {
            final idx = entry.key;
            final item = entry.value;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: const Icon(Icons.assignment_outlined, color: Color(0xFF0050E5)),
                title: Text(item['task'].toString(), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red, size: 18),
                  onPressed: () => setState(() => _actionItems.removeAt(idx)),
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildCloudShelfTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _newCloudTitleCtrl,
          decoration: InputDecoration(
            hintText: 'Document title (e.g. Budget Spreadsheet)',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _newCloudUrlCtrl,
                decoration: InputDecoration(
                  hintText: 'https://docs.google.com/...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              onPressed: _addCloudLink,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0050E5),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Pin Link'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (_cloudLinks.isEmpty)
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text('No cloud documents connected to this report yet.', style: TextStyle(color: Colors.grey.shade500)),
            ),
          )
        else
          ..._cloudLinks.asMap().entries.map((entry) {
            final idx = entry.key;
            final link = entry.value;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: const Icon(Icons.link, color: Color(0xFF0050E5)),
                title: Text(link['title'].toString(), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                subtitle: Text(link['url'].toString(), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11)),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red, size: 18),
                  onPressed: () => setState(() => _cloudLinks.removeAt(idx)),
                ),
              ),
            );
          }),
      ],
    );
  }
}

