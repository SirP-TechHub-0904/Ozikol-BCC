import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ozikol_app/core/localization/language_provider.dart';
import 'package:ozikol_app/core/models/workspace.dart';
import 'package:ozikol_app/core/theme/app_colors.dart';
import 'package:ozikol_app/core/widgets/page_header.dart';
import 'package:ozikol_app/features/dashboard/data/account_repository.dart';

/// <summary>
/// Reusable header component for Account &amp; Security Management across Flutter Desktop and Mobile.
/// Provides 1-to-1 visual and navigational parity with the Ozikol Central and Angular Web client
/// Account &amp; Security suite (/identity/console/account).
///
/// Features:
/// <list type="bullet">
///   <item>Unified top PageHeader with Royal Blue branding (#0050E5).</item>
///   <item>Horizontal 5-tab navigation bar (Password, 2FA Security, Active Devices, Login History, Roles &amp; Privileges).</item>
///   <item>Reactive 2FA status pill badge (ENFORCED / DISABLED).</item>
///   <item>Dynamic active device session count badge.</item>
///   <item>Active tab indicator underline with primary color highlights.</item>
///   <item>Deep-linking navigation synchronization with desktop sidebar.</item>
/// </list>
/// </summary>
class AccountSecurityHeader extends ConsumerStatefulWidget {
  /// The currently active tab key ('password' | '2fa' | 'devices' | 'activity' | 'roles').
  final String activeTab;

  /// Callback invoked when a tab is selected by the user.
  final ValueChanged<String>? onSelectTab;

  /// Active workspace context.
  final Workspace? workspace;

  /// Optional pre-fetched active device sessions count. If null, fetched asynchronously.
  final int? activeDevicesCount;

  /// Optional pre-fetched 2FA enforcement status. If null, fetched asynchronously.
  final bool? is2faEnabled;

  /// <summary>Creates an instance of [AccountSecurityHeader].</summary>
  const AccountSecurityHeader({
    super.key,
    required this.activeTab,
    this.onSelectTab,
    this.workspace,
    this.activeDevicesCount,
    this.is2faEnabled,
  });

  @override
  ConsumerState<AccountSecurityHeader> createState() => _AccountSecurityHeaderState();
}

class _AccountSecurityHeaderState extends ConsumerState<AccountSecurityHeader> {
  int? _loadedDevicesCount;
  bool? _loaded2faEnabled;
  late final ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _loadedDevicesCount = widget.activeDevicesCount;
    _loaded2faEnabled = widget.is2faEnabled;

    if (_loadedDevicesCount == null || _loaded2faEnabled == null) {
      _loadTelemetry();
    }

    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToActiveTab());
  }

  @override
  void didUpdateWidget(covariant AccountSecurityHeader oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.activeDevicesCount != null && widget.activeDevicesCount != _loadedDevicesCount) {
      _loadedDevicesCount = widget.activeDevicesCount;
    }
    if (widget.is2faEnabled != null && widget.is2faEnabled != _loaded2faEnabled) {
      _loaded2faEnabled = widget.is2faEnabled;
    }
    if (widget.activeTab != oldWidget.activeTab) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToActiveTab());
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  /// <summary>
  /// Scrolls the tab bar to ensure the active tab is properly in view.
  /// </summary>
  void _scrollToActiveTab() {
    if (!_scrollController.hasClients) return;
    double targetOffset = 0;
    switch (widget.activeTab) {
      case 'devices':
        targetOffset = 110;
        break;
      case 'activity':
        targetOffset = 210;
        break;
      case 'roles':
        targetOffset = 320;
        break;
      case 'password':
      case '2fa':
      default:
        targetOffset = 0;
        break;
    }
    final maxScroll = _scrollController.position.maxScrollExtent;
    final clamped = targetOffset.clamp(0.0, maxScroll);
    _scrollController.animateTo(
      clamped,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  /// <summary>
  /// Asynchronously fetches active sessions and account MFA summary if not supplied by the parent screen.
  /// </summary>
  Future<void> _loadTelemetry() async {
    try {
      final repo = ref.read(accountRepositoryProvider);
      final List<dynamic> futures = await Future.wait<dynamic>([
        if (_loadedDevicesCount == null) repo.getActiveSessions(),
        if (_loaded2faEnabled == null) repo.getAccountSummary(),
      ]);

      if (!mounted) return;

      setState(() {
        int index = 0;
        if (_loadedDevicesCount == null) {
          final sessions = futures[index++] as List<dynamic>;
          _loadedDevicesCount = sessions.length;
        }
        if (_loaded2faEnabled == null) {
          final summary = futures[index] as Map<String, dynamic>;
          _loaded2faEnabled = summary['twoFactorEnabled'] == true;
        }
      });
    } catch (_) {
      // Gracefully fall back to defaults
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);

    final mfaActive = _loaded2faEnabled ?? false;
    final devicesCount = _loadedDevicesCount ?? 1;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Top Page Header
        PageHeader(
          icon: Icons.manage_accounts_rounded,
          eyebrow: 'IDENTITY & ACCESS GOVERNANCE',
          title: 'account.title'.tr(ref, fallback: 'Account & Security Management'),
          description: 'account.subtitle'.tr(
            ref,
            fallback: 'Manage your credentials, two-factor authentication, active devices, and login activity.',
          ),
        ),
        const SizedBox(height: 16),

        // 2. Horizontal Tab Navigation Bar (1-to-1 Web DOM Alignment)
        Stack(
          alignment: Alignment.bottomLeft,
          children: [
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                height: 2,
                color: borderColor,
              ),
            ),
            SingleChildScrollView(
              controller: _scrollController,
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: [
                  _buildTab(
                    key: 'password',
                    label: 'account.tab_password'.tr(ref, fallback: 'Password'),
                    icon: Icons.key_rounded,
                    isActive: widget.activeTab == 'password',
                    isDark: isDark,
                  ),
                  _buildTab(
                    key: '2fa',
                    label: 'account.tab_2fa'.tr(ref, fallback: '2FA Security'),
                    icon: Icons.shield_outlined,
                    isActive: widget.activeTab == '2fa',
                    isDark: isDark,
                    badge: _buildMfaBadge(mfaActive),
                  ),
                  _buildTab(
                    key: 'devices',
                    label: 'account.tab_devices'.tr(ref, fallback: 'Active Devices'),
                    icon: Icons.devices_rounded,
                    isActive: widget.activeTab == 'devices',
                    isDark: isDark,
                    badge: _buildCounterBadge(devicesCount, isDark),
                  ),
                  _buildTab(
                    key: 'activity',
                    label: 'account.tab_activity'.tr(ref, fallback: 'My Activity'),
                    icon: Icons.history_rounded,
                    isActive: widget.activeTab == 'activity',
                    isDark: isDark,
                  ),
                  _buildTab(
                    key: 'roles',
                    label: 'account.tab_roles'.tr(ref, fallback: 'Roles & Privileges'),
                    icon: Icons.verified_user_rounded,
                    isActive: widget.activeTab == 'roles',
                    isDark: isDark,
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// <summary>
  /// Builds an individual tab button matching the web .tab-btn styling with prominent active state.
  /// </summary>
  Widget _buildTab({
    required String key,
    required String label,
    required IconData icon,
    required bool isActive,
    required bool isDark,
    Widget? badge,
  }) {
    final activeColor = AppColors.primary;
    final inactiveColor = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    return InkWell(
      onTap: () => widget.onSelectTab?.call(key),
      hoverColor: activeColor.withValues(alpha: 0.04),
      borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 10),
        decoration: BoxDecoration(
          color: isActive
              ? (isDark ? const Color(0xFF1E3A8A).withValues(alpha: 0.35) : const Color(0xFFEFF6FF))
              : Colors.transparent,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
          border: Border(
            bottom: BorderSide(
              color: isActive ? activeColor : Colors.transparent,
              width: 3.5,
            ),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16.5,
              color: isActive ? activeColor : inactiveColor,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
                color: isActive ? (isDark ? const Color(0xFF93C5FD) : activeColor) : inactiveColor,
                letterSpacing: 0.1,
              ),
            ),
            if (badge != null) ...[
              const SizedBox(width: 6),
              badge,
            ],
          ],
        ),
      ),
    );
  }

  /// <summary>
  /// Builds the 2FA enforcement pill badge ([ENFORCED] / [DISABLED]).
  /// </summary>
  Widget _buildMfaBadge(bool isEnforced) {
    final bgColor = isEnforced
        ? const Color(0xFF16A34A).withValues(alpha: 0.12)
        : const Color(0xFFEF4444).withValues(alpha: 0.12);
    final fgColor = isEnforced ? const Color(0xFF16A34A) : const Color(0xFFEF4444);
    final label = isEnforced
        ? 'account.status_enforced'.tr(ref, fallback: 'ENFORCED')
        : 'account.status_disabled'.tr(ref, fallback: 'DISABLED');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5.5, vertical: 1.5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(9999),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 9.5,
          fontWeight: FontWeight.w700,
          color: fgColor,
          letterSpacing: 0.3,
        ),
      ),
    );
  }

  /// <summary>
  /// Builds the active sessions numerical counter pill badge.
  /// </summary>
  Widget _buildCounterBadge(int count, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5.5, vertical: 1.5),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        borderRadius: BorderRadius.circular(9999),
      ),
      child: Text(
        '$count',
        style: TextStyle(
          fontSize: 9.5,
          fontWeight: FontWeight.w700,
          color: isDark ? Colors.white : const Color(0xFF334155),
        ),
      ),
    );
  }
}

/// <summary>
/// Reusable section card wrapper matching Web's .card-section and .section-card-head DOM structure.
/// Encapsulates the section icon, title, description, and contextual header action button.
/// </summary>
class AccountSectionCard extends StatelessWidget {
  /// Section leading icon.
  final IconData icon;

  /// Section heading text.
  final String title;

  /// Explanatory subtitle text.
  final String description;

  /// Optional contextual action button (e.g. Terminate Others, Export, Refresh).
  final Widget? action;

  /// Card body content.
  final Widget child;

  /// Optional custom padding for card body. Defaults to EdgeInsets.all(20).
  final EdgeInsetsGeometry? bodyPadding;

  /// <summary>Creates an instance of [AccountSectionCard].</summary>
  const AccountSectionCard({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    required this.child,
    this.action,
    this.bodyPadding,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.outlineDark : AppColors.outlineLight;
    final cardBg = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final headBg = isDark ? const Color(0xFF1E293B).withValues(alpha: 0.45) : const Color(0xFFF8FAFC);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Card Head (.section-card-head)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: BoxDecoration(
              color: headBg,
              border: Border(
                bottom: BorderSide(color: borderColor),
              ),
            ),
            child: Row(
              children: [
                Icon(icon, size: 22, color: AppColors.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        description,
                        style: TextStyle(
                          fontSize: 12.5,
                          color: isDark ? AppColors.gray400 : AppColors.gray600,
                        ),
                      ),
                    ],
                  ),
                ),
                if (action != null) ...[
                  const SizedBox(width: 16),
                  action!,
                ],
              ],
            ),
          ),

          // Section Card Body (.card-body)
          Padding(
            padding: bodyPadding ?? const EdgeInsets.all(20),
            child: child,
          ),
        ],
      ),
    );
  }
}
