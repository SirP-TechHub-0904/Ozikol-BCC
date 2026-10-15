import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../data/notification_service.dart';
import '../domain/notification_model.dart';

/// Comprehensive notification center sheet rendered as an adaptive slide-over drawer
/// on desktop and a bottom modal sheet on mobile devices.
class NotificationsSheet extends ConsumerWidget {
  const NotificationsSheet({super.key});

  /// Displays the notifications sheet adaptively based on screen width.
  static void show(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width >= 900;

    if (isDesktop) {
      showGeneralDialog(
        context: context,
        barrierDismissible: true,
        barrierLabel: 'Notifications',
        barrierColor: Colors.black.withAlpha(80),
        transitionDuration: const Duration(milliseconds: 250),
        pageBuilder: (context, anim1, anim2) {
          return Align(
            alignment: Alignment.centerRight,
            child: SizedBox(
              width: 460,
              height: double.infinity,
              child: const Material(
                color: Colors.transparent,
                child: NotificationsSheet(),
              ),
            ),
          );
        },
        transitionBuilder: (context, anim1, anim2, child) {
          return SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(1, 0),
              end: Offset.zero,
            ).animate(CurvedAnimation(parent: anim1, curve: Curves.easeOutCubic)),
            child: child,
          );
        },
      );
    } else {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => SizedBox(
          height: MediaQuery.of(context).size.height * 0.88,
          child: const NotificationsSheet(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationProvider);
    final notifier = ref.read(notificationProvider.notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bgColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.outlineDark : AppColors.outlineLight;

    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          bottomLeft: Radius.circular(24),
        ),
        border: Border(left: BorderSide(color: borderColor, width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(isDark ? 90 : 30),
            blurRadius: 28,
            offset: const Offset(-4, 0),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          children: [
            // Topbar Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 16, 12),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(isDark ? 40 : 25),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.notifications_active_rounded, color: AppColors.primary, size: 20),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Notifications',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(width: 8),
                  if (state.unreadCount > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: Text(
                        '${state.unreadCount}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                    ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.done_all_rounded, size: 20),
                    tooltip: 'Mark all as read',
                    onPressed: state.unreadCount > 0 ? () => notifier.markAllAsRead() : null,
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_sweep_outlined, size: 20),
                    tooltip: 'Clear all',
                    onPressed: state.items.isNotEmpty ? () => notifier.clearAll() : null,
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    tooltip: 'Close',
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            // Horizontal Severity & Category Filters
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
              child: Row(
                children: [
                  _buildFilterChip('all', 'All (${state.items.length})', null, state.activeFilter, notifier, isDark),
                  const SizedBox(width: 8),
                  _buildFilterChip('unread', 'Unread (${state.unreadCount})', null, state.activeFilter, notifier, isDark),
                  const SizedBox(width: 8),
                  ...NotificationSeverity.values.map((sev) {
                    final count = state.items.where((n) => n.severity == sev).length;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: _buildFilterChip(
                        sev.name,
                        '${sev.label} ($count)',
                        sev.color,
                        state.activeFilter,
                        notifier,
                        isDark,
                      ),
                    );
                  }),
                ],
              ),
            ),

            const Divider(height: 16),

            // Notifications List / Empty State
            Expanded(
              child: state.filteredItems.isEmpty
                  ? _buildEmptyState(state.activeFilter, isDark)
                  : ListView.separated(
                      padding: const EdgeInsets.all(20),
                      itemCount: state.filteredItems.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final notif = state.filteredItems[index];
                        return _buildNotificationCard(notif, notifier, isDark);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(
    String key,
    String label,
    Color? accentColor,
    String activeFilter,
    NotificationNotifier notifier,
    bool isDark,
  ) {
    final isSelected = activeFilter.toLowerCase() == key.toLowerCase();
    final chipColor = accentColor ?? AppColors.primary;

    return InkWell(
      onTap: () => notifier.setFilter(key),
      borderRadius: BorderRadius.circular(100),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? chipColor.withAlpha(isDark ? 60 : 35)
              : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
          borderRadius: BorderRadius.circular(100),
          border: Border.all(
            color: isSelected ? chipColor : Colors.transparent,
            width: 1.2,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected
                ? chipColor
                : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationCard(NotificationItem notif, NotificationNotifier notifier, bool isDark) {
    final sev = notif.severity;
    final timeAgo = _formatTimeAgo(notif.createdAt);

    return InkWell(
      onTap: () {
        if (!notif.isRead) {
          notifier.markAsRead(notif.id);
        }
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(isDark ? 30 : 8),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 4px Severity Accent Stripe
              Container(width: 4, color: sev.color),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Severity Pill + Module Badge + Timestamp + Unread Dot
                      Row(
                        children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: sev.color.withAlpha(isDark ? 45 : 25),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: sev.color.withAlpha(120), width: 0.8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(sev.icon, size: 12, color: sev.color),
                      const SizedBox(width: 4),
                      Text(
                        sev.label.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: sev.color,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  notif.module ?? 'General',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                ),
                const Spacer(),
                Text(
                  timeAgo,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                  ),
                ),
                if (!notif.isRead) ...[
                  const SizedBox(width: 8),
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ],
            ),

            const SizedBox(height: 10),

            // Title
            Text(
              notif.title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: notif.isRead ? FontWeight.w600 : FontWeight.w700,
                color: isDark ? AppColors.onBackgroundDark : AppColors.onBackgroundLight,
              ),
            ),

            const SizedBox(height: 6),

            // Message
            Text(
              notif.message,
              style: TextStyle(
                fontSize: 13,
                height: 1.45,
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
              ),
            ),

            if (notif.actionUrl != null && notif.actionUrl!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: () {
                    if (!notif.isRead) notifier.markAsRead(notif.id);
                  },
                  icon: const Icon(Icons.arrow_forward_rounded, size: 14),
                  label: const Text('View Action', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  style: TextButton.styleFrom(
                    foregroundColor: sev.color,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    visualDensity: VisualDensity.compact,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    ),
  ],
),
),
),
);
}

  Widget _buildEmptyState(String filter, bool isDark) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.notifications_none_rounded,
              size: 44,
              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            filter == 'all' ? 'All caught up!' : 'No notifications in this filter',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            'New alerts, updates, and maintenance advisories\nwill appear right here in real time.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }

  static String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}';
  }
}
