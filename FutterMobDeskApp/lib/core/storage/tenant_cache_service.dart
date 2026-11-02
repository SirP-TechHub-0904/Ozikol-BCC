import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'secure_storage_service.dart';

/// Metadata wrapper for cached payload objects.
class CacheEntry<T> {
  final T data;
  final DateTime cachedAt;
  final Duration? ttl;
  final String? etag;

  const CacheEntry({
    required this.data,
    required this.cachedAt,
    this.ttl,
    this.etag,
  });

  /// True if the entry has passed its configured time-to-live.
  bool get isExpired {
    if (ttl == null) return false;
    return DateTime.now().isAfter(cachedAt.add(ttl!));
  }

  Map<String, dynamic> toJson() => {
        'data': data,
        'cachedAt': cachedAt.toIso8601String(),
        'ttlMs': ttl?.inMilliseconds,
        'etag': etag,
      };

  factory CacheEntry.fromJson(Map<String, dynamic> json) {
    return CacheEntry(
      data: json['data'] as T,
      cachedAt: DateTime.parse(json['cachedAt'] as String),
      ttl: json['ttlMs'] != null ? Duration(milliseconds: json['ttlMs'] as int) : null,
      etag: json['etag'] as String?,
    );
  }
}

/// Multi-tenant partitioned cache service providing L1 in-memory and L2 persistent storage.
/// Guarantees strict isolation between enrolled workspaces so Tenant A data never leaks into Tenant B.
class TenantCacheService {
  final SecureStorageService _storageService;
  final SharedPreferences? _prefs;
  final Map<String, CacheEntry<dynamic>> _memoryCache = {};

  TenantCacheService(this._storageService, this._prefs);

  /// In-memory instance for testing and headless environments
  TenantCacheService.inMemory(this._storageService) : _prefs = null;

  /// Factory initializer to obtain platform SharedPreferences
  static Future<TenantCacheService> create(SecureStorageService storageService) async {
    final prefs = await SharedPreferences.getInstance();
    return TenantCacheService(storageService, prefs);
  }

  /// Builds a fully-qualified tenant-partitioned cache key
  String _buildKey(String key, String? tenantKey) {
    final effectiveTenant = (tenantKey ?? _storageService.getActiveTenantKey() ?? 'global').toLowerCase().trim();
    return 'bcp_cache_${effectiveTenant}_$key';
  }

  /// Retrieves a cached value from L1 memory or L2 disk cache.
  /// If [allowStale] is true, returns the cached object even if its TTL has expired (stale-while-revalidate).
  T? get<T>(
    String key, {
    String? tenantKey,
    bool allowStale = false,
    T Function(dynamic)? fromJson,
  }) {
    final fullKey = _buildKey(key, tenantKey);

    // 1. Check L1 Memory Cache
    if (_memoryCache.containsKey(fullKey)) {
      final entry = _memoryCache[fullKey]!;
      if (!entry.isExpired || allowStale) {
        if (fromJson != null) {
          return fromJson(entry.data);
        }
        return entry.data as T?;
      } else {
        // Expired and caller did not request stale: return null, but retain entry for stale readers
        return null;
      }
    }

    // 2. Check L2 Disk Cache (SharedPreferences)
    if (_prefs != null) {
      final raw = _prefs.getString(fullKey);
      if (raw != null && raw.isNotEmpty) {
        try {
          final decoded = jsonDecode(raw) as Map<String, dynamic>;
          final entry = CacheEntry<dynamic>.fromJson(decoded);

          // Populate L1 cache for subsequent fast reads
          _memoryCache[fullKey] = entry;

          if (!entry.isExpired || allowStale) {
            if (fromJson != null) {
              return fromJson(entry.data);
            }
            return entry.data as T?;
          } else {
            // Expired and caller did not request stale: return null, retaining entry
            return null;
          }
        } catch (_) {
          _prefs.remove(fullKey);
        }
      }
    }

    return null;
  }

  /// Persists a payload into both L1 memory cache and L2 disk cache.
  Future<void> put(
    String key,
    dynamic data, {
    String? tenantKey,
    Duration? ttl,
    String? etag,
  }) async {
    final fullKey = _buildKey(key, tenantKey);
    final entry = CacheEntry<dynamic>(
      data: data,
      cachedAt: DateTime.now(),
      ttl: ttl,
      etag: etag,
    );

    // Save to L1 memory cache
    _memoryCache[fullKey] = entry;

    // Save to L2 disk cache
    if (_prefs != null) {
      try {
        final encoded = jsonEncode(entry.toJson());
        await _prefs.setString(fullKey, encoded);
      } catch (_) {
        // Disk serialization error handled gracefully
      }
    }
  }

  /// Removes a specific cached entry
  Future<void> remove(String key, {String? tenantKey}) async {
    final fullKey = _buildKey(key, tenantKey);
    _memoryCache.remove(fullKey);
    if (_prefs != null) {
      await _prefs.remove(fullKey);
    }
  }

  /// Wipes all cached keys belonging to a specific workspace tenant.
  /// Called upon workspace sign-out or deletion to eliminate cross-tenant contamination.
  Future<void> clearTenant(String tenantKey) async {
    final prefix = 'bcp_cache_${tenantKey.toLowerCase().trim()}_';

    // 1. Clear matching L1 keys
    _memoryCache.removeWhere((k, _) => k.startsWith(prefix));

    // 2. Clear matching L2 disk keys
    if (_prefs != null) {
      final keys = _prefs.getKeys().where((k) => k.startsWith(prefix)).toList();
      for (final k in keys) {
        await _prefs.remove(k);
      }
    }
  }

  /// Wipes all application caches across all tenants
  Future<void> clearAll() async {
    _memoryCache.clear();
    if (_prefs != null) {
      final keys = _prefs.getKeys().where((k) => k.startsWith('bcp_cache_')).toList();
      for (final k in keys) {
        await _prefs.remove(k);
      }
    }
  }
}

/// Global provider for the multi-tenant cache service
final tenantCacheServiceProvider = Provider<TenantCacheService>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return TenantCacheService.inMemory(storage);
});
