import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/central_adjuster.dart';
import '../../../../../core/widgets/custom_dropdown_field.dart';
import '../../../../../core/widgets/custom_text_field.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Dedicated full-page view for editing an existing workspace member profile.
/// Achieves 1-to-1 operational and visual parity with the Angular web client's UserEditComponent.
/// Features personal identity management, organizational category tier assignment,
/// system role configuration, and immutable member ID locks.
/// </summary>
class UserEditView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// The member data object to edit.
  final Map<String, dynamic> member;

  /// Callback invoked when navigating back.
  final VoidCallback? onNavigateBack;

  /// Callback invoked after profile changes are successfully saved.
  final VoidCallback? onUserUpdated;

  /// Creates a [UserEditView].
  const UserEditView({
    super.key,
    this.workspace,
    required this.member,
    this.onNavigateBack,
    this.onUserUpdated,
  });

  @override
  ConsumerState<UserEditView> createState() => _UserEditViewState();
}

class _UserEditViewState extends ConsumerState<UserEditView> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _suffixController;
  late TextEditingController _phoneController;
  late TextEditingController _designationController;

  String? _selectedTitle;
  int _selectedGender = 0;
  String? _selectedCategoryId;
  String _selectedRole = 'Member';

  List<String> _titleOptions = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Engr.', 'Chief', 'Rev.', 'Pastor'];
  List<Map<String, dynamic>> _categories = [];
  bool _isLoading = false;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final m = widget.member;
    final fullName = (m['fullName'] ?? '').toString();
    final nameParts = fullName.split(' ');

    _firstNameController = TextEditingController(
      text: m['firstName']?.toString() ?? (nameParts.isNotEmpty ? nameParts.first : ''),
    );
    _lastNameController = TextEditingController(
      text: m['lastName']?.toString() ?? (nameParts.length > 1 ? nameParts.sublist(1).join(' ') : ''),
    );
    _suffixController = TextEditingController(text: m['suffix']?.toString() ?? '');
    _phoneController = TextEditingController(text: m['phoneNumber']?.toString() ?? '');
    _designationController = TextEditingController(text: m['designation']?.toString() ?? 'Member');

    final rawTitle = m['title']?.toString().trim();
    if (rawTitle != null && rawTitle.isNotEmpty) {
      final clean = rawTitle.replaceAll('.', '').toLowerCase();
      if (clean == 'mr') {
        _selectedTitle = 'Mr.';
      } else if (clean == 'mrs') {
        _selectedTitle = 'Mrs.';
      } else if (clean == 'ms') {
        _selectedTitle = 'Ms.';
      } else if (clean == 'dr') {
        _selectedTitle = 'Dr.';
      } else if (clean == 'prof') {
        _selectedTitle = 'Prof.';
      } else if (clean == 'engr') {
        _selectedTitle = 'Engr.';
      } else {
        _selectedTitle = rawTitle;
      }
    } else {
      _selectedTitle = null;
    }
    _selectedGender = (m['gender'] is int) ? m['gender'] as int : 0;
    _selectedCategoryId = m['bcpUserCategoryId']?.toString();

    final roles = (m['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
    if (roles.contains('Admin')) {
      _selectedRole = 'Admin';
    } else if (roles.contains('Global Editor')) {
      _selectedRole = 'Global Editor';
    } else if (roles.contains('Feature Editor')) {
      _selectedRole = 'Feature Editor';
    } else if (roles.contains('Read Only')) {
      _selectedRole = 'Read Only';
    } else {
      _selectedRole = 'Member';
    }

    _loadInitialData();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _suffixController.dispose();
    _phoneController.dispose();
    _designationController.dispose();
    super.dispose();
  }

  /// <summary>
  /// Loads available categories and title settings from UsersApi.
  /// </summary>
  Future<void> _loadInitialData() async {
    setState(() => _isLoading = true);
    final repo = ref.read(accountRepositoryProvider);

    try {
      final results = await Future.wait([
        repo.getUserSettings(),
        repo.getCategories(),
      ]);
      final settings = results[0] as Map<String, dynamic>?;
      final cats = results[1] as List<Map<String, dynamic>>?;

      if (mounted) {
        setState(() {
          if (settings != null) {
            final rawTitles = settings['preFilledTitles'];
            if (rawTitles is List) {
              _titleOptions = rawTitles.map((e) => e.toString()).toList();
            } else if (rawTitles is String && rawTitles.isNotEmpty) {
              _titleOptions = rawTitles.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
            }
          }
          if (cats != null) {
            _categories = cats;
          }
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// <summary>
  /// Validates and submits updated member details to UsersApi.
  /// </summary>
  Future<void> _handleSaveUser() async {
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();

    if (firstName.isEmpty || lastName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('user_edit.err_required_names'.tr(ref, fallback: 'First name and last name are required.')),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    final userId = widget.member['id']?.toString() ?? '';
    if (userId.isEmpty) return;

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    final repo = ref.read(accountRepositoryProvider);
    final payload = <String, dynamic>{
      'title': _selectedTitle,
      'firstName': firstName,
      'lastName': lastName,
      'suffix': _suffixController.text.trim().isNotEmpty ? _suffixController.text.trim() : null,
      'gender': _selectedGender,
      'phoneNumber': _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
      'designation': _designationController.text.trim(),
      'bcpUserCategoryId': _selectedCategoryId,
      'role': _selectedRole,
      'roles': [_selectedRole],
    };

    final success = await repo.updateUserProfile(userId, payload);

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'user_edit.msg_profile_updated'.tr(ref, fallback: 'Profile for {name} updated successfully!')
                .replaceAll('{name}', '$firstName $lastName'),
          ),
          backgroundColor: AppColors.success,
        ),
      );
      if (widget.onUserUpdated != null) {
        widget.onUserUpdated!();
      } else if (widget.onNavigateBack != null) {
        widget.onNavigateBack!();
      } else {
        Navigator.of(context).maybePop();
      }
    } else {
      setState(() {
        _errorMessage = 'user_edit.err_update_failed'.tr(ref, fallback: 'Failed to update member profile. Please verify your network connection.');
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('user_edit.err_update_failed_short'.tr(ref, fallback: 'Failed to update member profile.')),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  String _sanitizeId(String? id) {
    if (id == null || id.isEmpty) return 'user_edit.id_pending'.tr(ref, fallback: 'Pending Assignment');
    return id.startsWith('ID-') ? id : 'ID-$id';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fullName = (widget.member['fullName'] ?? widget.member['userName'] ?? 'Member').toString();

    return CentralAdjuster.pageShell(
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Standardized Profile Management Header
            _buildPageHeader(isDark, fullName),
            const SizedBox(height: 20),

            // Loading / Error Banner
            if (_isLoading) ...[
              const LinearProgressIndicator(minHeight: 2.5),
              const SizedBox(height: 16),
            ],
            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, size: 18, color: Color(0xFFEF4444)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(fontSize: 12.5, color: Color(0xFFDC2626)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // 2. Responsive 2-Column Form Cards
            LayoutBuilder(
              builder: (context, constraints) {
                final isDesktop = constraints.maxWidth >= 960;

                if (isDesktop) {
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: _buildIdentityCard(isDark)),
                      const SizedBox(width: 18),
                      Expanded(child: _buildOrganizationCard(isDark)),
                    ],
                  );
                }

                return Column(
                  children: [
                    _buildIdentityCard(isDark),
                    const SizedBox(height: 18),
                    _buildOrganizationCard(isDark),
                  ],
                );
              },
            ),
            const SizedBox(height: 20),

            // 3. Card Footer Action Bar
            _buildFooterActionBar(isDark),
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // 1. PAGE HEADER
  // =========================================================================

  /// <summary>
  /// Builds the Profile Management header using the shared [PageHeader] mold.
  /// Back cancels editing and jumps to a specific page via [PageHeaderBack.to].
  /// </summary>
  /// <param name="isDark">Kept for call-site parity; the mold reads the theme itself.</param>
  /// <param name="fullName">Display name of the member being edited.</param>
  /// <returns>The standardized page header widget.</returns>
  Widget _buildPageHeader(bool isDark, String fullName) {
    return PageHeader(
      icon: Icons.manage_accounts_rounded,
      eyebrow: 'user_edit.header_eyebrow'.tr(ref, fallback: 'Profile Management'),
      title: 'user_edit.header_title'.tr(ref, fallback: 'Edit Profile: {name}').replaceAll('{name}', fullName),
      description: 'user_edit.header_desc'.tr(
        ref,
        fallback: 'Update member identity, change organizational category tier, and reassign system security roles.',
      ),
      back: PageHeaderBack.to(
        () {
          // Discard edits and return via the shell callback; otherwise pop the route.
          if (widget.onNavigateBack != null) {
            widget.onNavigateBack!();
          } else {
            Navigator.of(context).maybePop();
          }
        },
        label: 'user_edit.btn_cancel_back'.tr(ref, fallback: 'Cancel & Back'),
      ),
    );
  }

  // =========================================================================
  // 2. FORM CARDS
  // =========================================================================

  /// Card 1: Personal & Contact Details.
  Widget _buildIdentityCard(bool isDark) {
    final email = (widget.member['email'] ?? '').toString();

    return _buildFormCard(
      isDark: isDark,
      icon: Icons.badge_outlined,
      title: 'user_edit.card_identity_title'.tr(ref, fallback: 'Personal & Contact Details'),
      subtitle: 'user_edit.card_identity_subtitle'.tr(ref, fallback: 'Member name, gender, salutation, and direct contact line'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Name row with Title, First Name, Last Name, Suffix
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 96,
                child: CustomDropdownField<String?>(
                  label: 'user_edit.field_title'.tr(ref, fallback: 'Title'),
                  value: _selectedTitle,
                  items: [
                    DropdownMenuItem(value: null, child: Text('user_edit.title_none'.tr(ref, fallback: 'None'))),
                    ..._titleOptions.map(
                      (t) => DropdownMenuItem(value: t, child: Text(t)),
                    ),
                  ],
                  onChanged: (val) => setState(() => _selectedTitle = val),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 4,
                child: CustomTextField(
                  controller: _firstNameController,
                  label: 'user_edit.field_first_name'.tr(ref, fallback: 'First Name *'),
                  placeholder: 'user_edit.field_first_name_ph'.tr(ref, fallback: 'e.g. First Name'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 4,
                child: CustomTextField(
                  controller: _lastNameController,
                  label: 'user_edit.field_last_name'.tr(ref, fallback: 'Last Name *'),
                  placeholder: 'user_edit.field_last_name_ph'.tr(ref, fallback: 'e.g. Last Name'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: CustomTextField(
                  controller: _suffixController,
                  label: 'user_edit.field_suffix'.tr(ref, fallback: 'Suffix'),
                  placeholder: 'user_edit.field_suffix_ph'.tr(ref, fallback: 'e.g. mni'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Gender & Read-only Email
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: CustomDropdownField<int>(
                  label: 'user_edit.field_gender'.tr(ref, fallback: 'Gender *'),
                  value: _selectedGender,
                  items: [
                    DropdownMenuItem(value: 0, child: Text('user_edit.gender_male'.tr(ref, fallback: 'Male'))),
                    DropdownMenuItem(value: 1, child: Text('user_edit.gender_female'.tr(ref, fallback: 'Female'))),
                  ],
                  onChanged: (val) => setState(() => _selectedGender = val ?? 0),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'user_edit.field_work_email'.tr(ref, fallback: 'Work Email Address'),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.gray300 : const Color(0xFF334155),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
                      ),
                      alignment: Alignment.centerLeft,
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              email,
                              style: TextStyle(fontSize: 13, color: isDark ? AppColors.gray400 : const Color(0xFF64748B)),
                            ),
                          ),
                          const Icon(Icons.lock_outline_rounded, size: 16, color: Color(0xFF94A3B8)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'user_edit.work_email_hint'.tr(ref, fallback: 'Email address is permanently bound to the identity record.'),
                      style: const TextStyle(fontSize: 10.5, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Phone Number
          CustomTextField(
            controller: _phoneController,
            label: 'user_edit.field_phone'.tr(ref, fallback: 'Phone Number'),
            placeholder: 'user_edit.field_phone_ph'.tr(ref, fallback: 'e.g. +0 (000) 000-0000'),
          ),
        ],
      ),
    );
  }

  /// Card 2: Organizational Hierarchy & System Role.
  Widget _buildOrganizationCard(bool isDark) {
    final memberId = _sanitizeId(widget.member['memberId']?.toString());

    return _buildFormCard(
      isDark: isDark,
      icon: Icons.corporate_fare_rounded,
      title: 'user_edit.card_org_title'.tr(ref, fallback: 'Organizational Hierarchy & System Role'),
      subtitle: 'user_edit.card_org_subtitle'.tr(ref, fallback: 'Category tier, designation, and member ID'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Category Tier
          CustomDropdownField<String?>(
            label: 'user_edit.field_category'.tr(ref, fallback: 'Category Tier'),
            value: _selectedCategoryId,
            items: [
              DropdownMenuItem(value: null, child: Text('user_edit.category_unassigned'.tr(ref, fallback: 'Select Category (Unassigned)'))),
              ..._categories.map((c) => DropdownMenuItem(
                    value: c['id']?.toString(),
                    child: Text(c['name']?.toString() ?? 'Category'),
                  )),
            ],
            onChanged: (val) => setState(() => _selectedCategoryId = val),
          ),
          const SizedBox(height: 16),

          // Designation & Role
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: CustomTextField(
                  controller: _designationController,
                  label: 'user_edit.field_designation'.tr(ref, fallback: 'Designation / Job Title'),
                  placeholder: 'user_edit.field_designation_ph'.tr(ref, fallback: 'e.g. Senior Analyst'),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: CustomDropdownField<String>(
                  label: 'user_edit.field_role'.tr(ref, fallback: 'System Role'),
                  value: _selectedRole,
                  items: [
                    DropdownMenuItem(value: 'Member', child: Text('user_edit.role_member'.tr(ref, fallback: 'Member'))),
                    DropdownMenuItem(value: 'Admin', child: Text('user_edit.role_admin'.tr(ref, fallback: 'Admin'))),
                    DropdownMenuItem(value: 'Global Editor', child: Text('user_edit.role_global_editor'.tr(ref, fallback: 'Global Editor'))),
                    DropdownMenuItem(value: 'Feature Editor', child: Text('user_edit.role_feature_editor'.tr(ref, fallback: 'Feature Editor'))),
                    DropdownMenuItem(value: 'Read Only', child: Text('user_edit.role_read_only'.tr(ref, fallback: 'Read Only'))),
                  ],
                  onChanged: (val) => setState(() => _selectedRole = val ?? 'Member'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Member ID / Code (Permanent & Locked)
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'user_edit.field_member_id'.tr(ref, fallback: 'Member ID / Code'),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.gray300 : const Color(0xFF334155),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0050E5).withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.lock_rounded, size: 11, color: Color(0xFF0050E5)),
                        const SizedBox(width: 3),
                        Text(
                          'user_edit.badge_permanent'.tr(ref, fallback: 'Permanent / Immutable'),
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF0050E5)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Container(
                height: 48,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        memberId,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'monospace',
                          color: Color(0xFF0050E5),
                        ),
                      ),
                    ),
                    const Icon(Icons.tag_rounded, size: 16, color: Color(0xFF94A3B8)),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'user_edit.member_id_hint'.tr(ref, fallback: 'Member ID is permanently bound to this profile upon creation and cannot be modified.'),
                style: const TextStyle(fontSize: 10.5, color: Color(0xFF94A3B8)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // 3. FOOTER ACTION BAR
  // =========================================================================

  Widget _buildFooterActionBar(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              side: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
              foregroundColor: isDark ? AppColors.onSurfaceDark : const Color(0xFF334155),
            ),
            child: Text('user_edit.btn_cancel'.tr(ref, fallback: 'Cancel'), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ),
          PrimaryButton(
            text: _isSaving
                ? 'user_edit.btn_saving'.tr(ref, fallback: 'Saving Changes...')
                : 'user_edit.btn_save'.tr(ref, fallback: 'Save Profile Changes'),
            icon: const Icon(Icons.save_outlined, size: 16),
            isLoading: _isSaving,
            isFullWidth: false,
            onPressed: _isSaving ? null : _handleSaveUser,
          ),
        ],
      ),
    );
  }

  Widget _buildFormCard({
    required bool isDark,
    required IconData icon,
    required String title,
    required String subtitle,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
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
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 20, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      subtitle,
                      style: TextStyle(fontSize: 11.5, color: isDark ? AppColors.gray400 : const Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Divider(height: 1),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}
