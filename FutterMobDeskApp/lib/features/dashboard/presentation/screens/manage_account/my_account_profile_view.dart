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
/// Features 1-to-1 parity with Web console across 2-column desktop and responsive mobile layouts.
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

    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= 950;

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
                _buildAlertBanner(Icons.check_circle_outline_rounded, _successMessage!, AppColors.success),
                const SizedBox(height: 16),
              ],

              if (_errorMessage != null) ...[
                _buildAlertBanner(Icons.error_outline_rounded, _errorMessage!, AppColors.error),
                const SizedBox(height: 16),
              ],

              // Main Layout: 2-Column on Desktop (>=950px), Stacked on Mobile
              if (isDesktop)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Left Column: Sticky-Style Organization Dossier Card (330px width)
                    SizedBox(
                      width: 330,
                      child: _buildLeftDossierCard(isDark),
                    ),
                    const SizedBox(width: 24),

                    // Right Column: Modular Cards (Identity, Primary Email, Mobile Phone)
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildIdentityCard(isDark),
                          const SizedBox(height: 24),
                          _buildEmailCard(isDark),
                          const SizedBox(height: 24),
                          _buildPhoneCard(isDark),
                        ],
                      ),
                    ),
                  ],
                )
              else
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLeftDossierCard(isDark),
                    const SizedBox(height: 24),
                    _buildIdentityCard(isDark),
                    const SizedBox(height: 24),
                    _buildEmailCard(isDark),
                    const SizedBox(height: 24),
                    _buildPhoneCard(isDark),
                  ],
                ),
            ],
          ),
        );
      },
    );
  }

  // --- Left Column: Organization Dossier Card ---
  Widget _buildLeftDossierCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Centered Avatar with Camera Overlay
          Center(
            child: Stack(
              children: [
                CircleAvatar(
                  radius: 46,
                  backgroundColor: AppColors.primary,
                  backgroundImage: _avatarUrl != null ? NetworkImage(_avatarUrl!) : null,
                  child: _avatarUrl == null
                      ? Text(
                          _initials,
                          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                        )
                      : null,
                ),
                Positioned(
                  bottom: 2,
                  right: 2,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: isDark ? AppColors.surfaceDark : Colors.white, width: 2),
                    ),
                    child: const Icon(Icons.camera_alt_rounded, size: 14, color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // User Full Name
          Text(
            '${_selectedTitle != null ? '$_selectedTitle ' : ''}${_firstNameController.text} ${_lastNameController.text}'.trim(),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            ),
          ),
          const SizedBox(height: 4),

          // Designation / Subtitle
          Text(
            _designationController.text.isNotEmpty
                ? _designationController.text
                : 'Member of Organization',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: isDark ? AppColors.gray400 : AppColors.gray600,
            ),
          ),
          const SizedBox(height: 20),

          // Full-width Vertical Dossier Pills with Explicit Titles
          Column(
            children: [
              _buildVerticalDossierPill(Icons.badge_outlined, 'ID: $_memberId', const Color(0xFF0050E5), const Color(0xFFDBE8FF)),
              const SizedBox(height: 8),
              _buildVerticalDossierPill(Icons.category_outlined, 'Category: $_categoryName', const Color(0xFF059669), const Color(0xFFD1FAE5)),
              const SizedBox(height: 8),
              _buildVerticalDossierPill(Icons.event_outlined, 'Joined: $_joinDate', const Color(0xFF475569), const Color(0xFFF1F5F9)),
              const SizedBox(height: 8),
              _buildVerticalDossierPill(Icons.verified_outlined, 'Status: $_userStatus', const Color(0xFF16A34A), const Color(0xFFDCFCE7)),
              for (final role in _userRoles) ...[
                const SizedBox(height: 8),
                _buildVerticalDossierPill(Icons.shield_outlined, 'Role: $role', const Color(0xFFD97706), const Color(0xFFFEF3C7)),
              ],
            ],
          ),
          const SizedBox(height: 20),

          // Security Health Score Box
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? AppColors.backgroundDark : AppColors.gray50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'SECURITY HEALTH',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    Text(
                      '$_securityHealthScore%',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: _securityHealthScore == 100 ? AppColors.success : AppColors.warning,
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
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      _emailConfirmed ? Icons.check_circle_rounded : Icons.cancel_outlined,
                      size: 15,
                      color: _emailConfirmed ? AppColors.success : AppColors.gray400,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _emailConfirmed ? 'Email Verified' : 'Email Unverified',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: _emailConfirmed ? (isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight) : AppColors.gray500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(
                      _phoneConfirmed ? Icons.check_circle_rounded : Icons.cancel_outlined,
                      size: 15,
                      color: _phoneConfirmed ? AppColors.success : AppColors.gray400,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _phoneConfirmed ? 'Phone Verified' : 'Phone Unverified',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: _phoneConfirmed ? (isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight) : AppColors.gray500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Quick Navigation Links
          _buildQuickNavLink(
            icon: Icons.history_rounded,
            title: 'My Activity',
            onTap: () => widget.onSelectTab?.call('activity'),
            isDark: isDark,
          ),
          const SizedBox(height: 8),
          _buildQuickNavLink(
            icon: Icons.security_rounded,
            title: 'Manage Security & 2FA',
            onTap: () => widget.onSelectTab?.call('security'),
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  // --- Right Column Card 1: Personal Identity & Bio ---
  Widget _buildIdentityCard(bool isDark) {
    return Container(
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

          // Row: Title + First Name
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(width: 130, child: _buildTitleDropdown(isDark)),
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

          // Row: Middle Name + Last Name
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
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
          const SizedBox(height: 16),

          // Professional Designation / Role
          CustomTextField(
            controller: _designationController,
            label: 'Professional Designation / Role',
            placeholder: 'e.g. Senior Software Engineer',
          ),
          const SizedBox(height: 16),

          // Row: Gender (Dropdown) + Date of Birth
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Gender',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.gray300 : AppColors.gray700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedGender,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'Male', child: Text('Male')),
                        DropdownMenuItem(value: 'Female', child: Text('Female')),
                        DropdownMenuItem(value: 'Other', child: Text('Other')),
                        DropdownMenuItem(value: 'Prefer not to say', child: Text('Prefer not to say')),
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
                    Text(
                      'Date of Birth',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.gray300 : AppColors.gray700,
                      ),
                    ),
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
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        alignment: Alignment.centerLeft,
                        minimumSize: const Size.fromHeight(48),
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
          const SizedBox(height: 24),

          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              PrimaryButton(
                text: _isSaving ? 'Saving...' : 'btn.save_changes'.tr(ref, fallback: 'Save Personal Details'),
                icon: const Icon(Icons.save_outlined, size: 16),
                onPressed: _isSaving ? null : _handleSave,
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- Right Column Card 2: Primary Email Address ---
  Widget _buildEmailCard(bool isDark) {
    return Container(
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
                  const Icon(Icons.mail_outline_rounded, color: AppColors.primary, size: 20),
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

          // Email Display Row with Action Buttons
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isDark ? AppColors.backgroundDark : AppColors.surfaceVariantLight,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            ),
            child: Row(
              children: [
                Icon(Icons.alternate_email_rounded, size: 18, color: isDark ? AppColors.gray400 : AppColors.gray600),
                const SizedBox(width: 12),
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
                if (!_emailConfirmed && !_showEmailOtpBox) ...[
                  ElevatedButton.icon(
                    onPressed: _isRequestingEmailOtp ? null : _requestEmailVerification,
                    icon: _isRequestingEmailOtp
                        ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.mark_email_read_outlined, size: 14),
                    label: Text(_isRequestingEmailOtp ? 'Sending...' : 'Verify Email Now', style: const TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD97706),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                OutlinedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Email change requested. Use verified credentials.')),
                    );
                  },
                  icon: const Icon(Icons.edit_outlined, size: 14),
                  label: const Text('Change Email', style: TextStyle(fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          if (_emailConfirmed) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.success.withValues(alpha: 0.25)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.check_circle_rounded, size: 18, color: AppColors.success),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Your primary email address is verified and active for security notifications, password resets, and two-factor authentication.',
                      style: TextStyle(fontSize: 12.5, color: AppColors.success),
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            // Unverified Alert Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7).withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Icon(Icons.warning_amber_rounded, size: 20, color: Color(0xFFD97706)),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Verification Required: Your primary email address is unverified. Confirm your email to receive security alerts and enable self-service password recovery.',
                      style: TextStyle(fontSize: 12.5, color: Color(0xFF92400E), fontWeight: FontWeight.w500),
                    ),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton(
                    onPressed: _isRequestingEmailOtp ? null : _requestEmailVerification,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: _isRequestingEmailOtp
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Verify Email', style: TextStyle(fontSize: 12.5)),
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

            if (_showEmailOtpBox) ...[
              // In-Place OTP Verification Form Box
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.backgroundDark : AppColors.gray50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Enter the 6-digit verification code sent to your email:',
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
    );
  }

  // --- Right Column Card 3: Mobile Phone Number ---
  Widget _buildPhoneCard(bool isDark) {
    return Container(
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

          // Phone Display Row with Action Buttons
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isDark ? AppColors.backgroundDark : AppColors.surfaceVariantLight,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            ),
            child: Row(
              children: [
                Icon(Icons.phone_outlined, size: 18, color: isDark ? AppColors.gray400 : AppColors.gray600),
                const SizedBox(width: 12),
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
                if (!_phoneConfirmed && !_showPhoneOtpBox) ...[
                  ElevatedButton.icon(
                    onPressed: _phoneController.text.trim().isEmpty || _isRequestingPhoneOtp ? null : _requestPhoneVerification,
                    icon: _isRequestingPhoneOtp
                        ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.sms_outlined, size: 14),
                    label: Text(_isRequestingPhoneOtp ? 'Sending...' : 'Verify Phone via SMS', style: const TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD97706),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                OutlinedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Edit phone number in Personal Identity details above.')),
                    );
                  },
                  icon: const Icon(Icons.edit_outlined, size: 14),
                  label: const Text('Update Phone', style: TextStyle(fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          if (_phoneConfirmed) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.success.withValues(alpha: 0.25)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.check_circle_rounded, size: 18, color: AppColors.success),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Your mobile phone is verified for urgent security dispatches and SMS two-factor verification challenges.',
                      style: TextStyle(fontSize: 12.5, color: AppColors.success),
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            // Unverified Alert Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7).withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Icon(Icons.warning_amber_rounded, size: 20, color: Color(0xFFD97706)),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Verification Required: Your mobile phone number is unverified. Complete verification to receive urgent SMS security alerts and enable SMS OTP authentication.',
                      style: TextStyle(fontSize: 12.5, color: Color(0xFF92400E), fontWeight: FontWeight.w500),
                    ),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton(
                    onPressed: _phoneController.text.trim().isEmpty || _isRequestingPhoneOtp ? null : _requestPhoneVerification,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: _isRequestingPhoneOtp
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Verify Phone', style: TextStyle(fontSize: 12.5)),
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

            if (_showPhoneOtpBox) ...[
              // In-Place SMS OTP Verification Form Box
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.backgroundDark : AppColors.gray50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
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
    );
  }

  // --- Helper Widgets ---
  Widget _buildVerticalDossierPill(IconData icon, String label, Color textColor, Color bgColor) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: bgColor.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: textColor.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: textColor),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: textColor),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickNavLink({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
        ),
        child: Row(
          children: [
            Icon(icon, size: 16, color: AppColors.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                ),
              ),
            ),
            Icon(Icons.chevron_right_rounded, size: 18, color: isDark ? AppColors.gray400 : AppColors.gray500),
          ],
        ),
      ),
    );
  }

  Widget _buildTitleDropdown(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Title',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isDark ? AppColors.gray300 : AppColors.gray700,
          ),
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<String?>(
          initialValue: _selectedTitle,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
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

  Widget _buildVerificationBadge(bool isVerified, String type) {
    final color = isVerified ? AppColors.success : const Color(0xFFD97706);
    final bgColor = isVerified ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(isVerified ? Icons.check_circle_rounded : Icons.warning_amber_rounded, size: 13, color: color),
          const SizedBox(width: 5),
          Text(
            isVerified ? 'Verified $type' : 'Unverified $type',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertBanner(IconData icon, String message, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(fontSize: 12.5, color: color, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
