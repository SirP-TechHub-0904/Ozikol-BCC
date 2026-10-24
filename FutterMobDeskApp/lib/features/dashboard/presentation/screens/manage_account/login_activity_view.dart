import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/services/export_service.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';
import 'widgets/account_security_header.dart';

/// <summary>
/// Screen presenting the server-side paginated login and authentication security audit history.
/// Features search by IP or device, status filters, export capabilities, and audit details.
/// </summary>
class LoginActivityView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Callback to switch account navigation tabs.
  final ValueChanged<String>? onSelectTab;

  /// Creates a [LoginActivityView].
  const LoginActivityView({
    super.key,
    this.workspace,
    this.onSelectTab,
  });

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

  /// <summary>
  /// Formats raw timestamp to exact local date and time string.
  /// </summary>
  String _formatExactTime(dynamic raw) {
    if (raw == null) return '—';
    final str = raw.toString().trim();
    if (str.isEmpty || str == 'Just now') return str;
    final dt = DateTime.tryParse(str);
    if (dt == null) return str;
    final localDt = dt.toLocal();
    return DateFormat('MMM d, yyyy • h:mm a').format(localDt);
  }

  String _formatUserAgent(String ua) {
    if (ua.contains('BCC-Client') || ua.contains('Flutter')) {
      final isMobile = ua.contains('Mobile') || ua.contains('Android') || ua.contains('iOS');
      final os = ua.contains('Windows') ? 'Windows' : (ua.contains('macOS') ? 'macOS' : (ua.contains('Linux') ? 'Linux' : (ua.contains('Android') ? 'Android' : 'iOS')));
      return isMobile ? 'Mobile App on $os' : 'Desktop App on $os';
    }
    if (ua.contains('Chrome')) return 'Google Chrome on Windows';
    if (ua.contains('Firefox')) return 'Mozilla Firefox on Windows';
    if (ua.contains('Edge') || ua.contains('Edg/')) return 'Microsoft Edge on Windows';
    if (ua.contains('Safari') && !ua.contains('Chrome')) return 'Apple Safari on macOS';
    if (ua.contains(' on ')) return ua;
    return 'Web Browser Session';
  }

  IconData _getDeviceIcon(String ua) {
    if (ua.contains('BCC-Client') || ua.contains('Desktop App')) {
      return Icons.desktop_windows_rounded;
    }
    if (ua.contains('Mobile') || ua.contains('Android') || ua.contains('iOS')) {
      return Icons.smartphone_rounded;
    }
    return Icons.language_rounded;
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
          // Unified Account Header & Navigation Tabs
          AccountSecurityHeader(
            activeTab: 'activity',
            onSelectTab: widget.onSelectTab,
            workspace: widget.workspace,
          ),
          const SizedBox(height: 20),

          // Section Card matching Web .card-section and .section-card-head
          AccountSectionCard(
            icon: Icons.history_rounded,
            title: 'account.tab_activity'.tr(ref, fallback: 'Login & Authentication Activity'),
            description: 'account.login_activity_desc'.tr(ref, fallback: 'Comprehensive audit trail of recent sign-in attempts, client IPs, and authentication statuses.'),
            action: Wrap(
              spacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: _items.isNotEmpty ? _handleExportCsv : null,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.download_rounded, size: 16),
                  label: Text('account.export_csv'.tr(ref, fallback: 'Export CSV'), style: const TextStyle(fontSize: 12.5)),
                ),
                OutlinedButton.icon(
                  onPressed: _loadHistory,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.refresh_rounded, size: 16),
                  label: Text('account.refresh_logs'.tr(ref, fallback: 'Refresh'), style: const TextStyle(fontSize: 12.5)),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [

          // Search and Filters Bar
          Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    labelText: 'account.search_logs'.tr(ref, fallback: 'Search logs'),
                    hintText: 'account.search_placeholder'.tr(ref, fallback: 'Search by IP address or browser...'),
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
                children: [
                  {'key': 'All', 'label': 'status.all'.tr(ref, fallback: 'All')},
                  {'key': 'Success', 'label': 'status.success'.tr(ref, fallback: 'Success')},
                  {'key': 'Failed', 'label': 'status.failed'.tr(ref, fallback: 'Failed')},
                ].map((st) {
                  final isSelected = _selectedStatus == st['key'];
                  return ChoiceChip(
                    label: Text(st['label']!),
                    selected: isSelected,
                    selectedColor: AppColors.primary.withValues(alpha: 0.15),
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? AppColors.primary : (isDark ? AppColors.gray400 : AppColors.gray600),
                    ),
                    onSelected: (val) {
                      if (val) setState(() => _selectedStatus = st['key']!);
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
                  TextButton(onPressed: _loadHistory, child: Text('btn.retry'.tr(ref, fallback: 'Retry'))),
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
                  Text('account.no_history'.tr(ref, fallback: 'No Login Activity Recorded'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text(
                    'account.login_activity_desc'.tr(ref, fallback: 'Recent sign-in attempts will be recorded and displayed here automatically.'),
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
                      final isTrusted = item['isTrusted'] == true || status.contains('Trusted');
                      final timestamp = item['timestamp'] ?? item['loginTime'] ?? item['createdAt'] ?? 'Just now';
                      final ip = item['ipAddress'] ?? '127.0.0.1';
                      final rawUserAgent = (item['userAgent'] ?? item['deviceSummary'] ?? 'Web Browser').toString();
                      final deviceTitle = item['device']?.toString() ?? _formatUserAgent(rawUserAgent);
                      final browserDetails = item['browser']?.toString();

                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                        child: Row(
                          children: [
                            // Status Badge & Trusted Indicator
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildStatusBadge(status),
                                if (isTrusted) ...[
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.success.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(100),
                                      border: Border.all(color: AppColors.success.withValues(alpha: 0.25)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.verified_user_rounded, size: 10, color: AppColors.success),
                                        SizedBox(width: 3),
                                        Text(
                                          'account.trusted_device'.tr(ref, fallback: 'Trusted'),
                                          style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: AppColors.success),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(width: 16),

                            // Details
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(
                                        _getDeviceIcon(deviceTitle),
                                        size: 16,
                                        color: AppColors.primary,
                                      ),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          deviceTitle,
                                          style: TextStyle(
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.bold,
                                            color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    '${browserDetails != null ? '$browserDetails • ' : ''}IP: $ip',
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
                              _formatExactTime(timestamp),
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
                  '${'account.showing_records'.tr(ref, fallback: 'Showing')} ${filtered.length} ${'account.of'.tr(ref, fallback: 'of')} $_totalCount ${'account.records'.tr(ref, fallback: 'records')}',
                  style: TextStyle(fontSize: 12.5, color: isDark ? AppColors.gray400 : AppColors.gray600),
                ),
                Row(
                  children: [
                    OutlinedButton(
                      onPressed: _currentPage > 1 ? () => _goToPage(_currentPage - 1) : null,
                      style: OutlinedButton.styleFrom(visualDensity: VisualDensity.compact),
                      child: Text('btn.previous'.tr(ref, fallback: 'Previous')),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${'account.page'.tr(ref, fallback: 'Page')} $_currentPage ${'account.of'.tr(ref, fallback: 'of')} $_totalPages',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: _currentPage < _totalPages ? () => _goToPage(_currentPage + 1) : null,
                      style: OutlinedButton.styleFrom(visualDensity: VisualDensity.compact),
                      child: Text('btn.next'.tr(ref, fallback: 'Next')),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ],
      ),
    ),
  ],
),
);
  }
}
