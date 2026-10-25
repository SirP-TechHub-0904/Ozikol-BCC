import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/offline_status_bar.dart';
import '../../../core/localization/language_provider.dart';
import '../data/notification_service.dart';
import '../domain/notification_model.dart';

/// Comprehensive notification center sheet rendered as an adaptive slide-over drawer
/// on desktop and a bottom modal sheet on mobile devices.
class NotificationsSheet extends ConsumerStatefulWidget {
  /// Optional navigation callback invoked when a notification with an ActionUrl is tapped.
  final void Function(String actionUrl)? onNavigate;

  const NotificationsSheet({super.key, this.onNavigate});

  /// Displays the notifications sheet adaptively based on screen width.
  static void show(BuildContext context, {void Function(String actionUrl)? onNavigate}) {
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
              child: Material(
                color: Colors.transparent,
                child: NotificationsSheet(onNavigate: onNavigate),
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
          child: NotificationsSheet(onNavigate: onNavigate),
        ),
      );
    }
  }

  @override
  ConsumerState<NotificationsSheet> createState() => _NotificationsSheetState();
}

class _NotificationsSheetState extends ConsumerState<NotificationsSheet> {
  Timer? _tickerTimer;

  @override
  void initState() {
    super.initState();
    // 1. Immediately revalidate and load live notifications feed from the server
    Future.microtask(() {
      if (mounted) {
        ref.read(notificationProvider.notifier).loadFeed();
      }
    });

    // 2. Live ticking timer every 10 seconds to update relative timestamps ('Just now', '1m ago', etc.) in real time
    _tickerTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tickerTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
            // Offline Status Bar with manual refresh trigger
            OfflineStatusBar(onRetry: () => notifier.loadFeed()),

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
                  Text(
                    'notif.title'.tr(ref, fallback: 'Notifications'),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
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
                  if (state.isFromCache)
                    Container(
                      margin: const EdgeInsets.only(left: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.blue.withAlpha(isDark ? 40 : 20),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: Colors.blue.withAlpha(60)),
                      ),
                      child: Text(
                        'notif.cached'.tr(ref, fallback: 'Cached'),
                        style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Colors.blue),
                      ),
                    ),
                  const Spacer(),
                  IconButton(
                    icon: state.isLoading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                          )
                        : const Icon(Icons.refresh_rounded, size: 20),
                    tooltip: 'account.refresh_logs'.tr(ref, fallback: 'Refresh'),
                    onPressed: state.isLoading ? null : () => notifier.loadFeed(),
                  ),
                  IconButton(
                    icon: const Icon(Icons.done_all_rounded, size: 20),
                    tooltip: 'notif.mark_all_read'.tr(ref, fallback: 'Mark all as read'),
                    onPressed: state.unreadCount > 0 ? () => notifier.markAllAsRead() : null,
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_sweep_outlined, size: 20),
                    tooltip: 'notif.clear_all'.tr(ref, fallback: 'Clear all'),
                    onPressed: state.items.isNotEmpty ? () => notifier.clearAll() : null,
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    tooltip: 'btn.close'.tr(ref, fallback: 'Close'),
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
                  _buildFilterChip('all', '${'notif.all'.tr(ref, fallback: 'All')} (${state.items.length})', null, state.activeFilter, notifier, isDark),
                  const SizedBox(width: 8),
                  _buildFilterChip('unread', '${'notif.unread'.tr(ref, fallback: 'Unread')} (${state.unreadCount})', null, state.activeFilter, notifier, isDark),
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
                  ? _buildEmptyState(state.activeFilter, isDark, ref)
                  : RefreshIndicator(
                      onRefresh: () => notifier.loadFeed(),
                      color: AppColors.primary,
                      child: ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: state.filteredItems.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final notif = state.filteredItems[index];
                          return _buildNotificationCard(context, notif, notifier, isDark, ref);
                        },
                      ),
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

  Widget _buildNotificationCard(
    BuildContext context,
    NotificationItem notif,
    NotificationNotifier notifier,
    bool isDark,
    WidgetRef ref,
  ) {
    final sev = notif.severity;
    final timeAgo = _formatTimeAgo(notif.createdAt);

    return InkWell(
      onTap: () {
        if (!notif.isRead) {
          notifier.markAsRead(notif.id);
        }
        if (notif.actionUrl != null && notif.actionUrl!.isNotEmpty) {
          Navigator.of(context).pop();
          widget.onNavigate?.call(notif.actionUrl!);
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: notif.isRead
                ? (isDark ? AppColors.outlineDark : AppColors.outlineLight)
                : AppColors.primary.withAlpha(isDark ? 90 : 70),
            width: notif.isRead ? 1 : 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(isDark ? 25 : 6),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 3.5px Severity Accent Stripe
              Container(width: 3.5, color: sev.color),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Severity Pill + Module Badge + Timestamp + Unread Dot
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: sev.color.withAlpha(isDark ? 45 : 25),
                              borderRadius: BorderRadius.circular(5),
                              border: Border.all(color: sev.color.withAlpha(120), width: 0.8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(sev.icon, size: 11, color: sev.color),
                                const SizedBox(width: 3.5),
                                Text(
                                  sev.label.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w700,
                                    color: sev.color,
                                    letterSpacing: 0.4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              notif.module ?? 'General',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            timeAgo,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                            ),
                          ),
                          if (!notif.isRead) ...[
                            const SizedBox(width: 6),
                            Container(
                              width: 7,
                              height: 7,
                              decoration: const BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                        ],
                      ),

                      const SizedBox(height: 5),

                      // Title (Crisp, max 2 lines)
                      Text(
                        notif.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: notif.isRead ? FontWeight.w600 : FontWeight.w700,
                          color: isDark ? AppColors.onBackgroundDark : AppColors.onBackgroundLight,
                          height: 1.25,
                        ),
                      ),

                      if (notif.message.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        // Message (max 2 lines, clean secondary styling)
                        Text(
                          notif.message,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.35,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
                          ),
                        ),
                      ],

                      if (notif.actionUrl != null && notif.actionUrl!.isNotEmpty) ...[
                        const SizedBox(height: 5),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              'notif.view_action'.tr(ref, fallback: 'View Action'),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: sev.color,
                              ),
                            ),
                            const SizedBox(width: 3),
                            Icon(Icons.arrow_forward_rounded, size: 12, color: sev.color),
                          ],
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

  Widget _buildEmptyState(String filter, bool isDark, WidgetRef ref) {
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
            filter == 'all'
                ? 'notif.empty_title'.tr(ref, fallback: 'All caught up!')
                : 'notif.no_filter_title'.tr(ref, fallback: 'No notifications in this filter'),
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            'notif.empty_desc'.tr(
              ref,
              fallback: 'New alerts, updates, and maintenance advisories\nwill appear right here in real time.',
            ),
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
    final now = DateTime.now();
    final localDt = dt.toLocal();
    final diff = now.difference(localDt);
    if (diff.isNegative || diff.inSeconds < 45) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${localDt.day.toString().padLeft(2, '0')}/${localDt.month.toString().padLeft(2, '0')}';
  }
}
