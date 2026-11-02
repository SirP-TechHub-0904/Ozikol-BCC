import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';

/// Enterprise List Table component for managing tenant organizational categories and departments.
/// Replicates Angular Web UserCategoriesComponent 1-to-1 with live search, headcount badges,
/// sort order pills, publication status badges, and complete in-dialog Create/Edit/Delete flows.
class UserCategoriesView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Optional navigation callback to jump to other tabs (e.g. User Directory).
  final void Function(int tabIndex, {String? categoryFilter})? onNavigateToTab;

  /// Creates a [UserCategoriesView].
  const UserCategoriesView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
  });

  @override
  ConsumerState<UserCategoriesView> createState() => _UserCategoriesViewState();
}

class _UserCategoriesViewState extends ConsumerState<UserCategoriesView> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _categories = [];
  List<Map<String, dynamic>> _filteredCategories = [];
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _searchCtrl.addListener(_applyFilter);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    setState(() => _isLoading = true);
    try {
      final repo = ref.read(accountRepositoryProvider);
      final list = await repo.getCategories();
      if (mounted) {
        setState(() {
          _categories = list;
          _isLoading = false;
        });
        _applyFilter();
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _applyFilter() {
    final query = _searchCtrl.text.trim().toLowerCase();
    if (query.isEmpty) {
      setState(() => _filteredCategories = List.from(_categories));
    } else {
      setState(() {
        _filteredCategories = _categories.where((c) {
          final name = (c['name'] as String? ?? '').toLowerCase();
          final desc = (c['description'] as String? ?? '').toLowerCase();
          return name.contains(query) || desc.contains(query);
        }).toList();
      });
    }
  }

  void _openCreateOrEditDialog({Map<String, dynamic>? existingCategory}) {
    final isEditing = existingCategory != null;
    final nameCtrl = TextEditingController(text: existingCategory?['name'] as String? ?? '');
    final descCtrl = TextEditingController(text: existingCategory?['description'] as String? ?? '');
    final sortCtrl = TextEditingController(text: (existingCategory?['sortOrder'] ?? 0).toString());
    String selectedColor = existingCategory?['colorCode'] as String? ?? '#0050E5';
    bool isActive = existingCategory?['isActive'] != false;
    bool isSaving = false;

    final presetColors = [
      '#0050E5', // Royal Blue
      '#10B981', // Emerald
      '#8B5CF6', // Purple
      '#F59E0B', // Amber
      '#0284C7', // Sky Blue
      '#DB2777', // Pink
      '#475569', // Slate
    ];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          final isDark = Theme.of(context).brightness == Brightness.dark;

          return AlertDialog(
            backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    isEditing ? Icons.edit_rounded : Icons.add_rounded,
                    color: AppColors.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  isEditing ? 'Edit Category / Department' : 'Create Category / Department',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
            content: SizedBox(
              width: 480,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CATEGORY NAME *',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: nameCtrl,
                      decoration: InputDecoration(
                        hintText: 'e.g. Engineering & Product',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(
                            color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    Text(
                      'DESCRIPTION',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: descCtrl,
                      maxLines: 2,
                      decoration: InputDecoration(
                        hintText: 'Functional purpose and organizational mandate',
                        filled: true,
                        fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(
                            color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'SORT ORDER',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                                ),
                              ),
                              const SizedBox(height: 6),
                              TextField(
                                controller: sortCtrl,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  hintText: '0',
                                  filled: true,
                                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: BorderSide(
                                      color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'PUBLICATION STATUS',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Switch(
                                    value: isActive,
                                    onChanged: (val) => setDialogState(() => isActive = val),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    isActive ? 'Published' : 'Draft',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: isActive ? const Color(0xFF15803D) : AppColors.gray500,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    Text(
                      'BRAND COLOR ACCENT',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: presetColors.map((hex) {
                        final color = Color(int.parse(hex.replaceFirst('#', '0xFF')));
                        final isSelected = selectedColor.toUpperCase() == hex.toUpperCase();
                        return InkWell(
                          onTap: () => setDialogState(() => selectedColor = hex),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: color,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isSelected ? Colors.white : Colors.transparent,
                                width: 2,
                              ),
                              boxShadow: isSelected
                                  ? [
                                      BoxShadow(
                                        color: color.withValues(alpha: 0.4),
                                        blurRadius: 6,
                                        spreadRadius: 1,
                                      ),
                                    ]
                                  : null,
                            ),
                            child: isSelected
                                ? const Icon(Icons.check, color: Colors.white, size: 16)
                                : null,
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: isSaving ? null : () => Navigator.of(ctx).pop(),
                child: const Text('Cancel'),
              ),
              FilledButton.icon(
                onPressed: isSaving
                    ? null
                    : () async {
                        final name = nameCtrl.text.trim();
                        if (name.isEmpty) return;
                        setDialogState(() => isSaving = true);
                        try {
                          final repo = ref.read(accountRepositoryProvider);
                          final sort = int.tryParse(sortCtrl.text.trim()) ?? 0;
                          if (isEditing) {
                            final id = existingCategory['id'] as String;
                            await repo.updateCategory(id, {
                              'name': name,
                              'description': descCtrl.text.trim(),
                              'colorCode': selectedColor,
                              'sortOrder': sort,
                              'isActive': isActive,
                            });
                          } else {
                            await repo.createCategory(
                              name,
                              descCtrl.text.trim(),
                              colorCode: selectedColor,
                              sortOrder: sort,
                              isActive: isActive,
                            );
                          }
                          if (ctx.mounted) Navigator.of(ctx).pop();
                          _loadCategories();
                        } catch (_) {
                          setDialogState(() => isSaving = false);
                        }
                      },
                icon: isSaving
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.save_rounded, size: 16),
                label: Text(isEditing ? 'Save Changes' : 'Create Category'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _confirmDeleteCategory(Map<String, dynamic> cat) {
    final catId = cat['id'] as String? ?? '';
    final name = cat['name'] as String? ?? 'Category';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Category'),
        content: Text('Are you sure you want to delete "$name"? Members assigned to this category will become unassigned.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                final repo = ref.read(accountRepositoryProvider);
                await repo.deleteCategory(catId);
                _loadCategories();
              } catch (_) {}
            },
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ===================================================================
          // STANDARDIZED PAGE HEADER (1-to-1 with Angular AppPageHeader)
          // ===================================================================
          _buildPageHeader(isDark),
          const SizedBox(height: 18),

          // ===================================================================
          // SEARCH & SUMMARY FILTER TOOLBAR
          // ===================================================================
          _buildSearchToolbar(isDark),
          const SizedBox(height: 18),

          // ===================================================================
          // ENTERPRISE LIST TABLE
          // ===================================================================
          _buildEnterpriseTable(isDark),
        ],
      ),
    );
  }

  Widget _buildPageHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
        ),
      ),
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 16,
        runSpacing: 12,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.corporate_fare_rounded, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'ORGANIZATIONAL HIERARCHY',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.06,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'User Categories & Departments',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Manage organizational departments, business units, and member classification tiers in an enterprise table.',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                ],
              ),
            ],
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              OutlinedButton.icon(
                onPressed: () => widget.onNavigateToTab?.call(1),
                icon: const Icon(Icons.groups_rounded, size: 16),
                label: const Text('User Directory'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                  side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(width: 10),
              FilledButton.icon(
                onPressed: () => _openCreateOrEditDialog(),
                icon: const Icon(Icons.add_rounded, size: 16),
                label: const Text('Create Category'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.refresh_rounded, size: 18),
                tooltip: 'Refresh Categories',
                onPressed: _loadCategories,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSearchToolbar(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: SizedBox(
              height: 38,
              child: TextField(
                controller: _searchCtrl,
                style: const TextStyle(fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Search categories or departments...',
                  hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
                  prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF94A3B8)),
                  suffixIcon: _searchCtrl.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.close_rounded, size: 16, color: Color(0xFF94A3B8)),
                          onPressed: () {
                            _searchCtrl.clear();
                            _applyFilter();
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFFAFBFC),
                  contentPadding: EdgeInsets.zero,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1),
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1),
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: Color(0xFF0050E5), width: 1.5),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Text(
            'Showing ${_filteredCategories.length} of ${_categories.length} categories',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEnterpriseTable(bool isDark) {
    if (_isLoading) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 60),
        alignment: Alignment.center,
        child: const CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (_filteredCategories.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
          ),
        ),
        child: Column(
          children: [
            const Icon(Icons.corporate_fare_rounded, size: 44, color: Color(0xFFCBD5E1)),
            const SizedBox(height: 10),
            Text(
              _categories.isEmpty
                  ? 'No user categories or departments have been configured yet.'
                  : 'No categories matching "${_searchCtrl.text}".',
              style: TextStyle(
                fontSize: 13.5,
                color: isDark ? AppColors.gray300 : const Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 12),
            if (_categories.isEmpty)
              FilledButton.icon(
                onPressed: () => _openCreateOrEditDialog(),
                icon: const Icon(Icons.add_rounded, size: 16),
                label: const Text('Create First Category'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
              )
            else
              OutlinedButton(
                onPressed: () {
                  _searchCtrl.clear();
                  _applyFilter();
                },
                child: const Text('Clear Search'),
              ),
          ],
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Column(
          children: [
            // Table Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFFAFBFC),
              child: const Row(
                children: [
                  Expanded(
                    flex: 4,
                    child: Text(
                      'CATEGORY / DEPARTMENT',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.05,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 2,
                    child: Text(
                      'MEMBERS',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.05,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 2,
                    child: Text(
                      'SORT ORDER',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.05,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 2,
                    child: Text(
                      'STATUS',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.05,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Text(
                      'ACTIONS',
                      textAlign: TextAlign.right,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.05,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),

            // Table Rows
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _filteredCategories.length,
              separatorBuilder: (context, index) => Divider(
                height: 1,
                thickness: 1,
                color: isDark ? AppColors.outlineDark : const Color(0xFFF1F5F9),
              ),
              itemBuilder: (context, index) {
                final cat = _filteredCategories[index];
                final name = cat['name'] as String? ?? 'Category';
                final desc = cat['description'] as String? ?? '';
                final memberCount = (cat['memberCount'] ?? cat['count'] ?? 0) as int;
                final sortOrder = (cat['sortOrder'] ?? 0) as int;
                final isActive = cat['isActive'] != false;
                final colorHex = cat['colorCode'] as String? ?? '#0050E5';
                final color = Color(int.tryParse(colorHex.replaceFirst('#', '0xFF')) ?? 0xFF0050E5);

                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  child: Row(
                    children: [
                      // Name & Description
                      Expanded(
                        flex: 4,
                        child: Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(Icons.folder_shared_rounded, color: color, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  InkWell(
                                    onTap: () => _openCreateOrEditDialog(existingCategory: cat),
                                    child: Text(
                                      name,
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w700,
                                        color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                                      ),
                                    ),
                                  ),
                                  if (desc.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      desc,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 11.5,
                                        color: Color(0xFF64748B),
                                        height: 1.3,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Member Headcount
                      Expanded(
                        flex: 2,
                        child: Center(
                          child: InkWell(
                            onTap: () => widget.onNavigateToTab?.call(1, categoryFilter: name),
                            borderRadius: BorderRadius.circular(999),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.groups_rounded, size: 15, color: Color(0xFF0050E5)),
                                  const SizedBox(width: 5),
                                  Text(
                                    '$memberCount',
                                    style: const TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF0050E5),
                                    ),
                                  ),
                                  const SizedBox(width: 3),
                                  Text(
                                    memberCount == 1 ? 'member' : 'members',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: Color(0xFF475569),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Sort Order
                      Expanded(
                        flex: 2,
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(
                                color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                              ),
                            ),
                            child: Text(
                              '#$sortOrder',
                              style: const TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                fontFamily: 'monospace',
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Publication Status
                      Expanded(
                        flex: 2,
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                            decoration: BoxDecoration(
                              color: isActive ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: isActive ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  isActive ? 'Published' : 'Unpublished',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700,
                                    color: isActive ? const Color(0xFF15803D) : const Color(0xFF64748B),
                                    letterSpacing: 0.04,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                      // Actions
                      Expanded(
                        flex: 3,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            OutlinedButton.icon(
                              onPressed: () => widget.onNavigateToTab?.call(1, categoryFilter: name),
                              icon: const Icon(Icons.group_rounded, size: 14),
                              label: const Text('Members'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                side: BorderSide(
                                  color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1),
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(6),
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            OutlinedButton.icon(
                              onPressed: () => _openCreateOrEditDialog(existingCategory: cat),
                              icon: const Icon(Icons.edit_rounded, size: 14),
                              label: const Text('Edit'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                side: BorderSide(
                                  color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1),
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(6),
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, size: 16),
                              color: const Color(0xFFEF4444),
                              tooltip: 'Delete Category',
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                              onPressed: () => _confirmDeleteCategory(cat),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
