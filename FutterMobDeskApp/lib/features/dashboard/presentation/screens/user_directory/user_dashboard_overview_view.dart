import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/account_repository.dart';

/// Screen presenting the Dashboard Overview under User Directory.
/// Displays membership counters, registration activity charts, and identity health metrics.
class UserDashboardOverviewView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Creates a [UserDashboardOverviewView].
  const UserDashboardOverviewView({super.key, this.workspace});

  @override
  ConsumerState<UserDashboardOverviewView> createState() => _UserDashboardOverviewViewState();
}

class _UserDashboardOverviewViewState extends ConsumerState<UserDashboardOverviewView> {
  bool _isLoading = true;
  Map<String, dynamic> _counts = {'total': 0, 'active': 0, 'pending': 0, 'locked': 0};

  @override
  void initState() {
    super.initState();
    _loadCounts();
  }

  Future<void> _loadCounts() async {
    setState(() => _isLoading = true);
    try {
      final repo = ref.read(accountRepositoryProvider);
      final res = await repo.getUserCounts();
      setState(() {
        _counts = res;
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    final total = _counts['total'] ?? 0;
    final active = _counts['active'] ?? 0;
    final pending = _counts['pending'] ?? 0;
    final locked = _counts['locked'] ?? 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.analytics_outlined, size: 26, color: AppColors.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'User Directory Overview',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Real-time metrics, active membership telemetry, and registration analytics.',
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                tooltip: 'Refresh Metrics',
                onPressed: _loadCounts,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // 4 KPI Cards Strip
          GridView.count(
            crossAxisCount: MediaQuery.of(context).size.width >= 900 ? 4 : 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.6,
            children: [
              _buildKpiCard(
                title: 'Total Members',
                value: total.toString(),
                icon: Icons.groups_rounded,
                color: AppColors.primary,
                isDark: isDark,
              ),
              _buildKpiCard(
                title: 'Active Members',
                value: active.toString(),
                icon: Icons.verified_user_rounded,
                color: AppColors.success,
                isDark: isDark,
              ),
              _buildKpiCard(
                title: 'Pending Invites',
                value: pending.toString(),
                icon: Icons.mark_email_unread_rounded,
                color: AppColors.warning,
                isDark: isDark,
              ),
              _buildKpiCard(
                title: 'Locked Accounts',
                value: locked.toString(),
                icon: Icons.lock_person_rounded,
                color: AppColors.error,
                isDark: isDark,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Analytics Summary Card
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.insights_rounded, size: 20, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Text(
                      'Membership Growth & Governance',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'All member registrations, account activations, and invitation acceptance events are recorded securely in the tenant audit log.',
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? AppColors.gray400 : AppColors.gray600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 20, color: color),
              ),
              const Spacer(),
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            ),
          ),
        ],
      ),
    );
  }
}
