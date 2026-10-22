import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Screen presenting Roles & Permissions management under Identity & Access Control.
/// Allows administrators to inspect roles, permission matrices, and define custom access levels.
/// </summary>
class RolesPermissionsView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Creates a [RolesPermissionsView].
  const RolesPermissionsView({super.key, this.workspace});

  @override
  ConsumerState<RolesPermissionsView> createState() => _RolesPermissionsViewState();
}

class _RolesPermissionsViewState extends ConsumerState<RolesPermissionsView> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _roles = [];

  final List<Map<String, dynamic>> _defaultRolesFallback = [
    {
      'id': 'role_superadmin',
      'name': 'Super Administrator',
      'description': 'Unrestricted root governance across all tenant domains and settings',
      'isSystem': true,
      'userCount': 2,
      'permissions': [
        'Users:Full',
        'Roles:Manage',
        'Security:Admin',
        'Billing:Manage',
        'Audit:Read',
        'Workspace:Settings',
      ],
    },
    {
      'id': 'role_admin',
      'name': 'Administrator',
      'description': 'Full operational command over users, categories, and content settings',
      'isSystem': true,
      'userCount': 5,
      'permissions': [
        'Users:Read',
        'Users:Write',
        'Roles:Read',
        'Security:Policies',
        'Audit:Read',
      ],
    },
    {
      'id': 'role_staff',
      'name': 'Staff / Manager',
      'description': 'Operational execution without global workspace policy modification rights',
      'isSystem': false,
      'userCount': 12,
      'permissions': [
        'Users:Read',
        'Users:Invite',
        'Content:Write',
      ],
    },
    {
      'id': 'role_member',
      'name': 'Member / Viewer',
      'description': 'Standard tenant membership with self-service personal workspace access',
      'isSystem': true,
      'userCount': 85,
      'permissions': [
        'Account:Self',
        'Workspace:Read',
      ],
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadRoles();
  }

  Future<void> _loadRoles() async {
    setState(() => _isLoading = true);
    final repo = ref.read(accountRepositoryProvider);
    final list = await repo.getRoles();

    if (mounted) {
      setState(() {
        _roles = list.isNotEmpty ? list : _defaultRolesFallback;
        _isLoading = false;
      });
    }
  }

  void _showCreateRoleDialog() {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final selectedPerms = <String>{'Users:Read', 'Workspace:Read'};

    final allPerms = [
      'Users:Read',
      'Users:Write',
      'Users:Invite',
      'Roles:Manage',
      'Security:Policies',
      'Audit:Read',
      'Billing:Manage',
      'Content:Write',
      'Workspace:Settings',
    ];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            title: const Text('Create Custom Role'),
            content: SizedBox(
              width: 500,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Role Name',
                        hintText: 'e.g. Compliance Officer',
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: descCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        hintText: 'e.g. Manages compliance audits and policies',
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Assigned Permissions',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: allPerms.map((perm) {
                        final isSelected = selectedPerms.contains(perm);
                        return FilterChip(
                          label: Text(perm),
                          selected: isSelected,
                          selectedColor: AppColors.primary.withValues(alpha: 0.15),
                          checkmarkColor: AppColors.primary,
                          onSelected: (selected) {
                            setDialogState(() {
                              if (selected) {
                                selectedPerms.add(perm);
                              } else {
                                selectedPerms.remove(perm);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Cancel'),
              ),
              PrimaryButton(
                text: 'Create Role',
                onPressed: () async {
                  if (nameCtrl.text.trim().isEmpty) return;
                  Navigator.of(ctx).pop();
                  final repo = ref.read(accountRepositoryProvider);
                  await repo.createRole(
                    nameCtrl.text.trim(),
                    descCtrl.text.trim(),
                    selectedPerms.toList(),
                  );
                  _loadRoles();
                },
              ),
            ],
          );
        },
      ),
    );
  }

  void _showRoleDetailModal(Map<String, dynamic> role) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final perms = (role['permissions'] as List?)?.map((e) => e.toString()).toList() ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.vpn_key_outlined, color: AppColors.primary, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      role['name'] ?? 'Role Details',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(ctx).pop(),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              role['description'] ?? '',
              style: TextStyle(
                fontSize: 14,
                color: isDark ? AppColors.gray400 : AppColors.gray600,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Granted Permissions (${perms.length})',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: perms.map((p) {
                return Chip(
                  label: Text(p, style: const TextStyle(fontSize: 12)),
                  backgroundColor: isDark ? AppColors.surfaceDark : AppColors.gray100,
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
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
                    'Roles & Permissions',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Define and govern role-based access control (RBAC) across your workspace',
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                ],
              ),
              PrimaryButton(
                text: 'Create Role',
                icon: const Icon(Icons.add, size: 18),
                onPressed: _showCreateRoleDialog,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Roles List
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _roles.length,
            separatorBuilder: (_, index) => const SizedBox(height: 14),
            itemBuilder: (context, idx) {
              final role = _roles[idx];
              final name = role['name'] ?? 'Role';
              final desc = role['description'] ?? '';
              final isSystem = role['isSystem'] ?? false;
              final userCount = role['userCount'] ?? 0;
              final perms = (role['permissions'] as List?) ?? [];

              return Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.security,
                        color: AppColors.primary,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                name,
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                ),
                              ),
                              const SizedBox(width: 8),
                              if (isSystem)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text(
                                    'System',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isDark ? Colors.white.withValues(alpha: 0.08) : AppColors.gray100,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '$userCount members',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark ? AppColors.gray400 : AppColors.gray600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            desc,
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? AppColors.gray400 : AppColors.gray600,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: perms.take(4).map((p) {
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isDark ? Colors.white.withValues(alpha: 0.05) : AppColors.gray100,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  p.toString(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark ? AppColors.gray400 : AppColors.gray600,
                                  ),
                                ),
                              );
                            }).toList()
                              ..addAll(
                                perms.length > 4
                                    ? [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppColors.primary.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            '+${perms.length - 4} more',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: AppColors.primary,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ]
                                    : [],
                              ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.more_vert),
                      tooltip: 'View Permissions',
                      onPressed: () => _showRoleDetailModal(role),
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
}
