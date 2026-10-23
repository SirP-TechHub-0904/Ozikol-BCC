import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/central_adjuster.dart';
import '../../../../../core/widgets/custom_dropdown_field.dart';
import '../../../../../core/widgets/custom_text_field.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Dedicated full-page view for creating a new workspace member profile.
/// Mirrors the Angular Web client's UserCreateComponent (1-to-1 operational parity).
/// </summary>
class UserCreateView extends ConsumerStatefulWidget {
  /// The active organization workspace context.
  final Workspace? workspace;

  /// Callback invoked when navigating back to the members directory.
  final VoidCallback? onNavigateBack;

  /// Callback invoked when a member account is successfully created.
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
  /// Validates and submits the member creation form to UsersApi.
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

    final createdData = await repo.createUser(payload);

    if (!mounted) return;

    setState(() => _isSaving = false);

    if (createdData != null) {
      final assignedMemberId = createdData['memberId']?.toString() ?? _activeIdPreview;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text('Account for $firstName $lastName ($assignedMemberId) created successfully!'),
              ),
            ],
          ),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 4),
        ),
      );

      // Present success credential summary modal, with 1-click button to redirect to Member Directory Index
      await _showCreatedSuccessDialog(
        isDark: Theme.of(context).brightness == Brightness.dark,
        title: _selectedTitle,
        firstName: firstName,
        lastName: lastName,
        suffix: _suffixController.text.trim(),
        email: email,
        memberId: assignedMemberId,
        password: password,
        role: _selectedRole,
      );
    } else {
      setState(() {
        _errorMessage = 'Failed to create member account. Please verify the email is unique in this workspace.';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to create member account. Please check your network and ensure email is unique.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  /// <summary>
  /// Displays an ultra-clean, celebratory credential summary dialog after member creation,
  /// featuring an initials avatar badge, 1-click clipboard copy with instant feedback,
  /// password show/hide toggle, and responsive directory navigation.
  /// </summary>
  Future<void> _showCreatedSuccessDialog({
    required bool isDark,
    required String? title,
    required String firstName,
    required String lastName,
    required String suffix,
    required String email,
    required String memberId,
    required String password,
    required String role,
  }) async {
    final fullName = [if (title != null && title.isNotEmpty) title, firstName, lastName, if (suffix.isNotEmpty) suffix].join(' ');

    bool obscurePassword = false;
    bool isPasswordCopied = false;
    bool isMemberIdCopied = false;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final fInitial = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
            final lInitial = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
            final initials = (fInitial + lInitial).isNotEmpty ? (fInitial + lInitial) : 'U';

            return AlertDialog(
              backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(
                  color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                  width: 1,
                ),
              ),
              contentPadding: const EdgeInsets.all(26),
              content: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Header with Emerald Badge, Title, and Active status
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [Color(0xFF10B981), Color(0xFF059669)],
                            ),
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF10B981).withValues(alpha: 0.28),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Icon(Icons.check_circle_rounded, color: Colors.white, size: 26),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    'Member Account Created',
                                    style: TextStyle(
                                      fontSize: 17.5,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -0.3,
                                      color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981).withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(9999),
                                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.25)),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.circle, size: 6, color: Color(0xFF10B981)),
                                        SizedBox(width: 4),
                                        Text(
                                          'Active',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFF059669),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 3),
                              Text(
                                'Member profile registered & workspace access granted.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // 2. Member Profile Preview Card
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [Color(0xFF0050E5), Color(0xFF3B82F6)],
                              ),
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF0050E5).withValues(alpha: 0.25),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              initials,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  fullName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                                  ),
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  email,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEEF2FF),
                              borderRadius: BorderRadius.circular(9999),
                              border: Border.all(
                                color: isDark ? const Color(0xFF475569) : const Color(0xFFC7D2FE),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.shield_outlined,
                                  size: 12,
                                  color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF0050E5),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  role,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF0050E5),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // 3. Member ID Spec Row
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF0F172A).withValues(alpha: 0.6) : Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.badge_outlined, size: 16, color: isDark ? AppColors.gray400 : const Color(0xFF64748B)),
                          const SizedBox(width: 8),
                          Text(
                            'Member ID',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                            ),
                          ),
                          const Spacer(),
                          InkWell(
                            borderRadius: BorderRadius.circular(6),
                            onTap: () {
                              Clipboard.setData(ClipboardData(text: memberId));
                              setModalState(() => isMemberIdCopied = true);
                              Future.delayed(const Duration(seconds: 2), () {
                                if (ctx.mounted) setModalState(() => isMemberIdCopied = false);
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: isDark ? const Color(0xFF3B82F6).withValues(alpha: 0.4) : const Color(0xFFBFDBFE),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    memberId,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      fontFamily: 'monospace',
                                      color: Color(0xFF0050E5),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Icon(
                                    isMemberIdCopied ? Icons.check_rounded : Icons.copy_rounded,
                                    size: 13,
                                    color: isMemberIdCopied ? const Color(0xFF10B981) : const Color(0xFF0050E5),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // 4. Credential Vault: Temporary Password Container
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: isDark
                              ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                              : [const Color(0xFFF0FDF4), const Color(0xFFF8FAFC)],
                        ),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark ? const Color(0xFF10B981).withValues(alpha: 0.3) : const Color(0xFF86EFAC),
                          width: 1.2,
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
                                  const Icon(Icons.vpn_key_rounded, size: 15, color: Color(0xFF059669)),
                                  const SizedBox(width: 6),
                                  Text(
                                    'TEMPORARY LOGIN PASSWORD',
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.5,
                                      color: isDark ? const Color(0xFF34D399) : const Color(0xFF065F46),
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'One-time setup',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF92400E),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF0F172A) : Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                              ),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: SelectableText(
                                    obscurePassword ? '••••••••••••' : password,
                                    style: const TextStyle(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w700,
                                      fontFamily: 'monospace',
                                      letterSpacing: 0.5,
                                      color: Color(0xFF0050E5),
                                    ),
                                  ),
                                ),
                                IconButton(
                                  icon: Icon(
                                    obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                    size: 16,
                                    color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                                  ),
                                  tooltip: obscurePassword ? 'Show password' : 'Hide password',
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                                  onPressed: () => setModalState(() => obscurePassword = !obscurePassword),
                                ),
                                const SizedBox(width: 6),
                                ElevatedButton.icon(
                                  onPressed: () {
                                    Clipboard.setData(ClipboardData(text: password));
                                    setModalState(() => isPasswordCopied = true);
                                    Future.delayed(const Duration(seconds: 2), () {
                                      if (ctx.mounted) setModalState(() => isPasswordCopied = false);
                                    });
                                  },
                                  icon: Icon(
                                    isPasswordCopied ? Icons.check_circle_rounded : Icons.copy_rounded,
                                    size: 13,
                                    color: isPasswordCopied ? const Color(0xFF059669) : Colors.white,
                                  ),
                                  label: Text(
                                    isPasswordCopied ? 'Copied!' : 'Copy',
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w700,
                                      color: isPasswordCopied ? const Color(0xFF059669) : Colors.white,
                                    ),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: isPasswordCopied ? const Color(0xFFD1FAE5) : const Color(0xFF0050E5),
                                    elevation: 0,
                                    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // 5. Welcome Email Delivery Banner
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0050E5).withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF0050E5).withValues(alpha: 0.16)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 26,
                            height: 26,
                            decoration: BoxDecoration(
                              color: const Color(0xFF0050E5).withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Icon(Icons.mark_email_read_rounded, size: 15, color: Color(0xFF0050E5)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Welcome Email Dispatched',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1E3A8A),
                                  ),
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  'Login credentials & sign-in instructions queued for delivery.',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark ? AppColors.gray400 : const Color(0xFF475569),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 6. Action Buttons: Add Another Member + Go to Directory
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              _resetForm();
                            },
                            icon: const Icon(Icons.person_add_rounded, size: 16),
                            label: const Text(
                              'Add Another Member',
                              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                            ),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 11),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              side: BorderSide(
                                color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1),
                                width: 1.2,
                              ),
                              foregroundColor: isDark ? AppColors.onSurfaceDark : const Color(0xFF334155),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              _redirectToDirectory();
                            },
                            icon: const Icon(Icons.groups_rounded, size: 16, color: Colors.white),
                            label: const Text(
                              'Go to Directory',
                              style: TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w700),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              elevation: 2,
                              shadowColor: AppColors.primary.withValues(alpha: 0.35),
                              padding: const EdgeInsets.symmetric(vertical: 11),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  /// <summary>
  /// Redirects to the Member Directory index.
  /// </summary>
  void _redirectToDirectory() {
    if (widget.onUserCreated != null) {
      widget.onUserCreated!.call();
    } else if (widget.onNavigateBack != null) {
      widget.onNavigateBack!.call();
    }
  }

  /// <summary>
  /// Resets the form fields and refreshes member ID and password for another entry.
  /// </summary>
  void _resetForm() {
    _firstNameController.clear();
    _lastNameController.clear();
    _suffixController.clear();
    _emailController.clear();
    _phoneController.clear();
    _designationController.clear();
    _generatePassword();
    _loadInitialData();
    setState(() {
      _selectedTitle = null;
      _selectedGender = 0;
      _selectedCategoryId = null;
      _selectedRole = 'Member';
    });
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

            // Card 3: Security & Password Setup
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
                  'NEW MEMBER REGISTRATION',
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
                  'Create a new member profile, assign category tier, select roles, and configure temporary password credentials.',
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
  /// Card 3: Security & Password Setup form section.
  /// </summary>
  Widget _buildSecurityCard(bool isDark) {
    return _buildFormCard(
      isDark: isDark,
      icon: Icons.lock_open_rounded,
      title: 'Security & Password Setup',
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
                text: _isSaving ? 'Creating Member...' : 'Create Member',
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
