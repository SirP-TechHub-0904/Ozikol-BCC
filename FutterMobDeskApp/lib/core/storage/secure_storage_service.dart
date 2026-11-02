import 'dart:convert';
import 'dart:math';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/workspace.dart';

/// Secure storage service managing tenant sessions, JWT credentials, and active workspace preferences.
/// Supports both native platform storage and fast in-memory storage for headless testing.
class SecureStorageService {
  static const String _activeTenantKeyPrefs = 'ozikol_active_tenant_key';
  static const String _workspacesStorageKey = 'ozikol_enrolled_workspaces_json';
  static const String _tokenPrefix = 'ozikol_token_';
  static const String _systemDeviceIdKey = 'ozikol_system_device_id';

  final FlutterSecureStorage? _secureStorage;
  final SharedPreferences? _prefs;
  final Map<String, String> _memoryStore = {};

  SecureStorageService(this._secureStorage, this._prefs);

  /// In-memory constructor for unit tests, widget tests, and mock environments
  SecureStorageService.inMemory()
      : _secureStorage = null,
        _prefs = null;

  /// Factory initializer to obtain real platform dependencies asynchronously
  static Future<SecureStorageService> create() async {
    const secureStorage = FlutterSecureStorage();
    final prefs = await SharedPreferences.getInstance();
    return SecureStorageService(secureStorage, prefs);
  }

  /// Retrieves the currently active tenant key
  String? getActiveTenantKey() {
    if (_prefs != null) {
      return _prefs.getString(_activeTenantKeyPrefs);
    }
    return _memoryStore[_activeTenantKeyPrefs];
  }

  /// Sets the currently active tenant key
  Future<void> setActiveTenantKey(String tenantKey) async {
    if (_prefs != null) {
      await _prefs.setString(_activeTenantKeyPrefs, tenantKey);
    } else {
      _memoryStore[_activeTenantKeyPrefs] = tenantKey;
    }
  }

  /// Retrieves all enrolled workspaces
  Future<List<Workspace>> getWorkspaces() async {
    try {
      final rawJson = _secureStorage != null
          ? await _secureStorage.read(key: _workspacesStorageKey)
          : _memoryStore[_workspacesStorageKey];

      if (rawJson == null || rawJson.isEmpty) return [];

      final decoded = jsonDecode(rawJson) as List<dynamic>;
      return decoded.map((e) => Workspace.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  /// Saves or updates a workspace in the enrolled list
  Future<void> saveWorkspace(Workspace workspace) async {
    final list = await getWorkspaces();
    final index = list.indexWhere((w) => w.tenantKey.toLowerCase() == workspace.tenantKey.toLowerCase());

    if (index >= 0) {
      list[index] = workspace;
    } else {
      list.add(workspace);
    }

    final encoded = jsonEncode(list.map((w) => w.toJson()).toList());
    if (_secureStorage != null) {
      await _secureStorage.write(key: _workspacesStorageKey, value: encoded);
    } else {
      _memoryStore[_workspacesStorageKey] = encoded;
    }

    // If an auth token is provided, store it encrypted
    if (workspace.authToken != null && workspace.authToken!.isNotEmpty) {
      final tokenKey = '$_tokenPrefix${workspace.tenantKey.toLowerCase()}';
      if (_secureStorage != null) {
        await _secureStorage.write(key: tokenKey, value: workspace.authToken);
      } else {
        _memoryStore[tokenKey] = workspace.authToken!;
      }
    }

    // Set as active tenant if none is currently selected
    if (getActiveTenantKey() == null) {
      await setActiveTenantKey(workspace.tenantKey);
    }
  }

  /// Retrieves the active workspace object
  Future<Workspace?> getActiveWorkspace() async {
    final activeKey = getActiveTenantKey();
    if (activeKey == null) return null;

    final list = await getWorkspaces();
    final match = list.where((w) => w.tenantKey.toLowerCase() == activeKey.toLowerCase()).firstOrNull;
    if (match == null) return null;

    final tokenKey = '$_tokenPrefix${match.tenantKey.toLowerCase()}';
    final token = _secureStorage != null
        ? await _secureStorage.read(key: tokenKey)
        : _memoryStore[tokenKey];

    return match.copyWith(authToken: token);
  }

  /// <summary>
  /// Retrieves the stored encrypted authentication token for a specific tenant workspace if any.
  /// </summary>
  /// <param name="tenantKey">Target tenant partition key.</param>
  /// <returns>Decrypted JWT Bearer token or null if unauthenticated.</returns>
  Future<String?> getAuthToken(String tenantKey) async {
    final tokenKey = '$_tokenPrefix${tenantKey.toLowerCase()}';
    final token = _secureStorage != null
        ? await _secureStorage.read(key: tokenKey)
        : _memoryStore[tokenKey];

    if (token != null && token.trim().isNotEmpty) return token.trim();

    // Fall back to checking the enrolled workspace entry
    final list = await getWorkspaces();
    final match = list.where((w) => w.tenantKey.toLowerCase() == tenantKey.toLowerCase()).firstOrNull;
    if (match?.authToken != null && match!.authToken!.trim().isNotEmpty) {
      return match.authToken!.trim();
    }

    return null;
  }

  /// <summary>
  /// Retrieves an enrolled workspace model fully hydrated with its decrypted authentication token.
  /// </summary>
  /// <param name="tenantKey">Target tenant partition key.</param>
  /// <returns>Workspace model with populated authToken, or null if not enrolled.</returns>
  Future<Workspace?> getWorkspaceWithToken(String tenantKey) async {
    final list = await getWorkspaces();
    final match = list.where((w) => w.tenantKey.toLowerCase() == tenantKey.toLowerCase()).firstOrNull;
    if (match == null) return null;

    final token = await getAuthToken(tenantKey);
    return match.copyWith(authToken: token);
  }

  /// Removes an enrolled workspace
  Future<void> removeWorkspace(String tenantKey) async {
    final list = await getWorkspaces();
    list.removeWhere((w) => w.tenantKey.toLowerCase() == tenantKey.toLowerCase());

    final encoded = jsonEncode(list.map((w) => w.toJson()).toList());
    final tokenKey = '$_tokenPrefix${tenantKey.toLowerCase()}';

    if (_secureStorage != null) {
      await _secureStorage.write(key: _workspacesStorageKey, value: encoded);
      await _secureStorage.delete(key: tokenKey);
    } else {
      _memoryStore[_workspacesStorageKey] = encoded;
      _memoryStore.remove(tokenKey);
    }

    // Reset active tenant key if removed
    if (getActiveTenantKey()?.toLowerCase() == tenantKey.toLowerCase()) {
      if (list.isNotEmpty) {
        await setActiveTenantKey(list.first.tenantKey);
      } else {
        if (_prefs != null) {
          await _prefs.remove(_activeTenantKeyPrefs);
        } else {
          _memoryStore.remove(_activeTenantKeyPrefs);
        }
      }
    }
  }

  /// Clears the authentication token for the given tenant workspace without removing workspace enrollment.
  Future<void> clearAuthToken(String tenantKey) async {
    final tokenKey = '$_tokenPrefix${tenantKey.toLowerCase()}';
    if (_secureStorage != null) {
      await _secureStorage.delete(key: tokenKey);
    } else {
      _memoryStore.remove(tokenKey);
    }

    final list = await getWorkspaces();
    final index = list.indexWhere((w) => w.tenantKey.toLowerCase() == tenantKey.toLowerCase());
    if (index >= 0) {
      list[index] = list[index].copyWith(clearAuthToken: true);
      final encoded = jsonEncode(list.map((w) => w.toJson()).toList());
      if (_secureStorage != null) {
        await _secureStorage.write(key: _workspacesStorageKey, value: encoded);
      } else {
        _memoryStore[_workspacesStorageKey] = encoded;
      }
    }
  }

  static const String _rememberOrganizationPrefs = 'ozikol_remember_organization';
  static const String _rememberedOrganizationCodePrefs = 'ozikol_remembered_org_code';
  static const String _rememberedWorkspaceJsonPrefs = 'ozikol_remembered_workspace_json';

  /// Whether "Remember this organization" is enabled
  bool isRememberOrganizationEnabled() {
    if (_prefs != null) {
      return _prefs.getBool(_rememberOrganizationPrefs) ?? true;
    }
    return _memoryStore[_rememberOrganizationPrefs] != 'false';
  }

  /// Sets whether "Remember this organization" is enabled
  Future<void> setRememberOrganizationEnabled(bool enabled) async {
    if (_prefs != null) {
      await _prefs.setBool(_rememberOrganizationPrefs, enabled);
    } else {
      _memoryStore[_rememberOrganizationPrefs] = enabled.toString();
    }
  }

  /// Gets the remembered organization code / identifier
  String? getRememberedOrganizationCode() {
    if (_prefs != null) {
      return _prefs.getString(_rememberedOrganizationCodePrefs);
    }
    return _memoryStore[_rememberedOrganizationCodePrefs];
  }

  /// Sets the remembered organization code / identifier
  Future<void> setRememberedOrganizationCode(String? code) async {
    if (_prefs != null) {
      if (code == null) {
        await _prefs.remove(_rememberedOrganizationCodePrefs);
      } else {
        await _prefs.setString(_rememberedOrganizationCodePrefs, code);
      }
    } else {
      if (code == null) {
        _memoryStore.remove(_rememberedOrganizationCodePrefs);
      } else {
        _memoryStore[_rememberedOrganizationCodePrefs] = code;
      }
    }
  }

  /// Saves the remembered workspace metadata for immediate bypass on subsequent launches
  Future<void> saveRememberedWorkspace(Workspace? workspace) async {
    final raw = workspace != null ? jsonEncode(workspace.toJson()) : null;
    if (_prefs != null) {
      if (raw == null) {
        await _prefs.remove(_rememberedWorkspaceJsonPrefs);
      } else {
        await _prefs.setString(_rememberedWorkspaceJsonPrefs, raw);
      }
    } else {
      if (raw == null) {
        _memoryStore.remove(_rememberedWorkspaceJsonPrefs);
      } else {
        _memoryStore[_rememberedWorkspaceJsonPrefs] = raw;
      }
    }
  }

  /// Gets the remembered workspace metadata
  Workspace? getRememberedWorkspace() {
    try {
      final raw = _prefs != null
          ? _prefs.getString(_rememberedWorkspaceJsonPrefs)
          : _memoryStore[_rememberedWorkspaceJsonPrefs];
      if (raw == null || raw.isEmpty) return null;
      return Workspace.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  /// Clears remembered organization bypass preferences
  Future<void> clearRememberedOrganization() async {
    await setRememberedOrganizationCode(null);
    await saveRememberedWorkspace(null);
  }

  static const String _rememberUserLoginPrefix = 'ozikol_remember_login_';
  static const String _rememberedEmailPrefix = 'ozikol_remembered_email_';

  /// <summary>
  /// Checks whether "Remember me in future login" is enabled for a given tenant workspace or globally.
  /// </summary>
  /// <param name="tenantKey">Optional tenant partition identifier.</param>
  /// <returns>True if remember me is enabled (defaults to true).</returns>
  bool isRememberLoginEnabled([String? tenantKey]) {
    final key = tenantKey != null && tenantKey.isNotEmpty
        ? '$_rememberUserLoginPrefix$tenantKey'
        : 'ozikol_remember_login_global';
    if (_prefs != null) {
      return _prefs.getBool(key) ?? true;
    }
    return _memoryStore[key] != 'false';
  }

  /// <summary>
  /// Persists whether "Remember me in future login" is enabled.
  /// </summary>
  /// <param name="enabled">True to enable, false to disable.</param>
  /// <param name="tenantKey">Optional tenant partition identifier.</param>
  Future<void> setRememberLoginEnabled(bool enabled, [String? tenantKey]) async {
    final key = tenantKey != null && tenantKey.isNotEmpty
        ? '$_rememberUserLoginPrefix$tenantKey'
        : 'ozikol_remember_login_global';
    if (_prefs != null) {
      await _prefs.setBool(key, enabled);
    } else {
      _memoryStore[key] = enabled.toString();
    }
  }

  /// <summary>
  /// Retrieves the saved email address for future login.
  /// </summary>
  /// <param name="tenantKey">Optional tenant partition identifier.</param>
  /// <returns>Remembered work email string or null if not saved.</returns>
  String? getRememberedEmail([String? tenantKey]) {
    final key = tenantKey != null && tenantKey.isNotEmpty
        ? '$_rememberedEmailPrefix$tenantKey'
        : 'ozikol_remembered_email_global';
    if (_prefs != null) {
      return _prefs.getString(key);
    }
    return _memoryStore[key];
  }

  /// <summary>
  /// Persists or clears the remembered email address for future login.
  /// </summary>
  /// <param name="email">Email address to remember, or null to clear.</param>
  /// <param name="tenantKey">Optional tenant partition identifier.</param>
  Future<void> setRememberedEmail(String? email, [String? tenantKey]) async {
    final key = tenantKey != null && tenantKey.isNotEmpty
        ? '$_rememberedEmailPrefix$tenantKey'
        : 'ozikol_remembered_email_global';
    if (_prefs != null) {
      if (email == null || email.trim().isEmpty) {
        await _prefs.remove(key);
      } else {
        await _prefs.setString(key, email.trim());
      }
    } else {
      if (email == null || email.trim().isEmpty) {
        _memoryStore.remove(key);
      } else {
        _memoryStore[key] = email.trim();
      }
    }
  }

  static const String _clientConfigKey = 'ozikol_cached_client_config_json';

  /// Saves the dynamically fetched client application configuration
  Future<void> saveClientConfig(Map<String, dynamic> configJson) async {
    final encoded = jsonEncode(configJson);
    if (_secureStorage != null) {
      await _secureStorage.write(key: _clientConfigKey, value: encoded);
    } else {
      _memoryStore[_clientConfigKey] = encoded;
    }
  }

  /// Retrieves the cached client application configuration
  Future<Map<String, dynamic>?> getCachedClientConfig() async {
    try {
      final raw = _secureStorage != null
          ? await _secureStorage.read(key: _clientConfigKey)
          : _memoryStore[_clientConfigKey];

      if (raw == null || raw.isEmpty) return null;
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static const String _customBaseUrlPrefs = 'ozikol_custom_base_url';

  /// Retrieves the user-configured API Base URL override if any
  String? getCustomBaseUrl() {
    if (_prefs != null) {
      return _prefs.getString(_customBaseUrlPrefs);
    }
    return _memoryStore[_customBaseUrlPrefs];
  }

  /// Sets or clears the user-configured API Base URL override
  Future<void> setCustomBaseUrl(String? url) async {
    if (url == null || url.trim().isEmpty) {
      if (_prefs != null) {
        await _prefs.remove(_customBaseUrlPrefs);
      } else {
        _memoryStore.remove(_customBaseUrlPrefs);
      }
      return;
    }

    if (_prefs != null) {
      await _prefs.setString(_customBaseUrlPrefs, url.trim());
    } else {
      _memoryStore[_customBaseUrlPrefs] = url.trim();
    }
  }

  static const String _themeModePrefs = 'ozikol_app_theme_mode';

  /// Retrieves the saved theme mode preference ('system', 'light', 'dark')
  String? getThemeMode() {
    if (_prefs != null) {
      return _prefs.getString(_themeModePrefs);
    }
    return _memoryStore[_themeModePrefs];
  }

  /// Persists the theme mode preference ('system', 'light', 'dark')
  Future<void> setThemeMode(String mode) async {
    if (_prefs != null) {
      await _prefs.setString(_themeModePrefs, mode);
    } else {
      _memoryStore[_themeModePrefs] = mode;
    }
  }

  static const String _languagePrefs = 'ozikol_app_language';

  /// Retrieves the saved language code preference ('en', 'fr', 'es', 'de')
  String? getLanguage() {
    if (_prefs != null) {
      return _prefs.getString(_languagePrefs);
    }
    return _memoryStore[_languagePrefs];
  }

  /// Persists the language code preference
  Future<void> setLanguage(String lang) async {
    if (_prefs != null) {
      await _prefs.setString(_languagePrefs, lang);
    } else {
      _memoryStore[_languagePrefs] = lang;
    }
  }

  /// Retrieves a boolean preference
  bool getBool(String key, {bool defaultValue = false}) {
    if (_prefs != null) {
      return _prefs.getBool(key) ?? defaultValue;
    }
    final val = _memoryStore[key];
    if (val == null) return defaultValue;
    return val.toLowerCase() == 'true';
  }

  /// Persists a boolean preference
  Future<void> setBool(String key, bool value) async {
    if (_prefs != null) {
      await _prefs.setBool(key, value);
    } else {
      _memoryStore[key] = value.toString();
    }
  }

  /// Retrieves an integer preference
  int getInt(String key, {int defaultValue = 0}) {
    if (_prefs != null) {
      return _prefs.getInt(key) ?? defaultValue;
    }
    final val = _memoryStore[key];
    if (val == null) return defaultValue;
    return int.tryParse(val) ?? defaultValue;
  }

  /// Persists an integer preference
  Future<void> setInt(String key, int value) async {
    if (_prefs != null) {
      await _prefs.setInt(key, value);
    } else {
      _memoryStore[key] = value.toString();
    }
  }

  /// Retrieves or generates a persistent unique system/device identifier (UUID v4)
  Future<String> getOrCreateSystemDeviceId() async {
    String? deviceId = _secureStorage != null
        ? await _secureStorage.read(key: _systemDeviceIdKey)
        : _memoryStore[_systemDeviceIdKey];

    if (deviceId == null || deviceId.isEmpty) {
      deviceId = _generateUuidV4();
      if (_secureStorage != null) {
        await _secureStorage.write(key: _systemDeviceIdKey, value: deviceId);
      } else {
        _memoryStore[_systemDeviceIdKey] = deviceId;
      }
    }
    return deviceId;
  }

  static const String _deviceTrustTokenPrefix = 'ozikol_device_trust_token_';
  static const String _deviceTrustTokenGlobal = 'ozikol_device_trust_token_global';

  /// Retrieves the saved device trust token for the specified tenant or globally.
  Future<String?> getDeviceTrustToken([String? tenantKey]) async {
    final key = tenantKey != null && tenantKey.isNotEmpty
        ? '$_deviceTrustTokenPrefix$tenantKey'
        : _deviceTrustTokenGlobal;

    if (_secureStorage != null) {
      final token = await _secureStorage.read(key: key);
      if (token != null && token.isNotEmpty) return token;
      if (tenantKey != null) {
        return await _secureStorage.read(key: _deviceTrustTokenGlobal);
      }
      return null;
    }
    return _memoryStore[key] ?? _memoryStore[_deviceTrustTokenGlobal];
  }

  /// Persists the device trust token for the specified tenant and globally.
  Future<void> setDeviceTrustToken(String token, [String? tenantKey]) async {
    final trimmed = token.trim();
    if (_secureStorage != null) {
      if (tenantKey != null && tenantKey.isNotEmpty) {
        await _secureStorage.write(key: '$_deviceTrustTokenPrefix$tenantKey', value: trimmed);
      }
      await _secureStorage.write(key: _deviceTrustTokenGlobal, value: trimmed);
    } else {
      if (tenantKey != null && tenantKey.isNotEmpty) {
        _memoryStore['$_deviceTrustTokenPrefix$tenantKey'] = trimmed;
      }
      _memoryStore[_deviceTrustTokenGlobal] = trimmed;
    }
  }

  /// Clears the device trust token.
  Future<void> clearDeviceTrustToken([String? tenantKey]) async {
    if (_secureStorage != null) {
      if (tenantKey != null && tenantKey.isNotEmpty) {
        await _secureStorage.delete(key: '$_deviceTrustTokenPrefix$tenantKey');
      }
      await _secureStorage.delete(key: _deviceTrustTokenGlobal);
    } else {
      if (tenantKey != null && tenantKey.isNotEmpty) {
        _memoryStore.remove('$_deviceTrustTokenPrefix$tenantKey');
      }
      _memoryStore.remove(_deviceTrustTokenGlobal);
    }
  }

  static String _generateUuidV4() {
    final random = Random.secure();
    final values = List<int>.generate(16, (i) => random.nextInt(256));
    values[6] = (values[6] & 0x0f) | 0x40; // Version 4
    values[8] = (values[8] & 0x3f) | 0x80; // Variant 10
    final hex = values.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}';
  }
}

/// Global provider for SecureStorageService (defaults to in-memory for testing, overridden in main)
final storageServiceProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService.inMemory();
});

