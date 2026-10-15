import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/workspace.dart';

/// Secure storage service managing tenant sessions, JWT credentials, and active workspace preferences.
/// Supports both native platform storage and fast in-memory storage for headless testing.
class SecureStorageService {
  static const String _activeTenantKeyPrefs = 'ozikol_active_tenant_key';
  static const String _workspacesStorageKey = 'ozikol_enrolled_workspaces_json';
  static const String _tokenPrefix = 'ozikol_token_';

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
}
