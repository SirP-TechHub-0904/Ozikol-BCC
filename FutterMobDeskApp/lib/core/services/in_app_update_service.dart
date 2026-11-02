import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/app_update_info.dart';
import '../network/api_client.dart';
import '../../features/workspace_auth/state/workspace_state.dart';

/// Central In-App Update Engine managing OTA updates, auto-installers, and store redirects.
class InAppUpdateService {
  final ApiClient _apiClient;
  static const String currentVersion = '1.0.0';
  static const int currentBuildNumber = 1;

  InAppUpdateService(this._apiClient);

  /// Resolves the current runtime operating system platform string.
  String get currentPlatform {
    if (kIsWeb) return 'web';
    if (Platform.isWindows) return 'windows';
    if (Platform.isAndroid) return 'android';
    if (Platform.isIOS) return 'ios';
    if (Platform.isMacOS) return 'macos';
    if (Platform.isLinux) return 'linux';
    return 'unknown';
  }

  /// Checks the Central Master Release Engine for available updates.
  Future<AppUpdateCheckResult> checkForUpdate({String channel = 'stable'}) async {
    try {
      final response = await _apiClient.dio.get(
        '/api/AppUpdates/check-update',
        queryParameters: {
          'platform': currentPlatform,
          'version': currentVersion,
          'buildNumber': currentBuildNumber,
          'channel': channel,
        },
      );

      final body = response.data;
      if (body != null && body['isSuccess'] == true && body['data'] != null) {
        final updateInfo = AppUpdateInfo.fromJson(body['data'] as Map<String, dynamic>);
        return AppUpdateCheckResult.success(updateInfo);
      }

      return AppUpdateCheckResult.noUpdate();
    } catch (e) {
      return AppUpdateCheckResult.error(e.toString());
    }
  }

  /// Initiates the platform-native download, integrity verification, and installer launch.
  Future<bool> downloadAndInstallUpdate(
    AppUpdateInfo info, {
    void Function(double progress)? onProgress,
  }) async {
    if (info.downloadUrl.isEmpty) return false;

    try {
      final uri = Uri.parse(info.downloadUrl);

      // Web: Redirect/refresh to load newly published service worker bundle
      if (kIsWeb) {
        return await launchUrl(uri, mode: LaunchMode.platformDefault);
      }

      // iOS: Apple policy requires app updates to route through the official App Store
      if (Platform.isIOS) {
        return await launchUrl(uri, mode: LaunchMode.externalApplication);
      }

      // Windows Desktop: Background download with SHA-256 integrity check and silent installer launch
      if (Platform.isWindows) {
        final tempDir = Directory.systemTemp.createTempSync('ozikol_update_');
        final targetPath = '${tempDir.path}\\Ozikol-Setup-${info.latestVersion}.exe';

        final dio = Dio();
        await dio.download(
          info.downloadUrl,
          targetPath,
          onReceiveProgress: (received, total) {
            if (total > 0 && onProgress != null) {
              onProgress(received / total);
            }
          },
        );

        final downloadedFile = File(targetPath);
        if (!await downloadedFile.exists()) return false;

        // Verify SHA-256 checksum if provided by backend
        if (info.sha256Checksum.isNotEmpty) {
          final fileBytes = await downloadedFile.readAsBytes();
          final calculatedHash = sha256.convert(fileBytes).toString().toLowerCase();
          if (calculatedHash != info.sha256Checksum.trim().toLowerCase()) {
            // Checksum mismatch: purge corrupted binary and abort
            await downloadedFile.delete();
            return false;
          }
        }

        // Launch installer detached and allow it to upgrade/restart the application
        await Process.start(
          targetPath,
          ['/SILENT'],
          mode: ProcessStartMode.detached,
        );
        return true;
      }

      // Android: Handle direct APK download or Google Play Store link
      if (Platform.isAndroid) {
        return await launchUrl(uri, mode: LaunchMode.externalApplication);
      }

      // macOS & Linux: Route to package download URL or auto-update mount
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }
}

/// Evaluation outcome from the update check request.
class AppUpdateCheckResult {
  final bool hasUpdate;
  final AppUpdateInfo? updateInfo;
  final String? errorMessage;

  const AppUpdateCheckResult({
    required this.hasUpdate,
    this.updateInfo,
    this.errorMessage,
  });

  factory AppUpdateCheckResult.success(AppUpdateInfo info) => AppUpdateCheckResult(
        hasUpdate: info.hasUpdate,
        updateInfo: info,
      );

  factory AppUpdateCheckResult.noUpdate() => const AppUpdateCheckResult(hasUpdate: false);

  factory AppUpdateCheckResult.error(String message) => AppUpdateCheckResult(
        hasUpdate: false,
        errorMessage: message,
      );
}

/// Riverpod provider for the InAppUpdateService
final inAppUpdateServiceProvider = Provider<InAppUpdateService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return InAppUpdateService(apiClient);
});

/// Future provider querying for active updates on demand
final appUpdateCheckProvider = FutureProvider<AppUpdateCheckResult>((ref) async {
  final service = ref.watch(inAppUpdateServiceProvider);
  return await service.checkForUpdate();
});
