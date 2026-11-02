import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/central_adjuster.dart';
import '../../../data/account_repository.dart';

/// Screen presenting the KPI Indicators & Member Leaderboard under User Directory.
/// Replicates Angular Web UserKpiComponent 1-to-1 with evaluation metrics configuration,
/// cycle periods management, ranked leaderboard table, and complete in-dialog member grading.
class KpisLeaderboardView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Optional navigation callback to other tabs (e.g. Directory).
  final void Function(int tabIndex)? onNavigateToTab;

  /// Optional callback to navigate back to previous screen.
  final VoidCallback? onNavigateBack;

  /// Creates a [KpisLeaderboardView].
  const KpisLeaderboardView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
    this.onNavigateBack,
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
        final matches = periodsRes.any((p) => p['title'] == _selectedPeriod);
        if (!matches) {
          activePeriod = periodsRes.first['title'] as String? ?? '2026 Q4';
        }
      }

      final leaderboardRes = await repo.getKpiLeaderboard(activePeriod);

      if (mounted) {
        setState(() {
          _metrics = metricsRes;
          _periods = periodsRes;
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
            SnackBar(
              content: Text('Period "$title" created successfully.'),
              backgroundColor: const Color(0xFF10B981),
            ),
          );
          setState(() => _selectedPeriod = title);
          _loadAllKpiData();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to create evaluation period. Please try again.'),
              backgroundColor: Color(0xFFEF4444),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isCreatingPeriod = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error creating period: $e'), backgroundColor: const Color(0xFFEF4444)),
        );
      }
    }
  }

  /// Opens dialog to create a new evaluation period.
  void _openCreatePeriodDialog() {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
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
                  child: const Icon(Icons.date_range_rounded, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Text(
                  'Create Evaluation Period',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
            content: SizedBox(
              width: 420,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('PERIOD TITLE *', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: titleCtrl,
                    decoration: InputDecoration(
                      hintText: 'e.g. 2026 Q4, Annual 2026',
                      filled: true,
                      fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text('DESCRIPTION (OPTIONAL)', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: descCtrl,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'e.g. Fourth quarter evaluation cycle',
                      filled: true,
                      fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ],
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
                        try {
                          final repo = ref.read(accountRepositoryProvider);
                          final ok = await repo.createKpiPeriod(title, descCtrl.text.trim());
                          if (ctx.mounted) {
                            setDialogState(() => isSaving = false);
                            if (ok) {
                              Navigator.of(ctx).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Period "$title" created successfully.'),
                                  backgroundColor: const Color(0xFF10B981),
                                ),
                              );
                              setState(() => _selectedPeriod = title);
                              _loadAllKpiData();
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Failed to create period. Please try again.'),
                                  backgroundColor: Color(0xFFEF4444),
                                ),
                              );
                            }
                          }
                        } catch (e) {
                          if (ctx.mounted) {
                            setDialogState(() => isSaving = false);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Error: $e'), backgroundColor: const Color(0xFFEF4444)),
                            );
                          }
                        }
                      },
                icon: isSaving
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.check_rounded, size: 16),
                label: Text(isSaving ? 'Creating...' : 'Create Period'),
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
                          bool ok = false;
                          if (isEditing) {
                            final id = existingMetric['id'] as String;
                            ok = await repo.updateKpiIndicator(id, payload);
                          } else {
                            ok = await repo.createKpiIndicator(payload);
                          }
                          if (ctx.mounted) {
                            setDialogState(() => isSaving = false);
                            if (ok) {
                              Navigator.of(ctx).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(isEditing
                                      ? 'KPI metric updated successfully.'
                                      : 'KPI metric "$title" created successfully.'),
                                  backgroundColor: const Color(0xFF10B981),
                                ),
                              );
                              _loadAllKpiData();
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Failed to save KPI metric. Please verify fields and try again.'),
                                  backgroundColor: Color(0xFFEF4444),
                                ),
                              );
                            }
                          }
                        } catch (e) {
                          if (ctx.mounted) {
                            setDialogState(() => isSaving = false);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Error saving metric: $e'), backgroundColor: const Color(0xFFEF4444)),
                            );
                          }
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
                Expanded(
                  child: Text(
                    'Evaluate Member: $memberName',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                    ),
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

                        final scoreItems = _metrics
                            .where((m) => m['id'] != null && !(m['id'].toString().startsWith('m-')))
                            .map((m) => {
                                  'indicatorId': m['id'],
                                  'score': score,
                                  'remarks': feedbackCtrl.text.trim(),
                                })
                            .toList();

                        final payload = {
                          'profileId': profileId,
                          'period': _selectedPeriod,
                          'score': score,
                          'scores': scoreItems,
                          'remarks': feedbackCtrl.text.trim(),
                          'notes': feedbackCtrl.text.trim(),
                        };

                        try {
                          final repo = ref.read(accountRepositoryProvider);
                          final ok = await repo.gradeMemberKpi(payload);
                          if (ctx.mounted) {
                            setDialogState(() => isSaving = false);
                            if (ok) {
                              Navigator.of(ctx).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Scorecard submitted for $memberName.'),
                                  backgroundColor: const Color(0xFF10B981),
                                ),
                              );
                              _loadLeaderboard();
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Failed to submit scorecard. Please try again.'),
                                  backgroundColor: Color(0xFFEF4444),
                                ),
                              );
                            }
                          }
                        } catch (e) {
                          if (ctx.mounted) {
                            setDialogState(() => isSaving = false);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Error: $e'), backgroundColor: const Color(0xFFEF4444)),
                            );
                          }
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

    return LayoutBuilder(
      builder: (context, constraints) {
        final availableWidth = constraints.maxWidth;
        // Require at least 980px available content width to render side-by-side columns without squeezing
        final isDesktop = availableWidth >= 980;

        return SingleChildScrollView(
          padding: EdgeInsets.symmetric(
            horizontal: availableWidth < 600 ? 16 : 24,
            vertical: 20,
          ),
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
      },
    );
  }

  Widget _buildPageHeader(bool isDark) {
    return CentralAdjuster.pageHeader(
      icon: Icons.analytics_rounded,
      eyebrow: 'kpi_board.eyebrow'.tr(ref, fallback: 'USER MANAGEMENT'),
      title: 'kpi_board.title'.tr(ref, fallback: 'KPI Indicators & Member Leaderboard'),
      subtitle: 'kpi_board.subtitle'.tr(ref, fallback:
          'Configure organizational performance metrics, evaluate member scorecards, and track dynamic leaderboard rankings.'),
      isDark: isDark,
      onBack: widget.onNavigateBack,
      actions: [
        OutlinedButton.icon(
          onPressed: () => widget.onNavigateToTab?.call(1),
          icon: const Icon(Icons.groups_rounded, size: 16),
          label: Text('kpi_board.btn_directory'.tr(ref, fallback: 'Member Directory')),
          style: OutlinedButton.styleFrom(
            foregroundColor: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
        ),
        OutlinedButton.icon(
          onPressed: () async {
            setState(() => _isLoading = true);
            await _loadAllKpiData();
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('kpi_board.data_refreshed'.tr(ref, fallback: 'KPI workspace data refreshed.')),
                  duration: const Duration(seconds: 2),
                ),
              );
            }
          },
          icon: const Icon(Icons.refresh_rounded, size: 16),
          label: Text('common.refresh'.tr(ref, fallback: 'Refresh')),
          style: OutlinedButton.styleFrom(
            foregroundColor: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
        ),
        FilledButton.icon(
          onPressed: () => _openCreateOrEditMetricDialog(),
          icon: const Icon(Icons.add_rounded, size: 16),
          label: Text('kpi_board.btn_create_metric'.tr(ref, fallback: 'Create Metric')),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _buildCreatePeriodBanner(bool isDark) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 680;

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
                  Row(
                    children: [
                      const Icon(Icons.calendar_month_rounded, color: Color(0xFF0050E5), size: 20),
                      const SizedBox(width: 8),
                      Text('kpi_board.banner_create_period'.tr(ref, fallback: 'Create New Evaluation Period / Cycle'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 18),
                    onPressed: () => setState(() => _showNewPeriodBanner = false),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (isNarrow) ...[
                TextField(
                  controller: _newPeriodTitleCtrl,
                  decoration: InputDecoration(
                    labelText: 'kpi_board.period_title_label'.tr(ref, fallback: 'Period Title *'),
                    hintText: 'kpi_board.period_title_hint'.tr(ref, fallback: 'e.g. 2026 Q4, Annual 2026'),
                    filled: true,
                    fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _newPeriodDescCtrl,
                  decoration: InputDecoration(
                    labelText: 'kpi_board.desc_optional'.tr(ref, fallback: 'Description (Optional)'),
                    hintText: 'kpi_board.period_desc_hint'.tr(ref, fallback: 'e.g. Fourth quarter review cycle'),
                    filled: true,
                    fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _isCreatingPeriod ? null : _createPeriod,
                    icon: _isCreatingPeriod
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.save_rounded, size: 16),
                    label: Text(_isCreatingPeriod ? 'common.saving'.tr(ref, fallback: 'Saving...') : 'kpi_board.btn_save_period'.tr(ref, fallback: 'Save Period')),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ] else ...[
                Row(
                  children: [
                    Expanded(
                      flex: 4,
                      child: TextField(
                        controller: _newPeriodTitleCtrl,
                        decoration: InputDecoration(
                          labelText: 'kpi_board.period_title_label'.tr(ref, fallback: 'Period Title *'),
                          hintText: 'kpi_board.period_title_hint'.tr(ref, fallback: 'e.g. 2026 Q4, Annual 2026'),
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
                          labelText: 'kpi_board.desc_optional'.tr(ref, fallback: 'Description (Optional)'),
                          hintText: 'kpi_board.period_desc_hint'.tr(ref, fallback: 'e.g. Fourth quarter review cycle'),
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
                      label: Text(_isCreatingPeriod ? 'common.saving'.tr(ref, fallback: 'Saving...') : 'kpi_board.btn_save_period'.tr(ref, fallback: 'Save Period')),
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
            ],
          ),
        );
      },
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
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'kpi_board.metrics_title'.tr(ref, fallback: 'Performance Evaluation Metrics'),
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'kpi_board.metrics_subtitle'.tr(ref, fallback: 'Rubrics and numerical indicators used during member evaluations'),
                      style: TextStyle(
                        fontSize: 11.5,
                        color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              FilledButton.icon(
                onPressed: () => _openCreateOrEditMetricDialog(),
                icon: const Icon(Icons.add_rounded, size: 16),
                label: Text('kpi_board.btn_create_metric'.tr(ref, fallback: 'Create Metric')),
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
                  Text('kpi_board.metrics_empty'.tr(ref, fallback: 'No KPI indicators defined yet.'), style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
                  const SizedBox(height: 10),
                  FilledButton.icon(
                    onPressed: () => _openCreateOrEditMetricDialog(),
                    icon: const Icon(Icons.add_rounded, size: 16),
                    label: Text('kpi_board.btn_create_custom_indicator'.tr(ref, fallback: 'Create Custom Indicator')),
                  ),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _metrics.length,
              separatorBuilder: (context, index) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final m = _metrics[index];
                final title = m['title'] as String? ?? 'Metric';
                final cat = m['category'] as String? ?? 'General';
                final desc = m['description'] as String? ?? '';
                final maxScore = m['maxScore'] ?? 100;
                final weight = m['weight'] ?? 1.0;

                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Icon(Icons.analytics_rounded, color: Color(0xFF0050E5), size: 18),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE2E8F0),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    cat.toUpperCase(),
                                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Max: $maxScore • Weight: ${weight}x${desc.isNotEmpty ? ' • $desc' : ''}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit_rounded, size: 15),
                        color: const Color(0xFF0050E5),
                        tooltip: 'Edit Metric',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                        splashRadius: 14,
                        onPressed: () => _openCreateOrEditMetricDialog(existingMetric: m),
                      ),
                      const SizedBox(width: 4),
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, size: 15),
                        color: const Color(0xFFEF4444),
                        tooltip: 'Delete Metric',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                        splashRadius: 14,
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
          LayoutBuilder(
            builder: (context, constraints) {
              final isCompact = constraints.maxWidth < 560;

              final titleSection = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'kpi_board.leaderboard_title'.tr(ref, fallback: 'Member Performance Leaderboard'),
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'kpi_board.leaderboard_subtitle'.tr(ref, fallback: 'Rankings derived from genuine evaluation scorecards'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11.5,
                      color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                    ),
                  ),
                ],
              );

              final controlsSection = Row(
                mainAxisSize: isCompact ? MainAxisSize.max : MainAxisSize.min,
                children: [
                  Expanded(
                    flex: isCompact ? 1 : 0,
                    child: Container(
                      height: 32,
                      constraints: BoxConstraints(minWidth: isCompact ? 0 : 95),
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: isCompact,
                          value: _periods.any((p) => p['title'] == _selectedPeriod)
                              ? _selectedPeriod
                              : (_periods.isNotEmpty ? _periods.first['title'] as String? : null),
                          isDense: true,
                          items: _periods.map((p) {
                            final title = p['title'] as String? ?? 'Period';
                            return DropdownMenuItem(
                              value: title,
                              child: Text(
                                title,
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setState(() => _selectedPeriod = val);
                              _loadLeaderboard();
                            }
                          },
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: _openCreatePeriodDialog,
                    borderRadius: BorderRadius.circular(6),
                    child: Container(
                      height: 32,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: isDark ? AppColors.outlineDark : const Color(0xFFBFDBFE),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.add_rounded, size: 16, color: Color(0xFF0050E5)),
                          const SizedBox(width: 4),
                          Text(
                            'kpi_board.btn_add_period'.tr(ref, fallback: 'Add Period'),
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0050E5),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded, size: 16),
                    tooltip: 'common.refresh'.tr(ref, fallback: 'Refresh'),
                    padding: const EdgeInsets.all(6),
                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                    onPressed: () {
                      _loadLeaderboard();
                    },
                  ),
                ],
              );

              if (isCompact) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    titleSection,
                    const SizedBox(height: 10),
                    controlsSection,
                  ],
                );
              }

              return Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(child: titleSection),
                  const SizedBox(width: 8),
                  controlsSection,
                ],
              );
            },
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
                  Text('kpi_board.empty_scores'.tr(ref, fallback: 'No evaluation scores recorded for @period.').replaceAll('@period', _selectedPeriod), style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
                  const SizedBox(height: 4),
                  Text('kpi_board.empty_scores_hint'.tr(ref, fallback: 'Select a member from the directory to enter this period\'s evaluation.'), style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () => widget.onNavigateToTab?.call(1),
                    child: Text('kpi_board.btn_browse_directory'.tr(ref, fallback: 'Browse Directory to Grade'), style: const TextStyle(fontSize: 12)),
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
                            Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
                            Text('$cat • $email', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)), maxLines: 1, overflow: TextOverflow.ellipsis),
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
                        child: Text('kpi_board.btn_grade'.tr(ref, fallback: 'Grade'), style: const TextStyle(fontSize: 11)),
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
