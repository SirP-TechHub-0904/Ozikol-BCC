import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Network connectivity states
enum ConnectivityStatus {
  online,
  offline,
}

/// Service monitoring device network connectivity (WiFi, Cellular, Ethernet) in real-time.
class ConnectivityService {
  final Connectivity _connectivity;
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  final StreamController<ConnectivityStatus> _statusController = StreamController<ConnectivityStatus>.broadcast();

  ConnectivityService([Connectivity? connectivity]) : _connectivity = connectivity ?? Connectivity() {
    _init();
  }

  void _init() {
    _subscription = _connectivity.onConnectivityChanged.listen((results) {
      final isOnline = _evaluateOnline(results);
      _statusController.add(isOnline ? ConnectivityStatus.online : ConnectivityStatus.offline);
    });
  }

  /// Checks current connectivity state on-demand
  Future<bool> checkIsOnline() async {
    try {
      final results = await _connectivity.checkConnectivity();
      return _evaluateOnline(results);
    } catch (_) {
      return true; // Default optimistic on desktop/web check failure
    }
  }

  static bool _evaluateOnline(List<ConnectivityResult> results) {
    if (results.isEmpty) return false;
    return results.any((r) =>
        r == ConnectivityResult.wifi ||
        r == ConnectivityResult.mobile ||
        r == ConnectivityResult.ethernet ||
        r == ConnectivityResult.vpn);
  }

  Stream<ConnectivityStatus> get statusStream => _statusController.stream;

  void dispose() {
    _subscription?.cancel();
    _statusController.close();
  }
}

/// State notifier tracking connectivity changes for Riverpod UI reactivity.
class ConnectivityNotifier extends StateNotifier<ConnectivityStatus> {
  final ConnectivityService _service;
  StreamSubscription<ConnectivityStatus>? _sub;

  ConnectivityNotifier(this._service) : super(ConnectivityStatus.online) {
    _checkInitial();
    _sub = _service.statusStream.listen((status) {
      if (mounted) state = status;
    });
  }

  Future<void> _checkInitial() async {
    final isOnline = await _service.checkIsOnline();
    if (mounted) {
      state = isOnline ? ConnectivityStatus.online : ConnectivityStatus.offline;
    }
  }

  /// Manually checks or overrides status (useful for unit/widget tests)
  void setStatus(ConnectivityStatus status) {
    state = status;
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

/// Global provider for the Connectivity Service
final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Global provider exposing the active network status (online vs. offline)
final connectivityStatusProvider = StateNotifierProvider<ConnectivityNotifier, ConnectivityStatus>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return ConnectivityNotifier(service);
});
