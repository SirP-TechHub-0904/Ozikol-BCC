import 'dart:convert';
import 'package:flutter/painting.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/workspace.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/windows_jump_list_service.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../core/storage/tenant_cache_service.dart';
import '../../../core/widgets/tenant_cached_image.dart';
import '../data/workspace_repository.dart';

export '../../../core/storage/secure_storage_service.dart' show storageServiceProvider;

/// <summary>
/// Status outcome of attempting to switch into an enrolled organization workspace.
/// </summary>
enum WorkspaceSwitchStatus {
  /// An active, valid authentication session was verified on the device or server.
  authenticated,

  /// No active session was found, or the previous credentials have expired.
  requiresLogin,
}

/// <summary>
/// Structured result returned by workspace switching and validation operations.
/// </summary>
class WorkspaceSwitchResult {
  /// The operational outcome status.
  final WorkspaceSwitchStatus status;

  /// The target workspace model reflecting either authenticated or pending credentials.
  final Workspace workspace;

  /// Optional contextual message describing the transition.
  final String? message;

  /// <summary>
  /// Creates a new [WorkspaceSwitchResult].
  /// </summary>
  const WorkspaceSwitchResult({
    required this.status,
    required this.workspace,
    this.message,
  });

  /// Whether an active authenticated session was confirmed.
  bool get isAuthenticated => status == WorkspaceSwitchStatus.authenticated;
}

/// State of the multi-workspace management engine
class WorkspaceState {
  final List<Workspace> enrolledWorkspaces;
  final Workspace? activeWorkspace;
  final Workspace? pendingWorkspace;
  final bool isInitializing;
  final bool isLoading;
  final String? errorMessage;
  final bool shouldBypassEntryScreen;
  final bool rememberOrganization;

  const WorkspaceState({
    this.enrolledWorkspaces = const [],
    this.activeWorkspace,
    this.pendingWorkspace,
    this.isInitializing = true,
    this.isLoading = false,
    this.errorMessage,
    this.shouldBypassEntryScreen = false,
    this.rememberOrganization = true,
  });

  bool get hasActiveSession => activeWorkspace != null && activeWorkspace!.isAuthenticated;

  WorkspaceState copyWith({
    List<Workspace>? enrolledWorkspaces,
    Workspace? activeWorkspace,
    bool clearActive = false,
    Workspace? pendingWorkspace,
    bool clearPending = false,
    bool? isInitializing,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    bool? shouldBypassEntryScreen,
    bool? rememberOrganization,
  }) {
    return WorkspaceState(
      enrolledWorkspaces: enrolledWorkspaces ?? this.enrolledWorkspaces,
      activeWorkspace: clearActive ? null : (activeWorkspace ?? this.activeWorkspace),
      pendingWorkspace: clearPending ? null : (pendingWorkspace ?? this.pendingWorkspace),
      isInitializing: isInitializing ?? this.isInitializing,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      shouldBypassEntryScreen: shouldBypassEntryScreen ?? this.shouldBypassEntryScreen,
      rememberOrganization: rememberOrganization ?? this.rememberOrganization,
    );
  }
}

/// Represents the outcome of an authentication attempt.
class LoginAuthOutcome {
  /// Whether authentication succeeded and an active session was created.
  final bool isSuccess;

  /// Whether a two-factor verification challenge is required to complete sign-in.
  final bool requiresMfa;

  /// The target user identifier for the 2FA challenge.
  final String? mfaUserId;

  /// The preferred MFA delivery provider (e.g. 'GoogleAuthenticator', 'Email', 'SMS').
  final String? mfaProvider;

  /// Whether the user is flagged with a temporary password requiring a mandatory first-time update.
  final bool mustChangePassword;

  /// Optional error message when sign-in fails.
  final String? errorMessage;

  /// Creates a [LoginAuthOutcome].
  const LoginAuthOutcome({
    this.isSuccess = false,
    this.requiresMfa = false,
    this.mfaUserId,
    this.mfaProvider,
    this.mustChangePassword = false,
    this.errorMessage,
  });

  /// Factory creating a successful outcome.
  factory LoginAuthOutcome.success({bool mustChangePassword = false}) =>
      LoginAuthOutcome(isSuccess: true, mustChangePassword: mustChangePassword);

  /// Factory creating an MFA-challenged outcome.
  factory LoginAuthOutcome.mfa({required String userId, required String provider}) =>
      LoginAuthOutcome(requiresMfa: true, mfaUserId: userId, mfaProvider: provider);

  /// Factory creating a failed outcome.
  factory LoginAuthOutcome.failure(String error) =>
      LoginAuthOutcome(isSuccess: false, errorMessage: error);
}

/// State notifier driving multi-workspace switching, authentication, and persistence
class WorkspaceNotifier extends StateNotifier<WorkspaceState> {
  final SecureStorageService _storageService;
  final WorkspaceRepository _repository;
  final TenantCacheService? _cacheService;

  WorkspaceNotifier(this._storageService, this._repository, [this._cacheService]) : super(const WorkspaceState()) {
    _setupJumpListListener();
    init();
  }

  void _setupJumpListListener() {
    WindowsJumpListService.onTenantSelectedFromJumpList = (tenantKey) {
      final match = state.enrolledWorkspaces.where(
        (w) => w.tenantKey.toLowerCase() == tenantKey.toLowerCase(),
      ).firstOrNull;

      if (match != null) {
        switchWorkspace(match.tenantKey);
      } else {
        verifyWorkspace(tenantKey);
      }
    };

    WindowsJumpListService.onNewWorkspaceAction = () {
      cancelBypass();
    };

    WindowsJumpListService.onSwitchWorkspaceAction = () {
      cancelBypass();
    };
  }

  void _syncJumpList(List<Workspace> list) {
    WindowsJumpListService.syncEnrolledWorkspaces(list);
  }

  /// Initializes enrolled workspaces, checks for remembered organization, and restores session
  Future<void> init() async {
    try {
      final workspaces = await _storageService.getWorkspaces();
      final active = await _storageService.getActiveWorkspace();
      final isRememberEnabled = _storageService.isRememberOrganizationEnabled();
      final rememberedWorkspace = _storageService.getRememberedWorkspace();
      final rememberedCode = _storageService.getRememberedOrganizationCode();

      // Determine if we should bypass EntryScreen for subsequent launches
      Workspace? bypassTarget;
      bool bypass = false;

      if (active == null || !active.isAuthenticated) {
        if (isRememberEnabled) {
          if (rememberedWorkspace != null) {
            bypassTarget = rememberedWorkspace;
            bypass = true;
          } else if (active != null) {
            bypassTarget = active;
            bypass = true;
          } else if (workspaces.isNotEmpty) {
            bypassTarget = workspaces.first;
            bypass = true;
          } else if (rememberedCode != null && rememberedCode.trim().isNotEmpty) {
            try {
              final resolved = await _repository.resolveWorkspace(rememberedCode.trim());
              await _storageService.saveRememberedWorkspace(resolved);
              bypassTarget = resolved;
              bypass = true;
            } catch (_) {
              // Gracefully stay on entry screen if resolution fails offline
            }
          }
        }
      }

      _syncJumpList(workspaces);

      state = state.copyWith(
        enrolledWorkspaces: workspaces,
        activeWorkspace: active,
        pendingWorkspace: bypassTarget,
        shouldBypassEntryScreen: bypass,
        rememberOrganization: isRememberEnabled,
        isInitializing: false,
        isLoading: false,
      );

      // Asynchronously probe and apply company branding for bypass/active and all enrolled workspaces
      if (bypassTarget != null) {
        _probeAndApplyBranding(bypassTarget, isPending: true);
      }
      if (active != null) {
        _probeAndApplyBranding(active, isPending: false);
      }
      if (workspaces.isNotEmpty) {
        probeAllEnrolledBranding();
      }
    } catch (e) {
      state = state.copyWith(
        isInitializing: false,
        isLoading: false,
        errorMessage: sanitizeError(e),
      );
    }
  }

  /// Asynchronously probes the tenant's uploaded company branding (icon + logo + name) and updates workspace state
  Future<void> _probeAndApplyBranding(Workspace ws, {required bool isPending}) async {
    try {
      final branding = await _repository.probeTenantBranding(ws.tenantKey);

      // Evict any existing cached images for both previous and fresh URLs so uploads display immediately
      if (ws.logoUrl != null) await TenantCachedImage.evictImage(ws.logoUrl, tenantKey: ws.tenantKey);
      if (ws.iconUrl != null) await TenantCachedImage.evictImage(ws.iconUrl, tenantKey: ws.tenantKey);
      if (branding.logoUrl != null) await TenantCachedImage.evictImage(branding.logoUrl, tenantKey: ws.tenantKey);
      if (branding.iconUrl != null) await TenantCachedImage.evictImage(branding.iconUrl, tenantKey: ws.tenantKey);

      PaintingBinding.instance.imageCache.clear();
      PaintingBinding.instance.imageCache.clearLiveImages();

      if (branding.isResolved) {
        final updated = ws.copyWith(
          iconUrl: branding.iconUrl,
          clearIconUrl: branding.iconUrl == null,
          logoUrl: branding.logoUrl,
          clearLogoUrl: branding.logoUrl == null,
          organizationName: branding.organizationName ?? ws.organizationName,
        );
        await _storageService.saveRememberedWorkspace(updated);
        await _storageService.saveWorkspace(updated);
        final list = await _storageService.getWorkspaces();
        if (isPending) {
          if (state.pendingWorkspace?.tenantKey == ws.tenantKey) {
            state = state.copyWith(pendingWorkspace: updated, enrolledWorkspaces: list);
          }
        } else {
          if (state.activeWorkspace?.tenantKey == ws.tenantKey) {
            state = state.copyWith(activeWorkspace: updated, enrolledWorkspaces: list);
          }
        }
      }
    } catch (_) {
      // Gracefully ignore network probe errors
    }
  }

  /// Forces a fresh reload of the active workspace's tenant branding (logo, icon, name) from /api/SettingsApi/brand
  Future<void> refreshWorkspaceBranding() async {
    final active = state.activeWorkspace;
    if (active != null) {
      await _probeAndApplyBranding(active, isPending: false);
    }
  }

  /// <summary>
  /// Applies real-time tenant branding push updates received via SignalR ("TenantBrandUpdated").
  /// Evicts obsolete image caches from both disk and in-memory bitmap stores, updates active/pending
  /// workspace models, and persists the latest identity to local secure storage.
  /// </summary>
  /// <param name="tenantKey">The target tenant key identifying the workspace partition.</param>
  /// <param name="companyName">Updated tenant business or brand name.</param>
  /// <param name="companyLogoUrl">Updated high-resolution brand logo image URL.</param>
  /// <param name="companyIconUrl">Updated compact square brand icon image URL.</param>
  /// <returns>A future that completes when disk caches are evicted and state is updated.</returns>
  Future<void> applyLiveBranding({
    required String tenantKey,
    String? companyName,
    String? companyLogoUrl,
    String? companyIconUrl,
  }) async {
    final active = state.activeWorkspace;
    final pending = state.pendingWorkspace;

    // Check if active, pending, or ANY enrolled workspace matches this tenant partition
    final matchesActive = active != null && active.tenantKey.toLowerCase() == tenantKey.toLowerCase();
    final matchesPending = pending != null && pending.tenantKey.toLowerCase() == tenantKey.toLowerCase();
    final enrolledMatch = state.enrolledWorkspaces.where(
      (w) => w.tenantKey.toLowerCase() == tenantKey.toLowerCase(),
    ).firstOrNull;

    if (!matchesActive && !matchesPending && enrolledMatch == null) return;

    final targetWs = (matchesActive ? active : (matchesPending ? pending : enrolledMatch))!;

    // Evict previous and incoming image URLs from CachedNetworkImage disk cache
    if (targetWs.logoUrl != null) await TenantCachedImage.evictImage(targetWs.logoUrl, tenantKey: targetWs.tenantKey);
    if (targetWs.iconUrl != null) await TenantCachedImage.evictImage(targetWs.iconUrl, tenantKey: targetWs.tenantKey);
    if (companyLogoUrl != null) await TenantCachedImage.evictImage(companyLogoUrl, tenantKey: targetWs.tenantKey);
    if (companyIconUrl != null) await TenantCachedImage.evictImage(companyIconUrl, tenantKey: targetWs.tenantKey);

    // Invalidate Flutter's in-memory decoded bitmap caches to guarantee immediate visual refresh
    PaintingBinding.instance.imageCache.clear();
    PaintingBinding.instance.imageCache.clearLiveImages();

    final updated = targetWs.copyWith(
      organizationName: (companyName != null && companyName.trim().isNotEmpty) ? companyName.trim() : targetWs.organizationName,
      logoUrl: companyLogoUrl,
      clearLogoUrl: companyLogoUrl == null || companyLogoUrl.isEmpty,
      iconUrl: companyIconUrl,
      clearIconUrl: companyIconUrl == null || companyIconUrl.isEmpty,
    );

    // Persist new branding to secure storage so subsequent restarts load the updated identity
    if (matchesActive || matchesPending) {
      await _storageService.saveRememberedWorkspace(updated);
    }
    await _storageService.saveWorkspace(updated);
    final list = await _storageService.getWorkspaces();

    if (matchesActive && matchesPending) {
      state = state.copyWith(activeWorkspace: updated, pendingWorkspace: updated, enrolledWorkspaces: list);
    } else if (matchesActive) {
      state = state.copyWith(activeWorkspace: updated, enrolledWorkspaces: list);
    } else if (matchesPending) {
      state = state.copyWith(pendingWorkspace: updated, enrolledWorkspaces: list);
    } else {
      state = state.copyWith(enrolledWorkspaces: list);
    }
  }

  /// <summary>
  /// Asynchronously probes the backend brand settings for all enrolled workspaces.
  /// Updates local storage, evicts any modified cached images, and updates the reactive
  /// workspace state so that previously connected cards immediately display the latest logos and names.
  /// </summary>
  /// <returns>A future that completes when all enrolled workspaces have been checked.</returns>
  Future<void> probeAllEnrolledBranding() async {
    final workspaces = List<Workspace>.from(state.enrolledWorkspaces);
    if (workspaces.isEmpty) return;

    bool anyUpdated = false;
    for (final ws in workspaces) {
      try {
        final branding = await _repository.probeTenantBranding(ws.tenantKey);
        if (branding.isResolved) {
          final isLogoChanged = branding.logoUrl != ws.logoUrl;
          final isIconChanged = branding.iconUrl != ws.iconUrl;
          final isNameChanged = branding.organizationName != null &&
              branding.organizationName!.trim().isNotEmpty &&
              branding.organizationName != ws.organizationName;

          if (isLogoChanged || isIconChanged || isNameChanged) {
            // Evict stale image caches
            if (isLogoChanged && ws.logoUrl != null) {
              await TenantCachedImage.evictImage(ws.logoUrl, tenantKey: ws.tenantKey);
            }
            if (isIconChanged && ws.iconUrl != null) {
              await TenantCachedImage.evictImage(ws.iconUrl, tenantKey: ws.tenantKey);
            }

            final updated = ws.copyWith(
              logoUrl: branding.logoUrl,
              clearLogoUrl: branding.logoUrl == null,
              iconUrl: branding.iconUrl,
              clearIconUrl: branding.iconUrl == null,
              organizationName: isNameChanged ? branding.organizationName : ws.organizationName,
            );
            await _storageService.saveWorkspace(updated);
            anyUpdated = true;
          }
        }
      } catch (_) {
        // Silently continue for offline/unreachable workspaces
      }
    }

    if (anyUpdated) {
      PaintingBinding.instance.imageCache.clear();
      PaintingBinding.instance.imageCache.clearLiveImages();
      final freshList = await _storageService.getWorkspaces();
      state = state.copyWith(enrolledWorkspaces: freshList);
    }
  }

  /// <summary>
  /// Cancels bypass mode, resets the pending workspace selection, and optionally clears
  /// the remembered organization from local device storage so the user returns to the
  /// initial WorkspaceEntryScreen.
  /// </summary>
  /// <param name="clearRemembered">Whether to wipe the remembered organization bypass preferences from local device storage.</param>
  /// <returns>A future that completes when storage has been updated.</returns>
  Future<void> cancelBypass({bool clearRemembered = true}) async {
    // 1. Immediately reset in-memory bypass and pending workspace state synchronously
    state = state.copyWith(
      shouldBypassEntryScreen: false,
      clearPending: true,
      clearError: true,
    );

    // 2. Persistently clear remembered organization in secure storage to prevent re-bypassing on restart
    if (clearRemembered) {
      await _storageService.clearRememberedOrganization();
    }
  }

  /// Sets whether the organization should be remembered
  Future<void> setRememberOrganization(bool remember) async {
    await _storageService.setRememberOrganizationEnabled(remember);
    state = state.copyWith(rememberOrganization: remember);
    if (!remember) {
      await _storageService.clearRememberedOrganization();
    }
  }

  /// Verifies a company access code or domain and prepares the pending login screen
  Future<Workspace?> verifyWorkspace(String domainOrCode, {bool remember = true}) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final workspace = await _repository.resolveWorkspace(domainOrCode);

      if (remember) {
        await _storageService.setRememberOrganizationEnabled(true);
        await _storageService.setRememberedOrganizationCode(domainOrCode);
        await _storageService.saveRememberedWorkspace(workspace);
      } else {
        await _storageService.setRememberOrganizationEnabled(false);
        await _storageService.clearRememberedOrganization();
      }

      state = state.copyWith(
        isLoading: false,
        pendingWorkspace: workspace,
        rememberOrganization: remember,
      );
      return workspace;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _sanitizeError(e),
      );
      return null;
    }
  }



  /// Authenticates into the pending or specified workspace
  Future<LoginAuthOutcome> login({
    required String email,
    required String password,
    Workspace? targetWorkspace,
  }) async {
    final workspace = targetWorkspace ?? state.pendingWorkspace;
    if (workspace == null) {
      state = state.copyWith(errorMessage: 'No workspace selected for sign in.');
      return LoginAuthOutcome.failure('No workspace selected for sign in.');
    }

    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final result = await _repository.login(
        tenantKey: workspace.tenantKey,
        email: email,
        password: password,
      );

      // Check if 2FA verification challenge is required
      final requiresMfa = result['requiresMfa'] == true || result['RequiresMfa'] == true;
      if (requiresMfa) {
        state = state.copyWith(isLoading: false);
        return LoginAuthOutcome.mfa(
          userId: (result['userId'] ?? result['UserId'] ?? '').toString(),
          provider: (result['mfaProvider'] ?? result['MfaProvider'] ?? 'Email').toString(),
        );
      }

      final mustChange = result['mustChangePassword'] == true || result['MustChangePassword'] == true;
      final token = result['token'] as String?;
      final fullName = result['fullName'] as String? ?? result['userName'] as String?;
      final userId = result['userId']?.toString();
      final roles = (result['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
      final logo = result['logoUrl'] as String? ??
          result['companyLogoUrl'] as String? ??
          workspace.logoUrl;
      final orgName = result['organizationName'] as String? ?? workspace.organizationName;

      final effectivePerms = (result['effectivePermissions'] as Map<String, dynamic>?) ?? {};
      final licensedFeatures = (result['licensedTenantFeatures'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
      final canAccessAdmin = (effectivePerms['canAccessAdminConsole'] == true) ||
          roles.any((r) => [
                'superadmin',
                'admin',
                'administrator',
                'usermanager',
                'identitymanager',
                'cmsmanager',
                'editor',
                'featureedit',
                'systemadministrator'
              ].contains(r.toLowerCase().trim()));
      final defaultMode = canAccessAdmin ? 'administration' : 'workspace';

      final updatedWorkspace = workspace.copyWith(
        organizationName: orgName,
        logoUrl: logo,
        authToken: token,
        userId: userId,
        userEmail: email,
        userFullName: fullName,
        userRoles: roles,
        effectivePermissions: effectivePerms,
        licensedFeatures: licensedFeatures,
        activeConsoleMode: defaultMode,
        lastAccessed: DateTime.now(),
      );

      // Save to secure device storage and set active
      await _storageService.saveWorkspace(updatedWorkspace);
      await _storageService.setActiveTenantKey(updatedWorkspace.tenantKey);

      if (state.rememberOrganization) {
        await _storageService.setRememberOrganizationEnabled(true);
        await _storageService.setRememberedOrganizationCode(updatedWorkspace.tenantKey);
        await _storageService.saveRememberedWorkspace(updatedWorkspace);
      }

      final updatedList = await _storageService.getWorkspaces();
      _syncJumpList(updatedList);

      state = state.copyWith(
        isLoading: false,
        activeWorkspace: updatedWorkspace,
        enrolledWorkspaces: updatedList,
        clearPending: true,
      );

      return LoginAuthOutcome.success(mustChangePassword: mustChange);
    } catch (e) {
      final sanitized = _sanitizeError(e);
      state = state.copyWith(
        isLoading: false,
        errorMessage: sanitized,
      );
      return LoginAuthOutcome.failure(sanitized);
    }
  }

  /// Sanitizes any raw system, network, or database error messages into friendly, user-facing notices.
  /// Guarantees that internal database terminology and vendor branding are never exposed.
  static String sanitizeError(dynamic e) {
    if (e == null) return 'Something went wrong. Please try again.';
    var raw = e.toString().replaceFirst('Exception: ', '').trim();
    final lower = raw.toLowerCase();

    // Check for connection / network issues
    if (lower.contains('unable to connect') ||
        lower.contains('connection timeout') ||
        lower.contains('connection error') ||
        lower.contains('connection refused') ||
        lower.contains('connection reset') ||
        lower.contains('connection closed') ||
        lower.contains('connection aborted') ||
        lower.contains('network error') ||
        lower.contains('network is unreachable') ||
        lower.contains('socketexception') ||
        lower.contains('handshakeexception') ||
        lower.contains('clientexception') ||
        lower.contains('failed host lookup') ||
        lower.contains('offline') ||
        lower.contains('timed out') ||
        lower.contains('ozikol server') ||
        lower.contains('authentication server')) {
      return 'Unable to connect. Please check your network connection.';
    }

    if (lower.contains('master catalog') ||
        lower.contains('masterdb') ||
        lower.contains('master db') ||
        lower.contains('master database') ||
        lower.contains('[tenantresolution]') ||
        lower.contains('sqlexception') ||
        lower.contains('invalidoperationexception') ||
        lower.contains('could not be found') ||
        lower.contains('not found')) {
      return 'Workspace could not be found. Please check your access code or web address.';
    }

    // Strict guarantee: Ozikol must never appear in user-facing error text
    if (lower.contains('ozikol')) {
      if (lower.contains('connect') || lower.contains('network') || lower.contains('server')) {
        return 'Unable to connect. Please check your network connection.';
      }
      return 'Workspace could not be found. Please check your access code or web address.';
    }

    // Clean any low-level Dio/HTTP error prefixes
    if (raw.startsWith('DioException [') || raw.contains('HttpException:')) {
      return 'Unable to connect. Please check your network connection.';
    }

    return raw;
  }

  /// Instance delegation for backward compatibility
  String _sanitizeError(dynamic e) => sanitizeError(e);

  /// Sets an authenticated workspace as active, updates disk storage, syncs enrolled list,
  /// and updates the in-memory state so the dashboard immediately switches to this workspace.
  Future<void> activateAuthenticatedWorkspace(Workspace workspace) async {
    await _storageService.saveWorkspace(workspace);
    await _storageService.setActiveTenantKey(workspace.tenantKey);

    if (state.rememberOrganization) {
      await _storageService.setRememberOrganizationEnabled(true);
      await _storageService.setRememberedOrganizationCode(workspace.tenantKey);
      await _storageService.saveRememberedWorkspace(workspace);
    }

    final updatedList = await _storageService.getWorkspaces();
    _syncJumpList(updatedList);

    state = state.copyWith(
      isLoading: false,
      activeWorkspace: workspace,
      enrolledWorkspaces: updatedList,
      clearPending: true,
    );
  }

  /// <summary>
  /// Validates whether an encoded JWT token has exceeded its expiration timestamp.
  /// </summary>
  /// <param name="token">Raw JWT Bearer string.</param>
  /// <returns>True if expired or malformed; false if still within valid lifespan.</returns>
  bool _isTokenExpired(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return false;
      final normalized = base64Url.normalize(parts[1]);
      final payloadString = utf8.decode(base64Url.decode(normalized));
      final payload = jsonDecode(payloadString);
      if (payload is Map && payload['exp'] != null) {
        final exp = payload['exp'];
        final expSeconds = exp is int ? exp : int.tryParse(exp.toString());
        if (expSeconds != null) {
          final expiryDate = DateTime.fromMillisecondsSinceEpoch(expSeconds * 1000);
          // Allow a 30 second safety margin for clock skew
          return DateTime.now().isAfter(expiryDate.subtract(const Duration(seconds: 30)));
        }
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// <summary>
  /// Evaluates whether an enrolled workspace has an active, valid authentication session.
  /// If valid, authenticates and switches active system context immediately.
  /// If not found or expired, establishes the workspace as pending and routes to its login flow.
  /// </summary>
  /// <param name="target">The workspace to inspect and switch into.</param>
  /// <returns>A [WorkspaceSwitchResult] containing status, updated workspace, and feedback message.</returns>
  Future<WorkspaceSwitchResult> verifyAndSwitchWorkspace(Workspace target) async {
    final hydrated = await _storageService.getWorkspaceWithToken(target.tenantKey) ?? target;
    final token = hydrated.authToken ?? await _storageService.getAuthToken(target.tenantKey);

    // 1. Check if token exists
    if (token == null || token.trim().isEmpty) {
      await _storageService.setActiveTenantKey(target.tenantKey);
      final unauthTarget = hydrated.copyWith(clearAuthToken: true);

      state = state.copyWith(
        clearActive: true,
        pendingWorkspace: unauthTarget,
        shouldBypassEntryScreen: true,
      );

      _probeAndApplyBranding(unauthTarget, isPending: true);

      return WorkspaceSwitchResult(
        status: WorkspaceSwitchStatus.requiresLogin,
        workspace: unauthTarget,
        message: 'No active session found for this workspace. Please sign in.',
      );
    }

    // 2. Check if token is expired locally
    if (_isTokenExpired(token)) {
      await _storageService.clearAuthToken(target.tenantKey);
      await _storageService.setActiveTenantKey(target.tenantKey);
      final unauthTarget = hydrated.copyWith(clearAuthToken: true);

      state = state.copyWith(
        clearActive: true,
        pendingWorkspace: unauthTarget,
        shouldBypassEntryScreen: true,
      );

      _probeAndApplyBranding(unauthTarget, isPending: true);

      return WorkspaceSwitchResult(
        status: WorkspaceSwitchStatus.requiresLogin,
        workspace: unauthTarget,
        message: 'Your previous session has expired. Please sign in.',
      );
    }

    // 3. Probe the server to verify live session and refresh claims
    Workspace authenticatedWs = hydrated.copyWith(authToken: token);
    try {
      final session = await _repository.verifySession(
        target.tenantKey,
        token,
        domain: target.customDomain ?? target.primaryDomain,
      );

      if (session != null) {
        final freshToken = session['token']?.toString() ?? token;
        final roles = (session['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? hydrated.userRoles;
        final effectivePerms = (session['effectivePermissions'] as Map<String, dynamic>?) ?? hydrated.effectivePermissions;
        final licensedFeatures = (session['licensedTenantFeatures'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? hydrated.licensedFeatures;

        final canAccessAdmin = (effectivePerms['canAccessAdminConsole'] == true) ||
            roles.any((r) => [
                  'superadmin',
                  'admin',
                  'administrator',
                  'usermanager',
                  'identitymanager',
                  'cmsmanager',
                  'editor',
                  'featureedit',
                  'systemadministrator'
                ].contains(r.toLowerCase().trim()));
        final defaultMode = canAccessAdmin ? 'administration' : 'workspace';

        authenticatedWs = hydrated.copyWith(
          authToken: freshToken,
          userId: session['userId']?.toString() ?? hydrated.userId,
          userEmail: session['email']?.toString() ?? hydrated.userEmail,
          userFullName: session['fullName']?.toString() ?? hydrated.userFullName,
          userRoles: roles,
          effectivePermissions: effectivePerms,
          licensedFeatures: licensedFeatures,
          activeConsoleMode: defaultMode,
          lastAccessed: DateTime.now(),
        );
      } else {
        // Explicit 401 or rejection by server
        await _storageService.clearAuthToken(target.tenantKey);
        await _storageService.setActiveTenantKey(target.tenantKey);
        final unauthTarget = hydrated.copyWith(clearAuthToken: true);

        state = state.copyWith(
          clearActive: true,
          pendingWorkspace: unauthTarget,
          shouldBypassEntryScreen: true,
        );

        _probeAndApplyBranding(unauthTarget, isPending: true);

        return WorkspaceSwitchResult(
          status: WorkspaceSwitchStatus.requiresLogin,
          workspace: unauthTarget,
          message: 'Active session not found or revoked. Please sign in.',
        );
      }
    } catch (_) {
      // Network unreachable / offline fallback - local unexpired token is respected
      authenticatedWs = hydrated.copyWith(authToken: token, lastAccessed: DateTime.now());
    }

    // 4. Activate the verified session
    await _storageService.saveWorkspace(authenticatedWs);
    await _storageService.setActiveTenantKey(authenticatedWs.tenantKey);

    if (state.rememberOrganization) {
      await _storageService.setRememberOrganizationEnabled(true);
      await _storageService.setRememberedOrganizationCode(authenticatedWs.tenantKey);
      await _storageService.saveRememberedWorkspace(authenticatedWs);
    }

    final updatedList = await _storageService.getWorkspaces();
    _syncJumpList(updatedList);

    state = state.copyWith(
      isLoading: false,
      activeWorkspace: authenticatedWs,
      enrolledWorkspaces: updatedList,
      clearPending: true,
      shouldBypassEntryScreen: false,
    );

    _probeAndApplyBranding(authenticatedWs, isPending: false);

    return WorkspaceSwitchResult(
      status: WorkspaceSwitchStatus.authenticated,
      workspace: authenticatedWs,
      message: 'Active session verified. Welcome back!',
    );
  }

  /// <summary>
  /// Switches active workspace context to another enrolled organization after verifying active session status.
  /// </summary>
  /// <param name="tenantKey">The target tenant partition key.</param>
  Future<WorkspaceSwitchResult?> switchWorkspace(String tenantKey) async {
    final list = await _storageService.getWorkspaces();
    final match = list
        .where((w) => w.tenantKey.toLowerCase() == tenantKey.toLowerCase())
        .firstOrNull;

    if (match != null) {
      return await verifyAndSwitchWorkspace(match);
    }
    return null;
  }

  /// Signs out of the active user session in the specified workspace without removing the workspace enrollment.
  /// Clears the auth token while preserving organization details, setting it as pendingWorkspace
  /// so the user lands cleanly on that workspace's WorkspaceLoginScreen.
  Future<void> signOutSession(String tenantKey) async {
    await _storageService.clearAuthToken(tenantKey);
    await _cacheService?.clearTenant(tenantKey);
    final workspaces = await _storageService.getWorkspaces();
    final match = workspaces.where((w) => w.tenantKey.toLowerCase() == tenantKey.toLowerCase()).firstOrNull;
    final targetWorkspace = (match ?? state.activeWorkspace)?.copyWith(clearAuthToken: true);

    state = state.copyWith(
      enrolledWorkspaces: workspaces,
      clearActive: true,
      pendingWorkspace: targetWorkspace,
      shouldBypassEntryScreen: true,
    );
  }

  /// <summary>
  /// Signs out of the current active workspace session if one is currently active.
  /// </summary>
  /// <returns>A future that completes when the session has been terminated.</returns>
  Future<void> signOut() async {
    final activeKey = state.activeWorkspace?.tenantKey;
    if (activeKey != null && activeKey.isNotEmpty) {
      await signOutSession(activeKey);
    }
  }

  /// Signs out of the specified workspace, purges its partitioned cache, and removes session
  Future<void> logoutWorkspace(String tenantKey) async {
    await _storageService.removeWorkspace(tenantKey);
    await _cacheService?.clearTenant(tenantKey);
    final list = await _storageService.getWorkspaces();
    final active = await _storageService.getActiveWorkspace();
    _syncJumpList(list);

    state = state.copyWith(
      enrolledWorkspaces: list,
      activeWorkspace: active,
    );
  }

  /// <summary>
  /// Removes an enrolled workspace from local storage, purges its partitioned cache,
  /// and updates the list of previously connected workspaces.
  /// </summary>
  /// <param name="tenantKey">The tenant identifier of the workspace to forget/remove.</param>
  /// <returns>A future that completes when the workspace has been removed from storage.</returns>
  Future<void> removeEnrolledWorkspace(String tenantKey) async {
    await _storageService.removeWorkspace(tenantKey);
    await _cacheService?.clearTenant(tenantKey);

    // Also clear remembered organization if this was the remembered workspace
    final rememberedCode = _storageService.getRememberedOrganizationCode();
    if (rememberedCode != null && rememberedCode.toLowerCase() == tenantKey.toLowerCase()) {
      await _storageService.clearRememberedOrganization();
    }

    final list = await _storageService.getWorkspaces();
    final active = await _storageService.getActiveWorkspace();
    _syncJumpList(list);

    state = state.copyWith(
      enrolledWorkspaces: list,
      activeWorkspace: active,
    );
  }

  /// Switches active console mode between 'administration' and 'workspace'
  Future<void> switchConsoleMode(String mode) async {
    final active = state.activeWorkspace;
    if (active == null) return;
    final updated = active.copyWith(activeConsoleMode: mode);
    await _storageService.saveWorkspace(updated);
    final updatedList = await _storageService.getWorkspaces();
    state = state.copyWith(
      activeWorkspace: updated,
      enrolledWorkspaces: updatedList,
    );
  }

  /// Clears current error message
  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

// ---------------------------------------------------------------------------
// Global Riverpod Providers
// ---------------------------------------------------------------------------


final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return ApiClient(storage);
});

final workspaceRepositoryProvider = Provider<WorkspaceRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  return WorkspaceRepository(client);
});

final workspaceStateProvider = StateNotifierProvider<WorkspaceNotifier, WorkspaceState>((ref) {
  final storage = ref.watch(storageServiceProvider);
  final repo = ref.watch(workspaceRepositoryProvider);
  final cache = ref.watch(tenantCacheServiceProvider);
  return WorkspaceNotifier(storage, repo, cache);
});
