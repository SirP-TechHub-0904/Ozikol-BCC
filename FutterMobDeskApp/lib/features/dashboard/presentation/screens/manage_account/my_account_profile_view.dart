import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/custom_text_field.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';
import '../../../../../core/widgets/page_header.dart';

/// <summary>
/// Screen presenting the personal member account profile details and organization dossier.
/// Provides 1-to-1 operational and visual parity with the web client, including:
/// - Organization dossier card with immutable Member ID, category, joined date, and status pills
/// - Salutation title, first/middle/last name, designation, phone, DOB, and gender fields
/// - Real backend profile persistence via `api/PortalUsersApi/me`
/// </summary>
class MyAccountProfileView extends ConsumerStatefulWidget {
  /// The active workspace organization context.
  final Workspace? workspace;

  /// Creates a [MyAccountProfileView].
  const MyAccountProfileView({super.key, this.workspace});

  @override
  ConsumerState<MyAccountProfileView> createState() => _MyAccountProfileViewState();
}

class _MyAccountProfileViewState extends ConsumerState<MyAccountProfileView> {
  final _firstNameController = TextEditingController();
  final _middleNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _designationController = TextEditingController();

  String? _selectedTitle;
  String _selectedGender = 'Male';
  DateTime? _selectedDob;

  // Dossier metadata
  String _memberId = 'CC-2026-0099';
  String _categoryName = 'Standard Member';
  String _joinDate = '2026';
  String _userStatus = 'Active Member';
  String? _avatarUrl;

  bool _isLoading = true;
  bool _isSaving = false;
  String? _errorMessage;
  String? _successMessage;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    final repo = ref.read(accountRepositoryProvider);

    try {
      final me = await repo.getPersonalProfile();
      final summary = me.isNotEmpty ? me : await repo.getAccountSummary();
      final ws = widget.workspace;

      if (mounted) {
        setState(() {
          final fullName = (summary['fullName'] ?? ws?.userFullName ?? '').toString();
          final parts = fullName.split(' ');

          _firstNameController.text = (summary['firstName'] ?? (parts.isNotEmpty ? parts.first : '')).toString();
          _middleNameController.text = (summary['middleName'] ?? '').toString();
          _lastNameController.text = (summary['lastName'] ?? (parts.length > 1 ? parts.sublist(1).join(' ') : '')).toString();
          _emailController.text = (summary['email'] ?? ws?.userEmail ?? '').toString();
          _phoneController.text = (summary['phoneNumber'] ?? '').toString();
          _designationController.text = (summary['designation'] ?? '').toString();

          _selectedTitle = summary['title']?.toString();
          _selectedGender = (summary['gender'] ?? 'Male').toString();

          if (summary['dateOfBirth'] != null) {
            final raw = summary['dateOfBirth'].toString();
            _selectedDob = DateTime.tryParse(raw);
          }

          _memberId = (summary['memberId'] ?? 'CC-2026-0099').toString();
          _categoryName = (summary['categoryName'] ?? 'Standard Member').toString();
          _joinDate = (summary['joinDate'] ?? summary['createdAt'] ?? '2026').toString();
          _userStatus = (summary['userStatus'] ?? 'Active Member').toString();
          _avatarUrl = summary['avatarUrl']?.toString();

          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _middleNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _designationController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();

    if (firstName.isEmpty || lastName.isEmpty) {
      setState(() => _errorMessage = 'First name and last name are required.');
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
      _successMessage = null;
    });

    final repo = ref.read(accountRepositoryProvider);
    final payload = {
      'title': _selectedTitle,
      'firstName': firstName,
      'middleName': _middleNameController.text.trim().isNotEmpty ? _middleNameController.text.trim() : null,
      'lastName': lastName,
      'phoneNumber': _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
      'designation': _designationController.text.trim().isNotEmpty ? _designationController.text.trim() : null,
      'gender': _selectedGender,
      'dateOfBirth': _selectedDob?.toIso8601String().split('T')[0],
      'avatarUrl': _avatarUrl,
    };

    final success = await repo.updatePersonalProfile(payload);

    if (mounted) {
      setState(() {
        _isSaving = false;
        if (success) {
          _successMessage = 'Personal identity details and bio saved successfully!';
        } else {
          _errorMessage = 'Failed to update profile details. Please try again.';
        }
      });
    }
  }

  String get _initials {
    final f = _firstNameController.text.isNotEmpty ? _firstNameController.text[0] : '';
    final l = _lastNameController.text.isNotEmpty ? _lastNameController.text[0] : '';
    return (f + l).toUpperCase().isNotEmpty ? (f + l).toUpperCase() : 'MB';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final ws = widget.workspace;
    final roles = ws?.userRoles ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          // Shared PageHeader mold: top-level account destination, so no back control.
          PageHeader(
            icon: Icons.badge_outlined,
            eyebrow: 'Personal Identity & Bio',
            title: 'My Profile & Dossier',
            description: 'Manage your personal credentials, contact info, bio, and organization dossier.',
            secondaryActions: [
                PageHeaderAction(
                  label: 'Refresh Profile',
                  compactLabel: 'Refresh',
                  icon: Icons.refresh_rounded,
                  onPressed: _loadProfile,
                ),
            ],
          ),
          const SizedBox(height: 24),

          // Success / Error Banner
          if (_successMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline_rounded, size: 18, color: AppColors.success),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _successMessage!,
                      style: const TextStyle(fontSize: 12.5, color: AppColors.success, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, size: 18, color: AppColors.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(fontSize: 12.5, color: AppColors.error, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Profile Dossier Summary Card
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: AppColors.primary,
                  backgroundImage: _avatarUrl != null ? NetworkImage(_avatarUrl!) : null,
                  child: _avatarUrl == null
                      ? Text(
                          _initials,
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                        )
                      : null,
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${_selectedTitle != null ? '$_selectedTitle ' : ''}${_firstNameController.text} ${_lastNameController.text}'.trim(),
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _designationController.text.isNotEmpty
                            ? _designationController.text
                            : (_emailController.text.isNotEmpty ? _emailController.text : 'Member of Organization'),
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? AppColors.gray400 : AppColors.gray600,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        children: [
                          _buildDossierPill(Icons.badge_outlined, _memberId, AppColors.primary),
                          _buildDossierPill(Icons.category_outlined, _categoryName, const Color(0xFF10B981)),
                          _buildDossierPill(Icons.event_outlined, 'Joined: $_joinDate', const Color(0xFF64748B)),
                          _buildDossierPill(Icons.verified_outlined, _userStatus, const Color(0xFF8B5CF6)),
                          for (final role in roles)
                            _buildDossierPill(Icons.shield_outlined, role, const Color(0xFFF59E0B)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Personal Identity & Bio Form Card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.person_outline_rounded, color: AppColors.primary, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Personal Identity & Bio',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Title & First/Middle/Last Name
                LayoutBuilder(
                  builder: (context, constraints) {
                    final isNarrow = constraints.maxWidth < 700;

                    if (isNarrow) {
                      return Column(
                        children: [
                          _buildTitleDropdown(),
                          const SizedBox(height: 14),
                          CustomTextField(
                            controller: _firstNameController,
                            label: 'First Name *',
                            placeholder: 'e.g. First Name',
                          ),
                          const SizedBox(height: 14),
                          CustomTextField(
                            controller: _middleNameController,
                            label: 'Middle Name (Optional)',
                            placeholder: 'Optional',
                          ),
                          const SizedBox(height: 14),
                          CustomTextField(
                            controller: _lastNameController,
                            label: 'Last Name *',
                            placeholder: 'e.g. Last Name',
                          ),
                        ],
                      );
                    }

                    return Column(
                      children: [
                        Row(
                          children: [
                            SizedBox(width: 140, child: _buildTitleDropdown()),
                            const SizedBox(width: 14),
                            Expanded(
                              child: CustomTextField(
                                controller: _firstNameController,
                                label: 'First Name *',
                                placeholder: 'e.g. First Name',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: CustomTextField(
                                controller: _middleNameController,
                                label: 'Middle Name (Optional)',
                                placeholder: 'Optional',
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: CustomTextField(
                                controller: _lastNameController,
                                label: 'Last Name *',
                                placeholder: 'e.g. Last Name',
                              ),
                            ),
                          ],
                        ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 16),

                // Designation & Phone
                LayoutBuilder(
                  builder: (context, constraints) {
                    final isNarrow = constraints.maxWidth < 700;

                    if (isNarrow) {
                      return Column(
                        children: [
                          CustomTextField(
                            controller: _designationController,
                            label: 'Professional Designation / Role',
                            placeholder: 'e.g. Senior Software Engineer',
                          ),
                          const SizedBox(height: 14),
                          CustomTextField(
                            controller: _phoneController,
                            label: 'Phone Number',
                            placeholder: 'e.g. +0 (000) 000-0000',
                            keyboardType: TextInputType.phone,
                          ),
                        ],
                      );
                    }

                    return Row(
                      children: [
                        Expanded(
                          child: CustomTextField(
                            controller: _designationController,
                            label: 'Professional Designation / Role',
                            placeholder: 'e.g. Senior Software Engineer',
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: CustomTextField(
                            controller: _phoneController,
                            label: 'Phone Number',
                            placeholder: 'e.g. +0 (000) 000-0000',
                            keyboardType: TextInputType.phone,
                          ),
                        ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 16),

                // Gender & Date of Birth
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Gender', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isDark ? AppColors.gray300 : AppColors.gray700)),
                          const SizedBox(height: 6),
                          DropdownButtonFormField<String>(
                            initialValue: _selectedGender,
                            decoration: const InputDecoration(border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                            items: const [
                              DropdownMenuItem(value: 'Male', child: Text('Male')),
                              DropdownMenuItem(value: 'Female', child: Text('Female')),
                              DropdownMenuItem(value: 'Other', child: Text('Other')),
                            ],
                            onChanged: (val) {
                              if (val != null) setState(() => _selectedGender = val);
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Date of Birth', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isDark ? AppColors.gray300 : AppColors.gray700)),
                          const SizedBox(height: 6),
                          OutlinedButton.icon(
                            icon: const Icon(Icons.calendar_today_outlined, size: 16),
                            label: Text(
                              _selectedDob != null
                                  ? '${_selectedDob!.year}-${_selectedDob!.month.toString().padLeft(2, '0')}-${_selectedDob!.day.toString().padLeft(2, '0')}'
                                  : 'Select Date',
                              style: const TextStyle(fontSize: 13),
                            ),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: _selectedDob ?? DateTime(1995, 1, 1),
                                firstDate: DateTime(1930),
                                lastDate: DateTime.now(),
                              );
                              if (picked != null) {
                                setState(() => _selectedDob = picked);
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),

                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    PrimaryButton(
                      text: _isSaving ? 'Saving Changes...' : 'Save Personal Details',
                      icon: const Icon(Icons.save_outlined, size: 16),
                      onPressed: _isSaving ? null : _handleSave,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTitleDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Title', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        DropdownButtonFormField<String?>(
          initialValue: _selectedTitle,
          decoration: const InputDecoration(border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
          items: const [
            DropdownMenuItem(value: null, child: Text('-- None --')),
            DropdownMenuItem(value: 'Mr', child: Text('Mr')),
            DropdownMenuItem(value: 'Mrs', child: Text('Mrs')),
            DropdownMenuItem(value: 'Ms', child: Text('Ms')),
            DropdownMenuItem(value: 'Dr', child: Text('Dr')),
            DropdownMenuItem(value: 'Prof', child: Text('Prof')),
            DropdownMenuItem(value: 'Engr', child: Text('Engr')),
            DropdownMenuItem(value: 'Chief', child: Text('Chief')),
            DropdownMenuItem(value: 'Barr', child: Text('Barr')),
          ],
          onChanged: (val) => setState(() => _selectedTitle = val),
        ),
      ],
    );
  }

  Widget _buildDossierPill(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }
}
