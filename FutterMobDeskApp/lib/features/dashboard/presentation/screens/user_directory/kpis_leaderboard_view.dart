import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';

/// Screen presenting the KPIs & Leaderboard under User Directory.
class KpisLeaderboardView extends ConsumerWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Creates a [KpisLeaderboardView].
  const KpisLeaderboardView({super.key, this.workspace});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final leaders = [
      {'rank': 1, 'name': 'First Last', 'score': '98.5%', 'badge': 'Platinum', 'color': Color(0xFFE5E7EB)},
      {'rank': 2, 'name': 'Operational Lead', 'score': '94.2%', 'badge': 'Gold', 'color': Color(0xFFF7B84B)},
      {'rank': 3, 'name': 'Executive Director', 'score': '91.0%', 'badge': 'Silver', 'color': Color(0xFF94A3B8)},
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.leaderboard_outlined, size: 26, color: AppColors.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'KPIs & Leaderboard',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Member performance rankings, engagement scores, and achievement grade telemetry.',
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
          const SizedBox(height: 24),

          // Leaderboard Container
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: leaders.length,
              separatorBuilder: (_, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = leaders[index];
                final rank = item['rank'] as int;
                final name = item['name'] as String;
                final score = item['score'] as String;
                final badge = item['badge'] as String;
                final col = item['color'] as Color;

                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: col.withValues(alpha: 0.2),
                        child: Text(
                          '#$rank',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: col),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          name,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                      Text(
                        score,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.primary),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                        decoration: BoxDecoration(
                          color: col.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: Text(
                          badge,
                          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: col),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
