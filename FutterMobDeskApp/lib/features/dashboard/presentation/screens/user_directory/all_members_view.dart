import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/services/export_service.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/central_adjuster.dart';
import '../../../data/account_repository.dart';
import 'user_create_view.dart';
import 'user_details_view.dart';
import 'user_edit_view.dart';

/// <summary>
/// Full enterprise Member Directory & Register screen with 1-to-1 parity matching the Angular Web client.
/// Features standardized page header, multi-column search & filter card, CSV/Word/PDF exports,
/// category-specific exports, responsive enterprise data table with sortable columns, avatars,
/// live status badges, comprehensive 360-degree Member Dossier, member creation, and profile editing.
/// </summary>
class AllMembersView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Optional callback to navigate to a specific navigation tab index in the shell.
  final ValueChanged<int>? onNavigateToTab;

  /// Optional initial account status filter to pre-select upon navigation.
  final String? initialStatusFilter;

  /// Optional callback to navigate back to the previous screen.
  final VoidCallback? onNavigateBack;

  /// Optional callback to navigate to dedicated full-page member details view.
  final ValueChanged<Map<String, dynamic>>? onNavigateToMemberDetails;

  /// Optional callback to navigate to dedicated full-page member edit view.
  final ValueChanged<Map<String, dynamic>>? onNavigateToMemberEdit;

  /// Creates an [AllMembersView] instance.
  const AllMembersView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
    this.initialStatusFilter,
    this.onNavigateBack,
    this.onNavigateToMemberDetails,
    this.onNavigateToMemberEdit,
  });

  @override
  ConsumerState<AllMembersView> createState() => _AllMembersViewState();
}

class _AllMembersViewState extends ConsumerState<AllMembersView> {
  final _searchController = TextEditingController();

  bool _isLoading = true;
  List<Map<String, dynamic>> _allUsers = [];
  List<Map<String, dynamic>> _filteredUsers = [];
  List<Map<String, dynamic>> _paginatedUsers = [];
  List<Map<String, dynamic>> _categories = [];

  // Filter state
  String _searchQuery = '';
  String _selectedCategoryFilter = '';
  String _selectedRoleFilter = 'All';
  String _selectedStatusFilter = 'All';

  // Sorting state
  String _sortColumn = 'fullName';
  bool _sortAsc = true;

  // Pagination state
  int _pageSize = 10;
  int _currentPage = 1;
  int _totalPages = 1;

  @override
  void initState() {
    super.initState();
    _selectedStatusFilter = widget.initialStatusFilter ?? 'All';
    _loadData();
  }

  @override
  void didUpdateWidget(covariant AllMembersView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialStatusFilter != null && widget.initialStatusFilter != oldWidget.initialStatusFilter) {
      _selectedStatusFilter = widget.initialStatusFilter!;
      _applyFilters();
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  /// <summary>
  /// Loads all members and category tiers concurrently from the tenant backend.
  /// </summary>
  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      final repo = ref.read(accountRepositoryProvider);
      final results = await Future.wait([
        repo.getUsers(),
        repo.getCategories(),
      ]);

      final rawUsers = results[0];
      final rawCategories = results[1];

      // Strictly filter out any root SuperAdmin user account from appearing in user list
      final nonSuperAdmins = rawUsers.where((u) {
        final roles = (u['roles'] as List<dynamic>?)?.map((e) => e.toString().toLowerCase()).toList() ?? [];
        return !roles.contains('superadmin');
      }).toList();

      if (mounted) {
        setState(() {
          _allUsers = nonSuperAdmins;
          _categories = rawCategories;
          _isLoading = false;
        });
        _applyFilters();
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  /// <summary>
  /// Filters and sorts the member list in-memory with instant responsiveness.
  /// </summary>
  void _applyFilters() {
    var list = List<Map<String, dynamic>>.from(_allUsers);

    // 1. Search Query filter (matches Name, Email, MemberId, Designation, CategoryName, Phone)
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((u) {
        final name = (u['fullName'] ?? u['userName'] ?? '').toString().toLowerCase();
        final email = (u['email'] ?? '').toString().toLowerCase();
        final memberId = (u['memberId'] ?? '').toString().toLowerCase();
        final designation = (u['designation'] ?? '').toString().toLowerCase();
        final category = (u['categoryName'] ?? '').toString().toLowerCase();
        final phone = (u['phoneNumber'] ?? '').toString().toLowerCase();
        return name.contains(q) ||
            email.contains(q) ||
            memberId.contains(q) ||
            designation.contains(q) ||
            category.contains(q) ||
            phone.contains(q);
      }).toList();
    }

    // 2. Category Tier filter
    if (_selectedCategoryFilter.isNotEmpty) {
      final filterVal = _selectedCategoryFilter.toLowerCase();
      list = list.where((u) {
        final catId = (u['bcpUserCategoryId'] ?? '').toString().toLowerCase();
        final catName = (u['categoryName'] ?? '').toString().toLowerCase();
        return catId == filterVal || catName == filterVal;
      }).toList();
    }

    // 3. Assigned Role filter
    if (_selectedRoleFilter != 'All') {
      list = list.where((u) {
        final roles = (u['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
        return roles.contains(_selectedRoleFilter);
      }).toList();
    }

    // 4. Account Status filter (Active, Suspended, or Suspicious / Flagged)
    if (_selectedStatusFilter != 'All') {
      list = list.where((u) {
        if (_selectedStatusFilter == 'Suspicious') {
          final accessFailed = (u['accessFailedCount'] as num?)?.toInt() ?? 0;
          final isLockedOut = u['isLockedOut'] == true;
          final isSuspicious = u['isSuspicious'] == true;
          return isSuspicious || isLockedOut || accessFailed > 0;
        }
        final status = (u['userStatus'] ?? u['status'] ?? 'Active').toString();
        return status.toLowerCase() == _selectedStatusFilter.toLowerCase();
      }).toList();
    }

    // 5. Comprehensive Column Sorting
    list.sort((a, b) {
      dynamic valA = a[_sortColumn];
      dynamic valB = b[_sortColumn];

      if (_sortColumn == 'roles') {
        final rolesA = (a['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
        final rolesB = (b['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
        valA = rolesA.join(', ');
        valB = rolesB.join(', ');
      }

      valA = (valA ?? '').toString().toLowerCase();
      valB = (valB ?? '').toString().toLowerCase();

      final comp = (valA as String).compareTo(valB as String);
      return _sortAsc ? comp : -comp;
    });

    _filteredUsers = list;
    _currentPage = 1;
    _updatePagination();
  }

  /// <summary>
  /// Toggles column sorting order.
  /// </summary>
  void _sortBy(String column) {
    setState(() {
      if (_sortColumn == column) {
        _sortAsc = !_sortAsc;
      } else {
        _sortColumn = column;
        _sortAsc = true;
      }
      _applyFilters();
    });
  }

  /// <summary>
  /// Resets all search queries and active filter dropdowns to their default state.
  /// </summary>
  void _resetFilters() {
    setState(() {
      _searchController.clear();
      _searchQuery = '';
      _selectedCategoryFilter = '';
      _selectedRoleFilter = 'All';
      _selectedStatusFilter = 'All';
      _applyFilters();
    });
  }

  /// <summary>
  /// Updates the sliced paginated slice according to the current page and page size.
  /// </summary>
  void _updatePagination() {
    _totalPages = (_filteredUsers.length / _pageSize).ceil();
    if (_totalPages < 1) _totalPages = 1;

    final start = (_currentPage - 1) * _pageSize;
    final end = (start + _pageSize < _filteredUsers.length) ? start + _pageSize : _filteredUsers.length;

    setState(() {
      _paginatedUsers = start < _filteredUsers.length ? _filteredUsers.sublist(start, end) : [];
    });
  }

  /// <summary>
  /// Navigates to a specific pagination page.
  /// </summary>
  void _setPage(int page) {
    if (page < 1 || page > _totalPages) return;
    setState(() {
      _currentPage = page;
      _updatePagination();
    });
  }

  /// <summary>
  /// Sanitizes member ID string from redundant hyphens or slashes.
  /// </summary>
  String _sanitizeId(String? id) {
    if (id == null || id.isEmpty) return 'CC-2026';
    return id.replaceAll(RegExp(r'[-]{2,}'), '-').replaceAll(RegExp(r'[/]{2,}'), '/');
  }

  /// <summary>
  /// Extracts 1 to 2 uppercase initials from a member's full name.
  /// </summary>
  String _getInitials(String? name) {
    if (name == null || name.trim().isEmpty) return 'U';
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase();
  }

  /// <summary>
  /// Generates a deterministic linear gradient derived from the hash code of the member's name.
  /// </summary>
  LinearGradient _getGradient(String? name) {
    const gradients = [
      LinearGradient(colors: [Color(0xFF0050E5), Color(0xFF38BDF8)]),
      LinearGradient(colors: [Color(0xFF10B981), Color(0xFF06B6D4)]),
      LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)]),
      LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFEF4444)]),
      LinearGradient(colors: [Color(0xFF0EA5E9), Color(0xFF6366F1)]),
    ];
    int hash = 0;
    final str = name ?? 'Member';
    for (int i = 0; i < str.length; i++) {
      hash = str.codeUnitAt(i) + ((hash << 5) - hash);
    }
    return gradients[hash.abs() % gradients.length];
  }

  /// <summary>
  /// Defines canonical export column mapping matching the Web client report schema.
  /// </summary>
  List<ExportColumn> _getExportColumns() {
    return [
      ExportColumn(key: 'memberId', header: 'Member ID', format: (val, _) => _sanitizeId(val?.toString())),
      ExportColumn(key: 'fullName', header: 'Full Name'),
      ExportColumn(key: 'email', header: 'Email Address'),
      ExportColumn(key: 'phoneNumber', header: 'Phone Number'),
      ExportColumn(key: 'categoryName', header: 'Category Tier'),
      ExportColumn(
        key: 'roles',
        header: 'Assigned Roles',
        format: (val, _) => val is List ? val.join(', ') : (val?.toString() ?? 'Member'),
      ),
      ExportColumn(key: 'designation', header: 'Designation'),
      ExportColumn(key: 'userStatus', header: 'Status'),
      ExportColumn(
        key: 'joinDate',
        header: 'Join Date',
        format: (val, _) {
          if (val == null) return '-';
          try {
            return DateFormat('yyyy-MM-dd').format(DateTime.parse(val.toString()));
          } catch (_) {
            return val.toString();
          }
        },
      ),
    ];
  }

  /// <summary>
  /// Generates printable landscape report with Print / Save as PDF support.
  /// </summary>
  Future<void> _exportPdf() async {
    final org = widget.workspace?.organizationName ?? 'Business Command Center';
    final filterSum = _searchQuery.isNotEmpty ? 'Search: "$_searchQuery"' : null;
    await ExportService.showInAppPdfPreview(
      context: context,
      title: 'Official Member Directory Register',
      organizationName: org,
      columns: _getExportColumns(),
      data: _filteredUsers,
      filterSummary: filterSum,
    );
  }

  /// <summary>
  /// Generates UTF-8 CSV spreadsheet and opens it in system default spreadsheet viewer.
  /// </summary>
  Future<void> _exportExcel() async {
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final path = await ExportService.exportToCsv(
      filename: 'Member_Directory_$today',
      columns: _getExportColumns(),
      data: _filteredUsers,
    );
    if (path != null) {
      final fileName = path.split(Platform.pathSeparator).last;
      _showToast('Spreadsheet saved to Downloads: $fileName');
    } else {
      _showToast('No records to export.');
    }
  }

  /// <summary>
  /// Generates Word document (.doc) with complete formatted HTML tables.
  /// </summary>
  Future<void> _exportWord() async {
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final org = widget.workspace?.organizationName ?? 'Business Command Center';
    final path = await ExportService.exportToWord(
      filename: 'Member_Register_$today',
      title: 'Official Member Directory Register',
      organizationName: org,
      columns: _getExportColumns(),
      data: _filteredUsers,
      filterSummary: _searchQuery.isNotEmpty ? 'Search: "$_searchQuery"' : null,
    );
    if (path != null) {
      final fileName = path.split(Platform.pathSeparator).last;
      _showToast('Word document saved to Downloads: $fileName');
    } else {
      _showToast('No records to export.');
    }
  }

  /// <summary>
  /// Exports members belonging to a specific organizational category tier using in-app preview.
  /// </summary>
  Future<void> _exportSpecificCategory(Map<String, dynamic> cat) async {
    final catId = cat['id']?.toString() ?? '';
    final catName = cat['name']?.toString() ?? 'Category';
    final categoryMembers = _allUsers.where((u) => u['bcpUserCategoryId']?.toString() == catId).toList();
    final org = widget.workspace?.organizationName ?? 'Business Command Center';

    await ExportService.showInAppPdfPreview(
      context: context,
      title: 'Member Register - $catName',
      organizationName: org,
      columns: _getExportColumns(),
      data: categoryMembers,
      filterSummary: 'Category: $catName (${categoryMembers.length} members)',
    );
  }

  /// <summary>
  /// Displays a brief snackbar notification.
  /// </summary>
  void _showToast(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return CentralAdjuster.pageShell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Standardized Page Header with Actions
          _buildPageHeader(isDark),
          const SizedBox(height: 20),

          // 2. Filter & Export Action Card
          _buildFilterExportCard(isDark),
          const SizedBox(height: 20),

          // 3. Responsive Enterprise Data Table
          _buildDataTable(isDark),
        ],
      ),
    );
  }

  // =========================================================================
  // 1. STANDARDIZED PAGE HEADER
  // =========================================================================

  /// <summary>
  /// Builds the Member Directory header using the shared [PageHeader] mold so
  /// it adapts consistently across wide, medium and compact window widths.
  /// </summary>
  /// <param name="isDark">Unused by the mold (it reads the theme) but kept for call-site parity.</param>
  /// <returns>The standardized page header widget.</returns>
  Widget _buildPageHeader(bool isDark) {
    final canGoBack = widget.onNavigateBack != null || widget.onNavigateToTab != null;

    // Step back one level through history; fall back to the Overview tab when
    // the shell did not supply a history callback.
    void goBack() {
      if (widget.onNavigateBack != null) {
        widget.onNavigateBack!();
      } else if (widget.onNavigateToTab != null) {
        widget.onNavigateToTab!(0);
      }
    }

    return PageHeader(
      icon: Icons.groups_rounded,
      eyebrow: 'User Management & Directory',
      title: 'Member Directory & Register',
      description:
          'Search, filter, paginate, and export official membership rolls across organizational category tiers.',
      back: canGoBack ? PageHeaderBack.previous(goBack, tooltip: 'Back') : PageHeaderBack.none,
      isLoading: _isLoading,
      primaryAction: PageHeaderAction(
        label: 'Add Member',
        icon: Icons.person_add_rounded,
        style: PageHeaderActionStyle.primary,
        onPressed: _navigateToCreateMember,
      ),
    );
  }

  // =========================================================================
  // 2. FILTER & EXPORT ACTION CARD
  // =========================================================================

  Widget _buildFilterExportCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 3,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Filter Controls Grid
          LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth > 900;
              return Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // 1. Search Box
                  Expanded(
                    flex: isWide ? 3 : 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFilterLabel('SEARCH MEMBERS'),
                        const SizedBox(height: 6),
                        SizedBox(
                          height: 40,
                          child: TextField(
                            controller: _searchController,
                            onChanged: (val) {
                              _searchQuery = val.trim();
                              _applyFilters();
                            },
                            style: const TextStyle(fontSize: 13),
                            decoration: InputDecoration(
                              hintText: 'Search by name, email, ID, or category...',
                              hintStyle: TextStyle(fontSize: 12.5, color: isDark ? AppColors.gray400 : AppColors.gray500),
                              prefixIcon: const Icon(Icons.search_rounded, size: 18),
                              suffixIcon: _searchController.text.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(Icons.close_rounded, size: 16),
                                      onPressed: () {
                                        _searchController.clear();
                                        _searchQuery = '';
                                        _applyFilters();
                                      },
                                    )
                                  : null,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight, width: 1),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight, width: 1),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),

                  // 2. Category Tier Dropdown
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFilterLabel('CATEGORY TIER'),
                        const SizedBox(height: 6),
                        _buildDropdownField<String>(
                          value: _selectedCategoryFilter,
                          items: [
                            const DropdownMenuItem(value: '', child: Text('All Categories')),
                            ..._categories.map((c) => DropdownMenuItem(
                                  value: c['id']?.toString() ?? '',
                                  child: Text(c['name']?.toString() ?? 'Category'),
                                )),
                          ],
                          onChanged: (val) {
                            setState(() => _selectedCategoryFilter = val ?? '');
                            _applyFilters();
                          },
                          isDark: isDark,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),

                  // 3. Assigned Role Dropdown
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFilterLabel('ASSIGNED ROLE'),
                        const SizedBox(height: 6),
                        _buildDropdownField<String>(
                          value: _selectedRoleFilter,
                          items: const [
                            DropdownMenuItem(value: 'All', child: Text('All Roles')),
                            DropdownMenuItem(value: 'Admin', child: Text('Admin')),
                            DropdownMenuItem(value: 'Global Editor', child: Text('Global Editor')),
                            DropdownMenuItem(value: 'Feature Editor', child: Text('Feature Editor')),
                            DropdownMenuItem(value: 'Read Only', child: Text('Read Only')),
                            DropdownMenuItem(value: 'Member', child: Text('Member')),
                          ],
                          onChanged: (val) {
                            setState(() => _selectedRoleFilter = val ?? 'All');
                            _applyFilters();
                          },
                          isDark: isDark,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),

                  // 4. Account Status Dropdown
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFilterLabel('ACCOUNT STATUS'),
                        const SizedBox(height: 6),
                        _buildDropdownField<String>(
                          value: _selectedStatusFilter,
                          items: const [
                            DropdownMenuItem(value: 'All', child: Text('All Statuses')),
                            DropdownMenuItem(value: 'Active', child: Text('Active')),
                            DropdownMenuItem(value: 'Suspended', child: Text('Suspended')),
                            DropdownMenuItem(value: 'Suspicious', child: Text('Suspicious / Flagged')),
                          ],
                          onChanged: (val) {
                            setState(() => _selectedStatusFilter = val ?? 'All');
                            _applyFilters();
                          },
                          isDark: isDark,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),

                  // 5. Reset Button
                  SizedBox(
                    height: 40,
                    child: OutlinedButton.icon(
                      onPressed: _resetFilters,
                      icon: const Icon(Icons.restart_alt_rounded, size: 16),
                      label: const Text('Reset'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                        foregroundColor: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 16),

          Divider(
            height: 24,
            thickness: 1,
            color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
          ),
          const SizedBox(height: 14),

          // Export Row & Counter
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Count Summary
              RichText(
                text: TextSpan(
                  style: TextStyle(fontSize: 13, color: isDark ? AppColors.gray400 : AppColors.gray600),
                  children: [
                    const TextSpan(text: 'Showing '),
                    TextSpan(
                      text: '${_paginatedUsers.length}',
                      style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black),
                    ),
                    const TextSpan(text: ' of '),
                    TextSpan(
                      text: '${_filteredUsers.length}',
                      style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black),
                    ),
                    const TextSpan(text: ' filtered members (Total: '),
                    TextSpan(
                      text: '${_allUsers.length}',
                      style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black),
                    ),
                    const TextSpan(text: ')'),
                  ],
                ),
              ),

              // Export Buttons (PDF, Excel, Word, Category Export Menu)
              Row(
                children: [
                  _buildExportButton(
                    icon: Icons.picture_as_pdf_outlined,
                    label: 'PDF',
                    onTap: _exportPdf,
                    isDark: isDark,
                  ),
                  const SizedBox(width: 8),
                  _buildExportButton(
                    icon: Icons.table_view_outlined,
                    label: 'Excel',
                    onTap: _exportExcel,
                    isDark: isDark,
                  ),
                  const SizedBox(width: 8),
                  _buildExportButton(
                    icon: Icons.description_outlined,
                    label: 'Word',
                    onTap: _exportWord,
                    isDark: isDark,
                  ),
                  const SizedBox(width: 8),

                  // Category Export Menu
                  PopupMenuButton<Map<String, dynamic>>(
                    tooltip: 'Export Specific Category',
                    onSelected: _exportSpecificCategory,
                    itemBuilder: (context) {
                      if (_categories.isEmpty) {
                        return [
                          const PopupMenuItem(
                            enabled: false,
                            child: Text('No categories created', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          )
                        ];
                      }
                      return _categories.map((cat) {
                        return PopupMenuItem<Map<String, dynamic>>(
                          value: cat,
                          child: Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: Color(int.tryParse(
                                          (cat['colorCode'] ?? '#0050e5').replaceAll('#', '0xFF')) ??
                                      0xFF0050E5),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(cat['name']?.toString() ?? 'Category', style: const TextStyle(fontSize: 12.5)),
                            ],
                          ),
                        );
                      }).toList();
                    },
                    child: Container(
                      height: 32,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(7),
                        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.category_outlined, size: 15, color: isDark ? Colors.white70 : Colors.black87),
                          const SizedBox(width: 6),
                          Text(
                            'Export Category',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isDark ? Colors.white70 : Colors.black87,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.expand_more_rounded, size: 16),
                        ],
                      ),
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

  Widget _buildFilterLabel(String label) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.05,
        color: Color(0xFF64748B),
      ),
    );
  }

  Widget _buildDropdownField<T>({
    required T value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
    required bool isDark,
  }) {
    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          items: items,
          onChanged: onChanged,
          isExpanded: true,
          style: TextStyle(
            fontSize: 13,
            color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
          ),
          icon: const Icon(Icons.arrow_drop_down_rounded, size: 20),
        ),
      ),
    );
  }

  Widget _buildExportButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(7),
      child: Container(
        height: 32,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(7),
          border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
        ),
        child: Row(
          children: [
            Icon(icon, size: 15, color: isDark ? Colors.white70 : Colors.black87),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white70 : Colors.black87,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// <summary>
  /// Navigates to the full-page 360-degree Member Command Center view.
  /// </summary>
  void _navigateToMemberDetails(Map<String, dynamic> member) {
    if (widget.onNavigateToMemberDetails != null) {
      widget.onNavigateToMemberDetails!(member);
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => Scaffold(
            body: UserDetailsView(
              workspace: widget.workspace,
              member: member,
              onNavigateBack: () => Navigator.of(context).pop(),
              onNavigateToEdit: (m) => _navigateToMemberEdit(m),
            ),
          ),
        ),
      );
    }
  }

  /// <summary>
  /// Navigates to the full-page member profile edit view.
  /// </summary>
  void _navigateToMemberEdit(Map<String, dynamic> member) {
    if (widget.onNavigateToMemberEdit != null) {
      widget.onNavigateToMemberEdit!(member);
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => Scaffold(
            body: UserEditView(
              workspace: widget.workspace,
              member: member,
              onNavigateBack: () => Navigator.of(context).pop(),
              onUserUpdated: () {
                Navigator.of(context).pop();
                _loadData();
              },
            ),
          ),
        ),
      );
    }
  }

  /// <summary>
  /// Compact square icon-only action button used in the table on narrow windows.
  /// </summary>
  /// <param name="icon">Icon to display.</param>
  /// <param name="tooltip">Accessible tooltip label.</param>
  /// <param name="onTap">Tap handler.</param>
  /// <param name="isDark">Whether dark mode is active.</param>
  /// <param name="isPrimary">Use Royal Blue tinted styling when true.</param>
  /// <returns>The icon action widget.</returns>
  Widget _buildIconAction({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
    required bool isDark,
    required bool isPrimary,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isPrimary ? AppColors.primary.withValues(alpha: 0.1) : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
            border: isPrimary
                ? null
                : Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
          ),
          child: Icon(
            icon,
            size: 15,
            color: isPrimary
                ? AppColors.primary
                : (isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight),
          ),
        ),
      ),
    );
  }

  // =========================================================================
  // 3. ENTERPRISE DATA TABLE WITH SORTING & PAGINATION
  // =========================================================================

  /// <summary>
  /// Builds the responsive member data table. Resolves a [_MemberTableLayout] tier from
  /// the available width so narrow desktop windows hide low-priority columns and truncate
  /// long text instead of producing RenderFlex overflow stripes.
  /// </summary>
  /// <param name="isDark">Whether dark mode is active.</param>
  /// <returns>The adaptive table card widget.</returns>
  Widget _buildDataTable(bool isDark) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final layout = _MemberTableLayout.forWidth(constraints.maxWidth);
        return _buildDataTableForLayout(isDark, layout);
      },
    );
  }

  /// <summary>
  /// Renders the table card for a resolved responsive [layout] tier.
  /// </summary>
  /// <param name="isDark">Whether dark mode is active.</param>
  /// <param name="layout">Responsive column visibility and width caps.</param>
  /// <returns>The table container widget.</returns>
  Widget _buildDataTableForLayout(bool isDark, _MemberTableLayout layout) {
    return CentralAdjuster.tableContainer(
      // Estimated natural width of the visible columns; the container only scrolls
      // horizontally if the window is genuinely narrower than this.
      minWidth: layout.estimatedWidth,
      numColumns: layout.columnCount,
      footer: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Empty state if no records
          if (_paginatedUsers.isEmpty && !_isLoading)
            _buildEmptyState(isDark),

          // Built-In Pagination Toolbar
          if (_filteredUsers.isNotEmpty)
            _buildPaginationToolbar(isDark),
        ],
      ),
      builder: (context, tableWidth, extraSpacing) {
        return DataTable(
          headingRowHeight: 44,
          dataRowMinHeight: 64,
          dataRowMaxHeight: 68,
          horizontalMargin: 12,
          columnSpacing: 12.0 + (extraSpacing * 0.45),
          dividerThickness: 1.0,
          border: TableBorder(
            top: BorderSide.none,
            bottom: BorderSide(
              color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
              width: 1.0,
            ),
            horizontalInside: BorderSide(
              color: isDark ? AppColors.outlineDark : const Color(0xFFF1F5F9),
              width: 1.0,
            ),
          ),
          headingRowColor: WidgetStateProperty.all(
            isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
          ),
          columns: [
            _buildSortableColumn('fullName', 'MEMBER NAME'),
            _buildSortableColumn('email', 'EMAIL ADDRESS'),
            if (layout.showMemberId) _buildSortableColumn('memberId', 'MEMBER ID'),
            _buildSortableColumn('categoryName', 'CATEGORY'),
            if (layout.showRole) _buildSortableColumn('roles', 'ROLE'),
            _buildSortableColumn('userStatus', 'STATUS'),
            const DataColumn(
              label: Text(
                'ACTIONS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.05,
                  color: Color(0xFF475569),
                ),
              ),
            ),
          ],
          rows: _paginatedUsers.isEmpty
              ? []
              : _paginatedUsers.map((u) {
                  return _buildDataRow(u, isDark, layout);
                }).toList(),
        );
      },
    );
  }

  DataColumn _buildSortableColumn(String key, String title) {
    final isSelected = _sortColumn == key;
    return DataColumn(
      onSort: (columnIndex, ascending) => _sortBy(key),
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.05,
              color: Color(0xFF475569),
            ),
          ),
          const SizedBox(width: 4),
          Icon(
            isSelected
                ? (_sortAsc ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded)
                : Icons.unfold_more_rounded,
            size: 15,
            color: isSelected ? AppColors.primary : const Color(0xFF94A3B8),
          ),
        ],
      ),
    );
  }

  /// <summary>
  /// Builds a single member row honoring the responsive [layout] tier.
  /// </summary>
  /// <param name="u">Member record.</param>
  /// <param name="isDark">Whether dark mode is active.</param>
  /// <param name="layout">Responsive column visibility and width caps.</param>
  /// <returns>The populated [DataRow].</returns>
  DataRow _buildDataRow(Map<String, dynamic> u, bool isDark, _MemberTableLayout layout) {
    final fullName = (u['fullName'] ?? u['userName'] ?? 'Member').toString();
    final designation = u['designation']?.toString();
    final email = (u['email'] ?? '').toString();
    final emailConfirmed = u['emailConfirmed'] == true;
    final phoneNumber = u['phoneNumber']?.toString();
    final phoneNumberConfirmed = u['phoneNumberConfirmed'] == true;
    final memberId = _sanitizeId(u['memberId']?.toString());
    final categoryName = u['categoryName']?.toString();
    final categoryColorStr = u['categoryColor']?.toString() ?? '#0050e5';
    final categoryIconStr = u['categoryIcon']?.toString();
    final roles = (u['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
    final userStatus = (u['userStatus'] ?? u['status'] ?? 'Active').toString();
    final isSuspended = userStatus.toLowerCase() == 'suspended' || userStatus.toLowerCase() == 'locked';

    final categoryColor = Color(int.tryParse(categoryColorStr.replaceAll('#', '0xFF')) ?? 0xFF0050E5);

    return DataRow(
      color: isSuspended
          ? WidgetStateProperty.all(const Color(0xFFFFF5F5))
          : null,
      cells: [
        // 1. Member Name with Avatar initials & Designation
        DataCell(
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  gradient: _getGradient(fullName),
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: Text(
                  _getInitials(fullName),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
                ),
              ),
              const SizedBox(width: 12),
              // Cap name width so long names ellipsize rather than overflow the cell
              ConstrainedBox(
                constraints: BoxConstraints(maxWidth: layout.nameMax),
                child: Tooltip(
                  message: fullName,
                  waitDuration: const Duration(milliseconds: 600),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        fullName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        ),
                      ),
                      if (designation != null && designation.isNotEmpty)
                        Text(
                          designation,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // 2. Email Address & Verified Badge + Phone
        DataCell(
          ConstrainedBox(
            // Cap email width; long addresses ellipsize with full value in tooltip
            constraints: BoxConstraints(maxWidth: layout.emailMax),
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Flexible(
                    child: Tooltip(
                      message: email,
                      waitDuration: const Duration(milliseconds: 600),
                      child: Text(
                        email,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12.5,
                          color: isDark ? AppColors.onSurfaceDark : const Color(0xFF1E293B),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    emailConfirmed ? Icons.verified_rounded : Icons.mark_email_unread_outlined,
                    size: 14,
                    color: emailConfirmed ? const Color(0xFF16A34A) : const Color(0xFFF59E0B),
                  ),
                ],
              ),
              if (phoneNumber != null && phoneNumber.isNotEmpty)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      phoneNumber,
                      style: TextStyle(fontSize: 11.5, color: isDark ? AppColors.gray400 : AppColors.gray600),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      phoneNumberConfirmed ? Icons.sms_outlined : Icons.phone_missed_outlined,
                      size: 13,
                      color: phoneNumberConfirmed ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
                    ),
                  ],
                ),
            ],
          ),
          ),
        ),

        // 3. Member ID (hidden on narrow windows)
        if (layout.showMemberId)
        DataCell(
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
            ),
            child: Text(
              memberId,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.3,
                color: isDark ? Colors.white70 : const Color(0xFF334155),
              ),
            ),
          ),
        ),

        // 4. Category Tier
        DataCell(
          categoryName != null && categoryName.isNotEmpty
              ? Container(
                  // Cap category pill width so long tier names ellipsize
                  constraints: BoxConstraints(maxWidth: layout.categoryMax),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                  decoration: BoxDecoration(
                    color: categoryColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: categoryColor.withValues(alpha: 0.35)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        categoryIconStr != null ? Icons.folder_shared_outlined : Icons.category_outlined,
                        size: 13,
                        color: categoryColor,
                      ),
                      const SizedBox(width: 5),
                      Flexible(
                        child: Tooltip(
                          message: categoryName,
                          waitDuration: const Duration(milliseconds: 600),
                          child: Text(
                            categoryName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: categoryColor,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              : Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text('Unassigned', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                ),
        ),

        // 5. Role (hidden on narrow windows)
        if (layout.showRole)
        DataCell(
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: roles.contains('Admin') ? const Color(0xFFEFF6FF) : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC)),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: roles.contains('Admin') ? AppColors.primary.withValues(alpha: 0.3) : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
              ),
            ),
            child: Text(
              roles.isNotEmpty ? roles.join(', ') : 'Member',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: roles.contains('Admin') ? AppColors.primary : (isDark ? AppColors.onSurfaceDark : const Color(0xFF475569)),
              ),
            ),
          ),
        ),

        // 6. Status with live dot (Active, Suspended, or Flagged)
        DataCell(
          Builder(
            builder: (context) {
              final isSuspiciousAccount = (u['isSuspicious'] == true) ||
                  (u['isLockedOut'] == true) ||
                  (((u['accessFailedCount'] as num?)?.toInt() ?? 0) > 0);
              final Color badgeColor;
              final String displayStatus;

              if (isSuspended) {
                badgeColor = const Color(0xFFEF4444);
                displayStatus = 'Suspended';
              } else if (isSuspiciousAccount) {
                badgeColor = const Color(0xFFE11D48);
                displayStatus = 'Flagged';
              } else {
                badgeColor = const Color(0xFF10B981);
                displayStatus = userStatus;
              }

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                decoration: BoxDecoration(
                  color: badgeColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: badgeColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      displayStatus,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: badgeColor,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),

        // 7. Actions (Details & Edit buttons)
        DataCell(
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (layout.iconOnlyActions) ...[
                // Compact icon-only actions with tooltips for narrow windows
                _buildIconAction(
                  icon: Icons.visibility_outlined,
                  tooltip: 'Details',
                  onTap: () => _navigateToMemberDetails(u),
                  isDark: isDark,
                  isPrimary: false,
                ),
                const SizedBox(width: 6),
                _buildIconAction(
                  icon: Icons.edit_outlined,
                  tooltip: 'Edit',
                  onTap: () => _navigateToMemberEdit(u),
                  isDark: isDark,
                  isPrimary: true,
                ),
              ] else ...[
              // Details Button
              OutlinedButton.icon(
                onPressed: () => _navigateToMemberDetails(u),
                icon: const Icon(Icons.visibility_outlined, size: 14),
                label: const Text('Details'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                  foregroundColor: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                  textStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(width: 6),

              // Edit Button
              ElevatedButton.icon(
                onPressed: () => _navigateToMemberEdit(u),
                icon: const Icon(Icons.edit_outlined, size: 14, color: AppColors.primary),
                label: const Text('Edit', style: TextStyle(color: AppColors.primary)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  textStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
                ),
              ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      child: Column(
        children: [
          Icon(Icons.person_search_rounded, size: 48, color: isDark ? AppColors.gray400 : AppColors.gray500),
          const SizedBox(height: 12),
          Text(
            'No members found matching your search or filters.',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            ),
          ),
          const SizedBox(height: 14),
          OutlinedButton(
            onPressed: _resetFilters,
            child: const Text('Clear Filters'),
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // 4. PAGINATION FOOTER TOOLBAR
  // =========================================================================

  Widget _buildPaginationToolbar(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Entries per page selector
          Row(
            children: [
              Text('Show ', style: TextStyle(fontSize: 12.5, color: isDark ? AppColors.gray400 : AppColors.gray600)),
              Container(
                height: 32,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : Colors.white,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<int>(
                    value: _pageSize,
                    items: const [
                      DropdownMenuItem(value: 10, child: Text('10')),
                      DropdownMenuItem(value: 25, child: Text('25')),
                      DropdownMenuItem(value: 50, child: Text('50')),
                      DropdownMenuItem(value: 100, child: Text('100')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _pageSize = val;
                          _currentPage = 1;
                          _updatePagination();
                        });
                      }
                    },
                    style: TextStyle(fontSize: 12.5, color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight),
                  ),
                ),
              ),
              Text(' entries per page', style: TextStyle(fontSize: 12.5, color: isDark ? AppColors.gray400 : AppColors.gray600)),
            ],
          ),

          // Page navigation controls (< [1] [2] >)
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left_rounded, size: 20),
                onPressed: _currentPage > 1 ? () => _setPage(_currentPage - 1) : null,
              ),
              for (int p = 1; p <= _totalPages; p++)
                if (p == 1 || p == _totalPages || (p >= _currentPage - 1 && p <= _currentPage + 1))
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: InkWell(
                      onTap: () => _setPage(p),
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        width: 32,
                        height: 32,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: p == _currentPage ? AppColors.primary : Colors.transparent,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: p == _currentPage
                                ? AppColors.primary
                                : (isDark ? AppColors.outlineDark : AppColors.outlineLight),
                          ),
                        ),
                        child: Text(
                          '$p',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: p == _currentPage
                                ? Colors.white
                                : (isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight),
                          ),
                        ),
                      ),
                    ),
                  ),
              IconButton(
                icon: const Icon(Icons.chevron_right_rounded, size: 20),
                onPressed: _currentPage < _totalPages ? () => _setPage(_currentPage + 1) : null,
              ),
            ],
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // 5. INTERACTIVE MODALS (ADD MEMBER, EDIT MEMBER, 360° DOSSIER)
  // =========================================================================

  /// <summary>
  /// Navigates to the dedicated full-page Create Member view (matching Angular web route /users/console/create).
  /// </summary>
  void _navigateToCreateMember() {
    if (widget.onNavigateToTab != null) {
      widget.onNavigateToTab!(16);
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => UserCreateView(
            workspace: widget.workspace,
            onNavigateBack: () => Navigator.of(context).pop(),
            onUserCreated: () {
              Navigator.of(context).pop();
              _loadData();
            },
          ),
        ),
      );
    }
  }

}

/// <summary>
/// Responsive column layout tier for the member directory table.
/// Hides low-priority columns, caps long text widths, and switches actions to
/// icon-only buttons as the available table width shrinks on small desktop windows.
/// </summary>
class _MemberTableLayout {
  /// Whether the MEMBER ID column is shown.
  final bool showMemberId;

  /// Whether the ROLE column is shown.
  final bool showRole;

  /// Whether Details/Edit render as compact icon-only buttons.
  final bool iconOnlyActions;

  /// Maximum width of the name/designation text block.
  final double nameMax;

  /// Maximum width of the email/phone text block.
  final double emailMax;

  /// Maximum width of the category pill.
  final double categoryMax;

  const _MemberTableLayout({
    required this.showMemberId,
    required this.showRole,
    required this.iconOnlyActions,
    required this.nameMax,
    required this.emailMax,
    required this.categoryMax,
  });

  /// <summary>
  /// Resolves the layout tier for the given available table width.
  /// </summary>
  /// <param name="width">Available width of the table card.</param>
  /// <returns>The matching responsive layout tier.</returns>
  factory _MemberTableLayout.forWidth(double width) {
    final isWide = width >= 1150;
    return _MemberTableLayout(
      showMemberId: width >= 1000,
      showRole: width >= 880,
      iconOnlyActions: width < 1100,
      nameMax: isWide ? 220 : 160,
      emailMax: isWide ? 240 : 180,
      categoryMax: isWide ? 190 : 140,
    );
  }

  /// Number of visible columns.
  int get columnCount => 5 + (showMemberId ? 1 : 0) + (showRole ? 1 : 0);

  /// <summary>
  /// Conservative estimate of the table natural width for the visible columns
  /// (margins + capped content widths + base column gaps). Used as the scroll threshold.
  /// </summary>
  double get estimatedWidth {
    double w = 24; // horizontal margins (12 * 2)
    w += 52 + nameMax; // avatar (40) + gap (12) + name block
    w += emailMax + 20; // email block + verified icon
    if (showMemberId) w += 110;
    w += categoryMax;
    if (showRole) w += 90;
    w += 95; // status pill
    w += iconOnlyActions ? 72 : 170; // actions
    w += (columnCount - 1) * 12; // base column spacing
    return w;
  }
}
