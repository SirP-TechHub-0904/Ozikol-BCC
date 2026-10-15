import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/workspace.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../data/workspace_repository.dart';

/// State of the multi-workspace management engine
class WorkspaceState {
  final List<Workspace> enrolledWorkspaces;
  final Workspace? activeWorkspace;
  final Workspace? pendingWorkspace;
  final bool isLoading;
  final String? errorMessage;

  const WorkspaceState({
    this.enrolledWorkspaces = const [],
    this.activeWorkspace,
    this.pendingWorkspace,
    this.isLoading = false,
    this.errorMessage,
  });

  bool get hasActiveSession => activeWorkspace != null && activeWorkspace!.isAuthenticated;

  WorkspaceState copyWith({
    List<Workspace>? enrolledWorkspaces,
    Workspace? activeWorkspace,
    Workspace? pendingWorkspace,
    bool clearPending = false,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
  }) {
    return WorkspaceState(
      enrolledWorkspaces: enrolledWorkspaces ?? this.enrolledWorkspaces,
      activeWorkspace: activeWorkspace ?? this.activeWorkspace,
      pendingWorkspace: clearPending ? null : (pendingWorkspace ?? this.pendingWorkspace),
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// State notifier driving multi-workspace switching, authentication, and persistence
class WorkspaceNotifier extends StateNotifier<WorkspaceState> {
  final SecureStorageService _storageService;
  final WorkspaceRepository _repository;

  WorkspaceNotifier(this._storageService, this._repository) : super(const WorkspaceState()) {
    init();
  }

  /// Initializes enrolled workspaces and restores the last active workspace session
  Future<void> init() async {
    state = state.copyWith(isLoading: true);
    try {
      final workspaces = await _storageService.getWorkspaces();
      final active = await _storageService.getActiveWorkspace();

      state = state.copyWith(
        enrolledWorkspaces: workspaces,
        activeWorkspace: active,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  /// Verifies a company access code or domain and prepares the pending login screen
  Future<Workspace?> verifyWorkspace(String domainOrCode) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final workspace = await _repository.resolveWorkspace(domainOrCode);
      state = state.copyWith(
        isLoading: false,
        pendingWorkspace: workspace,
      );
      return workspace;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString().replaceFirst('Exception: ', ''),
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

      final updatedWorkspace = workspace.copyWith(
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

      final updatedList = await _storageService.getWorkspaces();

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
        errorMessage: e.toString().replaceFirst('Exception: ', ''),
      );
      return false;
    }
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

  /// Signs out of the specified workspace and removes session
  Future<void> logoutWorkspace(String tenantKey) async {
    await _storageService.removeWorkspace(tenantKey);
    final list = await _storageService.getWorkspaces();
    final active = await _storageService.getActiveWorkspace();

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

final storageServiceProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService.inMemory();
});

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
  return WorkspaceNotifier(storage, repo);
});
