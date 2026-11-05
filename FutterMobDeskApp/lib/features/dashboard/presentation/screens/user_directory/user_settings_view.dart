import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/central_adjuster.dart';
import '../../../data/account_repository.dart';

/// Screen presenting User Management Settings under User Directory.
/// Replicates Angular Web UserSettingsComponent 1-to-1 with Name Salutation Titles,
/// Honorary Post-nominal Suffixes, Automated Member ID Generation rules,
/// KPI Performance benchmarks, and Directory Governance policies.
class UserSettingsView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Optional navigation callback to other tabs in the shell.
  final void Function(int tabIndex)? onNavigateToTab;

  /// Optional callback to return to the previous screen.
  final VoidCallback? onNavigateBack;

  /// Creates a [UserSettingsView].
  const UserSettingsView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
    this.onNavigateBack,
  });

  @override
  ConsumerState<UserSettingsView> createState() => _UserSettingsViewState();
}

class _UserSettingsViewState extends ConsumerState<UserSettingsView> {
  bool _isLoading = true;
  bool _isSaving = false;

  Map<String, dynamic> _settings = {
    'enableTitle': true,
    'preFilledTitles': 'Mr., Mrs., Ms., Dr., Prof., Engr., Chief, Rev., Pastor',
    'enableSuffix': true,
    'memberIdFormat': 'PrefixYearMonthRandom',
    'memberIdPrefix': 'CC',
    'memberIdPadding': 4,
    'memberIdDelimiter': '-',
    'requireConfirmedEmailToLogin': false,
    'enableUserDeletion': true,
    'enableKpiEvaluations': true,
    'enablePublicLeaderboard': true,
    'defaultKpiPeriodCycle': 'Quarterly',
    'kpiPassingScore': 70,
  };

  List<String> _titleChips = [];
  final _newTitleCtrl = TextEditingController();
  final _prefixCtrl = TextEditingController();
  final _nextNumberCtrl = TextEditingController(text: '1');
  List<Map<String, dynamic>> _formatPreviews = [];

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    _newTitleCtrl.dispose();
    _prefixCtrl.dispose();
    _nextNumberCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    setState(() => _isLoading = true);
    try {
      final repo = ref.read(accountRepositoryProvider);
      final res = await repo.getUserManagementSettings();

      if (mounted) {
        setState(() {
          if (res.isNotEmpty) {
            _settings = Map<String, dynamic>.from(res);
          }
          final titlesStr = _settings['preFilledTitles'] as String? ?? 'Mr., Mrs., Ms., Dr., Prof., Engr., Chief, Rev., Pastor';
          _titleChips = titlesStr.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
          _prefixCtrl.text = _settings['memberIdPrefix'] as String? ?? 'CC';
          final nextNum = _settings['memberIdNextNumber'] ?? _settings['nextNumber'] ?? 1;
          _nextNumberCtrl.text = nextNum.toString();

          if (_settings['previews'] is List) {
            _formatPreviews = List<Map<String, dynamic>>.from(_settings['previews'] as List);
          }
          _generateFallbackPreviews();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        _generateFallbackPreviews();
        setState(() => _isLoading = false);
      }
    }
  }

  void _generateFallbackPreviews() {
    if (_formatPreviews.isNotEmpty) return;
    final prefix = _prefixCtrl.text.trim().isEmpty ? 'CC' : _prefixCtrl.text.trim().toUpperCase();
    final delim = _settings['memberIdDelimiter'] as String? ?? '-';
    final padding = (_settings['memberIdPadding'] as num?)?.toInt() ?? 4;
    final seqNum = '1'.padLeft(padding, '0');

    _formatPreviews = [
      {
        'key': 'PrefixYearMonthRandom',
        'name': 'Prefix + Year + Month + Random',
        'description': 'Year and month coded with random alphanumeric seed.',
        'previewExample': '$prefix${delim}2026${delim}10${delim}9X42',
      },
      {
        'key': 'PrefixYearSequential',
        'name': 'Prefix + Year + Sequential',
        'description': 'Annual rollover numbering with zero-padded counter.',
        'previewExample': '$prefix${delim}2026$delim$seqNum',
      },
      {
        'key': 'PrefixSequential',
        'name': 'Prefix + Sequential Number',
        'description': 'Continuous incremental integer sequence.',
        'previewExample': '$prefix$delim$seqNum',
      },
      {
        'key': 'PrefixCategorySequential',
        'name': 'Prefix + Category Code + Sequential',
        'description': 'Categorized departmental sequence for organizational units.',
        'previewExample': '$prefix${delim}ENG$delim$seqNum',
      },
    ];
  }

  void _updatePreviews() {
    final prefix = _prefixCtrl.text.trim().isEmpty ? 'CC' : _prefixCtrl.text.trim().toUpperCase();
    final delim = _settings['memberIdDelimiter'] as String? ?? '-';
    final padding = (_settings['memberIdPadding'] as num?)?.toInt() ?? 4;
    final startNum = int.tryParse(_nextNumberCtrl.text.trim()) ?? 1;
    final seqNum = startNum.toString().padLeft(padding, '0');

    setState(() {
      _formatPreviews = [
        {
          'key': 'PrefixYearMonthRandom',
          'name': 'Prefix + Year + Month + Random',
          'description': 'Year and month coded with random alphanumeric seed.',
          'previewExample': '$prefix${delim}2026${delim}10${delim}9X42',
        },
        {
          'key': 'PrefixYearSequential',
          'name': 'Prefix + Year + Sequential',
          'description': 'Annual rollover numbering with zero-padded counter.',
          'previewExample': '$prefix${delim}2026$delim$seqNum',
        },
        {
          'key': 'PrefixSequential',
          'name': 'Prefix + Sequential Number',
          'description': 'Continuous incremental integer sequence.',
          'previewExample': '$prefix$delim$seqNum',
        },
        {
          'key': 'PrefixCategorySequential',
          'name': 'Prefix + Category Code + Sequential',
          'description': 'Categorized departmental sequence for organizational units.',
          'previewExample': '$prefix${delim}ENG$delim$seqNum',
        },
      ];
    });
  }

  void _removeTitleChip(String chip) {
    setState(() {
      _titleChips.remove(chip);
      _settings['preFilledTitles'] = _titleChips.join(', ');
    });
  }

  void _addTitleChip() {
    final text = _newTitleCtrl.text.trim();
    if (text.isNotEmpty && !_titleChips.contains(text)) {
      setState(() {
        _titleChips.add(text);
        _settings['preFilledTitles'] = _titleChips.join(', ');
        _newTitleCtrl.clear();
      });
    }
  }

  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);
    _settings['preFilledTitles'] = _titleChips.join(', ');
    _settings['memberIdPrefix'] = _prefixCtrl.text.trim().toUpperCase();
    _settings['memberIdNextNumber'] = int.tryParse(_nextNumberCtrl.text.trim()) ?? 1;

    try {
      final repo = ref.read(accountRepositoryProvider);
      final ok = await repo.saveUserManagementSettings(_settings);
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              ok
                  ? 'user_settings.msg_saved_success'.tr(ref, fallback: 'User management settings saved successfully.')
                  : 'user_settings.err_saved_failed'.tr(ref, fallback: 'Failed to save settings.'),
            ),
            backgroundColor: ok ? const Color(0xFF10B981) : const Color(0xFFEF4444),
          ),
        );
      }
    } catch (_) {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    final enableTitle = _settings['enableTitle'] as bool? ?? true;
    final enableSuffix = _settings['enableSuffix'] as bool? ?? true;
    final enableKpi = _settings['enableKpiEvaluations'] as bool? ?? true;
    final enablePublicLeaderboard = _settings['enablePublicLeaderboard'] as bool? ?? true;
    final requireConfirmedEmail = _settings['requireConfirmedEmailToLogin'] as bool? ?? false;
    final enableUserDeletion = _settings['enableUserDeletion'] as bool? ?? true;
    final passingScore = (_settings['kpiPassingScore'] as num?)?.toInt() ?? 70;
    final currentFormat = _settings['memberIdFormat'] as String? ?? 'PrefixYearMonthRandom';

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ===================================================================
          // STANDARDIZED PAGE HEADER (1-to-1 with Angular AppPageHeader)
          // ===================================================================
          _buildPageHeader(isDark),
          const SizedBox(height: 20),

          // ===================================================================
          // SECTION 1: NAME TITLES & HONORARY SUFFIXES
          // ===================================================================
          _buildSection1TitlesAndSuffixes(isDark, enableTitle, enableSuffix),
          const SizedBox(height: 20),

          // ===================================================================
          // SECTION 2: MEMBER ID GENERATION & NUMBERING RULES
          // ===================================================================
          _buildSection2MemberIdRules(isDark, currentFormat),
          const SizedBox(height: 20),

          // ===================================================================
          // SECTION 3: PERFORMANCE EVALUATIONS & KPI SETTINGS
          // ===================================================================
          _buildSection3KpiSettings(isDark, enableKpi, enablePublicLeaderboard, passingScore),
          const SizedBox(height: 20),

          // ===================================================================
          // SECTION 4: SECURITY & ACCOUNT LIFECYCLE GOVERNANCE
          // ===================================================================
          _buildSection4Governance(isDark, requireConfirmedEmail, enableUserDeletion),
        ],
      ),
    );
  }

  Widget _buildPageHeader(bool isDark) {
    return CentralAdjuster.pageHeader(
      icon: Icons.tune_rounded,
      eyebrow: 'user_settings.header_eyebrow'.tr(ref, fallback: 'USER MANAGEMENT PREFERENCES'),
      title: 'user_settings.header_title'.tr(ref, fallback: 'User Management Settings'),
      subtitle: 'user_settings.header_subtitle'.tr(
        ref,
        fallback: 'Configure name salutations, professional suffixes, member ID generation rules, and directory governance policies.',
      ),
      isDark: isDark,
      onBack: widget.onNavigateBack,
      actions: [
        if (widget.onNavigateBack != null)
          OutlinedButton.icon(
            onPressed: widget.onNavigateBack,
            icon: const Icon(Icons.arrow_back_rounded, size: 16),
            label: Text('user_settings.btn_back'.tr(ref, fallback: 'Back')),
            style: OutlinedButton.styleFrom(
              foregroundColor: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
              side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
            ),
          ),
        OutlinedButton.icon(
          onPressed: () => widget.onNavigateToTab?.call(1),
          icon: const Icon(Icons.groups_rounded, size: 16),
          label: Text('user_settings.btn_directory'.tr(ref, fallback: 'Members Directory')),
          style: OutlinedButton.styleFrom(
            foregroundColor: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
        ),
        FilledButton.icon(
          onPressed: _isSaving ? null : _saveSettings,
          icon: _isSaving
              ? const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Icon(Icons.save_rounded, size: 16),
          label: Text(
            _isSaving
                ? 'user_settings.btn_saving'.tr(ref, fallback: 'Saving...')
                : 'user_settings.btn_save'.tr(ref, fallback: 'Save Settings'),
          ),
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

  Widget _buildSection1TitlesAndSuffixes(bool isDark, bool enableTitle, bool enableSuffix) {
    return _buildSectionContainer(
      isDark: isDark,
      icon: Icons.badge_rounded,
      title: 'user_settings.sec1_title'.tr(ref, fallback: 'Name Titles & Professional Suffixes'),
      subtitle: 'user_settings.sec1_subtitle'.tr(
        ref,
        fallback: 'Control whether salutation titles and honorary suffixes appear on registration and member profiles.',
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Toggle 1: Enable Title
          _buildPreferenceRow(
            isDark: isDark,
            title: 'user_settings.title_enable_label'.tr(ref, fallback: 'Enable Name Title / Salutation'),
            desc: 'user_settings.title_enable_desc'.tr(
              ref,
              fallback: 'When enabled, members and staff select their formal title (e.g. Dr., Prof., Engr.) during onboarding and profile setup.',
            ),
            value: enableTitle,
            statusBadgeText: enableTitle
                ? 'user_settings.badge_enabled'.tr(ref, fallback: 'ENABLED')
                : 'user_settings.badge_disabled'.tr(ref, fallback: 'DISABLED'),
            statusBadgeActive: enableTitle,
            onChanged: (val) => setState(() => _settings['enableTitle'] = val),
          ),

          if (enableTitle) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'user_settings.prefilled_titles_label'.tr(ref, fallback: 'Configured Pre-Filled Titles'),
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'user_settings.active_options_count'.tr(ref, fallback: '({count} active options)')
                            .replaceAll('{count}', _titleChips.length.toString()),
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _titleChips.map((chip) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              chip,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0050E5)),
                            ),
                            const SizedBox(width: 6),
                            InkWell(
                              onTap: () => _removeTitleChip(chip),
                              child: const Icon(Icons.close_rounded, size: 14, color: Color(0xFF0050E5)),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      SizedBox(
                        width: 220,
                        height: 36,
                        child: TextField(
                          controller: _newTitleCtrl,
                          decoration: InputDecoration(
                            hintText: 'user_settings.add_title_ph'.tr(ref, fallback: 'e.g. Barrister, Sheikh'),
                            hintStyle: const TextStyle(fontSize: 12),
                            filled: true,
                            fillColor: isDark ? AppColors.surfaceDark : Colors.white,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton.icon(
                        onPressed: _addTitleChip,
                        icon: const Icon(Icons.add, size: 16),
                        label: Text('user_settings.btn_add_title'.tr(ref, fallback: 'Add Title')),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
          const Divider(height: 32),

          // Toggle 2: Enable Suffix
          _buildPreferenceRow(
            isDark: isDark,
            title: 'user_settings.suffix_enable_label'.tr(ref, fallback: 'Enable Name Suffix (e.g. mni, PhD, Esq, OON)'),
            desc: 'user_settings.suffix_enable_desc'.tr(
              ref,
              fallback: 'When enabled, an open text space is made available on registration and profile forms for professional or honorary post-nominal suffixes. Suffix is freeform text.',
            ),
            value: enableSuffix,
            statusBadgeText: enableSuffix
                ? 'user_settings.badge_enabled'.tr(ref, fallback: 'ENABLED')
                : 'user_settings.badge_disabled'.tr(ref, fallback: 'DISABLED'),
            statusBadgeActive: enableSuffix,
            onChanged: (val) => setState(() => _settings['enableSuffix'] = val),
          ),

          if (enableSuffix) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, color: Color(0xFF0050E5), size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: 'user_settings.suffix_callout_title'.tr(ref, fallback: 'Suffix Input Active: '),
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          TextSpan(
                            text: 'user_settings.suffix_callout_desc1'.tr(ref, fallback: 'Registration page and user directory forms will render an empty text box: '),
                          ),
                          TextSpan(
                            text: 'user_settings.suffix_callout_box'.tr(ref, fallback: 'Suffix: [ e.g. mni, PhD, Esq ]'),
                            style: const TextStyle(fontFamily: 'monospace', color: Color(0xFF0050E5), fontWeight: FontWeight.w700),
                          ),
                          TextSpan(
                            text: 'user_settings.suffix_callout_desc2'.tr(ref, fallback: '. Members can enter their recognized honorific titles.'),
                          ),
                        ],
                      ),
                      style: const TextStyle(fontSize: 12, color: Color(0xFF1E293B)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSection2MemberIdRules(bool isDark, String currentFormat) {
    final activeFormatObj = _formatPreviews.firstWhere(
      (p) => p['key'] == currentFormat,
      orElse: () => _formatPreviews.isNotEmpty ? _formatPreviews.first : {'previewExample': 'CC-2026-0001', 'isSequential': true},
    );
    final activeSample = activeFormatObj['previewExample'] as String? ?? 'CC-2026-0001';
    final isSequential = activeFormatObj['isSequential'] as bool? ?? true;

    return _buildSectionContainer(
      isDark: isDark,
      icon: Icons.tag_rounded,
      title: 'user_settings.sec2_title'.tr(ref, fallback: 'Member ID Generation & Numbering Rules'),
      subtitle: 'user_settings.sec2_subtitle'.tr(
        ref,
        fallback: 'Customize the automated coding pattern, prefix, zero-padding, and delimiter for all newly created accounts.',
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Dynamic Live Preview Box
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1), width: 1.5),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.visibility_outlined, size: 14, color: isDark ? AppColors.gray400 : AppColors.gray600),
                    const SizedBox(width: 6),
                    Text(
                      'user_settings.preview_header'.tr(ref, fallback: 'NEXT GENERATED MEMBER ID PREVIEW'),
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.05,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  activeSample,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'monospace',
                    color: Color(0xFF0050E5),
                    letterSpacing: 0.05,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.check_circle, size: 14, color: Color(0xFF10B981)),
                    const SizedBox(width: 5),
                    Text(
                      isSequential
                          ? 'user_settings.seq_strict'.tr(ref, fallback: 'Strict Serial Auto-Incrementing Sequence (1, 2, 3...)')
                          : 'user_settings.seq_crypto'.tr(ref, fallback: 'Cryptographic Random Secure Format'),
                      style: TextStyle(fontSize: 11, color: isDark ? AppColors.gray400 : AppColors.gray600),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 4 Token Controls
          LayoutBuilder(
            builder: (context, constraints) {
              final isPhone = constraints.maxWidth < 500;
              final isNarrow = constraints.maxWidth < 750;
              if (isPhone) {
                return Column(
                  children: [
                    _buildPrefixField(isDark),
                    const SizedBox(height: 12),
                    _buildNextNumberField(isDark),
                    const SizedBox(height: 12),
                    _buildPaddingDropdown(isDark),
                    const SizedBox(height: 12),
                    _buildDelimiterDropdown(isDark),
                  ],
                );
              }
              if (isNarrow) {
                return Column(
                  children: [
                    Row(
                      children: [
                        Expanded(child: _buildPrefixField(isDark)),
                        const SizedBox(width: 14),
                        Expanded(child: _buildNextNumberField(isDark)),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(child: _buildPaddingDropdown(isDark)),
                        const SizedBox(width: 14),
                        Expanded(child: _buildDelimiterDropdown(isDark)),
                      ],
                    ),
                  ],
                );
              }
              return Row(
                children: [
                  Expanded(child: _buildPrefixField(isDark)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildNextNumberField(isDark)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildPaddingDropdown(isDark)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildDelimiterDropdown(isDark)),
                ],
              );
            },
          ),
          const SizedBox(height: 20),

          Text(
            'user_settings.active_pattern_label'.tr(ref, fallback: 'ACTIVE GENERATION PATTERN'),
            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600),
          ),
          const SizedBox(height: 10),

          CentralAdjuster.grid(
            minItemWidth: 220,
            spacing: 14,
            runSpacing: 14,
            maxColumns: 4,
            children: _formatPreviews.map((p) {
              final isSelected = currentFormat == p['key'];
              return InkWell(
                onTap: () {
                  setState(() => _settings['memberIdFormat'] = p['key']);
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF))
                        : (isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC)),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFF0050E5)
                          : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            p['name'] as String? ?? 'Pattern',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: isSelected ? const Color(0xFF0050E5) : (isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A)),
                            ),
                          ),
                          Icon(
                            isSelected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                            color: isSelected ? const Color(0xFF0050E5) : const Color(0xFFCBD5E1),
                            size: 16,
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isSelected ? Colors.white : (isDark ? const Color(0xFF0F172A) : Colors.white),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                        ),
                        child: Text(
                          p['previewExample'] as String? ?? 'CC-0001',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, fontFamily: 'monospace', color: Color(0xFF0050E5)),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        p['description'] as String? ?? '',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildPrefixField(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'user_settings.field_prefix'.tr(ref, fallback: 'PREFIX CODE'),
          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _prefixCtrl,
          onChanged: (_) => _updatePreviews(),
          decoration: InputDecoration(
            hintText: 'user_settings.field_prefix_ph'.tr(ref, fallback: 'e.g. CC or ID'),
            filled: true,
            fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
        ),
      ],
    );
  }

  Widget _buildNextNumberField(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'user_settings.field_next_num'.tr(ref, fallback: 'NEXT SERIAL COUNTER'),
          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _nextNumberCtrl,
          keyboardType: TextInputType.number,
          onChanged: (_) => _updatePreviews(),
          decoration: InputDecoration(
            hintText: '1',
            filled: true,
            fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
        ),
      ],
    );
  }

  Widget _buildPaddingDropdown(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'user_settings.field_padding'.tr(ref, fallback: 'ZERO-PADDING WIDTH'),
          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600),
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<int>(
          isExpanded: true,
          initialValue: (_settings['memberIdPadding'] as num?)?.toInt() ?? 4,
          decoration: InputDecoration(
            filled: true,
            fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
          items: [
            DropdownMenuItem(value: 3, child: Text('user_settings.pad_3'.tr(ref, fallback: '3 Digits (001)'), style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis)),
            DropdownMenuItem(value: 4, child: Text('user_settings.pad_4'.tr(ref, fallback: '4 Digits (0001)'), style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis)),
            DropdownMenuItem(value: 5, child: Text('user_settings.pad_5'.tr(ref, fallback: '5 Digits (00001)'), style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis)),
            DropdownMenuItem(value: 6, child: Text('user_settings.pad_6'.tr(ref, fallback: '6 Digits (000001)'), style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis)),
          ],
          onChanged: (val) {
            if (val != null) {
              _settings['memberIdPadding'] = val;
              _updatePreviews();
            }
          },
        ),
      ],
    );
  }

  Widget _buildDelimiterDropdown(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'user_settings.field_delim'.tr(ref, fallback: 'DELIMITER SEPARATOR'),
          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600),
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          isExpanded: true,
          initialValue: _settings['memberIdDelimiter'] as String? ?? '-',
          decoration: InputDecoration(
            filled: true,
            fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
          items: [
            DropdownMenuItem(value: '-', child: Text('user_settings.delim_hyphen'.tr(ref, fallback: 'Hyphen (-)'), style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis)),
            DropdownMenuItem(value: '/', child: Text('user_settings.delim_slash'.tr(ref, fallback: 'Forward Slash (/)'), style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis)),
            DropdownMenuItem(value: '_', child: Text('user_settings.delim_underscore'.tr(ref, fallback: 'Underscore (_)'), style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis)),
            DropdownMenuItem(value: '.', child: Text('user_settings.delim_dot'.tr(ref, fallback: 'Dot (.)'), style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis)),
          ],
          onChanged: (val) {
            if (val != null) {
              _settings['memberIdDelimiter'] = val;
              _updatePreviews();
            }
          },
        ),
      ],
    );
  }

  Widget _buildSection3KpiSettings(bool isDark, bool enableKpi, bool enablePublicLeaderboard, int passingScore) {
    return _buildSectionContainer(
      isDark: isDark,
      icon: Icons.analytics_rounded,
      title: 'user_settings.sec3_title'.tr(ref, fallback: 'Performance Evaluations & KPI Settings'),
      subtitle: 'user_settings.sec3_subtitle'.tr(
        ref,
        fallback: 'Configure scorecard evaluation cycles, passing benchmarks, and public member leaderboard visibility.',
      ),
      child: Column(
        children: [
          _buildPreferenceRow(
            isDark: isDark,
            title: 'user_settings.kpi_enable_label'.tr(ref, fallback: 'Enable Member KPI Evaluations'),
            desc: 'user_settings.kpi_enable_desc'.tr(
              ref,
              fallback: 'Activate performance scorecards and multi-factor evaluation rubrics for members and staff across the tenant.',
            ),
            value: enableKpi,
            statusBadgeText: enableKpi
                ? 'user_settings.badge_enabled'.tr(ref, fallback: 'ENABLED')
                : 'user_settings.badge_disabled'.tr(ref, fallback: 'DISABLED'),
            statusBadgeActive: enableKpi,
            onChanged: (val) => setState(() => _settings['enableKpiEvaluations'] = val),
          ),
          const Divider(height: 24),
          _buildPreferenceRow(
            isDark: isDark,
            title: 'user_settings.kpi_board_label'.tr(ref, fallback: 'Public Member Leaderboard Visibility'),
            desc: 'user_settings.kpi_board_desc'.tr(
              ref,
              fallback: 'Display top performing members on community portals and member directories.',
            ),
            value: enablePublicLeaderboard,
            statusBadgeText: enablePublicLeaderboard
                ? 'user_settings.badge_visible'.tr(ref, fallback: 'VISIBLE')
                : 'user_settings.badge_hidden'.tr(ref, fallback: 'HIDDEN'),
            statusBadgeActive: enablePublicLeaderboard,
            onChanged: (val) => setState(() => _settings['enablePublicLeaderboard'] = val),
          ),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) {
              final isCompact = constraints.maxWidth < 500;

              final cycleSection = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'user_settings.kpi_cycle_label'.tr(ref, fallback: 'DEFAULT EVALUATION CYCLE'),
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: _settings['defaultKpiPeriodCycle'] as String? ?? 'Quarterly',
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    items: [
                      DropdownMenuItem(
                        value: 'Quarterly',
                        child: Text('user_settings.cycle_quarterly'.tr(ref, fallback: 'Quarterly (Every 3 Months)'), style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis),
                      ),
                      DropdownMenuItem(
                        value: 'Semi-Annually',
                        child: Text('user_settings.cycle_semiannual'.tr(ref, fallback: 'Semi-Annually (Every 6 Months)'), style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis),
                      ),
                      DropdownMenuItem(
                        value: 'Annually',
                        child: Text('user_settings.cycle_annual'.tr(ref, fallback: 'Annually (Year-End Review)'), style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis),
                      ),
                      DropdownMenuItem(
                        value: 'Monthly',
                        child: Text('user_settings.cycle_monthly'.tr(ref, fallback: 'Monthly (Sprint Review)'), style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis),
                      ),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _settings['defaultKpiPeriodCycle'] = val);
                    },
                  ),
                ],
              );

              final benchmarkSection = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'user_settings.kpi_benchmark_label'.tr(ref, fallback: 'BENCHMARK PASSING SCORE'),
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.gray400 : AppColors.gray600,
                        ),
                      ),
                      Text(
                        '$passingScore%',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0050E5)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Slider(
                    value: passingScore.toDouble(),
                    min: 50,
                    max: 100,
                    divisions: 10,
                    label: '$passingScore%',
                    onChanged: (val) => setState(() => _settings['kpiPassingScore'] = val.toInt()),
                  ),
                ],
              );

              if (isCompact) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    cycleSection,
                    const SizedBox(height: 14),
                    benchmarkSection,
                  ],
                );
              }

              return Row(
                children: [
                  Expanded(child: cycleSection),
                  const SizedBox(width: 14),
                  Expanded(child: benchmarkSection),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSection4Governance(bool isDark, bool requireConfirmedEmail, bool enableUserDeletion) {
    return _buildSectionContainer(
      isDark: isDark,
      icon: Icons.shield_rounded,
      title: 'user_settings.sec4_title'.tr(ref, fallback: 'Security & Account Lifecycle Governance'),
      subtitle: 'user_settings.sec4_subtitle'.tr(
        ref,
        fallback: 'Enforce authentication security rules and profile removal permissions.',
      ),
      child: Column(
        children: [
          _buildPreferenceRow(
            isDark: isDark,
            title: 'user_settings.gov_email_confirm_label'.tr(ref, fallback: 'Require Confirmed Email to Log In'),
            desc: 'user_settings.gov_email_confirm_desc'.tr(
              ref,
              fallback: 'Mandate email address confirmation before allowing account sign-in access.',
            ),
            value: requireConfirmedEmail,
            statusBadgeText: requireConfirmedEmail
                ? 'user_settings.badge_enforced'.tr(ref, fallback: 'ENFORCED')
                : 'user_settings.badge_off'.tr(ref, fallback: 'OFF'),
            statusBadgeActive: requireConfirmedEmail,
            onChanged: (val) => setState(() => _settings['requireConfirmedEmailToLogin'] = val),
          ),
          const Divider(height: 24),
          _buildPreferenceRow(
            isDark: isDark,
            title: 'user_settings.gov_delete_label'.tr(ref, fallback: 'Allow Administrator Account Deletion'),
            desc: 'user_settings.gov_delete_desc'.tr(
              ref,
              fallback: 'Permit workspace administrators to delete member accounts and archive historical audit logs.',
            ),
            value: enableUserDeletion,
            statusBadgeText: enableUserDeletion
                ? 'user_settings.badge_allowed'.tr(ref, fallback: 'ALLOWED')
                : 'user_settings.badge_prohibited'.tr(ref, fallback: 'PROHIBITED'),
            statusBadgeActive: enableUserDeletion,
            onChanged: (val) => setState(() => _settings['enableUserDeletion'] = val),
          ),
        ],
      ),
    );
  }

  Widget _buildPreferenceRow({
    required bool isDark,
    required String title,
    required String desc,
    required bool value,
    required String statusBadgeText,
    required bool statusBadgeActive,
    required ValueChanged<bool> onChanged,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8,
                runSpacing: 4,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: statusBadgeActive ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      statusBadgeText,
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                        color: statusBadgeActive ? const Color(0xFF15803D) : const Color(0xFF64748B),
                        letterSpacing: 0.04,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                desc,
                style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Switch(
          value: value,
          onChanged: onChanged,
        ),
      ],
    );
  }

  Widget _buildSectionContainer({
    required bool isDark,
    required IconData icon,
    required String title,
    required String subtitle,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
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
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      subtitle,
                      softWrap: true,
                      style: TextStyle(
                        fontSize: 11.5,
                        color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}
