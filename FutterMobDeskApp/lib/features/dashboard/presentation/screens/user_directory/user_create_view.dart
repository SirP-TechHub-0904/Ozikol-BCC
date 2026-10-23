import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/central_adjuster.dart';
import '../../../../../core/widgets/custom_dropdown_field.dart';
import '../../../../../core/widgets/custom_text_field.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Dedicated full-page view for provisioning a new workspace member profile.
/// Mirrors the Angular Web client's UserCreateComponent (1-to-1 operational parity).
/// </summary>
class UserCreateView extends ConsumerStatefulWidget {
  /// The active organization workspace context.
  final Workspace? workspace;

  /// Callback invoked when navigating back to the members directory.
  final VoidCallback? onNavigateBack;

  /// Callback invoked when a member account is successfully provisioned.
  final VoidCallback? onUserCreated;

  /// Creates a [UserCreateView].
  const UserCreateView({
    super.key,
    this.workspace,
    this.onNavigateBack,
    this.onUserCreated,
  });

  @override
  ConsumerState<UserCreateView> createState() => _UserCreateViewState();
}

class _UserCreateViewState extends ConsumerState<UserCreateView> {
  final _formKey = GlobalKey<FormState>();

  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _suffixController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _designationController = TextEditingController(text: 'Senior Analyst');
  final _passwordController = TextEditingController();

  String? _selectedTitle = 'Mr.';
  int _selectedGender = 0; // 0 = Male, 1 = Female
  String? _selectedCategoryId;
  String _selectedRole = 'Member';
  bool _mustChangePassword = true;

  bool _isSaving = false;
  bool _isLoadingConfig = true;
  String? _errorMessage;

  List<String> _titleOptions = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Engr.', 'Chief', 'Rev.', 'Pastor'];
  bool _enableTitle = true;
  bool _enableSuffix = false;

  List<Map<String, dynamic>> _categories = [];
  String _activeIdPreview = 'Auto-generated on creation (Active Format)';
  String _activeFormatName = '';

  @override
  void initState() {
    super.initState();
    _generatePassword();
    _loadInitialData();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _suffixController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _designationController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  /// <summary>
  /// Generates a strong temporary password adhering to default complexity rules.
  /// </summary>
  void _generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%*';
    final random = Random.secure();
    final buffer = StringBuffer('Pass@');
    for (int i = 0; i < 5; i++) {
      buffer.write(chars[random.nextInt(chars.length)]);
    }
    setState(() {
      _passwordController.text = buffer.toString();
    });
  }

  /// <summary>
  /// Loads organizational settings, categories, and Member ID formatting rules.
  /// </summary>
  Future<void> _loadInitialData() async {
    setState(() => _isLoadingConfig = true);
    final repo = ref.read(accountRepositoryProvider);

    try {
      final results = await Future.wait([
        repo.getUserSettings(),
        repo.getCategories(),
        repo.getMemberIdConfig(),
      ]);

      final settings = results[0] as Map<String, dynamic>?;
      final categoriesList = results[1] as List<Map<String, dynamic>>?;
      final memberIdConfig = results[2] as Map<String, dynamic>?;

      if (mounted) {
        setState(() {
          if (settings != null) {
            _enableTitle = settings['enableTitle'] as bool? ?? true;
            _enableSuffix = settings['enableSuffix'] as bool? ?? false;
            final rawTitles = settings['preFilledTitles'];
            if (rawTitles is List) {
              _titleOptions = rawTitles.map((e) => e.toString()).toList();
            } else if (rawTitles is String && rawTitles.isNotEmpty) {
              _titleOptions = rawTitles.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
            }
          }

          if (categoriesList != null) {
            _categories = categoriesList;
          }

          if (memberIdConfig != null) {
            final activeKey = memberIdConfig['activeFormat']?.toString();
            final previews = (memberIdConfig['previews'] as List<dynamic>?) ?? [];
            final match = previews.firstWhere(
              (p) => (p as Map)['key']?.toString() == activeKey,
              orElse: () => null,
            );
            if (match is Map) {
              _activeFormatName = match['name']?.toString() ?? '';
              final rawExample = match['previewExample']?.toString() ?? '';
              _activeIdPreview = rawExample.replaceAll(RegExp(r'[-]{2,}'), '-').replaceAll(RegExp(r'[/]{2,}'), '/');
            }
          }

          _isLoadingConfig = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingConfig = false);
      }
    }
  }

  /// <summary>
  /// Validates and submits the member provisioning form to UsersApi.
  /// </summary>
  Future<void> _handleSaveUser() async {
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (firstName.isEmpty || lastName.isEmpty || email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('First name, last name, work email, and temporary password are required.'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(email)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid work email address (name@company.com).'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    final repo = ref.read(accountRepositoryProvider);
    final payload = <String, dynamic>{
      'title': _enableTitle ? _selectedTitle : null,
      'firstName': firstName,
      'lastName': lastName,
      'suffix': _enableSuffix ? _suffixController.text.trim() : null,
      'gender': _selectedGender,
      'email': email,
      'phoneNumber': _phoneController.text.trim(),
      'designation': _designationController.text.trim(),
      'role': _selectedRole,
      'bcpUserCategoryId': _selectedCategoryId,
      'password': password,
      'mustChangePassword': _mustChangePassword,
    };

    final success = await repo.createUser(payload);

    if (!mounted) return;

    setState(() => _isSaving = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Account for $firstName $lastName provisioned successfully!'),
          backgroundColor: AppColors.success,
        ),
      );
      widget.onUserCreated?.call();
      widget.onNavigateBack?.call();
    } else {
      setState(() {
        _errorMessage = 'Failed to provision member account. Please verify the email is unique in this workspace.';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to provision member account. Please check your network and ensure email is unique.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return CentralAdjuster.pageShell(
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Standardized Page Header (matching web app-page-header)
            _buildPageHeader(isDark),
            if (_isLoadingConfig) ...[
              const SizedBox(height: 6),
              const LinearProgressIndicator(minHeight: 2.5),
            ],
            const SizedBox(height: 20),

            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: AppColors.error, fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Cards Grid (Two columns on desktop, single on mobile)
            CentralAdjuster.split(
              breakpoint: 1000,
              first: _buildPersonalCard(isDark),
              second: _buildOrganizationalCard(isDark),
            ),

            const SizedBox(height: 18),

            // Card 3: Security & Password Provisioning
            _buildSecurityCard(isDark),
          ],
        ),
      ),
    );
  }

  /// <summary>
  /// Builds the standardized full-width page header matching Angular's app-page-header.
  /// </summary>
  Widget _buildPageHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.person_add_rounded, size: 24, color: AppColors.primary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'USER PROVISIONING',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.08,
                    color: isDark ? AppColors.gray400 : AppColors.gray600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Create New Member Account',
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Provision an authorized user profile, assign category tier, select roles, and configure temporary password credentials.',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          OutlinedButton.icon(
            onPressed: () {
              if (widget.onNavigateBack != null) {
                widget.onNavigateBack!();
              } else {
                Navigator.of(context).maybePop();
              }
            },
            icon: const Icon(Icons.arrow_back_rounded, size: 16),
            label: const Text('Back to Directory', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
              side: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
              foregroundColor: isDark ? AppColors.onSurfaceDark : const Color(0xFF334155),
            ),
          ),
        ],
      ),
    );
  }

  /// <summary>
  /// Card 1: Personal & Contact Information form section.
  /// </summary>
  Widget _buildPersonalCard(bool isDark) {
    return _buildFormCard(
      isDark: isDark,
      icon: Icons.badge_outlined,
      title: 'Personal & Contact Information',
      subtitle: 'Basic identity, gender, and direct contact details',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Name Row: Title + First Name + Last Name + Suffix
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_enableTitle) ...[
                SizedBox(
                  width: 120,
                  child: CustomDropdownField<String?>(
                    label: 'Title',
                    value: _selectedTitle,
                    items: [
                      const DropdownMenuItem(value: null, child: Text('None', style: TextStyle(fontSize: 14))),
                      ..._titleOptions.map(
                        (t) => DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 14))),
                      ),
                    ],
                    onChanged: (val) => setState(() => _selectedTitle = val),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              Expanded(
                flex: 2,
                child: CustomTextField(
                  controller: _firstNameController,
                  label: 'First Name *',
                  placeholder: 'e.g. First Name',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: CustomTextField(
                  controller: _lastNameController,
                  label: 'Last Name *',
                  placeholder: 'e.g. Last Name',
                ),
              ),
              if (_enableSuffix) ...[
                const SizedBox(width: 12),
                SizedBox(
                  width: 100,
                  child: CustomTextField(
                    controller: _suffixController,
                    label: 'Suffix',
                    placeholder: 'e.g. mni, PhD',
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),

          // Gender & Email Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 120,
                child: CustomDropdownField<int>(
                  label: 'Gender *',
                  value: _selectedGender,
                  items: const [
                    DropdownMenuItem(value: 0, child: Text('Male', style: TextStyle(fontSize: 14))),
                    DropdownMenuItem(value: 1, child: Text('Female', style: TextStyle(fontSize: 14))),
                  ],
                  onChanged: (val) => setState(() => _selectedGender = val ?? 0),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: CustomTextField(
                  controller: _emailController,
                  label: 'Email Address *',
                  keyboardType: TextInputType.emailAddress,
                  placeholder: 'name@company.com',
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Phone Number Field
          CustomTextField(
            controller: _phoneController,
            label: 'Phone Number',
            keyboardType: TextInputType.phone,
            placeholder: 'e.g. +0 (000) 000-0000',
          ),
        ],
      ),
    );
  }

  /// <summary>
  /// Card 2: Organizational Hierarchy & Access form section.
  /// </summary>
  Widget _buildOrganizationalCard(bool isDark) {
    return _buildFormCard(
      isDark: isDark,
      icon: Icons.apartment_rounded,
      title: 'Organizational Hierarchy & Access',
      subtitle: 'Category tier assignment and system permissions',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Category Tier Dropdown
          CustomDropdownField<String?>(
            label: 'Category Tier',
            value: _selectedCategoryId,
            placeholder: 'Select Category (Optional)',
            helperText: 'Assign to an organizational unit or department tier.',
            items: [
              const DropdownMenuItem(value: null, child: Text('Select Category (Optional)', style: TextStyle(fontSize: 14))),
              ..._categories.map((c) => DropdownMenuItem(
                    value: c['id']?.toString(),
                    child: Text(c['name']?.toString() ?? 'Category', style: const TextStyle(fontSize: 14)),
                  )),
            ],
            onChanged: (val) => setState(() => _selectedCategoryId = val),
          ),
          const SizedBox(height: 16),

          // Designation & Role Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 3,
                child: CustomTextField(
                  controller: _designationController,
                  label: 'Designation / Job Title',
                  placeholder: 'e.g. Senior Analyst',
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                flex: 2,
                child: CustomDropdownField<String>(
                  label: 'System Role',
                  value: _selectedRole,
                  items: const [
                    DropdownMenuItem(value: 'Member', child: Text('Member', style: TextStyle(fontSize: 14))),
                    DropdownMenuItem(value: 'Admin', child: Text('Admin', style: TextStyle(fontSize: 14))),
                    DropdownMenuItem(value: 'Global Editor', child: Text('Global Editor', style: TextStyle(fontSize: 14))),
                    DropdownMenuItem(value: 'Feature Editor', child: Text('Feature Editor', style: TextStyle(fontSize: 14))),
                    DropdownMenuItem(value: 'Read Only', child: Text('Read Only', style: TextStyle(fontSize: 14))),
                  ],
                  onChanged: (val) => setState(() => _selectedRole = val ?? 'Member'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Member ID / Code (System Auto-Generated Locked Input)
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildFieldLabel('Member ID / Code'),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.auto_awesome, size: 12, color: AppColors.primary),
                        SizedBox(width: 4),
                        Text(
                          'System Auto-Generated',
                          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _activeIdPreview.isNotEmpty ? _activeIdPreview : 'Auto-generated on creation ($_activeFormatName)',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                    Icon(Icons.tag_rounded, size: 18, color: isDark ? AppColors.gray500 : const Color(0xFF94A3B8)),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Member ID will be uniquely generated and permanently assigned using your workspace\'s configured coding rules.',
                style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// <summary>
  /// Card 3: Security & Password Provisioning form section.
  /// </summary>
  Widget _buildSecurityCard(bool isDark) {
    return _buildFormCard(
      isDark: isDark,
      icon: Icons.lock_open_rounded,
      title: 'Security & Password Provisioning',
      subtitle: 'Setup temporary access credentials for initial member sign-in',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CustomTextField(
                      controller: _passwordController,
                      label: 'Initial Temporary Password *',
                      placeholder: 'e.g. Pass@9382',
                    ),
                    const SizedBox(height: 4),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton.icon(
                        onPressed: _generatePassword,
                        icon: const Icon(Icons.autorenew_rounded, size: 14, color: AppColors.primary),
                        label: const Text(
                          'Generate Strong Password',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary),
                        ),
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 24),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Checkbox(
                        value: _mustChangePassword,
                        activeColor: AppColors.primary,
                        onChanged: (val) => setState(() => _mustChangePassword = val ?? true),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Require password change on first login',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.onSurfaceDark : const Color(0xFF1E293B),
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'Forces the member to set their own permanent password immediately upon signing in.',
                              style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(height: 1),
          const SizedBox(height: 18),

          // Footer action buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton(
                onPressed: () {
                  if (widget.onNavigateBack != null) {
                    widget.onNavigateBack!();
                  } else {
                    Navigator.of(context).maybePop();
                  }
                },
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  side: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
                  foregroundColor: isDark ? AppColors.onSurfaceDark : const Color(0xFF334155),
                ),
                child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              ),
              const SizedBox(width: 12),
              PrimaryButton(
                text: _isSaving ? 'Provisioning Account...' : 'Create & Provision Member',
                icon: const Icon(Icons.person_add_rounded, size: 16),
                isLoading: _isSaving,
                isFullWidth: false,
                onPressed: _isSaving ? null : _handleSaveUser,
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// <summary>
  /// Reusable container wrapping each form card section.
  /// </summary>
  Widget _buildFormCard({
    required bool isDark,
    required IconData icon,
    required String title,
    required String subtitle,
    required Widget child,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Card Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B).withValues(alpha: 0.5) : const Color(0xFFFAFBFC),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
              border: Border(bottom: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFF1F5F9))),
            ),
            child: Row(
              children: [
                Icon(icon, size: 22, color: AppColors.primary),
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
                      const SizedBox(height: 1),
                      Text(
                        subtitle,
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
          ),

          // Card Body
          Padding(
            padding: const EdgeInsets.all(20),
            child: child,
          ),
        ],
      ),
    );
  }

  Widget _buildFieldLabel(String label) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Text(
      label,
      style: TextStyle(
        fontWeight: FontWeight.w600,
        fontSize: 13,
        color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
        letterSpacing: 0.2,
      ),
    );
  }
}
