import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';
import '../../../../../core/widgets/page_header.dart';

/// <summary>
/// Screen presenting System Roles & Authority Matrix under Identity & Access Control.
/// Provides 1-to-1 parity with the Angular web client, featuring:
/// - 4 interactive clickable filter cards (All, Authority & Feature, Operational, Assigned Personnel)
/// - Category tabs navigation
/// - Enterprise role cards with assigned members roster and avatars
/// - Assign Member dialog with searchable workspace user selection
/// - Remove member action with confirmation dialog
/// - Create Custom Role dialog
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
  String _activeFilter = 'all'; // 'all', 'system_feature', 'operational_level', 'assigned'
  List<Map<String, dynamic>> _catalog = [];
  List<Map<String, dynamic>> _allUsers = [];

  final List<Map<String, dynamic>> _defaultCatalogFallback = [
    {
      'name': 'SuperAdmin',
      'description': 'Root workspace administrator with full sovereignty across master catalog and tenant systems. Locked to root account.',
      'scope': 'Root System Access (Non-assignable)',
      'canAssign': false,
      'badge': 'badge-root',
      'icon': 'shield_with_house',
      'group': 'system_feature',
      'order': 1,
      'memberCount': 1,
      'members': [
        {
          'userId': 'usr_1',
          'fullName': 'Root Administrator',
          'email': 'admin@company.com',
          'memberId': 'ADM-001',
          'avatarUrl': null,
          'features': ['All Domains'],
        }
      ],
    },
    {
      'name': 'Admin',
      'description': 'Global workspace administrator with unrestricted operational authority across identity, content, configuration, and data.',
      'scope': 'Global Administrator (Unrestricted)',
      'canAssign': true,
      'badge': 'badge-admin',
      'icon': 'admin_panel_settings',
      'group': 'system_feature',
      'order': 2,
      'memberCount': 2,
      'members': [
        {
          'userId': 'usr_2',
          'fullName': 'Lead System Admin',
          'email': 'sysadmin@company.com',
          'memberId': 'ADM-002',
          'avatarUrl': null,
          'features': ['All Features'],
        }
      ],
    },
    {
      'name': 'Identity Manager',
      'description': 'Dedicated security officer empowered to govern identity policies, assign security roles, and monitor authentication telemetry.',
      'scope': 'Identity & Security Authority',
      'canAssign': true,
      'badge': 'badge-system',
      'icon': 'shield_person',
      'group': 'system_feature',
      'order': 3,
      'memberCount': 1,
      'members': [],
    },
    {
      'name': 'User Manager',
      'description': 'Authorized to manage the enterprise member directory, approve onboardings, reset credentials, and categorize profiles.',
      'scope': 'Member Directory & Onboarding',
      'canAssign': true,
      'badge': 'badge-system',
      'icon': 'badge',
      'group': 'system_feature',
      'order': 4,
      'memberCount': 3,
      'members': [],
    },
    {
      'name': 'Global Editor',
      'description': 'Highest operational capability level. Authorizes unrestricted creation, modification, and publication across all workspace features.',
      'scope': 'Tenant-Wide Authoring & Publishing',
      'canAssign': true,
      'badge': 'badge-editor',
      'icon': 'edit_note',
      'group': 'operational_level',
      'order': 5,
      'memberCount': 4,
      'members': [],
    },
    {
      'name': 'Feature Editor',
      'description': 'Granular operational role. Permits full authoring and data management strictly within assigned modular feature boundaries.',
      'scope': 'Scoped Feature Authoring',
      'canAssign': true,
      'badge': 'badge-editor',
      'icon': 'tune',
      'group': 'operational_level',
      'order': 6,
      'memberCount': 5,
      'members': [],
    },
    {
      'name': 'Read Only',
      'description': 'Auditor and viewer tier. Provides full inspection access across assigned features without permission to edit or delete data.',
      'scope': 'Audit & Reporting Access',
      'canAssign': true,
      'badge': 'badge-viewer',
      'icon': 'visibility',
      'group': 'operational_level',
      'order': 7,
      'memberCount': 2,
      'members': [],
    },
    {
      'name': 'Member',
      'description': 'Standard tenant membership tier with self-service personal workspace access, personal notifications, and profile controls.',
      'scope': 'Personal Workspace Self-Service',
      'canAssign': true,
      'badge': 'badge-member',
      'icon': 'person',
      'group': 'system_feature',
      'order': 8,
      'memberCount': 18,
      'members': [],
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadRolesData();
  }

  Future<void> _loadRolesData() async {
    setState(() => _isLoading = true);
    final repo = ref.read(accountRepositoryProvider);

    try {
      final catalogFuture = repo.getRolesCatalog();
      final usersFuture = repo.getUsers();

      final results = await Future.wait([catalogFuture, usersFuture]);
      final catalogList = results[0];
      final usersList = results[1];

      if (mounted) {
        setState(() {
          _catalog = catalogList.isNotEmpty ? catalogList : _defaultCatalogFallback;
          _allUsers = usersList;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _catalog = _defaultCatalogFallback;
          _isLoading = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> get _systemFeatureRoles =>
      _catalog.where((r) => r['group'] == 'system_feature').toList();

  List<Map<String, dynamic>> get _operationalLevelRoles =>
      _catalog.where((r) => r['group'] == 'operational_level').toList();

  int get _totalAssignedPersonnel {
    int total = 0;
    for (final role in _catalog) {
      final count = (role['memberCount'] as num?)?.toInt() ?? 0;
      total += count;
    }
    return total;
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
                  _loadRolesData();
                },
              ),
            ],
          );
        },
      ),
    );
  }

  void _showAssignMemberDialog(String roleName) {
    String? selectedUserId;
    String searchQuery = '';

    final messenger = ScaffoldMessenger.of(context);

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          final filteredUsers = _allUsers.where((u) {
            final name = '${u['firstName'] ?? ''} ${u['lastName'] ?? ''} ${u['fullName'] ?? ''}'.toLowerCase();
            final email = (u['email'] ?? '').toString().toLowerCase();
            final q = searchQuery.toLowerCase();
            return name.contains(q) || email.contains(q);
          }).toList();

          return AlertDialog(
            title: Text('Assign Member to "$roleName"'),
            content: SizedBox(
              width: 480,
              height: 400,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    decoration: const InputDecoration(
                      labelText: 'Search Members',
                      hintText: 'Search by name or email...',
                      prefixIcon: Icon(Icons.search, size: 20),
                    ),
                    onChanged: (val) => setDialogState(() => searchQuery = val),
                  ),
                  const SizedBox(height: 12),
                  const Text('Select a workspace member:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 8),
                  Expanded(
                    child: filteredUsers.isEmpty
                        ? const Center(child: Text('No members found'))
                        : ListView.separated(
                            itemCount: filteredUsers.length,
                            separatorBuilder: (_, index) => const Divider(height: 1),
                            itemBuilder: (context, idx) {
                              final u = filteredUsers[idx];
                              final id = (u['id'] ?? '').toString();
                              final name = (u['fullName'] ?? '${u['firstName'] ?? ''} ${u['lastName'] ?? ''}').toString().trim();
                              final email = u['email'] ?? '';
                              final isSelected = selectedUserId == id;

                              return ListTile(
                                leading: CircleAvatar(
                                  radius: 16,
                                  backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                                  child: Text(
                                    name.isNotEmpty ? name[0].toUpperCase() : 'M',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                                  ),
                                ),
                                title: Text(name.isNotEmpty ? name : email, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                                subtitle: Text(email, style: const TextStyle(fontSize: 11.5)),
                                trailing: isSelected
                                    ? const Icon(Icons.check_circle, color: AppColors.primary, size: 20)
                                    : null,
                                selected: isSelected,
                                onTap: () => setDialogState(() => selectedUserId = id),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Cancel'),
              ),
              PrimaryButton(
                text: 'Assign Member',
                onPressed: selectedUserId == null
                    ? null
                    : () async {
                        Navigator.of(ctx).pop();
                        final repo = ref.read(accountRepositoryProvider);
                        final success = await repo.assignRole(selectedUserId!, roleName);
                        _loadRolesData();
                        if (mounted) {
                          messenger.showSnackBar(
                            SnackBar(
                              content: Text(success ? 'Member assigned to $roleName' : 'Failed to assign role'),
                              backgroundColor: success ? AppColors.success : AppColors.error,
                            ),
                          );
                        }
                      },
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _handleUnassign(String userId, String roleName, String memberName) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove Role Assignment?'),
        content: Text('Are you sure you want to remove "$roleName" authority from $memberName?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Remove Assignment'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final repo = ref.read(accountRepositoryProvider);
    final success = await repo.unassignRole(userId, roleName);
    _loadRolesData();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? 'Role unassigned successfully' : 'Failed to unassign role'),
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

    final filteredRoles = _catalog.where((r) {
      if (_activeFilter == 'all') return true;
      if (_activeFilter == 'system_feature') return r['group'] == 'system_feature';
      if (_activeFilter == 'operational_level') return r['group'] == 'operational_level';
      return true;
    }).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          // Header
          // Shared PageHeader mold: top-level sidebar destination, so no back control.
          PageHeader(
            icon: Icons.admin_panel_settings_outlined,
            eyebrow: 'Access Control & Governance',
            title: 'System Roles & Authority Matrix',
            description: 'Manage the ${_catalog.length} enterprise roles organized into System & Feature Authority and Operational Access Levels.',
            primaryAction: PageHeaderAction(label: 'Create Role', icon: Icons.add, style: PageHeaderActionStyle.primary, onPressed: _showCreateRoleDialog),
            secondaryActions: [
            PageHeaderAction(
              label: 'Refresh Roles',
              compactLabel: 'Refresh',
              icon: Icons.refresh_rounded,
              onPressed: _loadRolesData,
            ),
            ],
          ),
          const SizedBox(height: 24),

          // Overview Stats Strip (4 Clickable Filter Cards matching web)
          LayoutBuilder(
            builder: (context, constraints) {
              final isNarrow = constraints.maxWidth < 800;
              final cardWidth = isNarrow ? (constraints.maxWidth - 12) / 2 : (constraints.maxWidth - 36) / 4;

              return Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _buildStatFilterCard(
                    title: 'Enterprise Roles',
                    count: '${_catalog.length}',
                    icon: Icons.security_rounded,
                    iconColor: AppColors.primary,
                    filterKey: 'all',
                    width: cardWidth,
                    isDark: isDark,
                  ),
                  _buildStatFilterCard(
                    title: 'Authority & Feature Roles',
                    count: '${_systemFeatureRoles.length}',
                    icon: Icons.admin_panel_settings_rounded,
                    iconColor: const Color(0xFF4338CA),
                    filterKey: 'system_feature',
                    width: cardWidth,
                    isDark: isDark,
                  ),
                  _buildStatFilterCard(
                    title: 'Operational Action Levels',
                    count: '${_operationalLevelRoles.length}',
                    icon: Icons.tune_rounded,
                    iconColor: const Color(0xFF10B981),
                    filterKey: 'operational_level',
                    width: cardWidth,
                    isDark: isDark,
                  ),
                  _buildStatFilterCard(
                    title: 'Assigned Personnel',
                    count: '$_totalAssignedPersonnel',
                    icon: Icons.groups_rounded,
                    iconColor: const Color(0xFF475569),
                    filterKey: 'assigned',
                    width: cardWidth,
                    isDark: isDark,
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 20),

          // Category Filter Navigation Tabs matching web
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildTabButton('All Roles (${_catalog.length})', Icons.dataset_outlined, 'all', isDark),
                const SizedBox(width: 8),
                _buildTabButton('System & Feature Authority (${_systemFeatureRoles.length})', Icons.shield_outlined, 'system_feature', isDark),
                const SizedBox(width: 8),
                _buildTabButton('Operational Action Levels (${_operationalLevelRoles.length})', Icons.tune_rounded, 'operational_level', isDark),
                const SizedBox(width: 8),
                _buildTabButton('Assigned Personnel ($_totalAssignedPersonnel)', Icons.groups_outlined, 'assigned', isDark),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Main Content View
          if (_activeFilter == 'assigned')
            _buildAssignedPersonnelRoster(isDark)
          else
            _buildRolesCatalogGrid(filteredRoles, isDark),
        ],
      ),
    );
  }

  Widget _buildStatFilterCard({
    required String title,
    required String count,
    required IconData icon,
    required Color iconColor,
    required String filterKey,
    required double width,
    required bool isDark,
  }) {
    final isActive = _activeFilter == filterKey;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => setState(() => _activeFilter = filterKey),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: width,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isActive ? AppColors.primary : (isDark ? AppColors.outlineDark : AppColors.outlineLight),
              width: isActive ? 2 : 1,
            ),
            boxShadow: [
              if (isActive)
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      count,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ],
                ),
              ),
              if (isActive)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: const Icon(Icons.check, size: 12, color: Colors.white),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabButton(String label, IconData icon, String filterKey, bool isDark) {
    final isActive = _activeFilter == filterKey;

    return InkWell(
      onTap: () => setState(() => _activeFilter = filterKey),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive
              ? AppColors.primary
              : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isActive ? AppColors.primary : (isDark ? AppColors.outlineDark : AppColors.outlineLight),
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 16,
              color: isActive ? Colors.white : (isDark ? AppColors.gray400 : AppColors.gray600),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                color: isActive ? Colors.white : (isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRolesCatalogGrid(List<Map<String, dynamic>> roles, bool isDark) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 900;
        final cardWidth = isNarrow ? constraints.maxWidth : (constraints.maxWidth - 16) / 2;

        return Wrap(
          spacing: 16,
          runSpacing: 16,
          children: roles.map((role) {
            final name = (role['name'] ?? '').toString();
            final desc = (role['description'] ?? '').toString();
            final scope = (role['scope'] ?? '').toString();
            final canAssign = role['canAssign'] ?? true;
            final badge = (role['badge'] ?? 'badge-system').toString();
            final memberCount = (role['memberCount'] as num?)?.toInt() ?? 0;
            final members = (role['members'] as List?)?.map((m) => Map<String, dynamic>.from(m as Map)).toList() ?? [];

            Color badgeColor;
            if (badge.contains('root') || badge.contains('admin')) {
              badgeColor = AppColors.primary;
            } else if (badge.contains('editor')) {
              badgeColor = const Color(0xFF10B981);
            } else if (badge.contains('viewer')) {
              badgeColor = const Color(0xFF8B5CF6);
            } else {
              badgeColor = const Color(0xFF475569);
            }

            return Container(
              width: cardWidth,
              padding: const EdgeInsets.all(20),
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
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                            decoration: BoxDecoration(
                              color: badgeColor.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              name,
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: badgeColor),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              '$memberCount assigned',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isDark ? AppColors.gray300 : AppColors.gray700),
                            ),
                          ),
                        ],
                      ),
                      if (canAssign)
                        OutlinedButton.icon(
                          icon: const Icon(Icons.person_add_alt_1, size: 14),
                          label: const Text('Assign Member', style: TextStyle(fontSize: 12)),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            visualDensity: VisualDensity.compact,
                          ),
                          onPressed: () => _showAssignMemberDialog(name),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    desc,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.lock_clock_outlined, size: 13, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Text(
                          scope,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (members.isNotEmpty) ...[
                    const Divider(height: 24),
                    const Text('Assigned Roster:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: members.map((m) {
                        final fullName = (m['fullName'] ?? m['email'] ?? 'Member').toString();
                        final userId = (m['userId'] ?? '').toString();

                        return Chip(
                          avatar: CircleAvatar(
                            radius: 12,
                            backgroundColor: AppColors.primary,
                            child: Text(
                              fullName.isNotEmpty ? fullName[0].toUpperCase() : 'M',
                              style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ),
                          label: Text(fullName, style: const TextStyle(fontSize: 12)),
                          deleteIcon: canAssign ? const Icon(Icons.close, size: 14) : null,
                          onDeleted: canAssign ? () => _handleUnassign(userId, name, fullName) : null,
                        );
                      }).toList(),
                    ),
                  ],
                ],
              ),
            );
          }).toList(),
        );
      },
    );
  }

  Widget _buildAssignedPersonnelRoster(bool isDark) {
    final allAssigned = <Map<String, dynamic>>[];
    for (final role in _catalog) {
      final roleName = (role['name'] ?? '').toString();
      final members = (role['members'] as List?)?.map((m) => Map<String, dynamic>.from(m as Map)).toList() ?? [];
      for (final m in members) {
        allAssigned.add({
          ...m,
          'roleName': roleName,
          'group': role['group'],
        });
      }
    }

    if (allAssigned.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(40),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
        ),
        child: const Center(
          child: Text('No personnel assigned to roles yet.'),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: allAssigned.length,
        separatorBuilder: (_, index) => const Divider(height: 1),
        itemBuilder: (context, idx) {
          final item = allAssigned[idx];
          final name = (item['fullName'] ?? 'Member').toString();
          final email = (item['email'] ?? '').toString();
          final role = (item['roleName'] ?? '').toString();
          final memberId = (item['memberId'] ?? '').toString();
          final userId = (item['userId'] ?? '').toString();

          return ListTile(
            leading: CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: Text(
                name.isNotEmpty ? name[0].toUpperCase() : 'M',
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
            ),
            title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text('ID: $memberId • $email', style: const TextStyle(fontSize: 12)),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Text(
                    role,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ),
                if (role != 'SuperAdmin') ...[
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline, size: 18, color: AppColors.error),
                    tooltip: 'Remove Role Assignment',
                    onPressed: () => _handleUnassign(userId, role, name),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
