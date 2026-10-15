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

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: const BoxDecoration(
        color: Color(0xFFFEF3C7), // Warm amber tint
        border: Border(
          bottom: BorderSide(color: Color(0xFFFDE68A), width: 1),
        ),
      ),
      child: SafeArea(
        top: false,
        bottom: false,
        child: Row(
          children: [
            const Icon(
              Icons.wifi_off_rounded,
              color: Color(0xFFB45309), // Amber 700
              size: 16,
            ),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'You are offline. Showing cached workspace data.',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF92400E), // Amber 800
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
                  color: Colors.white.withAlpha(180),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFFCD34D)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.refresh_rounded, size: 12, color: Color(0xFF92400E)),
                    SizedBox(width: 4),
                    Text(
                      'Retry',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF92400E)),
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
