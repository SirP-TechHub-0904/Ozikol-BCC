import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';

/// Screen presenting the KPI Indicators & Member Leaderboard under User Directory.
/// Replicates Angular Web UserKpiComponent 1-to-1 with evaluation metrics configuration,
/// cycle periods management, ranked leaderboard table, and complete in-dialog member grading.
class KpisLeaderboardView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Optional navigation callback to other tabs (e.g. Directory).
  final void Function(int tabIndex)? onNavigateToTab;

  /// Creates a [KpisLeaderboardView].
  const KpisLeaderboardView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
  });

  @override
  ConsumerState<KpisLeaderboardView> createState() => _KpisLeaderboardViewState();
}

class _KpisLeaderboardViewState extends ConsumerState<KpisLeaderboardView> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _metrics = [];
  List<Map<String, dynamic>> _periods = [];
  List<Map<String, dynamic>> _leaderboard = [];
  String _selectedPeriod = '2026 Q4';
  bool _showNewPeriodBanner = false;
  final _newPeriodTitleCtrl = TextEditingController();
  final _newPeriodDescCtrl = TextEditingController();
  bool _isCreatingPeriod = false;

  @override
  void initState() {
    super.initState();
    _loadAllKpiData();
  }

  @override
  void dispose() {
    _newPeriodTitleCtrl.dispose();
    _newPeriodDescCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAllKpiData() async {
    setState(() => _isLoading = true);
    try {
      final repo = ref.read(accountRepositoryProvider);
      final metricsRes = await repo.getKpiIndicators();
      final periodsRes = await repo.getKpiPeriods();

      String activePeriod = _selectedPeriod;
      if (periodsRes.isNotEmpty) {
        activePeriod = periodsRes.first['title'] as String? ?? '2026 Q4';
      }

      final leaderboardRes = await repo.getKpiLeaderboard(activePeriod);

      if (mounted) {
        setState(() {
          _metrics = metricsRes.isNotEmpty
              ? metricsRes
              : [
                  {
                    'id': 'm-1',
                    'title': 'Operational Execution & Quality',
                    'category': 'Operations',
                    'description': 'Accuracy, velocity, and delivery adherence on workstreams.',
                    'maxScore': 100,
                    'weight': 1.5,
                  },
                  {
                    'id': 'm-2',
                    'title': 'Client Collaboration & Communication',
                    'category': 'Leadership',
                    'description': 'Professionalism, transparency, and stakeholder feedback scores.',
                    'maxScore': 100,
                    'weight': 1.0,
                  },
                  {
                    'id': 'm-3',
                    'title': 'Governance & Security Compliance',
                    'category': 'Compliance',
                    'description': 'Adherence to corporate data protection and authentication standards.',
                    'maxScore': 100,
                    'weight': 1.2,
                  },
                ];
          _periods = periodsRes.isNotEmpty
              ? periodsRes
              : [
                  {'id': 'p-1', 'title': '2026 Q4'},
                  {'id': 'p-2', 'title': '2026 Q3'},
                  {'id': 'p-3', 'title': 'Annual 2026'},
                ];
          _selectedPeriod = activePeriod;
          _leaderboard = leaderboardRes;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadLeaderboard() async {
    try {
      final repo = ref.read(accountRepositoryProvider);
      final res = await repo.getKpiLeaderboard(_selectedPeriod);
      if (mounted) setState(() => _leaderboard = res);
    } catch (_) {}
  }

  Future<void> _createPeriod() async {
    final title = _newPeriodTitleCtrl.text.trim();
    if (title.isEmpty) return;
    setState(() => _isCreatingPeriod = true);
    try {
      final repo = ref.read(accountRepositoryProvider);
      final ok = await repo.createKpiPeriod(title, _newPeriodDescCtrl.text.trim());
      if (mounted) {
        setState(() {
          _isCreatingPeriod = false;
          _showNewPeriodBanner = false;
          _newPeriodTitleCtrl.clear();
          _newPeriodDescCtrl.clear();
        });
        if (ok) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Period "$title" created successfully.')),
          );
          _loadAllKpiData();
        }
      }
    } catch (_) {
      if (mounted) setState(() => _isCreatingPeriod = false);
    }
  }

  void _openCreateOrEditMetricDialog({Map<String, dynamic>? existingMetric}) {
    final isEditing = existingMetric != null;
    final titleCtrl = TextEditingController(text: existingMetric?['title'] as String? ?? '');
    final catCtrl = TextEditingController(text: existingMetric?['category'] as String? ?? 'General');
    final descCtrl = TextEditingController(text: existingMetric?['description'] as String? ?? '');
    final maxScoreCtrl = TextEditingController(text: (existingMetric?['maxScore'] ?? 100).toString());
    final weightCtrl = TextEditingController(text: (existingMetric?['weight'] ?? 1.0).toString());
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          final isDark = Theme.of(context).brightness == Brightness.dark;

          return AlertDialog(
            backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    isEditing ? Icons.edit_rounded : Icons.analytics_rounded,
                    color: AppColors.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  isEditing ? 'Edit KPI Indicator' : 'Create KPI Metric Indicator',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
            content: SizedBox(
              width: 480,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('METRIC TITLE *', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: titleCtrl,
                      decoration: InputDecoration(
                        hintText: 'e.g. Technical Delivery Quality',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 14),

                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('CATEGORY *', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                              const SizedBox(height: 6),
                              TextField(
                                controller: catCtrl,
                                decoration: InputDecoration(
                                  hintText: 'e.g. Operations',
                                  filled: true,
                                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
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
                              Text('MAX SCORE', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                              const SizedBox(height: 6),
                              TextField(
                                controller: maxScoreCtrl,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  hintText: '100',
                                  filled: true,
                                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
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
                              Text('WEIGHT (x)', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                              const SizedBox(height: 6),
                              TextField(
                                controller: weightCtrl,
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                decoration: InputDecoration(
                                  hintText: '1.0',
                                  filled: true,
                                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    Text('RUBRIC DESCRIPTION', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: descCtrl,
                      maxLines: 2,
                      decoration: InputDecoration(
                        hintText: 'Evaluation guidelines and scoring benchmarks',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: isSaving ? null : () => Navigator.of(ctx).pop(),
                child: const Text('Cancel'),
              ),
              FilledButton.icon(
                onPressed: isSaving
                    ? null
                    : () async {
                        final title = titleCtrl.text.trim();
                        if (title.isEmpty) return;
                        setDialogState(() => isSaving = true);

                        final payload = {
                          'title': title,
                          'category': catCtrl.text.trim(),
                          'description': descCtrl.text.trim(),
                          'maxScore': int.tryParse(maxScoreCtrl.text.trim()) ?? 100,
                          'weight': double.tryParse(weightCtrl.text.trim()) ?? 1.0,
                        };

                        try {
                          final repo = ref.read(accountRepositoryProvider);
                          if (isEditing) {
                            final id = existingMetric['id'] as String;
                            await repo.updateKpiIndicator(id, payload);
                          } else {
                            await repo.createKpiIndicator(payload);
                          }
                          if (ctx.mounted) Navigator.of(ctx).pop();
                          _loadAllKpiData();
                        } catch (_) {
                          setDialogState(() => isSaving = false);
                        }
                      },
                icon: isSaving
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.save_rounded, size: 16),
                label: Text(isEditing ? 'Save Changes' : 'Create Indicator'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _confirmDeleteMetric(Map<String, dynamic> metric) {
    final id = metric['id'] as String? ?? '';
    final title = metric['title'] as String? ?? 'Indicator';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete KPI Indicator'),
        content: Text('Are you sure you want to delete rubric "$title"? Historical evaluations using this metric will retain calculated averages.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                final repo = ref.read(accountRepositoryProvider);
                await repo.deleteKpiIndicator(id);
                _loadAllKpiData();
              } catch (_) {}
            },
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _openGradeMemberDialog(Map<String, dynamic> item) {
    final memberName = item['fullName'] as String? ?? 'Member';
    final profileId = item['profileId'] ?? item['userId'] ?? '';
    final scoreCtrl = TextEditingController(text: (item['avgScore'] ?? item['averageScore'] ?? 85).toString());
    final feedbackCtrl = TextEditingController();
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          final isDark = Theme.of(context).brightness == Brightness.dark;

          return AlertDialog(
            backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.assignment_turned_in_rounded, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Text(
                  'Evaluate Member: $memberName',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
            content: SizedBox(
              width: 440,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('EVALUATION PERIOD', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.event_note_rounded, size: 16, color: Color(0xFF0050E5)),
                          const SizedBox(width: 8),
                          Text(_selectedPeriod, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    Text('COMPOSITE SCORE (0 - 100%) *', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: scoreCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        hintText: 'e.g. 92.5',
                        suffixText: '%',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 14),

                    Text('EXECUTIVE FEEDBACK & NOTES', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: feedbackCtrl,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: 'Comments, commendations, or areas for performance improvement...',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: isSaving ? null : () => Navigator.of(ctx).pop(),
                child: const Text('Cancel'),
              ),
              FilledButton.icon(
                onPressed: isSaving
                    ? null
                    : () async {
                        final score = double.tryParse(scoreCtrl.text.trim()) ?? 0.0;
                        setDialogState(() => isSaving = true);

                        final payload = {
                          'profileId': profileId,
                          'period': _selectedPeriod,
                          'score': score,
                          'notes': feedbackCtrl.text.trim(),
                        };

                        try {
                          final repo = ref.read(accountRepositoryProvider);
                          await repo.gradeMemberKpi(payload);
                          if (ctx.mounted) {
                            Navigator.of(ctx).pop();
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              SnackBar(
                                content: Text('Scorecard submitted for $memberName.'),
                                backgroundColor: const Color(0xFF10B981),
                              ),
                            );
                          }
                          _loadLeaderboard();
                        } catch (_) {
                          setDialogState(() => isSaving = false);
                        }
                      },
                icon: isSaving
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.check_rounded, size: 16),
                label: const Text('Submit Scorecard'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth >= 1100;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ===================================================================
          // PAGE HEADER (1-to-1 with Angular AppPageHeader)
          // ===================================================================
          _buildPageHeader(isDark),
          const SizedBox(height: 18),

          // ===================================================================
          // INLINE CREATE PERIOD BANNER (WHEN OPENED)
          // ===================================================================
          if (_showNewPeriodBanner) ...[
            _buildCreatePeriodBanner(isDark),
            const SizedBox(height: 18),
          ],

          // ===================================================================
          // MAIN 2-COLUMN KPI WORKSPACE GRID (METRICS + LEADERBOARD)
          // ===================================================================
          if (isDesktop)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: _buildMetricsPanel(isDark),
                ),
                const SizedBox(width: 18),
                Expanded(
                  child: _buildLeaderboardPanel(isDark),
                ),
              ],
            )
          else ...[
            _buildMetricsPanel(isDark),
            const SizedBox(height: 18),
            _buildLeaderboardPanel(isDark),
          ],
        ],
      ),
    );
  }

  Widget _buildPageHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
        ),
      ),
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 16,
        runSpacing: 12,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.analytics_rounded, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'USER MANAGEMENT',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.06,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'KPI Indicators & Member Leaderboard',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Configure organizational performance metrics, evaluate member scorecards, and track dynamic leaderboard rankings.',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                ],
              ),
            ],
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              OutlinedButton.icon(
                onPressed: () => widget.onNavigateToTab?.call(1),
                icon: const Icon(Icons.groups_rounded, size: 16),
                label: const Text('Member Directory'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                  side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(width: 10),
              FilledButton.icon(
                onPressed: () => _openCreateOrEditMetricDialog(),
                icon: const Icon(Icons.add_rounded, size: 16),
                label: const Text('Create Metric'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCreatePeriodBanner(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBFDBFE)),
        boxShadow: const [
          BoxShadow(color: Color(0x0F0050E5), blurRadius: 10, offset: Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.calendar_month_rounded, color: Color(0xFF0050E5), size: 20),
                  SizedBox(width: 8),
                  Text('Create New Evaluation Period / Cycle', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, size: 18),
                onPressed: () => setState(() => _showNewPeriodBanner = false),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                flex: 4,
                child: TextField(
                  controller: _newPeriodTitleCtrl,
                  decoration: InputDecoration(
                    labelText: 'Period Title *',
                    hintText: 'e.g. 2026 Q4, Annual 2026',
                    filled: true,
                    fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 6,
                child: TextField(
                  controller: _newPeriodDescCtrl,
                  decoration: InputDecoration(
                    labelText: 'Description (Optional)',
                    hintText: 'e.g. Fourth quarter review cycle',
                    filled: true,
                    fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              FilledButton.icon(
                onPressed: _isCreatingPeriod ? null : _createPeriod,
                icon: _isCreatingPeriod
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save_rounded, size: 16),
                label: Text(_isCreatingPeriod ? 'Saving...' : 'Save Period'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricsPanel(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Performance Evaluation Metrics',
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                    ),
                  ),
                  Text(
                    'Rubrics and numerical indicators used during member evaluations',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
              FilledButton.icon(
                onPressed: () => _openCreateOrEditMetricDialog(),
                icon: const Icon(Icons.add_rounded, size: 16),
                label: const Text('Create Metric'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  textStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          if (_metrics.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 36),
              alignment: Alignment.center,
              child: Column(
                children: [
                  const Icon(Icons.assignment_rounded, size: 36, color: Color(0xFFCBD5E1)),
                  const SizedBox(height: 8),
                  const Text('No KPI indicators defined yet.', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
                  const SizedBox(height: 10),
                  FilledButton.icon(
                    onPressed: () => _openCreateOrEditMetricDialog(),
                    icon: const Icon(Icons.add_rounded, size: 16),
                    label: const Text('Create Custom Indicator'),
                  ),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _metrics.length,
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final m = _metrics[index];
                final title = m['title'] as String? ?? 'Metric';
                final cat = m['category'] as String? ?? 'General';
                final desc = m['description'] as String? ?? '';
                final maxScore = m['maxScore'] ?? 100;
                final weight = m['weight'] ?? 1.0;

                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.analytics_rounded, color: Color(0xFF0050E5), size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  title,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE2E8F0),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    cat.toUpperCase(),
                                    style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              desc,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Max Score: $maxScore • Weight: ${weight}x',
                              style: const TextStyle(fontSize: 10.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit_rounded, size: 16),
                        color: const Color(0xFF0050E5),
                        tooltip: 'Edit Metric',
                        onPressed: () => _openCreateOrEditMetricDialog(existingMetric: m),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, size: 16),
                        color: const Color(0xFFEF4444),
                        tooltip: 'Delete Metric',
                        onPressed: () => _confirmDeleteMetric(m),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildLeaderboardPanel(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Member Performance Leaderboard',
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                    ),
                  ),
                  Text(
                    'Rankings derived from genuine evaluation scorecards',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  DropdownButton<String>(
                    value: _selectedPeriod,
                    underline: const SizedBox(),
                    items: _periods.map((p) {
                      final title = p['title'] as String? ?? 'Period';
                      return DropdownMenuItem(value: title, child: Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)));
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedPeriod = val);
                        _loadLeaderboard();
                      }
                    },
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: () => setState(() => _showNewPeriodBanner = !_showNewPeriodBanner),
                    icon: const Icon(Icons.add_circle_outline_rounded, size: 14),
                    label: const Text('Add Period'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      minimumSize: Size.zero,
                      textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          if (_leaderboard.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 36),
              alignment: Alignment.center,
              child: Column(
                children: [
                  const Icon(Icons.leaderboard_rounded, size: 36, color: Color(0xFFCBD5E1)),
                  const SizedBox(height: 8),
                  Text('No evaluation scores recorded for $_selectedPeriod.', style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
                  const SizedBox(height: 4),
                  const Text('Select a member from the directory to enter this period\'s evaluation.', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () => widget.onNavigateToTab?.call(1),
                    child: const Text('Browse Directory to Grade', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _leaderboard.length,
              separatorBuilder: (context, index) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final item = _leaderboard[index];
                final rank = index + 1;
                final name = item['fullName'] as String? ?? 'Member';
                final email = item['email'] as String? ?? '';
                final cat = item['categoryName'] as String? ?? 'General';
                final score = (item['averageScore'] ?? item['avgScore'] ?? 0.0) as num;

                String medal = '#$rank';
                if (rank == 1) medal = '🥇';
                if (rank == 2) medal = '🥈';
                if (rank == 3) medal = '🥉';

                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 28,
                        child: Text(medal, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                            Text('$cat • $email', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Text(
                          '${score.toStringAsFixed(1)}%',
                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0050E5)),
                        ),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton(
                        onPressed: () => _openGradeMemberDialog(item),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text('Grade', style: TextStyle(fontSize: 11)),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
