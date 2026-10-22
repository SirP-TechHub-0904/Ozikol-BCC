import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Screen presenting workspace user directory settings, registration policies, and default assignments.
/// </summary>
class UserSettingsView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Creates a [UserSettingsView].
  const UserSettingsView({super.key, this.workspace});

  @override
  ConsumerState<UserSettingsView> createState() => _UserSettingsViewState();
}

class _UserSettingsViewState extends ConsumerState<UserSettingsView> {
  bool _isLoading = true;
  bool _isSaving = false;

  bool _allowSelfRegistration = true;
  bool _requireEmailVerification = true;
  bool _requireAdminApproval = false;
  bool _notifyAdminOnNewRegistration = true;
  String _defaultCategory = 'Staff';
  String _defaultRole = 'Member';

  List<String> _categories = ['Executive', 'Staff', 'Associate', 'General'];
  final List<String> _roles = ['Member', 'Staff', 'Administrator'];

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    setState(() => _isLoading = true);
    final repo = ref.read(accountRepositoryProvider);
    final settingsFuture = repo.getUserSettings();
    final catsFuture = repo.getCategories();
    final settings = await settingsFuture;
    final cats = await catsFuture;

    if (mounted) {
      setState(() {
        _allowSelfRegistration = settings['allowSelfRegistration'] ?? true;
        _requireEmailVerification = settings['requireEmailVerification'] ?? true;
        _requireAdminApproval = settings['requireAdminApproval'] ?? false;
        _notifyAdminOnNewRegistration = settings['notifyAdminOnNewRegistration'] ?? true;
        _defaultCategory = settings['defaultCategory'] ?? 'Staff';
        _defaultRole = settings['defaultRole'] ?? 'Member';

        if (cats.isNotEmpty) {
          _categories = cats.map((c) => c['name'].toString()).toList();
          if (!_categories.contains(_defaultCategory)) {
            _categories.insert(0, _defaultCategory);
          }
        }
        _isLoading = false;
      });
    }
  }

  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);
    final repo = ref.read(accountRepositoryProvider);

    final success = await repo.updateUserSettings({
      'allowSelfRegistration': _allowSelfRegistration,
      'requireEmailVerification': _requireEmailVerification,
      'requireAdminApproval': _requireAdminApproval,
      'notifyAdminOnNewRegistration': _notifyAdminOnNewRegistration,
      'defaultCategory': _defaultCategory,
      'defaultRole': _defaultRole,
    });

    if (mounted) {
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success ? 'Directory settings saved successfully' : 'Failed to save settings',
          ),
          backgroundColor: success ? AppColors.success : AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
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
                    'User Directory Settings',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Configure registration rules, default roles, and onboarding workflows',
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                ],
              ),
              PrimaryButton(
                text: _isSaving ? 'Saving...' : 'Save Settings',
                isFullWidth: false,
                icon: const Icon(Icons.save_outlined, size: 18),
                onPressed: _isSaving ? null : _saveSettings,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Registration Policies Card
          _buildCard(
            isDark: isDark,
            title: 'Registration Policies',
            subtitle: 'Manage how new members join your workspace',
            icon: Icons.how_to_reg_outlined,
            children: [
              _buildSwitchTile(
                title: 'Allow Public Self-Registration',
                subtitle: 'Enable prospective members to register via the public sign-up page',
                value: _allowSelfRegistration,
                onChanged: (val) => setState(() => _allowSelfRegistration = val),
                isDark: isDark,
              ),
              const Divider(height: 24),
              _buildSwitchTile(
                title: 'Require Email Verification',
                subtitle: 'Send a one-time verification link or code before activating accounts',
                value: _requireEmailVerification,
                onChanged: (val) => setState(() => _requireEmailVerification = val),
                isDark: isDark,
              ),
              const Divider(height: 24),
              _buildSwitchTile(
                title: 'Require Administrator Approval',
                subtitle: 'New registrations remain in Pending status until approved by an admin',
                value: _requireAdminApproval,
                onChanged: (val) => setState(() => _requireAdminApproval = val),
                isDark: isDark,
              ),
              const Divider(height: 24),
              _buildSwitchTile(
                title: 'Notify Administrators on New Signups',
                subtitle: 'Broadcast an in-app and email alert whenever a new member registers',
                value: _notifyAdminOnNewRegistration,
                onChanged: (val) => setState(() => _notifyAdminOnNewRegistration = val),
                isDark: isDark,
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Default Assignments Card
          _buildCard(
            isDark: isDark,
            title: 'Default Onboarding Assignments',
            subtitle: 'Specify default classification for newly registered accounts',
            icon: Icons.assignment_ind_outlined,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Default Role',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                            ),
                            borderRadius: BorderRadius.circular(10),
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              isExpanded: true,
                              value: _defaultRole,
                              items: _roles.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                              onChanged: (val) {
                                if (val != null) setState(() => _defaultRole = val);
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Default Category',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                            ),
                            borderRadius: BorderRadius.circular(10),
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              isExpanded: true,
                              value: _defaultCategory,
                              items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                              onChanged: (val) {
                                if (val != null) setState(() => _defaultCategory = val);
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCard({
    required bool isDark,
    required String title,
    required String subtitle,
    required IconData icon,
    required List<Widget> children,
  }) {
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
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    required bool isDark,
  }) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                ),
              ),
            ],
          ),
        ),
        Switch(
          value: value,
          onChanged: onChanged,
          activeThumbColor: AppColors.primary,
        ),
      ],
    );
  }
}
