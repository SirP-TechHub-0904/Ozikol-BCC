import '../localization/language_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/app_update_info.dart';
import '../services/in_app_update_service.dart';
import '../theme/app_colors.dart';

/// Non-intrusive notification banner displayed when an application update is available.
class UpdateBanner extends ConsumerWidget {
  final AppUpdateInfo updateInfo;
  final VoidCallback? onDismiss;

  const UpdateBanner({
    super.key,
    required this.updateInfo,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF003790).withAlpha(160) : const Color(0xFFDBE8FF),
        border: Border(
          bottom: BorderSide(
            color: isDark ? const Color(0xFF1F6BFF).withAlpha(100) : const Color(0xFFBFDBFE),
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        bottom: false,
        child: Row(
          children: [
            const Icon(
              Icons.system_update_rounded,
              color: AppColors.primary,
              size: 16,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Business Command Center v${updateInfo.latestVersion} is available.',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark ? const Color(0xFFDBE8FF) : const Color(0xFF003790),
                ),
              ),
            ),
            InkWell(
              onTap: () => showUpdateDialog(context, updateInfo),
              borderRadius: BorderRadius.circular(6),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  context.trc('sh.update_now', fallback: 'Update Now'),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            if (!updateInfo.isMandatory && onDismiss != null) ...[
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.close_rounded, size: 14),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                onPressed: onDismiss,
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// Displays the interactive update dialog with release notes and download progress.
  static void showUpdateDialog(BuildContext context, AppUpdateInfo info) {
    showDialog(
      context: context,
      barrierDismissible: !info.isMandatory,
      builder: (_) => _UpdateModalDialog(info: info),
    );
  }
}

class _UpdateModalDialog extends ConsumerStatefulWidget {
  final AppUpdateInfo info;

  const _UpdateModalDialog({required this.info});

  @override
  ConsumerState<_UpdateModalDialog> createState() => _UpdateModalDialogState();
}

class _UpdateModalDialogState extends ConsumerState<_UpdateModalDialog> {
  bool _isDownloading = false;
  double _progress = 0.0;
  String? _errorMessage;

  Future<void> _startUpdate() async {
    setState(() {
      _isDownloading = true;
      _errorMessage = null;
    });

    final service = ref.read(inAppUpdateServiceProvider);
    final success = await service.downloadAndInstallUpdate(
      widget.info,
      onProgress: (p) => setState(() => _progress = p),
    );

    if (!success && mounted) {
      setState(() {
        _isDownloading = false;
        _errorMessage = context.trc('sh.update_failed', fallback: 'Failed to download or launch the installer. Please try again.');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final info = widget.info;

    return PopScope(
      canPop: !info.isMandatory,
      child: AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withAlpha(isDark ? 40 : 25),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.rocket_launch_rounded, color: AppColors.primary, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Update Ready: v${info.latestVersion}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  Text(
                    'Channel: ${info.channel.toUpperCase()} ${info.fileSizeBytes > 0 ? "• ${(info.fileSizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB" : ""}',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (info.isMandatory)
                Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withAlpha(isDark ? 40 : 25),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.warning.withAlpha(80)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 16),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          context.trc('sh.update_mandatory', fallback: 'Mandatory update required for platform security and data synchronization.'),
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF92400E)),
                        ),
                      ),
                    ],
                  ),
                ),
              Text(
                context.trc('sh.release_notes', fallback: 'Release Notes:'),
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Container(
                constraints: const BoxConstraints(maxHeight: 180),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                ),
                child: SingleChildScrollView(
                  child: Text(
                    info.releaseNotes.isNotEmpty
                        ? info.releaseNotes
                        : '• Performance enhancements and bug fixes.\n• Multi-tenant offline synchronization.\n• Stability updates.',
                    style: TextStyle(
                      fontSize: 12,
                      height: 1.5,
                      color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                    ),
                  ),
                ),
              ),
              if (_isDownloading) ...[
                const SizedBox(height: 16),
                LinearProgressIndicator(
                  value: _progress > 0 ? _progress : null,
                  backgroundColor: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                  borderRadius: BorderRadius.circular(4),
                ),
                const SizedBox(height: 6),
                Center(
                  child: Text(
                    _progress > 0
                        ? 'Downloading installer: ${(_progress * 100).toInt()}%'
                        : context.trc('sh.preparing', fallback: 'Preparing installer package...'),
                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                ),
              ],
              if (_errorMessage != null) ...[
                const SizedBox(height: 10),
                Text(
                  _errorMessage!,
                  style: const TextStyle(fontSize: 11, color: AppColors.error, fontWeight: FontWeight.w600),
                ),
              ],
            ],
          ),
        ),
        actions: [
          if (!info.isMandatory && !_isDownloading)
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(context.trc('sh.later', fallback: 'Later')),
            ),
          ElevatedButton(
            onPressed: _isDownloading ? null : _startUpdate,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            ),
            child: _isDownloading
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                : Text(context.trc('sh.update_restart', fallback: 'Update & Restart'), style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
