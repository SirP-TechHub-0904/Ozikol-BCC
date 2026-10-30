import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';

/// Workspace Security Audit Console (`/identity/console/audit-logs`).
/// 1-to-1 parity with Angular `IdentityAuditLogsComponent`.
class SecurityAuditLogsView extends ConsumerStatefulWidget {
  final Workspace? workspace;
  final VoidCallback? onNavigateToErrorCodes;

  const SecurityAuditLogsView({
    super.key,
    this.workspace,
    this.onNavigateToErrorCodes,
  });

  @override
  ConsumerState<SecurityAuditLogsView> createState() =>
      _SecurityAuditLogsViewState();
}

class _SecurityAuditLogsViewState extends ConsumerState<SecurityAuditLogsView> {
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _tableHorizontalController = ScrollController();

  bool _isLoading = false;
  bool _isDeleting = false;
  String? _deletingId;

  List<Map<String, dynamic>> _logs = [];
  List<String> _modules = [];

  int _page = 1;
  int _pageSize = 25;
  int _totalCount = 0;
  int _totalPages = 1;

  String _searchTerm = '';
  String _selectedModule = 'all';

  final Set<String> _selectedIds = <String>{};

  @override
  void initState() {
    super.initState();
    _loadLogs(1);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _tableHorizontalController.dispose();
    super.dispose();
  }

  Future<void> _loadLogs([int targetPage = 1]) async {
    setState(() {
      _isLoading = true;
      _page = targetPage;
    });

    try {
      final repo = ref.read(accountRepositoryProvider);
      final data = await repo.getSecurityAuditLogs(
        page: _page,
        pageSize: _pageSize,
        search: _searchTerm,
        module: _selectedModule,
      );

      if (!mounted) return;

      final rawItems = (data['items'] as List<dynamic>?) ?? [];
      final allMapped = rawItems
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();

      final filtered = allMapped.where((item) {
        final desc = (item['description'] ?? '').toString().trim();
        if (desc.toLowerCase().contains('[viewcount:') &&
            !desc.contains(', ')) {
          return false;
        }
        return true;
      }).toList();

      final rawModules = (data['modules'] as List<dynamic>?) ?? [];

      setState(() {
        _isLoading = false;
        _logs = filtered;
        final rawTotal =
            (data['totalCount'] as num?)?.toInt() ?? allMapped.length;
        final diff = allMapped.length - filtered.length;
        _totalCount = (rawTotal - diff) < 0 ? 0 : (rawTotal - diff);
        _page = (data['page'] as num?)?.toInt() ?? 1;
        _pageSize = (data['pageSize'] as num?)?.toInt() ?? _pageSize;
        _totalPages = (data['totalPages'] as num?)?.toInt() ?? 1;
        if (rawModules.isNotEmpty) {
          _modules = rawModules.map((e) => e.toString()).toList();
        }
        _selectedIds.clear();
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _logs = [];
          _totalCount = 0;
          _totalPages = 1;
        });
      }
    }
  }

  Future<void> _deleteLog(Map<String, dynamic> log) async {
    final id = (log['id'] ?? '').toString();
    if (id.isEmpty) return;

    setState(() {
      _deletingId = id;
    });

    final repo = ref.read(accountRepositoryProvider);
    final res = await repo.deleteSecurityAuditLog(id);

    if (!mounted) return;

    setState(() {
      _deletingId = null;
      _selectedIds.remove(id);
    });

    if (res['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF059669),
          content: Text(
            'audit.deleted_toast'.tr(
              ref,
              fallback: 'Audit log record deleted.',
            ),
          ),
        ),
      );
      _loadLogs(_page);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFFDC2626),
          content: Text(
            (res['message'] ?? 'Could not delete audit log record.').toString(),
          ),
        ),
      );
    }
  }

  Future<void> _deleteSelectedLogs() async {
    final ids = _selectedIds.toList();
    if (ids.isEmpty) return;

    setState(() {
      _isDeleting = true;
    });

    final repo = ref.read(accountRepositoryProvider);
    final res = await repo.bulkDeleteSecurityAuditLogs(ids);

    if (!mounted) return;

    setState(() {
      _isDeleting = false;
    });

    if (res['success'] == true) {
      _selectedIds.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF059669),
          content: Text(
            'audit.deleted_toast'.tr(
              ref,
              fallback: 'Audit log record deleted.',
            ),
          ),
        ),
      );
      _loadLogs(1);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFFDC2626),
          content: Text(
            (res['message'] ?? 'Failed to delete selected logs.').toString(),
          ),
        ),
      );
    }
  }

  bool get _isAllPageSelected {
    if (_logs.isEmpty) return false;
    return _logs.every((l) => _selectedIds.contains((l['id'] ?? '').toString()));
  }

  void _toggleSelectAll(bool? checked) {
    setState(() {
      if (checked == true) {
        for (final l in _logs) {
          final id = (l['id'] ?? '').toString();
          if (id.isNotEmpty) _selectedIds.add(id);
        }
      } else {
        for (final l in _logs) {
          final id = (l['id'] ?? '').toString();
          _selectedIds.remove(id);
        }
      }
    });
  }

  void _toggleSelectOne(String id, bool? checked) {
    if (id.isEmpty) return;
    setState(() {
      if (checked == true) {
        _selectedIds.add(id);
      } else {
        _selectedIds.remove(id);
      }
    });
  }

  int _getEndIndex() {
    final calc = _page * _pageSize;
    return calc > _totalCount ? _totalCount : calc;
  }

  List<dynamic> _getVisiblePages() {
    final total = _totalPages;
    final current = _page;
    if (total <= 7) {
      return List<int>.generate(total, (i) => i + 1);
    }
    final pages = <dynamic>[1];
    if (current > 3) pages.add('...');
    final start = (current - 1) < 2 ? 2 : (current - 1);
    final end = (current + 1) > (total - 1) ? (total - 1) : (current + 1);
    for (int i = start; i <= end; i++) {
      pages.add(i);
    }
    if (current < total - 2) pages.add('...');
    pages.add(total);
    return pages;
  }

  String _formatIpAddress(String? ip) {
    final raw = (ip ?? '').trim();
    if (raw.isEmpty) return '127.0.0.1';
    if (raw == '::1' || raw == '0:0:0:0:0:0:0:1') return '127.0.0.1 (Local)';
    return raw;
  }

  Map<String, dynamic> _parseUserAgent(Map<String, dynamic> log) {
    final explicitDevice = (log['device'] ?? '').toString().trim();
    final explicitBrowser = (log['browser'] ?? '').toString().trim();
    final ua = (log['userAgent'] ?? '').toString();
    final uaLower = ua.toLowerCase();

    IconData icon = Icons.devices_rounded;
    if (uaLower.contains('iphone') ||
        uaLower.contains('android') ||
        uaLower.contains('mobile')) {
      icon = Icons.smartphone_rounded;
    } else if (uaLower.contains('ipad') || uaLower.contains('tablet')) {
      icon = Icons.tablet_mac_rounded;
    } else if (uaLower.contains('windows') ||
        uaLower.contains('macintosh') ||
        uaLower.contains('linux')) {
      icon = Icons.laptop_windows_rounded;
    }

    String title = explicitDevice;
    if (title.isEmpty) {
      if (uaLower.contains('windows')) {
        title = 'Windows PC';
      } else if (uaLower.contains('macintosh') || uaLower.contains('mac os')) {
        title = 'Mac';
      } else if (uaLower.contains('android')) {
        title = 'Android Device';
      } else if (uaLower.contains('iphone') || uaLower.contains('ipad')) {
        title = 'iOS Device';
      } else if (uaLower.contains('dart') || uaLower.contains('flutter')) {
        title = 'Desktop / Mobile App';
      } else {
        title = 'Web Client';
      }
    }

    String details = explicitBrowser;
    if (details.isEmpty) {
      if (uaLower.contains('edg/')) {
        details = 'Microsoft Edge';
      } else if (uaLower.contains('chrome/')) {
        details = 'Google Chrome';
      } else if (uaLower.contains('firefox/')) {
        details = 'Mozilla Firefox';
      } else if (uaLower.contains('safari/') && !uaLower.contains('chrome/')) {
        details = 'Apple Safari';
      } else if (ua.isNotEmpty) {
        details = ua.length > 42 ? '${ua.substring(0, 42)}...' : ua;
      } else {
        details = 'Standard Client';
      }
    }

    return {
      'icon': icon,
      'title': title,
      'details': details,
    };
  }

  IconData _getStatusIcon(String status) {
    final s = status.toLowerCase();
    if (s.contains('success') ||
        s.contains('granted') ||
        s.contains('installed') ||
        s.contains('enabled') ||
        s.contains('activated')) {
      return Icons.check_circle_rounded;
    }
    if (s.contains('fail') || s.contains('denied')) {
      return Icons.cancel_rounded;
    }
    if (s.contains('revoked') ||
        s.contains('terminated') ||
        s.contains('deactivated') ||
        s.contains('disabled') ||
        s.contains('deleted') ||
        s.contains('removed')) {
      return Icons.block_rounded;
    }
    return Icons.info_outline_rounded;
  }

  String _getStatusTone(String status) {
    final s = status.toLowerCase();
    if (s.contains('success') ||
        s.contains('granted') ||
        s.contains('installed') ||
        s.contains('enabled') ||
        s.contains('activated')) {
      return 'good';
    }
    if (s.contains('fail') ||
        s.contains('denied') ||
        s.contains('revoked') ||
        s.contains('deactivated') ||
        s.contains('disabled') ||
        s.contains('deleted') ||
        s.contains('removed')) {
      return 'bad';
    }
    return 'info';
  }

  String _formatDateTime(String? dateStr) {
    if (dateStr == null || dateStr.trim().isEmpty) return '—';
    try {
      final raw = dateStr.trim();
      final normalized =
          (raw.endsWith('Z') || raw.contains('+')) ? raw : '${raw}Z';
      final dt = DateTime.parse(normalized).toLocal();
      return DateFormat('MMM d, yyyy, h:mm a').format(dt);
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : Colors.white;
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final textPrimary = isDark ? Colors.white : const Color(0xFF0F172A);
    final textSecondary = isDark ? AppColors.gray400 : const Color(0xFF64748B);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Container(
        decoration: BoxDecoration(
          color: surfaceColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.18 : 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Card Header (Responsive Wrap — prevents button overlap on Desktop minimize & Mobile)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: isDark ? borderColor : const Color(0xFFF1F5F9),
                  ),
                ),
              ),
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 16,
                runSpacing: 12,
                children: [
                  // Title Group
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 640),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Padding(
                          padding: EdgeInsets.only(top: 2),
                          child: Icon(
                            Icons.security_rounded,
                            size: 26,
                            color: Color(0xFF0050E5),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Flexible(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'audit.console_title'.tr(
                                  ref,
                                  fallback:
                                      'Security Audit & Log Activity (All Workspace Users)',
                                ),
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: textPrimary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'audit.console_desc'.tr(
                                  ref,
                                  fallback:
                                      'Complete workspace audit trail of tasks, operational changes, and authentication events across all users and historical archives.',
                                ),
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Header Actions Wrap (Counter Badge + Error Codes + Delete Selected + Refresh)
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (_totalCount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0050E5)
                                .withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: const Color(0xFF0050E5)
                                  .withValues(alpha: 0.2),
                            ),
                          ),
                          child: Text(
                            '$_totalCount ${'audit.logs_count'.tr(ref, fallback: 'Audit Logs')}',
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0050E5),
                            ),
                          ),
                        ),

                      // Error Codes Button
                      OutlinedButton.icon(
                        onPressed: widget.onNavigateToErrorCodes,
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, 36),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          side: BorderSide(color: borderColor),
                          backgroundColor: surfaceColor,
                          foregroundColor: textPrimary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        icon: const Icon(
                          Icons.menu_book_rounded,
                          size: 16,
                          color: Color(0xFF0050E5),
                        ),
                        label: Text(
                          'nav.error_codes'.tr(ref, fallback: 'Error Codes'),
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),

                      // Delete Selected Button
                      if (_selectedIds.isNotEmpty)
                        OutlinedButton.icon(
                          onPressed: _isDeleting ? null : _deleteSelectedLogs,
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 36),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            side: const BorderSide(color: Color(0xFFFCA5A5)),
                            backgroundColor:
                                const Color(0xFFFEF2F2).withValues(alpha: isDark ? 0.15 : 1.0),
                            foregroundColor: const Color(0xFFDC2626),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          icon: const Icon(
                            Icons.delete_sweep_rounded,
                            size: 16,
                            color: Color(0xFFDC2626),
                          ),
                          label: Text(
                            '${'audit.delete_selected'.tr(ref, fallback: 'Delete Selected')} (${_selectedIds.length})',
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),

                      // Refresh Button
                      OutlinedButton.icon(
                        onPressed: _isLoading ? null : () => _loadLogs(_page),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, 36),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          side: BorderSide(color: borderColor),
                          backgroundColor: surfaceColor,
                          foregroundColor: textPrimary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        icon: _isLoading
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Color(0xFF0050E5),
                                ),
                              )
                            : const Icon(
                                Icons.refresh_rounded,
                                size: 16,
                                color: Color(0xFF0050E5),
                              ),
                        label: Text(
                          'audit.refresh'.tr(ref, fallback: 'Refresh'),
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // 2. Card Body
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Search & Filter Toolbar (Responsive Wrap)
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      // Search Input
                      ConstrainedBox(
                        constraints: const BoxConstraints(
                          minWidth: 220,
                          maxWidth: 420,
                        ),
                        child: SizedBox(
                          height: 38,
                          child: TextField(
                            controller: _searchController,
                            onChanged: (v) {
                              setState(() {
                                _searchTerm = v;
                              });
                            },
                            onSubmitted: (_) => _loadLogs(1),
                            style: TextStyle(fontSize: 13, color: textPrimary),
                            decoration: InputDecoration(
                              hintText: 'audit.search_placeholder'.tr(
                                ref,
                                fallback:
                                    'Search by user, email, action, description, or IP...',
                              ),
                              hintStyle:
                                  TextStyle(fontSize: 12.5, color: textSecondary),
                              prefixIcon: Icon(
                                Icons.search_rounded,
                                size: 18,
                                color: textSecondary,
                              ),
                              suffixIcon: _searchTerm.isNotEmpty
                                  ? IconButton(
                                      icon: Icon(
                                        Icons.close_rounded,
                                        size: 16,
                                        color: textSecondary,
                                      ),
                                      splashRadius: 16,
                                      onPressed: () {
                                        _searchController.clear();
                                        setState(() {
                                          _searchTerm = '';
                                        });
                                        _loadLogs(1);
                                      },
                                    )
                                  : null,
                              filled: true,
                              fillColor: isDark
                                  ? const Color(0xFF0F172A)
                                  : const Color(0xFFF8FAFC),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 0,
                              ),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: borderColor),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: borderColor),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(
                                  color: Color(0xFF0050E5),
                                  width: 1.5,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Module Select Dropdown
                      Container(
                        height: 38,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF0F172A)
                              : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: borderColor),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedModule == 'all' ||
                                    _modules.contains(_selectedModule)
                                ? _selectedModule
                                : 'all',
                            dropdownColor: surfaceColor,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: textPrimary,
                            ),
                            onChanged: (val) {
                              if (val == null) return;
                              setState(() {
                                _selectedModule = val;
                              });
                              _loadLogs(1);
                            },
                            items: [
                              DropdownMenuItem<String>(
                                value: 'all',
                                child: Text(
                                  '${'audit.all_modules'.tr(ref, fallback: 'All Modules')} (${_modules.length})',
                                ),
                              ),
                              ..._modules.map(
                                (mod) => DropdownMenuItem<String>(
                                  value: mod,
                                  child: Text(mod),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Filter Button
                      OutlinedButton.icon(
                        onPressed: () => _loadLogs(1),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, 38),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          side: BorderSide(color: borderColor),
                          backgroundColor: surfaceColor,
                          foregroundColor: textPrimary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        icon: const Icon(
                          Icons.filter_list_rounded,
                          size: 16,
                          color: Color(0xFF0050E5),
                        ),
                        label: Text(
                          'audit.filter'.tr(ref, fallback: 'Filter'),
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Loading / Empty / Table State
                  if (_isLoading && _logs.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 48),
                      child: Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF0050E5),
                        ),
                      ),
                    )
                  else if (_logs.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        vertical: 44,
                        horizontal: 16,
                      ),
                      decoration: BoxDecoration(
                        color: isDark
                            ? const Color(0xFF0F172A)
                            : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: borderColor),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            Icons.manage_search_rounded,
                            size: 36,
                            color: textSecondary,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'audit.no_records'.tr(
                              ref,
                              fallback:
                                  'No audit log records match your current criteria.',
                            ),
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: textSecondary,
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    _buildAuditLogsTableAndPagination(
                      isDark: isDark,
                      surfaceColor: surfaceColor,
                      borderColor: borderColor,
                      textPrimary: textPrimary,
                      textSecondary: textSecondary,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAuditLogsTableAndPagination({
    required bool isDark,
    required Color surfaceColor,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final minTableWidth =
            constraints.maxWidth < 980 ? 980.0 : constraints.maxWidth;

        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: borderColor),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Scrollbar(
                controller: _tableHorizontalController,
                thumbVisibility: constraints.maxWidth < 980,
                child: SingleChildScrollView(
                  controller: _tableHorizontalController,
                  scrollDirection: Axis.horizontal,
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minWidth: minTableWidth,
                      maxWidth: minTableWidth,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Table Header
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 11,
                          ),
                          decoration: BoxDecoration(
                            color: isDark
                                ? const Color(0xFF1E293B)
                                : const Color(0xFFF8FAFC),
                            border: Border(
                              bottom: BorderSide(color: borderColor),
                            ),
                          ),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 38,
                                child: Checkbox(
                                  value: _isAllPageSelected,
                                  onChanged: _toggleSelectAll,
                                  activeColor: const Color(0xFF0050E5),
                                  visualDensity: VisualDensity.compact,
                                ),
                              ),
                              SizedBox(
                                width: 170,
                                child: Text(
                                  'audit.th_user'
                                      .tr(ref, fallback: 'USER / ACCOUNT')
                                      .toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.4,
                                    color: textSecondary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              SizedBox(
                                width: 155,
                                child: Text(
                                  'audit.th_action_status'
                                      .tr(ref, fallback: 'ACTION & STATUS')
                                      .toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.4,
                                    color: textSecondary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'audit.th_desc_module'
                                      .tr(ref, fallback: 'DESCRIPTION / MODULE')
                                      .toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.4,
                                    color: textSecondary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              SizedBox(
                                width: 120,
                                child: Text(
                                  'audit.th_ip'
                                      .tr(ref, fallback: 'IP ADDRESS')
                                      .toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.4,
                                    color: textSecondary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              SizedBox(
                                width: 165,
                                child: Text(
                                  'audit.th_browser_device'
                                      .tr(ref, fallback: 'BROWSER / DEVICE')
                                      .toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.4,
                                    color: textSecondary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              SizedBox(
                                width: 140,
                                child: Text(
                                  'audit.th_timestamp'
                                      .tr(ref, fallback: 'TIMESTAMP')
                                      .toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.4,
                                    color: textSecondary,
                                  ),
                                ),
                              ),
                              SizedBox(
                                width: 64,
                                child: Text(
                                  'audit.th_action'
                                      .tr(ref, fallback: 'ACTION')
                                      .toUpperCase(),
                                  textAlign: TextAlign.right,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.4,
                                    color: textSecondary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Table Rows
                        ..._logs.map((log) {
                          final id = (log['id'] ?? '').toString();
                          final isSelected = _selectedIds.contains(id);
                          final fullName = (log['fullName'] ?? '').toString().trim();
                          final email = (log['email'] ?? '').toString().trim();
                          final actionOrStatus =
                              (log['actionType'] ?? log['status'] ?? 'Activity')
                                  .toString();
                          final statusStr = (log['status'] ?? '').toString();
                          final isTrusted = log['isTrusted'] == true ||
                              statusStr.contains('Trusted');
                          final description = (log['description'] ??
                                  log['actionType'] ??
                                  log['status'] ??
                                  '')
                              .toString();
                          final module = (log['module'] ?? '').toString().trim();
                          final ipAddress = _formatIpAddress(
                            log['ipAddress']?.toString(),
                          );
                          final parsedUa = _parseUserAgent(log);
                          final timestamp = _formatDateTime(
                            (log['timestamp'] ?? log['date'])?.toString(),
                          );

                          final tone = _getStatusTone(actionOrStatus);
                          Color pillBg;
                          Color pillText;
                          if (tone == 'good') {
                            pillBg = const Color(0xFF10B981)
                                .withValues(alpha: 0.12);
                            pillText = const Color(0xFF059669);
                          } else if (tone == 'bad') {
                            pillBg = const Color(0xFFEF4444)
                                .withValues(alpha: 0.12);
                            pillText = const Color(0xFFDC2626);
                          } else {
                            pillBg = const Color(0xFF0050E5)
                                .withValues(alpha: 0.10);
                            pillText = const Color(0xFF0050E5);
                          }

                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 11,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? const Color(0xFF0050E5)
                                      .withValues(alpha: 0.05)
                                  : Colors.transparent,
                              border: Border(
                                bottom: BorderSide(
                                  color: borderColor.withValues(alpha: 0.6),
                                ),
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                SizedBox(
                                  width: 38,
                                  child: Checkbox(
                                    value: isSelected,
                                    onChanged: (v) => _toggleSelectOne(id, v),
                                    activeColor: const Color(0xFF0050E5),
                                    visualDensity: VisualDensity.compact,
                                  ),
                                ),

                                // User / Account
                                SizedBox(
                                  width: 170,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        fullName.isNotEmpty ? fullName : email,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w700,
                                          color: textPrimary,
                                        ),
                                      ),
                                      if (fullName.isNotEmpty &&
                                          fullName != email &&
                                          email.isNotEmpty)
                                        Text(
                                          email,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: textSecondary,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 10),

                                // Action & Status
                                SizedBox(
                                  width: 155,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: pillBg,
                                          borderRadius:
                                              BorderRadius.circular(999),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              _getStatusIcon(actionOrStatus),
                                              size: 13,
                                              color: pillText,
                                            ),
                                            const SizedBox(width: 4),
                                            Flexible(
                                              child: Text(
                                                actionOrStatus,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w700,
                                                  color: pillText,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (isTrusted) ...[
                                        const SizedBox(height: 4),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 6,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF059669)
                                                .withValues(alpha: 0.1),
                                            borderRadius:
                                                BorderRadius.circular(999),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(
                                                Icons.verified_user_rounded,
                                                size: 11,
                                                color: Color(0xFF059669),
                                              ),
                                              const SizedBox(width: 3),
                                              Text(
                                                'audit.trusted'.tr(
                                                  ref,
                                                  fallback: 'Trusted',
                                                ),
                                                style: const TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w700,
                                                  color: Color(0xFF059669),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 10),

                                // Description / Module
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        description,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 12.5,
                                          color: textPrimary,
                                        ),
                                      ),
                                      if (module.isNotEmpty) ...[
                                        const SizedBox(height: 3),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 7,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: isDark
                                                ? const Color(0xFF1E293B)
                                                : const Color(0xFFF1F5F9),
                                            borderRadius:
                                                BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            module,
                                            style: TextStyle(
                                              fontSize: 10.5,
                                              fontWeight: FontWeight.w700,
                                              color: textSecondary,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 10),

                                // IP Address
                                SizedBox(
                                  width: 120,
                                  child: Align(
                                    alignment: Alignment.centerLeft,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 7,
                                        vertical: 3,
                                      ),
                                      decoration: BoxDecoration(
                                        color: isDark
                                            ? const Color(0xFF1E293B)
                                            : const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(5),
                                      ),
                                      child: Text(
                                        ipAddress,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontFamily: 'monospace',
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w600,
                                          color: textPrimary,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),

                                // Browser / Device
                                SizedBox(
                                  width: 165,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(
                                            parsedUa['icon'] as IconData,
                                            size: 14,
                                            color: textSecondary,
                                          ),
                                          const SizedBox(width: 5),
                                          Flexible(
                                            child: Text(
                                              parsedUa['title'].toString(),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w700,
                                                color: textPrimary,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      Text(
                                        parsedUa['details'].toString(),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 10),

                                // Timestamp
                                SizedBox(
                                  width: 140,
                                  child: Text(
                                    timestamp,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: textSecondary,
                                    ),
                                  ),
                                ),

                                // Action (Delete)
                                SizedBox(
                                  width: 64,
                                  child: Align(
                                    alignment: Alignment.centerRight,
                                    child: IconButton(
                                      tooltip: 'audit.delete_log'.tr(
                                        ref,
                                        fallback: 'Delete Audit Log',
                                      ),
                                      onPressed: _deletingId == id
                                          ? null
                                          : () => _deleteLog(log),
                                      icon: _deletingId == id
                                          ? const SizedBox(
                                              width: 15,
                                              height: 15,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: Color(0xFFDC2626),
                                              ),
                                            )
                                          : const Icon(
                                              Icons.delete_outline_rounded,
                                              size: 18,
                                              color: Color(0xFFDC2626),
                                            ),
                                      visualDensity: VisualDensity.compact,
                                      splashRadius: 18,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                ),
              ),

              // Pagination Footer (Responsive Wrap)
              if (_totalCount > 0)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF1E293B)
                        : const Color(0xFFF8FAFC),
                    border: Border(top: BorderSide(color: borderColor)),
                  ),
                  child: Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 12,
                    runSpacing: 10,
                    children: [
                      // Page Size Selector
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        runSpacing: 6,
                        children: [
                          Text(
                            'audit.show'.tr(ref, fallback: 'Show'),
                            style: TextStyle(fontSize: 12.5, color: textSecondary),
                          ),
                          Container(
                            height: 30,
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            decoration: BoxDecoration(
                              color: surfaceColor,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: borderColor),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<int>(
                                value: [10, 25, 50, 100].contains(_pageSize)
                                    ? _pageSize
                                    : 25,
                                dropdownColor: surfaceColor,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: textPrimary,
                                ),
                                onChanged: (val) {
                                  if (val == null) return;
                                  setState(() {
                                    _pageSize = val;
                                  });
                                  _loadLogs(1);
                                },
                                items: const [10, 25, 50, 100]
                                    .map(
                                      (s) => DropdownMenuItem<int>(
                                        value: s,
                                        child: Text('$s'),
                                      ),
                                    )
                                    .toList(),
                              ),
                            ),
                          ),
                          Text(
                            'audit.entries_per_page'.tr(
                              ref,
                              fallback: 'entries per page',
                            ),
                            style: TextStyle(fontSize: 12.5, color: textSecondary),
                          ),
                          Text(
                            '(${'audit.showing'.tr(ref, fallback: 'Showing')} ${(_page - 1) * _pageSize + 1} ${'audit.to'.tr(ref, fallback: 'to')} ${_getEndIndex()} ${'audit.of'.tr(ref, fallback: 'of')} $_totalCount ${'audit.records'.tr(ref, fallback: 'records')})',
                            style: TextStyle(fontSize: 12, color: textSecondary),
                          ),
                        ],
                      ),

                      // Page Number Controls
                      if (_totalPages > 1)
                        Wrap(
                          spacing: 4,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            _buildPageButton(
                              child: const Icon(
                                Icons.keyboard_double_arrow_left_rounded,
                                size: 16,
                              ),
                              enabled: _page > 1,
                              onTap: () => _loadLogs(1),
                              isDark: isDark,
                              surfaceColor: surfaceColor,
                              borderColor: borderColor,
                              textPrimary: textPrimary,
                            ),
                            _buildPageButton(
                              child: const Icon(
                                Icons.chevron_left_rounded,
                                size: 16,
                              ),
                              enabled: _page > 1,
                              onTap: () => _loadLogs(_page - 1),
                              isDark: isDark,
                              surfaceColor: surfaceColor,
                              borderColor: borderColor,
                              textPrimary: textPrimary,
                            ),
                            ..._getVisiblePages().map((p) {
                              if (p == '...') {
                                return Padding(
                                  padding:
                                      const EdgeInsets.symmetric(horizontal: 4),
                                  child: Text(
                                    '...',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: textSecondary,
                                    ),
                                  ),
                                );
                              }
                              final pageNum = p as int;
                              final isActive = pageNum == _page;
                              return _buildPageButton(
                                child: Text(
                                  '$pageNum',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: isActive ? Colors.white : textPrimary,
                                  ),
                                ),
                                isActive: isActive,
                                enabled: true,
                                onTap: () => _loadLogs(pageNum),
                                isDark: isDark,
                                surfaceColor: surfaceColor,
                                borderColor: borderColor,
                                textPrimary: textPrimary,
                              );
                            }),
                            _buildPageButton(
                              child: const Icon(
                                Icons.chevron_right_rounded,
                                size: 16,
                              ),
                              enabled: _page < _totalPages,
                              onTap: () => _loadLogs(_page + 1),
                              isDark: isDark,
                              surfaceColor: surfaceColor,
                              borderColor: borderColor,
                              textPrimary: textPrimary,
                            ),
                            _buildPageButton(
                              child: const Icon(
                                Icons.keyboard_double_arrow_right_rounded,
                                size: 16,
                              ),
                              enabled: _page < _totalPages,
                              onTap: () => _loadLogs(_totalPages),
                              isDark: isDark,
                              surfaceColor: surfaceColor,
                              borderColor: borderColor,
                              textPrimary: textPrimary,
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPageButton({
    required Widget child,
    required bool enabled,
    required VoidCallback onTap,
    required bool isDark,
    required Color surfaceColor,
    required Color borderColor,
    required Color textPrimary,
    bool isActive = false,
  }) {
    return InkWell(
      onTap: enabled && !isActive ? onTap : null,
      borderRadius: BorderRadius.circular(6),
      child: Opacity(
        opacity: enabled ? 1.0 : 0.4,
        child: Container(
          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          padding: const EdgeInsets.symmetric(horizontal: 6),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFF0050E5) : surfaceColor,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: isActive ? const Color(0xFF0050E5) : borderColor,
            ),
          ),
          child: IconTheme(
            data: IconThemeData(
              color: isActive ? Colors.white : textPrimary,
              size: 16,
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

