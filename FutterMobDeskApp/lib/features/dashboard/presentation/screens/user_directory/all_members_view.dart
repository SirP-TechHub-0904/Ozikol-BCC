import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/services/export_service.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/central_adjuster.dart';
import '../../../data/account_repository.dart';
import 'user_create_view.dart';

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

  /// Creates an [AllMembersView] instance.
  const AllMembersView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
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
    _loadData();
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

    // 4. Account Status filter
    if (_selectedStatusFilter != 'All') {
      list = list.where((u) {
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
    await ExportService.printReport(
      title: 'Official Member Directory Register',
      organizationName: org,
      columns: _getExportColumns(),
      data: _filteredUsers,
      filterSummary: filterSum,
    );
    _showToast('Printable PDF report opened in browser.');
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
    _showToast(path != null ? 'Spreadsheet exported successfully!' : 'No records to export.');
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
    _showToast(path != null ? 'Word document exported successfully!' : 'No records to export.');
  }

  /// <summary>
  /// Exports members belonging to a specific organizational category tier.
  /// </summary>
  Future<void> _exportSpecificCategory(Map<String, dynamic> cat) async {
    final catId = cat['id']?.toString() ?? '';
    final catName = cat['name']?.toString() ?? 'Category';
    final categoryMembers = _allUsers.where((u) => u['bcpUserCategoryId']?.toString() == catId).toList();
    final org = widget.workspace?.organizationName ?? 'Business Command Center';

    await ExportService.printReport(
      title: 'Member Register - $catName',
      organizationName: org,
      columns: _getExportColumns(),
      data: categoryMembers,
      filterSummary: 'Category: $catName (${categoryMembers.length} members)',
    );
    _showToast('Export report for category "$catName" generated.');
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

  Widget _buildPageHeader(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Header Icon Box
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.groups_rounded, size: 26, color: AppColors.primary),
                ),
                const SizedBox(width: 16),

                // Title & Eyebrow
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'USER MANAGEMENT & DIRECTORY',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.08,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Member Directory & Register',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Search, filter, paginate, and export official membership rolls across organizational category tiers.',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: isDark ? AppColors.gray400 : AppColors.gray600,
                        ),
                      ),
                    ],
                  ),
                ),

                // Action Buttons Group (Registration Form Builder + Add Member)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () {
                        if (widget.onNavigateToTab != null) {
                          widget.onNavigateToTab!(3); // Registration Form Builder tab index
                        } else {
                          _showToast('Registration Form Builder available in sidebar.');
                        }
                      },
                      icon: const Icon(Icons.dynamic_form_outlined, size: 16),
                      label: const Text('Registration Form Builder'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                        foregroundColor: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton.icon(
                      onPressed: _navigateToCreateMember,
                      icon: const Icon(Icons.person_add_rounded, size: 16, color: Colors.white),
                      label: const Text('Add Member', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (_isLoading)
            const LinearProgressIndicator(minHeight: 2.5),
        ],
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
                                borderSide: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
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

          const Divider(height: 1),
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

  // =========================================================================
  // 3. ENTERPRISE DATA TABLE WITH SORTING & PAGINATION
  // =========================================================================

  Widget _buildDataTable(bool isDark) {
    return Container(
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
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Table Scroll View
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 1040),
              child: DataTable(
                headingRowHeight: 44,
                dataRowMinHeight: 64,
                dataRowMaxHeight: 68,
                horizontalMargin: 16,
                columnSpacing: 20,
                headingRowColor: WidgetStateProperty.all(
                  isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                ),
                columns: [
                  _buildSortableColumn('fullName', 'MEMBER NAME'),
                  _buildSortableColumn('email', 'EMAIL ADDRESS'),
                  _buildSortableColumn('memberId', 'MEMBER ID'),
                  _buildSortableColumn('categoryName', 'CATEGORY'),
                  _buildSortableColumn('roles', 'ROLE'),
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
                        return _buildDataRow(u, isDark);
                      }).toList(),
              ),
            ),
          ),

          // Empty state if no records
          if (_paginatedUsers.isEmpty && !_isLoading)
            _buildEmptyState(isDark),

          // Built-In Pagination Toolbar
          if (_filteredUsers.isNotEmpty)
            _buildPaginationToolbar(isDark),
        ],
      ),
    );
  }

  DataColumn _buildSortableColumn(String key, String title) {
    final isSelected = _sortColumn == key;
    return DataColumn(
      onSort: (columnIndex, ascending) => _sortBy(key),
      label: InkWell(
        onTap: () => _sortBy(key),
        child: Row(
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
      ),
    );
  }

  DataRow _buildDataRow(Map<String, dynamic> u, bool isDark) {
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
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    fullName,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  if (designation != null && designation.isNotEmpty)
                    Text(
                      designation,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),

        // 2. Email Address & Verified Badge + Phone
        DataCell(
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    email,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: isDark ? AppColors.onSurfaceDark : const Color(0xFF1E293B),
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

        // 3. Member ID
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
                      Text(
                        categoryName,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: categoryColor,
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

        // 5. Role
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

        // 6. Status with live dot
        DataCell(
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
            decoration: BoxDecoration(
              color: (isSuspended ? const Color(0xFFEF4444) : const Color(0xFF10B981)).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(100),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: isSuspended ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  userStatus,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isSuspended ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                  ),
                ),
              ],
            ),
          ),
        ),

        // 7. Actions (Details & Edit buttons)
        DataCell(
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Details Button
              OutlinedButton.icon(
                onPressed: () => _showMemberDossierDialog(u),
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
                onPressed: () => _showEditMemberDialog(u),
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
        border: Border(top: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight)),
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
  /// Navigates to the dedicated full-page User Provisioning view (matching Angular web route /users/console/create).
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

  /// <summary>
  /// Displays the Edit Member Profile dialog.
  /// </summary>
  void _showEditMemberDialog(Map<String, dynamic> member) {
    final userId = member['id']?.toString() ?? '';
    final fullName = (member['fullName'] ?? '').toString();
    final nameParts = fullName.split(' ');
    final firstNameCtrl = TextEditingController(text: member['firstName']?.toString() ?? (nameParts.isNotEmpty ? nameParts.first : ''));
    final lastNameCtrl = TextEditingController(text: member['lastName']?.toString() ?? (nameParts.length > 1 ? nameParts.sublist(1).join(' ') : ''));
    final phoneCtrl = TextEditingController(text: member['phoneNumber']?.toString() ?? '');
    final designationCtrl = TextEditingController(text: member['designation']?.toString() ?? 'Member');

    String selectedTitle = member['title']?.toString() ?? 'Mr.';
    String? selectedCategoryId = member['bcpUserCategoryId']?.toString();
    final existingRoles = (member['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
    String selectedRole = existingRoles.contains('Admin')
        ? 'Admin'
        : (existingRoles.contains('Global Editor')
            ? 'Global Editor'
            : (existingRoles.contains('Feature Editor')
                ? 'Feature Editor'
                : (existingRoles.contains('Read Only') ? 'Read Only' : 'Member')));
    bool isSaving = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (context, setModalState) {
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
                    child: const Icon(Icons.edit_outlined, size: 20, color: AppColors.primary),
                  ),
                  const SizedBox(width: 12),
                  const Text('Edit Member Profile', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                ],
              ),
              content: SizedBox(
                width: 500,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          SizedBox(
                            width: 80,
                            child: DropdownButtonFormField<String>(
                              initialValue: selectedTitle,
                              decoration: const InputDecoration(labelText: 'Title', contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8)),
                              items: const [
                                DropdownMenuItem(value: 'Mr.', child: Text('Mr.')),
                                DropdownMenuItem(value: 'Mrs.', child: Text('Mrs.')),
                                DropdownMenuItem(value: 'Ms.', child: Text('Ms.')),
                                DropdownMenuItem(value: 'Dr.', child: Text('Dr.')),
                                DropdownMenuItem(value: 'Engr.', child: Text('Engr.')),
                                DropdownMenuItem(value: 'Prof.', child: Text('Prof.')),
                              ],
                              onChanged: (val) => setModalState(() => selectedTitle = val ?? 'Mr.'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: firstNameCtrl,
                              decoration: const InputDecoration(labelText: 'First Name *', hintText: 'e.g. First Name'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: lastNameCtrl,
                              decoration: const InputDecoration(labelText: 'Last Name *', hintText: 'e.g. Last Name'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      TextField(
                        controller: phoneCtrl,
                        decoration: const InputDecoration(labelText: 'Phone Number', hintText: 'e.g. +0 (000) 000-0000'),
                      ),
                      const SizedBox(height: 14),

                      TextField(
                        controller: designationCtrl,
                        decoration: const InputDecoration(labelText: 'Designation / Title', hintText: 'e.g. Lead Developer'),
                      ),
                      const SizedBox(height: 14),

                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: selectedCategoryId,
                              decoration: const InputDecoration(labelText: 'Category Tier'),
                              items: [
                                const DropdownMenuItem(value: null, child: Text('Unassigned')),
                                ..._categories.map((c) => DropdownMenuItem(
                                      value: c['id']?.toString(),
                                      child: Text(c['name']?.toString() ?? 'Category'),
                                    )),
                              ],
                              onChanged: (val) => setModalState(() => selectedCategoryId = val),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: selectedRole,
                              decoration: const InputDecoration(labelText: 'Assigned Role'),
                              items: const [
                                DropdownMenuItem(value: 'Member', child: Text('Member')),
                                DropdownMenuItem(value: 'Read Only', child: Text('Read Only')),
                                DropdownMenuItem(value: 'Feature Editor', child: Text('Feature Editor')),
                                DropdownMenuItem(value: 'Global Editor', child: Text('Global Editor')),
                                DropdownMenuItem(value: 'Admin', child: Text('Admin')),
                              ],
                              onChanged: (val) => setModalState(() => selectedRole = val ?? 'Member'),
                            ),
                          ),
                        ],
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
                ElevatedButton(
                  onPressed: isSaving
                      ? null
                      : () async {
                          setModalState(() => isSaving = true);
                          final repo = ref.read(accountRepositoryProvider);
                          final success = await repo.updateUserProfile(userId, {
                            'firstName': firstNameCtrl.text.trim(),
                            'lastName': lastNameCtrl.text.trim(),
                            'title': selectedTitle,
                            'phoneNumber': phoneCtrl.text.trim().isNotEmpty ? phoneCtrl.text.trim() : null,
                            'designation': designationCtrl.text.trim(),
                            'bcpUserCategoryId': selectedCategoryId,
                            'role': selectedRole,
                          });

                          if (ctx.mounted) Navigator.of(ctx).pop();
                          if (success) {
                            _showToast('Profile updated successfully.');
                            _loadData();
                          } else {
                            _showToast('Failed to update profile.');
                          }
                        },
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                  child: isSaving
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Save Changes', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  /// <summary>
  /// Displays the comprehensive 360-degree Member Dossier with OTP generation, status toggles, and security actions.
  /// </summary>
  Future<void> _showMemberDossierDialog(Map<String, dynamic> member) async {
    final userId = member['id']?.toString() ?? '';
    final fullName = (member['fullName'] ?? member['userName'] ?? 'Member').toString();
    final repo = ref.read(accountRepositoryProvider);

    // Fetch full 360 dossier from backend
    final dossier = await repo.getUserDossier(userId);
    final data = dossier.isNotEmpty ? dossier : member;

    if (!mounted) return;

    String? activeOtp;
    bool isGeneratingOtp = false;
    final directPassCtrl = TextEditingController();
    bool sendEmailOnReset = true;
    bool isResettingPass = false;
    String userStatus = (data['userStatus'] ?? member['userStatus'] ?? 'Active').toString();
    bool isActive = userStatus.toLowerCase() == 'active';

    showDialog(
      context: context,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              contentPadding: const EdgeInsets.all(24),
              content: SizedBox(
                width: 680,
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Header with Avatar & Details
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              gradient: _getGradient(fullName),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              _getInitials(fullName),
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        fullName,
                                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: (isActive ? const Color(0xFF10B981) : const Color(0xFFEF4444)).withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(100),
                                      ),
                                      child: Text(
                                        isActive ? 'Active' : 'Suspended',
                                        style: TextStyle(
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w700,
                                          color: isActive ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  data['email']?.toString() ?? '',
                                  style: TextStyle(fontSize: 13, color: isDark ? AppColors.gray400 : AppColors.gray600),
                                ),
                                const SizedBox(height: 6),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  children: [
                                    if (data['categoryName'] != null)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                                        decoration: BoxDecoration(
                                          color: AppColors.primary.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          data['categoryName'].toString(),
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary),
                                        ),
                                      ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        _sanitizeId(data['memberId']?.toString()),
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      const Divider(height: 1),
                      const SizedBox(height: 16),

                      // Information Grid
                      Wrap(
                        spacing: 24,
                        runSpacing: 12,
                        children: [
                          _buildDossierInfoItem('Phone Number', data['phoneNumber']?.toString() ?? 'Not provided', isDark),
                          _buildDossierInfoItem('Designation', data['designation']?.toString() ?? 'Member', isDark),
                          _buildDossierInfoItem('Assigned Roles', ((data['roles'] as List<dynamic>?)?.join(', ') ?? 'Member'), isDark),
                          _buildDossierInfoItem('Registration Source', data['registrationSource']?.toString() ?? 'Admin Console', isDark),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // 6-Digit One-Time Activation Passcode (OTP) Section
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.key_rounded, size: 18, color: AppColors.primary),
                                SizedBox(width: 8),
                                Text(
                                  '6-Digit One-Time Activation Passcode (OTP)',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Generate a secure 6-digit code valid for 15 minutes for member account activation or password recovery.',
                              style: TextStyle(fontSize: 11.5, color: isDark ? AppColors.gray400 : AppColors.gray600),
                            ),
                            const SizedBox(height: 10),
                            if (activeOtp != null) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      activeOtp!,
                                      style: const TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 4,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                    TextButton.icon(
                                      onPressed: () {
                                        Clipboard.setData(ClipboardData(text: activeOtp!));
                                        _showToast('OTP copied to clipboard.');
                                      },
                                      icon: const Icon(Icons.content_copy_rounded, size: 15),
                                      label: const Text('Copy OTP'),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 8),
                            ],
                            ElevatedButton.icon(
                              onPressed: isGeneratingOtp
                                  ? null
                                  : () async {
                                      setModalState(() => isGeneratingOtp = true);
                                      final res = await repo.generateUserOtp(userId);
                                      setModalState(() {
                                        isGeneratingOtp = false;
                                        if (res != null && res['otp'] != null) {
                                          activeOtp = res['otp'].toString();
                                        }
                                      });
                                      _showToast(activeOtp != null
                                          ? '6-Digit OTP generated and queued for delivery.'
                                          : 'Failed to generate OTP.');
                                    },
                              icon: const Icon(Icons.pin_rounded, size: 16),
                              label: Text(isGeneratingOtp ? 'Generating...' : 'Generate 6-Digit Reset OTP'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Direct Temporary Password Setter
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Set Temporary Password Directly (Admin Override)',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: directPassCtrl,
                                    decoration: const InputDecoration(
                                      hintText: 'e.g. TempPass@2026',
                                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton(
                                  onPressed: isResettingPass
                                      ? null
                                      : () async {
                                          final newPass = directPassCtrl.text.trim();
                                          if (newPass.isEmpty) {
                                            _showToast('Please enter a temporary password.');
                                            return;
                                          }
                                          setModalState(() => isResettingPass = true);
                                          final success = await repo.adminResetPassword(
                                            userId,
                                            newPass,
                                            mustChangePassword: true,
                                            sendEmailNotification: sendEmailOnReset,
                                          );
                                          setModalState(() => isResettingPass = false);
                                          if (success) {
                                            directPassCtrl.clear();
                                            _showToast('Temporary password applied.');
                                          } else {
                                            _showToast('Failed to apply password.');
                                          }
                                        },
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                                  child: const Text('Apply', style: TextStyle(color: Colors.white)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Account Status Management (Suspend / Activate)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          OutlinedButton.icon(
                            onPressed: () async {
                              final newActive = !isActive;
                              final success = await repo.toggleUserStatus(userId, newActive);
                              if (success) {
                                setModalState(() {
                                  isActive = newActive;
                                  userStatus = newActive ? 'Active' : 'Suspended';
                                });
                                _loadData();
                                _showToast(newActive ? 'Account reactivated.' : 'Account suspended.');
                              } else {
                                _showToast('Failed to update account status.');
                              }
                            },
                            icon: Icon(
                              isActive ? Icons.block_rounded : Icons.check_circle_outline_rounded,
                              size: 16,
                              color: isActive ? AppColors.error : AppColors.success,
                            ),
                            label: Text(
                              isActive ? 'Suspend Account' : 'Reactivate Account',
                              style: TextStyle(color: isActive ? AppColors.error : AppColors.success),
                            ),
                          ),
                          TextButton(
                            onPressed: () => Navigator.of(ctx).pop(),
                            child: const Text('Close Dossier'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildDossierInfoItem(String label, String value, bool isDark) {
    return SizedBox(
      width: 280,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            ),
          ),
        ],
      ),
    );
  }
}
