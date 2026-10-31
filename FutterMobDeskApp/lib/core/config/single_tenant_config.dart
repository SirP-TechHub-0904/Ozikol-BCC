import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../models/workspace.dart';
import '../storage/secure_storage_service.dart';

/// Manages single-tenant lock configuration for dedicated tenant desktop exports.
///
/// Supports two locking mechanisms:
/// 1. Compile-time flags via `--dart-define=LOCKED_TENANT_KEY=cocacolamkl`
/// 2. Instant installer packaging via a `tenant.lock.json` file placed next to the executable.
///
/// When [isLocked] is `true`:
/// - The initial organization lookup screen (`WorkspaceEntryScreen`) is completely bypassed.
/// - All "Choose Workspace", "Change Organization", and "Switch Workspace" UI controls are hidden.
/// - Tenant icon, logo, and brand name are pre-bound for the title bar, taskbar, and login screen.
/// - Sign-out returns directly to the locked tenant's login screen.
class SingleTenantConfig {
  SingleTenantConfig._();

  static const String _compileTenantKey = String.fromEnvironment('LOCKED_TENANT_KEY');
  static const String _compileTenantName = String.fromEnvironment('LOCKED_TENANT_NAME');
  static const String _compileTenantDomain = String.fromEnvironment('LOCKED_TENANT_DOMAIN');
  static const String _compileApiBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const String _compileIconUrl = String.fromEnvironment('LOCKED_TENANT_ICON_URL');
  static const String _compileLogoUrl = String.fromEnvironment('LOCKED_TENANT_LOGO_URL');

  static String? _tenantKey = _compileTenantKey.isNotEmpty ? _compileTenantKey : null;
  static String? _organizationName = _compileTenantName.isNotEmpty ? _compileTenantName : null;
  static String? _primaryDomain = _compileTenantDomain.isNotEmpty ? _compileTenantDomain : null;
  static String? _apiBaseUrl = _compileApiBaseUrl.isNotEmpty ? _compileApiBaseUrl : null;
  static String? _iconUrl = _compileIconUrl.isNotEmpty ? _compileIconUrl : null;
  static String? _logoUrl = _compileLogoUrl.isNotEmpty ? _compileLogoUrl : null;

  /// Whether this build/installation is locked exclusively to a single tenant.
  static bool get isLocked => _tenantKey != null && _tenantKey!.trim().isNotEmpty;

  /// The locked tenant partition key (e.g. 'cocacolamkl').
  static String? get tenantKey => _tenantKey?.trim();

  /// Display name of the locked organization.
  static String get organizationName =>
      (_organizationName != null && _organizationName!.trim().isNotEmpty)
          ? _organizationName!.trim()
          : (_tenantKey?.trim() ?? 'Workspace');

  /// Primary domain of the locked organization.
  static String get primaryDomain =>
      (_primaryDomain != null && _primaryDomain!.trim().isNotEmpty)
          ? _primaryDomain!.trim()
          : '${_tenantKey?.trim().toLowerCase() ?? "workspace"}.local';

  /// Optional locked API base URL override.
  static String? get apiBaseUrl =>
      (_apiBaseUrl != null && _apiBaseUrl!.trim().isNotEmpty) ? _apiBaseUrl!.trim() : null;

  /// Optional pre-resolved tenant square icon URL.
  static String? get iconUrl =>
      (_iconUrl != null && _iconUrl!.trim().isNotEmpty) ? _iconUrl!.trim() : null;

  /// Optional pre-resolved tenant wide logo URL.
  static String? get logoUrl =>
      (_logoUrl != null && _logoUrl!.trim().isNotEmpty) ? _logoUrl!.trim() : null;

  /// Initializes single-tenant configuration from `tenant.lock.json` (if present next to the desktop executable)
  /// or compile-time `--dart-define` flags, and persists the target tenant in [storageService].
  static Future<void> initialize(SecureStorageService storageService) async {
    if (!kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux)) {
      try {
        final exeDir = File(Platform.resolvedExecutable).parent.path;
        final candidates = [
          File('$exeDir${Platform.pathSeparator}tenant.lock.json'),
          File('tenant.lock.json'),
        ];

        for (final file in candidates) {
          if (await file.exists()) {
            final content = await file.readAsString();
            final json = jsonDecode(content) as Map<String, dynamic>;
            final key = (json['tenantKey'] ?? json['lockedTenantKey'])?.toString().trim();
            if (key != null && key.isNotEmpty) {
              _tenantKey = key;
              _organizationName = (json['organizationName'] ?? json['brandName'])?.toString().trim() ?? _organizationName;
              _primaryDomain = json['primaryDomain']?.toString().trim() ?? _primaryDomain;
              _apiBaseUrl = json['apiBaseUrl']?.toString().trim() ?? _apiBaseUrl;
              _iconUrl = json['iconUrl']?.toString().trim() ?? _iconUrl;
              _logoUrl = json['logoUrl']?.toString().trim() ?? _logoUrl;
              break;
            }
          }
        }
      } catch (e) {
        debugPrint('⚠️ [SingleTenantConfig] Failed to read tenant.lock.json: $e');
      }
    }

    if (isLocked) {
      if (apiBaseUrl != null) {
        await storageService.setCustomBaseUrl(apiBaseUrl);
      }
      final key = tenantKey!;
      await storageService.setActiveTenantKey(key);
      await storageService.setRememberOrganizationEnabled(true);
      await storageService.setRememberedOrganizationCode(key);

      final existing = await storageService.getWorkspaceWithToken(key);
      final lockedWs = buildLockedWorkspace(existing);
      await storageService.saveWorkspace(lockedWs);
      await storageService.saveRememberedWorkspace(lockedWs);
    }
  }

  /// Constructs a [Workspace] model for the locked tenant, preserving any existing session or branding metadata.
  static Workspace buildLockedWorkspace([Workspace? existing]) {
    final key = tenantKey ?? 'default';
    if (existing != null && existing.tenantKey.toLowerCase() == key.toLowerCase()) {
      return existing.copyWith(
        organizationName: existing.organizationName.isNotEmpty ? existing.organizationName : organizationName,
        primaryDomain: existing.primaryDomain.isNotEmpty ? existing.primaryDomain : primaryDomain,
        iconUrl: existing.iconUrl ?? iconUrl,
        logoUrl: existing.logoUrl ?? logoUrl,
      );
    }
    return Workspace(
      tenantKey: key,
      organizationName: organizationName,
      primaryDomain: primaryDomain,
      iconUrl: iconUrl,
      logoUrl: logoUrl,
      lastAccessed: DateTime.now(),
    );
  }
}
