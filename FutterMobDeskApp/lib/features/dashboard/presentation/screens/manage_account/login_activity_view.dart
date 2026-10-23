import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/services/export_service.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Screen presenting the server-side paginated login and authentication security audit history.
/// Features search by IP or device, status filters, export capabilities, and audit details.
/// </summary>
class LoginActivityView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Creates a [LoginActivityView].
  const LoginActivityView({super.key, this.workspace});

  @override
  ConsumerState<LoginActivityView> createState() => _LoginActivityViewState();
}

class _LoginActivityViewState extends ConsumerState<LoginActivityView> {
  bool _isLoading = true;
  int _currentPage = 1;
  final int _pageSize = 10;
  int _totalCount = 0;
  int _totalPages = 1;
  List<Map<String, dynamic>> _items = [];
  String? _errorMessage;

  String _searchQuery = '';
  String _selectedStatus = 'All';

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(accountRepositoryProvider);
      final res = await repo.getLoginHistory(page: _currentPage, pageSize: _pageSize);
      final rawList = (res['items'] as List<dynamic>?) ?? [];

      if (mounted) {
        setState(() {
          _items = rawList.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          _totalCount = (res['totalCount'] as num?)?.toInt() ?? _items.length;
          _totalPages = (res['totalPages'] as num?)?.toInt() ?? 1;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Unable to load login history records.';
        });
      }
    }
  }

  void _goToPage(int page) {
    if (page < 1 || page > _totalPages || page == _currentPage) return;
    setState(() => _currentPage = page);
    _loadHistory();
  }

  void _handleExportCsv() {
    final filtered = _getFilteredItems();
    final columns = [
      const ExportColumn(key: 'status', header: 'Status'),
      const ExportColumn(key: 'ipAddress', header: 'IP Address'),
      const ExportColumn(key: 'deviceSummary', header: 'Device / Client'),
      const ExportColumn(key: 'timestamp', header: 'Date & Time'),
    ];

    ExportService.exportToCsv(
      filename: 'Login_Activity_Report',
      columns: columns,
      data: filtered,
    );

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Login activity exported to CSV in your Downloads folder.')),
    );
  }

  List<Map<String, dynamic>> _getFilteredItems() {
    return _items.where((item) {
      final status = (item['status'] ?? (item['isSuccessful'] == false ? 'Failed' : 'Success')).toString();
      final isSuccess = !status.toLowerCase().contains('fail');

      if (_selectedStatus == 'Success' && !isSuccess) return false;
      if (_selectedStatus == 'Failed' && isSuccess) return false;

      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final ip = (item['ipAddress'] ?? '').toString().toLowerCase();
        final dev = (item['deviceSummary'] ?? item['userAgent'] ?? '').toString().toLowerCase();
        if (!ip.contains(q) && !dev.contains(q)) return false;
      }

      return true;
    }).toList();
  }

  Widget _buildStatusBadge(String status) {
    final lower = status.toLowerCase();
    Color bg;
    Color fg;
    IconData icon;

    if (lower.contains('success') || lower.contains('authorized') || lower.contains('completed')) {
      bg = AppColors.success.withValues(alpha: 0.12);
      fg = AppColors.success;
      icon = Icons.check_circle_rounded;
    } else if (lower.contains('fail') || lower.contains('invalid') || lower.contains('locked') || lower.contains('rejected')) {
      bg = AppColors.error.withValues(alpha: 0.12);
      fg = AppColors.error;
      icon = Icons.cancel_rounded;
    } else {
      bg = AppColors.warning.withValues(alpha: 0.12);
      fg = AppColors.warning;
      icon = Icons.shield_outlined;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(100),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: fg),
          const SizedBox(width: 4),
          Text(
            status,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: fg),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final filtered = _getFilteredItems();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'FORENSIC AUDIT STREAM',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Login & Authentication Activity',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'Comprehensive audit trail of recent sign-in attempts, client IPs, and authentication statuses.',
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  OutlinedButton.icon(
                    icon: const Icon(Icons.download_rounded, size: 16),
                    label: const Text('Export CSV', style: TextStyle(fontSize: 12)),
                    onPressed: _items.isNotEmpty ? _handleExportCsv : null,
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded),
                    tooltip: 'Refresh Activity Logs',
                    onPressed: _loadHistory,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Search and Filters Bar
          Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    labelText: 'Search logs',
                    hintText: 'Search by IP address or browser...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                  onChanged: (val) => setState(() => _searchQuery = val),
                ),
              ),
              const SizedBox(width: 12),
              Wrap(
                spacing: 6,
                children: ['All', 'Success', 'Failed'].map((st) {
                  final isSelected = _selectedStatus == st;
                  return ChoiceChip(
                    label: Text(st),
                    selected: isSelected,
                    selectedColor: AppColors.primary.withValues(alpha: 0.15),
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? AppColors.primary : (isDark ? AppColors.gray400 : AppColors.gray600),
                    ),
                    onSelected: (val) {
                      if (val) setState(() => _selectedStatus = st);
                    },
                  );
                }).toList(),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Error Banner
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, size: 18, color: AppColors.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(fontSize: 12, color: AppColors.error, fontWeight: FontWeight.w500),
                    ),
                  ),
                  TextButton(onPressed: _loadHistory, child: const Text('Retry')),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Loading Indicator
          if (_isLoading) ...[
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: CircularProgressIndicator(),
              ),
            ),
          ] else if (filtered.isEmpty) ...[
            // Empty State
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
                  Icon(Icons.manage_search_rounded, size: 48, color: isDark ? AppColors.gray400 : AppColors.gray500),
                  const SizedBox(height: 12),
                  const Text('No Login Activity Recorded', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text(
                    'Recent sign-in attempts will be recorded and displayed here automatically.',
                    style: TextStyle(fontSize: 13, color: isDark ? AppColors.gray400 : AppColors.gray600),
                  ),
                ],
              ),
            ),
          ] else ...[
            // Activity Table Cards
            Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
              ),
              child: Column(
                children: [
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: filtered.length,
                    separatorBuilder: (_, index) => Divider(
                      height: 1,
                      color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                    ),
                    itemBuilder: (context, index) {
                      final item = filtered[index];
                      final status = (item['status'] ?? (item['isSuccessful'] == false ? 'Failed' : 'Success')).toString();
                      final timestamp = item['timestamp'] ?? item['loginTime'] ?? item['createdAt'] ?? 'Just now';
                      final ip = item['ipAddress'] ?? '127.0.0.1';
                      final userAgent = item['deviceSummary'] ?? item['userAgent'] ?? 'Web Browser';

                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                        child: Row(
                          children: [
                            // Status Badge
                            _buildStatusBadge(status),
                            const SizedBox(width: 16),

                            // Details
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    userAgent.toString(),
                                    style: TextStyle(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.bold,
                                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    'IP Address: $ip',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Timestamp
                            Text(
                              timestamp.toString(),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: isDark ? AppColors.gray400 : AppColors.gray600,
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
            const SizedBox(height: 16),

            // Pagination Controls
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Showing ${filtered.length} of $_totalCount records',
                  style: TextStyle(fontSize: 12.5, color: isDark ? AppColors.gray400 : AppColors.gray600),
                ),
                Row(
                  children: [
                    OutlinedButton(
                      onPressed: _currentPage > 1 ? () => _goToPage(_currentPage - 1) : null,
                      style: OutlinedButton.styleFrom(visualDensity: VisualDensity.compact),
                      child: const Text('Previous'),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Page $_currentPage of $_totalPages',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: _currentPage < _totalPages ? () => _goToPage(_currentPage + 1) : null,
                      style: OutlinedButton.styleFrom(visualDensity: VisualDensity.compact),
                      child: const Text('Next'),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
