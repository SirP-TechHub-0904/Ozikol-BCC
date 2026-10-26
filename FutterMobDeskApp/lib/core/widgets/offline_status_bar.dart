import '../localization/language_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/connectivity_service.dart';

/// Non-intrusive offline status banner mounted at top of workspace screens.
/// Alerts users when connectivity is lost and communicates that cached workspace data is being served.
class OfflineStatusBar extends ConsumerWidget {
  final VoidCallback? onRetry;
  final bool? forceOffline;

  const OfflineStatusBar({
    super.key,
    this.onRetry,
    this.forceOffline,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(connectivityStatusProvider);
    final isOffline = forceOffline ?? (status == ConnectivityStatus.offline);

    if (!isOffline) {
      return const SizedBox.shrink();
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bannerBg = isDark ? const Color(0xFF451A03).withAlpha(180) : const Color(0xFFFEF3C7);
    final borderColor = isDark ? const Color(0xFF78350F) : const Color(0xFFFDE68A);
    final iconColor = isDark ? const Color(0xFFFBBF24) : const Color(0xFFB45309);
    final textColor = isDark ? const Color(0xFFFDE68A) : const Color(0xFF92400E);
    final btnBg = isDark ? const Color(0xFF78350F).withAlpha(140) : Colors.white.withAlpha(180);
    final btnBorder = isDark ? const Color(0xFF92400E) : const Color(0xFFFCD34D);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: bannerBg,
        border: Border(
          bottom: BorderSide(color: borderColor, width: 1),
        ),
      ),
      child: SafeArea(
        top: false,
        bottom: false,
        child: Row(
          children: [
            Icon(
              Icons.wifi_off_rounded,
              color: iconColor,
              size: 16,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                context.trc('sh.offline_msg', fallback: 'You are offline. Showing cached workspace data.'),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: textColor,
                ),
              ),
            ),
            InkWell(
              onTap: () {
                onRetry?.call();
                Future.microtask(() async {
                  try {
                    final service = ref.read(connectivityServiceProvider);
                    final isNowOnline = await service.checkIsOnline();
                    if (isNowOnline) {
                      ref.read(connectivityStatusProvider.notifier).setStatus(ConnectivityStatus.online);
                    }
                  } catch (_) {}
                });
              },
              borderRadius: BorderRadius.circular(6),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: btnBg,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: btnBorder),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.refresh_rounded, size: 12, color: textColor),
                    const SizedBox(width: 4),
                    Text(
                      context.trc('sh.retry', fallback: 'Retry'),
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: textColor),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
