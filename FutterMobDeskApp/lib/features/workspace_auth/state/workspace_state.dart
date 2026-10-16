import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/workspace.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/windows_jump_list_service.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../core/storage/tenant_cache_service.dart';
import '../data/workspace_repository.dart';

export '../../../core/storage/secure_storage_service.dart' show storageServiceProvider;

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
      activeWorkspace: activeWorkspace ?? this.activeWorkspace,
      pendingWorkspace: clearPending ? null : (pendingWorkspace ?? this.pendingWorkspace),
      isInitializing: isInitializing ?? this.isInitializing,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      shouldBypassEntryScreen: shouldBypassEntryScreen ?? this.shouldBypassEntryScreen,
      rememberOrganization: rememberOrganization ?? this.rememberOrganization,
    );
  }
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
    } catch (e) {
      state = state.copyWith(
        isInitializing: false,
        isLoading: false,
        errorMessage: e.toString(),
      );
    }
  }

  /// Cancels bypass mode and returns the user to the initial WorkspaceEntryScreen
  void cancelBypass() {
    state = state.copyWith(
      shouldBypassEntryScreen: false,
      clearPending: true,
      clearError: true,
    );
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
  Future<bool> login({
    required String email,
    required String password,
    Workspace? targetWorkspace,
  }) async {
    final workspace = targetWorkspace ?? state.pendingWorkspace;
    if (workspace == null) {
      state = state.copyWith(errorMessage: 'No workspace selected for sign in.');
      return false;
    }

    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final result = await _repository.login(
        tenantKey: workspace.tenantKey,
        email: email,
        password: password,
      );

      final token = result['token'] as String?;
      final fullName = result['fullName'] as String? ?? result['userName'] as String?;
      final userId = result['userId']?.toString();
      final roles = (result['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
      final logo = result['logoUrl'] as String? ??
          result['companyLogoUrl'] as String? ??
          workspace.logoUrl;
      final orgName = result['organizationName'] as String? ?? workspace.organizationName;

      final updatedWorkspace = workspace.copyWith(
        organizationName: orgName,
        logoUrl: logo,
        authToken: token,
        userId: userId,
        userEmail: email,
        userFullName: fullName,
        userRoles: roles,
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

      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _sanitizeError(e),
      );
      return false;
    }
  }

  /// Sanitizes any raw system or database error messages into clean, custom user-facing notices
  String _sanitizeError(dynamic e) {
    final raw = e.toString().replaceFirst('Exception: ', '').trim();
    if (raw.toLowerCase().contains('master catalog') ||
        raw.toLowerCase().contains('masterdb') ||
        raw.toLowerCase().contains('master db') ||
        raw.toLowerCase().contains('master database') ||
        raw.toLowerCase().contains('[tenantresolution]') ||
        raw.toLowerCase().contains('sqlexception') ||
        raw.toLowerCase().contains('invalidoperationexception')) {
      return 'Workspace could not be found. Please check your access code or web address.';
    }
    return raw;
  }

  /// Switches active workspace context to another enrolled organization
  Future<void> switchWorkspace(String tenantKey) async {
    final match = state.enrolledWorkspaces
        .where((w) => w.tenantKey.toLowerCase() == tenantKey.toLowerCase())
        .firstOrNull;

    if (match != null) {
      await _storageService.setActiveTenantKey(match.tenantKey);
      final active = await _storageService.getActiveWorkspace();
      state = state.copyWith(activeWorkspace: active);
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
