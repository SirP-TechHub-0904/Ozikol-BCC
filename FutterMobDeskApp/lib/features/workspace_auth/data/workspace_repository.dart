import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/models/workspace.dart';
import '../../../core/network/api_client.dart';

/// Handles workspace verification, company discovery, and multi-tenant authentication.
class WorkspaceRepository {
  final ApiClient _apiClient;

  WorkspaceRepository(this._apiClient);

  Dio get _dio => _apiClient.dio;

  /// Resolves a workspace by Company Access Code, Default Subdomain, or Custom Domain.
  /// Normalizes input (e.g. "acme", "acme.ozikol.cloud", "portal.acme.com").
  Future<Workspace> resolveWorkspace(String rawInput) async {
    final cleanInput = _cleanIdentifier(rawInput);
    if (cleanInput.isEmpty) {
      throw Exception('Please enter a valid Company Access Code or Domain.');
    }

    try {
      // 1. First probe the Master Catalog tenants endpoint with the identifier
      final response = await _dio.get(
        ApiConstants.tenantsEndpoint,
        options: Options(
          headers: {
            ApiConstants.headerTenantKey: cleanInput,
            ApiConstants.headerTenantDomain: cleanInput,
          },
        ),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        List<dynamic> list = [];
        if (data is Map && data['data'] is List) {
          list = data['data'] as List;
        } else if (data is List) {
          list = data;
        }

        // Search for matching tenant key, primary domain, or custom domain
        for (final item in list) {
          final tKey = (item['tenantKey'] ?? '').toString().toLowerCase();
          final pDom = (item['primaryDomain'] ?? '').toString().toLowerCase();
          final cDom = (item['customDomain'] ?? '').toString().toLowerCase();
          final search = cleanInput.toLowerCase();

          if (tKey == search ||
              pDom == search ||
              cDom == search ||
              pDom.startsWith('$search.') ||
              search.startsWith('$tKey.')) {
            return Workspace(
              tenantKey: item['tenantKey'] ?? cleanInput,
              organizationName: item['organizationName'] ?? cleanInput,
              primaryDomain: item['primaryDomain'] ?? '$cleanInput.ozikol.cloud',
              customDomain: item['customDomain'],
              logoUrl: item['logoUrl'],
              lastAccessed: DateTime.now(),
              isActive: item['isActive'] ?? true,
            );
          }
        }
      }

      // 2. Direct fallback resolution if tenant lookup is directly matching tenant key
      return Workspace(
        tenantKey: cleanInput,
        organizationName: cleanInput.toUpperCase(),
        primaryDomain: cleanInput.contains('.') ? cleanInput : '$cleanInput.ozikol.cloud',
        lastAccessed: DateTime.now(),
        isActive: true,
      );
    } on DioException catch (dioErr) {
      if (dioErr.response?.statusCode == 404) {
        throw Exception('Workspace "$cleanInput" was not found in the Master Catalog.');
      }
      // If server returned another error or is currently offline in dev, allow proceeding with formatted identifier
      return Workspace(
        tenantKey: cleanInput,
        organizationName: cleanInput.toUpperCase(),
        primaryDomain: cleanInput.contains('.') ? cleanInput : '$cleanInput.ozikol.cloud',
        lastAccessed: DateTime.now(),
        isActive: true,
      );
    } catch (e) {
      throw Exception('Failed to connect to workspace: ${e.toString()}');
    }
  }

  /// Authenticates a user against the specified workspace
  Future<Map<String, dynamic>> login({
    required String tenantKey,
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.loginEndpoint,
        data: {
          'email': email.trim(),
          'password': password,
        },
        options: Options(
          headers: {
            ApiConstants.headerTenantKey: tenantKey,
          },
        ),
      );

      if (response.statusCode == 200 && response.data != null) {
        final resData = response.data;
        if (resData['success'] == true && resData['data'] != null) {
          return resData['data'] as Map<String, dynamic>;
        }
        throw Exception(resData['message'] ?? 'Login failed. Please check credentials.');
      }

      throw Exception('Server returned status code ${response.statusCode}');
    } on DioException catch (e) {
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message']
          : 'Invalid credentials or inactive workspace account.';
      throw Exception(msg);
    }
  }

  /// Cleans an incoming domain or code string
  static String _cleanIdentifier(String raw) {
    var cleaned = raw.trim().toLowerCase();
    cleaned = cleaned.replaceAll('https://', '').replaceAll('http://', '').replaceAll('www.', '');
    if (cleaned.contains('/')) {
      cleaned = cleaned.split('/')[0];
    }
    if (cleaned.contains(':')) {
      cleaned = cleaned.split(':')[0];
    }
    // If entered as an email like "admin@acmecorp.com"
    if (cleaned.contains('@')) {
      cleaned = cleaned.split('@')[1];
    }
    return cleaned;
  }
}
