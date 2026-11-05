import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/workspace.dart';
import '../../models/committee_models.dart';
import '../../services/committees_api_service.dart';
import '../../state/committees_state.dart';
import '../widgets/committee_info_icon.dart';
import '../widgets/committee_tour_guide_sheet.dart';

/// Extra-Info Forms Designer view (`/committees/console/forms`).
class CommitteesFormsView extends ConsumerStatefulWidget {
  final Workspace? workspace;

  const CommitteesFormsView({super.key, this.workspace});

  @override
  ConsumerState<CommitteesFormsView> createState() => _CommitteesFormsViewState();
}

class _CommitteesFormsViewState extends ConsumerState<CommitteesFormsView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(committeesProvider.notifier).loadForms();
      _checkTourGuide();
    });
  }

  void _checkTourGuide({bool force = false}) {
    CommitteeTourGuideSheet.checkAndShow(
      context,
      screenKey: 'committees_forms',
      screenTitle: 'Dynamic Extra-Info Forms',
      steps: [
        TourStep(
          title: 'Custom Intake Forms',
          description: 'Design dynamic questionnaires to collect specific qualifications from prospective group members.',
          icon: Icons.dynamic_form_outlined,
        ),
        TourStep(
          title: 'Module Independence',
          description: 'Attach forms independently to any group or sub-unit without altering global member profiles.',
          icon: Icons.tune_rounded,
        ),
      ],
      force: force,
    );
  }

  void _showAddEditForm([CommitteeExtraInfoForm? existing]) {
    final titleCtrl = TextEditingController(text: existing?.title ?? '');
    final descCtrl = TextEditingController(text: existing?.description ?? '');
    final List<ExtraInfoFormField> fields = List.from(existing?.fields ?? []);
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
                Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(existing == null ? 'Create Intake Form' : 'Edit Form', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
                    TextButton.icon(
                      onPressed: () {
                        setSheetState(() {
                          fields.add(ExtraInfoFormField(
                            id: DateTime.now().millisecondsSinceEpoch.toString(),
                            label: 'New Question',
                            fieldType: 'text',
                          ));
                        });
                      },
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Add Field'),
                    ),
                  ],
                ),
                const Divider(height: 20),
                const Text('Form Title *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 6),
                TextField(controller: titleCtrl, decoration: InputDecoration(hintText: 'e.g. Media Team Audition Questionnaire', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)))),
                const SizedBox(height: 12),
                const Text('Description', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 6),
                TextField(controller: descCtrl, maxLines: 2, decoration: InputDecoration(hintText: 'Instructions for applicants...', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)))),
                const SizedBox(height: 20),
                Text('Questions & Fields (${fields.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 10),
                if (fields.isEmpty)
                  Center(child: Padding(padding: const EdgeInsets.all(16), child: Text('No custom fields added yet.', style: TextStyle(color: Colors.grey.shade500))))
                else
                  ...fields.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final field = entry.value;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: const Icon(Icons.help_outline, color: Color(0xFF0050E5), size: 20),
                        title: Text(field.label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        subtitle: Text('Type: ${field.fieldType}${field.isRequired ? " (Required)" : ""}', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.red, size: 18),
                          onPressed: () => setSheetState(() => fields.removeAt(idx)),
                        ),
                      ),
                    );
                  }),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: isSaving
                      ? null
                      : () async {
                          final title = titleCtrl.text.trim();
                          if (title.isEmpty) return;
                          setSheetState(() => isSaving = true);

                          final payload = {
                            'title': title,
                            'description': descCtrl.text.trim(),
                            'fields': fields.map((f) => f.toJson()).toList(),
                          };

                          final api = ref.read(committeesApiServiceProvider);
                          if (existing == null) {
                            await api.createForm(payload);
                          } else {
                            await api.updateForm(existing.id, payload);
                          }

                          if (ctx.mounted) {
                            Navigator.of(ctx).pop();
                            ref.read(committeesProvider.notifier).loadForms();
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0050E5),
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(isSaving ? 'Saving...' : 'Save Form', style: const TextStyle(fontWeight: FontWeight.bold)),
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
    final forms = state.forms;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Intake Forms Designer', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(width: 8),
            CommitteeInfoIcon(
              title: 'Dynamic Intake Forms',
              purpose: 'Allows building tailored questionnaires without altering global identity profiles.',
              inputs: 'Define text, number, dropdown, or file upload requirements for incoming members.',
              impact: 'Attached forms prompt candidates automatically during self-enrollment.',
              bestPractices: 'Keep questions concise to reduce candidate drop-off during onboarding.',
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
            onPressed: () => ref.read(committeesProvider.notifier).loadForms(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddEditForm(),
        backgroundColor: const Color(0xFF0050E5),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Form', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : forms.isEmpty
              ? Center(child: Text('No intake forms created yet.', style: TextStyle(color: Colors.grey.shade600)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: forms.length,
                  itemBuilder: (_, i) {
                    final f = forms[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(color: const Color(0xFF0050E5).withAlpha(15), borderRadius: BorderRadius.circular(8)),
                          child: const Icon(Icons.dynamic_form_outlined, color: Color(0xFF0050E5)),
                        ),
                        title: Text(f.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: Text('${f.fields.length} Custom Fields', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                        trailing: IconButton(
                          icon: const Icon(Icons.edit_outlined),
                          onPressed: () => _showAddEditForm(f),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

