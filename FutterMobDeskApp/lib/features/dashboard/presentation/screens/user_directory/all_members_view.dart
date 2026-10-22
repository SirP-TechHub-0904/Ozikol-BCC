import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';

/// Screen presenting the complete directory of All Members with search, status filtering, and member details.
class AllMembersView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Creates an [AllMembersView].
  const AllMembersView({super.key, this.workspace});

  @override
  ConsumerState<AllMembersView> createState() => _AllMembersViewState();
}

class _AllMembersViewState extends ConsumerState<AllMembersView> {
  final _searchController = TextEditingController();
  bool _isLoading = true;
  String _selectedStatus = 'All';
  List<Map<String, dynamic>> _members = [];

  @override
  void initState() {
    super.initState();
    _loadMembers();
  }

  Future<void> _loadMembers() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final repo = ref.read(accountRepositoryProvider);
      final search = _searchController.text.trim();
      final status = _selectedStatus == 'All' ? null : _selectedStatus;
      final list = await repo.getUsers(search: search.isNotEmpty ? search : null, status: status);

      setState(() {
        _members = list;
        _isLoading = false;
      });
    } catch (_) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _showMemberDetails(Map<String, dynamic> member) {
    final name = (member['fullName'] ?? member['userName'] ?? 'Member').toString();
    final email = (member['email'] ?? '').toString();
    final roles = (member['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
    final status = (member['userStatus'] ?? member['status'] ?? 'Active').toString();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: AppColors.primary,
                  child: Text(
                    name.isNotEmpty ? name[0].toUpperCase() : 'U',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 2),
                      Text(email, style: TextStyle(fontSize: 13, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Text('Status: $status', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text('Assigned Roles: ${roles.join(', ')}', style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 24),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Close')),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.people_outline_rounded, size: 26, color: AppColors.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'All Members Directory',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Search, filter, and inspect registered workspace members and their access credentials.',
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Search & Filter Strip
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => _loadMembers(),
                  decoration: InputDecoration(
                    hintText: 'Search members by name or email...',
                    prefixIcon: const Icon(Icons.search_rounded, size: 20),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Status Filter Pills
              for (final st in ['All', 'Active', 'Locked'])
                Padding(
                  padding: const EdgeInsets.only(left: 6),
                  child: FilterChip(
                    label: Text(st),
                    selected: _selectedStatus == st,
                    onSelected: (val) {
                      setState(() => _selectedStatus = st);
                      _loadMembers();
                    },
                  ),
                ),
            ],
          ),
          const SizedBox(height: 20),

          // Members List
          if (_isLoading) ...[
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: CircularProgressIndicator(),
              ),
            ),
          ] else if (_members.isEmpty) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(40),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
              ),
              child: Column(
                children: [
                  Icon(Icons.person_search_rounded, size: 48, color: isDark ? AppColors.gray400 : AppColors.gray500),
                  const SizedBox(height: 12),
                  const Text('No Members Found', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text(
                    'No members matched your search or filter criteria.',
                    style: TextStyle(fontSize: 13, color: isDark ? AppColors.gray400 : AppColors.gray600),
                  ),
                ],
              ),
            ),
          ] else ...[
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _members.length,
              separatorBuilder: (_, index) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final m = _members[index];
                final name = (m['fullName'] ?? m['userName'] ?? 'Member').toString();
                final email = (m['email'] ?? '').toString();
                final roles = (m['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
                final isLocked = m['isLockedOut'] == true || m['userStatus'] == 'Locked';

                return InkWell(
                  onTap: () => _showMemberDetails(m),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: AppColors.primary,
                          child: Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'U',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
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
                              const SizedBox(height: 2),
                              Text(
                                email,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (roles.isNotEmpty) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              roles.first,
                              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.primary),
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                          decoration: BoxDecoration(
                            color: (isLocked ? AppColors.error : AppColors.success).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: Text(
                            isLocked ? 'Locked' : 'Active',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.bold,
                              color: isLocked ? AppColors.error : AppColors.success,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}
