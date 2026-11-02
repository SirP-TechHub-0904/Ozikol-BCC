import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'app_badge.dart';

/// Clean activity, audit log, or transaction list tile.
/// Used in tenant dashboards, audit feeds, and member activity panels.
class ActivityTile extends StatelessWidget {
  /// Primary title or action description (e.g. "User Login", "Feature Activated").
  final String title;

  /// Secondary subtitle or actor metadata (e.g. "admin@tenant.com", "IP: 192.168.1.1").
  final String? subtitle;

  /// Right-hand value, currency amount, or KPI text.
  final String? trailingText;

  /// Optional badge status text (e.g. "Success", "Failed", "Warning").
  final String? statusBadge;

  /// Severity level of the status badge ('info', 'success', 'warning', 'danger').
  final String statusSeverity;

  /// Formatted timestamp string (e.g. "Just now", "Oct 15, 2:30 PM").
  final String timestamp;

  /// Leading icon depicting the event category.
  final IconData icon;

  /// Background color tint for the circular icon container.
  final Color? iconBackgroundColor;

  /// Color of the leading icon.
  final Color? iconColor;

  /// Optional tap callback for navigating to item details.
  final VoidCallback? onTap;

  /// Creates a standardized [ActivityTile].
  const ActivityTile({
    super.key,
    required this.title,
    this.subtitle,
    this.trailingText,
    this.statusBadge,
    this.statusSeverity = 'info',
    required this.timestamp,
    this.icon = Icons.event_note_rounded,
    this.iconBackgroundColor,
    this.iconColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveIconBg = iconBackgroundColor ??
        (isDark ? AppColors.surfaceVariantDark : AppColors.primaryContainer);
    final effectiveIconColor = iconColor ?? (isDark ? Colors.white : AppColors.primary);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
            ),
          ),
          child: Row(
            children: [
              // Event Category Icon
              Container(
                height: 42,
                width: 42,
                decoration: BoxDecoration(
                  color: effectiveIconBg,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: effectiveIconColor,
                ),
              ),

              const SizedBox(width: 14),

              // Title, Subtitle & Timestamp
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        if (subtitle != null) ...[
                          Flexible(
                            child: Text(
                              subtitle!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? AppColors.gray400 : AppColors.gray500,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            width: 3,
                            height: 3,
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.gray600 : AppColors.gray400,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                        ],
                        Text(
                          timestamp,
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.gray400 : AppColors.gray500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Trailing Value or Status Badge
              if (trailingText != null || statusBadge != null) ...[
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (trailingText != null)
                      Text(
                        trailingText!,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                        ),
                      ),
                    if (statusBadge != null) ...[
                      const SizedBox(height: 4),
                      AppBadge.severity(statusBadge!, statusSeverity),
                    ],
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
