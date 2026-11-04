import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/committee_models.dart';
import '../services/committees_api_service.dart';

class CommitteesState {
  final CommitteeAliases aliases;
  final bool isLoading;
  final String? error;
  final CommitteeDashboardMetrics dashboardMetrics;
  final List<Committee> managedCommittees;
  final List<Committee> myCommittees;
  final List<ReportActionItem> pendingActionItems;
  final List<Map<String, dynamic>> upcomingMeetings;
  final List<Committee> discoverCommittees;
  final List<CommitteeRegistration> registrations;
  final List<CommitteeReport> reports;
  final List<CommitteeExtraInfoForm> forms;

  const CommitteesState({
    this.aliases = const CommitteeAliases(),
    this.isLoading = false,
    this.error,
    this.dashboardMetrics = const CommitteeDashboardMetrics(),
    this.managedCommittees = const [],
    this.myCommittees = const [],
    this.pendingActionItems = const [],
    this.upcomingMeetings = const [],
    this.discoverCommittees = const [],
    this.registrations = const [],
    this.reports = const [],
    this.forms = const [],
  });

  CommitteesState copyWith({
    CommitteeAliases? aliases,
    bool? isLoading,
    String? error,
    CommitteeDashboardMetrics? dashboardMetrics,
    List<Committee>? managedCommittees,
    List<Committee>? myCommittees,
    List<ReportActionItem>? pendingActionItems,
    List<Map<String, dynamic>>? upcomingMeetings,
    List<Committee>? discoverCommittees,
    List<CommitteeRegistration>? registrations,
    List<CommitteeReport>? reports,
    List<CommitteeExtraInfoForm>? forms,
  }) {
    return CommitteesState(
      aliases: aliases ?? this.aliases,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      dashboardMetrics: dashboardMetrics ?? this.dashboardMetrics,
      managedCommittees: managedCommittees ?? this.managedCommittees,
      myCommittees: myCommittees ?? this.myCommittees,
      pendingActionItems: pendingActionItems ?? this.pendingActionItems,
      upcomingMeetings: upcomingMeetings ?? this.upcomingMeetings,
      discoverCommittees: discoverCommittees ?? this.discoverCommittees,
      registrations: registrations ?? this.registrations,
      reports: reports ?? this.reports,
      forms: forms ?? this.forms,
    );
  }
}

class CommitteesNotifier extends StateNotifier<CommitteesState> {
  final CommitteesApiService _api;

  CommitteesNotifier(this._api) : super(const CommitteesState()) {
    init();
  }

  Future<void> init() async {
    await loadSettingsAndAliases();
  }

  Future<void> loadSettingsAndAliases() async {
    try {
      final settings = await _api.getSettings();
      state = state.copyWith(aliases: settings.aliases);
    } catch (_) {}
  }

  Future<void> loadDashboard() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await _api.getDashboard();
      if (data['aliases'] != null) {
        state = state.copyWith(aliases: CommitteeAliases.fromJson(data['aliases'] as Map<String, dynamic>?));
      }
      final metrics = CommitteeDashboardMetrics.fromJson(data['metrics'] as Map<String, dynamic>? ?? data);
      state = state.copyWith(dashboardMetrics: metrics, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadManagedCommittees({String? search, String? status}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final items = await _api.getManagedCommittees(search: search, status: status);
      state = state.copyWith(managedCommittees: items, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadMyCommittees() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await _api.getMyWorkspaceCommittees();
      if (data['aliases'] != null) {
        state = state.copyWith(aliases: CommitteeAliases.fromJson(data['aliases'] as Map<String, dynamic>?));
      }

      final commsList = (data['myCommittees'] as List<dynamic>?)
              ?.map((e) => Committee.fromJson(e as Map<String, dynamic>))
              .toList() ??
          (data['items'] as List<dynamic>?)
              ?.map((e) => Committee.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [];

      final actionsList = (data['pendingActionItems'] as List<dynamic>?)
              ?.map((e) => ReportActionItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [];

      final upcoming = (data['upcomingMeetings'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [];

      state = state.copyWith(
        myCommittees: commsList,
        pendingActionItems: actionsList,
        upcomingMeetings: upcoming,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadDiscover() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final items = await _api.discoverWorkspaceCommittees();
      state = state.copyWith(discoverCommittees: items, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadRegistrations({String? committeeId, String? status}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final items = await _api.getRegistrations(committeeId: committeeId, status: status);
      state = state.copyWith(registrations: items, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadReports({String? committeeId, String? reviewStatus}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final items = await _api.getReports(committeeId: committeeId, reviewStatus: reviewStatus);
      state = state.copyWith(reports: items, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadForms() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final items = await _api.getForms();
      state = state.copyWith(forms: items, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> updateSettings(Map<String, dynamic> payload) async {
    try {
      final settings = await _api.updateSettings(payload);
      state = state.copyWith(aliases: settings.aliases);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> createCommittee(Map<String, dynamic> payload) async {
    try {
      final c = await _api.createCommittee(payload);
      state = state.copyWith(managedCommittees: [c, ...state.managedCommittees]);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> updateCommittee(String id, Map<String, dynamic> payload) async {
    try {
      final updated = await _api.updateCommittee(id, payload);
      final list = state.managedCommittees.map((c) => c.id == id ? updated : c).toList();
      state = state.copyWith(managedCommittees: list);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> deleteCommittee(String id) async {
    try {
      await _api.deleteCommittee(id);
      final list = state.managedCommittees.where((c) => c.id != id).toList();
      state = state.copyWith(managedCommittees: list);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> joinFromWorkspace(
    String committeeId, {
    Map<String, dynamic>? extraInfoResponses,
    List<String>? attachmentUrls,
  }) async {
    try {
      await _api.joinFromWorkspace(
        committeeId,
        extraInfoResponses: extraInfoResponses,
        attachmentUrls: attachmentUrls,
      );
      await loadDiscover();
      await loadMyCommittees();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> reviewRegistration(
    String regId, {
    required String decision,
    String? reassignCommitteeId,
    String? assignedRole,
    String? reviewNotes,
  }) async {
    try {
      await _api.reviewRegistration(
        regId,
        decision: decision,
        reassignCommitteeId: reassignCommitteeId,
        assignedRole: assignedRole,
        reviewNotes: reviewNotes,
      );
      await loadRegistrations();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> submitReport(Map<String, dynamic> payload) async {
    try {
      final r = await _api.submitReport(payload);
      state = state.copyWith(reports: [r, ...state.reports]);
      return true;
    } catch (_) {
      return false;
    }
  }
}

final committeesProvider = StateNotifierProvider<CommitteesNotifier, CommitteesState>((ref) {
  final api = ref.watch(committeesApiServiceProvider);
  return CommitteesNotifier(api);
});

