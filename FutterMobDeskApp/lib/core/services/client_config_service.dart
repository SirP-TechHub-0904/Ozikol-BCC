import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/api_constants.dart';
import '../models/client_app_config.dart';
import '../network/api_client.dart';
import '../storage/secure_storage_service.dart';
import '../../features/workspace_auth/state/workspace_state.dart';

/// Service managing dynamic client keys and platform operational parameters.
/// Fetches the dynamic configuration from the Central Master Catalog on app boot.
class ClientConfigService {
  final ApiClient _apiClient;
  final SecureStorageService _storageService;

  ClientConfigService(this._apiClient, this._storageService);

  /// Performs the startup handshake to retrieve dynamic third-party client keys,
  /// bot protection keys, and platform maintenance status.
  Future<ClientAppConfig> fetchClientConfig() async {
    try {
      final response = await _apiClient.dio.get(
        ApiConstants.clientConfigEndpoint,
        options: Options(
          receiveTimeout: const Duration(seconds: 5),
          sendTimeout: const Duration(seconds: 5),
        ),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map && data['data'] != null) {
          final configMap = Map<String, dynamic>.from(data['data'] as Map);
          final config = ClientAppConfig.fromJson(configMap);

          // Save to secure device cache for offline boots
          await _storageService.saveClientConfig(configMap);
          return config;
        }
      }
    } catch (_) {
      // Gracefully fall back to cached config on network/offline boot
    }

    // Try reading cached config from last successful boot
    final cachedMap = await _storageService.getCachedClientConfig();
    if (cachedMap != null) {
      return ClientAppConfig.fromJson(cachedMap);
    }

    // Default safe baseline
    return const ClientAppConfig();
  }
}

// ---------------------------------------------------------------------------
// Riverpod Provider
// ---------------------------------------------------------------------------

final clientConfigServiceProvider = Provider<ClientConfigService>((ref) {
  final client = ref.watch(apiClientProvider);
  final storage = ref.watch(storageServiceProvider);
  return ClientConfigService(client, storage);
});

final clientConfigProvider = FutureProvider<ClientAppConfig>((ref) async {
  final service = ref.watch(clientConfigServiceProvider);
  return await service.fetchClientConfig();
});
