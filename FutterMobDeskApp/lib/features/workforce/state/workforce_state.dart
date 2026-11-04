import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/workforce_models.dart';
import '../services/workforce_api_service.dart';

/// State object representing the workforce state for both member and admin screens.
class WorkforceState {
  final List<Shift> myShifts;
  final List<Shift> adminShifts;
  final List<ClientSite> sites;
  final List<LiveDutyMonitorItem> liveMonitor;
  final bool isLoading;
  final bool isActionLoading;
  final String? errorMessage;
  final String? successMessage;

  const WorkforceState({
    this.myShifts = const [],
    this.adminShifts = const [],
    this.sites = const [],
    this.liveMonitor = const [],
    this.isLoading = false,
    this.isActionLoading = false,
    this.errorMessage,
    this.successMessage,
  });

  WorkforceState copyWith({
    List<Shift>? myShifts,
    List<Shift>? adminShifts,
    List<ClientSite>? sites,
    List<LiveDutyMonitorItem>? liveMonitor,
    bool? isLoading,
    bool? isActionLoading,
    String? errorMessage,
    String? successMessage,
  }) {
    return WorkforceState(
      myShifts: myShifts ?? this.myShifts,
      adminShifts: adminShifts ?? this.adminShifts,
      sites: sites ?? this.sites,
      liveMonitor: liveMonitor ?? this.liveMonitor,
      isLoading: isLoading ?? this.isLoading,
      isActionLoading: isActionLoading ?? this.isActionLoading,
      errorMessage: errorMessage,
      successMessage: successMessage,
    );
  }
}

/// State notifier managing workforce operations, shifts, attendance and GPS clock-ins.
class WorkforceNotifier extends StateNotifier<WorkforceState> {
  final WorkforceApiService _api;

  WorkforceNotifier(this._api) : super(const WorkforceState());

  /// Loads member's assigned shifts.
  Future<void> loadMyShifts() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final shifts = await _api.getMyShifts();
      state = state.copyWith(myShifts: shifts, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load shifts: $e');
    }
  }

  /// Loads all client sites for the active tenant.
  Future<void> loadSites() async {
    try {
      final sites = await _api.getSites();
      state = state.copyWith(sites: sites);
    } catch (_) {}
  }

  /// Loads admin rota shifts for a given date range.
  Future<void> loadAdminShifts({DateTime? start, DateTime? end, String? siteId}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final shifts = await _api.getShifts(start: start, end: end, siteId: siteId);
      state = state.copyWith(adminShifts: shifts, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load rota: $e');
    }
  }

  /// Loads live duty monitor for administrators.
  Future<void> loadLiveDutyMonitor() async {
    try {
      final feed = await _api.getLiveDutyMonitor();
      state = state.copyWith(liveMonitor: feed);
    } catch (_) {}
  }

  /// Confirms member shift attendance.
  Future<bool> confirmShift(String shiftId) async {
    state = state.copyWith(isActionLoading: true);
    final ok = await _api.confirmShift(shiftId);
    if (ok) {
      await loadMyShifts();
      state = state.copyWith(isActionLoading: false, successMessage: 'Shift confirmed.');
    } else {
      state = state.copyWith(isActionLoading: false, errorMessage: 'Failed to confirm shift.');
    }
    return ok;
  }

  /// Submits shift swap request.
  Future<bool> requestSwap(String shiftId, String reason) async {
    state = state.copyWith(isActionLoading: true);
    final ok = await _api.requestSwap(shiftId: shiftId, reason: reason);
    if (ok) {
      await loadMyShifts();
      state = state.copyWith(isActionLoading: false, successMessage: 'Swap request submitted.');
    } else {
      state = state.copyWith(isActionLoading: false, errorMessage: 'Failed to submit swap request.');
    }
    return ok;
  }

  /// Submits leave request.
  Future<bool> requestLeave(Map<String, dynamic> payload) async {
    state = state.copyWith(isActionLoading: true);
    final ok = await _api.requestLeave(payload);
    state = state.copyWith(
      isActionLoading: false,
      successMessage: ok ? 'Leave request submitted successfully.' : null,
      errorMessage: ok ? null : 'Failed to submit leave request.',
    );
    return ok;
  }

  /// Clocks in guard with live device GPS coordinates.
  Future<ClockInResult?> clockIn({
    required String shiftId,
    double? latitude,
    double? longitude,
    double? accuracyMeters,
  }) async {
    state = state.copyWith(isActionLoading: true, errorMessage: null);
    try {
      final result = await _api.clockIn(
        shiftId: shiftId,
        latitude: latitude,
        longitude: longitude,
        accuracyMeters: accuracyMeters,
      );
      state = state.copyWith(isActionLoading: false);
      if (result != null) {
        await loadMyShifts();
      }
      return result;
    } catch (e) {
      state = state.copyWith(isActionLoading: false, errorMessage: 'Clock-in failed: $e');
      return null;
    }
  }

  /// Clocks out guard with live device GPS coordinates.
  Future<ClockOutResult?> clockOut({
    required String shiftId,
    double? latitude,
    double? longitude,
  }) async {
    state = state.copyWith(isActionLoading: true, errorMessage: null);
    try {
      final result = await _api.clockOut(
        shiftId: shiftId,
        latitude: latitude,
        longitude: longitude,
      );
      state = state.copyWith(isActionLoading: false);
      if (result != null) {
        await loadMyShifts();
      }
      return result;
    } catch (e) {
      state = state.copyWith(isActionLoading: false, errorMessage: 'Clock-out failed: $e');
      return null;
    }
  }

  /// Confirms lone-worker welfare safety check.
  Future<bool> confirmWelfareCheck(String shiftId) async {
    state = state.copyWith(isActionLoading: true);
    final ok = await _api.confirmWelfareCheck(shiftId);
    state = state.copyWith(
      isActionLoading: false,
      successMessage: ok ? 'Welfare check logged.' : null,
      errorMessage: ok ? null : 'Failed to log welfare check.',
    );
    return ok;
  }
}

/// Global provider for workforce management state.
final workforceProvider = StateNotifierProvider<WorkforceNotifier, WorkforceState>((ref) {
  final api = ref.watch(workforceApiServiceProvider);
  return WorkforceNotifier(api);
});

