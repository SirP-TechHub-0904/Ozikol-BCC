import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/workspace.dart';
import '../../services/committees_api_service.dart';
import '../../state/committees_state.dart';
import '../widgets/committee_info_icon.dart';
import '../widgets/committee_tour_guide_sheet.dart';

/// Settings & Dynamic Terminology Aliases view (`/committees/console/settings`).
class CommitteesSettingsView extends ConsumerStatefulWidget {
  final Workspace? workspace;

  const CommitteesSettingsView({super.key, this.workspace});

  @override
  ConsumerState<CommitteesSettingsView> createState() => _CommitteesSettingsViewState();
}

class _CommitteesSettingsViewState extends ConsumerState<CommitteesSettingsView> {
  final TextEditingController _singularCtrl = TextEditingController();
  final TextEditingController _pluralCtrl = TextEditingController();
  final TextEditingController _subSingularCtrl = TextEditingController();
  final TextEditingController _subPluralCtrl = TextEditingController();
  final TextEditingController _leaderTitleCtrl = TextEditingController();
  final TextEditingController _secretaryTitleCtrl = TextEditingController();

  bool _allowPublicIntake = true;
  bool _requireLeaderApproval = true;
  bool _enableCloudShelf = true;
  bool _isSaving = false;
  bool _isLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkTourGuide());
  }

  @override
  void dispose() {
    _singularCtrl.dispose();
    _pluralCtrl.dispose();
    _subSingularCtrl.dispose();
    _subPluralCtrl.dispose();
    _leaderTitleCtrl.dispose();
    _secretaryTitleCtrl.dispose();
    super.dispose();
  }

  void _checkTourGuide({bool force = false}) {
    final aliases = ref.read(committeesProvider).aliases;
    CommitteeTourGuideSheet.checkAndShow(
      context,
      screenKey: 'committees_settings',
      screenTitle: '${aliases.aliasPlural} Settings',
      steps: [
        TourStep(
          title: 'Dynamic Terminology Engine',
          description: 'Customize singular and plural terminology across your entire workspace (e.g. Committees, Groups, Ministries, Casts).',
          icon: Icons.translate_rounded,
        ),
        TourStep(
          title: 'Real-Time Navigation Synchrony',
          description: 'Sidebar labels, page titles, and reports update instantly across all desktop and mobile screens.',
          icon: Icons.sync_rounded,
        ),
      ],
      force: force,
    );
  }

  Future<void> _loadSettings() async {
    try {
      final api = ref.read(committeesApiServiceProvider);
      final s = await api.getSettings();
      if (mounted) {
        setState(() {
          _singularCtrl.text = s.aliases.aliasSingular;
          _pluralCtrl.text = s.aliases.aliasPlural;
          _subSingularCtrl.text = s.aliases.subGroupAliasSingular;
          _subPluralCtrl.text = s.aliases.subGroupAliasPlural;
          _leaderTitleCtrl.text = s.aliases.leaderTitleAlias;
          _secretaryTitleCtrl.text = s.aliases.secretaryTitleAlias;
          _allowPublicIntake = s.allowPublicIntake;
          _requireLeaderApproval = s.requireLeaderApproval;
          _enableCloudShelf = s.enableCloudShelf;
          _isLoaded = true;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoaded = true);
    }
  }

  Future<void> _handleSave() async {
    final singular = _singularCtrl.text.trim();
    final plural = _pluralCtrl.text.trim();

    if (singular.isEmpty || plural.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter both singular and plural aliases.')),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final payload = {
        'aliasSingular': singular,
        'aliasPlural': plural,
        'subGroupAliasSingular': _subSingularCtrl.text.trim().isNotEmpty ? _subSingularCtrl.text.trim() : 'Sub-Group',
        'subGroupAliasPlural': _subPluralCtrl.text.trim().isNotEmpty ? _subPluralCtrl.text.trim() : 'Sub-Groups',
        'leaderTitleAlias': _leaderTitleCtrl.text.trim().isNotEmpty ? _leaderTitleCtrl.text.trim() : 'Chairperson',
        'secretaryTitleAlias': _secretaryTitleCtrl.text.trim().isNotEmpty ? _secretaryTitleCtrl.text.trim() : 'Secretary',
        'allowPublicIntake': _allowPublicIntake,
        'requireLeaderApproval': _requireLeaderApproval,
        'enableCloudShelf': _enableCloudShelf,
      };

      final notif = ref.read(committeesProvider.notifier);
      final success = await notif.updateSettings(payload);

      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Settings and terminology updated successfully!'),
              backgroundColor: Color(0xFF059669),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to update settings.')),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(committeesProvider);
    final aliases = state.aliases;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Row(
          children: [
            Text('${aliases.aliasPlural} Settings & Terminology', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(width: 8),
            CommitteeInfoIcon(
              title: 'Dynamic Terminology Engine',
              purpose: 'Enables deep domain personalization so your workspace uses the vocabulary matching your industry or church.',
              inputs: 'Define primary aliases (Committees, Groups, Ministries, Casts) and sub-units.',
              impact: 'Instantly changes sidebar labels, cards, and modal dialogs across all users.',
              bestPractices: 'Choose clean, natural terms that reflect your organizational structure.',
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
            onPressed: _loadSettings,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: !_isLoaded
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Terminology Card
                  Container(
                    padding: const EdgeInsets.all(18),
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
                            const Icon(Icons.translate_rounded, color: Color(0xFF0050E5), size: 20),
                            const SizedBox(width: 8),
                            const Text('Dynamic Vocabulary & Aliases', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          ],
                        ),
                        const Divider(height: 20),

                        // Primary Singular / Plural
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Singular Alias *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                  const SizedBox(height: 6),
                                  TextField(
                                    controller: _singularCtrl,
                                    decoration: InputDecoration(
                                      hintText: 'e.g. Group / Ministry / Cast',
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Plural Alias *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                  const SizedBox(height: 6),
                                  TextField(
                                    controller: _pluralCtrl,
                                    decoration: InputDecoration(
                                      hintText: 'e.g. Groups / Ministries / Casts',
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Sub-Unit Singular / Plural
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Sub-Unit Singular', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                  const SizedBox(height: 6),
                                  TextField(
                                    controller: _subSingularCtrl,
                                    decoration: InputDecoration(
                                      hintText: 'e.g. Sub-Unit / Cell / Cast Unit',
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Sub-Unit Plural', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                  const SizedBox(height: 6),
                                  TextField(
                                    controller: _subPluralCtrl,
                                    decoration: InputDecoration(
                                      hintText: 'e.g. Sub-Units / Cells / Cast Units',
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Leadership Title Aliases
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Leader Title Alias', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                  const SizedBox(height: 6),
                                  TextField(
                                    controller: _leaderTitleCtrl,
                                    decoration: InputDecoration(
                                      hintText: 'e.g. Chairperson / Group Lead / Pastor',
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Secretary Title Alias', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                  const SizedBox(height: 6),
                                  TextField(
                                    controller: _secretaryTitleCtrl,
                                    decoration: InputDecoration(
                                      hintText: 'e.g. Secretary / Scribe / Admin',
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Operations & Policy Card
                  Container(
                    padding: const EdgeInsets.all(18),
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
                            const Icon(Icons.tune_rounded, color: Color(0xFF0050E5), size: 20),
                            const SizedBox(width: 8),
                            const Text('Operations & Shelf Policies', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          ],
                        ),
                        const Divider(height: 20),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Allow Public External Onboarding', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                          subtitle: const Text('Enables public intake QR codes and external landing pages for prospective candidates.', style: TextStyle(fontSize: 11)),
                          value: _allowPublicIntake,
                          onChanged: (v) => setState(() => _allowPublicIntake = v),
                        ),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Require Leader Approval for Restricted Groups', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                          subtitle: const Text('Applications to join restricted groups are routed to group chairs before roster enrollment.', style: TextStyle(fontSize: 11)),
                          value: _requireLeaderApproval,
                          onChanged: (v) => setState(() => _requireLeaderApproval = v),
                        ),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Enable Shared Cloud Shelf', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                          subtitle: const Text('Allows pinning Google Docs, Sheets, Slides, and NotebookLM links to group hubs.', style: TextStyle(fontSize: 11)),
                          value: _enableCloudShelf,
                          onChanged: (v) => setState(() => _enableCloudShelf = v),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Save Button
                  ElevatedButton.icon(
                    onPressed: _isSaving ? null : _handleSave,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0050E5),
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: _isSaving
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.save_outlined, size: 18),
                    label: Text(_isSaving ? 'Saving Settings...' : 'Save Terminology & Settings', style: const TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
    );
  }
}

