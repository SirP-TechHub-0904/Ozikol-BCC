import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../../../core/models/suite_info_catalog.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';

/// Workspace Features & Capabilities Directory view (`/billing/features`).
/// 1-to-1 operational and visual parity with Angular `BillingConsoleComponent` (activePage == 'features').
class SubscriptionPlansView extends ConsumerStatefulWidget {
  final Workspace? workspace;
  final VoidCallback? onNavigateToSubscriptions;
  final ValueChanged<String>? onOpenInvoice;

  const SubscriptionPlansView({
    super.key,
    this.workspace,
    this.onNavigateToSubscriptions,
    this.onOpenInvoice,
  });

  @override
  ConsumerState<SubscriptionPlansView> createState() => _SubscriptionPlansViewState();
}

class _SubscriptionPlansViewState extends ConsumerState<SubscriptionPlansView> {
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _tableHorizontalController = ScrollController();

  bool _isLoading = false;
  String? _togglingFeatureCode;
  String? _payingFeatureCode;

  String _featuresTab = 'simple'; // 'simple' | 'detailed'
  String _viewMode = 'cards'; // 'cards' | 'table'

  String _searchQuery = '';
  String _selectedSuite = '';
  String _statusFilter = 'all'; // 'all' | 'active' | 'not_active' | 'coming_soon'
  final String _availabilityFilter = 'all'; // 'all' | 'available' | 'coming_soon'
  final String _tierFilter = 'all'; // 'all' | 'compulsory' | 'optional'

  final String _sortColumn = 'serialNo';
  final bool _sortAsc = true;

  Map<String, dynamic> _snapshot = {};
  Map<String, dynamic>? _selectedFeatureDetail;

  @override
  void initState() {
    super.initState();
    _loadSnapshot();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _tableHorizontalController.dispose();
    super.dispose();
  }

  Future<void> _loadSnapshot() async {
    setState(() => _isLoading = true);
    try {
      final repo = ref.read(accountRepositoryProvider);
      final data = await repo.getBillingFeaturesSnapshot();
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _snapshot = data;
        if (_selectedFeatureDetail != null) {
          final code = (_selectedFeatureDetail!['featureCode'] ?? '').toString();
          final refreshed = _allOrderedFeatures.firstWhere(
            (f) => (f['featureCode'] ?? '').toString().toLowerCase() == code.toLowerCase(),
            orElse: () => {},
          );
          if (refreshed.isNotEmpty) {
            _selectedFeatureDetail = refreshed;
          }
        }
      });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String get _currencySymbol => (_snapshot['currencySymbol'] ?? '₦').toString();
  String get _currencyCode => (_snapshot['currencyCode'] ?? 'NGN').toString();

  String _formatAmount(dynamic amount) {
    final val = double.tryParse(amount?.toString() ?? '') ?? 0.0;
    return '$_currencySymbol${val.toStringAsFixed(2)}';
  }

  double _getFeatureDisplayAmount(Map<String, dynamic> feat) {
    final eff = double.tryParse(feat['effectivePrice']?.toString() ?? '');
    if (eff != null && eff > 0) return eff;
    final mon = double.tryParse(feat['monthlyPrice']?.toString() ?? '');
    if (mon != null && mon > 0) return mon;
    final yr = double.tryParse(feat['yearlyPrice']?.toString() ?? '');
    if (yr != null && yr > 0) return yr;
    return 0.0;
  }

  bool _isFeatureExpiringWithinMonth(Map<String, dynamic> feat) {
    if (feat['isActive'] != true) return false;
    if (_getFeatureDisplayAmount(feat) <= 0) return false;
    if (feat['status'] == 'Expired') return true;
    final days = int.tryParse(feat['daysRemaining']?.toString() ?? '');
    return days != null && days <= 30;
  }

  String _getFeatureDurationLabel(Map<String, dynamic> feat) {
    final amt = _getFeatureDisplayAmount(feat);
    if (amt <= 0) return 'Lifetime / Free';
    final cadence = (feat['billingCadence'] ?? '').toString().trim().toLowerCase();
    if (cadence == 'yearly' || ((feat['monthlyPrice'] ?? 0) <= 0 && (feat['yearlyPrice'] ?? 0) > 0)) {
      return 'Yearly';
    }
    if (cadence == 'quarterly') return 'Quarterly';
    return 'Monthly';
  }

  String _getSuiteLetter(String category) {
    const suites = [
      'Executive Command',
      'User Management & Membership',
      'Identity, Access & Security',
      'Communication & Messaging',
      'Events & Operations',
      'Finance & Payments',
      'Content, Media & Resources',
      'Data, Analytics & Reporting',
      'Integration, API & Webhooks',
      'Customization & Theming',
      'Compliance & Audit',
      'Workflows & Automations',
      'Subscription & Feature Billing',
    ];
    final int idx = suites.indexWhere((s) => s.toLowerCase() == category.trim().toLowerCase());
    if (idx >= 0 && idx < 26) {
      return String.fromCharCode(65 + idx);
    }
    return '•';
  }

  List<Map<String, dynamic>> get _allOrderedFeatures {
    final inc = (_snapshot['included'] as List<dynamic>?) ?? [];
    final sub = (_snapshot['subscribed'] as List<dynamic>?) ?? [];
    final ava = (_snapshot['available'] as List<dynamic>?) ?? [];
    final combined = [...inc, ...sub, ...ava];

    final byCode = <String, Map<String, dynamic>>{};
    for (final item in combined) {
      if (item is Map) {
        final map = Map<String, dynamic>.from(item);
        final code = (map['featureCode'] ?? '').toString().toLowerCase();
        if (code.isNotEmpty && map['isPublished'] != false) {
          byCode[code] = map;
        }
      }
    }

    final list = byCode.values.toList();
    list.sort((a, b) {
      final aSuite = (a['suiteSortOrder'] as num?)?.toInt() ?? 99;
      final bSuite = (b['suiteSortOrder'] as num?)?.toInt() ?? 99;
      if (aSuite != bSuite) return aSuite.compareTo(bSuite);
      final aOrder = (a['sortOrder'] as num?)?.toInt() ?? 999;
      final bOrder = (b['sortOrder'] as num?)?.toInt() ?? 999;
      if (aOrder != bOrder) return aOrder.compareTo(bOrder);
      return (a['name'] ?? '').toString().compareTo((b['name'] ?? '').toString());
    });

    for (var i = 0; i < list.length; i++) {
      list[i]['serialNo'] = (list[i]['sortOrder'] as num?)?.toInt() ?? (i + 1);
      list[i]['suiteLetter'] = _getSuiteLetter((list[i]['category'] ?? '').toString());
    }
    return list;
  }

  List<Map<String, dynamic>> get _filteredFeatures {
    final term = _searchQuery.trim().toLowerCase();
    final list = _allOrderedFeatures.where((f) {
      if (term.isNotEmpty) {
        final n = (f['name'] ?? '').toString().toLowerCase();
        final c = (f['featureCode'] ?? '').toString().toLowerCase();
        final cat = (f['category'] ?? '').toString().toLowerCase();
        final d = (f['description'] ?? '').toString().toLowerCase();
        if (!n.contains(term) && !c.contains(term) && !cat.contains(term) && !d.contains(term)) {
          return false;
        }
      }
      if (_selectedSuite.isNotEmpty &&
          (f['category'] ?? '').toString().toLowerCase() != _selectedSuite.toLowerCase()) {
        return false;
      }
      if (_statusFilter == 'active' && f['isActive'] != true) return false;
      if (_statusFilter == 'not_active' && (f['isActive'] == true || f['isAvailableForUse'] != true)) {
        return false;
      }
      if (_statusFilter == 'coming_soon' && f['isAvailableForUse'] == true) return false;

      if (_availabilityFilter == 'available' && f['isAvailableForUse'] != true) return false;
      if (_availabilityFilter == 'coming_soon' && f['isAvailableForUse'] == true) return false;

      if (_tierFilter == 'compulsory' && f['isCompulsory'] != true) return false;
      if (_tierFilter == 'optional' && f['isCompulsory'] == true) return false;

      return true;
    }).toList();

    list.sort((a, b) {
      int cmp = 0;
      switch (_sortColumn) {
        case 'serialNo':
          cmp = ((a['serialNo'] as num?) ?? 0).compareTo((b['serialNo'] as num?) ?? 0);
          break;
        case 'name':
          cmp = (a['name'] ?? '').toString().compareTo((b['name'] ?? '').toString());
          break;
        case 'suite':
          cmp = (a['category'] ?? '').toString().compareTo((b['category'] ?? '').toString());
          break;
        case 'amount':
          cmp = _getFeatureDisplayAmount(a).compareTo(_getFeatureDisplayAmount(b));
          break;
        default:
          cmp = ((a['serialNo'] as num?) ?? 0).compareTo((b['serialNo'] as num?) ?? 0);
      }
      return _sortAsc ? cmp : -cmp;
    });

    return list;
  }

  List<String> get _distinctSuites {
    final set = <String>{};
    for (final f in _allOrderedFeatures) {
      final cat = (f['category'] ?? '').toString().trim();
      if (cat.isNotEmpty) set.add(cat);
    }
    return set.toList();
  }

  Future<void> _toggleFeature(Map<String, dynamic> feat, bool targetActive) async {
    final code = (feat['featureCode'] ?? '').toString();
    final id = (feat['featureId'] ?? '').toString();
    final name = (feat['name'] ?? code).toString();

    if (feat['isAvailableForUse'] != true && targetActive) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('\'$name\' is Coming Soon and not yet available for installation.')),
      );
      return;
    }

    if (targetActive && feat['isCompulsory'] != true && _getFeatureDisplayAmount(feat) > 0 && feat['isEligibleForFreeTrial'] != true) {
      _payAndRenewFeature(feat);
      return;
    }

    setState(() => _togglingFeatureCode = code);
    final repo = ref.read(accountRepositoryProvider);
    final res = await repo.toggleBillingFeatureActive(
      featureId: id,
      featureCode: code,
      setActive: targetActive,
    );

    if (!mounted) return;
    setState(() => _togglingFeatureCode = null);

    if (res['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF059669),
          content: Text(res['message']?.toString() ??
              (targetActive ? '\'$name\' is now Active.' : '\'$name\' deactivated.')),
        ),
      );
      _loadSnapshot();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFFDC2626),
          content: Text(res['message']?.toString() ?? 'Update failed.'),
        ),
      );
    }
  }

  Future<void> _payAndRenewFeature(Map<String, dynamic> feat) async {
    final code = (feat['featureCode'] ?? '').toString();
    setState(() => _payingFeatureCode = code);

    final repo = ref.read(accountRepositoryProvider);
    final res = await repo.prepareBillingInvoice(
      featureCodes: [code],
      cadence: feat['billingCadence']?.toString() ?? 'Monthly',
    );

    if (!mounted) return;
    setState(() => _payingFeatureCode = null);

    if (res['success'] == true && res['invoiceId'] != null) {
      final invId = res['invoiceId'].toString();
      if (widget.onOpenInvoice != null) {
        widget.onOpenInvoice!(invId);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF0050E5),
            content: Text('Invoice ${res['invoiceNumber'] ?? invId} generated.'),
          ),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFFDC2626),
          content: Text(res['message']?.toString() ?? 'Could not generate invoice.'),
        ),
      );
    }
  }

  IconData _getFeatureIcon(String? iconName) {
    switch (iconName?.toLowerCase()) {
      case 'chat': return Icons.chat_rounded;
      case 'groups': return Icons.groups_rounded;
      case 'school': return Icons.school_rounded;
      case 'feedback': return Icons.feedback_rounded;
      case 'calendar_month': return Icons.calendar_month_rounded;
      case 'dynamic_form': return Icons.dynamic_form_rounded;
      case 'confirmation_number': return Icons.confirmation_number_rounded;
      case 'receipt_long': return Icons.receipt_long_rounded;
      case 'storefront': return Icons.storefront_rounded;
      case 'smart_toy': return Icons.smart_toy_rounded;
      case 'campaign': return Icons.campaign_rounded;
      case 'folder_zip': return Icons.folder_zip_rounded;
      case 'desktop_windows': return Icons.desktop_windows_rounded;
      case 'security': return Icons.security_rounded;
      default: return Icons.extension_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : Colors.white;
    final borderColor = isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0);
    final textPrimary = isDark ? Colors.white : const Color(0xFF0F172A);
    final textSecondary = isDark ? AppColors.gray400 : const Color(0xFF64748B);

    if (_selectedFeatureDetail != null) {
      return _buildFeatureDetailView(isDark, surfaceColor, borderColor, textPrimary, textSecondary);
    }

    final all = _allOrderedFeatures;
    final activeCount = all.where((f) => f['isActive'] == true).length;
    final availableCount = all.where((f) => f['isAvailableForUse'] == true).length;
    final comingCount = all.where((f) => f['isAvailableForUse'] != true).length;
    final compulsoryCount = all.where((f) => f['isCompulsory'] == true).length;
    final monthlyTotal = double.tryParse(_snapshot['totalRecurringMonthly']?.toString() ?? '') ?? 0.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top Header (Responsive Wrap)
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
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        Text('Command Center', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: textSecondary)),
                        Text('/', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: textSecondary)),
                        Text('Billing & Subscriptions', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: textSecondary)),
                        Text('/', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: textSecondary)),
                        Text('Workspace Features & Capabilities', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0050E5))),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Workspace Features & Capabilities',
                          style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: textPrimary, letterSpacing: -0.3),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.info_outline_rounded, size: 18, color: Color(0xFF64748B)),
                          tooltip: 'About Workspace Features',
                          splashRadius: 16,
                          onPressed: () => SuiteInfoCatalog.show(context, 'billing_subscriptions'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Install and activate modular capabilities for your workspace. Installed capabilities appear immediately in your navigation drawer.',
                      style: TextStyle(fontSize: 13, color: textSecondary),
                    ),
                  ],
                ),
              ),

              // Header Action Buttons
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0050E5).withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF0050E5).withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.payments_outlined, size: 15, color: Color(0xFF0050E5)),
                        const SizedBox(width: 5),
                        Text('$_currencyCode ($_currencySymbol)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0050E5))),
                      ],
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: _isLoading ? null : _loadSnapshot,
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 36),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      side: BorderSide(color: borderColor),
                      backgroundColor: surfaceColor,
                      foregroundColor: textPrimary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: _isLoading
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0050E5)))
                        : const Icon(Icons.refresh_rounded, size: 16, color: Color(0xFF0050E5)),
                    label: Text('audit.refresh'.tr(ref, fallback: 'Refresh'), style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 18),

          // 2-Mode Tab Switcher (Simple View vs Detailed View)
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: borderColor),
            ),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _buildModeTabButton(
                  title: 'Simple View',
                  icon: Icons.checklist_rounded,
                  badgeText: '$activeCount Active / ${all.length}',
                  isActive: _featuresTab == 'simple',
                  onTap: () => setState(() => _featuresTab = 'simple'),
                  isDark: isDark,
                ),
                _buildModeTabButton(
                  title: 'Detailed View',
                  icon: Icons.dashboard_customize_rounded,
                  badgeText: '${_distinctSuites.length} Suites',
                  isActive: _featuresTab == 'detailed',
                  onTap: () => setState(() => _featuresTab = 'detailed'),
                  isDark: isDark,
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Detailed View 5-KPI Cards
          if (_featuresTab == 'detailed') ...[
            LayoutBuilder(
              builder: (context, constraints) {
                final cardWidth = constraints.maxWidth > 900
                    ? (constraints.maxWidth - 48) / 5
                    : constraints.maxWidth > 580
                        ? (constraints.maxWidth - 24) / 3
                        : constraints.maxWidth;
                return Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _buildKpiCard('Suites', '${_distinctSuites.length}', 'Canonical Suites', '$activeCount Installed', Icons.category_rounded, const Color(0xFF0050E5), cardWidth, surfaceColor, borderColor, textPrimary, textSecondary),
                    _buildKpiCard('Capabilities', '${all.length}', 'Total Modules', '$compulsoryCount Core Baseline', Icons.extension_rounded, const Color(0xFF7C3AED), cardWidth, surfaceColor, borderColor, textPrimary, textSecondary),
                    _buildKpiCard('Available', '$availableCount', 'Ready to Install', '$activeCount Active in Menu', Icons.verified_rounded, const Color(0xFF059669), cardWidth, surfaceColor, borderColor, textPrimary, textSecondary),
                    _buildKpiCard('Coming Soon', '$comingCount', 'In Central Rollout', 'Scheduled Release', Icons.schedule_rounded, const Color(0xFFD97706), cardWidth, surfaceColor, borderColor, textPrimary, textSecondary),
                    _buildKpiCard('Active Spend', _formatAmount(monthlyTotal), 'Monthly Total', 'Per Tenant Plan', Icons.workspace_premium_rounded, const Color(0xFF0D9488), cardWidth, surfaceColor, borderColor, textPrimary, textSecondary),
                  ],
                );
              },
            ),
            const SizedBox(height: 16),
          ],

          // Toolbar Filters Card (Search, Suite filter, Status filter, Reset)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor),
            ),
            child: Wrap(
              spacing: 10,
              runSpacing: 10,
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    // Search
                    ConstrainedBox(
                      constraints: const BoxConstraints(minWidth: 180, maxWidth: 280),
                      child: SizedBox(
                        height: 36,
                        child: TextField(
                          controller: _searchController,
                          onChanged: (v) => setState(() => _searchQuery = v),
                          style: TextStyle(fontSize: 12.5, color: textPrimary),
                          decoration: InputDecoration(
                            hintText: 'Search feature or suite...',
                            hintStyle: TextStyle(fontSize: 12, color: textSecondary),
                            prefixIcon: Icon(Icons.search_rounded, size: 16, color: textSecondary),
                            suffixIcon: _searchQuery.isNotEmpty
                                ? IconButton(
                                    icon: Icon(Icons.close_rounded, size: 15, color: textSecondary),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() => _searchQuery = '');
                                    },
                                  )
                                : null,
                            filled: true,
                            fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                            contentPadding: EdgeInsets.zero,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: borderColor)),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: borderColor)),
                          ),
                        ),
                      ),
                    ),

                    // Suite Select
                    Container(
                      height: 36,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: borderColor),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedSuite.isEmpty ? '' : _selectedSuite,
                          dropdownColor: surfaceColor,
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: textPrimary),
                          onChanged: (val) => setState(() => _selectedSuite = val ?? ''),
                          items: [
                            DropdownMenuItem(value: '', child: Text('All Suites (${_distinctSuites.length})')),
                            ..._distinctSuites.map((s) => DropdownMenuItem(value: s, child: Text('Suite ${_getSuiteLetter(s)}: $s'))),
                          ],
                        ),
                      ),
                    ),

                    // Status Select
                    Container(
                      height: 36,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: borderColor),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _statusFilter,
                          dropdownColor: surfaceColor,
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: textPrimary),
                          onChanged: (val) => setState(() => _statusFilter = val ?? 'all'),
                          items: [
                            DropdownMenuItem(value: 'all', child: Text('All Status (${all.length})')),
                            DropdownMenuItem(value: 'active', child: Text('Active / Installed ($activeCount)')),
                            DropdownMenuItem(value: 'not_active', child: Text('Available — Not Active (${availableCount - activeCount})')),
                            DropdownMenuItem(value: 'coming_soon', child: Text('Coming Soon ($comingCount)')),
                          ],
                        ),
                      ),
                    ),

                    // Reset
                    if (_searchQuery.isNotEmpty || _selectedSuite.isNotEmpty || _statusFilter != 'all')
                      OutlinedButton.icon(
                        onPressed: () {
                          _searchController.clear();
                          setState(() {
                            _searchQuery = '';
                            _selectedSuite = '';
                            _statusFilter = 'all';
                          });
                        },
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, 36),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          side: BorderSide(color: borderColor),
                        ),
                        icon: const Icon(Icons.filter_alt_off_rounded, size: 14),
                        label: const Text('Reset', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                      ),
                  ],
                ),

                // View Mode Toggles (in Detailed View)
                if (_featuresTab == 'detailed')
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        tooltip: 'Cards View',
                        icon: Icon(Icons.grid_view_rounded, size: 18, color: _viewMode == 'cards' ? const Color(0xFF0050E5) : textSecondary),
                        onPressed: () => setState(() => _viewMode = 'cards'),
                      ),
                      IconButton(
                        tooltip: 'Table View',
                        icon: Icon(Icons.table_rows_rounded, size: 18, color: _viewMode == 'table' ? const Color(0xFF0050E5) : textSecondary),
                        onPressed: () => setState(() => _viewMode = 'table'),
                      ),
                    ],
                  ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Features Canvas
          if (_isLoading && all.isEmpty)
            const Padding(padding: EdgeInsets.all(48), child: Center(child: CircularProgressIndicator(color: Color(0xFF0050E5))))
          else if (_filteredFeatures.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 16),
              decoration: BoxDecoration(color: surfaceColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: borderColor)),
              child: Column(
                children: [
                  Icon(Icons.search_off_rounded, size: 36, color: textSecondary),
                  const SizedBox(height: 8),
                  Text('No Matching Features Found', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: textPrimary)),
                ],
              ),
            )
          else if (_featuresTab == 'detailed' && _viewMode == 'cards')
            _buildDetailedCardsView(isDark, surfaceColor, borderColor, textPrimary, textSecondary)
          else
            _buildTableView(isDark, surfaceColor, borderColor, textPrimary, textSecondary),
        ],
      ),
    );
  }

  Widget _buildModeTabButton({
    required String title,
    required IconData icon,
    required String badgeText,
    required bool isActive,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? (isDark ? AppColors.surfaceDark : Colors.white) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isActive ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 1))] : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: isActive ? const Color(0xFF0050E5) : const Color(0xFF64748B)),
            const SizedBox(width: 6),
            Text(title, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: isActive ? const Color(0xFF0050E5) : const Color(0xFF475569))),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFF0050E5).withValues(alpha: 0.1) : const Color(0xFFCBD5E1).withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(badgeText, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: isActive ? const Color(0xFF0050E5) : const Color(0xFF475569))),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiCard(String label, String value, String sub, String desc, IconData icon, Color color, double width, Color surfaceColor, Color borderColor, Color textPrimary, Color textSecondary) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                child: Icon(icon, size: 16, color: color),
              ),
              Text(sub, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: color)),
            ],
          ),
          const SizedBox(height: 10),
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: textPrimary)),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: textSecondary)),
        ],
      ),
    );
  }

  Widget _buildTableView(bool isDark, Color surfaceColor, Color borderColor, Color textPrimary, Color textSecondary) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final minWidth = constraints.maxWidth < 920 ? 920.0 : constraints.maxWidth;
        return Container(
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
          ),
          clipBehavior: Clip.antiAlias,
          child: Scrollbar(
            controller: _tableHorizontalController,
            thumbVisibility: constraints.maxWidth < 920,
            child: SingleChildScrollView(
              controller: _tableHorizontalController,
              scrollDirection: Axis.horizontal,
              child: ConstrainedBox(
                constraints: BoxConstraints(minWidth: minWidth, maxWidth: minWidth),
                child: Column(
                  children: [
                    // Header
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                        border: Border(bottom: BorderSide(color: borderColor)),
                      ),
                      child: Row(
                        children: [
                          const SizedBox(width: 50, child: Text('S/N', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                          const SizedBox(width: 220, child: Text('FEATURE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                          const SizedBox(width: 170, child: Text('SUITE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                          const SizedBox(width: 100, child: Text('AMOUNT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                          const SizedBox(width: 90, child: Text('DURATION', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                          const SizedBox(width: 110, child: Text('STATUS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                          const Expanded(child: Text('ACTION', textAlign: TextAlign.right, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                        ],
                      ),
                    ),

                    // Rows
                    ..._filteredFeatures.map((feat) {
                      final code = (feat['featureCode'] ?? '').toString();
                      final name = (feat['name'] ?? code).toString();
                      final category = (feat['category'] ?? '').toString();
                      final suiteLetter = feat['suiteLetter'] ?? '•';
                      final sn = feat['serialNo'] ?? 1;
                      final isActive = feat['isActive'] == true;
                      final isAvailable = feat['isAvailableForUse'] == true;
                      final amt = _getFeatureDisplayAmount(feat);
                      final duration = _getFeatureDurationLabel(feat);
                      final isExpiring = _isFeatureExpiringWithinMonth(feat);

                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          border: Border(bottom: BorderSide(color: borderColor.withValues(alpha: 0.6))),
                        ),
                        child: Row(
                          children: [
                            SizedBox(width: 50, child: Text('#$sn', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: textSecondary))),
                            SizedBox(
                              width: 220,
                              child: Row(
                                children: [
                                  Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: (isActive || isAvailable) ? const Color(0xFF0050E5).withValues(alpha: 0.1) : const Color(0xFF94A3B8).withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Icon(_getFeatureIcon(feat['icon']?.toString()), size: 16, color: (isActive || isAvailable) ? const Color(0xFF0050E5) : const Color(0xFF94A3B8)),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: InkWell(
                                      onTap: () => setState(() => _selectedFeatureDetail = feat),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: textPrimary)),
                                          Text(code, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 10.5, fontFamily: 'monospace', color: textSecondary)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            SizedBox(
                              width: 170,
                              child: Text('Suite $suiteLetter: $category', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: textSecondary)),
                            ),
                            SizedBox(
                              width: 100,
                              child: Text(amt > 0 ? _formatAmount(amt) : 'Included Free', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: amt > 0 ? textPrimary : const Color(0xFF059669))),
                            ),
                            SizedBox(
                              width: 90,
                              child: Text(duration, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: textSecondary)),
                            ),
                            SizedBox(
                              width: 110,
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: isActive
                                        ? const Color(0xFF10B981).withValues(alpha: 0.12)
                                        : (isAvailable ? const Color(0xFFD97706).withValues(alpha: 0.12) : const Color(0xFF64748B).withValues(alpha: 0.12)),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    isActive ? 'Active' : (isAvailable ? 'Not Active' : 'Coming Soon'),
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w800,
                                      color: isActive ? const Color(0xFF059669) : (isAvailable ? const Color(0xFFD97706) : const Color(0xFF64748B)),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              child: Align(
                                alignment: Alignment.centerRight,
                                child: Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  alignment: WrapAlignment.end,
                                  children: [
                                    if (isExpiring)
                                      ElevatedButton.icon(
                                        onPressed: _payingFeatureCode == code ? null : () => _payAndRenewFeature(feat),
                                        style: ElevatedButton.styleFrom(
                                          minimumSize: const Size(0, 30),
                                          padding: const EdgeInsets.symmetric(horizontal: 8),
                                          backgroundColor: const Color(0xFF0050E5),
                                          foregroundColor: Colors.white,
                                        ),
                                        icon: const Icon(Icons.receipt_long_rounded, size: 13),
                                        label: const Text('View Invoice', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                      ),
                                    OutlinedButton.icon(
                                      onPressed: () => setState(() => _selectedFeatureDetail = feat),
                                      style: OutlinedButton.styleFrom(
                                        minimumSize: const Size(0, 30),
                                        padding: const EdgeInsets.symmetric(horizontal: 8),
                                        side: BorderSide(color: borderColor),
                                      ),
                                      icon: const Icon(Icons.visibility_rounded, size: 13),
                                      label: const Text('Details', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                    ),
                                    if (isActive)
                                      OutlinedButton.icon(
                                        onPressed: _togglingFeatureCode == code ? null : () => _toggleFeature(feat, false),
                                        style: OutlinedButton.styleFrom(
                                          minimumSize: const Size(0, 30),
                                          padding: const EdgeInsets.symmetric(horizontal: 8),
                                          side: BorderSide(color: borderColor),
                                        ),
                                        icon: const Icon(Icons.toggle_off_rounded, size: 13),
                                        label: const Text('Deactivate', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                      )
                                    else if (isAvailable)
                                      ElevatedButton.icon(
                                        onPressed: _togglingFeatureCode == code ? null : () => _toggleFeature(feat, true),
                                        style: ElevatedButton.styleFrom(
                                          minimumSize: const Size(0, 30),
                                          padding: const EdgeInsets.symmetric(horizontal: 8),
                                          backgroundColor: const Color(0xFF0050E5),
                                          foregroundColor: Colors.white,
                                        ),
                                        icon: const Icon(Icons.download_done_rounded, size: 13),
                                        label: Text(
                                          feat['isEligibleForFreeTrial'] == true ? 'Free Trial' : (amt > 0 ? 'Pay & Activate' : 'Install'),
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                                        ),
                                      ),
                                  ],
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
        );
      },
    );
  }

  Widget _buildDetailedCardsView(bool isDark, Color surfaceColor, Color borderColor, Color textPrimary, Color textSecondary) {
    final suitesMap = <String, List<Map<String, dynamic>>>{};
    for (final feat in _filteredFeatures) {
      final cat = (feat['category'] ?? 'Operations').toString();
      suitesMap.putIfAbsent(cat, () => []).add(feat);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: suitesMap.entries.map((entry) {
        final suiteName = entry.key;
        final feats = entry.value;
        final letter = _getSuiteLetter(suiteName);

        return Container(
          margin: const EdgeInsets.only(bottom: 20),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                  border: Border(bottom: BorderSide(color: borderColor)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: const Color(0xFF0050E5), borderRadius: BorderRadius.circular(6)),
                      child: Text('Suite $letter', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
                    ),
                    const SizedBox(width: 8),
                    Expanded(child: Text(suiteName, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: textPrimary))),
                    Text('${feats.length} Capabilities', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: textSecondary)),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final cardWidth = constraints.maxWidth > 800 ? (constraints.maxWidth - 12) / 2 : constraints.maxWidth;
                    return Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: feats.map((f) => _buildSingleFeatureCard(f, cardWidth, isDark, surfaceColor, borderColor, textPrimary, textSecondary)).toList(),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSingleFeatureCard(Map<String, dynamic> feat, double width, bool isDark, Color surfaceColor, Color borderColor, Color textPrimary, Color textSecondary) {
    final code = (feat['featureCode'] ?? '').toString();
    final name = (feat['name'] ?? code).toString();
    final desc = (feat['description'] ?? '').toString();
    final isActive = feat['isActive'] == true;
    final isAvailable = feat['isAvailableForUse'] == true;
    final amt = _getFeatureDisplayAmount(feat);
    final isExpiring = _isFeatureExpiringWithinMonth(feat);

    return Container(
      width: width,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: (isActive || isAvailable) ? const Color(0xFF0050E5).withValues(alpha: 0.1) : const Color(0xFF94A3B8).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(_getFeatureIcon(feat['icon']?.toString()), size: 18, color: (isActive || isAvailable) ? const Color(0xFF0050E5) : const Color(0xFF94A3B8)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: textPrimary)),
                    Text(code, style: TextStyle(fontSize: 10.5, fontFamily: 'monospace', color: textSecondary)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isActive ? const Color(0xFF10B981).withValues(alpha: 0.12) : (isAvailable ? const Color(0xFFD97706).withValues(alpha: 0.12) : const Color(0xFF64748B).withValues(alpha: 0.12)),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  isActive ? 'Active' : (isAvailable ? 'Available' : 'Soon'),
                  style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: isActive ? const Color(0xFF059669) : (isAvailable ? const Color(0xFFD97706) : const Color(0xFF64748B))),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(desc, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11.5, color: textSecondary)),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(amt > 0 ? '${_formatAmount(amt)}/mo' : 'Included Free', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: amt > 0 ? textPrimary : const Color(0xFF059669))),
              Wrap(
                spacing: 6,
                children: [
                  if (isExpiring)
                    ElevatedButton(
                      onPressed: _payingFeatureCode == code ? null : () => _payAndRenewFeature(feat),
                      style: ElevatedButton.styleFrom(minimumSize: const Size(0, 28), padding: const EdgeInsets.symmetric(horizontal: 8), backgroundColor: const Color(0xFF0050E5), foregroundColor: Colors.white),
                      child: const Text('Invoice', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700)),
                    ),
                  OutlinedButton(
                    onPressed: () => setState(() => _selectedFeatureDetail = feat),
                    style: OutlinedButton.styleFrom(minimumSize: const Size(0, 28), padding: const EdgeInsets.symmetric(horizontal: 8), side: BorderSide(color: borderColor)),
                    child: const Text('Details', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700)),
                  ),
                  if (isActive)
                    OutlinedButton(
                      onPressed: _togglingFeatureCode == code ? null : () => _toggleFeature(feat, false),
                      style: OutlinedButton.styleFrom(minimumSize: const Size(0, 28), padding: const EdgeInsets.symmetric(horizontal: 8), side: BorderSide(color: borderColor)),
                      child: const Text('Deactivate', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700)),
                    )
                  else if (isAvailable)
                    ElevatedButton(
                      onPressed: _togglingFeatureCode == code ? null : () => _toggleFeature(feat, true),
                      style: ElevatedButton.styleFrom(minimumSize: const Size(0, 28), padding: const EdgeInsets.symmetric(horizontal: 8), backgroundColor: const Color(0xFF0050E5), foregroundColor: Colors.white),
                      child: Text(feat['isEligibleForFreeTrial'] == true ? 'Trial' : (amt > 0 ? 'Pay' : 'Install'), style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700)),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureDetailView(bool isDark, Color surfaceColor, Color borderColor, Color textPrimary, Color textSecondary) {
    final feat = _selectedFeatureDetail!;
    final code = (feat['featureCode'] ?? '').toString();
    final name = (feat['name'] ?? code).toString();
    final category = (feat['category'] ?? '').toString();
    final suiteLetter = feat['suiteLetter'] ?? '•';
    final desc = (feat['description'] ?? '').toString();
    final isActive = feat['isActive'] == true;
    final isAvailable = feat['isAvailableForUse'] == true;
    final amt = _getFeatureDisplayAmount(feat);
    final isExpiring = _isFeatureExpiringWithinMonth(feat);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: () => setState(() => _selectedFeatureDetail = null),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 36),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  side: BorderSide(color: borderColor),
                ),
                icon: const Icon(Icons.arrow_back_rounded, size: 16),
                label: const Text('Back to All Features', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: const Color(0xFF0050E5).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                child: Text('Suite $suiteLetter: $category', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF0050E5))),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(color: surfaceColor, borderRadius: BorderRadius.circular(14), border: Border.all(color: borderColor)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(color: const Color(0xFF0050E5).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                      child: Icon(_getFeatureIcon(feat['icon']?.toString()), size: 26, color: const Color(0xFF0050E5)),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: textPrimary)),
                          Text(code, style: TextStyle(fontSize: 11.5, fontFamily: 'monospace', color: textSecondary)),
                          const SizedBox(height: 6),
                          Text(desc, style: TextStyle(fontSize: 13, color: textSecondary)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const Divider(),
                const SizedBox(height: 14),
                Text('Pricing & Rates', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: textPrimary)),
                const SizedBox(height: 8),
                Text('Monthly Rate: ${amt > 0 ? _formatAmount(amt) : "Included Free"}', style: TextStyle(fontSize: 13, color: textSecondary)),
                const SizedBox(height: 18),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    if (isExpiring)
                      ElevatedButton.icon(
                        onPressed: _payingFeatureCode == code ? null : () => _payAndRenewFeature(feat),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0050E5), foregroundColor: Colors.white),
                        icon: const Icon(Icons.receipt_long_rounded, size: 16),
                        label: const Text('View Renewal Invoice'),
                      ),
                    if (isActive)
                      OutlinedButton.icon(
                        onPressed: _togglingFeatureCode == code ? null : () => _toggleFeature(feat, false),
                        style: OutlinedButton.styleFrom(side: BorderSide(color: borderColor)),
                        icon: const Icon(Icons.toggle_off_rounded, size: 16),
                        label: const Text('Deactivate Feature'),
                      )
                    else if (isAvailable)
                      ElevatedButton.icon(
                        onPressed: _togglingFeatureCode == code ? null : () => _toggleFeature(feat, true),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0050E5), foregroundColor: Colors.white),
                        icon: const Icon(Icons.download_done_rounded, size: 16),
                        label: Text(feat['isEligibleForFreeTrial'] == true ? 'Start Free Trial & Activate' : (amt > 0 ? 'Pay & Activate' : 'Install & Activate Now')),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

