import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/services/export_service.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';
import 'widgets/account_security_header.dart';

/// <summary>
/// Screen presenting the server-side paginated "My Activity" operational and security audit history.
/// Provides 1-to-1 parity with the Angular Web Console My Activity tab (/identity/console/account?tab=activity).
///
/// Features:
/// <list type="bullet">
///   <item>Unified 30-day personal activity audit timeline (tasks, security events, authentication).</item>
///   <item>Color-coded severity task badges (Create User, Update Member, Password Changed, Sign-in, 2FA Setup).</item>
///   <item>30-day retention guard banner with 'Contact Administrator' archival retrieval trigger.</item>
///   <item>Server-side pagination with dynamic page size and total records counter.</item>
///   <item>Multi-criteria search (IP, device, action, description, module) and status categorization filters.</item>
///   <item>CSV report export capability.</item>
/// </list>
/// </summary>
class MyActivityView extends ConsumerStatefulWidget {
  /// The active workspace organization context.
  final Workspace? workspace;

  /// Callback to switch account navigation tabs.
  final ValueChanged<String>? onSelectTab;

  /// <summary>Creates an instance of [MyActivityView].</summary>
  const MyActivityView({
    super.key,
    this.workspace,
    this.onSelectTab,
  });

  @override
  ConsumerState<MyActivityView> createState() => _MyActivityViewState();
}

/// Backward compatibility alias for [MyActivityView].
typedef LoginActivityView = MyActivityView;

class _MyActivityViewState extends ConsumerState<MyActivityView> {
  late final ScrollController _scrollController;
  bool _isLoading = true;
  bool _isLoadingMore = false;
  int _currentPage = 1;
  final int _pageSize = 10;
  int _totalCount = 0;
  int _totalPages = 1;
  bool _hasOlderRecords = false;
  String _retentionNotice = '';
  List<Map<String, dynamic>> _items = [];
  String? _errorMessage;

  String _searchQuery = '';
  String _selectedCategory = 'All';

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
    _loadActivity();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  /// <summary>
  /// Listens to scroll events on the parent scrollable and triggers infinite loading
  /// when the user approaches the bottom of the feed on mobile viewports.
  /// </summary>
  void _onScroll() {
    if (!mounted) return;
    final isMobile = MediaQuery.of(context).size.width < 600;
    if (!isMobile) return;

    if (_scrollController.hasClients &&
        _scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 250) {
      _loadMoreActivity();
    }
  }

  /// <summary>
  /// Fetches paginated activity timeline records from the backend with 30-day retention guard.
  /// </summary>
  /// <param name="resetPage">Whether to reset the current page counter back to 1.</param>
  Future<void> _loadActivity({bool resetPage = false}) async {
    if (resetPage) {
      _currentPage = 1;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(accountRepositoryProvider);
      final res = await repo.getMyActivity(page: _currentPage, pageSize: _pageSize);
      final rawList = (res['items'] as List<dynamic>?) ?? [];

      if (mounted) {
        setState(() {
          _items = rawList.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          _totalCount = (res['totalCount'] as num?)?.toInt() ?? _items.length;
          _totalPages = (res['totalPages'] as num?)?.toInt() ?? 1;
          _hasOlderRecords = res['hasOlderRecords'] == true;
          _retentionNotice = (res['retentionNotice'] ?? '').toString();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Unable to load activity records. Please check your connection.';
        });
      }
    }
  }

  /// <summary>
  /// Fetches the next page of audit log entries and appends them to the current list for continuous scrolling on mobile devices.
  /// </summary>
  Future<void> _loadMoreActivity() async {
    if (_isLoading || _isLoadingMore || _currentPage >= _totalPages) return;

    setState(() {
      _isLoadingMore = true;
    });

    try {
      final repo = ref.read(accountRepositoryProvider);
      final nextPage = _currentPage + 1;
      final res = await repo.getMyActivity(page: nextPage, pageSize: _pageSize);
      final rawList = (res['items'] as List<dynamic>?) ?? [];
      final newItems = rawList.map((e) => Map<String, dynamic>.from(e as Map)).toList();

      if (mounted) {
        setState(() {
          _currentPage = nextPage;
          _items.addAll(newItems);
          _totalCount = (res['totalCount'] as num?)?.toInt() ?? _totalCount;
          _totalPages = (res['totalPages'] as num?)?.toInt() ?? _totalPages;
          _isLoadingMore = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingMore = false;
        });
      }
    }
  }

  /// <summary>
  /// Navigates to a specific server page index.
  /// </summary>
  void _goToPage(int page) {
    if (page < 1 || page > _totalPages || page == _currentPage) return;
    setState(() => _currentPage = page);
    _loadActivity();
  }

  /// <summary>
  /// Exports the currently filtered activity trail to a CSV spreadsheet file.
  /// </summary>
  void _handleExportCsv() {
    final filtered = _getFilteredItems();
    final columns = [
      const ExportColumn(key: 'actionType', header: 'Action'),
      const ExportColumn(key: 'description', header: 'Description'),
      const ExportColumn(key: 'module', header: 'Module'),
      const ExportColumn(key: 'ipAddress', header: 'IP Address'),
      const ExportColumn(key: 'deviceSummary', header: 'Device / Client'),
      const ExportColumn(key: 'timestamp', header: 'Date & Time'),
    ];

    ExportService.exportToCsv(
      filename: 'My_Activity_Report_30_Days',
      columns: columns,
      data: filtered,
    );

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            Icon(Icons.check_circle_rounded, color: Colors.white, size: 16),
            SizedBox(width: 8),
            Text('Activity records exported to CSV in your Downloads folder.'),
          ],
        ),
      ),
    );
  }

  /// <summary>
  /// Displays guidance dialog for contacting the workspace Super Administrator for records older than 30 days.
  /// </summary>
  void _showContactAdminDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.support_agent_rounded, color: AppColors.primary, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'account.contact_admin'.tr(ref, fallback: 'Contact Administrator'),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'account.activity_retention_notice'.tr(
                ref,
                fallback: 'Showing activity from the last 30 days. To request archival records older than 1 month, please contact your workspace Administrator.',
              ),
              style: TextStyle(
                fontSize: 13,
                color: isDark ? AppColors.gray300 : const Color(0xFF334155),
                height: 1.45,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Workspace Support Channel',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.email_outlined, size: 14, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Text(
                        widget.workspace?.userEmail ?? 'administrator@workspace.local',
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  /// <summary>
  /// Applies search keyword filter and category chips.
  /// </summary>
  List<Map<String, dynamic>> _getFilteredItems() {
    return _items.where((item) {
      final action = (item['actionType'] ?? item['status'] ?? '').toString();
      final desc = (item['description'] ?? '').toString();
      final module = (item['module'] ?? '').toString();
      final lowerAction = action.toLowerCase();
      final lowerDesc = desc.toLowerCase();

      // Category filter
      if (_selectedCategory == 'Tasks') {
        final isTask = lowerAction.contains('create') ||
            lowerAction.contains('update') ||
            lowerAction.contains('delete') ||
            lowerAction.contains('task') ||
            lowerAction.contains('member') ||
            lowerAction.contains('category');
        if (!isTask) return false;
      } else if (_selectedCategory == 'Security') {
        final isSecurity = lowerAction.contains('password') ||
            lowerAction.contains('2fa') ||
            lowerAction.contains('session') ||
            lowerAction.contains('revoke') ||
            lowerAction.contains('terminate');
        if (!isSecurity) return false;
      } else if (_selectedCategory == 'Authentication') {
        final isAuth = lowerAction.contains('sign-in') ||
            lowerAction.contains('login') ||
            lowerAction.contains('challenge') ||
            lowerAction.contains('auth');
        if (!isAuth) return false;
      }

      // Search query filter
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final ip = (item['ipAddress'] ?? '').toString().toLowerCase();
        final dev = (item['device'] ?? item['userAgent'] ?? item['deviceSummary'] ?? '').toString().toLowerCase();
        if (!ip.contains(q) &&
            !dev.contains(q) &&
            !lowerAction.contains(q) &&
            !lowerDesc.contains(q) &&
            !module.toLowerCase().contains(q)) {
          return false;
        }
      }

      return true;
    }).toList();
  }

  /// <summary>
  /// Formats raw timestamp to exact local date and time string (MMM d, yyyy • h:mm a).
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

  /// <summary>
  /// Formats raw timestamp to concise local date and time string (MMM d • h:mm a or h:mm a for today).
  /// </summary>
  String _formatShortTime(dynamic raw) {
    if (raw == null) return '—';
    final str = raw.toString().trim();
    if (str.isEmpty || str == 'Just now') return str;
    final dt = DateTime.tryParse(str);
    if (dt == null) return str;
    final localDt = dt.toLocal();
    final now = DateTime.now();
    if (localDt.year == now.year && localDt.month == now.month && localDt.day == now.day) {
      return DateFormat('h:mm a').format(localDt);
    }
    return DateFormat('MMM d • h:mm a').format(localDt);
  }

  /// <summary>
  /// Displays a comprehensive bottom sheet modal presenting the full audit log telemetry,
  /// complete parameter change sets, client agent details, and network metadata.
  /// </summary>
  /// <param name="item">The activity audit item payload.</param>
  void _showActivityDetailModal(Map<String, dynamic> item) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final action = (item['actionType'] ?? item['status'] ?? 'Operational Task').toString();
    final description = (item['description'] ?? item['actionType'] ?? action).toString();
    final module = (item['module'] ?? 'System').toString();
    final isTrusted = item['isTrusted'] == true || action.contains('Trusted');
    final timestamp = item['timestamp'] ?? item['date'] ?? 'Just now';
    final ip = item['ipAddress'] ?? '127.0.0.1';
    final rawUserAgent = (item['userAgent'] ?? item['deviceSummary'] ?? 'Web Browser').toString();
    final deviceTitle = item['device']?.toString() ?? _formatUserAgent(rawUserAgent);
    final browserDetails = item['browser']?.toString();
    final exactTime = _formatExactTime(timestamp);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) {
        return Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 560),
            margin: EdgeInsets.only(
              bottom: MediaQuery.of(modalContext).viewInsets.bottom,
            ),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 20,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Pull Handle
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Header: Badges & Close Button
                    Row(
                      children: [
                        _buildActivityBadge(action, module: module),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: isDark ? const Color(0xFF475569) : const Color(0xFFE2E8F0)),
                          ),
                          child: Text(
                            module,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: isDark ? AppColors.gray300 : const Color(0xFF475569),
                            ),
                          ),
                        ),
                        if (isTrusted) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(100),
                              border: Border.all(color: AppColors.success.withValues(alpha: 0.25)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.verified_user_rounded, size: 11, color: AppColors.success),
                                SizedBox(width: 4),
                                Text(
                                  'Trusted',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.success),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => Navigator.of(modalContext).pop(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Event Full Title / Description Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'AUDIT LOG RECORD',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.8,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          SelectableText(
                            description,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                              height: 1.45,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Key Telemetry Tiles
                    _buildModalTile(
                      icon: Icons.schedule_rounded,
                      label: 'Timestamp & Execution Time',
                      value: exactTime,
                      isDark: isDark,
                    ),
                    _buildModalTile(
                      icon: Icons.devices_rounded,
                      label: 'Client Device & Platform',
                      value: browserDetails != null && browserDetails.isNotEmpty ? '$deviceTitle • $browserDetails' : deviceTitle,
                      isDark: isDark,
                    ),
                    _buildModalTile(
                      icon: Icons.language_rounded,
                      label: 'IP Address',
                      value: ip,
                      isDark: isDark,
                      trailing: IconButton(
                        icon: const Icon(Icons.copy_rounded, size: 16),
                        tooltip: 'Copy IP',
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: ip));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('IP address copied to clipboard')),
                          );
                        },
                      ),
                    ),
                    _buildModalTile(
                      icon: Icons.category_rounded,
                      label: 'System Module',
                      value: module,
                      isDark: isDark,
                    ),

                    const SizedBox(height: 20),

                    // Close Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => Navigator.of(modalContext).pop(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                          foregroundColor: isDark ? Colors.white : const Color(0xFF1E293B),
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('Close', style: TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  /// <summary>
  /// Builds a key-value detail tile for the activity bottom sheet modal.
  /// </summary>
  Widget _buildModalTile({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
    Widget? trailing,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: isDark ? AppColors.gray400 : AppColors.gray500,
                  ),
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
          ),
          ?trailing,
        ],
      ),
    );
  }

  String _formatUserAgent(String ua) {
    if (ua.contains('BCC-Client') || ua.contains('Flutter')) {
      final isMobile = ua.contains('Mobile') || ua.contains('Android') || ua.contains('iOS');
      final os = ua.contains('Windows')
          ? 'Windows'
          : (ua.contains('macOS')
              ? 'macOS'
              : (ua.contains('Linux')
                  ? 'Linux'
                  : (ua.contains('Android') ? 'Android' : 'iOS')));
      return isMobile ? 'Mobile App on $os' : 'Desktop App on $os';
    }
    if (ua.contains('Edge') || ua.contains('Edg/') || ua.contains('Edg')) return 'Microsoft Edge on Windows';
    if (ua.contains('Chrome')) return 'Google Chrome on Windows';
    if (ua.contains('Firefox')) return 'Mozilla Firefox on Windows';
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

  /// <summary>
  /// Resolves a concise badge label from verbose action descriptions.
  /// Prevents long action strings from ballooning badge pill widths.
  /// </summary>
  String _getCleanBadgeLabel(String rawAction, String module) {
    final lower = rawAction.toLowerCase();
    if (lower.contains('mfa') || lower.contains('2fa') || lower.contains('authenticator')) return 'MFA / 2FA';
    if (lower.contains('password')) return 'Password';
    if (lower.contains('session') || lower.contains('revoke') || lower.contains('terminate')) return 'Session';
    if (lower.contains('sign-in') || lower.contains('signed in') || lower.contains('login') || lower.contains('auth')) return 'Sign-in';
    if (lower.contains('kpi') || lower.contains('evaluation') || lower.contains('score')) return 'KPI / Eval';
    if (lower.contains('create') || lower.contains('add') || lower.contains('register')) return 'Create';
    if (lower.contains('update') || lower.contains('edit') || lower.contains('modify')) return 'Update';
    if (lower.contains('delete') || lower.contains('remove')) return 'Delete';
    if (rawAction.length <= 14) return rawAction;
    if (module.isNotEmpty && module != 'System' && module.length <= 15) return module;
    return 'Operation';
  }

  /// <summary>
  /// Builds action badge with color-coded severity pill matching Web.
  /// Constrained to maximum width with text ellipsis to prevent horizontal overflow.
  /// </summary>
  Widget _buildActivityBadge(String rawAction, {String module = 'System'}) {
    final label = _getCleanBadgeLabel(rawAction, module);
    final lower = rawAction.toLowerCase();
    Color bg;
    Color fg;
    IconData icon;

    if (lower.contains('password') || lower.contains('2fa') || lower.contains('mfa') || lower.contains('revoke')) {
      // Security Event: Amber/Warning
      bg = const Color(0xFFD97706).withValues(alpha: 0.12);
      fg = const Color(0xFFD97706);
      icon = Icons.shield_rounded;
    } else if (lower.contains('create') || lower.contains('add') || lower.contains('register')) {
      // Operational Creation: Indigo/Royal Blue
      bg = AppColors.primary.withValues(alpha: 0.12);
      fg = AppColors.primary;
      icon = Icons.add_circle_rounded;
    } else if (lower.contains('update') || lower.contains('edit') || lower.contains('modify')) {
      // Operational Update: Sky Blue
      bg = const Color(0xFF0284C7).withValues(alpha: 0.12);
      fg = const Color(0xFF0284C7);
      icon = Icons.edit_note_rounded;
    } else if (lower.contains('delete') || lower.contains('fail') || lower.contains('denied') || lower.contains('terminated')) {
      // Danger / Rejection: Red
      bg = AppColors.error.withValues(alpha: 0.12);
      fg = AppColors.error;
      icon = Icons.cancel_rounded;
    } else if (lower.contains('success') || lower.contains('sign-in') || lower.contains('login') || lower.contains('granted')) {
      // Authentication / Success: Green
      bg = AppColors.success.withValues(alpha: 0.12);
      fg = AppColors.success;
      icon = Icons.check_circle_rounded;
    } else {
      // General Task / System: Neutral Slate
      bg = const Color(0xFF64748B).withValues(alpha: 0.12);
      fg = const Color(0xFF475569);
      icon = Icons.task_alt_rounded;
    }

    return Container(
      constraints: const BoxConstraints(maxWidth: 110),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(100),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: fg),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: fg),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isMobile = MediaQuery.of(context).size.width < 600;
    final filtered = _getFilteredItems();

    return SingleChildScrollView(
      controller: _scrollController,
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 16 : 24,
        vertical: 20,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Unified Account Header & Navigation Tabs
          AccountSecurityHeader(
            activeTab: 'activity',
            onSelectTab: widget.onSelectTab,
            workspace: widget.workspace,
          ),
          const SizedBox(height: 20),

          // 2. Section Card matching Web .card-section
          AccountSectionCard(
            icon: Icons.history_rounded,
            title: 'account.tab_activity'.tr(ref, fallback: 'My Activity'),
            description: 'account.activity_desc'.tr(
              ref,
              fallback: 'Audit trail of tasks, operational changes, and security events performed by your account over the last 30 days.',
            ),
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
                  onPressed: () => _loadActivity(resetPage: true),
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
                // 30-Day Retention Notice Banner
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.schedule_rounded, color: AppColors.primary, size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _retentionNotice.isNotEmpty
                                  ? _retentionNotice
                                  : 'account.activity_retention_notice'.tr(
                                      ref,
                                      fallback: 'Showing activity from the last 30 days. To request archival records older than 1 month, please contact your workspace Administrator.',
                                    ),
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                                color: isDark ? AppColors.onSurfaceDark : const Color(0xFF1E293B),
                              ),
                            ),
                            if (_hasOlderRecords) ...[
                              const SizedBox(height: 2),
                              Text(
                                'Archival records older than 30 days exist in deep retention.',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      TextButton.icon(
                        onPressed: _showContactAdminDialog,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          backgroundColor: AppColors.primary.withValues(alpha: 0.08),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        icon: const Icon(Icons.support_agent_rounded, size: 16, color: AppColors.primary),
                        label: Text(
                          'account.contact_admin'.tr(ref, fallback: 'Contact Admin'),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // Search and Filters Bar
                LayoutBuilder(
                  builder: (context, searchConstraints) {
                    final isTight = searchConstraints.maxWidth < 680;
                    if (isTight) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(
                            decoration: InputDecoration(
                              labelText: 'account.search_logs'.tr(ref, fallback: 'Search logs'),
                              hintText: 'account.search_placeholder'.tr(ref, fallback: 'Search by action, description, IP, or device...'),
                              prefixIcon: const Icon(Icons.search, size: 20),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            ),
                            onChanged: (val) => setState(() => _searchQuery = val),
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              {'key': 'All', 'label': 'status.all'.tr(ref, fallback: 'All')},
                              {'key': 'Tasks', 'label': 'Tasks'},
                              {'key': 'Security', 'label': 'Security'},
                              {'key': 'Authentication', 'label': 'Sign-ins'},
                            ].map((st) {
                              final isSelected = _selectedCategory == st['key'];
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
                                  if (val) setState(() => _selectedCategory = st['key']!);
                                },
                              );
                            }).toList(),
                          ),
                        ],
                      );
                    }
                    return Row(
                      children: [
                        Expanded(
                          child: TextField(
                            decoration: InputDecoration(
                              labelText: 'account.search_logs'.tr(ref, fallback: 'Search logs'),
                              hintText: 'account.search_placeholder'.tr(ref, fallback: 'Search by action, description, IP, or device...'),
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
                            {'key': 'Tasks', 'label': 'Tasks'},
                            {'key': 'Security', 'label': 'Security'},
                            {'key': 'Authentication', 'label': 'Sign-ins'},
                          ].map((st) {
                            final isSelected = _selectedCategory == st['key'];
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
                                if (val) setState(() => _selectedCategory = st['key']!);
                              },
                            );
                          }).toList(),
                        ),
                      ],
                    );
                  },
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
                        TextButton(onPressed: _loadActivity, child: Text('btn.retry'.tr(ref, fallback: 'Retry'))),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Loading State
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
                        Text(
                          'account.no_history'.tr(ref, fallback: 'No Activity Recorded in the Last 30 Days'),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Tasks, operational updates, and security events performed by your account will display here.',
                          style: TextStyle(fontSize: 13, color: isDark ? AppColors.gray400 : AppColors.gray600),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  // Activity Timeline Cards
                  Container(
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: filtered.length,
                      separatorBuilder: (_, index) => Divider(
                        height: 1,
                        color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                      ),
                      itemBuilder: (context, index) {
                        final item = filtered[index];
                        final action = (item['actionType'] ?? item['status'] ?? 'Operational Task').toString();
                        final description = (item['description'] ?? item['actionType'] ?? action).toString();
                        final module = (item['module'] ?? 'System').toString();
                        final timestamp = item['timestamp'] ?? item['date'] ?? 'Just now';
                        final ip = item['ipAddress'] ?? '127.0.0.1';
                        final rawUserAgent = (item['userAgent'] ?? item['deviceSummary'] ?? 'Web Browser').toString();
                        final deviceTitle = item['device']?.toString() ?? _formatUserAgent(rawUserAgent);

                        return Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => _showActivityDetailModal(item),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // 1. Action Badge
                                  _buildActivityBadge(action, module: module),
                                  const SizedBox(width: 12),

                                  // 2. Main Content (Clean & Minimized)
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Clean description / title (max 2 lines)
                                        Text(
                                          description,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                            height: 1.35,
                                          ),
                                        ),
                                        const SizedBox(height: 5),

                                        // Metadata subtitle (Device • IP • Short Timestamp)
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Icon(
                                                    _getDeviceIcon(deviceTitle),
                                                    size: 12,
                                                    color: isDark ? AppColors.gray400 : AppColors.gray500,
                                                  ),
                                                  const SizedBox(width: 4),
                                                  Flexible(
                                                    child: Text(
                                                      '$deviceTitle • $ip',
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                      style: TextStyle(
                                                        fontSize: 11,
                                                        color: isDark ? AppColors.gray400 : AppColors.gray500,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              _formatShortTime(timestamp),
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w500,
                                                color: isDark ? AppColors.gray400 : AppColors.gray600,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),

                                  const SizedBox(width: 6),

                                  // Tappable Chevron indicator
                                  Icon(
                                    Icons.chevron_right_rounded,
                                    size: 18,
                                    color: isDark ? AppColors.gray500 : AppColors.gray400,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Server-Side Pagination Controls (Desktop) vs Infinite Scroll Indicator (Mobile)
                  if (!isMobile) ...[
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
                  ] else ...[
                    // Mobile Infinite Scroll Loading Indicator & End-of-Feed Status
                    if (_isLoadingMore)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Center(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Text(
                                'account.loading_more'.tr(ref, fallback: 'Loading older activity...'),
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w500,
                                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    else if (_currentPage >= _totalPages && _items.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Center(
                          child: Text(
                            'account.all_records_loaded'.tr(
                              ref,
                              fallback: 'Showing all ${_items.length} records from the last 30 days',
                            ),
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? AppColors.gray400 : AppColors.gray500,
                            ),
                          ),
                        ),
                      ),
                  ],
                ],
              ],
            ),
          ),
          // Safe bottom spacing to avoid floating AI assistant button from obstructing list content
          const SizedBox(height: 80),
        ],
      ),
    );
  }
}
