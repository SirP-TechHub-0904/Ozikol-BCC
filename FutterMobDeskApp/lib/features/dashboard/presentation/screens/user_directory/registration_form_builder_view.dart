import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/page_header.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Pre-configured industry template archetype for 1-click onboarding scaffolding.
/// Matches Angular client IndustryTemplate interface 1-to-1.
/// </summary>
class _IndustryTemplate {
  final String key;
  final String name;
  final String description;
  final IconData icon;
  final Color color;
  final Color bgColor;
  final int fieldCount;
  final String layoutMode;
  final String layoutBadge;
  final String layoutName;
  final String layoutReason;
  final List<Map<String, dynamic>> sampleQuestions;

  const _IndustryTemplate({
    required this.key,
    required this.name,
    required this.description,
    required this.icon,
    required this.color,
    required this.bgColor,
    required this.fieldCount,
    required this.layoutMode,
    required this.layoutBadge,
    required this.layoutName,
    required this.layoutReason,
    required this.sampleQuestions,
  });
}

/// <summary>
/// Administrative Registration Form Builder screen under User Directory.
/// Replicates Angular Web RegistrationFormBuilderComponent 1-to-1 with live policy governance,
/// 1-click sector templates, presentation layout modes, built-in core credentials, custom onboarding
/// question CRUD, and a real-time dark interactive live simulation sandbox.
/// </summary>
class RegistrationFormBuilderView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Optional navigation callback to other tabs in the shell.
  final void Function(int tabIndex)? onNavigateToTab;

  /// Optional callback to navigate back to previous screen.
  final VoidCallback? onNavigateBack;

  /// Creates a [RegistrationFormBuilderView].
  const RegistrationFormBuilderView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
    this.onNavigateBack,
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
    'unpublishedCoreFields': <String>[],
    'customSections': <String>['Academic Background', 'Corporate Details'],
  };

  List<Map<String, dynamic>> _customFields = [];
  List<Map<String, dynamic>> _categories = [];

  final _titleCtrl = TextEditingController();
  final _welcomeCtrl = TextEditingController();
  final _successCtrl = TextEditingController();
  final _slugCtrl = TextEditingController();
  final _templateScrollCtrl = ScrollController();

  // ---------------------------------------------------------------------------
  // Interactive Sandbox Live Simulation State
  // ---------------------------------------------------------------------------
  bool _simSubmitted = false;
  int _simStepperActiveIndex = 0;
  int _simPageIndex = 0;
  final Map<String, dynamic> _simAnswers = {};

  final _simFirstNameCtrl = TextEditingController(text: '');
  final _simLastNameCtrl = TextEditingController(text: '');
  final _simEmailCtrl = TextEditingController(text: '');
  final _simPhoneCtrl = TextEditingController(text: '');
  final _simPasswordCtrl = TextEditingController(text: '');
  final _simConfirmPasswordCtrl = TextEditingController(text: '');
  String? _simSelectedCategory;

  // Active inline tooltip key for presentation/security cards
  String? _activeTooltip;

  // ---------------------------------------------------------------------------
  // 7 Industry Archetype Templates (1-to-1 with Angular component)
  // ---------------------------------------------------------------------------
  static const List<_IndustryTemplate> _industryTemplates = [
    _IndustryTemplate(
      key: 'corporate',
      name: 'Corporate & Enterprise',
      description: 'Capture company details, job titles, organization size, and tax ID.',
      icon: Icons.apartment_rounded,
      color: Color(0xFF0050E5),
      bgColor: Color(0xFFEFF6FF),
      fieldCount: 5,
      layoutMode: 'sections',
      layoutBadge: 'Category Sections',
      layoutName: 'Category Sections Flow',
      layoutReason: 'Splits personal credentials and corporate compliance into structured category cards.',
      sampleQuestions: [
        {'label': 'Company / Organization Name', 'fieldType': 'text', 'isRequired': true, 'placeholder': 'e.g. Acme Global Corporation'},
        {'label': 'Job Title / Role', 'fieldType': 'text', 'isRequired': true, 'placeholder': 'e.g. Managing Director'},
        {'label': 'Organization Size', 'fieldType': 'select', 'isRequired': true, 'options': ['1-10 employees', '11-50 employees', '51-200 employees', '201-1000 employees', '1000+ employees']},
        {'label': 'Industry Sector', 'fieldType': 'select', 'isRequired': true, 'options': ['Technology & Software', 'Financial Services', 'Manufacturing', 'Consulting', 'Healthcare', 'Retail']},
        {'label': 'Company Registration / Tax ID', 'fieldType': 'text', 'isRequired': false, 'placeholder': 'e.g. RC-1234567'},
      ],
    ),
    _IndustryTemplate(
      key: 'education',
      name: 'Education & Academies',
      description: 'Student / Matriculation IDs, academic department, and study levels.',
      icon: Icons.school_rounded,
      color: Color(0xFF059669),
      bgColor: Color(0xFFECFDF5),
      fieldCount: 5,
      layoutMode: 'stepper',
      layoutBadge: 'Step Stepper',
      layoutName: 'Step-by-Step Stepper Wizard',
      layoutReason: 'Guided step-by-step onboarding from department selection to guardian contacts.',
      sampleQuestions: [
        {'label': 'Student / Matriculation ID', 'fieldType': 'text', 'isRequired': true, 'placeholder': 'e.g. STU-2026-0042'},
        {'label': 'Level of Study', 'fieldType': 'select', 'isRequired': true, 'options': ['Undergraduate', 'Postgraduate (Master\'s)', 'Doctorate (Ph.D.)', 'Professional Diploma']},
        {'label': 'Faculty / Major Department', 'fieldType': 'text', 'isRequired': true, 'placeholder': 'e.g. Faculty of Engineering'},
        {'label': 'Enrollment Academic Year', 'fieldType': 'number', 'isRequired': true, 'placeholder': 'e.g. 2026'},
        {'label': 'Parent / Guardian Contact Phone', 'fieldType': 'text', 'isRequired': false, 'placeholder': 'e.g. +0 (000) 000-0000'},
      ],
    ),
    _IndustryTemplate(
      key: 'healthcare',
      name: 'Healthcare & Fitness',
      description: 'Emergency contacts, medical disclosures, blood group, and waiver.',
      icon: Icons.health_and_safety_rounded,
      color: Color(0xFFDC2626),
      bgColor: Color(0xFFFEF2F2),
      fieldCount: 6,
      layoutMode: 'pages',
      layoutBadge: 'Multi-Page',
      layoutName: 'Page-by-Page Multi-Page Form',
      layoutReason: 'Dedicates clean pages for sensitive medical disclosures, blood group, and liability consent.',
      sampleQuestions: [
        {'label': 'Emergency Contact Full Name', 'fieldType': 'text', 'isRequired': true, 'placeholder': 'e.g. First Last'},
        {'label': 'Emergency Contact Phone', 'fieldType': 'text', 'isRequired': true, 'placeholder': 'e.g. +0 (000) 000-0000'},
        {'label': 'Date of Birth', 'fieldType': 'date', 'isRequired': true},
        {'label': 'Blood Group', 'fieldType': 'select', 'isRequired': false, 'options': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']},
        {'label': 'Medical Conditions / Disclosures', 'fieldType': 'textarea', 'isRequired': false, 'placeholder': 'List any allergies or medical history...'},
        {'label': 'Health & Safety Liability Waiver', 'fieldType': 'checkbox', 'isRequired': true, 'placeholder': 'I agree to the liability waiver and safety guidelines'},
      ],
    ),
    _IndustryTemplate(
      key: 'alumni',
      name: 'Alumni & Communities',
      description: 'Graduation class year, qualification earned, city, and LinkedIn.',
      icon: Icons.groups_rounded,
      color: Color(0xFF7C3AED),
      bgColor: Color(0xFFF5F3FF),
      fieldCount: 5,
      layoutMode: 'sections',
      layoutBadge: 'Category Sections',
      layoutName: 'Category Sections Flow',
      layoutReason: 'Organizes academic graduating pedigree, professional roles, and mentorship networking.',
      sampleQuestions: [
        {'label': 'Graduation Class Year', 'fieldType': 'number', 'isRequired': true, 'placeholder': 'e.g. 2022'},
        {'label': 'Degree / Qualification Earned', 'fieldType': 'text', 'isRequired': true, 'placeholder': 'e.g. B.Sc. Mechanical Engineering'},
        {'label': 'Current Chapter / City', 'fieldType': 'text', 'isRequired': true, 'placeholder': 'e.g. London / United Kingdom'},
        {'label': 'LinkedIn Profile URL', 'fieldType': 'text', 'isRequired': false, 'placeholder': 'e.g. https://linkedin.com/in/username'},
        {'label': 'Alumni Mentorship Participation', 'fieldType': 'select', 'isRequired': true, 'options': ['Open to Mentoring Students', 'Seeking a Mentor', 'Networking Only', 'Not at this time']},
      ],
    ),
    _IndustryTemplate(
      key: 'events',
      name: 'Events & Conferences',
      description: 'Attendance mode, dietary preferences, swag size, and institution.',
      icon: Icons.confirmation_number_rounded,
      color: Color(0xFFD97706),
      bgColor: Color(0xFFFFFBEB),
      fieldCount: 4,
      layoutMode: 'stepper',
      layoutBadge: 'Step Stepper',
      layoutName: 'Step-by-Step Stepper Wizard',
      layoutReason: 'Sequences ticket credentials, conference swag preferences, and dietary requirements.',
      sampleQuestions: [
        {'label': 'Organization / Institution Affiliation', 'fieldType': 'text', 'isRequired': true, 'placeholder': 'e.g. TechHub Summit Team'},
        {'label': 'Attendance Mode', 'fieldType': 'select', 'isRequired': true, 'options': ['In-Person Delegate', 'Virtual / Livestream Access', 'Speaker / Panelist', 'VIP Guest']},
        {'label': 'Dietary Preferences', 'fieldType': 'select', 'isRequired': true, 'options': ['Standard / No Restrictions', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free']},
        {'label': 'Conference T-Shirt Size', 'fieldType': 'select', 'isRequired': false, 'options': ['Small (S)', 'Medium (M)', 'Large (L)', 'Extra Large (XL)', '2XL']},
      ],
    ),
    _IndustryTemplate(
      key: 'nonprofit',
      name: 'Non-Profit & Volunteers',
      description: 'Volunteer program areas, weekly availability, and skills.',
      icon: Icons.volunteer_activism_rounded,
      color: Color(0xFFDB2777),
      bgColor: Color(0xFFFDF2F8),
      fieldCount: 3,
      layoutMode: 'single',
      layoutBadge: 'Single Page',
      layoutName: 'Single Page Velocity Stream',
      layoutReason: 'Welcoming, frictionless volunteer intake on a single engaging page.',
      sampleQuestions: [
        {'label': 'Preferred Volunteer Program Area', 'fieldType': 'select', 'isRequired': true, 'options': ['Community Outreach & Relief', 'Youth Education & Tutoring', 'Event Coordination', 'Fundraising & Donor Care']},
        {'label': 'Weekly Availability', 'fieldType': 'select', 'isRequired': true, 'options': ['1-3 hours / week', '4-8 hours / week', 'Weekends Only', 'Ad-hoc / On-Call']},
        {'label': 'Special Skills & Certifications', 'fieldType': 'textarea', 'isRequired': false, 'placeholder': 'e.g. First Aid Certified, Spanish Fluency, Graphic Design'},
      ],
    ),
    _IndustryTemplate(
      key: 'saas',
      name: 'Technology & SaaS Startups',
      description: 'Developer role, cloud provider, programming stack, and workspace team size.',
      icon: Icons.code_rounded,
      color: Color(0xFF0284C7),
      bgColor: Color(0xFFF0F9FF),
      fieldCount: 4,
      layoutMode: 'single',
      layoutBadge: 'Single Page',
      layoutName: 'Single Page Velocity Stream',
      layoutReason: 'High-velocity developer signups with zero friction in a single stream.',
      sampleQuestions: [
        {'label': 'Developer / Engineering Role', 'fieldType': 'select', 'isRequired': true, 'options': ['Full-Stack Engineer', 'Frontend Engineer', 'Backend / Systems Engineer', 'DevOps / Cloud Architect', 'Product Manager / Designer']},
        {'label': 'Primary Programming Stack', 'fieldType': 'text', 'isRequired': true, 'placeholder': 'e.g. TypeScript, Node.js, C#, Python'},
        {'label': 'Cloud Infrastructure Provider', 'fieldType': 'select', 'isRequired': true, 'options': ['Amazon Web Services (AWS)', 'Google Cloud Platform (GCP)', 'Microsoft Azure', 'Cloudflare / Edge']},
        {'label': 'Engineering Team Size', 'fieldType': 'select', 'isRequired': false, 'options': ['Solo Founder / Dev', '2-5 Engineers', '6-20 Engineers', '20+ Engineers']},
      ],
    ),
  ];

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
    _templateScrollCtrl.dispose();

    _simFirstNameCtrl.dispose();
    _simLastNameCtrl.dispose();
    _simEmailCtrl.dispose();
    _simPhoneCtrl.dispose();
    _simPasswordCtrl.dispose();
    _simConfirmPasswordCtrl.dispose();
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

  String get _liveRegistrationUrl {
    final slug = _slugCtrl.text.trim().isEmpty ? 'register' : _slugCtrl.text.trim();
    final domain = widget.workspace?.primaryDomain.isNotEmpty == true
        ? widget.workspace!.primaryDomain
        : (widget.workspace?.tenantKey.isNotEmpty == true
            ? '${widget.workspace!.tenantKey}.localhost:4200'
            : 'testspace.localhost:4200');
    return 'https://$domain/auth/$slug';
  }

  void _copyLiveUrl() {
    Clipboard.setData(ClipboardData(text: _liveRegistrationUrl));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Live Registration URL copied to clipboard!'),
        backgroundColor: Color(0xFF10B981),
        duration: Duration(seconds: 2),
      ),
    );
  }

  bool _isCoreFieldPublished(String fieldKey) {
    final unpub = (_policy['unpublishedCoreFields'] as List<dynamic>?) ?? [];
    return !unpub.contains(fieldKey);
  }

  void _toggleCoreFieldPublish(String fieldKey) {
    final unpub = List<String>.from((_policy['unpublishedCoreFields'] as List<dynamic>?) ?? []);
    if (unpub.contains(fieldKey)) {
      unpub.remove(fieldKey);
    } else {
      unpub.add(fieldKey);
    }
    setState(() => _policy['unpublishedCoreFields'] = unpub);
    _savePolicy();
  }

  // ---------------------------------------------------------------------------
  // Interactive Simulation Controls
  // ---------------------------------------------------------------------------
  void _autoFillSimulation() {
    setState(() {
      _simFirstNameCtrl.text = 'Amara';
      _simLastNameCtrl.text = 'Nwosu';
      _simEmailCtrl.text = 'amara.nwosu@example.com';
      _simPhoneCtrl.text = '+1 (555) 382-9912';
      _simPasswordCtrl.text = 'SecurePass2026!';
      _simConfirmPasswordCtrl.text = 'SecurePass2026!';
      if (_categories.isNotEmpty) {
        _simSelectedCategory = _categories.first['id']?.toString();
      }
      for (final f in _customFields) {
        final key = f['fieldKey'] as String? ?? '';
        final type = f['fieldType'] as String? ?? 'text';
        if (type == 'number') {
          _simAnswers[key] = '2026';
        } else if (type == 'select' && f['options'] is List && (f['options'] as List).isNotEmpty) {
          _simAnswers[key] = (f['options'] as List).first.toString();
        } else if (type == 'checkbox') {
          _simAnswers[key] = true;
        } else {
          _simAnswers[key] = 'Sample Answer Value';
        }
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Auto-filled sandbox preview with sample test data!'),
        backgroundColor: Color(0xFF10B981),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _resetSimulation() {
    setState(() {
      _simSubmitted = false;
      _simStepperActiveIndex = 0;
      _simPageIndex = 0;
      _simFirstNameCtrl.clear();
      _simLastNameCtrl.clear();
      _simEmailCtrl.clear();
      _simPhoneCtrl.clear();
      _simPasswordCtrl.clear();
      _simConfirmPasswordCtrl.clear();
      _simAnswers.clear();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Interactive sandbox preview reset.'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _submitSimulation() {
    setState(() => _simSubmitted = true);
  }

  void _applyTemplate(_IndustryTemplate tpl) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: tpl.bgColor, borderRadius: BorderRadius.circular(8)),
              child: Icon(tpl.icon, color: tpl.color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Apply ${tpl.name} Template?', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Text('${tpl.fieldCount} fields • ${tpl.layoutBadge}', style: TextStyle(fontSize: 12, color: tpl.color, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ],
        ),
        content: Text(
          'This will configure your presentation flow to "${tpl.layoutName}" and suggest ${tpl.sampleQuestions.length} standard questions. Existing policies will be updated.',
          style: const TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0050E5), foregroundColor: Colors.white),
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                _policy['formLayoutMode'] = tpl.layoutMode;
                _policy['defaultIndustrySector'] = tpl.name;
              });
              _savePolicy();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Applied "${tpl.name}" template flow!'), backgroundColor: const Color(0xFF10B981)),
              );
            },
            child: const Text('Apply Template'),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Custom Question Modal Dialog
  // ---------------------------------------------------------------------------
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
                      style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600),
                    ),
                    const SizedBox(height: 4),
                    TextField(
                      controller: labelCtrl,
                      decoration: InputDecoration(
                        hintText: 'e.g. Matriculation ID or Company Tax Number',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onChanged: (val) {
                        if (!isEditing && keyCtrl.text.isEmpty) {
                          setDialogState(() {
                            keyCtrl.text = val.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '_');
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('FIELD KEY *', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                              const SizedBox(height: 4),
                              TextField(
                                controller: keyCtrl,
                                enabled: !isEditing,
                                decoration: InputDecoration(
                                  hintText: 'e.g. tax_number',
                                  filled: true,
                                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('INPUT TYPE', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                              const SizedBox(height: 4),
                              DropdownButtonFormField<String>(
                                initialValue: selectedType,
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                items: fieldTypes.map((t) => DropdownMenuItem(value: t['key'], child: Text(t['name']!, style: const TextStyle(fontSize: 12)))).toList(),
                                onChanged: (val) {
                                  if (val != null) setDialogState(() => selectedType = val);
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (selectedType == 'select') ...[
                      Text('DROPDOWN OPTIONS (COMMA-SEPARATED)', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: optionsCtrl,
                        decoration: InputDecoration(
                          hintText: 'Option 1, Option 2, Option 3',
                          filled: true,
                          fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('PLACEHOLDER', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                              const SizedBox(height: 4),
                              TextField(
                                controller: placeholderCtrl,
                                decoration: InputDecoration(
                                  hintText: 'e.g. Enter details...',
                                  filled: true,
                                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('ASSIGN TO CATEGORY', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                              const SizedBox(height: 4),
                              DropdownButtonFormField<String?>(
                                initialValue: selectedCategoryId,
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                items: [
                                  const DropdownMenuItem<String?>(value: null, child: Text('All Categories (Global)', style: TextStyle(fontSize: 12))),
                                  ..._categories.map((c) => DropdownMenuItem<String?>(value: c['id']?.toString(), child: Text(c['name']?.toString() ?? '', style: const TextStyle(fontSize: 12)))),
                                ],
                                onChanged: (val) => setDialogState(() => selectedCategoryId = val),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text('HELP TEXT / GUIDANCE', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: helpTextCtrl,
                      decoration: InputDecoration(
                        hintText: 'Short tip beneath field...',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Checkbox(value: isRequired, onChanged: (v) => setDialogState(() => isRequired = v ?? false)),
                        const Text('Mandatory (Required Field)', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
                        const Spacer(),
                        Checkbox(value: showInProfile, onChanged: (v) => setDialogState(() => showInProfile = v ?? true)),
                        const Text('Show in Profile Card', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
              ElevatedButton.icon(
                icon: isSaving ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.check, size: 16),
                label: Text(isEditing ? 'Update Question' : 'Save Question'),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0050E5), foregroundColor: Colors.white),
                onPressed: isSaving ? null : () async {
                  final label = labelCtrl.text.trim();
                  final key = keyCtrl.text.trim();
                  if (label.isEmpty || key.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Label and Field Key are required.')));
                    return;
                  }

                  setDialogState(() => isSaving = true);
                  final payload = {
                    'label': label,
                    'fieldKey': key,
                    'fieldType': selectedType,
                    'placeholder': placeholderCtrl.text.trim(),
                    'helpText': helpTextCtrl.text.trim(),
                    'bcpUserCategoryId': selectedCategoryId,
                    'isRequired': isRequired,
                    'showInWorkspaceProfile': showInProfile,
                    'isActive': true,
                    'options': selectedType == 'select' ? optionsCtrl.text.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList() : [],
                  };

                  try {
                    final repo = ref.read(accountRepositoryProvider);
                    bool ok;
                    if (isEditing) {
                      ok = await repo.updateRegistrationField(existingField['id']?.toString() ?? '', payload);
                    } else {
                      ok = await repo.createRegistrationField(payload);
                    }

                    if (context.mounted) {
                      Navigator.pop(ctx);
                      if (ok) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(isEditing ? 'Question updated successfully.' : 'Question created successfully.'), backgroundColor: const Color(0xFF10B981)),
                        );
                        _loadData();
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to save question.')));
                      }
                    }
                  } catch (_) {
                    if (context.mounted) Navigator.pop(ctx);
                  }
                },
              ),
            ],
          );
        },
      ),
    );
  }

  void _confirmDeleteQuestion(Map<String, dynamic> field) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Custom Question?'),
        content: Text('Are you sure you want to remove "${field['label']}"? Existing applicant answers for this field will remain in the database archive.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444), foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.pop(ctx);
              final repo = ref.read(accountRepositoryProvider);
              final ok = await repo.deleteRegistrationField(field['id']?.toString() ?? '');
              if (mounted) {
                if (ok) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Question removed.'), backgroundColor: Color(0xFF10B981)));
                  _loadData();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete question.')));
                }
              }
            },
            child: const Text('Delete Question'),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // Build Main Tree
  // ===========================================================================
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. PAGE HEADER (Matches Angular AppPageHeader with Live Page & Add Question)
              _buildPageHeader(isDark),
              const SizedBox(height: 16),

              // 2. MASTER POLICY CONFIGURATION CARD
              _buildPolicyCard(isDark),
              const SizedBox(height: 16),

              // 3. 1-CLICK INDUSTRY ONBOARDING TEMPLATES CAROUSEL
              _buildTemplatesBanner(isDark),
              const SizedBox(height: 18),

              // 4. MAIN SPLIT WORKSPACE (Left: Form Architecture & Fields, Right: Sandbox Live Simulation)
              _buildSplitWorkspace(isDark, constraints.maxWidth),
            ],
          ),
        );
      },
    );
  }

  // ===========================================================================
  // 1. STANDARDIZED PAGE HEADER
  // ===========================================================================
  Widget _buildPageHeader(bool isDark) {
    return PageHeader(
      icon: Icons.how_to_reg_rounded,
      eyebrow: 'User Management & Onboarding',
      title: 'Registration Form Builder',
      description:
          'Configure custom onboarding questions, field types, and registration rules for your business. Unlike CMS inquiry forms, questions configured here extend authenticated member accounts.',
      back: widget.onNavigateBack != null ? PageHeaderBack.previous(widget.onNavigateBack!, tooltip: 'Back') : PageHeaderBack.none,
      secondaryActions: [
        PageHeaderAction(
          label: 'Live "Get Started" Page',
          compactLabel: 'Live Page',
          icon: Icons.open_in_new_rounded,
          onPressed: _copyLiveUrl,
        ),
      ],
      primaryAction: PageHeaderAction(
        label: 'Add Custom Question',
        compactLabel: 'Add Question',
        icon: Icons.add_circle_rounded,
        style: PageHeaderActionStyle.primary,
        onPressed: () => _openCreateOrEditQuestionDialog(),
      ),
    );
  }

  // ===========================================================================
  // 2. MASTER POLICY CONFIGURATION CARD
  // ===========================================================================
  Widget _buildPolicyCard(bool isDark) {
    final allowPublic = _policy['allowPublicRegistration'] as bool? ?? true;
    final requireApproval = _policy['requireApprovalBeforeLogin'] as bool? ?? false;
    final affiliateCode = _policy['enableAffiliateReferralCode'] as bool? ?? true;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.policy_rounded, color: Color(0xFF0050E5), size: 18),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Self-Registration & Approval Governance',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        'Global onboarding policies, URL slug routing, and welcome messaging.',
                        style: TextStyle(fontSize: 11.5, color: isDark ? AppColors.gray400 : const Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ],
              ),
              FilledButton.icon(
                onPressed: _isSavingPolicy ? null : _savePolicy,
                icon: _isSavingPolicy
                    ? const SizedBox(width: 13, height: 13, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save_rounded, size: 15),
                label: Text(_isSavingPolicy ? 'Saving...' : 'Save Policies', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5)),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 3-Column Sleek Toggle Row
          LayoutBuilder(
            builder: (context, c) {
              final boxWidth = c.maxWidth > 900 ? (c.maxWidth - 28) / 3 : (c.maxWidth > 600 ? (c.maxWidth - 14) / 2 : c.maxWidth);

              return Wrap(
                spacing: 14,
                runSpacing: 12,
                children: [
                  _buildToggleBox(
                    isDark: isDark,
                    width: boxWidth,
                    title: 'Public "Get Started"',
                    desc: allowPublic ? 'Open self-registration active.' : 'Invite-only registration.',
                    value: allowPublic,
                    onChanged: (val) => setState(() => _policy['allowPublicRegistration'] = val),
                  ),
                  _buildToggleBox(
                    isDark: isDark,
                    width: boxWidth,
                    title: 'Require Admin Approval',
                    desc: requireApproval ? 'Accounts start in Pending status.' : 'Instant activation on signup.',
                    value: requireApproval,
                    onChanged: (val) => setState(() => _policy['requireApprovalBeforeLogin'] = val),
                  ),
                  _buildToggleBox(
                    isDark: isDark,
                    width: boxWidth,
                    title: 'Affiliate Promo Code',
                    desc: affiliateCode ? 'Referral promo prompt shown.' : 'Referral input hidden.',
                    value: affiliateCode,
                    onChanged: (val) => setState(() => _policy['enableAffiliateReferralCode'] = val),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 14),

          // Custom URL Slug & Industry Sector Inputs
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 5,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('REGISTRATION URL SLUG', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                            borderRadius: const BorderRadius.horizontal(left: Radius.circular(8)),
                            border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
                          ),
                          child: const Text('/auth/', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                        ),
                        Expanded(
                          child: TextField(
                            controller: _slugCtrl,
                            style: const TextStyle(fontSize: 13),
                            decoration: InputDecoration(
                              hintText: 'register',
                              filled: true,
                              fillColor: isDark ? AppColors.surfaceVariantDark : Colors.white,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              border: OutlineInputBorder(
                                borderRadius: const BorderRadius.horizontal(right: Radius.circular(8)),
                                borderSide: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: const BorderRadius.horizontal(right: Radius.circular(8)),
                                borderSide: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    // Live Link Pill with Copy & Open
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFBFDBFE)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.link_rounded, size: 14, color: Color(0xFF0050E5)),
                          const SizedBox(width: 6),
                          Text('Live: $_liveRegistrationUrl', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF0050E5))),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: _copyLiveUrl,
                            child: const Padding(padding: EdgeInsets.all(2), child: Icon(Icons.copy_rounded, size: 13, color: Color(0xFF0050E5))),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                flex: 5,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('DEFAULT INDUSTRY SECTOR', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                    const SizedBox(height: 5),
                    DropdownButtonFormField<String>(
                      initialValue: _policy['defaultIndustrySector'] as String? ?? 'Business & Enterprise',
                      style: TextStyle(fontSize: 13, color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A)),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : Colors.white,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1))),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'Business & Enterprise', child: Text('Business & Enterprise')),
                        DropdownMenuItem(value: 'Education & Academy', child: Text('Education & Academy')),
                        DropdownMenuItem(value: 'Healthcare & Care Services', child: Text('Healthcare & Care Services')),
                        DropdownMenuItem(value: 'Non-Profit & Foundation', child: Text('Non-Profit & Foundation')),
                        DropdownMenuItem(value: 'Government & Public Agency', child: Text('Government & Public Agency')),
                        DropdownMenuItem(value: 'Technology & Software', child: Text('Technology & Software')),
                        DropdownMenuItem(value: 'Community & Alumni Association', child: Text('Community & Alumni Association')),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _policy['defaultIndustrySector'] = val);
                      },
                    ),
                    const SizedBox(height: 4),
                    const Text('Classification & default questions preset', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Titles & Copy Grid (3 Inputs)
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('REGISTRATION FORM TITLE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                    const SizedBox(height: 5),
                    TextField(
                      controller: _titleCtrl,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Create Your Account',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : Colors.white,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1))),
                      ),
                    ),
                    const SizedBox(height: 3),
                    const Text('Primary card heading & tab title', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('WELCOME SUBTITLE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                    const SizedBox(height: 5),
                    TextField(
                      controller: _welcomeCtrl,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Join our member directory and workspace portal.',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : Colors.white,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1))),
                      ),
                    ),
                    const SizedBox(height: 3),
                    const Text('Subtitle beneath form title', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('SUCCESS CONFIRMATION MESSAGE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                    const SizedBox(height: 5),
                    TextField(
                      controller: _successCtrl,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Registration successful! Welcome to the portal.',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : Colors.white,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1))),
                      ),
                    ),
                    const SizedBox(height: 3),
                    const Text('Confirmation on completion', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
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
    required double width,
    required String title,
    required String desc,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      width: width,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: value
            ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFF0FDF4))
            : (isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC)),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: value
              ? const Color(0xFF10B981)
              : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
          width: value ? 1.5 : 1,
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
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            activeTrackColor: const Color(0xFF10B981),
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // 3. 1-CLICK INDUSTRY ONBOARDING TEMPLATES CAROUSEL
  // ===========================================================================
  Widget _buildTemplatesBanner(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner Head with Arrows
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.auto_awesome_rounded, color: Color(0xFF7C3AED), size: 18),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '1-CLICK ONBOARDING TEMPLATES',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: Color(0xFF7C3AED)),
                      ),
                      Text(
                        'Pre-Configured Sector Templates',
                        style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A)),
                      ),
                      Text(
                        'Choose an archetype to instantly scaffold registration questions for your business.',
                        style: TextStyle(fontSize: 11.5, color: isDark ? AppColors.gray400 : const Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ],
              ),
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left_rounded, size: 20),
                    onPressed: () {
                      _templateScrollCtrl.animateTo(
                        (_templateScrollCtrl.offset - 300).clamp(0.0, _templateScrollCtrl.position.maxScrollExtent),
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    },
                    tooltip: 'Scroll Left',
                  ),
                  IconButton(
                    icon: const Icon(Icons.chevron_right_rounded, size: 20),
                    onPressed: () {
                      _templateScrollCtrl.animateTo(
                        (_templateScrollCtrl.offset + 300).clamp(0.0, _templateScrollCtrl.position.maxScrollExtent),
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    },
                    tooltip: 'Scroll Right',
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Horizontal Scrolling Track
          SizedBox(
            height: 155,
            child: ListView.separated(
              controller: _templateScrollCtrl,
              scrollDirection: Axis.horizontal,
              itemCount: _industryTemplates.length,
              separatorBuilder: (context, index) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final tpl = _industryTemplates[index];
                return InkWell(
                  onTap: () => _applyTemplate(tpl),
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    width: 235,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: tpl.bgColor,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Icon(tpl.icon, size: 16, color: tpl.color),
                            ),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(4)),
                                  child: Text('${tpl.fieldCount} fields', style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF0050E5))),
                                ),
                                const SizedBox(width: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4)),
                                  child: Text(tpl.layoutBadge, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          tpl.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 3),
                        Expanded(
                          child: Text(
                            tpl.description,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B), height: 1.25),
                          ),
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Preview & Apply', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: tpl.color)),
                            Icon(Icons.arrow_forward_rounded, size: 13, color: tpl.color),
                          ],
                        ),
                      ],
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

  // ===========================================================================
  // 4. MAIN SPLIT WORKSPACE
  // ===========================================================================
  Widget _buildSplitWorkspace(bool isDark, double maxWidth) {
    final isDesktopWide = maxWidth >= 1100;

    final leftColumn = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildCard3Architecture(isDark),
      ],
    );

    final rightColumn = _buildInteractiveSandbox(isDark);

    if (isDesktopWide) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(flex: 58, child: leftColumn),
          const SizedBox(width: 18),
          Expanded(flex: 42, child: rightColumn),
        ],
      );
    } else {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          leftColumn,
          const SizedBox(height: 18),
          rightColumn,
        ],
      );
    }
  }

  // ===========================================================================
  // CARD 3: PRESENTATION LAYOUT, SECURITY & QUESTION FLOW (LEFT COLUMN)
  // ===========================================================================
  Widget _buildCard3Architecture(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.architecture_rounded, color: Color(0xFF0050E5), size: 20),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Card 3: Presentation Layout, Security & Question Flow',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        'Select how applicants experience your registration workflow.',
                        style: TextStyle(fontSize: 11.5, color: isDark ? AppColors.gray400 : const Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ],
              ),
              FilledButton.icon(
                onPressed: _isSavingPolicy ? null : _savePolicy,
                icon: const Icon(Icons.save_rounded, size: 14),
                label: const Text('Save Layout & Policies', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // ROW 1: TYPE OF FORM (PRESENTATION EXPERIENCE)
          Text('ROW 1: TYPE OF FORM (PRESENTATION EXPERIENCE)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: isDark ? AppColors.gray400 : AppColors.gray600)),
          const SizedBox(height: 2),
          const Text('Choose how questions are grouped and transitioned for public registrants', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          const SizedBox(height: 10),
          _buildPresentationLayoutGrid(isDark),
          const SizedBox(height: 16),

          // ROW 2: SECURITY & SESSION CONTINUITY POLICIES
          Text('ROW 2: SECURITY & SESSION CONTINUITY POLICIES', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: isDark ? AppColors.gray400 : AppColors.gray600)),
          const SizedBox(height: 2),
          const Text('Set credential requirements and session resume capability', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          const SizedBox(height: 10),
          _buildSecurityPoliciesRow(isDark),
          const SizedBox(height: 16),

          // ROW 3: CATEGORY / STEP HIERARCHY & ONBOARDING QUESTIONS
          Text('ROW 3: CATEGORY / STEP HIERARCHY & ONBOARDING QUESTIONS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: isDark ? AppColors.gray400 : AppColors.gray600)),
          const SizedBox(height: 2),
          const Text('Manage core credentials and organize business questions into sections', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          const SizedBox(height: 10),
          _buildQuestionsHierarchy(isDark),
        ],
      ),
    );
  }

  // Row 1 Layout Cards
  Widget _buildPresentationLayoutGrid(bool isDark) {
    final currentMode = _policy['formLayoutMode'] as String? ?? 'sections';

    final modes = [
      {
        'key': 'single',
        'title': 'Single Page Form',
        'badge': 'High Velocity',
        'badgeColor': const Color(0xFF10B981),
        'desc': 'All questions in a clean vertical stream with a single submit action.',
        'icon': Icons.view_agenda_rounded,
        'info': 'Best for quick, high-conversion signups (1-5 questions). Keeps friction low and lets users complete registration in under 60 seconds.',
      },
      {
        'key': 'sections',
        'title': 'Single Page + Categories',
        'badge': 'Grouped Cards',
        'badgeColor': const Color(0xFF7C3AED),
        'desc': 'Group related questions into categorized cards with clear dividers.',
        'icon': Icons.dashboard_customize_rounded,
        'info': 'Best for medium forms (6-15 questions). Organizes fields into distinct visual cards on a single scrollable page.',
      },
      {
        'key': 'stepper',
        'title': 'Step-by-Step Wizard',
        'badge': 'Guided Stepper',
        'badgeColor': const Color(0xFF0050E5),
        'desc': 'Numbered interactive wizard stepper (1-2-3-4) with animated progress bar.',
        'icon': Icons.linear_scale_rounded,
        'info': 'Best for detailed onboarding (8-20+ questions). Reduces cognitive overload by focusing applicant attention on one phase at a time.',
      },
      {
        'key': 'pages',
        'title': 'Page-by-Page Form',
        'badge': 'Multi-Page',
        'badgeColor': const Color(0xFFD97706),
        'desc': 'Distinct multi-page pagination experience (Page 1 of N) with dedicated submit stages.',
        'icon': Icons.auto_stories_rounded,
        'info': 'Best for comprehensive application portals (e.g. Academy admissions, vendor KYC). Isolates sections into dedicated browser page views.',
      },
    ];

    return LayoutBuilder(
      builder: (context, c) {
        final cardWidth = c.maxWidth > 650 ? (c.maxWidth - 12) / 2 : c.maxWidth;

        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: modes.map((m) {
            final isSelected = currentMode == m['key'];
            final badgeColor = m['badgeColor'] as Color;

            return InkWell(
              onTap: () {
                setState(() => _policy['formLayoutMode'] = m['key']);
                _savePolicy();
              },
              borderRadius: BorderRadius.circular(10),
              child: Container(
                width: cardWidth,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF))
                      : (isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC)),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF0050E5) : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
                    width: isSelected ? 1.5 : 1,
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
                            Icon(
                              isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_unchecked_rounded,
                              size: 16,
                              color: isSelected ? const Color(0xFF0050E5) : const Color(0xFF94A3B8),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(color: badgeColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                              child: Text(m['badge'] as String, style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: badgeColor)),
                            ),
                          ],
                        ),
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.info_outline_rounded, size: 14, color: Color(0xFF94A3B8)),
                          tooltip: m['info'] as String,
                          onPressed: () {
                            setState(() {
                              _activeTooltip = _activeTooltip == m['key'] ? null : m['key'] as String;
                            });
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(m['icon'] as IconData, size: 18, color: isSelected ? const Color(0xFF0050E5) : const Color(0xFF64748B)),
                        const SizedBox(width: 8),
                        Text(m['title'] as String, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: isSelected ? const Color(0xFF0050E5) : (isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A)))),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(m['desc'] as String, style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B), height: 1.25)),
                    if (_activeTooltip == m['key']) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(6)),
                        child: Text(m['info'] as String, style: const TextStyle(fontSize: 10.5, color: Color(0xFF1E3A8A))),
                      ),
                    ],
                  ],
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }

  // Row 2 Security Toggles
  Widget _buildSecurityPoliciesRow(bool isDark) {
    final reqPwd = _policy['requirePassword'] as bool? ?? true;
    final allowSave = _policy['allowSaveAndContinue'] as bool? ?? false;

    return LayoutBuilder(
      builder: (context, c) {
        final boxWidth = c.maxWidth > 650 ? (c.maxWidth - 12) / 2 : c.maxWidth;

        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _buildToggleBox(
              isDark: isDark,
              width: boxWidth,
              title: 'Require Password Creation',
              desc: reqPwd ? 'Applicants must set and confirm password during registration.' : 'Passwordless registration via instant magic link.',
              value: reqPwd,
              onChanged: (val) {
                setState(() => _policy['requirePassword'] = val);
                _savePolicy();
              },
            ),
            _buildToggleBox(
              isDark: isDark,
              width: boxWidth,
              title: 'Allow "Save & Continue Later"',
              desc: allowSave ? 'Applicants can save draft and receive resume link.' : 'Applicants must complete registration in a single session.',
              value: allowSave,
              onChanged: (val) {
                setState(() => _policy['allowSaveAndContinue'] = val);
                _savePolicy();
              },
            ),
          ],
        );
      },
    );
  }

  // Row 3 Hierarchy & Questions
  Widget _buildQuestionsHierarchy(bool isDark) {
    final reqPwd = _policy['requirePassword'] as bool? ?? true;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Default Category 1 (System Protected)
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.shield_rounded, color: Color(0xFF0050E5), size: 18),
                  const SizedBox(width: 8),
                  Text('Default Category 1: Personal & Account Credentials', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A))),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(4)),
                    child: const Text('System Protected', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF0050E5))),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text('Built-in identity fields required for authentication. You can unpublish optional fields.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              const SizedBox(height: 10),

              // Core Field Badges Row
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildCoreBadge('First & Last Name', 'Mandatory', isPublished: true),
                  _buildCoreBadge('Work Email Address', 'Mandatory', isPublished: true),
                  _buildCoreBadge('Account Password', reqPwd ? 'Required' : 'Bypassed', isPublished: reqPwd),
                  _buildCoreInteractiveBadge('Phone Number', 'phone'),
                  _buildCoreInteractiveBadge('Category Tier', 'category'),
                  _buildCoreInteractiveBadge('Industry Sector', 'organizationType'),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Custom Questions List Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('CUSTOM BUSINESS QUESTIONS (${_customFields.length})', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: isDark ? AppColors.gray400 : AppColors.gray600)),
            TextButton.icon(
              onPressed: () => _openCreateOrEditQuestionDialog(),
              icon: const Icon(Icons.add_circle_rounded, size: 14),
              label: const Text('+ Add Question', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
        const SizedBox(height: 6),

        if (_customFields.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 24),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                const Icon(Icons.dynamic_form_rounded, size: 30, color: Color(0xFFCBD5E1)),
                const SizedBox(height: 6),
                const Text('No custom questions added yet.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => _openCreateOrEditQuestionDialog(),
                  icon: const Icon(Icons.add_rounded, size: 14),
                  label: const Text('Add First Custom Question', style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _customFields.length,
            separatorBuilder: (context, index) => const SizedBox(height: 6),
            itemBuilder: (context, index) {
              final f = _customFields[index];
              final label = f['label'] as String? ?? 'Question';
              final key = f['fieldKey'] as String? ?? '';
              final type = f['fieldType'] as String? ?? 'text';
              final isReq = f['isRequired'] as bool? ?? false;
              final catName = f['categoryName'] as String? ?? 'Global';

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.drag_indicator_rounded, size: 16, color: Color(0xFF94A3B8)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(label, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A))),
                          Text('Key: $key • Type: $type • Scope: $catName', style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
                        ],
                      ),
                    ),
                    if (isReq)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        margin: const EdgeInsets.only(right: 6),
                        decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(4)),
                        child: const Text('Required', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF0050E5))),
                      ),
                    IconButton(
                      icon: const Icon(Icons.edit_rounded, size: 15, color: Color(0xFF0050E5)),
                      tooltip: 'Edit Question',
                      onPressed: () => _openCreateOrEditQuestionDialog(existingField: f),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline_rounded, size: 15, color: Color(0xFFEF4444)),
                      tooltip: 'Delete Question',
                      onPressed: () => _confirmDeleteQuestion(f),
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildCoreBadge(String label, String status, {required bool isPublished}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(isPublished ? Icons.check_circle_rounded : Icons.visibility_off_rounded, size: 12, color: isPublished ? const Color(0xFF10B981) : const Color(0xFF94A3B8)),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
          const SizedBox(width: 4),
          Text('($status)', style: const TextStyle(fontSize: 9.5, color: Color(0xFF64748B))),
        ],
      ),
    );
  }

  Widget _buildCoreInteractiveBadge(String label, String fieldKey) {
    final published = _isCoreFieldPublished(fieldKey);
    return InkWell(
      onTap: () => _toggleCoreFieldPublish(fieldKey),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: published ? const Color(0xFFEFF6FF) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: published ? const Color(0xFFBFDBFE) : const Color(0xFFE2E8F0)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(published ? Icons.visibility_rounded : Icons.visibility_off_rounded, size: 12, color: published ? const Color(0xFF0050E5) : const Color(0xFF94A3B8)),
            const SizedBox(width: 4),
            Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: published ? const Color(0xFF0050E5) : const Color(0xFF64748B))),
            const SizedBox(width: 4),
            Text(published ? '(Published)' : '(Hidden)', style: TextStyle(fontSize: 9.5, color: published ? const Color(0xFF0050E5) : const Color(0xFF94A3B8))),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // INTERACTIVE LIVE SANDBOX SIMULATION (RIGHT COLUMN)
  // ===========================================================================
  Widget _buildInteractiveSandbox(bool isDark) {
    final formLayoutMode = _policy['formLayoutMode'] as String? ?? 'sections';
    final layoutModeTitle = formLayoutMode == 'single'
        ? 'Single Page Velocity Flow'
        : (formLayoutMode == 'stepper' ? 'Guided Stepper Wizard' : (formLayoutMode == 'pages' ? 'Page-by-Page Pagination' : 'Grouped Category Sections'));

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A), // Dark elegant sandbox background matching web
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF334155)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Sandbox Control Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: const BoxDecoration(
              color: Color(0xFF1E293B),
              borderRadius: BorderRadius.vertical(top: Radius.circular(14)),
              border: Border(bottom: BorderSide(color: Color(0xFF334155))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 8),
                    const Text('INTERACTIVE "GET STARTED" SANDBOX', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: Colors.white)),
                  ],
                ),
                Row(
                  children: [
                    InkWell(
                      onTap: _autoFillSimulation,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFF334155), borderRadius: BorderRadius.circular(5)),
                        child: const Row(
                          children: [
                            Icon(Icons.auto_fix_high_rounded, size: 12, color: Color(0xFF38BDF8)),
                            SizedBox(width: 4),
                            Text('Auto-Fill Sample', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Colors.white)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    InkWell(
                      onTap: _resetSimulation,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFF334155), borderRadius: BorderRadius.circular(5)),
                        child: const Row(
                          children: [
                            Icon(Icons.restart_alt_rounded, size: 12, color: Color(0xFF94A3B8)),
                            SizedBox(width: 4),
                            Text('Reset Test', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Colors.white)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(color: const Color(0xFF0050E5), borderRadius: BorderRadius.circular(4)),
                      child: Text(layoutModeTitle, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Colors.white)),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Simulation Content Area
          Padding(
            padding: const EdgeInsets.all(16),
            child: _simSubmitted ? _buildSimulationSuccessView() : _buildSimulationFormView(formLayoutMode),
          ),
        ],
      ),
    );
  }

  Widget _buildSimulationSuccessView() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF10B981)),
      ),
      child: Column(
        children: [
          const Icon(Icons.verified_rounded, size: 36, color: Color(0xFF10B981)),
          const SizedBox(height: 8),
          const Text('Simulation Test Passed!', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
          const SizedBox(height: 4),
          Text(_policy['registrationSuccessMessage']?.toString() ?? 'Registration successful!', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)), textAlign: TextAlign.center),
          const SizedBox(height: 14),

          // Data Breakdown
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(8)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('TEST CAPTURED DATA BREAKDOWN', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF38BDF8))),
                const SizedBox(height: 6),
                _buildSimDataRow('Applicant Name', '${_simFirstNameCtrl.text} ${_simLastNameCtrl.text}'),
                _buildSimDataRow('Email Address', _simEmailCtrl.text),
                if (_simPhoneCtrl.text.isNotEmpty) _buildSimDataRow('Phone Number', _simPhoneCtrl.text),
                _buildSimDataRow('Industry Sector', _policy['defaultIndustrySector']?.toString() ?? 'Business'),
                _buildSimDataRow('Flow Architecture', _policy['formLayoutMode']?.toString() ?? 'sections'),
                _buildSimDataRow('Custom Answers', '${_simAnswers.length} fields captured'),
              ],
            ),
          ),
          const SizedBox(height: 14),

          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _simSubmitted = false),
                  style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFF475569)), foregroundColor: Colors.white),
                  child: const Text('Modify Inputs', style: TextStyle(fontSize: 11)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: _resetSimulation,
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white),
                  child: const Text('Test Again', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSimDataRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text('$label:', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
          Text(value.isEmpty ? '—' : value, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
        ],
      ),
    );
  }

  Widget _buildSimulationFormView(String formLayoutMode) {
    final title = _titleCtrl.text.isEmpty ? 'Create Your Account' : _titleCtrl.text;
    final welcome = _welcomeCtrl.text.isEmpty ? 'Join our member directory and workspace portal.' : _welcomeCtrl.text;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Simulated Form Header
        Center(
          child: Column(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: const BoxDecoration(color: Color(0xFF0050E5), shape: BoxShape.circle),
                child: const Icon(Icons.how_to_reg_rounded, color: Colors.white, size: 20),
              ),
              const SizedBox(height: 6),
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
              const SizedBox(height: 2),
              Text(welcome, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)), textAlign: TextAlign.center),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Stepper Track (if in stepper mode)
        if (formLayoutMode == 'stepper') ...[
          _buildSimStepperHeader(),
          const SizedBox(height: 14),
        ],

        // Pages Counter (if in pages mode)
        if (formLayoutMode == 'pages') ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(6)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Page ${_simPageIndex + 1} of 2', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF38BDF8))),
                Text(_simPageIndex == 0 ? 'Personal Credentials' : 'Custom Organization Questions', style: const TextStyle(fontSize: 10.5, color: Color(0xFF94A3B8))),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Form Fields (Dynamic per layout mode)
        if (formLayoutMode == 'pages') ...[
          if (_simPageIndex == 0) _buildSimPersonalCredentialsFields() else _buildSimCustomQuestionsFields(),
        ] else if (formLayoutMode == 'stepper') ...[
          if (_simStepperActiveIndex == 0) _buildSimPersonalCredentialsFields() else _buildSimCustomQuestionsFields(),
        ] else if (formLayoutMode == 'sections') ...[
          // Grouped Sections Mode
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF334155))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('SECTION 1: PERSONAL CREDENTIALS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF38BDF8))),
                const SizedBox(height: 8),
                _buildSimPersonalCredentialsFields(),
              ],
            ),
          ),
          if (_customFields.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF334155))),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('SECTION 2: CUSTOM ONBOARDING DETAILS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF38BDF8))),
                  const SizedBox(height: 8),
                  _buildSimCustomQuestionsFields(),
                ],
              ),
            ),
        ] else ...[
          // Single Continuous Stream Mode
          _buildSimPersonalCredentialsFields(),
          if (_customFields.isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildSimCustomQuestionsFields(),
          ],
        ],

        const SizedBox(height: 16),

        // Navigation / Submit Buttons
        if (formLayoutMode == 'stepper') ...[
          Row(
            children: [
              if (_simStepperActiveIndex > 0)
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() => _simStepperActiveIndex--),
                    style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFF475569)), foregroundColor: Colors.white),
                    child: const Text('Back', style: TextStyle(fontSize: 11)),
                  ),
                ),
              if (_simStepperActiveIndex > 0) const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    if (_simStepperActiveIndex == 0 && _customFields.isNotEmpty) {
                      setState(() => _simStepperActiveIndex = 1);
                    } else {
                      _submitSimulation();
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0050E5), foregroundColor: Colors.white),
                  child: Text(_simStepperActiveIndex == 0 && _customFields.isNotEmpty ? 'Continue to Questions →' : 'Complete Registration', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ] else if (formLayoutMode == 'pages') ...[
          Row(
            children: [
              if (_simPageIndex > 0)
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() => _simPageIndex--),
                    style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFF475569)), foregroundColor: Colors.white),
                    child: const Text('Previous Page', style: TextStyle(fontSize: 11)),
                  ),
                ),
              if (_simPageIndex > 0) const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    if (_simPageIndex == 0 && _customFields.isNotEmpty) {
                      setState(() => _simPageIndex = 1);
                    } else {
                      _submitSimulation();
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0050E5), foregroundColor: Colors.white),
                  child: Text(_simPageIndex == 0 && _customFields.isNotEmpty ? 'Next Page →' : 'Submit Application', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ] else ...[
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _submitSimulation,
              icon: const Icon(Icons.check_circle_outline_rounded, size: 14),
              label: const Text('Complete Registration & Create Account', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0050E5),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSimStepperHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildStepperDot(0, 'Identity'),
        Container(width: 30, height: 2, color: _simStepperActiveIndex >= 1 ? const Color(0xFF0050E5) : const Color(0xFF334155)),
        _buildStepperDot(1, 'Questions'),
        Container(width: 30, height: 2, color: _simStepperActiveIndex >= 2 ? const Color(0xFF0050E5) : const Color(0xFF334155)),
        _buildStepperDot(2, 'Done'),
      ],
    );
  }

  Widget _buildStepperDot(int step, String label) {
    final active = _simStepperActiveIndex >= step;
    return Column(
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: active ? const Color(0xFF0050E5) : const Color(0xFF1E293B),
            shape: BoxShape.circle,
            border: Border.all(color: active ? const Color(0xFF38BDF8) : const Color(0xFF475569)),
          ),
          alignment: Alignment.center,
          child: Text('${step + 1}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
        ),
        const SizedBox(height: 2),
        Text(label, style: TextStyle(fontSize: 9.5, color: active ? Colors.white : const Color(0xFF64748B))),
      ],
    );
  }

  Widget _buildSimPersonalCredentialsFields() {
    final reqPwd = _policy['requirePassword'] as bool? ?? true;
    final showPhone = _isCoreFieldPublished('phone');
    final showCategory = _isCoreFieldPublished('category');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: _buildSimDarkInput('First Name *', _simFirstNameCtrl, 'First Name')),
            const SizedBox(width: 8),
            Expanded(child: _buildSimDarkInput('Last Name *', _simLastNameCtrl, 'Last Name')),
          ],
        ),
        const SizedBox(height: 8),
        _buildSimDarkInput('Email Address *', _simEmailCtrl, 'user@domain.com'),
        if (showPhone) ...[
          const SizedBox(height: 8),
          _buildSimDarkInput('Phone Number', _simPhoneCtrl, '+0 (000) 000-0000'),
        ],
        if (showCategory && _categories.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text('CATEGORY TIER', style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8))),
          const SizedBox(height: 3),
          DropdownButtonFormField<String>(
            initialValue: _simSelectedCategory ?? _categories.first['id']?.toString(),
            dropdownColor: const Color(0xFF1E293B),
            style: const TextStyle(fontSize: 11.5, color: Colors.white),
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFF1E293B),
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF334155))),
            ),
            items: _categories.map((c) => DropdownMenuItem(value: c['id']?.toString(), child: Text(c['name']?.toString() ?? ''))).toList(),
            onChanged: (val) => setState(() => _simSelectedCategory = val),
          ),
        ],
        if (reqPwd) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _buildSimDarkInput('Password *', _simPasswordCtrl, '••••••••', obscure: true)),
              const SizedBox(width: 8),
              Expanded(child: _buildSimDarkInput('Confirm *', _simConfirmPasswordCtrl, '••••••••', obscure: true)),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildSimCustomQuestionsFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: _customFields.map((f) {
        final label = f['label'] as String? ?? 'Question';
        final key = f['fieldKey'] as String? ?? '';
        final isReq = f['isRequired'] as bool? ?? false;
        final type = f['fieldType'] as String? ?? 'text';
        final placeholder = f['placeholder'] as String? ?? '';

        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$label ${isReq ? '*' : ''}', style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8))),
              const SizedBox(height: 3),
              if (type == 'select' && f['options'] is List)
                DropdownButtonFormField<String>(
                  initialValue: _simAnswers[key] as String? ?? ((f['options'] as List).isNotEmpty ? (f['options'] as List).first.toString() : null),
                  dropdownColor: const Color(0xFF1E293B),
                  style: const TextStyle(fontSize: 11.5, color: Colors.white),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF334155))),
                  ),
                  items: (f['options'] as List).map((o) => DropdownMenuItem(value: o.toString(), child: Text(o.toString()))).toList(),
                  onChanged: (v) => setState(() => _simAnswers[key] = v),
                )
              else if (type == 'checkbox')
                Row(
                  children: [
                    Checkbox(
                      value: _simAnswers[key] as bool? ?? false,
                      activeColor: const Color(0xFF0050E5),
                      onChanged: (v) => setState(() => _simAnswers[key] = v ?? false),
                    ),
                    Expanded(child: Text(placeholder.isEmpty ? label : placeholder, style: const TextStyle(fontSize: 10.5, color: Colors.white))),
                  ],
                )
              else
                TextField(
                  style: const TextStyle(fontSize: 11.5, color: Colors.white),
                  decoration: InputDecoration(
                    hintText: placeholder.isEmpty ? 'Enter answer...' : placeholder,
                    hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF334155))),
                  ),
                  onChanged: (v) => _simAnswers[key] = v,
                ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSimDarkInput(String label, TextEditingController ctrl, String hint, {bool obscure = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8))),
        const SizedBox(height: 3),
        TextField(
          controller: ctrl,
          obscureText: obscure,
          style: const TextStyle(fontSize: 11.5, color: Colors.white),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
            filled: true,
            fillColor: const Color(0xFF1E293B),
            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF334155))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF334155))),
          ),
        ),
      ],
    );
  }
}
