import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/central_adjuster.dart';
import '../../../data/account_repository.dart';

/// Screen presenting the full Member Management & Directory Hub dashboard overview.
/// Replicates the Angular Web UserDashboardComponent 1-to-1 with real-time stats,
/// demographic breakdown, quota analytics, growth trends, KPI scorecards,
/// quick action tiles, recently onboarded members, and forensic audit trails.
class UserDashboardOverviewView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Optional callback to navigate to other tabs in the dashboard shell.
  final void Function(int tabIndex, {String? filterStatus})? onNavigateToTab;

  /// Creates a [UserDashboardOverviewView].
  const UserDashboardOverviewView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
  });

  @override
  ConsumerState<UserDashboardOverviewView> createState() => _UserDashboardOverviewViewState();
}

class _UserDashboardOverviewViewState extends ConsumerState<UserDashboardOverviewView> {
  bool _isLoading = true;
  Map<String, dynamic> _stats = {};

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => _isLoading = true);
    try {
      final repo = ref.read(accountRepositoryProvider);
      final res = await repo.getDashboardStats();
      if (mounted) {
        setState(() {
          _stats = res;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Map<String, int> _getGenderSplit() {
    final male = (_stats['maleMembers'] as num?)?.toInt() ?? 0;
    final female = (_stats['femaleMembers'] as num?)?.toInt() ?? 0;
    final total = male + female;
    if (total == 0) return {'malePercent': 50, 'femalePercent': 50};
    final malePercent = ((male / total) * 100).round();
    final femalePercent = 100 - malePercent;
    return {'malePercent': malePercent, 'femalePercent': femalePercent};
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    final totalMembers = (_stats['totalMembers'] as num?)?.toInt() ?? 0;
    final activeMembers = (_stats['activeMembers'] as num?)?.toInt() ?? 0;
    final suspiciousAccounts = (_stats['suspiciousAccounts'] as num?)?.toInt() ?? 0;
    final suspendedMembers = (_stats['suspendedMembers'] as num?)?.toInt() ?? 0;

    final planQuota = _stats['planQuota'] as Map<String, dynamic>? ?? {};
    final planType = planQuota['planType'] as String? ?? 'Starter';
    final usedSeats = (planQuota['usedSeats'] as num?)?.toInt() ?? totalMembers;
    final maximumUsers = (planQuota['maximumUsers'] as num?)?.toInt() ?? 100;
    final isUnlimited = planQuota['isUnlimited'] as bool? ?? false;
    final remainingSeats = (planQuota['remainingSeats'] as num?)?.toInt() ?? 0;
    final seatUsagePercent = (planQuota['seatUsagePercent'] as num?)?.toInt() ?? 0;

    final genderSplit = _getGenderSplit();
    final malePercent = genderSplit['malePercent']!;
    final femalePercent = genderSplit['femalePercent']!;
    final maleMembers = (_stats['maleMembers'] as num?)?.toInt() ?? 0;
    final femaleMembers = (_stats['femaleMembers'] as num?)?.toInt() ?? 0;

    final growthTrend = _stats['growthTrend'] as Map<String, dynamic>? ?? {};
    final growthLabels = List<String>.from(growthTrend['labels'] ?? ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6']);
    final growthCounts = List<int>.from(growthTrend['counts'] ?? [0, 0, 0, 0, 0, totalMembers]);

    final kpiStats = _stats['kpiStats'] as Map<String, dynamic>? ?? {};
    final avgOrgScore = (kpiStats['avgOrgScore'] as num?)?.toDouble() ?? 0.0;
    final indicatorsCount = (kpiStats['indicatorsCount'] as num?)?.toInt() ?? 0;
    final evaluatedMembersCount = (kpiStats['evaluatedMembersCount'] as num?)?.toInt() ?? 0;
    final totalEvaluations = (kpiStats['totalEvaluations'] as num?)?.toInt() ?? 0;
    final leaderboard = List<Map<String, dynamic>>.from(kpiStats['leaderboard'] ?? []);

    final kpiBarData = kpiStats['barChart'] as Map<String, dynamic>? ?? {};
    final kpiBarLabels = List<String>.from(kpiBarData['labels'] ?? []);
    final kpiBarScores = List<double>.from((kpiBarData['scores'] as List<dynamic>?)?.map((s) => (s as num).toDouble()) ?? []);

    final recentRegistrations = List<Map<String, dynamic>>.from(_stats['recentRegistrations'] ?? []);
    final recentLogs = List<Map<String, dynamic>>.from(_stats['recentLogs'] ?? []);

    return CentralAdjuster.pageShell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ===================================================================
          // STANDARDIZED PAGE HEADER (1-to-1 with Angular AppPageHeader)
          // ===================================================================
          _buildPageHeader(isDark),
          const SizedBox(height: 20),

          // ===================================================================
          // ROW 1: 4 CORE OPERATIONAL METRICS (CLICKABLE)
          // ===================================================================
          _buildRow1Metrics(
            isDark: isDark,
            totalMembers: totalMembers,
            activeMembers: activeMembers,
            suspiciousAccounts: suspiciousAccounts,
            suspendedMembers: suspendedMembers,
          ),
          const SizedBox(height: 20),

          // ===================================================================
          // ROW 2: DEMOGRAPHICS (MALE/FEMALE) & MEMBERSHIP PLAN QUOTA
          // ===================================================================
          CentralAdjuster.split(
            first: _buildGenderDemographicsCard(
              isDark: isDark,
              maleCount: maleMembers,
              femaleCount: femaleMembers,
              malePercent: malePercent,
              femalePercent: femalePercent,
            ),
            second: _buildPlanQuotaCard(
              isDark: isDark,
              planType: planType,
              usedSeats: usedSeats,
              maximumUsers: maximumUsers,
              isUnlimited: isUnlimited,
              remainingSeats: remainingSeats,
              seatUsagePercent: seatUsagePercent,
            ),
          ),
          const SizedBox(height: 20),

          // ===================================================================
          // ROW 3: 50% GROWTH TREND + 50% BEST PERFORMING KPI BAR CHART
          // ===================================================================
          CentralAdjuster.split(
            first: _buildGrowthTrendCard(
              isDark: isDark,
              labels: growthLabels,
              counts: growthCounts,
            ),
            second: _buildKpiComparisonCard(
              isDark: isDark,
              labels: kpiBarLabels,
              scores: kpiBarScores,
            ),
          ),
          const SizedBox(height: 20),

          // ===================================================================
          // ROW 4: KPI LEADERBOARD & PERFORMANCE HEALTH
          // ===================================================================
          CentralAdjuster.split(
            first: _buildLeaderboardCard(
              isDark: isDark,
              leaderboard: leaderboard,
            ),
            second: _buildKpiHealthCard(
              isDark: isDark,
              avgOrgScore: avgOrgScore,
              indicatorsCount: indicatorsCount,
              evaluatedMembersCount: evaluatedMembersCount,
              totalEvaluations: totalEvaluations,
            ),
          ),
          const SizedBox(height: 20),

          // ===================================================================
          // ROW 5: QUICK ACTIONS & RECENTLY ONBOARDED MEMBERS
          // ===================================================================
          CentralAdjuster.split(
            first: _buildQuickActionsCard(isDark: isDark),
            second: _buildRecentRegistrationsCard(
              isDark: isDark,
              registrations: recentRegistrations,
            ),
          ),
          const SizedBox(height: 20),

          // ===================================================================
          // ROW 6: SECURITY & FORENSIC AUDIT TRAIL
          // ===================================================================
          _buildAuditTrailCard(isDark: isDark, logs: recentLogs),
        ],
      ),
    );
  }

  // ===========================================================================
  // PAGE HEADER (1-to-1 with Angular AppPageHeader)
  // ===========================================================================
  Widget _buildPageHeader(bool isDark) {
    return CentralAdjuster.pageHeader(
      icon: Icons.groups_rounded,
      eyebrow: 'User Management & Directory',
      title: 'Member Management & Directory Hub',
      subtitle:
          'Executive real-time intelligence, demographic distributions, category tiers, KPI scorecards, and forensic audit logs.',
      isDark: isDark,
      actions: [
        OutlinedButton.icon(
          onPressed: () => widget.onNavigateToTab?.call(1),
          icon: const Icon(Icons.table_view_rounded, size: 16),
          label: const Text('Directory Register'),
          style: OutlinedButton.styleFrom(
            foregroundColor: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
        ),
        FilledButton.icon(
          onPressed: () => widget.onNavigateToTab?.call(16),
          icon: const Icon(Icons.person_add_rounded, size: 16),
          label: const Text('Add Member'),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.refresh_rounded, size: 18),
          tooltip: 'Refresh Intelligence',
          onPressed: _loadStats,
        ),
      ],
    );
  }

  // ===========================================================================
  // ROW 1: 4 CORE OPERATIONAL METRICS (CLICKABLE)
  // ===========================================================================
  Widget _buildRow1Metrics({
    required bool isDark,
    required int totalMembers,
    required int activeMembers,
    required int suspiciousAccounts,
    required int suspendedMembers,
  }) {
    return CentralAdjuster.metricGrid(
      cards: [
        CentralAdjuster.metricCard(
          title: 'Total Members',
          value: totalMembers.toString(),
          subtext: 'Registered Profiles • View All →',
          icon: Icons.groups_rounded,
          gradientColors: const [Color(0xFF0050E5), Color(0xFF3B82F6)],
          onTap: () => widget.onNavigateToTab?.call(1, filterStatus: 'All'),
        ),
        CentralAdjuster.metricCard(
          title: 'Active Accounts',
          value: activeMembers.toString(),
          subtext: 'Good Standing • Filter →',
          icon: Icons.verified_user_rounded,
          gradientColors: const [Color(0xFF10B981), Color(0xFF059669)],
          valueColor: const Color(0xFF10B981),
          onTap: () => widget.onNavigateToTab?.call(1, filterStatus: 'Active'),
        ),
        CentralAdjuster.metricCard(
          title: 'Suspicious / Flagged',
          value: suspiciousAccounts.toString(),
          subtext: 'Lockouts & Logins • Filter →',
          icon: Icons.gpp_maybe_rounded,
          gradientColors: const [Color(0xFFE11D48), Color(0xFFF43F5E)],
          valueColor: const Color(0xFFE11D48),
          isAlert: suspiciousAccounts > 0,
          onTap: () => widget.onNavigateToTab?.call(1, filterStatus: 'Suspicious'),
        ),
        CentralAdjuster.metricCard(
          title: 'Suspended',
          value: suspendedMembers.toString(),
          subtext: 'Access Restricted • Filter →',
          icon: Icons.block_rounded,
          gradientColors: const [Color(0xFFF59E0B), Color(0xFFD97706)],
          valueColor: const Color(0xFFF59E0B),
          onTap: () => widget.onNavigateToTab?.call(1, filterStatus: 'Suspended'),
        ),
      ],
    );
  }

  // ===========================================================================
  // ROW 2: GENDER DEMOGRAPHICS CARD (DUAL 100% MEETING IN MIDDLE)
  // ===========================================================================
  Widget _buildGenderDemographicsCard({
    required bool isDark,
    required int maleCount,
    required int femaleCount,
    required int malePercent,
    required int femalePercent,
  }) {
    return _buildPanelCard(
      isDark: isDark,
      title: 'Gender Demographic Distribution',
      subtitle: 'Dual roster ratio • Blue (Left) & Pink (Right)',
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        decoration: BoxDecoration(
          color: const Color(0xFFEFF6FF),
          borderRadius: BorderRadius.circular(6),
        ),
        child: const Text(
          '100% Total Ratio',
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0050E5),
          ),
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Male Side
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE0F2FE),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.male_rounded, color: Color(0xFF0284C7), size: 22),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Male: $maleCount',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.gray300 : const Color(0xFF334155),
                        ),
                      ),
                      Text(
                        '$malePercent%',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0284C7),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              // Roster Split Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(Icons.transgender_rounded, size: 14, color: isDark ? AppColors.gray400 : const Color(0xFF94A3B8)),
                    const SizedBox(width: 4),
                    Text(
                      'ROSTER SPLIT',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.gray400 : const Color(0xFF94A3B8),
                        letterSpacing: 0.05,
                      ),
                    ),
                  ],
                ),
              ),

              // Female Side
              Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'Female: $femaleCount',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.gray300 : const Color(0xFF334155),
                        ),
                      ),
                      Text(
                        '$femalePercent%',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFFDB2777),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 10),
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFCE7F3),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.female_rounded, color: Color(0xFFDB2777), size: 22),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Dual 100% Progress Bar Meeting in Middle
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: SizedBox(
              height: 12,
              child: Row(
                children: [
                  Expanded(
                    flex: malePercent,
                    child: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFF0050E5), Color(0xFF38BDF8)],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: femalePercent,
                    child: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFFF472B6), Color(0xFFDB2777)],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Progress Footer
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text(
                  '♂ Male $malePercent%',
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF64748B),
                  ),
                ),
              ),
              const SizedBox(width: 4),
              const Flexible(
                child: Text(
                  '100% Total Representation',
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  'Female $femalePercent% ♀',
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.end,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // ROW 2: MEMBERSHIP PLAN QUOTA CARD
  // ===========================================================================
  Widget _buildPlanQuotaCard({
    required bool isDark,
    required String planType,
    required int usedSeats,
    required int maximumUsers,
    required bool isUnlimited,
    required int remainingSeats,
    required int seatUsagePercent,
  }) {
    Color barColor = const Color(0xFF10B981);
    if (seatUsagePercent >= 95) {
      barColor = const Color(0xFFE11D48);
    } else if (seatUsagePercent >= 80) {
      barColor = const Color(0xFFF59E0B);
    }

    return _buildPanelCard(
      isDark: isDark,
      title: 'Membership Plan & Capacity Quota',
      subtitle: 'Tenant platform subscription and seat limit allocation',
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        decoration: BoxDecoration(
          color: const Color(0xFFF0FDF4),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: const Color(0xFFBBF7D0)),
        ),
        child: Text(
          '$planType Tier'.toUpperCase(),
          style: const TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            color: Color(0xFF15803D),
          ),
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'ALLOCATED SEATS',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        '$usedSeats',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        ),
                      ),
                      Text(
                        ' / ${isUnlimited ? '∞' : maximumUsers}',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'REMAINING ALLOWANCE',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isUnlimited ? 'Unlimited Seats' : '$remainingSeats Seats Left',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF10B981),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Quota Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: SizedBox(
              height: 12,
              child: LinearProgressIndicator(
                value: isUnlimited ? 0.05 : (seatUsagePercent / 100.0).clamp(0.0, 1.0),
                backgroundColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFE2E8F0),
                valueColor: AlwaysStoppedAnimation<Color>(barColor),
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Quota Footer
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text(
                  isUnlimited ? 'Enterprise Unlimited' : '$seatUsagePercent% Capacity Used',
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF475569),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  isUnlimited ? 'Full Platform Unrestricted' : 'Hard Cap Enforced by Central Admin',
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.end,
                  style: const TextStyle(
                    fontSize: 10.5,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // ROW 3: GROWTH TREND CARD (CUSTOM PAINTED SMOOTH AREA CHART)
  // ===========================================================================
  Widget _buildGrowthTrendCard({
    required bool isDark,
    required List<String> labels,
    required List<int> counts,
  }) {
    return _buildPanelCard(
      isDark: isDark,
      title: 'Member Registration & Growth Trend',
      subtitle: '6-month onboarding curve and profile acquisition velocity',
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        decoration: BoxDecoration(
          color: const Color(0xFFEFF6FF),
          borderRadius: BorderRadius.circular(6),
        ),
        child: const Text(
          'Past 6 Months',
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0050E5),
          ),
        ),
      ),
      child: Column(
        children: [
          SizedBox(
            height: 200,
            width: double.infinity,
            child: CustomPaint(
              painter: _GrowthTrendPainter(
                labels: labels,
                counts: counts,
                isDark: isDark,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: labels.map((l) {
              return Text(
                l,
                style: TextStyle(
                  fontSize: 10.5,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                  fontWeight: FontWeight.w500,
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // ROW 3: BEST PERFORMING MEMBERS KPI BAR CHART CARD
  // ===========================================================================
  Widget _buildKpiComparisonCard({
    required bool isDark,
    required List<String> labels,
    required List<double> scores,
  }) {
    return _buildPanelCard(
      isDark: isDark,
      title: 'Best Performing Members (KPI Scorecards)',
      subtitle: 'Performance evaluation comparison across top member profiles',
      trailing: TextButton(
        onPressed: () => widget.onNavigateToTab?.call(5),
        style: TextButton.styleFrom(
          padding: EdgeInsets.zero,
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        child: const Text(
          'KPI Hub →',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0050E5),
          ),
        ),
      ),
      child: labels.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 36),
                child: Column(
                  children: [
                    Icon(Icons.military_tech_rounded, size: 36, color: isDark ? AppColors.gray600 : AppColors.gray300),
                    const SizedBox(height: 8),
                    Text(
                      'No evaluated member scorecards yet.',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ],
                ),
              ),
            )
          : Column(
              children: List.generate(labels.length, (idx) {
                final label = labels[idx];
                final score = scores.length > idx ? scores[idx] : 0.0;
                final colors = [
                  const Color(0xFF0050E5),
                  const Color(0xFF10B981),
                  const Color(0xFF8B5CF6),
                  const Color(0xFFF59E0B),
                ];
                final color = colors[idx % colors.length];

                return Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            label,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                            ),
                          ),
                          Text(
                            '${score.toStringAsFixed(1)}%',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w800,
                              color: color,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: (score / 100.0).clamp(0.0, 1.0),
                          minHeight: 10,
                          backgroundColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF1F5F9),
                          valueColor: AlwaysStoppedAnimation<Color>(color),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ),
    );
  }

  // ===========================================================================
  // ROW 4: TOP PERFORMING MEMBERS LEADERBOARD
  // ===========================================================================
  Widget _buildLeaderboardCard({
    required bool isDark,
    required List<Map<String, dynamic>> leaderboard,
  }) {
    return _buildPanelCard(
      isDark: isDark,
      title: 'Top Performing Members (Leaderboard)',
      subtitle: 'Highest average composite scores recorded in evaluations',
      trailing: TextButton(
        onPressed: () => widget.onNavigateToTab?.call(5),
        style: TextButton.styleFrom(
          padding: EdgeInsets.zero,
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        child: const Text(
          'Full Leaderboard →',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0050E5),
          ),
        ),
      ),
      child: leaderboard.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Column(
                  children: [
                    const Icon(Icons.military_tech_rounded, size: 36, color: Color(0xFFCBD5E1)),
                    const SizedBox(height: 8),
                    const Text(
                      'No KPI evaluation scorecards submitted yet.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: () => widget.onNavigateToTab?.call(5),
                      child: const Text('Open KPI Hub', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ),
            )
          : Column(
              children: leaderboard.map((item) {
                final rank = (item['rank'] as num?)?.toInt() ?? 1;
                final fullName = item['fullName'] as String? ?? 'Member';
                final categoryName = item['categoryName'] as String? ?? 'General';
                final email = item['email'] as String? ?? '';
                final avgScore = (item['avgScore'] as num?)?.toDouble() ?? 0.0;
                final latestPeriod = item['latestPeriod'] as String? ?? 'Current';

                String medal = '🥉';
                if (rank == 1) medal = '🥇';
                if (rank == 2) medal = '🥈';

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    children: [
                      Text(medal, style: const TextStyle(fontSize: 22)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              fullName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              '$categoryName • $email',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${avgScore.toStringAsFixed(1)}%',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0050E5),
                            ),
                          ),
                          Text(
                            latestPeriod,
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 10),
                      IconButton(
                        icon: const Icon(Icons.assignment_turned_in_rounded, size: 18),
                        tooltip: 'Grade Member',
                        color: const Color(0xFF0050E5),
                        onPressed: () => widget.onNavigateToTab?.call(5),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  // ===========================================================================
  // ROW 4: KPI ORGANIZATIONAL PERFORMANCE HEALTH
  // ===========================================================================
  Widget _buildKpiHealthCard({
    required bool isDark,
    required double avgOrgScore,
    required int indicatorsCount,
    required int evaluatedMembersCount,
    required int totalEvaluations,
  }) {
    return _buildPanelCard(
      isDark: isDark,
      title: 'KPI Organizational Performance Health',
      subtitle: 'Summary of active metric indicators and evaluation coverage',
      trailing: TextButton(
        onPressed: () => widget.onNavigateToTab?.call(5),
        style: TextButton.styleFrom(
          padding: EdgeInsets.zero,
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        child: const Text(
          '+ Add Metric',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0050E5),
          ),
        ),
      ),
      child: CentralAdjuster.grid(
        minItemWidth: 160,
        spacing: 12,
        runSpacing: 12,
        maxColumns: 2,
        children: [
          _buildHealthTile(
            isDark: isDark,
            label: 'Avg Organization Score',
            value: '${avgOrgScore.toStringAsFixed(1)}%',
            subtext: 'Across All Evaluations',
            valueColor: const Color(0xFF0050E5),
          ),
          _buildHealthTile(
            isDark: isDark,
            label: 'Active KPI Indicators',
            value: indicatorsCount.toString(),
            subtext: 'Configured Rubrics',
          ),
          _buildHealthTile(
            isDark: isDark,
            label: 'Evaluated Headcount',
            value: evaluatedMembersCount.toString(),
            subtext: 'Members Assessed',
            valueColor: const Color(0xFF10B981),
          ),
          _buildHealthTile(
            isDark: isDark,
            label: 'Total Scorecards',
            value: totalEvaluations.toString(),
            subtext: 'Historical Submissions',
            valueColor: const Color(0xFF8B5CF6),
          ),
        ],
      ),
    );
  }

  Widget _buildHealthTile({
    required bool isDark,
    required String label,
    required String value,
    required String subtext,
    Color? valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: Color(0xFF64748B),
              letterSpacing: 0.04,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: valueColor ?? (isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A)),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtext,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 10.5,
              color: Color(0xFF94A3B8),
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // ROW 5: QUICK ACTIONS CARD
  // ===========================================================================
  Widget _buildQuickActionsCard({required bool isDark}) {
    return _buildPanelCard(
      isDark: isDark,
      title: 'Quick Action Center',
      subtitle: 'Fast shortcuts for member administration',
      child: Column(
        children: [
          _buildActionTile(
            isDark: isDark,
            icon: Icons.person_add_rounded,
            iconColor: const Color(0xFF0050E5),
            title: 'Add New Member',
            desc: 'Add a new member with temporary login credentials',
            onTap: () => widget.onNavigateToTab?.call(1),
          ),
          const SizedBox(height: 10),
          _buildActionTile(
            isDark: isDark,
            icon: Icons.add_circle_rounded,
            iconColor: const Color(0xFF8B5CF6),
            title: 'Create Category Tier',
            desc: 'Add department, faculty, or tier grouping',
            onTap: () => widget.onNavigateToTab?.call(2),
          ),
          const SizedBox(height: 10),
          _buildActionTile(
            isDark: isDark,
            icon: Icons.table_view_rounded,
            iconColor: const Color(0xFF10B981),
            title: 'Export Member Directory',
            desc: 'Generate PDF, Excel, and Word registers',
            onTap: () => widget.onNavigateToTab?.call(1),
          ),
          const SizedBox(height: 10),
          _buildActionTile(
            isDark: isDark,
            icon: Icons.analytics_rounded,
            iconColor: const Color(0xFF6366F1),
            title: 'Evaluate KPI Scores',
            desc: 'Review leaderboards and batch grade scorecards',
            onTap: () => widget.onNavigateToTab?.call(5),
          ),
        ],
      ),
    );
  }

  Widget _buildActionTile({
    required bool isDark,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String desc,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.onSurfaceDark : const Color(0xFF1E293B),
                    ),
                  ),
                  Text(
                    desc,
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8), size: 20),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // ROW 5: RECENTLY ONBOARDED MEMBERS
  // ===========================================================================
  Widget _buildRecentRegistrationsCard({
    required bool isDark,
    required List<Map<String, dynamic>> registrations,
  }) {
    return _buildPanelCard(
      isDark: isDark,
      title: 'Recently Onboarded Members',
      subtitle: 'Latest organizational accounts registered in tenant',
      trailing: TextButton(
        onPressed: () => widget.onNavigateToTab?.call(1),
        style: TextButton.styleFrom(
          padding: EdgeInsets.zero,
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        child: const Text(
          'View All →',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0050E5),
          ),
        ),
      ),
      child: registrations.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 28),
                child: Text(
                  'No organizational members registered yet.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
              ),
            )
          : Column(
              children: registrations.map((m) {
                final fullName = m['fullName'] as String? ?? 'Unnamed';
                final email = m['email'] as String? ?? '';
                final categoryName = m['categoryName'] as String? ?? 'General';
                final userStatus = m['userStatus'] as String? ?? 'Active';
                final isActive = userStatus == 'Active';

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: isDark ? AppColors.outlineDark : const Color(0xFFF1F5F9),
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              fullName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              email,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0050E5).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          categoryName,
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0050E5),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        userStatus,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: isActive ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                        ),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton(
                        onPressed: () => widget.onNavigateToTab?.call(1),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          side: BorderSide(
                            color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                        child: const Text('Details', style: TextStyle(fontSize: 11)),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  // ===========================================================================
  // ROW 6: SECURITY & FORENSIC AUDIT TRAIL
  // ===========================================================================
  Widget _buildAuditTrailCard({
    required bool isDark,
    required List<Map<String, dynamic>> logs,
  }) {
    return _buildPanelCard(
      isDark: isDark,
      title: 'Recent Security & Forensic Audit Trail',
      subtitle: 'Real-time authentication, password lifecycle, and permission logs',
      trailing: TextButton(
        onPressed: () => widget.onNavigateToTab?.call(15), // Activity Logs tab
        style: TextButton.styleFrom(
          padding: EdgeInsets.zero,
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        child: const Text(
          'Full Audit Logs →',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0050E5),
          ),
        ),
      ),
      child: logs.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Text(
                  'No activity logs recorded yet.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
              ),
            )
          : Wrap(
              spacing: 12,
              runSpacing: 12,
              children: logs.map((l) {
                final actionType = l['actionType'] as String? ?? 'Action';
                final desc = l['description'] as String? ?? '';
                final dateStr = l['date'] as String? ?? '';

                return Container(
                  width: 320,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        margin: const EdgeInsets.only(top: 5),
                        decoration: const BoxDecoration(
                          color: Color(0xFF0050E5),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEFF6FF),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    actionType,
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF0050E5),
                                    ),
                                  ),
                                ),
                                Text(
                                  dateStr.length > 10 ? dateStr.substring(0, 10) : dateStr,
                                  style: const TextStyle(
                                    fontSize: 10.5,
                                    color: Color(0xFF94A3B8),
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              desc,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11.5,
                                color: isDark ? AppColors.gray300 : const Color(0xFF334155),
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
    );
  }

  // ===========================================================================
  // HELPER CONTAINER FOR PANELS
  // ===========================================================================
  Widget _buildPanelCard({
    required bool isDark,
    required String title,
    required String subtitle,
    Widget? trailing,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
        ),
        boxShadow: const [
          BoxShadow(color: Color(0x05000000), blurRadius: 4, offset: Offset(0, 1)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 11.5,
                        color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
              ?trailing,
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

/// Custom painter rendering the 6-month growth curve with area gradient fill and points.
class _GrowthTrendPainter extends CustomPainter {
  final List<String> labels;
  final List<int> counts;
  final bool isDark;

  _GrowthTrendPainter({
    required this.labels,
    required this.counts,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (counts.isEmpty) return;

    final maxVal = (counts.reduce(math.max)).toDouble();
    final effectiveMax = maxVal == 0 ? 10.0 : maxVal * 1.25;

    final double stepX = size.width / (counts.length - 1).clamp(1, 100);

    // Grid lines
    final gridPaint = Paint()
      ..color = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)
      ..strokeWidth = 1;

    for (int i = 0; i <= 3; i++) {
      final y = size.height * (i / 3.0);
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    // Path
    final path = Path();
    final fillPath = Path();

    final points = <Offset>[];
    for (int i = 0; i < counts.length; i++) {
      final x = i * stepX;
      final y = size.height - ((counts[i] / effectiveMax) * size.height);
      points.add(Offset(x, y));
    }

    path.moveTo(points.first.dx, points.first.dy);
    fillPath.moveTo(points.first.dx, size.height);
    fillPath.lineTo(points.first.dx, points.first.dy);

    for (int i = 0; i < points.length - 1; i++) {
      final p0 = points[i];
      final p1 = points[i + 1];
      final controlPoint1 = Offset(p0.dx + (p1.dx - p0.dx) / 2, p0.dy);
      final controlPoint2 = Offset(p0.dx + (p1.dx - p0.dx) / 2, p1.dy);

      path.cubicTo(
        controlPoint1.dx,
        controlPoint1.dy,
        controlPoint2.dx,
        controlPoint2.dy,
        p1.dx,
        p1.dy,
      );

      fillPath.cubicTo(
        controlPoint1.dx,
        controlPoint1.dy,
        controlPoint2.dx,
        controlPoint2.dy,
        p1.dx,
        p1.dy,
      );
    }

    fillPath.lineTo(points.last.dx, size.height);
    fillPath.close();

    // Fill Gradient
    final fillGradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        const Color(0xFF0050E5).withValues(alpha: 0.25),
        const Color(0xFF0050E5).withValues(alpha: 0.0),
      ],
    );

    final fillPaint = Paint()
      ..shader = fillGradient.createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill;

    canvas.drawPath(fillPath, fillPaint);

    // Stroke
    final linePaint = Paint()
      ..color = const Color(0xFF0050E5)
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawPath(path, linePaint);

    // Points
    final dotPaint = Paint()..color = const Color(0xFF0050E5);
    final borderPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    for (final pt in points) {
      canvas.drawCircle(pt, 5, dotPaint);
      canvas.drawCircle(pt, 5, borderPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _GrowthTrendPainter oldDelegate) {
    return oldDelegate.counts != counts || oldDelegate.isDark != isDark;
  }
}
