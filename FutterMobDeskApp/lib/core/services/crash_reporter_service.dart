import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../storage/secure_storage_service.dart';
import '../storage/tenant_cache_service.dart';
import '../../features/workspace_auth/state/workspace_state.dart';

/// Central Crash Reporter & Startup Self-Healing ("Safe Mode") Engine.
/// Protects against startup crash loops caused by corrupted local cache or disk drift.
class CrashReporterService {
  final ApiClient _apiClient;
  final SecureStorageService _storageService;
  final TenantCacheService _cacheService;

  static const String _crashCountKey = 'ozikol_startup_crash_count';
  static const int _safeModeThreshold = 3;
  Timer? _stabilityTimer;

  bool _isSafeMode = false;
  bool get isSafeMode => _isSafeMode;

  CrashReporterService(
    this._apiClient,
    this._storageService,
    this._cacheService,
  );

  /// Initializes startup stability monitoring.
  /// If the application experiences 3 consecutive crashes within 8 seconds of launch,
  /// Safe Mode is engaged to prevent continuous crash loops.
  Future<void> initStartupCrashMonitor() async {
    try {
      final crashCount = _readCrashCount();

      if (crashCount >= _safeModeThreshold) {
        _isSafeMode = true;
      }

      // Record this startup attempt
      await _writeCrashCount(crashCount + 1);

      // Start 8-second stability timer. If the app stays alive for 8 seconds, reset crash count
      _stabilityTimer?.cancel();
      _stabilityTimer = Timer(const Duration(seconds: 8), () async {
        await _writeCrashCount(0);
      });
    } catch (_) {
      // Never let monitoring initialization crash the app
    }
  }

  /// Self-healing recovery: Purges all corrupted L1/L2 caches while preserving user workspace sessions.
  Future<void> recoverFromCrashLoop() async {
    try {
      await _cacheService.clearAll();
      await _writeCrashCount(0);
      _isSafeMode = false;
    } catch (_) {}
  }

  /// Scrubs sensitive PII/secrets and dispatches error telemetry to the Central API.
  Future<void> reportCrash(dynamic error, StackTrace? stackTrace) async {
    try {
      final rawMessage = error.toString();
      final rawStack = stackTrace?.toString() ?? '';

      final sanitizedMessage = _scrubSensitiveData(rawMessage);
      final sanitizedStack = _scrubSensitiveData(rawStack);

      final platform = kIsWeb ? 'web' : (Platform.isWindows ? 'windows' : (Platform.isAndroid ? 'android' : 'ios'));
      final activeTenant = _storageService.getActiveTenantKey();

      await _apiClient.dio.post(
        '/api/AppUpdates/crash-report',
        data: {
          'platform': platform,
          'appVersion': '1.0.0',
          'buildNumber': 1,
          'exceptionMessage': sanitizedMessage,
          'stackTrace': sanitizedStack,
          'activeTenantKey': activeTenant,
          'occurredAtUtc': DateTime.now().toUtc().toIso8601String(),
        },
      );
    } catch (_) {
      // Telemetry failures must never disrupt client execution
    }
  }

  /// Strips JWT tokens, authorization headers, passwords, and API keys.
  String _scrubSensitiveData(String input) {
    var sanitized = input;
    // Scrub Bearer tokens
    sanitized = sanitized.replaceAll(RegExp(r'Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*'), 'Bearer [REDACTED_JWT]');
    // Scrub passwords
    sanitized = sanitized.replaceAll(RegExp(r'"password"\s*:\s*"[^"]*"', caseSensitive: false), '"password":"[REDACTED]"');
    // Scrub API keys
    sanitized = sanitized.replaceAll(RegExp(r'AIzaSy[A-Za-z0-9\-_]{33}'), '[REDACTED_GEMINI_KEY]');
    return sanitized;
  }

  int _readCrashCount() {
    return _storageService.getInt(_crashCountKey);
  }

  Future<void> _writeCrashCount(int count) async {
    await _storageService.setInt(_crashCountKey, count);
  }

  void dispose() {
    _stabilityTimer?.cancel();
  }
}

/// Global provider for CrashReporterService
final crashReporterServiceProvider = Provider<CrashReporterService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final storage = ref.watch(storageServiceProvider);
  final cache = ref.watch(tenantCacheServiceProvider);
  return CrashReporterService(apiClient, storage, cache);
});
