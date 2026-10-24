import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/custom_text_field.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../../../core/widgets/page_header.dart';
import '../../../data/account_repository.dart';

/// Screen presenting the comprehensive personal member account profile details,
/// organization dossier, security verification gauge, and in-place email & phone verification engines.
class MyAccountProfileView extends ConsumerStatefulWidget {
  /// The active workspace organization context.
  final Workspace? workspace;

  /// Callback to switch account navigation tabs.
  final ValueChanged<String>? onSelectTab;

  /// Creates a [MyAccountProfileView].
  const MyAccountProfileView({
    super.key,
    this.workspace,
    this.onSelectTab,
  });

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

  // Verification controllers
  final _emailOtpController = TextEditingController();
  final _phoneOtpController = TextEditingController();

  String? _selectedTitle;
  String _selectedGender = 'Male';
  DateTime? _selectedDob;

  // Dossier metadata
  String _memberId = 'CC-2026-0099';
  String _categoryName = 'Standard Member';
  String _joinDate = '2026';
  String _userStatus = 'Active Member';
  String? _avatarUrl;
  bool _emailConfirmed = false;
  bool _phoneConfirmed = false;
  List<String> _userRoles = [];

  bool _isLoading = true;
  bool _isSaving = false;
  String? _errorMessage;
  String? _successMessage;

  // Email verification state
  bool _isRequestingEmailOtp = false;
  bool _isConfirmingEmailOtp = false;
  bool _showEmailOtpBox = false;
  String? _emailVerifyError;
  String? _emailVerifySuccess;

  // Phone verification state
  bool _isRequestingPhoneOtp = false;
  bool _isConfirmingPhoneOtp = false;
  bool _showPhoneOtpBox = false;
  String? _phoneVerifyError;
  String? _phoneVerifySuccess;

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

          _emailConfirmed = summary['emailConfirmed'] == true;
          _phoneConfirmed = summary['phoneNumberConfirmed'] == true;

          if (summary['roles'] is List) {
            _userRoles = List<String>.from((summary['roles'] as List).map((e) => e.toString()));
          } else if (ws?.userRoles != null && ws!.userRoles.isNotEmpty) {
            _userRoles = ws.userRoles;
          }

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
    _emailOtpController.dispose();
    _phoneOtpController.dispose();
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

  // --- Email Verification Handlers ---
  Future<void> _requestEmailVerification() async {
    setState(() {
      _isRequestingEmailOtp = true;
      _emailVerifyError = null;
      _emailVerifySuccess = null;
    });

    final repo = ref.read(accountRepositoryProvider);
    final res = await repo.requestEmailVerification();

    if (mounted) {
      setState(() {
        _isRequestingEmailOtp = false;
        if (res['success'] == true) {
          _showEmailOtpBox = true;
          _emailVerifySuccess = res['message']?.toString() ?? 'Verification code sent to your email.';
        } else {
          _emailVerifyError = res['message']?.toString() ?? 'Failed to send email verification code.';
        }
      });
    }
  }

  Future<void> _confirmEmailVerification() async {
    final code = _emailOtpController.text.trim();
    if (code.length != 6) {
      setState(() => _emailVerifyError = 'Please enter a valid 6-digit confirmation code.');
      return;
    }

    setState(() {
      _isConfirmingEmailOtp = true;
      _emailVerifyError = null;
      _emailVerifySuccess = null;
    });

    final repo = ref.read(accountRepositoryProvider);
    final res = await repo.confirmEmailVerification(code);

    if (mounted) {
      setState(() {
        _isConfirmingEmailOtp = false;
        if (res['success'] == true) {
          _emailConfirmed = true;
          _showEmailOtpBox = false;
          _emailOtpController.clear();
          _emailVerifySuccess = res['message']?.toString() ?? 'Email verified successfully!';
        } else {
          _emailVerifyError = res['message']?.toString() ?? 'Invalid or expired verification code.';
        }
      });
    }
  }

  // --- Phone Verification Handlers ---
  Future<void> _requestPhoneVerification() async {
    if (_phoneController.text.trim().isEmpty) {
      setState(() => _phoneVerifyError = 'Please save your phone number before requesting verification.');
      return;
    }

    setState(() {
      _isRequestingPhoneOtp = true;
      _phoneVerifyError = null;
      _phoneVerifySuccess = null;
    });

    final repo = ref.read(accountRepositoryProvider);
    final res = await repo.requestPhoneVerification();

    if (mounted) {
      setState(() {
        _isRequestingPhoneOtp = false;
        if (res['success'] == true) {
          _showPhoneOtpBox = true;
          _phoneVerifySuccess = res['message']?.toString() ?? 'SMS verification code sent to your mobile phone.';
        } else {
          _phoneVerifyError = res['message']?.toString() ?? 'Failed to send SMS verification code.';
        }
      });
    }
  }

  Future<void> _confirmPhoneVerification() async {
    final code = _phoneOtpController.text.trim();
    if (code.length != 6) {
      setState(() => _phoneVerifyError = 'Please enter a valid 6-digit SMS verification code.');
      return;
    }

    setState(() {
      _isConfirmingPhoneOtp = true;
      _phoneVerifyError = null;
      _phoneVerifySuccess = null;
    });

    final repo = ref.read(accountRepositoryProvider);
    final res = await repo.confirmPhoneVerification(code);

    if (mounted) {
      setState(() {
        _isConfirmingPhoneOtp = false;
        if (res['success'] == true) {
          _phoneConfirmed = true;
          _showPhoneOtpBox = false;
          _phoneOtpController.clear();
          _phoneVerifySuccess = res['message']?.toString() ?? 'Mobile phone verified successfully!';
        } else {
          _phoneVerifyError = res['message']?.toString() ?? 'Invalid or expired SMS verification code.';
        }
      });
    }
  }

  String get _initials {
    final f = _firstNameController.text.isNotEmpty ? _firstNameController.text[0] : '';
    final l = _lastNameController.text.isNotEmpty ? _lastNameController.text[0] : '';
    return (f + l).toUpperCase().isNotEmpty ? (f + l).toUpperCase() : 'MB';
  }

  int get _securityHealthScore {
    int score = 50; // base profile creation
    if (_emailConfirmed) score += 25;
    if (_phoneConfirmed) score += 25;
    return score;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Standalone Page Header matching Web
          PageHeader(
            icon: Icons.person_pin_rounded,
            eyebrow: 'PERSONAL WORKSPACE DOSSIER',
            title: 'nav.my_profile'.tr(ref, fallback: 'My Profile & Dossier'),
            description: 'profile.desc'.tr(
              ref,
              fallback: 'View and manage your personal membership dossier, contact information, and workspace attributes.',
            ),
          ),
          const SizedBox(height: 20),

          // Header action strip matching Web
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.badge_rounded, size: 20, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Text(
                    'nav.my_profile'.tr(ref, fallback: 'Profile Information & Dossier'),
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                ],
              ),
              OutlinedButton.icon(
                onPressed: _loadProfile,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: Text('account.refresh_profile'.tr(ref, fallback: 'Refresh Profile'), style: const TextStyle(fontSize: 12.5)),
              ),
            ],
          ),
          const SizedBox(height: 16),

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

          // Profile Dossier Summary Card with Security Health Gauge
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
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
                              for (final role in _userRoles)
                                _buildDossierPill(Icons.shield_outlined, role, const Color(0xFFF59E0B)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                const Divider(),
                const SizedBox(height: 14),

                // Security Health Gauge & Quick Shortcuts
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.shield_rounded, size: 16, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Text(
                          'Security Health Score',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: (_securityHealthScore == 100 ? AppColors.success : AppColors.warning).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: (_securityHealthScore == 100 ? AppColors.success : AppColors.warning).withValues(alpha: 0.3),
                        ),
                      ),
                      child: Text(
                        _securityHealthScore == 100
                            ? '100% Fully Verified'
                            : '$_securityHealthScore% Action Required',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: _securityHealthScore == 100 ? AppColors.success : AppColors.warning,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _securityHealthScore / 100.0,
                    backgroundColor: isDark ? AppColors.gray800 : AppColors.gray200,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _securityHealthScore == 100 ? AppColors.success : AppColors.warning,
                    ),
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 16),

                // Quick Navigation Shortcuts
                Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => widget.onSelectTab?.call('security'),
                      icon: const Icon(Icons.lock_reset_rounded, size: 15, color: AppColors.primary),
                      label: const Text('Security & 2FA', style: TextStyle(fontSize: 12)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => widget.onSelectTab?.call('activity'),
                      icon: const Icon(Icons.history_rounded, size: 15, color: AppColors.primary),
                      label: const Text('My Activity', style: TextStyle(fontSize: 12)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Card 1: Personal Identity & Bio Form Card
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

                // Designation
                CustomTextField(
                  controller: _designationController,
                  label: 'Professional Designation / Role',
                  placeholder: 'e.g. Senior Software Engineer',
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
                      text: _isSaving ? '...' : 'btn.save_changes'.tr(ref, fallback: 'Save Personal Details'),
                      icon: const Icon(Icons.save_outlined, size: 16),
                      onPressed: _isSaving ? null : _handleSave,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Card 2: Primary Email & Verification Engine Card
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
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.email_outlined, color: AppColors.primary, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Primary Email Address',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                          ),
                        ),
                      ],
                    ),
                    _buildVerificationBadge(_emailConfirmed, 'Email'),
                  ],
                ),
                const SizedBox(height: 16),

                // Current Email Address display
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.backgroundDark : AppColors.surfaceVariantLight,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.alternate_email_rounded, size: 18, color: isDark ? AppColors.gray400 : AppColors.gray600),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _emailController.text.isNotEmpty ? _emailController.text : 'name@company.com',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                if (_emailConfirmed) ...[
                  // Verified Banner
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.success.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_rounded, size: 18, color: AppColors.success),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Your email address is verified and active for security notifications, password resets, and two-factor authentication.',
                            style: TextStyle(fontSize: 12.5, color: AppColors.success),
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  // Unverified Banner & In-Place Verification Box
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, size: 18, color: AppColors.warning),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Your email address is unconfirmed. Verify your email to secure your account, receive login alerts, and ensure account recovery.',
                            style: TextStyle(fontSize: 12.5, color: AppColors.warning, fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  if (_emailVerifyError != null) ...[
                    Text(
                      _emailVerifyError!,
                      style: const TextStyle(fontSize: 12, color: AppColors.error, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                  ],

                  if (_emailVerifySuccess != null) ...[
                    Text(
                      _emailVerifySuccess!,
                      style: const TextStyle(fontSize: 12, color: AppColors.success, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                  ],

                  if (!_showEmailOtpBox) ...[
                    ElevatedButton.icon(
                      onPressed: _isRequestingEmailOtp ? null : _requestEmailVerification,
                      icon: _isRequestingEmailOtp
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.mark_email_read_outlined, size: 16),
                      label: Text(_isRequestingEmailOtp ? 'Sending Code...' : 'Verify Email Address'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ] else ...[
                    // In-Place OTP Code Form
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.backgroundDark : AppColors.gray50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Enter the 6-digit confirmation code sent to your email:',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              SizedBox(
                                width: 180,
                                child: TextField(
                                  controller: _emailOtpController,
                                  keyboardType: TextInputType.number,
                                  maxLength: 6,
                                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                  decoration: const InputDecoration(
                                    counterText: '',
                                    hintText: '000000',
                                    border: OutlineInputBorder(),
                                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  ),
                                  style: const TextStyle(fontSize: 16, letterSpacing: 4, fontWeight: FontWeight.bold),
                                ),
                              ),
                              const SizedBox(width: 12),
                              ElevatedButton(
                                onPressed: _isConfirmingEmailOtp ? null : _confirmEmailVerification,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                child: _isConfirmingEmailOtp
                                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                    : const Text('Confirm Code'),
                              ),
                              const SizedBox(width: 8),
                              TextButton(
                                onPressed: _isRequestingEmailOtp ? null : _requestEmailVerification,
                                child: const Text('Resend', style: TextStyle(fontSize: 12.5)),
                              ),
                              TextButton(
                                onPressed: () => setState(() => _showEmailOtpBox = false),
                                child: const Text('Cancel', style: TextStyle(fontSize: 12.5, color: AppColors.gray500)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Card 3: Mobile Phone Number & SMS Verification Engine Card
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
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.phone_android_rounded, color: AppColors.primary, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Mobile Phone Number',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                          ),
                        ),
                      ],
                    ),
                    _buildVerificationBadge(_phoneConfirmed, 'Phone'),
                  ],
                ),
                const SizedBox(height: 16),

                // Current Phone Number display
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.backgroundDark : AppColors.surfaceVariantLight,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.phone_outlined, size: 18, color: isDark ? AppColors.gray400 : AppColors.gray600),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _phoneController.text.isNotEmpty ? _phoneController.text : 'No phone number configured',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: _phoneController.text.isNotEmpty
                                ? (isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight)
                                : AppColors.gray500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                if (_phoneConfirmed) ...[
                  // Verified Banner
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.success.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_rounded, size: 18, color: AppColors.success),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Your mobile phone is verified for urgent security dispatches and SMS two-factor verification challenges.',
                            style: TextStyle(fontSize: 12.5, color: AppColors.success),
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  // Unverified Banner & In-Place SMS Verification Box
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, size: 18, color: AppColors.warning),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Your mobile phone number is unconfirmed. Verify your phone to enable instant SMS security dispatches and multi-factor logins.',
                            style: TextStyle(fontSize: 12.5, color: AppColors.warning, fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  if (_phoneVerifyError != null) ...[
                    Text(
                      _phoneVerifyError!,
                      style: const TextStyle(fontSize: 12, color: AppColors.error, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                  ],

                  if (_phoneVerifySuccess != null) ...[
                    Text(
                      _phoneVerifySuccess!,
                      style: const TextStyle(fontSize: 12, color: AppColors.success, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                  ],

                  if (!_showPhoneOtpBox) ...[
                    ElevatedButton.icon(
                      onPressed: _phoneController.text.trim().isEmpty || _isRequestingPhoneOtp ? null : _requestPhoneVerification,
                      icon: _isRequestingPhoneOtp
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.sms_outlined, size: 16),
                      label: Text(_isRequestingPhoneOtp ? 'Sending SMS...' : 'Verify Phone via SMS'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ] else ...[
                    // In-Place SMS OTP Code Form
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.backgroundDark : AppColors.gray50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Enter the 6-digit SMS verification code sent to your phone:',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              SizedBox(
                                width: 180,
                                child: TextField(
                                  controller: _phoneOtpController,
                                  keyboardType: TextInputType.number,
                                  maxLength: 6,
                                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                  decoration: const InputDecoration(
                                    counterText: '',
                                    hintText: '000000',
                                    border: OutlineInputBorder(),
                                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  ),
                                  style: const TextStyle(fontSize: 16, letterSpacing: 4, fontWeight: FontWeight.bold),
                                ),
                              ),
                              const SizedBox(width: 12),
                              ElevatedButton(
                                onPressed: _isConfirmingPhoneOtp ? null : _confirmPhoneVerification,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                child: _isConfirmingPhoneOtp
                                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                    : const Text('Confirm SMS Code'),
                              ),
                              const SizedBox(width: 8),
                              TextButton(
                                onPressed: _isRequestingPhoneOtp ? null : _requestPhoneVerification,
                                child: const Text('Resend SMS', style: TextStyle(fontSize: 12.5)),
                              ),
                              TextButton(
                                onPressed: () => setState(() => _showPhoneOtpBox = false),
                                child: const Text('Cancel', style: TextStyle(fontSize: 12.5, color: AppColors.gray500)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
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

  Widget _buildVerificationBadge(bool isVerified, String type) {
    final color = isVerified ? AppColors.success : AppColors.warning;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(isVerified ? Icons.check_circle_rounded : Icons.warning_amber_rounded, size: 12, color: color),
          const SizedBox(width: 5),
          Text(
            isVerified ? 'Verified $type' : 'Unverified $type',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }
}
