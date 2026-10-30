import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';

/// Standardized error code reference item displayed to workspace administrators.
/// Contains only the Error Code, Category, Custom Error message, and plain-language Meaning.
class ClientErrorCodeItem {
  final String code;
  final String category;
  final String customError;
  final String meaning;

  const ClientErrorCodeItem({
    required this.code,
    required this.category,
    required this.customError,
    required this.meaning,
  });
}

/// Client Admin Error Codes Reference Directory (`/identity/console/error-codes`) under Security & Audit.
/// 1-to-1 parity with Angular `IdentityErrorCodesComponent`.
class ErrorCodesView extends ConsumerStatefulWidget {
  final Workspace? workspace;
  final VoidCallback? onNavigateToAuditLogs;

  const ErrorCodesView({
    super.key,
    this.workspace,
    this.onNavigateToAuditLogs,
  });

  @override
  ConsumerState<ErrorCodesView> createState() => _ErrorCodesViewState();
}

class _ErrorCodesViewState extends ConsumerState<ErrorCodesView> {
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _tableHorizontalController = ScrollController();

  List<ClientErrorCodeItem> _allCodes = List<ClientErrorCodeItem>.from(_defaultCodes);
  List<ClientErrorCodeItem> _filteredCodes = [];
  List<String> _categories = [];
  String _selectedCategory = 'ALL';
  String _searchQuery = '';

  static const List<ClientErrorCodeItem> _defaultCodes = [
    // Authentication & Identity
    ClientErrorCodeItem(
      code: 'ERR-1001',
      category: 'Authentication & Identity',
      customError: 'Invalid credentials.',
      meaning: 'The email, username, or password entered is incorrect. Verify your login details and try again.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-1002',
      category: 'Authentication & Identity',
      customError: 'Session expired. Please sign in again.',
      meaning: 'Your authentication session has timed out or been signed out. Sign in again to continue.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-1003',
      category: 'Authentication & Identity',
      customError: 'Access denied.',
      meaning: 'Your account does not have permission to perform this action. Contact your workspace administrator.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-1004',
      category: 'Authentication & Identity',
      customError: 'Two-factor verification failed.',
      meaning: 'The security verification code entered is invalid or has expired. Request a new code and try again.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-1005',
      category: 'Authentication & Identity',
      customError: 'Account locked or suspended.',
      meaning: 'This user account is currently restricted or deactivated. Contact your workspace administrator.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-1006',
      category: 'Authentication & Identity',
      customError: 'Password policy requirements not met.',
      meaning: 'The password provided does not meet the workspace security complexity requirements.',
    ),

    // Validation & Request Data
    ClientErrorCodeItem(
      code: 'ERR-2001',
      category: 'Validation & Request Data',
      customError: 'Invalid request data.',
      meaning: 'One or more fields in your submission contain invalid values. Review the form fields and try again.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-2002',
      category: 'Validation & Request Data',
      customError: 'Required information is missing.',
      meaning: 'Mandatory fields were left blank. Complete all required fields before submitting.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-2003',
      category: 'Validation & Request Data',
      customError: 'Duplicate record detected.',
      meaning: 'A record with the same unique identifier, email, or code already exists in your workspace.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-2004',
      category: 'Validation & Request Data',
      customError: 'Requested record not found.',
      meaning: 'The item you are attempting to view, update, or delete could not be found.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-2005',
      category: 'Validation & Request Data',
      customError: 'Operation not allowed in current state.',
      meaning: 'This action cannot be completed because of the item current status or linked dependencies.',
    ),

    // Billing & Payments
    ClientErrorCodeItem(
      code: 'ERR-3001',
      category: 'Billing & Payments',
      customError: 'Paystack unavailable.',
      meaning: 'The Paystack payment channel is temporarily unavailable. Please select another payment method or try again later.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-3002',
      category: 'Billing & Payments',
      customError: 'Flutterwave unavailable.',
      meaning: 'The Flutterwave payment channel is temporarily unavailable. Please select another payment method or try again later.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-3003',
      category: 'Billing & Payments',
      customError: 'Stripe unavailable.',
      meaning: 'The Stripe payment channel is temporarily unavailable. Please select another payment method or try again later.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-3004',
      category: 'Billing & Payments',
      customError: 'Payment verification failed.',
      meaning: 'We could not confirm the payment status with the payment provider. If debited, please contact support with your invoice number.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-3005',
      category: 'Billing & Payments',
      customError: 'Invoice unavailable.',
      meaning: 'The requested invoice could not be found or is no longer eligible for payment.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-3006',
      category: 'Billing & Payments',
      customError: 'Payment gateway not enabled.',
      meaning: 'The selected payment method is not enabled for this workspace.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-3007',
      category: 'Billing & Payments',
      customError: 'Subscription update failed.',
      meaning: 'Your feature subscription could not be updated at this time. Please refresh and try again.',
    ),

    // Workspace & Capabilities
    ClientErrorCodeItem(
      code: 'ERR-4001',
      category: 'Workspace & Capabilities',
      customError: 'Workspace not found.',
      meaning: 'The requested organization workspace could not be resolved. Verify the workspace URL or access code.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-4002',
      category: 'Workspace & Capabilities',
      customError: 'Workspace is currently suspended.',
      meaning: 'Access to this organization workspace is temporarily paused. Please contact billing or platform support.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-4003',
      category: 'Workspace & Capabilities',
      customError: 'Capability not active.',
      meaning: 'This modular feature is not currently active on your workspace plan. Activate it in Workspace Features & Capabilities.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-4004',
      category: 'Workspace & Capabilities',
      customError: 'Workspace quota limit reached.',
      meaning: 'Your organization has reached the maximum allowance for this resource.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-4005',
      category: 'Workspace & Capabilities',
      customError: 'Workspace provisioning failed.',
      meaning: 'The workspace setup encountered an interruption. Please retry in a few moments.',
    ),

    // Communications & AI
    ClientErrorCodeItem(
      code: 'ERR-5001',
      category: 'Communications & AI',
      customError: 'Email dispatch failed.',
      meaning: 'The email notification could not be queued or delivered at this time.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-5002',
      category: 'Communications & AI',
      customError: 'SMS dispatch failed.',
      meaning: 'The SMS alert could not be dispatched. Verify the recipient phone number format.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-5003',
      category: 'Communications & AI',
      customError: 'AI assistant temporarily unavailable.',
      meaning: 'The Ozi AI Studio service is currently busy or unreachable. Please try your prompt again shortly.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-5004',
      category: 'Communications & AI',
      customError: 'Media upload failed.',
      meaning: 'The file could not be uploaded. Ensure the file format and size meet workspace guidelines.',
    ),

    // System & Infrastructure
    ClientErrorCodeItem(
      code: 'ERR-9001',
      category: 'System & Infrastructure',
      customError: 'Service temporarily unavailable.',
      meaning: 'A background service required for this action is temporarily unreachable. Please try again shortly.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-9002',
      category: 'System & Infrastructure',
      customError: 'Request timed out.',
      meaning: 'The operation took longer than expected to respond. Check your connection and try again.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-9003',
      category: 'System & Infrastructure',
      customError: 'Too many requests. Please slow down.',
      meaning: 'Rate limit exceeded for this action. Wait a moment before retrying.',
    ),
    ClientErrorCodeItem(
      code: 'ERR-9999',
      category: 'System & Infrastructure',
      customError: 'An unexpected error occurred.',
      meaning: 'An unexpected system error prevented this request from completing. Reference the error code if contacting support.',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _rebuildCategories();
    _applyFilter();
    _fetchLatestCatalog();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _tableHorizontalController.dispose();
    super.dispose();
  }

  Future<void> _fetchLatestCatalog() async {
    try {
      final repo = ref.read(accountRepositoryProvider);
      final items = await repo.getErrorCodesCatalog();
      if (items.isNotEmpty && mounted) {
        setState(() {
          _allCodes = items
              .map(
                (x) => ClientErrorCodeItem(
                  code: (x['code'] ?? x['Code'] ?? '').toString(),
                  category: (x['category'] ?? x['Category'] ?? '').toString(),
                  customError: (x['customError'] ?? x['CustomError'] ?? '').toString(),
                  meaning: (x['meaning'] ?? x['Meaning'] ?? '').toString(),
                ),
              )
              .where((x) => x.code.isNotEmpty)
              .toList();
          _rebuildCategories();
          _applyFilter();
        });
      }
    } catch (_) {
      // Fallback to built-in catalog
    }
  }

  void _rebuildCategories() {
    final set = <String>{};
    for (final item in _allCodes) {
      if (item.category.isNotEmpty) {
        set.add(item.category);
      }
    }
    _categories = set.toList();
  }

  void _selectCategory(String cat) {
    setState(() {
      _selectedCategory = cat;
      _applyFilter();
    });
  }

  int _countByCategory(String cat) {
    return _allCodes.where((x) => x.category == cat).length;
  }

  void _applyFilter() {
    final q = _searchQuery.trim().toLowerCase();
    _filteredCodes = _allCodes.where((item) {
      if (_selectedCategory != 'ALL' && item.category != _selectedCategory) {
        return false;
      }
      if (q.isEmpty) return true;
      return item.code.toLowerCase().contains(q) ||
          item.category.toLowerCase().contains(q) ||
          item.customError.toLowerCase().contains(q) ||
          item.meaning.toLowerCase().contains(q);
    }).toList();
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Page Header (Responsive Wrap — never overlaps on narrow desktop or mobile)
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.start,
            spacing: 16,
            runSpacing: 12,
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 680),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Breadcrumb
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        InkWell(
                          onTap: widget.onNavigateToAuditLogs,
                          borderRadius: BorderRadius.circular(4),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.security_rounded,
                                size: 15,
                                color: Color(0xFF0050E5),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'nav.security_audit'.tr(
                                  ref,
                                  fallback: 'Security & Audit Logs',
                                ),
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF0050E5),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '/',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: textSecondary,
                          ),
                        ),
                        Text(
                          'nav.error_codes'.tr(ref, fallback: 'Error Codes'),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'err_ref.title'.tr(
                        ref,
                        fallback: 'Standard Error Codes & Meanings',
                      ),
                      style: TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.w800,
                        color: textPrimary,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'err_ref.subtitle'.tr(
                        ref,
                        fallback:
                            'Look up any error code shown in your workspace to understand what it means and how to resolve it.',
                      ),
                      style: TextStyle(
                        fontSize: 13,
                        color: textSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              // Header Action: Audit Logs Button (fixed compact size)
              OutlinedButton.icon(
                onPressed: widget.onNavigateToAuditLogs,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 36),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  side: BorderSide(color: borderColor),
                  backgroundColor: surfaceColor,
                  foregroundColor: textPrimary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                icon: const Icon(
                  Icons.history_rounded,
                  size: 16,
                  color: Color(0xFF0050E5),
                ),
                label: Text(
                  'nav.security_audit'.tr(ref, fallback: 'Audit Logs'),
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),

          // 2. Filter & Search Toolbar Card
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Search Box
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: SizedBox(
                    height: 38,
                    child: TextField(
                      controller: _searchController,
                      onChanged: (val) {
                        setState(() {
                          _searchQuery = val;
                          _applyFilter();
                        });
                      },
                      style: TextStyle(fontSize: 13, color: textPrimary),
                      decoration: InputDecoration(
                        hintText: 'err_ref.search_placeholder'.tr(
                          ref,
                          fallback: 'e.g. ERR-3001 or payment',
                        ),
                        hintStyle: TextStyle(fontSize: 13, color: textSecondary),
                        prefixIcon: Icon(
                          Icons.search_rounded,
                          size: 18,
                          color: textSecondary,
                        ),
                        suffixIcon: _searchQuery.isNotEmpty
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
                                    _searchQuery = '';
                                    _applyFilter();
                                  });
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

                const SizedBox(height: 12),

                // Category Pills (Wraps cleanly across lines on narrow screens)
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildCategoryPill(
                      label:
                          '${'common.all'.tr(ref, fallback: 'All')} (${_allCodes.length})',
                      isActive: _selectedCategory == 'ALL',
                      onTap: () => _selectCategory('ALL'),
                      isDark: isDark,
                      borderColor: borderColor,
                    ),
                    ..._categories.map(
                      (cat) => _buildCategoryPill(
                        label: '$cat (${_countByCategory(cat)})',
                        isActive: _selectedCategory == cat,
                        onTap: () => _selectCategory(cat),
                        isDark: isDark,
                        borderColor: borderColor,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          // 3. Error Codes Table Card
          Container(
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor),
            ),
            clipBehavior: Clip.antiAlias,
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isCompact = constraints.maxWidth < 720;

                if (_filteredCodes.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(
                      vertical: 42,
                      horizontal: 16,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.search_off_rounded,
                          size: 34,
                          color: textSecondary,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'err_ref.no_match'.tr(
                            ref,
                            fallback: 'No matching error code found.',
                          ),
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            color: textSecondary,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                // On mobile / narrow minimized windows, render adaptive table with horizontal scroll
                // so columns never crush or overlap
                final minTableWidth = isCompact ? 760.0 : constraints.maxWidth;

                return Scrollbar(
                  controller: _tableHorizontalController,
                  thumbVisibility: isCompact,
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
                              horizontal: 16,
                              vertical: 12,
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
                                  width: 130,
                                  child: Text(
                                    'err_ref.col_code'
                                        .tr(ref, fallback: 'ERROR CODE')
                                        .toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.4,
                                      color: textSecondary,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                SizedBox(
                                  width: 200,
                                  child: Text(
                                    'err_ref.col_category'
                                        .tr(ref, fallback: 'CATEGORY')
                                        .toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.4,
                                      color: textSecondary,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                SizedBox(
                                  width: 220,
                                  child: Text(
                                    'err_ref.col_custom_error'
                                        .tr(ref, fallback: 'CUSTOM ERROR')
                                        .toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.4,
                                      color: textSecondary,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    'err_ref.col_meaning'
                                        .tr(
                                          ref,
                                          fallback:
                                              'MEANING & RECOMMENDED ACTION',
                                        )
                                        .toUpperCase(),
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
                          ..._filteredCodes.map((item) {
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 13,
                              ),
                              decoration: BoxDecoration(
                                border: Border(
                                  bottom: BorderSide(
                                    color: borderColor.withValues(alpha: 0.6),
                                  ),
                                ),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Error Code Badge
                                  SizedBox(
                                    width: 130,
                                    child: Align(
                                      alignment: Alignment.centerLeft,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF0050E5)
                                              .withValues(alpha: 0.08),
                                          borderRadius:
                                              BorderRadius.circular(6),
                                          border: Border.all(
                                            color: const Color(0xFF0050E5)
                                                .withValues(alpha: 0.22),
                                          ),
                                        ),
                                        child: Text(
                                          item.code,
                                          style: const TextStyle(
                                            fontFamily: 'monospace',
                                            fontSize: 12.5,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF0050E5),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  // Category Badge
                                  SizedBox(
                                    width: 200,
                                    child: Align(
                                      alignment: Alignment.centerLeft,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 9,
                                          vertical: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: isDark
                                              ? const Color(0xFF1E293B)
                                              : const Color(0xFFF1F5F9),
                                          borderRadius:
                                              BorderRadius.circular(999),
                                        ),
                                        child: Text(
                                          item.category,
                                          style: TextStyle(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w700,
                                            color: isDark
                                                ? AppColors.gray300
                                                : const Color(0xFF334155),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  // Custom Error
                                  SizedBox(
                                    width: 220,
                                    child: Text(
                                      item.customError,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: textPrimary,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  // Meaning
                                  Expanded(
                                    child: Text(
                                      item.meaning,
                                      style: TextStyle(
                                        fontSize: 13,
                                        height: 1.45,
                                        color: isDark
                                            ? AppColors.gray300
                                            : const Color(0xFF475569),
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
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryPill({
    required String label,
    required bool isActive,
    required VoidCallback onTap,
    required bool isDark,
    required Color borderColor,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        height: 30,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF0050E5) : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: isActive ? const Color(0xFF0050E5) : borderColor,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: isActive
                ? Colors.white
                : (isDark ? AppColors.gray300 : const Color(0xFF475569)),
          ),
        ),
      ),
    );
  }
}

