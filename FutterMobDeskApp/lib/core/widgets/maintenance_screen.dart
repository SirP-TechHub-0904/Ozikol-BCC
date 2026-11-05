import '../localization/language_provider.dart';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Screen displayed when global maintenance mode is engaged dynamically from the Central DB.
/// Clean, modern layout matching the repository UI kit standards.
class MaintenanceScreen extends StatelessWidget {
  final String? message;
  final VoidCallback onRefresh;

  const MaintenanceScreen({
    super.key,
    this.message,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Container(
              padding: const EdgeInsets.all(36),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(isDark ? 60 : 12),
                    blurRadius: 24,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 68,
                    height: 68,
                    decoration: BoxDecoration(
                      color: const Color(0xFF9333EA).withAlpha(isDark ? 40 : 25),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: const Color(0xFF9333EA).withAlpha(80),
                      ),
                    ),
                    child: const Icon(
                      Icons.build_circle_rounded,
                      color: Color(0xFF9333EA),
                      size: 36,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    context.trc('sh.maint_title', fallback: 'Scheduled Maintenance'),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.5,
                      color: isDark ? AppColors.onBackgroundDark : AppColors.gray950,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    message ??
                        context.trc('sh.maint_body', fallback: 'The platform is currently undergoing scheduled infrastructure upgrades. Workspaces will be back online shortly.'),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.5,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: Text(context.trc('sh.check_status', fallback: 'Check Status')),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: onRefresh,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
