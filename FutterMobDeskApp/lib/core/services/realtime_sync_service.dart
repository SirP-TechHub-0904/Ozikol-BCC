import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:signalr_netcore/ihub_protocol.dart';
import 'package:signalr_netcore/signalr_client.dart';

import '../constants/api_constants.dart';
import '../services/app_logger.dart';
import '../../features/dashboard/data/dashboard_repository.dart';
import '../../features/notifications/data/notification_service.dart';
import '../../features/notifications/domain/notification_model.dart';
import '../../features/workspace_auth/state/workspace_state.dart';

/// <summary>
/// Status hierarchy representing real-time WebSocket / SignalR connection states.
/// </summary>
enum RealtimeConnectionStatus {
  /// Hub connection is completely closed or inactive.
  disconnected,

  /// Initial handshaking or transport negotiation is underway.
  connecting,

  /// Live duplex WebSocket stream is established and healthy.
  connected,

  /// Transient network outage encountered; automated exponential backoff is reconnecting.
  reconnecting,
}

/// <summary>
/// Central duplex real-time push synchronization service for Ozikol Business Command Center.
/// Connects to the backend NotificationHub (/hubs/notifications) over standard HTTP/HTTPS ports,
/// listens for live brand updates, instant notification ingestion, and metrics changes,
/// and evicts stale image and memory caches immediately without manual user refresh.
/// </summary>
class RealtimeSyncService {
  final Ref _ref;
  HubConnection? _hubConnection;
  RealtimeConnectionStatus _status = RealtimeConnectionStatus.disconnected;
  String? _activeTenantKey;
  final ValueNotifier<RealtimeConnectionStatus> _statusNotifier =
      ValueNotifier<RealtimeConnectionStatus>(RealtimeConnectionStatus.disconnected);

  /// <summary>
  /// Initializes a new instance of <see cref="RealtimeSyncService"/>.
  /// </summary>
  /// <param name="ref">Riverpod container ref for dispatching live state mutations.</param>
  RealtimeSyncService(this._ref);

  /// <summary>
  /// Gets the current connection status.
  /// </summary>
  RealtimeConnectionStatus get status => _status;

  /// <summary>
  /// Notifier exposing the reactive connection status to widgets and top-bar indicators.
  /// </summary>
  ValueListenable<RealtimeConnectionStatus> get statusListenable => _statusNotifier;

  /// <summary>
  /// Gets the active tenant key the hub connection is currently scoped to.
  /// </summary>
  String? get activeTenantKey => _activeTenantKey;

  /// <summary>
  /// Connects or reconnects to the SignalR hub for the specified or active tenant workspace.
  /// Gracefully teardowns previous connections if switching tenants.
  /// </summary>
  /// <param name="explicitTenantKey">Optional override for the target tenant key.</param>
  /// <returns>A future that completes once the connection attempt finishes.</returns>
  Future<void> connect({String? explicitTenantKey}) async {
    final activeWs = _ref.read(workspaceStateProvider).activeWorkspace;
    final targetTenant = explicitTenantKey ?? activeWs?.tenantKey;

    if (targetTenant == null || targetTenant.trim().isEmpty) {
      AppLogger.debug('RealtimeSync', 'Skipping connect: No active tenant key configured');
      return;
    }

    final normalizedTenant = targetTenant.trim().toLowerCase();

    // If already connected or connecting to this identical tenant room, retain connection
    if (_hubConnection != null &&
        _activeTenantKey == normalizedTenant &&
        (_status == RealtimeConnectionStatus.connected ||
            _status == RealtimeConnectionStatus.connecting)) {
      return;
    }

    // Cleanly disconnect previous connection if switching workspaces
    await disconnect();

    _activeTenantKey = normalizedTenant;
    _updateStatus(RealtimeConnectionStatus.connecting);

    try {
      final storage = _ref.read(storageServiceProvider);
      final baseUrl = storage.getCustomBaseUrl() ?? ApiConstants.defaultBaseUrl;
      final cleanBase = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
      final hubUrl =
          '$cleanBase${ApiConstants.notificationHubEndpoint}?tenantKey=${Uri.encodeComponent(normalizedTenant)}';

      final headers = MessageHeaders();
      headers.setHeaderValue(ApiConstants.headerTenantKey, normalizedTenant);
      headers.setHeaderValue(ApiConstants.headerPlatform, defaultTargetPlatform.name);

      final options = HttpConnectionOptions(
        headers: headers,
        accessTokenFactory: () async {
          final ws = _ref.read(workspaceStateProvider).activeWorkspace;
          return ws?.authToken ?? '';
        },
        requestTimeout: 15000,
      );

      final connection = HubConnectionBuilder()
          .withUrl(hubUrl, options: options)
          .withAutomaticReconnect(retryDelays: [0, 2000, 5000, 10000, 30000])
          .build();

      _registerHubEventHandlers(connection);
      _registerLifecycleHandlers(connection);

      _hubConnection = connection;
      await connection.start();

      _updateStatus(RealtimeConnectionStatus.connected);
      AppLogger.info('RealtimeSync', 'Successfully joined live push room for tenant: $normalizedTenant at $hubUrl');
    } catch (e) {
      _updateStatus(RealtimeConnectionStatus.disconnected);
      AppLogger.warning('RealtimeSync', 'Could not establish SignalR connection to hub: $e');
    }
  }

  /// <summary>
  /// Registers event listeners for push broadcasts emitted by Ozikol BCC backend.
  /// </summary>
  /// <param name="connection">The active <see cref="HubConnection"/> instance.</param>
  void _registerHubEventHandlers(HubConnection connection) {
    // 1. Tenant Brand Updates (Real-time logo, icon, organization name refresh)
    connection.on('TenantBrandUpdated', (arguments) async {
      final map = _extractMapPayload(arguments);
      if (map == null) return;

      final targetTenant = _getStringValue(map, ['tenantKey', 'TenantKey']) ?? _activeTenantKey;
      if (targetTenant == null || targetTenant.isEmpty) return;

      final orgName = _getStringValue(map, ['organizationName', 'OrganizationName', 'companyName', 'CompanyName']);
      final logoUrl = _getStringValue(map, ['companyLogoUrl', 'CompanyLogoUrl', 'logoUrl', 'LogoUrl']);
      final iconUrl = _getStringValue(map, ['companyIconUrl', 'CompanyIconUrl', 'iconUrl', 'IconUrl']);

      AppLogger.info(
        'RealtimeSync',
        'Live TenantBrandUpdated received: tenant=$targetTenant, orgName=$orgName, logo=$logoUrl, icon=$iconUrl',
      );

      await _ref.read(workspaceStateProvider.notifier).applyLiveBranding(
            tenantKey: targetTenant,
            companyName: orgName,
            companyLogoUrl: logoUrl,
            companyIconUrl: iconUrl,
          );
    });

    // 2. Tenant Aliases / Terminology Updates
    connection.on('TenantAliasesUpdated', (arguments) {
      AppLogger.info('RealtimeSync', 'Tenant terminology aliases updated: $arguments');
    });

    // 3. Tenant Appearance Updates (Theme, primary color, dark mode)
    connection.on('TenantAppearanceUpdated', (arguments) {
      AppLogger.info('RealtimeSync', 'Tenant appearance settings updated: $arguments');
    });

    // 4. In-App Notifications (6-Tier Severity Notification Center Feed)
    connection.on('ReceiveNotification', (arguments) {
      final map = _extractMapPayload(arguments);
      if (map != null) {
        try {
          final item = NotificationItem.fromJson(map);
          _ref.read(notificationProvider.notifier).ingestLiveNotification(item);
          AppLogger.info(
            'RealtimeSync',
            'Live push notification ingested: "${item.title}" [${item.severity.label}]',
          );
        } catch (err) {
          AppLogger.warning('RealtimeSync', 'Failed to deserialize incoming push notification: $err');
        }
      }
    });

    // 5. Notification Unread Counter Updates
    connection.on('NotificationCountUpdated', (arguments) {
      AppLogger.debug('RealtimeSync', 'Notification unread count synchronized');
      _ref.read(notificationProvider.notifier).loadFeed();
    });

    // 6. Console Dashboard Telemetry Metrics Updates
    connection.on('DashboardMetricsUpdated', (arguments) {
      AppLogger.info('RealtimeSync', 'Live dashboard telemetry update received from backend');
      _ref.read(dashboardMetricsProvider.notifier).refresh();
    });
  }

  /// <summary>
  /// Registers connection state callbacks for disconnects, reconnect attempts, and closures.
  /// </summary>
  /// <param name="connection">The active <see cref="HubConnection"/> instance.</param>
  void _registerLifecycleHandlers(HubConnection connection) {
    connection.onreconnecting(({error}) {
      _updateStatus(RealtimeConnectionStatus.reconnecting);
      AppLogger.warning('RealtimeSync', 'Lost SignalR connection; reconnecting in background...', error);
    });

    connection.onreconnected(({connectionId}) {
      _updateStatus(RealtimeConnectionStatus.connected);
      AppLogger.info('RealtimeSync', 'SignalR stream re-established successfully (ID: $connectionId)');
    });

    connection.onclose(({error}) {
      _updateStatus(RealtimeConnectionStatus.disconnected);
      if (error != null) {
        AppLogger.warning('RealtimeSync', 'SignalR hub connection closed with error: $error');
      } else {
        AppLogger.debug('RealtimeSync', 'SignalR hub connection closed normally');
      }
    });
  }

  /// <summary>
  /// Closes and cleans up the active HubConnection.
  /// </summary>
  /// <returns>A future that completes once the socket stops.</returns>
  Future<void> disconnect() async {
    final connection = _hubConnection;
    _hubConnection = null;
    _activeTenantKey = null;

    if (connection != null) {
      try {
        await connection.stop();
      } catch (_) {
        // Suppress shutdown exceptions
      }
    }

    _updateStatus(RealtimeConnectionStatus.disconnected);
  }

  /// <summary>
  /// Disposes resources, terminates socket streams, and disposes notifiers.
  /// </summary>
  Future<void> dispose() async {
    await disconnect();
    _statusNotifier.dispose();
  }

  /// <summary>
  /// Safely updates connection status and dispatches updates to listeners.
  /// </summary>
  void _updateStatus(RealtimeConnectionStatus newStatus) {
    _status = newStatus;
    _statusNotifier.value = newStatus;
  }

  /// <summary>
  /// Helper method extracting and sanitizing map payloads from incoming SignalR arguments.
  /// </summary>
  Map<String, dynamic>? _extractMapPayload(List<Object?>? arguments) {
    if (arguments == null || arguments.isEmpty) return null;
    final first = arguments.first;

    if (first is Map<String, dynamic>) {
      return first;
    }
    if (first is Map) {
      return first.map((k, v) => MapEntry(k.toString(), v));
    }
    if (first is String) {
      try {
        final decoded = jsonDecode(first);
        if (decoded is Map<String, dynamic>) return decoded;
        if (decoded is Map) return decoded.map((k, v) => MapEntry(k.toString(), v));
      } catch (_) {}
    }
    return null;
  }

  /// <summary>
  /// Helper method searching for a value across multiple candidate key names (case-insensitive fallback).
  /// </summary>
  String? _getStringValue(Map<String, dynamic> map, List<String> candidateKeys) {
    for (final key in candidateKeys) {
      if (map.containsKey(key) && map[key] != null) {
        final val = map[key].toString();
        if (val.trim().isNotEmpty) {
          return val;
        }
      }
    }
    return null;
  }
}

/// <summary>
/// Global Riverpod provider exposing the singleton instance of <see cref="RealtimeSyncService"/>.
/// </summary>
final realtimeSyncServiceProvider = Provider<RealtimeSyncService>((ref) {
  final service = RealtimeSyncService(ref);
  ref.onDispose(() {
    service.dispose();
  });
  return service;
});
