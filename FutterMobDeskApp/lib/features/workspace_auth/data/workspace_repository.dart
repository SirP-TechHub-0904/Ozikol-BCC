import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/models/workspace.dart';
import '../../../core/network/api_client.dart';

/// Handles workspace verification, company discovery, and multi-tenant authentication.
class WorkspaceRepository {
  final ApiClient _apiClient;

  WorkspaceRepository(this._apiClient);

  Dio get _dio => _apiClient.dio;

  /// Resolves a workspace by Organization Access Code, Subdomain, or Custom Web Address.
  /// Normalizes input (e.g. "acme", "acme.ozikol.cloud", "portal.acme.com", "https://rozzy-touchxcx.localhost:4200/").
  Future<Workspace> resolveWorkspace(String rawInput) async {
    final cleanInput = _cleanIdentifier(rawInput);
    if (cleanInput.isEmpty) {
      throw Exception('Please enter a valid organization access code or web domain.');
    }

    final hostWithoutPort = cleanInput.split(':')[0];
    final subdomain = _extractSubdomain(hostWithoutPort);

    try {
      // 1. First probe the dedicated single-tenant resolution endpoint
      try {
        final resolveResponse = await _dio.get(
          ApiConstants.resolveTenantEndpoint,
          queryParameters: {'identifier': cleanInput},
        );

        if (resolveResponse.statusCode == 200 && resolveResponse.data != null) {
          final resData = resolveResponse.data;
          Map? item;
          if (resData is Map && resData['data'] is Map && resData['data']['tenantKey'] != null) {
            item = resData['data'] as Map;
          } else if (resData is Map && resData['tenantKey'] != null) {
            item = resData;
          }

          if (item != null) {
            final tKey = item['tenantKey']?.toString() ?? cleanInput;
            final branding = await probeTenantBranding(tKey);
            return Workspace(
              tenantKey: tKey,
              organizationName: item['organizationName'] ?? tKey,
              primaryDomain: item['primaryDomain'] ?? '$tKey.ozikol.cloud',
              customDomain: item['customDomain'],
              logoUrl: branding.logoUrl ?? item['logoUrl'],
              iconUrl: branding.iconUrl ?? item['iconUrl'],
              lastAccessed: DateTime.now(),
              isActive: item['isActive'] ?? true,
            );
          }
        }
      } catch (_) {
        // Fall back gracefully to querying registered tenants catalog
      }

      // 2. Query registered tenants catalog and match locally
      final response = await _dio.get(ApiConstants.tenantsEndpoint);

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        List<dynamic> list = [];
        if (data is Map && data['data'] is List) {
          list = data['data'] as List;
        } else if (data is List) {
          list = data;
        }

        // Search for matching tenant key, primary domain, custom domain, or website URL
        for (final item in list) {
          final tKey = (item['tenantKey'] ?? '').toString().toLowerCase();
          final pDom = (item['primaryDomain'] ?? '').toString().toLowerCase();
          final cDom = (item['customDomain'] ?? '').toString().toLowerCase();
          final webUrl = (item['websiteUrl'] ?? '').toString().toLowerCase();

          final pDomHost = pDom.split(':')[0];
          final cDomHost = cDom.split(':')[0];

          final isKeyMatch = tKey == cleanInput ||
              tKey == hostWithoutPort ||
              (subdomain.isNotEmpty && tKey == subdomain);

          final isPrimaryMatch = pDom == cleanInput ||
              pDomHost == hostWithoutPort ||
              (subdomain.isNotEmpty && pDomHost.startsWith('$subdomain.'));

          final isCustomMatch = cDom.isNotEmpty &&
              (cDom == cleanInput || cDomHost == hostWithoutPort);

          final isWebsiteMatch = webUrl.isNotEmpty &&
              (webUrl.contains(hostWithoutPort) ||
                  (subdomain.isNotEmpty && webUrl.contains(subdomain)));

          if (isKeyMatch || isPrimaryMatch || isCustomMatch || isWebsiteMatch) {
            final matchedKey = (item['tenantKey'] ?? cleanInput).toString();
            final branding = await probeTenantBranding(matchedKey);
            return Workspace(
              tenantKey: matchedKey,
              organizationName: item['organizationName'] ?? matchedKey,
              primaryDomain: item['primaryDomain'] ?? '$matchedKey.ozikol.cloud',
              customDomain: item['customDomain'],
              logoUrl: branding.logoUrl ?? item['logoUrl'],
              iconUrl: branding.iconUrl ?? item['iconUrl'],
              lastAccessed: DateTime.now(),
              isActive: item['isActive'] ?? true,
            );
          }
        }
      }

      // If search yields no match
      throw Exception('Workspace could not be found.');
    } on DioException catch (dioErr) {
      if (dioErr.type == DioExceptionType.connectionTimeout ||
          dioErr.type == DioExceptionType.receiveTimeout ||
          dioErr.type == DioExceptionType.sendTimeout ||
          dioErr.type == DioExceptionType.connectionError ||
          dioErr.response == null) {
        throw Exception('Unable to connect. Please check your network connection.');
      }

      if (dioErr.response?.statusCode == 404) {
        throw Exception('Workspace could not be found.');
      }

      throw Exception('Unable to connect. Please check your network connection.');
    } catch (e) {
      final msg = e.toString().replaceFirst('Exception: ', '').trim();
      throw Exception(msg);
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
        if (resData is Map) {
          final isSuccessful = resData['isSuccess'] == true ||
              resData['success'] == true ||
              resData['IsSuccess'] == true ||
              (resData['data'] != null &&
                  (resData['errors'] == null ||
                      (resData['errors'] is List && (resData['errors'] as List).isEmpty)));

          if (isSuccessful && resData['data'] is Map) {
            return Map<String, dynamic>.from(resData['data'] as Map);
          }

          if (resData['token'] != null) {
            return Map<String, dynamic>.from(resData);
          }

          final msg = resData['message']?.toString();
          if (msg != null && msg.trim().isNotEmpty && !isSuccessful) {
            throw Exception(msg);
          }
        }
        throw Exception('Unable to sign in. Please verify your credentials.');
      }

      throw Exception('Unable to sign in. Please verify your credentials.');
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.connectionError) {
        throw Exception('Unable to connect. Please check your network connection.');
      }

      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Invalid email or password. Please verify your credentials.';
      throw Exception(msg);
    } catch (e) {
      final msg = e.toString().replaceFirst('Exception: ', '').trim();
      throw Exception(msg);
    }
  }

  /// Cleans an incoming domain, URL, or code string
  static String _cleanIdentifier(String raw) {
    var cleaned = raw.trim().toLowerCase();
    cleaned = cleaned
        .replaceAll('https://', '')
        .replaceAll('http://', '')
        .replaceAll('www.', '');

    if (cleaned.contains('/')) {
      cleaned = cleaned.split('/')[0];
    }
    if (cleaned.contains('?')) {
      cleaned = cleaned.split('?')[0];
    }
    if (cleaned.contains('@')) {
      cleaned = cleaned.split('@')[1];
    }
    return cleaned;
  }

  /// Extracts the leading tenant subdomain candidate from a hostname string
  static String _extractSubdomain(String host) {
    final clean = host.toLowerCase().trim();
    if (clean.contains('.')) {
      final parts = clean.split('.');
      if (parts.length >= 2) {
        final sub = parts[0];
        if (sub != 'localhost' &&
            sub != '127' &&
            sub != 'www' &&
            sub != 'api' &&
            sub != 'admin' &&
            sub != 'central') {
          return sub;
        }
      }
    }
    return '';
  }

  /// Probes the tenant's brand settings endpoint to resolve both uploaded company logo and square icon
  Future<TenantBranding> probeTenantBranding(String tenantKey) async {
    try {
      final res = await _dio.get(
        ApiConstants.brandSettingsEndpoint,
        options: Options(
          headers: {
            ApiConstants.headerTenantKey: tenantKey,
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          sendTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        ),
      );
      if (res.statusCode == 200 && res.data is Map) {
        final raw = res.data['data'] ?? res.data['Data'] ?? res.data;
        if (raw is Map) {
          final logo = (raw['companyLogoUrl'] ??
                  raw['companyWhiteLogoUrl'] ??
                  raw['logoUrl'] ??
                  raw['CompanyLogoUrl'] ??
                  raw['CompanyWhiteLogoUrl'] ??
                  raw['LogoUrl'])
              ?.toString()
              .trim();
          final icon = (raw['companyIconUrl'] ??
                  raw['iconUrl'] ??
                  raw['faviconUrl'] ??
                  raw['CompanyIconUrl'] ??
                  raw['IconUrl'] ??
                  raw['FaviconUrl'])
              ?.toString()
              .trim();
          final orgName = (raw['companyName'] ??
                  raw['brandName'] ??
                  raw['organizationName'] ??
                  raw['CompanyName'] ??
                  raw['BrandName'] ??
                  raw['OrganizationName'])
              ?.toString()
              .trim();
          final whiteLogo = (raw['companyWhiteLogoUrl'] ?? raw['CompanyWhiteLogoUrl'])?.toString().trim();
          final bgUrl = (raw['loginBackgroundImageUrl'] ?? raw['LoginBackgroundImageUrl'])?.toString().trim();
          final layout = (raw['loginLayout'] ?? raw['LoginLayout'] ?? raw['loginBackgroundImageKey'] ?? raw['LoginBackgroundImageKey'])?.toString().toLowerCase().trim();
          final loginTitle = (raw['loginTitle'] ?? raw['LoginTitle'])?.toString().trim();
          final loginSubtitle = (raw['loginSubtitle'] ?? raw['LoginSubtitle'])?.toString().trim();
          final loginNoteTitle = (raw['loginNoteTitle'] ?? raw['LoginNoteTitle'])?.toString().trim();
          final loginNote = (raw['loginNote'] ?? raw['LoginNote'])?.toString().trim();
          final loginNoteFooter = (raw['loginNoteFooter'] ?? raw['LoginNoteFooter'] ?? raw['loginComplianceNotice'] ?? raw['LoginComplianceNotice'])?.toString().trim();
          final loginBtnText = (raw['loginButtonText'] ?? raw['LoginButtonText'])?.toString().trim();
          final allowReg = raw['allowPublicRegistration'] != false && raw['showRegisterLinkOnLogin'] != false;
          final useWhiteLogo = raw['useWhiteLogoInLogin'] == true;

          return TenantBranding(
            logoUrl: (logo != null && logo.isNotEmpty) ? logo : null,
            iconUrl: (icon != null && icon.isNotEmpty) ? icon : null,
            organizationName: (orgName != null && orgName.isNotEmpty) ? orgName : null,
            isResolved: true,
            loginLayout: (layout == 'split' || layout == 'centered') ? layout! : 'centered',
            loginBackgroundImageUrl: (bgUrl != null && bgUrl.isNotEmpty) ? bgUrl : null,
            loginTitle: (loginTitle != null && loginTitle.isNotEmpty) ? loginTitle : null,
            loginSubtitle: (loginSubtitle != null && loginSubtitle.isNotEmpty) ? loginSubtitle : null,
            loginNoteTitle: (loginNoteTitle != null && loginNoteTitle.isNotEmpty) ? loginNoteTitle : null,
            loginNote: (loginNote != null && loginNote.isNotEmpty) ? loginNote : null,
            loginNoteFooter: (loginNoteFooter != null && loginNoteFooter.isNotEmpty) ? loginNoteFooter : null,
            loginButtonText: (loginBtnText != null && loginBtnText.isNotEmpty) ? loginBtnText : null,
            allowPublicRegistration: allowReg,
            useWhiteLogoInLogin: useWhiteLogo,
            companyWhiteLogoUrl: (whiteLogo != null && whiteLogo.isNotEmpty) ? whiteLogo : null,
            rawSettings: Map<String, dynamic>.from(raw),
          );
        }
      }
    } catch (_) {
      // Gracefully ignore failure and fall back
    }
    return const TenantBranding();
  }

  /// Probes the tenant's brand settings endpoint to resolve any uploaded company square icon (for avatars/emblems)
  Future<String?> probeTenantIcon(String tenantKey) async {
    final branding = await probeTenantBranding(tenantKey);
    return branding.iconUrl ?? branding.logoUrl;
  }

  /// Probes the tenant's brand settings endpoint to resolve any uploaded company logo
  Future<String?> probeTenantLogo(String tenantKey) async {
    final branding = await probeTenantBranding(tenantKey);
    return branding.logoUrl ?? branding.iconUrl;
  }

  /// <summary>
  /// Probes the server authentication endpoint (/api/Auth/me) using the specified Bearer token
  /// and multi-tenant routing headers to verify if an active user session exists.
  /// </summary>
  /// <param name="tenantKey">Target tenant partition key.</param>
  /// <param name="token">Bearer JWT access token.</param>
  /// <param name="domain">Optional tenant primary or custom domain.</param>
  /// <returns>Session profile payload if active and valid; null if rejected (401/403).</returns>
  Future<Map<String, dynamic>?> verifySession(String tenantKey, String token, {String? domain}) async {
    try {
      final response = await _dio.get(
        ApiConstants.sessionEndpoint,
        options: Options(
          headers: {
            ApiConstants.headerTenantKey: tenantKey,
            if (domain != null && domain.isNotEmpty) ApiConstants.headerTenantDomain: domain,
            ApiConstants.headerAuthorization: 'Bearer $token',
          },
          sendTimeout: const Duration(seconds: 6),
          receiveTimeout: const Duration(seconds: 8),
        ),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map && data['data'] is Map) {
          return Map<String, dynamic>.from(data['data'] as Map);
        } else if (data is Map) {
          return Map<String, dynamic>.from(data);
        }
      }
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        return null;
      }
      // Re-throw other network/server errors so caller can handle offline gracefully
      rethrow;
    } catch (_) {
      return null;
    }
  }
}

/// Resolved branding asset URLs and authentication screen configuration for an organization workspace
class TenantBranding {
  final String? logoUrl;
  final String? iconUrl;
  final String? organizationName;
  final bool isResolved;
  final String loginLayout;
  final String? loginBackgroundImageUrl;
  final String? loginTitle;
  final String? loginSubtitle;
  final String? loginNoteTitle;
  final String? loginNote;
  final String? loginNoteFooter;
  final String? loginButtonText;
  final bool allowPublicRegistration;
  final bool useWhiteLogoInLogin;
  final String? companyWhiteLogoUrl;
  final Map<String, dynamic> rawSettings;

  const TenantBranding({
    this.logoUrl,
    this.iconUrl,
    this.organizationName,
    this.isResolved = false,
    this.loginLayout = 'centered',
    this.loginBackgroundImageUrl,
    this.loginTitle,
    this.loginSubtitle,
    this.loginNoteTitle,
    this.loginNote,
    this.loginNoteFooter,
    this.loginButtonText,
    this.allowPublicRegistration = true,
    this.useWhiteLogoInLogin = false,
    this.companyWhiteLogoUrl,
    this.rawSettings = const {},
  });
}
