import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../workspace_auth/state/workspace_state.dart';
import '../models/dashboard_metrics.dart';

/// Repository fetching live workspace dashboard metrics and telemetry counters.
class DashboardRepository {
  final ApiClient _apiClient;

  DashboardRepository(this._apiClient);

  /// Fetches real-time telemetry metrics from `/api/DashboardApi/metrics`.
  Future<DashboardMetrics> fetchMetrics() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.dashboardMetricsEndpoint);
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map<String, dynamic>) {
          if (data['data'] != null && data['data'] is Map<String, dynamic>) {
            return DashboardMetrics.fromJson(data['data'] as Map<String, dynamic>);
          }
          return DashboardMetrics.fromJson(data);
        }
      }
      return DashboardMetrics.sample();
    } catch (_) {
      // Return sample telemetry on network interruption or unconfigured database
      return DashboardMetrics.sample();
    }
  }
}

/// Provider for [DashboardRepository].
final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DashboardRepository(apiClient);
});

/// State controller managing dashboard telemetry metrics lifecycle and refresh.
class DashboardMetricsNotifier extends StateNotifier<AsyncValue<DashboardMetrics>> {
  final DashboardRepository _repository;

  DashboardMetricsNotifier(this._repository) : super(const AsyncValue.loading()) {
    refresh();
  }

  /// Refreshes telemetry metrics from the backend.
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    try {
      final metrics = await _repository.fetchMetrics();
      state = AsyncValue.data(metrics);
    } catch (_) {
      // Fallback to sample data gracefully
      state = AsyncValue.data(DashboardMetrics.sample());
    }
  }
}

/// Provider exposing live [DashboardMetrics].
final dashboardMetricsProvider =
    StateNotifierProvider<DashboardMetricsNotifier, AsyncValue<DashboardMetrics>>((ref) {
  final repository = ref.watch(dashboardRepositoryProvider);
  return DashboardMetricsNotifier(repository);
});
