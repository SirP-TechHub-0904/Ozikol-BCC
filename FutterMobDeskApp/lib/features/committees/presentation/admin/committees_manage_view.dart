import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/workspace.dart';
import '../../models/committee_models.dart';
import '../../state/committees_state.dart';
import '../widgets/committee_info_icon.dart';
import '../widgets/committee_tour_guide_sheet.dart';

/// Manage Committees Console view (`/committees/console/manage`).
class CommitteesManageView extends ConsumerStatefulWidget {
  final Workspace? workspace;
  final ValueChanged<String>? onOpenCommitteeDetail;

  const CommitteesManageView({
    super.key,
    this.workspace,
    this.onOpenCommitteeDetail,
  });

  @override
  ConsumerState<CommitteesManageView> createState() => _CommitteesManageViewState();
}

class _CommitteesManageViewState extends ConsumerState<CommitteesManageView> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _selectedStatus = 'All';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(committeesProvider.notifier).loadManagedCommittees();
      ref.read(committeesProvider.notifier).loadForms();
      _checkTourGuide();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _checkTourGuide({bool force = false}) {
    final aliases = ref.read(committeesProvider).aliases;
    CommitteeTourGuideSheet.checkAndShow(
      context,
      screenKey: 'committees_manage',
      screenTitle: 'Manage ${aliases.aliasPlural}',
      steps: [
        TourStep(
          title: 'Hierarchical Structure',
          description: 'Organize parent ${aliases.aliasPlural.toLowerCase()} and delegate nested ${aliases.subGroupAliasPlural.toLowerCase()}.',
          icon: Icons.account_tree_outlined,
        ),
        TourStep(
          title: 'Leadership & Roster',
          description: 'Assign leaders, secretaries, and manage maximum seating capacity.',
          icon: Icons.supervisor_account_outlined,
        ),
        TourStep(
          title: 'Intake Forms Binding',
          description: 'Attach custom extra-info questionnaire forms to qualify incoming applicants.',
          icon: Icons.dynamic_form_outlined,
        ),
      ],
      force: force,
    );
  }

  void _showAddEditSheet([Committee? existing]) {
    final aliases = ref.read(committeesProvider).aliases;
    final forms = ref.read(committeesProvider).forms;
    final managed = ref.read(committeesProvider).managedCommittees;

    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final codeCtrl = TextEditingController(text: existing?.code ?? '');
    final descCtrl = TextEditingController(text: existing?.description ?? '');
    final catCtrl = TextEditingController(text: existing?.category ?? '');
    final scheduleCtrl = TextEditingController(text: existing?.meetingSchedule ?? '');
    final maxCtrl = TextEditingController(text: existing != null && existing.maxMembers > 0 ? existing.maxMembers.toString() : '');
    bool isPublic = existing?.isPublicJoin ?? true;
    bool allowExt = existing?.allowExternalRegistration ?? false;
    String? selectedParentId = existing?.parentCommitteeId;
    String? selectedFormId = existing?.extraInfoFormId;
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) => DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.85,
          maxChildSize: 0.95,
          minChildSize: 0.5,
          builder: (_, scrollCtrl) => Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: ListView(
              controller: scrollCtrl,
              children: [
                Center(
                  child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Icon(existing == null ? Icons.add_circle_outline : Icons.edit_note, color: const Color(0xFF0050E5), size: 22),
                    const SizedBox(width: 10),
                    Text(
                      existing == null ? 'Create ${aliases.aliasSingular}' : 'Edit ${existing.name}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                    ),
                  ],
                ),
                const Divider(height: 24),

                // Name
                const Text('Name *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 6),
                TextField(controller: nameCtrl, decoration: InputDecoration(hintText: 'e.g. Media & Production', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)))),
                const SizedBox(height: 12),

                // Code & Category Row
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Code', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          const SizedBox(height: 6),
                          TextField(controller: codeCtrl, decoration: InputDecoration(hintText: 'e.g. MED-01', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)))),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Category Tag', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          const SizedBox(height: 6),
                          TextField(controller: catCtrl, decoration: InputDecoration(hintText: 'e.g. Creative', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)))),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Parent Unit (Hierarchy)
                Text('Parent ${aliases.aliasSingular} (Optional)', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String?>(
                  value: selectedParentId,
                  decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('None (Top-Level Parent)')),
                    ...managed.where((m) => existing == null || m.id != existing.id).map((m) => DropdownMenuItem(value: m.id, child: Text(m.name))),
                  ],
                  onChanged: (v) => setSheetState(() => selectedParentId = v),
                ),
                const SizedBox(height: 12),

                // Description
                const Text('Description', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 6),
                TextField(controller: descCtrl, maxLines: 2, decoration: InputDecoration(hintText: 'Purpose and objectives...', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)))),
                const SizedBox(height: 12),

                // Meeting Schedule & Max Capacity
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Meeting Schedule', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          const SizedBox(height: 6),
                          TextField(controller: scheduleCtrl, decoration: InputDecoration(hintText: 'e.g. Thursdays 6:00 PM', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)))),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Max Capacity', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          const SizedBox(height: 6),
                          TextField(controller: maxCtrl, keyboardType: TextInputType.number, decoration: InputDecoration(hintText: '0 = Unlimited', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)))),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Attached Extra-Info Form
                const Text('Extra-Info Intake Form', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String?>(
                  value: selectedFormId,
                  decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('None (Standard info only)')),
                    ...forms.map((f) => DropdownMenuItem(value: f.id, child: Text(f.title))),
                  ],
                  onChanged: (v) => setSheetState(() => selectedFormId = v),
                ),
                const SizedBox(height: 14),

                // Toggles
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Public Visibility (Open Join)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  subtitle: const Text('Members can discover and self-join this group from the workspace directory.', style: TextStyle(fontSize: 11)),
                  value: isPublic,
                  onChanged: (v) => setSheetState(() => isPublic = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Allow External Public Registration', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  subtitle: const Text('Enables public external registration landing page.', style: TextStyle(fontSize: 11)),
                  value: allowExt,
                  onChanged: (v) => setSheetState(() => allowExt = v),
                ),
                const SizedBox(height: 20),

                // Submit Button
                ElevatedButton(
                  onPressed: isSaving
                      ? null
                      : () async {
                          final name = nameCtrl.text.trim();
                          if (name.isEmpty) return;
                          setSheetState(() => isSaving = true);

                          final payload = {
                            'name': name,
                            'code': codeCtrl.text.trim(),
                            'category': catCtrl.text.trim(),
                            'description': descCtrl.text.trim(),
                            'meetingSchedule': scheduleCtrl.text.trim(),
                            'maxMembers': int.tryParse(maxCtrl.text.trim()) ?? 0,
                            'parentCommitteeId': selectedParentId,
                            'extraInfoFormId': selectedFormId,
                            'isPublicJoin': isPublic,
                            'allowExternalRegistration': allowExt,
                          };

                          final notif = ref.read(committeesProvider.notifier);
                          if (existing == null) {
                            await notif.createCommittee(payload);
                          } else {
                            await notif.updateCommittee(existing.id, payload);
                          }

                          if (ctx.mounted) {
                            Navigator.of(ctx).pop();
                            ref.read(committeesProvider.notifier).loadManagedCommittees();
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0050E5),
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(isSaving ? 'Saving...' : (existing == null ? 'Create ${aliases.aliasSingular}' : 'Save Changes'), style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(committeesProvider);
    final aliases = state.aliases;

    final query = _searchCtrl.text.trim().toLowerCase();
    final items = state.managedCommittees.where((c) {
      if (_selectedStatus != 'All' && c.status.toLowerCase() != _selectedStatus.toLowerCase()) return false;
      if (query.isNotEmpty) {
        return c.name.toLowerCase().contains(query) || (c.code?.toLowerCase().contains(query) ?? false);
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Row(
          children: [
            Text('Manage ${aliases.aliasPlural}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(width: 8),
            CommitteeInfoIcon(
              title: 'Group Directory Management',
              purpose: 'Governs creation, settings, sub-units, and leader assignments.',
              inputs: 'Configure meeting schedules, max capacity, and external onboarding toggles.',
              impact: 'Changes made here reflect instantaneously across member directories.',
              bestPractices: 'Assign codes (e.g. GRP-01) for easier audit and finance tracking.',
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
            onPressed: () => ref.read(committeesProvider.notifier).loadManagedCommittees(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddEditSheet(),
        backgroundColor: const Color(0xFF0050E5),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: Text('New ${aliases.aliasSingular}', style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Filter & Search bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Search by name or code...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                DropdownButton<String>(
                  value: _selectedStatus,
                  items: ['All', 'Active', 'Inactive'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                  onChanged: (v) => setState(() => _selectedStatus = v ?? 'All'),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Committee List
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : items.isEmpty
                    ? Center(
                        child: Text('No ${aliases.aliasPlural.toLowerCase()} found.', style: TextStyle(color: Colors.grey.shade600)),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: items.length,
                        itemBuilder: (_, i) => _buildItemCard(items[i], aliases),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemCard(Committee c, CommitteeAliases aliases) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: const Color(0xFF0050E5).withAlpha(15), borderRadius: BorderRadius.circular(8)),
                      child: Icon(c.isSubUnit ? Icons.subdirectory_arrow_right : Icons.groups_rounded, color: const Color(0xFF0050E5), size: 20),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        Text(
                          c.isSubUnit ? '${aliases.subGroupAliasSingular} of ${c.parentCommitteeName ?? "Parent"}' : aliases.aliasSingular,
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ],
                ),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 18),
                      tooltip: 'Edit',
                      onPressed: () => _showAddEditSheet(c),
                    ),
                    IconButton(
                      icon: const Icon(Icons.launch_rounded, size: 18, color: Color(0xFF0050E5)),
                      tooltip: 'Open Hub',
                      onPressed: () => widget.onOpenCommitteeDetail?.call(c.id),
                    ),
                  ],
                ),
              ],
            ),
            const Divider(height: 20),
            Row(
              children: [
                _buildInfoBadge(Icons.people_outline, '${c.memberCount} Members'),
                const SizedBox(width: 12),
                if (c.meetingSchedule != null && c.meetingSchedule!.isNotEmpty)
                  _buildInfoBadge(Icons.schedule, c.meetingSchedule!),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoBadge(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: Colors.grey.shade600),
        const SizedBox(width: 4),
        Text(text, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
      ],
    );
  }
}

