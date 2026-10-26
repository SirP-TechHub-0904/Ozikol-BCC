import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';
import 'widgets/account_security_header.dart';

/// <summary>
/// Screen presenting the Roles &amp; Privileges tab in the Account &amp; Security suite.
/// Provides 1-to-1 operational and visual parity with Tab 5 of the Angular Web Console
/// (/identity/console/account?tab=roles).
///
/// Features:
/// <list type="bullet">
///   <item>Persistent [AccountSecurityHeader] with activeTab set to 'roles'.</item>
///   <item>Security credential cards for each assigned tenant role (e.g. SuperAdmin, Admin, Member).</item>
///   <item>Tenant authorization scope details (Organization Key, Console Mode, Member ID).</item>
///   <item>Administrative privilege request notice.</item>
/// </list>
/// </summary>
class AccountRolesPrivilegesView extends ConsumerStatefulWidget {
  /// The active workspace organization context.
  final Workspace? workspace;

  /// Callback to switch account navigation tabs.
  final ValueChanged<String>? onSelectTab;

  /// <summary>Creates an instance of [AccountRolesPrivilegesView].</summary>
  const AccountRolesPrivilegesView({
    super.key,
    this.workspace,
    this.onSelectTab,
  });

  @override
  ConsumerState<AccountRolesPrivilegesView> createState() => _AccountRolesPrivilegesViewState();
}

class _AccountRolesPrivilegesViewState extends ConsumerState<AccountRolesPrivilegesView> {
  bool _isLoading = true;
  List<String> _roles = [];
  Map<String, dynamic>? _summary;

  @override
  void initState() {
    super.initState();
    _loadRoles();
  }

  /// <summary>
  /// Asynchronously fetches account summary and role assignments from the backend.
  /// </summary>
  Future<void> _loadRoles() async {
    setState(() => _isLoading = true);
    try {
      final repo = ref.read(accountRepositoryProvider);
      final summary = await repo.getAccountSummary();
      final wsRoles = widget.workspace?.userRoles ?? [];

      List<String> fetchedRoles = [];
      if (summary['roles'] is List) {
        fetchedRoles = (summary['roles'] as List).map((e) => e.toString()).toList();
      }

      if (fetchedRoles.isEmpty && wsRoles.isNotEmpty) {
        fetchedRoles = wsRoles;
      }

      if (fetchedRoles.isEmpty) {
        fetchedRoles = ['Member'];
      }

      if (mounted) {
        setState(() {
          _summary = summary;
          _roles = fetchedRoles;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _roles = widget.workspace?.userRoles ?? ['Member'];
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ws = widget.workspace;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Unified Account Header & Navigation Tabs
          AccountSecurityHeader(
            activeTab: 'roles',
            onSelectTab: widget.onSelectTab,
            workspace: widget.workspace,
          ),
          const SizedBox(height: 20),

          // 2. Roles & Privileges Section Card (matching Web .card-section)
          AccountSectionCard(
            icon: Icons.verified_user_rounded,
            title: 'account.tab_roles'.tr(ref, fallback: 'Roles & Privileges'),
            description: 'Overview of your assigned role privileges and authorization scope within this tenant.',
            action: OutlinedButton.icon(
              onPressed: _loadRoles,
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: Text('btn.refresh'.tr(ref, fallback: 'Refresh'), style: const TextStyle(fontSize: 12.5)),
            ),
            bodyPadding: const EdgeInsets.all(20),
            child: _isLoading
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: CircularProgressIndicator(),
                    ),
                  )
                : LayoutBuilder(
                    builder: (context, constraints) {
                      final isNarrow = constraints.maxWidth < 600;
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Roles Cards Grid
                          Wrap(
                            spacing: 16,
                            runSpacing: 16,
                            children: _roles.map((role) {
                              final isSuper = role.toLowerCase().contains('super');
                              final isAdmin = role.toLowerCase().contains('admin');

                              return Container(
                                width: isNarrow ? double.infinity : 280,
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isSuper
                                        ? AppColors.primary.withValues(alpha: 0.4)
                                        : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                                    width: isSuper ? 1.5 : 1,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 42,
                                      height: 42,
                                      decoration: BoxDecoration(
                                        color: isSuper
                                            ? AppColors.primary.withValues(alpha: 0.12)
                                            : (isAdmin
                                                ? const Color(0xFF0284C7).withValues(alpha: 0.12)
                                                : Colors.grey.withValues(alpha: 0.12)),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Icon(
                                        isSuper
                                            ? Icons.security_rounded
                                            : (isAdmin ? Icons.admin_panel_settings_rounded : Icons.shield_outlined),
                                        color: isSuper
                                            ? AppColors.primary
                                            : (isAdmin ? const Color(0xFF0284C7) : AppColors.gray500),
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            role,
                                            style: TextStyle(
                                              fontSize: 14.5,
                                              fontWeight: FontWeight.w700,
                                              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            isSuper
                                                ? 'Full workspace administrative governance'
                                                : 'Assigned administrative security credential',
                                            style: TextStyle(
                                              fontSize: 11.5,
                                              color: isDark ? AppColors.gray400 : AppColors.gray600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 24),

                          // Workspace Scope Details
                          Container(
                            padding: const EdgeInsets.all(18),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.domain_rounded, size: 18, color: AppColors.primary),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Tenant Authorization Scope',
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w700,
                                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 24,
                                  runSpacing: 10,
                                  children: [
                                    _buildScopeItem('Tenant Name', ws?.organizationName ?? 'Default Organization', isDark),
                                    _buildScopeItem('Tenant Key', ws?.tenantKey ?? 'default', isDark),
                                    _buildScopeItem('Active Mode', ws?.activeConsoleMode ?? 'Administration', isDark),
                                    _buildScopeItem('Authenticated As', _summary?['email'] ?? ws?.userEmail ?? 'account@domain.com', isDark),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Privileges Note
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.05),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.info_outline_rounded, color: AppColors.primary, size: 20),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'Need elevated privileges or additional feature roles? Contact your workspace Super Administrator to request permission adjustments.',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      color: isDark ? AppColors.gray300 : const Color(0xFF1E293B),
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildScopeItem(String label, String value, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: isDark ? AppColors.gray400 : AppColors.gray600,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
          ),
        ),
      ],
    );
  }
}
