import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/central_adjuster.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Operational view modes for the [UserCategoriesView].
/// Supports viewing the categories table, creating a category, editing an existing category,
/// or conducting an impact-assessed deletion workflow—strictly in-page with zero modal dialogs.
/// </summary>
enum CategoryViewMode {
  /// Enterprise table listing all categories.
  list,

  /// In-page form for creating a new user category.
  create,

  /// In-page form for editing an existing category.
  edit,

  /// In-page confirmation view for safely deleting a category.
  delete,
}

/// <summary>
/// Enterprise List Table component for managing tenant organizational categories and departments.
/// Replicates Angular Web UserCategoriesComponent 1-to-1 with live search, headcount badges,
/// sort order pills, publication status badges, and dedicated full in-page Create, Edit, and Delete flows.
/// </summary>
class UserCategoriesView extends ConsumerStatefulWidget {
  /// <summary>The active workspace context.</summary>
  final Workspace? workspace;

  /// <summary>Optional navigation callback to jump to other tabs (e.g. User Directory).</summary>
  final void Function(int tabIndex, {String? categoryFilter})? onNavigateToTab;

  /// <summary>Optional callback to navigate back to previous screen.</summary>
  final VoidCallback? onNavigateBack;

  /// <summary>Creates a [UserCategoriesView].</summary>
  const UserCategoriesView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
    this.onNavigateBack,
  });

  @override
  ConsumerState<UserCategoriesView> createState() => _UserCategoriesViewState();
}

class _UserCategoriesViewState extends ConsumerState<UserCategoriesView> {
  CategoryViewMode _viewMode = CategoryViewMode.list;
  Map<String, dynamic>? _selectedCategory;

  bool _isLoading = true;
  List<Map<String, dynamic>> _categories = [];
  List<Map<String, dynamic>> _filteredCategories = [];
  final TextEditingController _searchCtrl = TextEditingController();

  // Form controllers for Create / Edit
  final TextEditingController _nameCtrl = TextEditingController();
  final TextEditingController _descCtrl = TextEditingController();
  final TextEditingController _sortCtrl = TextEditingController();
  bool _isActive = true;
  bool _isSaving = false;

  // Deletion state
  final TextEditingController _confirmDeleteCtrl = TextEditingController();
  bool _isDeleting = false;
  String? _deleteError;

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _searchCtrl.addListener(_applyFilter);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _sortCtrl.dispose();
    _confirmDeleteCtrl.dispose();
    super.dispose();
  }

  /// <summary>
  /// Fetches tenant user categories from the backend repository.
  /// </summary>
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

  /// <summary>
  /// Filters the loaded categories in real-time by search query.
  /// </summary>
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

  /// <summary>
  /// Switches into in-page Create Category view mode.
  /// </summary>
  void _startCreate() {
    setState(() {
      _viewMode = CategoryViewMode.create;
      _selectedCategory = null;
      _nameCtrl.clear();
      _descCtrl.clear();
      _sortCtrl.text = '0';
      _isActive = true;
      _isSaving = false;
      _deleteError = null;
    });
  }

  /// <summary>
  /// Switches into in-page Edit Category view mode with pre-populated values.
  /// </summary>
  void _startEdit(Map<String, dynamic> cat) {
    setState(() {
      _viewMode = CategoryViewMode.edit;
      _selectedCategory = cat;
      _nameCtrl.text = cat['name'] as String? ?? '';
      _descCtrl.text = cat['description'] as String? ?? '';
      _sortCtrl.text = (cat['sortOrder'] ?? 0).toString();
      _isActive = cat['isActive'] != false;
      _isSaving = false;
      _deleteError = null;
    });
  }

  /// <summary>
  /// Switches into in-page Delete Category confirmation view mode.
  /// </summary>
  void _startDelete(Map<String, dynamic> cat) {
    setState(() {
      _viewMode = CategoryViewMode.delete;
      _selectedCategory = cat;
      _confirmDeleteCtrl.clear();
      _isDeleting = false;
      _deleteError = null;
    });
  }

  /// <summary>
  /// Reverts any active sub-view mode back to the primary category list table.
  /// </summary>
  void _backToList() {
    setState(() {
      _viewMode = CategoryViewMode.list;
      _selectedCategory = null;
      _deleteError = null;
      _isSaving = false;
      _isDeleting = false;
    });
  }

  /// <summary>
  /// Persists either a new or updated category tier to the backend.
  /// </summary>
  Future<void> _saveCategory() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty || _isSaving) return;

    setState(() => _isSaving = true);
    final repo = ref.read(accountRepositoryProvider);
    final sort = int.tryParse(_sortCtrl.text.trim()) ?? 0;
    final isEditing = _viewMode == CategoryViewMode.edit;

    bool success = false;
    try {
      if (isEditing && _selectedCategory != null) {
        final id = _selectedCategory!['id'] as String;
        success = await repo.updateCategory(id, {
          'name': name,
          'description': _descCtrl.text.trim(),
          'colorCode': _selectedCategory!['colorCode'] ?? '#0050e5',
          'icon': _selectedCategory!['icon'] ?? 'folder_shared',
          'sortOrder': sort,
          'isActive': _isActive,
        });
      } else {
        success = await repo.createCategory(
          name,
          _descCtrl.text.trim(),
          colorCode: '#0050e5',
          icon: 'folder_shared',
          sortOrder: sort,
          isActive: _isActive,
        );
      }
    } catch (_) {
      success = false;
    }

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isEditing
                ? 'Category updated successfully.'
                : 'User category created successfully.',
          ),
          backgroundColor: const Color(0xFF16A34A),
          behavior: SnackBarBehavior.floating,
        ),
      );
      _backToList();
      _loadCategories();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isEditing
                ? 'Failed to update category. Please verify your connection.'
                : 'Failed to create category. Please verify your connection.',
          ),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  /// <summary>
  /// Executes category deletion after checking confirmation text input.
  /// </summary>
  Future<void> _executeDelete() async {
    if (_selectedCategory == null || _isDeleting) return;
    final targetName = _selectedCategory!['name'] as String? ?? '';
    if (_confirmDeleteCtrl.text.trim() != targetName.trim()) return;

    final id = _selectedCategory!['id'] as String? ?? '';
    final memberCount = (_selectedCategory!['memberCount'] ?? _selectedCategory!['count'] ?? 0) as int;

    if (memberCount > 0) {
      setState(() {
        _deleteError = 'Cannot delete category "$targetName" because it currently has $memberCount member(s) assigned. Please reassign them in the User Directory first.';
      });
      return;
    }

    setState(() {
      _isDeleting = true;
      _deleteError = null;
    });

    final repo = ref.read(accountRepositoryProvider);
    final success = await repo.deleteCategory(id);

    if (!mounted) return;
    setState(() => _isDeleting = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Category "$targetName" has been deleted.'),
          backgroundColor: const Color(0xFF16A34A),
          behavior: SnackBarBehavior.floating,
        ),
      );
      _backToList();
      _loadCategories();
    } else {
      setState(() {
        _deleteError = 'Could not delete category "$targetName". Active members may still be assigned, or server rejected the request.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return PopScope(
      canPop: _viewMode == CategoryViewMode.list,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_viewMode != CategoryViewMode.list) {
          _backToList();
        }
      },
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_viewMode == CategoryViewMode.list) ...[
              // ===================================================================
              // ENTERPRISE CATEGORIES TABLE (1-to-1 with Angular Web)
              // ===================================================================
              _buildListHeader(isDark),
              const SizedBox(height: 18),
              _buildSearchToolbar(isDark),
              const SizedBox(height: 18),
              _buildEnterpriseTable(isDark),
            ] else if (_viewMode == CategoryViewMode.create || _viewMode == CategoryViewMode.edit) ...[
              // ===================================================================
              // IN-PAGE CREATE / EDIT CATEGORY (Zero Modals)
              // ===================================================================
              _buildFormHeader(isDark),
              const SizedBox(height: 18),
              _buildFormCard(isDark),
            ] else if (_viewMode == CategoryViewMode.delete) ...[
              // ===================================================================
              // IN-PAGE DELETE CONFIRMATION (Zero Modals)
              // ===================================================================
              _buildDeleteHeader(isDark),
              const SizedBox(height: 18),
              _buildDeleteLayout(isDark),
            ],
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // 1. LIST VIEW COMPONENTS
  // ===========================================================================

  Widget _buildListHeader(bool isDark) {
    return CentralAdjuster.pageHeader(
      icon: Icons.corporate_fare_rounded,
      eyebrow: 'ORGANIZATIONAL HIERARCHY',
      title: 'User Categories & Departments',
      subtitle:
          'Manage organizational departments, business units, and member classification tiers in an enterprise table.',
      isDark: isDark,
      onBack: widget.onNavigateBack,
      actions: [
        if (widget.onNavigateBack != null) ...[
          OutlinedButton.icon(
            onPressed: widget.onNavigateBack,
            icon: const Icon(Icons.arrow_back_rounded, size: 16),
            label: const Text('Back'),
            style: OutlinedButton.styleFrom(
              foregroundColor: isDark ? AppColors.onSurfaceDark : const Color(0xFF334155),
              side: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
            ),
          ),
        ],
        OutlinedButton.icon(
          onPressed: () => widget.onNavigateToTab?.call(1),
          icon: const Icon(Icons.groups_rounded, size: 16),
          label: const Text('User Directory'),
          style: OutlinedButton.styleFrom(
            foregroundColor: isDark ? AppColors.onSurfaceDark : const Color(0xFF334155),
            side: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
        ),
        FilledButton.icon(
          onPressed: _startCreate,
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
        IconButton(
          icon: const Icon(Icons.refresh_rounded, size: 18),
          tooltip: 'Refresh Categories',
          onPressed: _loadCategories,
        ),
      ],
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
          RichText(
            text: TextSpan(
              style: TextStyle(
                fontSize: 12,
                color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
              ),
              children: [
                const TextSpan(text: 'Showing '),
                TextSpan(
                  text: '${_filteredCategories.length}',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                  ),
                ),
                const TextSpan(text: ' of '),
                TextSpan(
                  text: '${_categories.length}',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                  ),
                ),
                const TextSpan(text: ' categories'),
              ],
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
                onPressed: _startCreate,
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

    return LayoutBuilder(
      builder: (context, constraints) {
        final tableContent = Column(
          children: [
            // Table Header Row
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
                    flex: 1,
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
                    flex: 4,
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
                                color: AppColors.primary.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(
                                Icons.folder_shared_rounded,
                                color: AppColors.primary,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  InkWell(
                                    onTap: () => _startEdit(cat),
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
                            onTap: () => widget.onNavigateToTab?.call(1, categoryFilter: cat['id']?.toString() ?? name),
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
                        flex: 1,
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
                        flex: 4,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            _buildRowActionButton(
                              icon: Icons.groups_rounded,
                              label: 'Members',
                              tooltip: 'View Category Members',
                              onTap: () => widget.onNavigateToTab?.call(1, categoryFilter: cat['id']?.toString() ?? name),
                              isDark: isDark,
                            ),
                            const SizedBox(width: 6),
                            _buildRowActionButton(
                              icon: Icons.edit_rounded,
                              label: 'Edit',
                              tooltip: 'Edit Category',
                              onTap: () => _startEdit(cat),
                              isDark: isDark,
                            ),
                            const SizedBox(width: 6),
                            _buildRowActionButton(
                              icon: Icons.delete_outline_rounded,
                              label: null,
                              tooltip: 'Delete Category',
                              onTap: () => _startDelete(cat),
                              isDark: isDark,
                              isDestructive: true,
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
        );

        return Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color.fromRGBO(0, 0, 0, 0.02),
                blurRadius: 3,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: constraints.maxWidth < 920
                ? SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: SizedBox(width: 920, child: tableContent),
                  )
                : tableContent,
          ),
        );
      },
    );
  }

  /// <summary>
  /// Renders a standardized, unified table row action button (Members, Edit, Delete)
  /// with exact 30px height, 6px border radius, crisp borders, and refined hover/touch feedback.
  /// Eliminates mismatched capsule shapes and ensures 1-to-1 parity with enterprise dashboard tables.
  /// </summary>
  Widget _buildRowActionButton({
    required IconData icon,
    required String? label,
    required VoidCallback onTap,
    required String tooltip,
    required bool isDark,
    bool isDestructive = false,
  }) {
    final borderColor = isDestructive
        ? (isDark ? const Color(0xFF7F1D1D) : const Color(0xFFFECACA))
        : (isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1));
    final bgColor = isDestructive
        ? (isDark ? const Color(0xFF450A0A) : const Color(0xFFFEF2F2))
        : (isDark ? AppColors.surfaceVariantDark : Colors.white);
    final fgColor = isDestructive
        ? const Color(0xFFDC2626)
        : (isDark ? AppColors.onSurfaceDark : const Color(0xFF334155));
    final iconColor = isDestructive ? const Color(0xFFDC2626) : const Color(0xFF0050E5);

    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(6),
          child: Container(
            height: 30,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: borderColor),
              boxShadow: const [
                BoxShadow(
                  color: Color.fromRGBO(0, 0, 0, 0.02),
                  blurRadius: 2,
                  offset: Offset(0, 1),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Icon(icon, size: 14, color: iconColor),
                if (label != null) ...[
                  const SizedBox(width: 4),
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: fgColor,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // 2. CREATE / EDIT IN-PAGE VIEW (Zero Modals)
  // ===========================================================================

  Widget _buildFormHeader(bool isDark) {
    final isEditing = _viewMode == CategoryViewMode.edit;
    final catName = _selectedCategory?['name'] as String? ?? 'Department';

    return CentralAdjuster.pageHeader(
      icon: Icons.corporate_fare_rounded,
      eyebrow: 'ORGANIZATIONAL HIERARCHY',
      title: isEditing ? 'Edit Category: $catName' : 'Create User Category',
      subtitle:
          'Configure organizational department or user category tier, description, sort order, and publication status.',
      isDark: isDark,
      onBack: _backToList,
      actions: [
        OutlinedButton.icon(
          onPressed: _backToList,
          icon: const Icon(Icons.arrow_back_rounded, size: 16),
          label: const Text('Back to Categories'),
          style: OutlinedButton.styleFrom(
            foregroundColor: isDark ? AppColors.onSurfaceDark : const Color(0xFF334155),
            side: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _buildFormCard(bool isDark) {
    final isEditing = _viewMode == CategoryViewMode.edit;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color.fromRGBO(0, 0, 0, 0.02),
            blurRadius: 3,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Card Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFFAFBFC),
              border: Border(
                bottom: BorderSide(
                  color: isDark ? AppColors.outlineDark : const Color(0xFFF1F5F9),
                ),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.corporate_fare_rounded,
                    color: AppColors.primary,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Category Details',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Organizational department name, description, priority order, and publication visibility',
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
          ),

          // Card Body
          Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name & Sort Order Row
                LayoutBuilder(
                  builder: (context, constraints) {
                    final isNarrow = constraints.maxWidth < 600;
                    final nameField = Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'CATEGORY / DEPARTMENT NAME *',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.05,
                            color: isDark ? AppColors.gray300 : const Color(0xFF475569),
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _nameCtrl,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: 'e.g. Engineering Team, Software Team, Operations',
                            hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                            filled: true,
                            fillColor: isDark ? AppColors.surfaceVariantDark : Colors.white,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                      ],
                    );

                    final sortField = Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'SORT ORDER / DISPLAY PRIORITY',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.05,
                            color: isDark ? AppColors.gray300 : const Color(0xFF475569),
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _sortCtrl,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            hintText: '0',
                            hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                            filled: true,
                            fillColor: isDark ? AppColors.surfaceVariantDark : Colors.white,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                      ],
                    );

                    if (isNarrow) {
                      return Column(
                        children: [
                          nameField,
                          const SizedBox(height: 16),
                          sortField,
                        ],
                      );
                    }

                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(flex: 3, child: nameField),
                        const SizedBox(width: 16),
                        Expanded(flex: 2, child: sortField),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 18),

                // Description Field
                Text(
                  'DESCRIPTION (OPTIONAL)',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.05,
                    color: isDark ? AppColors.gray300 : const Color(0xFF475569),
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _descCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Briefly describe the responsibilities, members, or purpose of this category...',
                    hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: isDark ? AppColors.surfaceVariantDark : Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                const SizedBox(height: 18),

                // Publication Status Card
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: _isActive
                        ? (isDark ? const Color(0xFF052E16) : const Color(0xFFF0FDF4))
                        : (isDark ? AppColors.surfaceVariantDark : const Color(0xFFFAFBFC)),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _isActive
                          ? const Color(0xFFBBF7D0)
                          : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  _isActive ? Icons.check_circle_rounded : Icons.pause_circle_rounded,
                                  size: 20,
                                  color: _isActive ? const Color(0xFF16A34A) : const Color(0xFF64748B),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Publication Status',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: _isActive ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    _isActive ? 'Published' : 'Unpublished',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.04,
                                      color: _isActive ? const Color(0xFF15803D) : const Color(0xFF64748B),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _isActive
                                  ? 'Active & Published: Visible to administrators, member registration forms, and departmental directories.'
                                  : 'Unpublished / Draft: Temporarily hidden from registration forms and disabled for new member assignments.',
                              style: TextStyle(
                                fontSize: 12,
                                color: _isActive
                                    ? (isDark ? const Color(0xFF86EFAC) : const Color(0xFF166534))
                                    : (isDark ? AppColors.gray400 : const Color(0xFF64748B)),
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Switch(
                        value: _isActive,
                        activeThumbColor: const Color(0xFF0050E5),
                        activeTrackColor: const Color(0xFF93C5FD),
                        onChanged: (val) => setState(() => _isActive = val),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Card Footer
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
              border: Border(
                top: BorderSide(
                  color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton(
                  onPressed: _isSaving ? null : _backToList,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: isDark ? AppColors.onSurfaceDark : const Color(0xFF334155),
                    side: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 12),
                FilledButton.icon(
                  onPressed: (_isSaving || _nameCtrl.text.trim().isEmpty) ? null : _saveCategory,
                  icon: _isSaving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.save_rounded, size: 16),
                  label: Text(_isSaving
                      ? 'Saving Category...'
                      : (isEditing ? 'Save Changes' : 'Create Category')),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.5),
                    disabledForegroundColor: Colors.white70,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // 3. DELETE IN-PAGE CONFIRMATION VIEW (Zero Modals)
  // ===========================================================================

  Widget _buildDeleteHeader(bool isDark) {
    return CentralAdjuster.pageHeader(
      icon: Icons.warning_amber_rounded,
      iconColor: const Color(0xFFDC2626),
      iconBgColor: const Color(0xFFFEE2E2),
      eyebrow: 'USERS SUITE / USER CATEGORIES / DELETE CATEGORY',
      title: 'Confirm User Category Deletion',
      subtitle:
          'Review organizational impact and verify identity before permanently destroying this classification category.',
      isDark: isDark,
      onBack: _backToList,
      actions: [
        OutlinedButton.icon(
          onPressed: _backToList,
          icon: const Icon(Icons.arrow_back_rounded, size: 16),
          label: const Text('Cancel & Go Back'),
          style: OutlinedButton.styleFrom(
            foregroundColor: isDark ? AppColors.onSurfaceDark : const Color(0xFF334155),
            side: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _buildDeleteLayout(bool isDark) {
    final cat = _selectedCategory ?? {};
    final name = cat['name'] as String? ?? 'Category';
    final desc = cat['description'] as String? ?? '';
    final memberCount = (cat['memberCount'] ?? cat['count'] ?? 0) as int;
    final sortOrder = (cat['sortOrder'] ?? 0) as int;
    final isActive = cat['isActive'] != false;
    final isMatched = _confirmDeleteCtrl.text.trim() == name.trim();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Error Banner
        if (_deleteError != null) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFF87171)),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _deleteError!,
                    style: const TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFFDC2626),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
        ],

        // Target Record Summary Card
        Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
            ),
            boxShadow: const [
              BoxShadow(
                color: Color.fromRGBO(0, 0, 0, 0.02),
                blurRadius: 4,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFFAFBFC),
                  border: Border(
                    bottom: BorderSide(
                      color: isDark ? AppColors.outlineDark : const Color(0xFFF1F5F9),
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.category_rounded, size: 18, color: Color(0xFF0050E5)),
                    const SizedBox(width: 8),
                    Text(
                      'Category to be Deleted',
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(22),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.folder_shared_rounded,
                        color: AppColors.primary,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            desc.isNotEmpty ? desc : 'No description provided.',
                            style: TextStyle(
                              fontSize: 12.5,
                              color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.groups_rounded, size: 14, color: Color(0xFF0050E5)),
                                    const SizedBox(width: 5),
                                    Text(
                                      '$memberCount Active Members',
                                      style: const TextStyle(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF0050E5),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(
                                    color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                                  ),
                                ),
                                child: Text(
                                  'Sort Order: #$sortOrder',
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isActive ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  isActive ? 'Published' : 'Unpublished',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: isActive ? const Color(0xFF15803D) : const Color(0xFF64748B),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Consequences Warning Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF450A0A) : const Color(0xFFFEF2F2),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isDark ? const Color(0xFF991B1B) : const Color(0xFFFECACA),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.dangerous_rounded, color: Color(0xFFDC2626), size: 22),
                  SizedBox(width: 10),
                  Text(
                    'Consequences of Deleting this Category',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFFDC2626),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _buildConsequenceBullet(
                'Member Reassignment: ',
                'All members currently grouped under this category will have their organizational category reset to Uncategorized.',
                isDark,
              ),
              const SizedBox(height: 8),
              _buildConsequenceBullet(
                'Portal Badges & Grouping: ',
                'Any department badges, directory filters, or analytics grouped by this category will no longer reference it.',
                isDark,
              ),
              const SizedBox(height: 8),
              _buildConsequenceBullet(
                'Permanent Record Eradication: ',
                'This category configuration cannot be recovered after deletion.',
                isDark,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Exact Name Confirmation Card
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
            ),
            boxShadow: const [
              BoxShadow(
                color: Color.fromRGBO(0, 0, 0, 0.02),
                blurRadius: 4,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'To confirm that you understand these consequences and intend to permanently destroy this user category, please type the exact category name:',
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? AppColors.gray300 : const Color(0xFF475569),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Text(
                  name,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: Color(0xFFDC2626),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'TYPE CATEGORY NAME TO CONFIRM DELETION:',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.05,
                  color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _confirmDeleteCtrl,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: 'Type the exact category name here...',
                  hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                  filled: true,
                  fillColor: isDark ? AppColors.surfaceVariantDark : Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1),
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: isMatched
                          ? const Color(0xFF16A34A)
                          : (isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: isMatched ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                      width: 1.5,
                    ),
                  ),
                ),
              ),
              if (_confirmDeleteCtrl.text.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      isMatched ? Icons.check_circle_rounded : Icons.cancel_rounded,
                      size: 16,
                      color: isMatched ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isMatched
                          ? 'Category name matched. Deletion unlocked.'
                          : 'Category name does not match yet.',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isMatched ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: _isDeleting ? null : _backToList,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: isDark ? AppColors.onSurfaceDark : const Color(0xFF334155),
                      side: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  FilledButton.icon(
                    onPressed: (!isMatched || _isDeleting) ? null : _executeDelete,
                    icon: _isDeleting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.delete_forever_rounded, size: 16),
                    label: Text(_isDeleting
                        ? 'Deleting Category...'
                        : 'I understand the consequences, delete this category'),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFDC2626),
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: const Color(0xFFFCA5A5),
                      disabledForegroundColor: Colors.white70,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildConsequenceBullet(String boldPrefix, String text, bool isDark) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          margin: const EdgeInsets.only(top: 6),
          width: 5,
          height: 5,
          decoration: const BoxDecoration(
            color: Color(0xFFDC2626),
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: TextStyle(
                fontSize: 13,
                color: isDark ? AppColors.gray200 : const Color(0xFF334155),
                height: 1.4,
              ),
              children: [
                TextSpan(
                  text: boldPrefix,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                TextSpan(text: text),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
