import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';
import '../../../../../core/widgets/page_header.dart';

/// <summary>
/// Screen presenting System Roles & Authority Matrix under Identity & Access Control.
/// Features complete 1-to-1 operational and visual parity with the web client:
/// - 4 interactive clickable filter stat cards (All Roles, Authority & Feature, Operational, Assigned Personnel)
/// - Category filter navigation tabs with real-time counters
/// - Dual enterprise table cards: System & Feature Authority Roles and Operational Access Levels
/// - Avatar stacks with initials and preview names for assigned personnel
/// - Interactive "Manage Members" modal with user search, feature module scope, and assignment/removal
/// - Full assigned personnel roster view when the Assigned Personnel filter is active
/// </summary>
class RolesPermissionsView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Optional navigation callback to jump to specific tabs in the dashboard shell.
  final ValueChanged<int>? onNavigateToTab;

  /// Creates a [RolesPermissionsView] instance.
  const RolesPermissionsView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
  });

  @override
  ConsumerState<RolesPermissionsView> createState() => _RolesPermissionsViewState();
}

class _RolesPermissionsViewState extends ConsumerState<RolesPermissionsView> {
  bool _isLoading = true;
  String _activeFilter = 'all'; // 'all', 'system_feature', 'operational_level', 'assigned'
  List<Map<String, dynamic>> _catalog = [];
  List<Map<String, dynamic>> _allUsers = [];

  /// Fallback seeded catalog matching web's canonical 7-tier enterprise roles.
  final List<Map<String, dynamic>> _defaultCatalogFallback = [
    {
      'name': 'Admin',
      'description': 'Global workspace administrator with unrestricted operational authority across identity, content, configuration, and data.',
      'scope': 'Global Administrator (Unrestricted)',
      'canAssign': true,
      'badge': 'badge-admin',
      'icon': 'admin_panel_settings',
      'group': 'system_feature',
      'order': 1,
      'memberCount': 0,
      'members': [],
    },
    {
      'name': 'Identity Manager',
      'description': 'Sovereign identity and access administrator authorized to manage system roles, grant operational permissions, and issue user invitations.',
      'scope': 'Identity & Access Control (RBAC Sovereign)',
      'canAssign': true,
      'badge': 'badge-identity',
      'icon': 'shield_person',
      'group': 'system_feature',
      'order': 2,
      'memberCount': 0,
      'members': [],
    },
    {
      'name': 'User Manager',
      'description': 'Directory and cohort administrator authorized to manage user profiles, categories, custom fields, and member statuses across the workspace.',
      'scope': 'User Directory & Cohort Management',
      'canAssign': true,
      'badge': 'badge-usermanager',
      'icon': 'badge',
      'group': 'system_feature',
      'order': 3,
      'memberCount': 0,
      'members': [],
    },
    {
      'name': 'Member',
      'description': 'Standard tenant member account with directory listing and personal workspace self-service capabilities.',
      'scope': 'Standard Member Access',
      'canAssign': true,
      'badge': 'badge-member',
      'icon': 'person',
      'group': 'system_feature',
      'order': 4,
      'memberCount': 7,
      'members': [
        {'userId': 'usr_1', 'fullName': 'Franklin Thomas', 'email': 'f.thomas@domain.com', 'memberId': 'MBR-001'},
        {'userId': 'usr_2', 'fullName': 'Sarah Adams', 'email': 's.adams@domain.com', 'memberId': 'MBR-002'},
        {'userId': 'usr_3', 'fullName': 'James Henderson', 'email': 'j.henderson@domain.com', 'memberId': 'MBR-003'},
        {'userId': 'usr_4', 'fullName': 'Figh Tgh', 'email': 'figh.tgh@domain.com', 'memberId': 'MBR-004'},
        {'userId': 'usr_5', 'fullName': 'Simon Aanma', 'email': 's.aanma@domain.com', 'memberId': 'MBR-005'},
        {'userId': 'usr_6', 'fullName': 'David Miller', 'email': 'd.miller@domain.com', 'memberId': 'MBR-006'},
        {'userId': 'usr_7', 'fullName': 'Elena Rostova', 'email': 'e.rostova@domain.com', 'memberId': 'MBR-007'},
      ],
    },
    {
      'name': 'Global Editor',
      'description': 'Global operational editor with permissions to modify content, records, and operations across all active workspace features.',
      'scope': 'Global Scope (All Active Features)',
      'canAssign': true,
      'badge': 'badge-editor',
      'icon': 'edit_note',
      'group': 'operational_level',
      'order': 5,
      'memberCount': 0,
      'members': [],
    },
    {
      'name': 'Feature Editor',
      'description': 'Modular feature editor with modification privileges scoped specifically to assigned feature modules (e.g. User Management, CMS, Products).',
      'scope': 'Scoped Feature Scope (e.g. UserManager, CMS)',
      'canAssign': true,
      'badge': 'badge-feature',
      'icon': 'tune',
      'group': 'operational_level',
      'order': 6,
      'memberCount': 0,
      'members': [],
    },
    {
      'name': 'Read Only',
      'description': 'Read-only auditor with comprehensive viewing permissions across modules, but zero modification or deletion capabilities.',
      'scope': 'Read-Only (All Features)',
      'canAssign': true,
      'badge': 'badge-readonly',
      'icon': 'visibility',
      'group': 'operational_level',
      'order': 7,
      'memberCount': 0,
      'members': [],
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadRolesData();
  }

  /// <summary>
  /// Fetches system roles catalog and eligible workspace members from IdentityApi.
  /// </summary>
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
        final isRoot = widget.workspace?.userRoles.any((r) => r.toLowerCase() == 'superadmin') ?? false;
        final filteredCatalog = (catalogList.isNotEmpty ? catalogList : _defaultCatalogFallback)
            .where((r) => isRoot || (r['name'] ?? '').toString().toLowerCase() != 'superadmin')
            .toList();

        // Sort by order
        filteredCatalog.sort((a, b) {
          final oa = (a['order'] as num?)?.toInt() ?? 99;
          final ob = (b['order'] as num?)?.toInt() ?? 99;
          return oa.compareTo(ob);
        });

        setState(() {
          _catalog = filteredCatalog;
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

  /// Filtered roles belonging to Group 1: System & Feature Authority.
  List<Map<String, dynamic>> get _systemFeatureRoles =>
      _catalog.where((r) => r['group'] == 'system_feature' || ['SuperAdmin', 'Admin', 'Identity Manager', 'User Manager', 'Member'].contains(r['name'])).toList();

  /// Filtered roles belonging to Group 2: Operational Access Levels.
  List<Map<String, dynamic>> get _operationalLevelRoles =>
      _catalog.where((r) => r['group'] == 'operational_level' || ['Global Editor', 'Feature Editor', 'Read Only'].contains(r['name'])).toList();

  /// Total count of assigned personnel across all roles.
  int get _totalAssignedPersonnel {
    int total = 0;
    for (final role in _catalog) {
      final count = (role['memberCount'] as num?)?.toInt() ?? (role['members'] as List?)?.length ?? 0;
      total += count;
    }
    return total;
  }

  /// Complete list of assigned members mapped to their respective role.
  List<Map<String, dynamic>> get _allAssignedMembers {
    final list = <Map<String, dynamic>>[];
    for (final role in _catalog) {
      final members = (role['members'] as List?)?.map((m) => Map<String, dynamic>.from(m as Map)).toList() ?? [];
      for (final m in members) {
        list.add({
          'role': role,
          'member': m,
        });
      }
    }
    return list;
  }

  /// <summary>
  /// Sets or toggles the active filter category view.
  /// </summary>
  void _setFilter(String filter) {
    setState(() {
      if (_activeFilter == filter && filter != 'all') {
        _activeFilter = 'all';
      } else {
        _activeFilter = filter;
      }
    });
  }

  /// <summary>
  /// Displays the interactive "Manage Members" modal dialog for a specific role.
  /// </summary>
  void _showManageMembersDialog(Map<String, dynamic> role) {
    String? selectedUserId;
    String selectedFeature = 'UserManager';
    bool isAssigning = false;
    bool isUnassigning = false;
    String searchQuery = '';

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setModalState) {
          final isDark = Theme.of(context).brightness == Brightness.dark;
          final roleName = (role['name'] ?? '').toString();
          final roleScope = (role['scope'] ?? '').toString();
          final membersList = (role['members'] as List?)?.map((m) => Map<String, dynamic>.from(m as Map)).toList() ?? [];

          final filteredUsers = _allUsers.where((u) {
            final name = '${u['firstName'] ?? ''} ${u['lastName'] ?? ''} ${u['fullName'] ?? ''}'.toLowerCase();
            final email = (u['email'] ?? '').toString().toLowerCase();
            final q = searchQuery.toLowerCase();
            return name.contains(q) || email.contains(q);
          }).toList();

          return Dialog(
            backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 620, maxHeight: 720),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Modal Header
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFFAFBFC),
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                      border: Border(bottom: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            _buildRoleIconBox(roleName, isDark),
                            const SizedBox(width: 14),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Manage Personnel: $roleName',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  roleScope,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark ? AppColors.gray400 : AppColors.gray600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 20),
                          onPressed: () => Navigator.of(dialogCtx).pop(),
                        ),
                      ],
                    ),
                  ),

                  // Modal Body
                  Flexible(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Role Scope Notice
                          if (roleName == 'Identity Manager')
                            Container(
                              padding: const EdgeInsets.all(12),
                              margin: const EdgeInsets.only(bottom: 16),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFBFDBFE)),
                              ),
                              child: const Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(Icons.verified_user_outlined, size: 18, color: Color(0xFF1E40AF)),
                                  SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      'Identity Manager Sovereign Role: Members assigned to this role possess authority to assign system roles, grant operational permissions, and dispatch workspace invitations.',
                                      style: TextStyle(fontSize: 12, color: Color(0xFF1E40AF), height: 1.4),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          if (roleName == 'User Manager')
                            Container(
                              padding: const EdgeInsets.all(12),
                              margin: const EdgeInsets.only(bottom: 16),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF0FDF4),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFBBF7D0)),
                              ),
                              child: const Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(Icons.manage_accounts_outlined, size: 18, color: Color(0xFF166534)),
                                  SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      'User Manager Domain Role: Members assigned to this role can manage user profiles, categories, and account statuses. They cannot assign roles unless also granted Identity Manager authority.',
                                      style: TextStyle(fontSize: 12, color: Color(0xFF166534), height: 1.4),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                          // Assign Member Section
                          Text(
                            'ASSIGN MEMBER TO THIS ROLE',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                              color: isDark ? AppColors.gray400 : AppColors.gray600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                TextField(
                                  decoration: InputDecoration(
                                    labelText: 'Search & Select Member *',
                                    hintText: 'Search by name or email...',
                                    prefixIcon: const Icon(Icons.search, size: 18),
                                    isDense: true,
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  onChanged: (val) => setModalState(() => searchQuery = val),
                                ),
                                if (searchQuery.isNotEmpty || selectedUserId == null) ...[
                                  const SizedBox(height: 10),
                                  ConstrainedBox(
                                    constraints: const BoxConstraints(maxHeight: 140),
                                    child: ListView.builder(
                                      shrinkWrap: true,
                                      itemCount: filteredUsers.length,
                                      itemBuilder: (ctx, i) {
                                        final u = filteredUsers[i];
                                        final uid = (u['id'] ?? '').toString();
                                        final uname = (u['fullName'] ?? '${u['firstName'] ?? ''} ${u['lastName'] ?? ''}').toString().trim();
                                        final uemail = (u['email'] ?? '').toString();
                                        final isSel = selectedUserId == uid;

                                        return ListTile(
                                          dense: true,
                                          contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                                          leading: CircleAvatar(
                                            radius: 14,
                                            backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                                            child: Text(
                                              _getInitials(uname),
                                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                                            ),
                                          ),
                                          title: Text(uname.isNotEmpty ? uname : uemail, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
                                          subtitle: Text(uemail, style: const TextStyle(fontSize: 11)),
                                          trailing: isSel ? const Icon(Icons.check_circle, color: AppColors.primary, size: 18) : null,
                                          selected: isSel,
                                          onTap: () => setModalState(() => selectedUserId = uid),
                                        );
                                      },
                                    ),
                                  ),
                                ],
                                if (roleName == 'Feature Editor') ...[
                                  const SizedBox(height: 12),
                                  DropdownButtonFormField<String>(
                                    initialValue: selectedFeature,
                                    decoration: InputDecoration(
                                      labelText: 'Feature Scope Module *',
                                      isDense: true,
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    items: const [
                                      DropdownMenuItem(value: 'UserManager', child: Text('User Management (UserManager)')),
                                      DropdownMenuItem(value: 'ContentManager', child: Text('Content & Web Pages (CMS)')),
                                      DropdownMenuItem(value: 'CommerceManager', child: Text('Commerce Studio (Products & Orders)')),
                                      DropdownMenuItem(value: 'IdentityManager', child: Text('Identity & Security Management')),
                                      DropdownMenuItem(value: 'SettingsManager', child: Text('Workspace Settings & Branding')),
                                    ],
                                    onChanged: (val) {
                                      if (val != null) setModalState(() => selectedFeature = val);
                                    },
                                  ),
                                ],
                                const SizedBox(height: 12),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: PrimaryButton(
                                    text: isAssigning ? 'Assigning...' : 'Assign Role',
                                    icon: const Icon(Icons.person_add_alt_1, size: 16),
                                    onPressed: selectedUserId == null || isAssigning
                                        ? null
                                        : () async {
                                            setModalState(() => isAssigning = true);
                                            final messenger = ScaffoldMessenger.of(context);
                                            final repo = ref.read(accountRepositoryProvider);
                                            final success = await repo.assignRole(
                                              selectedUserId!,
                                              roleName,
                                              featureArea: roleName == 'Feature Editor' ? selectedFeature : null,
                                            );
                                            if (mounted) {
                                              await _loadRolesData();
                                              setModalState(() {
                                                isAssigning = false;
                                                selectedUserId = null;
                                                searchQuery = '';
                                              });
                                              messenger.showSnackBar(
                                                SnackBar(
                                                  content: Text(success ? 'Assigned $roleName role successfully.' : 'Failed to assign role.'),
                                                  backgroundColor: success ? AppColors.success : AppColors.error,
                                                ),
                                              );
                                            }
                                          },
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Currently Assigned Members Roster
                          Text(
                            'CURRENTLY ASSIGNED PERSONNEL (${membersList.length})',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                              color: isDark ? AppColors.gray400 : AppColors.gray600,
                            ),
                          ),
                          const SizedBox(height: 10),
                          if (membersList.isEmpty)
                            Container(
                              padding: const EdgeInsets.all(24),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                              ),
                              child: Column(
                                children: [
                                  Icon(Icons.group_off_outlined, size: 28, color: AppColors.gray400),
                                  const SizedBox(height: 6),
                                  Text(
                                    'No personnel currently hold the $roleName role.',
                                    style: TextStyle(fontSize: 12.5, color: isDark ? AppColors.gray400 : AppColors.gray600),
                                  ),
                                ],
                              ),
                            )
                          else
                            ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: membersList.length,
                              separatorBuilder: (_, idx) => const SizedBox(height: 8),
                              itemBuilder: (ctx, i) {
                                final m = membersList[i];
                                final mName = (m['fullName'] ?? 'Member').toString();
                                final mEmail = (m['email'] ?? '').toString();
                                final mId = (m['memberId'] ?? '').toString();
                                final mUserId = (m['userId'] ?? '').toString();

                                return Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          CircleAvatar(
                                            radius: 16,
                                            backgroundColor: _getAvatarColor(mName),
                                            child: Text(
                                              _getInitials(mName),
                                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                mName,
                                                style: TextStyle(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.bold,
                                                  color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                                ),
                                              ),
                                              Text(
                                                mId.isNotEmpty ? '$mEmail • ID: $mId' : mEmail,
                                                style: TextStyle(
                                                  fontSize: 11.5,
                                                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                      OutlinedButton.icon(
                                        icon: const Icon(Icons.person_remove_outlined, size: 14, color: AppColors.error),
                                        label: const Text('Remove', style: TextStyle(fontSize: 11.5, color: AppColors.error, fontWeight: FontWeight.w600)),
                                        style: OutlinedButton.styleFrom(
                                          side: const BorderSide(color: Color(0xFFFECACA)),
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          visualDensity: VisualDensity.compact,
                                        ),
                                        onPressed: isUnassigning
                                            ? null
                                            : () async {
                                                setModalState(() => isUnassigning = true);
                                                final messenger = ScaffoldMessenger.of(context);
                                                final repo = ref.read(accountRepositoryProvider);
                                                final success = await repo.unassignRole(mUserId, roleName);
                                                if (mounted) {
                                                  await _loadRolesData();
                                                  setModalState(() => isUnassigning = false);
                                                  messenger.showSnackBar(
                                                    SnackBar(
                                                      content: Text(success ? 'Removed $roleName from $mName.' : 'Failed to unassign role.'),
                                                      backgroundColor: success ? AppColors.success : AppColors.error,
                                                    ),
                                                  );
                                                }
                                              },
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                        ],
                      ),
                    ),
                  ),

                  // Modal Footer
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFFAFBFC),
                      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                      border: Border(top: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight)),
                    ),
                    alignment: Alignment.centerRight,
                    child: OutlinedButton(
                      child: const Text('Close'),
                      onPressed: () => Navigator.of(dialogCtx).pop(),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
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
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Page Header with 1-to-1 Web Action Buttons
          PageHeader(
            icon: Icons.shield_outlined,
            eyebrow: 'Access Control & Governance',
            title: 'System Roles & Authority Matrix',
            description: 'Manage the ${_catalog.length} enterprise roles organized into System & Feature Authority and Operational Access Levels.',
            secondaryActions: [
              PageHeaderAction(
                label: 'User Directory',
                icon: Icons.groups_outlined,
                onPressed: () => widget.onNavigateToTab?.call(1),
              ),
              PageHeaderAction(
                label: 'Identity Dashboard',
                icon: Icons.shield_outlined,
                onPressed: () => widget.onNavigateToTab?.call(7),
              ),
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
              final isWide = constraints.maxWidth >= 1150;
              final isMedium = constraints.maxWidth >= 600;
              final cardWidth = isWide
                  ? (constraints.maxWidth - 36) / 4
                  : (isMedium ? (constraints.maxWidth - 12) / 2 : constraints.maxWidth);

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
                    activeBadgeLabel: 'All',
                    width: cardWidth,
                    isDark: isDark,
                  ),
                  _buildStatFilterCard(
                    title: 'Authority & Feature Roles',
                    count: '${_systemFeatureRoles.length}',
                    icon: Icons.admin_panel_settings_rounded,
                    iconColor: const Color(0xFF4338CA),
                    filterKey: 'system_feature',
                    activeBadgeLabel: 'Filtered',
                    width: cardWidth,
                    isDark: isDark,
                  ),
                  _buildStatFilterCard(
                    title: 'Operational Action Levels',
                    count: '${_operationalLevelRoles.length}',
                    icon: Icons.tune_rounded,
                    iconColor: const Color(0xFF10B981),
                    filterKey: 'operational_level',
                    activeBadgeLabel: 'Filtered',
                    width: cardWidth,
                    isDark: isDark,
                  ),
                  _buildStatFilterCard(
                    title: 'Assigned Personnel',
                    count: '$_totalAssignedPersonnel',
                    icon: Icons.groups_rounded,
                    iconColor: const Color(0xFF475569),
                    filterKey: 'assigned',
                    activeBadgeLabel: 'Roster',
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
                _buildTabButton('Operational Access Levels (${_operationalLevelRoles.length})', Icons.tune_rounded, 'operational_level', isDark),
                const SizedBox(width: 8),
                _buildTabButton('Assigned Personnel ($_totalAssignedPersonnel)', Icons.groups_outlined, 'assigned', isDark),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Group 1: System & Feature Authority Roles Card
          if (_activeFilter == 'all' || _activeFilter == 'system_feature') ...[
            _buildRoleTableCard(
              title: 'System & Feature Authority Roles',
              badgeText: '${_systemFeatureRoles.length} ROLES',
              description: 'Sovereign platform, identity governance, and feature domain authority roles that govern workspace administration.',
              icon: Icons.shield_outlined,
              iconColor: AppColors.primary,
              iconBgColor: AppColors.primary.withValues(alpha: 0.08),
              badgeBg: const Color(0xFFEFF6FF),
              badgeColor: AppColors.primary,
              roles: _systemFeatureRoles,
              roleColumnHeader: 'ROLE & AUTHORITY TIER',
              scopeColumnHeader: 'SCOPE & GOVERNANCE BOUNDARIES',
              tierLabel: 'SYSTEM AUTHORITY',
              showRefresh: true,
              isDark: isDark,
            ),
            const SizedBox(height: 24),
          ],

          // Group 2: Operational Access Levels Card
          if (_activeFilter == 'all' || _activeFilter == 'operational_level') ...[
            _buildRoleTableCard(
              title: 'Operational Access Levels',
              badgeText: '${_operationalLevelRoles.length} LEVELS',
              description: 'Granular operational scopes governing content creation, data records, and read-only observation across features.',
              icon: Icons.tune_rounded,
              iconColor: const Color(0xFF10B981),
              iconBgColor: const Color(0xFF10B981).withValues(alpha: 0.08),
              badgeBg: const Color(0xFFECFDF5),
              badgeColor: const Color(0xFF059669),
              roles: _operationalLevelRoles,
              roleColumnHeader: 'OPERATIONAL LEVEL',
              scopeColumnHeader: 'SCOPE & OPERATIONAL ACTION BOUNDARIES',
              tierLabel: 'OPERATIONAL LEVEL',
              showRefresh: _activeFilter == 'operational_level',
              isDark: isDark,
            ),
            const SizedBox(height: 24),
          ],

          // Group 3: Assigned Personnel Roster Card (When activeFilter === 'assigned')
          if (_activeFilter == 'assigned')
            _buildAssignedPersonnelRosterCard(isDark),
        ],
      ),
    );
  }

  /// <summary>
  /// Builds a clickable overview filter stat card with active indicator badge.
  /// </summary>
  Widget _buildStatFilterCard({
    required String title,
    required String count,
    required IconData icon,
    required Color iconColor,
    required String filterKey,
    required String activeBadgeLabel,
    required double width,
    required bool isDark,
  }) {
    final isActive = _activeFilter == filterKey;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _setFilter(filterKey),
        borderRadius: BorderRadius.circular(14),
        child: Container(
          width: width,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isActive ? iconColor : (isDark ? AppColors.outlineDark : AppColors.outlineLight),
              width: isActive ? 2 : 1,
            ),
            boxShadow: [
              if (isActive)
                BoxShadow(
                  color: iconColor.withValues(alpha: 0.14),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                )
              else
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      count,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ],
                ),
              ),
              if (isActive) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: iconColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(100),
                    border: Border.all(color: iconColor.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check, size: 12, color: iconColor),
                      const SizedBox(width: 3),
                      Text(
                        activeBadgeLabel,
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: iconColor),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// <summary>
  /// Builds horizontal category navigation tab button.
  /// </summary>
  Widget _buildTabButton(String label, IconData icon, String filterKey, bool isDark) {
    final isActive = _activeFilter == filterKey;

    return InkWell(
      onTap: () => _setFilter(filterKey),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive
              ? (isDark ? const Color(0xFF1E293B) : Colors.white)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isActive ? AppColors.primary : Colors.transparent,
          ),
          boxShadow: [
            if (isActive)
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
          ],
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 16,
              color: isActive ? AppColors.primary : (isDark ? AppColors.gray400 : AppColors.gray600),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                color: isActive
                    ? (isDark ? const Color(0xFF60A5FA) : AppColors.primary)
                    : (isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// <summary>
  /// Builds an enterprise data table card replicating the web client's System & Feature Authority and Operational Access cards.
  /// </summary>
  Widget _buildRoleTableCard({
    required String title,
    required String badgeText,
    required String description,
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required Color badgeBg,
    required Color badgeColor,
    required List<Map<String, dynamic>> roles,
    required String roleColumnHeader,
    required String scopeColumnHeader,
    required String tierLabel,
    required bool showRefresh,
    required bool isDark,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Table Card Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFFAFBFC),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              border: Border(bottom: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: iconBgColor,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(icon, color: iconColor, size: 20),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 8,
                              runSpacing: 4,
                              children: [
                                Text(
                                  title,
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: badgeBg,
                                    borderRadius: BorderRadius.circular(100),
                                  ),
                                  child: Text(
                                    badgeText,
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.4,
                                      color: badgeColor,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              description,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? AppColors.gray400 : AppColors.gray600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                if (showRefresh) ...[
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.refresh, size: 14),
                    label: const Text('Refresh', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: _loadRolesData,
                  ),
                ],
              ],
            ),
          ),

          // Scrollable Responsive Data Table
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 1040),
              child: DataTable(
                headingRowHeight: 44,
                dataRowMinHeight: 68,
                dataRowMaxHeight: 74,
                horizontalMargin: 22,
                columnSpacing: 24,
                headingRowColor: WidgetStateProperty.all(
                  isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                ),
                columns: [
                  DataColumn(
                    label: Text(
                      roleColumnHeader,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      scopeColumnHeader,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Center(
                      child: Text(
                        'PERSONNEL',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                          color: isDark ? AppColors.gray400 : AppColors.gray600,
                        ),
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'ASSIGNED MEMBERS PREVIEW',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ),
                  DataColumn(
                    numeric: true,
                    label: Text(
                      'ACTION',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ),
                ],
                rows: roles.map((role) {
                  final name = (role['name'] ?? '').toString();
                  final desc = (role['description'] ?? '').toString();
                  final scope = (role['scope'] ?? '').toString();
                  final canAssign = role['canAssign'] ?? true;
                  final members = (role['members'] as List?)?.map((m) => Map<String, dynamic>.from(m as Map)).toList() ?? [];
                  final count = (role['memberCount'] as num?)?.toInt() ?? members.length;

                  return DataRow(
                    cells: [
                      // Role & Tier Cell
                      DataCell(
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _buildRoleIconBox(name, isDark),
                            const SizedBox(width: 12),
                            Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  name,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1.5),
                                  decoration: BoxDecoration(
                                    color: _getRolePillBg(name, tierLabel),
                                    borderRadius: BorderRadius.circular(100),
                                  ),
                                  child: Text(
                                    tierLabel,
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.4,
                                      color: _getRolePillColor(name, tierLabel),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Scope & Boundaries Cell
                      DataCell(
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 420),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  scope,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0050E5),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                desc,
                                style: TextStyle(
                                  fontSize: 11.5,
                                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                                  height: 1.35,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Personnel Cell
                      DataCell(
                        Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: RichText(
                              text: TextSpan(
                                children: [
                                  TextSpan(
                                    text: '$count ',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: count > 0 ? AppColors.primary : (isDark ? AppColors.gray400 : AppColors.gray600),
                                    ),
                                  ),
                                  TextSpan(
                                    text: count == 1 ? 'user' : 'users',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Assigned Members Preview Cell
                      DataCell(
                        count == 0
                            ? Text(
                                'No members assigned',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontStyle: FontStyle.italic,
                                  color: isDark ? AppColors.gray400 : const Color(0xFF94A3B8),
                                ),
                              )
                            : Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _buildAvatarStack(members, count),
                                  const SizedBox(width: 8),
                                  ConstrainedBox(
                                    constraints: const BoxConstraints(maxWidth: 160),
                                    child: Text(
                                      _getPreviewNames(members, count),
                                      style: TextStyle(
                                        fontSize: 11.5,
                                        color: isDark ? AppColors.gray300 : AppColors.gray700,
                                        fontWeight: FontWeight.w500,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                      ),

                      // Action Button Cell
                      DataCell(
                        !canAssign
                            ? Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.lock_outline, size: 14, color: AppColors.gray400),
                                    SizedBox(width: 4),
                                    Text('Root Account Only', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.gray400)),
                                  ],
                                ),
                              )
                            : OutlinedButton.icon(
                                icon: const Icon(Icons.person_add_alt_1, size: 15),
                                label: const Text('Manage Members', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.primary,
                                  side: BorderSide(color: AppColors.primary.withValues(alpha: 0.4)),
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                onPressed: () => _showManageMembersDialog(role),
                              ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// <summary>
  /// Builds the dedicated Assigned Personnel Roster Card when the filter is active.
  /// </summary>
  Widget _buildAssignedPersonnelRosterCard(bool isDark) {
    final allAssigned = _allAssignedMembers;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFFAFBFC),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              border: Border(bottom: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(0xFF64748B).withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.groups_rounded, color: Color(0xFF475569), size: 20),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 8,
                              runSpacing: 4,
                              children: [
                                Text(
                                  'Assigned Personnel Roster',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(100),
                                  ),
                                  child: Text(
                                    '${allAssigned.length} Members',
                                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Complete directory of all workspace personnel currently holding active system or operational roles.',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, color: isDark ? AppColors.gray400 : AppColors.gray600),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                OutlinedButton.icon(
                  icon: const Icon(Icons.refresh, size: 14),
                  label: const Text('Refresh', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  onPressed: _loadRolesData,
                ),
              ],
            ),
          ),

          // Table or Empty State
          if (allAssigned.isEmpty)
            Padding(
              padding: const EdgeInsets.all(40),
              child: Center(
                child: Text(
                  'No personnel assigned to roles yet.',
                  style: TextStyle(fontSize: 13, color: isDark ? AppColors.gray400 : AppColors.gray600),
                ),
              ),
            )
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minWidth: 960),
                child: DataTable(
                  headingRowHeight: 44,
                  dataRowMinHeight: 64,
                  dataRowMaxHeight: 68,
                  horizontalMargin: 22,
                  columnSpacing: 24,
                  columns: const [
                    DataColumn(label: Text('PERSONNEL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5))),
                    DataColumn(label: Text('ASSIGNED ROLE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5))),
                    DataColumn(label: Text('SCOPE & MODULE BOUNDARIES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5))),
                    DataColumn(numeric: true, label: Text('ACTIONS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5))),
                  ],
                  rows: allAssigned.map((item) {
                    final role = item['role'] as Map<String, dynamic>;
                    final member = item['member'] as Map<String, dynamic>;
                    final roleName = (role['name'] ?? '').toString();
                    final mName = (member['fullName'] ?? 'Member').toString();
                    final mEmail = (member['email'] ?? '').toString();
                    final mId = (member['memberId'] ?? '').toString();
                    final mUserId = (member['userId'] ?? '').toString();
                    final scope = (role['scope'] ?? '').toString();

                    return DataRow(
                      cells: [
                        DataCell(
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircleAvatar(
                                radius: 16,
                                backgroundColor: _getAvatarColor(mName),
                                child: Text(_getInitials(mName), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                              ),
                              const SizedBox(width: 12),
                              Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(mName, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight)),
                                  Text(mId.isNotEmpty ? '$mEmail • ID: $mId' : mEmail, style: TextStyle(fontSize: 11.5, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                                ],
                              ),
                            ],
                          ),
                        ),
                        DataCell(
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _buildRoleIconBox(roleName, isDark, size: 30),
                              const SizedBox(width: 8),
                              Text(roleName, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                        DataCell(
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(scope, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0050E5))),
                          ),
                        ),
                        DataCell(
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              OutlinedButton.icon(
                                icon: const Icon(Icons.edit_outlined, size: 14),
                                label: const Text('Manage', style: TextStyle(fontSize: 11.5)),
                                onPressed: () => _showManageMembersDialog(role),
                              ),
                              const SizedBox(width: 8),
                              OutlinedButton.icon(
                                icon: const Icon(Icons.person_remove_outlined, size: 14, color: AppColors.error),
                                label: const Text('Remove', style: TextStyle(fontSize: 11.5, color: AppColors.error)),
                                style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFFFECACA))),
                                onPressed: () async {
                                  final repo = ref.read(accountRepositoryProvider);
                                  await repo.unassignRole(mUserId, roleName);
                                  _loadRolesData();
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// <summary>
  /// Renders a standardized role icon box with color palette matching web.
  /// </summary>
  Widget _buildRoleIconBox(String roleName, bool isDark, {double size = 38}) {
    IconData icon;
    Color color;
    Color bg;

    switch (roleName) {
      case 'Admin':
        icon = Icons.admin_panel_settings_rounded;
        color = const Color(0xFF0050E5);
        bg = const Color(0xFFEFF6FF);
        break;
      case 'Identity Manager':
        icon = Icons.shield_outlined;
        color = const Color(0xFF4338CA);
        bg = const Color(0xFFEEF2FF);
        break;
      case 'User Manager':
        icon = Icons.badge_outlined;
        color = const Color(0xFF10B981);
        bg = const Color(0xFFF0FDF4);
        break;
      case 'Member':
        icon = Icons.person_outline_rounded;
        color = const Color(0xFF64748B);
        bg = const Color(0xFFF8FAFC);
        break;
      case 'Global Editor':
        icon = Icons.edit_note_rounded;
        color = const Color(0xFF059669);
        bg = const Color(0xFFECFDF5);
        break;
      case 'Feature Editor':
        icon = Icons.tune_rounded;
        color = const Color(0xFFD97706);
        bg = const Color(0xFFFFFBEB);
        break;
      case 'Read Only':
        icon = Icons.visibility_outlined;
        color = const Color(0xFF475569);
        bg = const Color(0xFFF8FAFC);
        break;
      default:
        icon = Icons.security_rounded;
        color = const Color(0xFFDC2626);
        bg = const Color(0xFFFEF2F2);
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: isDark ? color.withValues(alpha: 0.15) : bg,
        borderRadius: BorderRadius.circular(size * 0.25),
      ),
      child: Icon(icon, color: color, size: size * 0.52),
    );
  }

  Color _getRolePillBg(String roleName, String tierLabel) {
    if (tierLabel == 'OPERATIONAL LEVEL') {
      if (roleName == 'Feature Editor') return const Color(0xFFFFFBEB);
      if (roleName == 'Read Only') return const Color(0xFFF1F5F9);
      return const Color(0xFFECFDF5);
    }
    if (roleName == 'Identity Manager') return const Color(0xFFEEF2FF);
    if (roleName == 'User Manager') return const Color(0xFFF0FDF4);
    if (roleName == 'Member') return const Color(0xFFF1F5F9);
    return const Color(0xFFEFF6FF);
  }

  Color _getRolePillColor(String roleName, String tierLabel) {
    if (tierLabel == 'OPERATIONAL LEVEL') {
      if (roleName == 'Feature Editor') return const Color(0xFFB45309);
      if (roleName == 'Read Only') return const Color(0xFF475569);
      return const Color(0xFF059669);
    }
    if (roleName == 'Identity Manager') return const Color(0xFF4338CA);
    if (roleName == 'User Manager') return const Color(0xFF15803D);
    if (roleName == 'Member') return const Color(0xFF475569);
    return const Color(0xFF0050E5);
  }

  /// <summary>
  /// Builds overlapping avatar stack representing assigned personnel.
  /// </summary>
  Widget _buildAvatarStack(List<Map<String, dynamic>> members, int totalCount) {
    final previewList = members.take(3).toList();

    return SizedBox(
      height: 28,
      width: (previewList.length * 20.0) + (totalCount > 3 ? 24.0 : 8.0),
      child: Stack(
        children: [
          for (int i = 0; i < previewList.length; i++)
            Positioned(
              left: i * 20.0,
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _getAvatarColor(previewList[i]['fullName'] ?? ''),
                  border: Border.all(color: Colors.white, width: 2),
                ),
                alignment: Alignment.center,
                child: Text(
                  _getInitials(previewList[i]['fullName'] ?? ''),
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ),
          if (totalCount > 3)
            Positioned(
              left: previewList.length * 20.0,
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF475569),
                  border: Border.all(color: Colors.white, width: 2),
                ),
                alignment: Alignment.center,
                child: Text(
                  '+${totalCount - 3}',
                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _getPreviewNames(List<Map<String, dynamic>> members, int totalCount) {
    if (members.isEmpty) return '';
    final names = members.take(2).map((m) => (m['fullName'] ?? '').toString()).where((n) => n.isNotEmpty).toList();
    if (totalCount > 2) {
      return '${names.join(', ')} +${totalCount - 2}';
    }
    return names.join(', ');
  }

  Color _getAvatarColor(String name) {
    if (name.isEmpty) return const Color(0xFF0050E5);
    int hash = 0;
    for (int i = 0; i < name.length; i++) {
      hash = name.codeUnitAt(i) + ((hash << 5) - hash);
    }
    final hue = (hash.abs() % 360).toDouble();
    return HSLColor.fromAHSL(1.0, hue, 0.65, 0.45).toColor();
  }

  String _getInitials(String name) {
    if (name.isEmpty) return 'U';
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, math.min(2, parts[0].length)).toUpperCase();
  }
}
