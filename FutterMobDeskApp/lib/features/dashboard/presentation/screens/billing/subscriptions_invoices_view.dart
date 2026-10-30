import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';

/// Subscriptions & Invoices View (Suite 13).
/// Matches Angular web `/billing/subscriptions` and `/billing/invoices/:id` exactly.
/// Features:
/// 1. Installed & Active Capabilities table with overdue / expiration alerts & dynamic renewal
/// 2. Billing Invoices & Receipts historical ledger with filtering & status
/// 3. Dedicated Full-Page Invoice & Payment Checkout (/billing/invoices/:id)
///    - Dynamic duration selection (1 Month, 3 Months, 1 Year) with real-time recalculation
///    - Multi-gateway checkout (Paystack & Direct Bank Deposit proof submission)
///    - Fully responsive with zero button overflow on mobile or minimized desktop screens.
class SubscriptionsInvoicesView extends ConsumerStatefulWidget {
  final Workspace? workspace;
  final VoidCallback? onNavigateToPlans;

  const SubscriptionsInvoicesView({
    super.key,
    this.workspace,
    this.onNavigateToPlans,
  });

  @override
  ConsumerState<SubscriptionsInvoicesView> createState() => _SubscriptionsInvoicesViewState();
}

class _SubscriptionsInvoicesViewState extends ConsumerState<SubscriptionsInvoicesView> {
  AccountRepository get _accountRepo => ref.read(accountRepositoryProvider);

  bool _isLoading = true;
  String? _errorMessage;

  // Snapshot data (for installed features)
  Map<String, dynamic>? _snapshotData;

  // Invoices list data
  List<dynamic> _invoices = [];
  String _invoiceFilter = 'all'; // 'all' | 'pending' | 'completed'

  // Paying / Deactivating state
  String? _togglingFeatureCode;
  String? _preparingInvoiceFeatureCode;
  bool _isPayingAllDue = false;

  // Invoice Detail / Checkout Subview (/billing/invoices/:id)
  String? _activeInvoiceId;
  Map<String, dynamic>? _invoiceDetail;
  bool _isLoadingInvoiceDetail = false;
  String? _updatingCadenceFeatureCode;
  String _selectedGatewayCode = 'Paystack';
  bool _isProcessingPayment = false;
  bool _isEditingBankDepositProof = false;
  final TextEditingController _bankDepositRefCtrl = TextEditingController();

  final currencyFormatter = NumberFormat.currency(symbol: '₦', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _bankDepositRefCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final snapshotFuture = _accountRepo.getBillingFeaturesSnapshot();
      final invoicesFuture = _accountRepo.getBillingInvoices();

      final snapRes = await snapshotFuture;
      final invList = await invoicesFuture;

      if (mounted) {
        setState(() {
          if (snapRes['success'] == true && snapRes['data'] is Map<String, dynamic>) {
            _snapshotData = snapRes['data'] as Map<String, dynamic>;
          } else if (snapRes['included'] != null) {
            _snapshotData = snapRes;
          }
          _invoices = invList;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Installed Capabilities Resolvers
  // ─────────────────────────────────────────────────────────────────────────

  List<Map<String, dynamic>> get _installedFeatures {
    if (_snapshotData == null) return [];
    final List<Map<String, dynamic>> list = [];

    void addFeatures(dynamic rawList) {
      if (rawList is List) {
        for (final item in rawList) {
          if (item is Map<String, dynamic>) {
            final isActive = item['isActive'] == true;
            final isExpired = item['status'] == 'Expired';
            if (isActive || isExpired) {
              list.add(item);
            }
          }
        }
      }
    }

    addFeatures(_snapshotData!['included']);
    addFeatures(_snapshotData!['subscribed']);
    addFeatures(_snapshotData!['available']);

    // Deduplicate by featureCode
    final seen = <String>{};
    final unique = <Map<String, dynamic>>[];
    for (final f in list) {
      final code = f['featureCode']?.toString() ?? '';
      if (!seen.contains(code)) {
        seen.add(code);
        unique.add(f);
      }
    }
    return unique;
  }

  List<Map<String, dynamic>> get _expiringOrExpiredFeatures {
    return _installedFeatures.where((f) {
      final isCompulsory = f['isCompulsory'] == true;
      if (isCompulsory) return false;
      final status = f['status']?.toString() ?? '';
      final daysRemaining = (f['daysRemaining'] as num?)?.toInt() ?? 999;
      final monthly = (f['monthlyPrice'] as num?)?.toDouble() ?? 0.0;
      final yearly = (f['yearlyPrice'] as num?)?.toDouble() ?? 0.0;
      final hasCost = monthly > 0 || yearly > 0;

      return hasCost && (status == 'Expired' || daysRemaining <= 30);
    }).toList();
  }

  double get _totalExpiringAmountDue {
    double sum = 0;
    for (final f in _expiringOrExpiredFeatures) {
      final monthly = (f['monthlyPrice'] as num?)?.toDouble() ?? 0.0;
      final yearly = (f['yearlyPrice'] as num?)?.toDouble() ?? 0.0;
      sum += (monthly > 0 ? monthly : yearly);
    }
    return sum;
  }

  List<dynamic> get _filteredInvoices {
    if (_invoiceFilter == 'pending') {
      return _invoices.where((i) => i['status']?.toString().toLowerCase() == 'pending').toList();
    }
    if (_invoiceFilter == 'completed') {
      return _invoices.where((i) => i['status']?.toString().toLowerCase() != 'pending').toList();
    }
    return _invoices;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Actions: Deactivate, Renew, Invoicing
  // ─────────────────────────────────────────────────────────────────────────

  Future<void> _toggleDeactivate(Map<String, dynamic> feat) async {
    final code = feat['featureCode']?.toString() ?? '';
    final name = feat['name']?.toString() ?? code;
    final id = feat['id']?.toString() ?? code;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Deactivate $name?'),
        content: Text(
          'Are you sure you want to deactivate $name? It will be removed from your workspace navigation menu until reactivated.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Deactivate', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _togglingFeatureCode = code);
    try {
      final res = await _accountRepo.toggleBillingFeatureActive(
        featureId: id,
        featureCode: code,
        setActive: false,
      );
      if (!mounted) return;
      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$name deactivated successfully.')),
        );
        _loadData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message']?.toString() ?? 'Deactivation failed.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) setState(() => _togglingFeatureCode = null);
    }
  }

  Future<void> _payAndRenewFeature(Map<String, dynamic> feat) async {
    final code = feat['featureCode']?.toString() ?? '';
    setState(() => _preparingInvoiceFeatureCode = code);

    try {
      final res = await _accountRepo.prepareBillingInvoice(featureCodes: [code]);
      if (!mounted) return;
      if (res['success'] == true && res['data'] != null) {
        final invId = res['data']['id']?.toString() ?? res['data']['invoiceId']?.toString();
        if (invId != null) {
          _openInvoiceDetail(invId);
        } else {
          _loadData();
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message']?.toString() ?? 'Could not prepare invoice.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) setState(() => _preparingInvoiceFeatureCode = null);
    }
  }

  Future<void> _payAllExpiringFeatures() async {
    final codes = _expiringOrExpiredFeatures
        .map((f) => f['featureCode']?.toString())
        .whereType<String>()
        .toList();

    if (codes.isEmpty) return;

    setState(() => _isPayingAllDue = true);
    try {
      final res = await _accountRepo.prepareBillingInvoice(featureCodes: codes);
      if (!mounted) return;
      if (res['success'] == true && res['data'] != null) {
        final invId = res['data']['id']?.toString() ?? res['data']['invoiceId']?.toString();
        if (invId != null) {
          _openInvoiceDetail(invId);
        } else {
          _loadData();
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message']?.toString() ?? 'Could not prepare consolidated invoice.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) setState(() => _isPayingAllDue = false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Full-Page Invoice Detail / Checkout Subview (/billing/invoices/:id)
  // ─────────────────────────────────────────────────────────────────────────

  Future<void> _openInvoiceDetail(String invoiceId) async {
    setState(() {
      _activeInvoiceId = invoiceId;
      _isLoadingInvoiceDetail = true;
      _invoiceDetail = null;
      _isEditingBankDepositProof = false;
      _bankDepositRefCtrl.clear();
    });

    try {
      final res = await _accountRepo.getBillingInvoiceDetail(invoiceId);
      if (mounted) {
        if (res['success'] == true && res['data'] is Map<String, dynamic>) {
          final data = res['data'] as Map<String, dynamic>;
          final refVal = data['paymentProofRef']?.toString() ?? '';
          _bankDepositRefCtrl.text = refVal;

          String gateway = 'Paystack';
          if (data['status'] == 'AwaitingVerification' || data['paymentProvider'] == 'BankDeposit') {
            gateway = 'BankDeposit';
          } else if (data['paymentMethods'] is List && (data['paymentMethods'] as List).isNotEmpty) {
            final list = data['paymentMethods'] as List;
            final configured = list.firstWhere(
              (m) => m['isConfigured'] == true,
              orElse: () => list.first,
            );
            gateway = configured['providerCode']?.toString() ?? 'Paystack';
          }

          setState(() {
            _invoiceDetail = data;
            _selectedGatewayCode = gateway;
            _isLoadingInvoiceDetail = false;
          });
        } else {
          setState(() => _isLoadingInvoiceDetail = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(res['message']?.toString() ?? 'Invoice not found.'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingInvoiceDetail = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading invoice: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  void _closeInvoiceDetail() {
    setState(() {
      _activeInvoiceId = null;
      _invoiceDetail = null;
    });
    _loadData();
  }

  Future<void> _changeLineCadence(Map<String, dynamic> line, String newCadence) async {
    if (_invoiceDetail == null) return;
    final invId = _invoiceDetail!['id']?.toString() ?? '';
    final featCode = line['featureCode']?.toString() ?? '';

    setState(() => _updatingCadenceFeatureCode = featCode);

    try {
      final res = await _accountRepo.updateBillingInvoiceLineCadence(
        invoiceId: invId,
        cadence: newCadence,
        featureCode: featCode,
      );
      if (!mounted) return;
      if (res['success'] == true && res['data'] is Map<String, dynamic>) {
        setState(() {
          _invoiceDetail = res['data'] as Map<String, dynamic>;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${line['featureName'] ?? featCode} updated to $newCadence.')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message']?.toString() ?? 'Could not update cadence.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) setState(() => _updatingCadenceFeatureCode = null);
    }
  }

  Future<void> _proceedWithPayment() async {
    if (_invoiceDetail == null) return;

    if (_selectedGatewayCode == 'BankDeposit') {
      _submitBankDepositProof();
      return;
    }

    if (_selectedGatewayCode == 'Paystack') {
      _launchPaystackPayment();
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Payment gateway $_selectedGatewayCode selected.')),
    );
  }

  Future<void> _launchPaystackPayment() async {
    final invId = _invoiceDetail!['id']?.toString() ?? '';
    setState(() => _isProcessingPayment = true);

    try {
      final res = await _accountRepo.payBillingInvoiceWithPaystack(invId);
      if (!mounted) return;
      if (res['success'] == true && res['data'] is Map<String, dynamic>) {
        final data = res['data'] as Map<String, dynamic>;
        final authUrl = data['authorizationUrl']?.toString();
        final ref = data['reference']?.toString();

        if (authUrl != null && authUrl.isNotEmpty) {
          final uri = Uri.parse(authUrl);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        }

        // Show reference verification dialog
        if (mounted && ref != null) {
          _showPaystackVerificationDialog(ref);
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message']?.toString() ?? 'Paystack payment initialization failed.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) setState(() => _isProcessingPayment = false);
    }
  }

  void _showPaystackVerificationDialog(String ref) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirming Paystack Payment'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'A payment window has been opened. Once you complete the transaction on Paystack, click below to verify and unlock your capabilities.',
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                'Reference: $ref',
                style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace', fontSize: 12),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () async {
              Navigator.of(ctx).pop();
              _verifyPaystackPayment(ref);
            },
            child: const Text('Verify Payment Now', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _verifyPaystackPayment(String ref) async {
    setState(() => _isProcessingPayment = true);
    try {
      final res = await _accountRepo.verifyPaystackFeaturePayment(ref);
      if (!mounted) return;
      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment verified successfully! Your capabilities are now active.'),
            backgroundColor: Color(0xFF059669),
          ),
        );
        if (_activeInvoiceId != null) {
          _openInvoiceDetail(_activeInvoiceId!);
        } else {
          _loadData();
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message']?.toString() ?? 'Verification pending or failed.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Verification error: $e'), backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) setState(() => _isProcessingPayment = false);
    }
  }

  Future<void> _submitBankDepositProof() async {
    final ref = _bankDepositRefCtrl.text.trim();
    if (ref.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter your bank transfer reference or teller ID.'),
          backgroundColor: Color(0xFFB45309),
        ),
      );
      return;
    }

    final invId = _invoiceDetail!['id']?.toString() ?? '';
    setState(() => _isProcessingPayment = true);

    try {
      final res = await _accountRepo.submitBillingInvoiceBankDeposit(
        invoiceId: invId,
        transferReference: ref,
      );
      if (!mounted) return;
      if (res['success'] == true && res['data'] is Map<String, dynamic>) {
        setState(() {
          _invoiceDetail = res['data'] as Map<String, dynamic>;
          _isEditingBankDepositProof = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message']?.toString() ?? 'Bank transfer reference submitted!'),
            backgroundColor: const Color(0xFF059669),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message']?.toString() ?? 'Submission failed.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) setState(() => _isProcessingPayment = false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Build Methods
  // ─────────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_activeInvoiceId != null) {
      return _buildInvoiceCheckoutPage();
    }
    return _buildSubscriptionsMainPage();
  }

  Widget _buildSubscriptionsMainPage() {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline, color: AppColors.error, size: 48),
                        const SizedBox(height: 12),
                        Text(_errorMessage!, style: const TextStyle(color: AppColors.error)),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _loadData,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildPageHeader(),
                        const SizedBox(height: 20),
                        _buildInstalledCapabilitiesCard(),
                        const SizedBox(height: 24),
                        _buildInvoicesLedCard(),
                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildPageHeader() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 650;
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Breadcrumb
              const Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 6,
                runSpacing: 4,
                children: [
                  Text('Command Center', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
                  Text('/', style: TextStyle(fontSize: 12.5, color: Color(0xFFCBD5E1))),
                  Text('Billing & Subscriptions', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
                  Text('/', style: TextStyle(fontSize: 12.5, color: Color(0xFFCBD5E1))),
                  Text('Subscriptions & Invoices', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: AppColors.primary)),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Active Subscriptions & Billing Invoices',
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF0F172A), letterSpacing: -0.5),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Review your currently installed workspace capabilities, auto-renewal preferences, and historical billing invoices.',
                          style: TextStyle(fontSize: 13.5, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  if (!isNarrow && widget.onNavigateToPlans != null) ...[
                    const SizedBox(width: 16),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: widget.onNavigateToPlans,
                      icon: const Icon(Icons.add_circle_outline, size: 18),
                      label: const Text('Install More Features', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ],
              ),
              if (isNarrow && widget.onNavigateToPlans != null) ...[
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(40),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: widget.onNavigateToPlans,
                  icon: const Icon(Icons.add_circle_outline, size: 18),
                  label: const Text('Install More Features', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Card 1: Installed Capabilities Table
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildInstalledCapabilitiesCard() {
    final installed = _installedFeatures;
    final expiring = _expiringOrExpiredFeatures;
    final totalMonthly = (_snapshotData?['totalRecurringMonthly'] as num?)?.toDouble() ?? 0.0;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(18),
            child: Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 12,
              runSpacing: 10,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Installed & Active Capabilities (${installed.length})',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Capabilities currently active and displayed in your workspace navigation menu.',
                      style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
                Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    if (expiring.length > 1 && _totalExpiringAmountDue > 0)
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          minimumSize: const Size(0, 36),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(7)),
                        ),
                        onPressed: _isPayingAllDue ? null : _payAllExpiringFeatures,
                        icon: _isPayingAllDue
                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Icon(Icons.receipt_long, size: 16),
                        label: Text(
                          _isPayingAllDue
                              ? 'Preparing Invoice...'
                              : 'Renew All Expiring (${currencyFormatter.format(_totalExpiringAmountDue)})',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFA7F3D0)),
                      ),
                      child: Text(
                        'Monthly Spend: ${currencyFormatter.format(totalMonthly)}/mo',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF065F46)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          if (installed.isEmpty)
            _buildEmptyCapabilities()
          else
            // Responsive Scrollable Table (prevents overflow on mobile & minimized desktop)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minWidth: 800),
                child: DataTable(
                  headingRowColor: WidgetStateProperty.all(const Color(0xFFF8FAFC)),
                  headingTextStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF475569)),
                  horizontalMargin: 20,
                  columnSpacing: 24,
                  columns: const [
                    DataColumn(label: Text('S/N', style: TextStyle(fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('FEATURE', style: TextStyle(fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('SUITE', style: TextStyle(fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('RATE', style: TextStyle(fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('STATUS', style: TextStyle(fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('ACTION', style: TextStyle(fontWeight: FontWeight.bold)), numeric: true),
                  ],
                  rows: List.generate(installed.length, (idx) {
                    final feat = installed[idx];
                    return _buildInstalledRow(feat, idx + 1);
                  }),
                ),
              ),
            ),
        ],
      ),
    );
  }

  DataRow _buildInstalledRow(Map<String, dynamic> feat, int sn) {
    final code = feat['featureCode']?.toString() ?? '';
    final name = feat['name']?.toString() ?? code;
    final category = feat['category']?.toString() ?? 'General';
    final status = feat['status']?.toString() ?? '';
    final isCompulsory = feat['isCompulsory'] == true;
    final isTrial = feat['isTrialPeriod'] == true;
    final daysRemaining = (feat['daysRemaining'] as num?)?.toInt() ?? 999;
    final monthly = (feat['monthlyPrice'] as num?)?.toDouble() ?? 0.0;
    final yearly = (feat['yearlyPrice'] as num?)?.toDouble() ?? 0.0;

    final isExpired = status == 'Expired' || (daysRemaining <= 0 && !isCompulsory);
    final isExpiringSoon = !isCompulsory && daysRemaining <= 30;

    final isToggling = _togglingFeatureCode == code;
    final isPaying = _preparingInvoiceFeatureCode == code;

    return DataRow(
      cells: [
        // S/N
        DataCell(
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text('$sn', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
          ),
        ),
        // FEATURE
        DataCell(
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: const Color(0xFF0050E5).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(7),
                ),
                child: const Icon(Icons.extension_outlined, size: 17, color: Color(0xFF0050E5)),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(code, style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF475569))),
                  ),
                ],
              ),
            ],
          ),
        ),
        // SUITE
        DataCell(
          Text(category, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
        ),
        // RATE
        DataCell(
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (monthly > 0) ...[
                Text('${currencyFormatter.format(monthly)}/mo', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                if (yearly > 0)
                  Text('or ${currencyFormatter.format(yearly)}/yr', style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
              ] else if (yearly > 0) ...[
                Text('${currencyFormatter.format(yearly)}/yr', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                const Text('Yearly Only', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
              ] else
                const Text('Free / Included', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF059669))),
            ],
          ),
        ),
        // STATUS
        DataCell(
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (isExpired)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFFCA5A5)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, size: 13, color: Color(0xFFDC2626)),
                      const SizedBox(width: 4),
                      Text(
                        daysRemaining < 0 ? '${daysRemaining.abs()}d Overdue' : 'Expired Today',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFDC2626)),
                      ),
                    ],
                  ),
                )
              else if (isExpiringSoon)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFFCD34D)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.schedule, size: 13, color: Color(0xFFB45309)),
                      const SizedBox(width: 4),
                      Text(
                        isTrial ? 'Trial • ${daysRemaining}d Left' : '${daysRemaining}d Left',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFB45309)),
                      ),
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle, size: 13, color: Color(0xFF059669)),
                      const SizedBox(width: 4),
                      Text(
                        isTrial ? 'Active Trial' : 'Active',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        // ACTION
        DataCell(
          Wrap(
            spacing: 6,
            runSpacing: 4,
            alignment: WrapAlignment.end,
            children: [
              if (isExpiringSoon || isExpired)
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    minimumSize: const Size(0, 32),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                  onPressed: isPaying ? null : () => _payAndRenewFeature(feat),
                  icon: isPaying
                      ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.receipt_long, size: 14),
                  label: const Text('View Invoice', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF64748B),
                  side: const BorderSide(color: Color(0xFFCBD5E1)),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  minimumSize: const Size(0, 32),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                ),
                onPressed: isToggling ? null : () => _toggleDeactivate(feat),
                icon: isToggling
                    ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.toggle_off, size: 14),
                label: const Text('Deactivate', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyCapabilities() {
    return Padding(
      padding: const EdgeInsets.all(40),
      child: Center(
        child: Column(
          children: [
            const Icon(Icons.layers_outlined, size: 48, color: Color(0xFF94A3B8)),
            const SizedBox(height: 12),
            const Text(
              'No Modular Capabilities Installed Yet',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 4),
            const Text(
              'Go to the Features directory to install and activate capabilities for your workspace menu.',
              style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              textAlign: TextAlign.center,
            ),
            if (widget.onNavigateToPlans != null) ...[
              const SizedBox(height: 16),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                onPressed: widget.onNavigateToPlans,
                child: const Text('Browse & Install Features', style: TextStyle(color: Colors.white)),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Card 2: Billing Invoices Ledger Table
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildInvoicesLedCard() {
    final list = _filteredInvoices;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with filters & Refresh
          Padding(
            padding: const EdgeInsets.all(18),
            child: Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 12,
              runSpacing: 10,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Billing Invoices & Receipts (${_invoices.length})',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Historical invoice ledger for your workspace subscriptions. Click any invoice to view details or complete payment.',
                      style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    // Status filter pills
                    _buildFilterPill('All', 'all'),
                    _buildFilterPill('Pending', 'pending'),
                    _buildFilterPill('Completed', 'completed'),
                    const SizedBox(width: 4),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF334155),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        minimumSize: const Size(0, 36),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(7)),
                      ),
                      onPressed: _loadData,
                      icon: const Icon(Icons.refresh, size: 16),
                      label: const Text('Refresh Invoices', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          if (list.isEmpty)
            _buildEmptyInvoices()
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minWidth: 800),
                child: DataTable(
                  headingRowColor: WidgetStateProperty.all(const Color(0xFFF8FAFC)),
                  headingTextStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF475569)),
                  horizontalMargin: 20,
                  columnSpacing: 24,
                  columns: const [
                    DataColumn(label: Text('INVOICE #', style: TextStyle(fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('DESCRIPTION', style: TextStyle(fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('AMOUNT', style: TextStyle(fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('STATUS', style: TextStyle(fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('DATE', style: TextStyle(fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('ACTION', style: TextStyle(fontWeight: FontWeight.bold)), numeric: true),
                  ],
                  rows: list.map((inv) => _buildInvoiceRow(inv)).toList(),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFilterPill(String label, String value) {
    final isSelected = _invoiceFilter == value;
    return InkWell(
      onTap: () => setState(() => _invoiceFilter = value),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  DataRow _buildInvoiceRow(dynamic inv) {
    final id = inv['id']?.toString() ?? '';
    final invoiceNum = inv['invoiceNumber']?.toString() ?? id;
    final desc = inv['description']?.toString() ?? 'Workspace Subscription';
    final amount = (inv['amount'] as num?)?.toDouble() ?? 0.0;
    final status = inv['status']?.toString() ?? 'Pending';
    final created = inv['createdUtc']?.toString() ?? '';

    final isCompleted = status.toLowerCase() == 'completed';

    String dateStr = '';
    if (created.isNotEmpty) {
      try {
        final dt = DateTime.parse(created).toLocal();
        dateStr = DateFormat('MMM dd, yyyy').format(dt);
      } catch (_) {
        dateStr = created;
      }
    }

    return DataRow(
      cells: [
        // INVOICE #
        DataCell(
          Text(invoiceNum, style: const TextStyle(fontSize: 12, fontFamily: 'monospace', fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
        ),
        // DESCRIPTION
        DataCell(
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 260),
            child: Text(
              desc,
              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ),
        // AMOUNT
        DataCell(
          Text(currencyFormatter.format(amount), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        ),
        // STATUS
        DataCell(
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
            decoration: BoxDecoration(
              color: isCompleted ? const Color(0xFFECFDF5) : const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: isCompleted ? const Color(0xFFA7F3D0) : const Color(0xFFFCD34D)),
            ),
            child: Text(
              status,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: isCompleted ? const Color(0xFF059669) : const Color(0xFFB45309),
              ),
            ),
          ),
        ),
        // DATE
        DataCell(
          Text(dateStr, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
        ),
        // ACTION
        DataCell(
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              minimumSize: const Size(0, 32),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
            ),
            onPressed: () => _openInvoiceDetail(id),
            icon: Icon(isCompleted ? Icons.receipt_long : Icons.payments_outlined, size: 14),
            label: Text(
              isCompleted ? 'View Receipt' : 'View & Pay Invoice',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyInvoices() {
    return const Padding(
      padding: EdgeInsets.all(40),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.receipt_long_outlined, size: 48, color: Color(0xFF94A3B8)),
            SizedBox(height: 12),
            Text(
              'No Billing Invoices Yet',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            SizedBox(height: 4),
            Text(
              'Invoices generated for paid add-on subscriptions will appear here.',
              style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
            ),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dedicated Full-Page Invoice & Payment Checkout (/billing/invoices/:id)
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildInvoiceCheckoutPage() {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: _isLoadingInvoiceDetail
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 12),
                  Text('Loading Invoice Details...', style: TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
            )
          : _invoiceDetail == null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                      const SizedBox(height: 12),
                      const Text('Unable to load invoice details.', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _closeInvoiceDetail,
                        child: const Text('Back to Subscriptions & Invoices'),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildCheckoutHeader(),
                      const SizedBox(height: 20),
                      _buildInvoiceTopSummaryCard(),
                      const SizedBox(height: 20),
                      _buildItemizedCapabilitiesCard(),
                      const SizedBox(height: 20),
                      if (_invoiceDetail!['status'] != 'Completed')
                        _buildPaymentMethodsCard(),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
    );
  }

  Widget _buildCheckoutHeader() {
    final invNum = _invoiceDetail?['invoiceNumber']?.toString() ?? _activeInvoiceId ?? '';

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Breadcrumb
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 6,
            runSpacing: 4,
            children: [
              const Text('Command Center', style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
              const Text('/', style: TextStyle(fontSize: 12.5, color: Color(0xFFCBD5E1))),
              InkWell(
                onTap: _closeInvoiceDetail,
                child: const Text('Billing & Subscriptions', style: TextStyle(fontSize: 12.5, color: AppColors.primary)),
              ),
              const Text('/', style: TextStyle(fontSize: 12.5, color: Color(0xFFCBD5E1))),
              Text(invNum, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Invoice & Payment Checkout',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF0F172A), letterSpacing: -0.5),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Review your capability renewal items, adjust billing duration, and select a payment method.',
                      style: TextStyle(fontSize: 13.5, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF334155),
                  side: const BorderSide(color: Color(0xFFCBD5E1)),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: _closeInvoiceDetail,
                icon: const Icon(Icons.arrow_back, size: 16),
                label: const Text('Back to Subscriptions', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInvoiceTopSummaryCard() {
    final inv = _invoiceDetail!;
    final invNum = inv['invoiceNumber']?.toString() ?? inv['id']?.toString() ?? '';
    final status = inv['status']?.toString() ?? 'Pending';
    final currency = inv['currency']?.toString() ?? 'NGN';
    final totalAmount = (inv['totalAmount'] as num?)?.toDouble() ?? 0.0;
    final totalSavings = (inv['totalSavingsAmount'] as num?)?.toDouble() ?? 0.0;
    final orgName = inv['organizationName']?.toString() ?? 'Workspace';
    final email = inv['billingEmail']?.toString() ?? '';
    final notes = inv['notes']?.toString() ?? '';
    final created = inv['createdUtc']?.toString() ?? '';
    final paidDate = inv['updatedUtc']?.toString() ?? '';
    final ref = inv['reference']?.toString();

    final isPaid = status == 'Completed';
    final isAwaiting = status == 'AwaitingVerification';

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 16,
            runSpacing: 12,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      const Text(
                        'INVOICE NUMBER',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: Color(0xFF64748B)),
                      ),
                      if (isPaid)
                        _buildStatusBadge('Paid & Activated', const Color(0xFFECFDF5), const Color(0xFF059669), Icons.verified)
                      else if (isAwaiting)
                        _buildStatusBadge('Awaiting Bank Verification', const Color(0xFFFEF3C7), const Color(0xFFB45309), Icons.hourglass_top)
                      else
                        _buildStatusBadge('Pending Payment', const Color(0xFFEFF6FF), const Color(0xFF0050E5), Icons.pending_actions),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    invNum,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, fontFamily: 'monospace', color: Color(0xFF0F172A)),
                  ),
                  if (notes.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(notes, style: const TextStyle(fontSize: 12.5, color: Color(0xFF475569))),
                  ],
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'TOTAL AMOUNT DUE ($currency)',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    currencyFormatter.format(totalAmount),
                    style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Color(0xFF0050E5)),
                  ),
                  if (totalSavings > 0) ...[
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Savings: ${currencyFormatter.format(totalSavings)}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),
          const SizedBox(height: 16),
          // Metadata grid
          Wrap(
            spacing: 24,
            runSpacing: 12,
            children: [
              _buildMetaCol('BILLED ORGANIZATION', orgName, sub: email),
              _buildMetaCol('ISSUE DATE', _formatDate(created)),
              if (isPaid && paidDate.isNotEmpty)
                _buildMetaCol('PAID DATE', _formatDate(paidDate), valueColor: const Color(0xFF059669)),
              if (ref != null && ref.isNotEmpty)
                _buildMetaCol('PAYMENT REFERENCE', ref, isMono: true),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String text, Color bg, Color textCol, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: textCol),
          const SizedBox(width: 4),
          Text(text, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: textCol)),
        ],
      ),
    );
  }

  Widget _buildMetaCol(String label, String value, {String? sub, Color? valueColor, bool isMono = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            fontFamily: isMono ? 'monospace' : null,
            color: valueColor ?? const Color(0xFF0F172A),
          ),
        ),
        if (sub != null && sub.isNotEmpty)
          Text(sub, style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
      ],
    );
  }

  String _formatDate(String raw) {
    if (raw.isEmpty) return '—';
    try {
      final dt = DateTime.parse(raw).toLocal();
      return DateFormat('MMM dd, yyyy HH:mm').format(dt);
    } catch (_) {
      return raw;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Itemized Capabilities & Dynamic Duration Table
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildItemizedCapabilitiesCard() {
    final inv = _invoiceDetail!;
    final lines = (inv['lineItems'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final totalSavings = (inv['totalSavingsAmount'] as num?)?.toDouble() ?? 0.0;
    final subtotalBeforeDiscount = (inv['subtotalBeforeDiscount'] as num?)?.toDouble() ?? 0.0;
    final totalAmount = (inv['totalAmount'] as num?)?.toDouble() ?? 0.0;
    final vatPercentage = (inv['vatPercentage'] as num?)?.toDouble() ?? 0.0;
    final vatAmount = (inv['vatAmount'] as num?)?.toDouble() ?? 0.0;
    final currency = inv['currency']?.toString() ?? 'NGN';
    final isCompleted = inv['status'] == 'Completed';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Itemized Capabilities on this Invoice (${lines.length})',
                  style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                if (_updatingCadenceFeatureCode != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2)),
                        SizedBox(width: 6),
                        Text('Updating Duration...', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Scrollable table
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 850),
              child: DataTable(
                headingRowColor: WidgetStateProperty.all(const Color(0xFFF8FAFC)),
                headingTextStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF475569)),
                horizontalMargin: 20,
                columnSpacing: 20,
                columns: const [
                  DataColumn(label: Text('S/N', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('CAPABILITY', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('BASE RATES', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('BILLING DURATION', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('DISCOUNT / SAVINGS', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('LINE TOTAL', style: TextStyle(fontWeight: FontWeight.bold)), numeric: true),
                ],
                rows: List.generate(lines.length, (idx) {
                  final line = lines[idx];
                  return _buildInvoiceLineRow(line, idx + 1, isCompleted);
                }),
              ),
            ),
          ),

          // Total Summary Footer
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(12)),
              border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (totalSavings > 0) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      const Text('Subtotal: ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                      Text(
                        currencyFormatter.format(subtotalBeforeDiscount),
                        style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), decoration: TextDecoration.lineThrough),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      const Text('Discount: ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                      Text(
                        '-${currencyFormatter.format(totalSavings)}',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                ],
                if (vatPercentage > 0 && vatAmount > 0) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text('VAT ($vatPercentage%): ', style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                      Text(currencyFormatter.format(vatAmount), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    ],
                  ),
                  const SizedBox(height: 4),
                ],
                const Divider(color: Color(0xFFCBD5E1)),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      'TOTAL AMOUNT DUE ($currency): ',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                    Text(
                      currencyFormatter.format(totalAmount),
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0050E5)),
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

  DataRow _buildInvoiceLineRow(Map<String, dynamic> line, int sn, bool isCompleted) {
    final code = line['featureCode']?.toString() ?? '';
    final name = line['featureName']?.toString() ?? code;
    final cat = line['category']?.toString() ?? '';
    final monthlyPrice = (line['monthlyPrice'] as num?)?.toDouble() ?? 0.0;
    final yearlyPrice = (line['yearlyPrice'] as num?)?.toDouble() ?? 0.0;
    final isYearlyOnly = line['isYearlyOnly'] == true;
    final selectedCadence = line['selectedCadence']?.toString() ?? 'Monthly';
    final supportedCadences = (line['supportedCadences'] as List?)?.cast<String>() ?? ['Monthly', 'Yearly'];
    final appliedSavings = (line['appliedSavingsAmount'] as num?)?.toDouble() ?? 0.0;
    final appliedPercent = (line['appliedDiscountPercent'] as num?)?.toDouble() ?? 0.0;
    final lineTotal = (line['lineTotal'] as num?)?.toDouble() ?? 0.0;

    final isUpdating = _updatingCadenceFeatureCode == code;

    return DataRow(
      cells: [
        // S/N
        DataCell(
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text('$sn', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
          ),
        ),
        // CAPABILITY
        DataCell(
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: const Color(0xFF0050E5).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.extension_outlined, size: 16, color: Color(0xFF0050E5)),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(name, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Text(code, style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF475569))),
                      ),
                      if (cat.isNotEmpty) ...[
                        const SizedBox(width: 4),
                        Text(cat, style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
                      ],
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
        // BASE RATES
        DataCell(
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (isYearlyOnly) ...[
                Text('${currencyFormatter.format(yearlyPrice)}/yr', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                const Text('Yearly Only', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
              ] else ...[
                Text('${currencyFormatter.format(monthlyPrice)}/mo', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                if (yearlyPrice > 0)
                  Text('${currencyFormatter.format(yearlyPrice)}/yr', style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
              ],
            ],
          ),
        ),
        // BILLING DURATION (Dynamic cadence dropdown or badge)
        DataCell(
          !isCompleted && supportedCadences.length > 1
              ? DropdownButtonHideUnderline(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: DropdownButton<String>(
                      value: selectedCadence,
                      isDense: true,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      onChanged: isUpdating || _isProcessingPayment
                          ? null
                          : (val) {
                              if (val != null && val != selectedCadence) {
                                _changeLineCadence(line, val);
                              }
                            },
                      items: supportedCadences.map((cad) {
                        String label = cad;
                        if (cad == 'Monthly') label = '1 Month (${currencyFormatter.format(monthlyPrice)})';
                        if (cad == 'Quarterly') label = '3 Months (${currencyFormatter.format(monthlyPrice * 3)})';
                        if (cad == 'Yearly') label = '1 Year (${currencyFormatter.format(yearlyPrice)})';
                        return DropdownMenuItem<String>(
                          value: cad,
                          child: Text(label),
                        );
                      }).toList(),
                    ),
                  ),
                )
              : Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.event_repeat, size: 12, color: Color(0xFF0050E5)),
                      const SizedBox(width: 4),
                      Text(
                        selectedCadence == 'Yearly'
                            ? '1 Year'
                            : selectedCadence == 'Quarterly'
                                ? '3 Months'
                                : '1 Month',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0050E5)),
                      ),
                    ],
                  ),
                ),
        ),
        // DISCOUNT / SAVINGS
        DataCell(
          appliedSavings > 0
              ? Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '-${appliedPercent.toInt()}% (${currencyFormatter.format(appliedSavings)})',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                  ),
                )
              : const Text('—', style: TextStyle(color: Color(0xFF94A3B8))),
        ),
        // LINE TOTAL
        DataCell(
          Text(currencyFormatter.format(lineTotal), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        ),
      ],
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Available Payment Methods Card
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildPaymentMethodsCard() {
    final inv = _invoiceDetail!;
    final methods = (inv['paymentMethods'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final totalAmount = (inv['totalAmount'] as num?)?.toDouble() ?? 0.0;
    final isAwaiting = inv['status'] == 'AwaitingVerification';

    final activeMethod = methods.firstWhere(
      (m) => m['providerCode'] == _selectedGatewayCode,
      orElse: () => {
        'providerCode': _selectedGatewayCode,
        'name': _selectedGatewayCode,
        'isConfigured': true,
      },
    );

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Select Payment Method',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 2),
          const Text(
            'Choose a payment method to complete your payment.',
            style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 16),

          // Gateway options cards
          Wrap(
            spacing: 12,
            runSpacing: 10,
            children: methods.map((m) {
              final code = m['providerCode']?.toString() ?? '';
              final name = m['name']?.toString() ?? code;
              final isConfigured = m['isConfigured'] == true;
              final isSelected = _selectedGatewayCode == code;

              return InkWell(
                onTap: isConfigured ? () => setState(() => _selectedGatewayCode = code) : null,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  width: 230,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isSelected && isConfigured
                        ? const Color(0xFF0050E5).withValues(alpha: 0.04)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected && isConfigured
                          ? const Color(0xFF0050E5)
                          : const Color(0xFFCBD5E1),
                      width: isSelected && isConfigured ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0050E5).withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          code == 'BankDeposit' ? Icons.account_balance : Icons.payments_outlined,
                          size: 18,
                          color: const Color(0xFF0050E5),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                            Text(
                              isConfigured ? (isSelected ? 'Selected' : 'Available') : 'Not Configured',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: isConfigured ? const Color(0xFF059669) : const Color(0xFFDC2626),
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (isSelected && isConfigured)
                        const Icon(Icons.radio_button_checked, size: 16, color: Color(0xFF0050E5)),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),

          // Gateway detail panel
          if (_selectedGatewayCode == 'BankDeposit') ...[
            _buildBankDepositPanel(activeMethod, totalAmount, isAwaiting),
          ] else ...[
            // Online Gateway Checkout Button (Paystack, etc.)
            Align(
              alignment: Alignment.centerRight,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: _isProcessingPayment || _updatingCadenceFeatureCode != null ? null : _proceedWithPayment,
                icon: _isProcessingPayment
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.lock_outline, size: 18),
                label: Text(
                  _isProcessingPayment
                      ? 'Processing...'
                      : 'Pay with $_selectedGatewayCode (${currencyFormatter.format(totalAmount)})',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBankDepositPanel(Map<String, dynamic> method, double totalAmount, bool isAwaiting) {
    final bankName = method['bankName']?.toString() ?? 'Central Escrow Bank';
    final acctName = method['accountName']?.toString() ?? 'Ozikol BCC Escrow';
    final acctNum = method['accountNumber']?.toString() ?? '1000000000';
    final swift = method['sortCodeOrSwift']?.toString();
    final instructions = method['instructions']?.toString();
    final recordedRef = _invoiceDetail?['paymentProofRef']?.toString();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFCBD5E1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.account_balance, color: AppColors.primary, size: 20),
                  SizedBox(width: 8),
                  Text('Direct Bank Deposit', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                ],
              ),
              if (isAwaiting)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.task_alt, size: 12, color: Color(0xFF059669)),
                      SizedBox(width: 4),
                      Text('Proof Submitted — Awaiting Verification', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),

          // Bank credentials card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Wrap(
              spacing: 24,
              runSpacing: 10,
              children: [
                _buildBankField('BANK NAME', bankName),
                _buildBankField('ACCOUNT NAME', acctName),
                _buildBankField('ACCOUNT NUMBER', acctNum, isBoldPrimary: true),
                if (swift != null && swift.isNotEmpty)
                  _buildBankField('SORT CODE / SWIFT', swift),
              ],
            ),
          ),
          if (instructions != null && instructions.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Text(instructions, style: const TextStyle(fontSize: 12, color: Color(0xFF1E3A8A))),
            ),
          ],
          const SizedBox(height: 16),

          if (isAwaiting && !_isEditingBankDepositProof) ...[
            // Submitted state alert
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF6EE7B7)),
              ),
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 12,
                runSpacing: 10,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.verified, color: Color(0xFF059669), size: 28),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Bank Deposit Reference Recorded', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF065F46))),
                          Text('Ref: $recordedRef', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF047857))),
                        ],
                      ),
                    ],
                  ),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                        ),
                        onPressed: () => setState(() => _isEditingBankDepositProof = true),
                        child: const Text('Update Reference', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                        ),
                        onPressed: _closeInvoiceDetail,
                        child: const Text('Done — View Invoices', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ] else ...[
            // Transfer reference input box
            const Text(
              'Transfer Reference / Teller / Session ID',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 10,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                SizedBox(
                  width: 320,
                  height: 42,
                  child: TextField(
                    controller: _bankDepositRefCtrl,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    decoration: InputDecoration(
                      hintText: 'e.g. TRF-000000000000',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(0, 42),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: _isProcessingPayment ? null : _submitBankDepositProof,
                  icon: _isProcessingPayment
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.upload_file, size: 16),
                  label: Text(
                    'Submit Deposit Proof (${currencyFormatter.format(totalAmount)})',
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                  ),
                ),
                if (isAwaiting && _isEditingBankDepositProof)
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 42),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () => setState(() => _isEditingBankDepositProof = false),
                    child: const Text('Cancel'),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBankField(String label, String value, {bool isBoldPrimary = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: isBoldPrimary ? 14 : 13,
            fontWeight: FontWeight.w800,
            fontFamily: isBoldPrimary ? 'monospace' : null,
            color: isBoldPrimary ? const Color(0xFF0050E5) : const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }
}
