import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';

/// Screen presenting the Administrative Registration Form Builder under User Directory.
/// Replicates Angular Web RegistrationFormBuilderComponent 1-to-1 with live policy governance,
/// layout architecture modes, built-in core credentials, and full custom onboarding question CRUD.
class RegistrationFormBuilderView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Optional navigation callback to other tabs in the shell.
  final void Function(int tabIndex)? onNavigateToTab;

  /// Creates a [RegistrationFormBuilderView].
  const RegistrationFormBuilderView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
  });

  @override
  ConsumerState<RegistrationFormBuilderView> createState() => _RegistrationFormBuilderViewState();
}

class _RegistrationFormBuilderViewState extends ConsumerState<RegistrationFormBuilderView> {
  bool _isLoading = true;
  bool _isSavingPolicy = false;

  Map<String, dynamic> _policy = {
    'allowPublicRegistration': true,
    'requireApprovalBeforeLogin': false,
    'enableAffiliateReferralCode': true,
    'registrationUrlSlug': 'register',
    'defaultIndustrySector': 'Business & Enterprise',
    'registrationFormTitle': 'Create Your Account',
    'registrationWelcomeMessage': 'Join our member directory and workspace portal.',
    'registrationSuccessMessage': 'Registration successful! Welcome to the portal.',
    'formLayoutMode': 'sections',
    'requirePassword': true,
    'allowSaveAndContinue': false,
  };

  List<Map<String, dynamic>> _customFields = [];
  List<Map<String, dynamic>> _categories = [];

  final _titleCtrl = TextEditingController();
  final _welcomeCtrl = TextEditingController();
  final _successCtrl = TextEditingController();
  final _slugCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _welcomeCtrl.dispose();
    _successCtrl.dispose();
    _slugCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final repo = ref.read(accountRepositoryProvider);
      final policyRes = await repo.getRegistrationPolicy();
      final fieldsRes = await repo.getRegistrationFields();
      final catsRes = await repo.getCategories();

      if (mounted) {
        setState(() {
          if (policyRes.isNotEmpty) {
            _policy = Map<String, dynamic>.from(policyRes);
          }
          _titleCtrl.text = _policy['registrationFormTitle'] as String? ?? 'Create Your Account';
          _welcomeCtrl.text = _policy['registrationWelcomeMessage'] as String? ?? 'Join our member directory and workspace portal.';
          _successCtrl.text = _policy['registrationSuccessMessage'] as String? ?? 'Registration successful! Welcome to the portal.';
          _slugCtrl.text = _policy['registrationUrlSlug'] as String? ?? 'register';

          _customFields = fieldsRes;
          _categories = catsRes;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _savePolicy() async {
    setState(() => _isSavingPolicy = true);
    _policy['registrationFormTitle'] = _titleCtrl.text.trim();
    _policy['registrationWelcomeMessage'] = _welcomeCtrl.text.trim();
    _policy['registrationSuccessMessage'] = _successCtrl.text.trim();
    _policy['registrationUrlSlug'] = _slugCtrl.text.trim().toLowerCase();

    try {
      final repo = ref.read(accountRepositoryProvider);
      final ok = await repo.saveRegistrationPolicy(_policy);
      if (mounted) {
        setState(() => _isSavingPolicy = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(ok ? 'Registration policies saved successfully.' : 'Failed to save policies.'),
            backgroundColor: ok ? const Color(0xFF10B981) : const Color(0xFFEF4444),
          ),
        );
      }
    } catch (_) {
      if (mounted) setState(() => _isSavingPolicy = false);
    }
  }

  void _openCreateOrEditQuestionDialog({Map<String, dynamic>? existingField}) {
    final isEditing = existingField != null;
    final labelCtrl = TextEditingController(text: existingField?['label'] as String? ?? '');
    final keyCtrl = TextEditingController(text: existingField?['fieldKey'] as String? ?? '');
    final placeholderCtrl = TextEditingController(text: existingField?['placeholder'] as String? ?? '');
    final helpTextCtrl = TextEditingController(text: existingField?['helpText'] as String? ?? '');
    final optionsCtrl = TextEditingController(
      text: (existingField?['options'] is List) ? (existingField!['options'] as List).join(', ') : '',
    );
    String selectedType = existingField?['fieldType'] as String? ?? 'text';
    String? selectedCategoryId = existingField?['bcpUserCategoryId'] as String?;
    bool isRequired = existingField?['isRequired'] as bool? ?? false;
    bool showInProfile = existingField?['showInWorkspaceProfile'] as bool? ?? true;
    bool isSaving = false;

    final fieldTypes = [
      {'key': 'text', 'name': 'Text Input (Single Line)'},
      {'key': 'textarea', 'name': 'Textarea (Multi-Line)'},
      {'key': 'number', 'name': 'Numeric Field'},
      {'key': 'date', 'name': 'Date Picker'},
      {'key': 'select', 'name': 'Dropdown Selection'},
      {'key': 'file', 'name': 'Document / File Upload'},
      {'key': 'checkbox', 'name': 'Checkbox Confirmation'},
    ];

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
                    isEditing ? Icons.edit_note_rounded : Icons.add_circle_outline_rounded,
                    color: AppColors.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  isEditing ? 'Edit Custom Question' : 'Add Custom Onboarding Question',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
            content: SizedBox(
              width: 520,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'QUESTION LABEL *',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: labelCtrl,
                      onChanged: (val) {
                        if (!isEditing && keyCtrl.text.isEmpty) {
                          setDialogState(() {
                            keyCtrl.text = val.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '_');
                          });
                        }
                      },
                      decoration: InputDecoration(
                        hintText: 'e.g. Highest Educational Qualification',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                              Text(
                                'FIELD KEY (IDENTIFIER) *',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                                ),
                              ),
                              const SizedBox(height: 6),
                              TextField(
                                controller: keyCtrl,
                                decoration: InputDecoration(
                                  hintText: 'e.g. educational_qualification',
                                  filled: true,
                                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                              Text(
                                'FIELD TYPE *',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                                ),
                              ),
                              const SizedBox(height: 6),
                              DropdownButtonFormField<String>(
                                initialValue: selectedType,
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                items: fieldTypes.map((t) {
                                  return DropdownMenuItem<String>(
                                    value: t['key']!,
                                    child: Text(t['name']!, style: const TextStyle(fontSize: 12)),
                                  );
                                }).toList(),
                                onChanged: (val) {
                                  if (val != null) setDialogState(() => selectedType = val);
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    if (selectedType == 'select') ...[
                      Text(
                        'DROPDOWN OPTIONS (COMMA SEPARATED)',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.gray400 : AppColors.gray600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: optionsCtrl,
                        decoration: InputDecoration(
                          hintText: 'e.g. High School, Bachelor, Master, PhD',
                          filled: true,
                          fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],

                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'PLACEHOLDER TEXT',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                                ),
                              ),
                              const SizedBox(height: 6),
                              TextField(
                                controller: placeholderCtrl,
                                decoration: InputDecoration(
                                  hintText: 'e.g. Select your qualification',
                                  filled: true,
                                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                              Text(
                                'ASSIGNED CATEGORY SCOPE',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                                ),
                              ),
                              const SizedBox(height: 6),
                              DropdownButtonFormField<String?>(
                                initialValue: selectedCategoryId,
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                items: [
                                  const DropdownMenuItem<String?>(
                                    value: null,
                                    child: Text('All Categories (Global)', style: TextStyle(fontSize: 12)),
                                  ),
                                  ..._categories.map((c) {
                                    return DropdownMenuItem<String?>(
                                      value: c['id'] as String?,
                                      child: Text(c['name'] as String? ?? 'Category', style: const TextStyle(fontSize: 12)),
                                    );
                                  }),
                                ],
                                onChanged: (val) => setDialogState(() => selectedCategoryId = val),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    Text(
                      'HELPER / TOOLTIP HINT',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: helpTextCtrl,
                      decoration: InputDecoration(
                        hintText: 'Guidance shown beneath the question label',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 16),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Switch(
                              value: isRequired,
                              onChanged: (val) => setDialogState(() => isRequired = val),
                            ),
                            const SizedBox(width: 8),
                            const Text('Mandatory / Required Field', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                          ],
                        ),
                        Row(
                          children: [
                            Switch(
                              value: showInProfile,
                              onChanged: (val) => setDialogState(() => showInProfile = val),
                            ),
                            const SizedBox(width: 8),
                            const Text('Show in Profile Card', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ],
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
                        final label = labelCtrl.text.trim();
                        final key = keyCtrl.text.trim();
                        if (label.isEmpty || key.isEmpty) return;

                        setDialogState(() => isSaving = true);
                        final options = optionsCtrl.text
                            .split(',')
                            .map((s) => s.trim())
                            .where((s) => s.isNotEmpty)
                            .toList();

                        final payload = {
                          'label': label,
                          'fieldKey': key,
                          'fieldType': selectedType,
                          'placeholder': placeholderCtrl.text.trim(),
                          'helpText': helpTextCtrl.text.trim(),
                          'options': options,
                          'bcpUserCategoryId': selectedCategoryId,
                          'isRequired': isRequired,
                          'showInWorkspaceProfile': showInProfile,
                          'isActive': true,
                        };

                        try {
                          final repo = ref.read(accountRepositoryProvider);
                          if (isEditing) {
                            final id = existingField['id'] as String;
                            await repo.updateRegistrationField(id, payload);
                          } else {
                            await repo.createRegistrationField(payload);
                          }
                          if (ctx.mounted) Navigator.of(ctx).pop();
                          _loadData();
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
                label: Text(isEditing ? 'Save Changes' : 'Add Question'),
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

  void _confirmDeleteQuestion(Map<String, dynamic> field) {
    final fieldId = field['id'] as String? ?? '';
    final label = field['label'] as String? ?? 'Question';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Question'),
        content: Text('Are you sure you want to delete custom question "$label"? Any saved values on member profiles will remain archived.'),
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
                await repo.deleteRegistrationField(fieldId);
                _loadData();
              } catch (_) {}
            },
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete'),
          ),
        ],
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

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ===================================================================
          // PAGE HEADER (1-to-1 with Angular AppPageHeader)
          // ===================================================================
          _buildPageHeader(isDark),
          const SizedBox(height: 20),

          // ===================================================================
          // MASTER POLICY CONFIGURATION CARD
          // ===================================================================
          _buildPolicyCard(isDark),
          const SizedBox(height: 20),

          // ===================================================================
          // ROW 1: PRESENTATION & FLOW ARCHITECTURE SELECTOR
          // ===================================================================
          _buildLayoutModeSelector(isDark),
          const SizedBox(height: 20),

          // ===================================================================
          // ROW 2: SECURITY & SESSION CONTINUITY POLICIES
          // ===================================================================
          _buildSecurityPoliciesRow(isDark),
          const SizedBox(height: 20),

          // ===================================================================
          // ROW 3: CATEGORY / STEP HIERARCHY & ONBOARDING QUESTIONS
          // ===================================================================
          _buildQuestionsSection(isDark),
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
                child: const Icon(Icons.how_to_reg_rounded, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'USER MANAGEMENT & ONBOARDING',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.06,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Registration Form Builder',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Configure custom onboarding questions, field types, and registration rules for your business.',
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
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Live Get Started URL: /auth/${_slugCtrl.text}'),
                      backgroundColor: const Color(0xFF0050E5),
                    ),
                  );
                },
                icon: const Icon(Icons.open_in_new_rounded, size: 16),
                label: const Text('Live "Get Started" Page'),
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
                onPressed: () => _openCreateOrEditQuestionDialog(),
                icon: const Icon(Icons.add_circle_rounded, size: 16),
                label: const Text('Add Custom Question'),
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

  Widget _buildPolicyCard(bool isDark) {
    final allowPublic = _policy['allowPublicRegistration'] as bool? ?? true;
    final requireApproval = _policy['requireApprovalBeforeLogin'] as bool? ?? false;
    final affiliateCode = _policy['enableAffiliateReferralCode'] as bool? ?? true;

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
              Row(
                children: [
                  const Icon(Icons.policy_rounded, color: Color(0xFF0050E5), size: 22),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Self-Registration & Approval Governance',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        'Global onboarding policies, URL slug routing, and welcome messaging.',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              FilledButton.icon(
                onPressed: _isSavingPolicy ? null : _savePolicy,
                icon: _isSavingPolicy
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.save_rounded, size: 16),
                label: Text(_isSavingPolicy ? 'Saving...' : 'Save Policies'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 3-Column Toggle Row
          Wrap(
            spacing: 14,
            runSpacing: 14,
            children: [
              _buildToggleBox(
                isDark: isDark,
                title: 'Public "Get Started"',
                desc: allowPublic ? 'Open self-registration active.' : 'Invite-only registration.',
                value: allowPublic,
                onChanged: (val) => setState(() => _policy['allowPublicRegistration'] = val),
              ),
              _buildToggleBox(
                isDark: isDark,
                title: 'Require Admin Approval',
                desc: requireApproval ? 'Accounts start in Pending status.' : 'Instant activation on signup.',
                value: requireApproval,
                onChanged: (val) => setState(() => _policy['requireApprovalBeforeLogin'] = val),
              ),
              _buildToggleBox(
                isDark: isDark,
                title: 'Affiliate Promo Code',
                desc: affiliateCode ? 'Referral promo prompt shown.' : 'Referral input hidden.',
                value: affiliateCode,
                onChanged: (val) => setState(() => _policy['enableAffiliateReferralCode'] = val),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Custom URL Slug & Industry Sector Inputs
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'REGISTRATION URL SLUG',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _slugCtrl,
                      decoration: InputDecoration(
                        prefixText: '/auth/',
                        hintText: 'register',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                    Text(
                      'DEFAULT INDUSTRY SECTOR',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: _policy['defaultIndustrySector'] as String? ?? 'Business & Enterprise',
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'Business & Enterprise', child: Text('Business & Enterprise', style: TextStyle(fontSize: 12.5))),
                        DropdownMenuItem(value: 'Education & Academy', child: Text('Education & Academy', style: TextStyle(fontSize: 12.5))),
                        DropdownMenuItem(value: 'Healthcare & Care Services', child: Text('Healthcare & Care Services', style: TextStyle(fontSize: 12.5))),
                        DropdownMenuItem(value: 'Non-Profit & Foundation', child: Text('Non-Profit & Foundation', style: TextStyle(fontSize: 12.5))),
                        DropdownMenuItem(value: 'Government & Public Agency', child: Text('Government & Public Agency', style: TextStyle(fontSize: 12.5))),
                        DropdownMenuItem(value: 'Technology & Software', child: Text('Technology & Software', style: TextStyle(fontSize: 12.5))),
                        DropdownMenuItem(value: 'Community & Alumni Association', child: Text('Community & Alumni Association', style: TextStyle(fontSize: 12.5))),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _policy['defaultIndustrySector'] = val);
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Titles & Copy Grid
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'REGISTRATION FORM TITLE',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _titleCtrl,
                      decoration: InputDecoration(
                        hintText: 'Create Your Account',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                    Text(
                      'WELCOME SUBTITLE',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _welcomeCtrl,
                      decoration: InputDecoration(
                        hintText: 'Join our member directory...',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                    Text(
                      'SUCCESS CONFIRMATION MESSAGE',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _successCtrl,
                      decoration: InputDecoration(
                        hintText: 'Registration successful!',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildToggleBox({
    required bool isDark,
    required String title,
    required String desc,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      width: 320,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: value
              ? const Color(0xFF0050E5)
              : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildLayoutModeSelector(bool isDark) {
    final currentMode = _policy['formLayoutMode'] as String? ?? 'sections';

    final modes = [
      {
        'key': 'single',
        'title': 'Single Continuous Form',
        'desc': 'Single scrolling page with all questions in unified container.',
        'icon': Icons.splitscreen_rounded,
      },
      {
        'key': 'sections',
        'title': 'Categorized Fieldsets',
        'desc': 'Group related questions into categorized cards with clear dividers.',
        'icon': Icons.dashboard_customize_rounded,
      },
      {
        'key': 'stepper',
        'title': 'Step-by-Step Wizard',
        'desc': 'Numbered interactive wizard stepper (1-2-3-4) with progress bar.',
        'icon': Icons.linear_scale_rounded,
      },
      {
        'key': 'pages',
        'title': 'Page-by-Page Form',
        'desc': 'Distinct multi-page pagination experience (Page 1 of N).',
        'icon': Icons.auto_stories_rounded,
      },
    ];

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
          Text(
            'PRESENTATION & FLOW ARCHITECTURE',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.05,
              color: isDark ? AppColors.gray400 : AppColors.gray600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Select how applicants experience the registration onboarding workflow',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) {
              final width = constraints.maxWidth;
              final crossAxisCount = width >= 900 ? 4 : (width >= 500 ? 2 : 1);
              final childAspectRatio = width >= 900 ? 1.22 : (width >= 500 ? 1.45 : 2.2);

              return GridView.count(
                crossAxisCount: crossAxisCount,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: childAspectRatio,
                children: modes.map((m) {
                  final isSelected = currentMode == m['key'];
                  return InkWell(
                    onTap: () {
                      setState(() => _policy['formLayoutMode'] = m['key']);
                      _savePolicy();
                    },
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Icon(m['icon'] as IconData, color: isSelected ? const Color(0xFF0050E5) : const Color(0xFF64748B), size: 20),
                              Icon(
                                isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_unchecked_rounded,
                                color: isSelected ? const Color(0xFF0050E5) : const Color(0xFFCBD5E1),
                                size: 16,
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            m['title'] as String,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              height: 1.15,
                              color: isSelected ? const Color(0xFF0050E5) : (isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A)),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            m['desc'] as String,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 10, height: 1.2, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSecurityPoliciesRow(bool isDark) {
    final reqPwd = _policy['requirePassword'] as bool? ?? true;
    final allowSave = _policy['allowSaveAndContinue'] as bool? ?? false;

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
          Text(
            'SECURITY & SESSION CONTINUITY POLICIES',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.05,
              color: isDark ? AppColors.gray400 : AppColors.gray600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Set credential requirements and session resume capability',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildToggleBox(
                  isDark: isDark,
                  title: 'Require Password Creation',
                  desc: reqPwd
                      ? 'Applicants must set password during registration.'
                      : 'Passwordless registration via email magic link.',
                  value: reqPwd,
                  onChanged: (val) {
                    setState(() => _policy['requirePassword'] = val);
                    _savePolicy();
                  },
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: _buildToggleBox(
                  isDark: isDark,
                  title: 'Allow "Save & Continue Later"',
                  desc: allowSave
                      ? 'Applicants can save partial progress and receive resume link.'
                      : 'Applicants must complete registration in a single session.',
                  value: allowSave,
                  onChanged: (val) {
                    setState(() => _policy['allowSaveAndContinue'] = val);
                    _savePolicy();
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionsSection(bool isDark) {
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
                    'CATEGORY / STEP HIERARCHY & ONBOARDING QUESTIONS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.05,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Manage core credentials and organize business questions into sections',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
              FilledButton.icon(
                onPressed: () => _openCreateOrEditQuestionDialog(),
                icon: const Icon(Icons.add_rounded, size: 16),
                label: const Text('Add Question'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Built-in Core Credentials Box
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
                    const Icon(Icons.admin_panel_settings_rounded, color: Color(0xFF0050E5), size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Default Category 1: Personal & Account Credentials',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'System Protected',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0050E5),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _buildCoreBadge('First & Last Name', 'Mandatory'),
                    _buildCoreBadge('Work Email Address', 'Mandatory'),
                    _buildCoreBadge('Account Password', 'Required by Policy'),
                    _buildCoreBadge('Department / Category', 'Active'),
                    _buildCoreBadge('Mobile Phone Number', 'Optional'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Custom Questions Header
          Text(
            'CUSTOM BUSINESS QUESTIONS (${_customFields.length})',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.05,
              color: isDark ? AppColors.gray400 : AppColors.gray600,
            ),
          ),
          const SizedBox(height: 10),

          if (_customFields.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 36),
              alignment: Alignment.center,
              child: Column(
                children: [
                  const Icon(Icons.dynamic_form_rounded, size: 36, color: Color(0xFFCBD5E1)),
                  const SizedBox(height: 8),
                  const Text('No custom questions added yet.', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: () => _openCreateOrEditQuestionDialog(),
                    icon: const Icon(Icons.add_rounded, size: 16),
                    label: const Text('Add Custom Question'),
                  ),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _customFields.length,
              separatorBuilder: (context, index) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final f = _customFields[index];
                final label = f['label'] as String? ?? 'Question';
                final key = f['fieldKey'] as String? ?? '';
                final type = f['fieldType'] as String? ?? 'text';
                final isReq = f['isRequired'] as bool? ?? false;
                final catName = f['categoryName'] as String? ?? 'Global';

                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.drag_indicator_rounded, size: 18, color: Color(0xFF94A3B8)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              label,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              'Key: $key • Type: $type • Scope: $catName',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                      if (isReq)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          margin: const EdgeInsets.only(right: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'Required',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF0050E5)),
                          ),
                        ),
                      IconButton(
                        icon: const Icon(Icons.edit_rounded, size: 16),
                        color: const Color(0xFF0050E5),
                        tooltip: 'Edit Question',
                        onPressed: () => _openCreateOrEditQuestionDialog(existingField: f),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, size: 16),
                        color: const Color(0xFFEF4444),
                        tooltip: 'Delete Question',
                        onPressed: () => _confirmDeleteQuestion(f),
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

  Widget _buildCoreBadge(String label, String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF10B981)),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
          const SizedBox(width: 6),
          Text('($status)', style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
        ],
      ),
    );
  }
}
