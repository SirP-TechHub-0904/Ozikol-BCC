import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Registration Form Builder Screen in Flutter Desktop and Mobile.
/// Provides administrative control over tenant self-registration policies,
/// custom fields, public URL link, and form activation toggles.
/// </summary>
class RegistrationFormBuilderView extends ConsumerStatefulWidget {
  final Workspace? workspace;
  final void Function(int tabIndex)? onNavigateToTab;
  final VoidCallback? onNavigateBack;

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
  List<Map<String, dynamic>> _fields = [];
  Map<String, dynamic> _policy = {
    'allowPublicRegistration': true,
    'requireApprovalBeforeLogin': false,
    'requireEmailVerification': true,
    'isFormDisabled': false,
    'isFormPublished': true,
    'registrationWelcomeMessage': 'Welcome! Please fill in your details to create an account.',
    'registrationSuccessMessage': 'Your registration was submitted successfully.',
    'formLayoutMode': 'single',
    'requirePassword': true,
  };

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final repo = ref.read(accountRepositoryProvider);
    try {
      final results = await Future.wait([
        repo.getRegistrationPolicy(),
        repo.getRegistrationFields(),
      ]);

      if (mounted) {
        setState(() {
          final policyResult = results[0] as Map<String, dynamic>;
          if (policyResult.isNotEmpty) {
            _policy = Map<String, dynamic>.from(policyResult);
          }
          final fieldsResult = results[1] as List<Map<String, dynamic>>;
          _fields = List<Map<String, dynamic>>.from(fieldsResult);
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _savePolicy() async {
    setState(() => _isSavingPolicy = true);
    final repo = ref.read(accountRepositoryProvider);
    final success = await repo.saveRegistrationPolicy(_policy);
    if (mounted) {
      setState(() => _isSavingPolicy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success ? 'Registration policy updated successfully!' : 'Policy updated locally.',
          ),
          backgroundColor: success ? const Color(0xFF10B981) : const Color(0xFF0050E5),
        ),
      );
    }
  }

  void _showAddFieldDialog() {
    final labelCtrl = TextEditingController();
    final placeholderCtrl = TextEditingController();
    String fieldType = 'text';
    bool isRequired = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Add Custom Registration Field'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: labelCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Field Label *',
                    hintText: 'e.g. Job Title, Department, Student ID',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: placeholderCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Placeholder Hint',
                    hintText: 'e.g. Enter your job title',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: fieldType,
                  decoration: const InputDecoration(
                    labelText: 'Field Type',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'text', child: Text('Short Text')),
                    DropdownMenuItem(value: 'textarea', child: Text('Multi-line Text')),
                    DropdownMenuItem(value: 'number', child: Text('Numeric')),
                    DropdownMenuItem(value: 'date', child: Text('Date')),
                    DropdownMenuItem(value: 'select', child: Text('Dropdown Select')),
                  ],
                  onChanged: (val) {
                    if (val != null) setDialogState(() => fieldType = val);
                  },
                ),
                const SizedBox(height: 8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Required Field', style: TextStyle(fontSize: 14)),
                  value: isRequired,
                  onChanged: (val) => setDialogState(() => isRequired = val),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0050E5)),
              onPressed: () async {
                final label = labelCtrl.text.trim();
                if (label.isEmpty) return;
                Navigator.of(ctx).pop();

                final repo = ref.read(accountRepositoryProvider);
                final newField = {
                  'label': label,
                  'fieldKey': label.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '_'),
                  'fieldType': fieldType,
                  'placeholder': placeholderCtrl.text.trim(),
                  'isRequired': isRequired,
                  'isActive': true,
                  'sortOrder': _fields.length + 1,
                  'showInWorkspaceProfile': true,
                };
                final success = await repo.createRegistrationField(newField);
                if (success || mounted) {
                  _loadData();
                }
              },
              child: const Text('Add Field', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : const Color(0xFFF8FAFC),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Breadcrumbs & Header
                  Row(
                    children: [
                      if (widget.onNavigateBack != null) ...[
                        IconButton(
                          icon: const Icon(Icons.arrow_back_rounded),
                          onPressed: widget.onNavigateBack,
                        ),
                        const SizedBox(width: 8),
                      ],
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Identity & Users / Registration Form Builder',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Text(
                                  'Registration Form Builder',
                                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(width: 10),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEFF6FF),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0xFFBFDBFE)),
                                  ),
                                  child: const Text(
                                    'IDENTITY & ACCESS',
                                    style: TextStyle(
                                      color: Color(0xFF0050E5),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0050E5),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                        onPressed: _isSavingPolicy ? null : _savePolicy,
                        icon: _isSavingPolicy
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.save_rounded, size: 18, color: Colors.white),
                        label: Text(
                          _isSavingPolicy ? 'Saving...' : 'Save Policy',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Configure onboarding questions, public registration policy, and approval workflows for your organization.',
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 2. Policy Switches Card
                  Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(
                        color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                      ),
                    ),
                    color: isDark ? AppColors.surfaceDark : Colors.white,
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.policy_outlined, size: 20, color: Color(0xFF0050E5)),
                              SizedBox(width: 8),
                              Text(
                                'Public Onboarding & Registration Policies',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const Divider(height: 28),
                          SwitchListTile(
                            contentPadding: EdgeInsets.zero,
                            title: const Text('Allow Public Self-Registration'),
                            subtitle: const Text('Prospective members can apply or create an account online.'),
                            value: _policy['allowPublicRegistration'] == true,
                            onChanged: (val) {
                              setState(() => _policy['allowPublicRegistration'] = val);
                            },
                          ),
                          SwitchListTile(
                            contentPadding: EdgeInsets.zero,
                            title: const Text('Require Administrator Approval'),
                            subtitle: const Text('Newly registered accounts remain pending until approved by an admin.'),
                            value: _policy['requireApprovalBeforeLogin'] == true,
                            onChanged: (val) {
                              setState(() => _policy['requireApprovalBeforeLogin'] = val);
                            },
                          ),
                          SwitchListTile(
                            contentPadding: EdgeInsets.zero,
                            title: const Text('Require Email Verification'),
                            subtitle: const Text('Sends an activation link to the user before granting account access.'),
                            value: _policy['requireEmailVerification'] == true,
                            onChanged: (val) {
                              setState(() => _policy['requireEmailVerification'] = val);
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 3. Custom Form Fields
                  Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(
                        color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                      ),
                    ),
                    color: isDark ? AppColors.surfaceDark : Colors.white,
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.dynamic_form_outlined, size: 20, color: Color(0xFF0050E5)),
                                  SizedBox(width: 8),
                                  Text(
                                    'Custom Questions & Fields',
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF0050E5),
                                  side: const BorderSide(color: Color(0xFF0050E5)),
                                ),
                                onPressed: _showAddFieldDialog,
                                icon: const Icon(Icons.add, size: 16),
                                label: const Text('Add Field'),
                              ),
                            ],
                          ),
                          const Divider(height: 28),
                          if (_fields.isEmpty)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 24),
                              child: Center(
                                child: Text(
                                  'No custom fields configured. Standard core identity fields (First Name, Last Name, Email, Password) are active.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                                  ),
                                ),
                              ),
                            )
                          else
                            ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: _fields.length,
                              separatorBuilder: (_, __) => const Divider(height: 1),
                              itemBuilder: (ctx, idx) {
                                final f = _fields[idx];
                                final isReq = f['isRequired'] == true;

                                return ListTile(
                                  contentPadding: const EdgeInsets.symmetric(vertical: 4),
                                  leading: CircleAvatar(
                                    backgroundColor: const Color(0xFF0050E5).withValues(alpha: 0.1),
                                    child: const Icon(Icons.short_text, color: Color(0xFF0050E5)),
                                  ),
                                  title: Row(
                                    children: [
                                      Text(
                                        f['label']?.toString() ?? 'Field',
                                        style: const TextStyle(fontWeight: FontWeight.w600),
                                      ),
                                      if (isReq) ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFFEF2F2),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: const Text(
                                            'REQUIRED',
                                            style: TextStyle(
                                              color: Color(0xFFDC2626),
                                              fontSize: 9,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  subtitle: Text(
                                    'Type: ${f['fieldType'] ?? 'text'} • Key: ${f['fieldKey'] ?? ''}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                                    ),
                                  ),
                                  trailing: IconButton(
                                    icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626)),
                                    onPressed: () async {
                                      final id = f['id']?.toString();
                                      if (id != null) {
                                        final repo = ref.read(accountRepositoryProvider);
                                        await repo.deleteRegistrationField(id);
                                        _loadData();
                                      }
                                    },
                                  ),
                                );
                              },
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
