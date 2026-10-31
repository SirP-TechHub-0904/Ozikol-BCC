import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:window_manager/window_manager.dart';
import '../../../core/network/api_client.dart';
import '../../workspace_auth/state/workspace_state.dart';

/// Models an application policy rule from the central server.
class WorkstationAppRule {
  final String displayName;
  final String processName;
  final String category;
  final bool isAllowed;
  final String? iconName;

  const WorkstationAppRule({
    required this.displayName,
    required this.processName,
    required this.category,
    required this.isAllowed,
    this.iconName,
  });

  factory WorkstationAppRule.fromJson(Map<String, dynamic> json) {
    return WorkstationAppRule(
      displayName: json['displayName'] as String? ?? '',
      processName: (json['processName'] as String? ?? '').toLowerCase().trim(),
      category: json['category'] as String? ?? 'General',
      isAllowed: json['isAllowed'] as bool? ?? true,
      iconName: json['iconName'] as String?,
    );
  }
}

/// Represents an intercepted process or directory boundary violation event.
class ViolationEvent {
  final String processName;
  final String windowTitle;
  final String actionTaken;
  final DateTime timestamp;
  final String violationType;
  final String? filePath;

  const ViolationEvent({
    required this.processName,
    required this.windowTitle,
    required this.actionTaken,
    required this.timestamp,
    this.violationType = 'UNAPPROVED_APP',
    this.filePath,
  });
}

class _TrackedAppSession {
  final String processName;
  final String displayName;
  final DateTime startedAt;
  String lastWindowTitle;
  String? fileName;
  String? filePath;

  _TrackedAppSession({
    required this.processName,
    required this.displayName,
    required this.startedAt,
    required this.lastWindowTitle,
    this.fileName,
    this.filePath,
  });
}

/// Riverpod provider for the Workstation Watcher Service.
final workstationWatcherProvider = ChangeNotifierProvider<WorkstationWatcherService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final service = WorkstationWatcherService(apiClient);
  ref.onDispose(() => service.dispose());
  return service;
});

/// <summary>
/// Native Windows workstation background monitor and process interceptor.
/// 1. Queries active Windows tasks every 3-5 seconds.
/// 2. Compares against the tenant's approved application whitelist.
/// 3. Terminates unauthorized processes immediately (taskkill /F).
/// 4. Inspects active window title and open document path.
/// 5. Reports violations to the central BCC Security Audit Trail.
/// </summary>
class WorkstationWatcherService extends ChangeNotifier {
  final ApiClient _api;

  Timer? _watcherTimer;
  Timer? _heartbeatTimer;
  Timer? _inactivityTicker;
  Timer? _screenshotTimer;

  final Map<String, _TrackedAppSession> _activeAppSessions = {};
  String? _lastForegroundProcess;
  String? _lastForegroundFilePath;

  bool _isMonitoring = false;
  bool get isMonitoring => _isMonitoring;

  bool _isBreakActive = false;
  bool get isBreakActive => _isBreakActive;
  set isBreakActive(bool val) {
    if (_isBreakActive != val) {
      _isBreakActive = val;
      notifyListeners();
    }
  }

  // Workstation Inactivity & Idle Countdown Governance (3 mins = 180s idle trigger, 60s countdown)
  static const int idleWarningThresholdSeconds = 180;
  static const int idleCountdownDurationSeconds = 60;

  int _inactivitySeconds = 0;
  int get inactivitySeconds => _inactivitySeconds;

  bool _isIdleCountdownActive = false;
  bool get isIdleCountdownActive => _isIdleCountdownActive;

  int _idleCountdownSeconds = idleCountdownDurationSeconds;
  int get idleCountdownSeconds => _idleCountdownSeconds;

  String? _stationKey;
  String? get stationKey => _stationKey;

  String? _userId;
  String? _userName;
  String? _userEmail;

  bool _isLocked = false;
  bool get isLocked => _isLocked;

  bool _isLocallyLocked = false;
  bool _serverAcknowledgedLock = false;

  static const MethodChannel _kioskChannel = MethodChannel('com.ozikol.bcc/kiosk');

  /// Enables or disables native Windows Low-Level Keyboard Hook (`WH_KEYBOARD_LL`)
  /// to block Win, Alt+Tab, Alt+F4, Alt+Esc, Ctrl+Esc, Ctrl+Shift+Esc, F11, and forces the window on top.
  Future<void> setWindowsKeyLockdown(bool enabled, {bool topmost = true}) async {
    if (kIsWeb || !Platform.isWindows) return;
    try {
      await _kioskChannel.invokeMethod('setLockdownMode', {
        'enabled': enabled,
        'topmost': enabled && topmost,
      });
    } catch (_) {}
    try {
      await windowManager.ensureInitialized();
      if (enabled && topmost) {
        await windowManager.setFullScreen(true);
        await windowManager.setAlwaysOnTop(true);
        await windowManager.show();
        await windowManager.focus();
      } else {
        await windowManager.setAlwaysOnTop(false);
      }
    } catch (_) {}
  }

  /// Queries Windows OS-wide input idle time (`GetLastInputInfo`) via the native runner channel.
  Future<int?> _getWindowsSystemIdleSeconds() async {
    if (kIsWeb || !Platform.isWindows) return null;
    try {
      final secs = await _kioskChannel.invokeMethod<int>('getSystemIdleSeconds');
      return secs;
    } catch (_) {
      return null;
    }
  }

  String? _lockReason;
  String? get lockReason => _lockReason;

  String _approvedDirectory = '';
  String get approvedDirectory => _approvedDirectory;

  bool _blockUsbStorage = true;
  bool get blockUsbStorage => _blockUsbStorage;

  List<WorkstationAppRule> _rules = [];
  List<WorkstationAppRule> get rules => List.unmodifiable(_rules);

  final Set<String> _temporaryApprovals = {};
  Set<String> get temporaryApprovals => Set.unmodifiable(_temporaryApprovals);

  final Set<String> _serverApprovedRequests = {};
  final Set<String> _serverPendingRequests = {};
  final Set<String> _serverDeniedRequests = {};

  /// Returns true if the process is approved via whitelist policies, approved access requests, or temporary session grant.
  bool isProcessApproved(String procName) {
    final clean = procName.toLowerCase().trim();
    if (_temporaryApprovals.contains(clean) || _serverApprovedRequests.contains(clean)) {
      return true;
    }
    return _rules.any((r) => r.isAllowed && r.processName.toLowerCase().trim() == clean);
  }

  /// Returns true if the process currently has a Pending access request and is not yet approved.
  bool isProcessPending(String procName) {
    final clean = procName.toLowerCase().trim();
    if (isProcessApproved(clean)) return false;
    return _serverPendingRequests.contains(clean);
  }

  /// Returns true if the process was explicitly Denied and is not approved.
  bool isProcessDenied(String procName) {
    final clean = procName.toLowerCase().trim();
    if (isProcessApproved(clean) || isProcessPending(clean)) return false;
    return _serverDeniedRequests.contains(clean);
  }

  final StreamController<ViolationEvent> _violationStreamController =
      StreamController<ViolationEvent>.broadcast();
  Stream<ViolationEvent> get onViolationIntercepted =>
      _violationStreamController.stream;

  final StreamController<bool> _lockStateController =
      StreamController<bool>.broadcast();
  Stream<bool> get onLockStateChanged => _lockStateController.stream;

  // Standard core Windows and developer executables that must never be terminated
  static const Set<String> _systemExemptions = {
    'system',
    'explorer.exe',
    'svchost.exe',
    'taskhostw.exe',
    'csrss.exe',
    'winlogon.exe',
    'services.exe',
    'lsass.exe',
    'dwm.exe',
    'smss.exe',
    'runtimebroker.exe',
    'sihost.exe',
    'shellexperiencehost.exe',
    'startmenuexperiencehost.exe',
    'searchhost.exe',
    'searchui.exe',
    'textinputhost.exe',
    'ctfmon.exe',
    'conhost.exe',
    'cmd.exe',
    'powershell.exe',
    'pwsh.exe',
    'flutter.bat',
    'dart.exe',
    'code.exe', // Antigravity / VS Code development environment
    'code - oss.exe',
    'antigravity.exe',
    'ozikol_app.exe', // Our own Flutter desktop process
    'ozikol-bcc.api.exe',
    'dotnet.exe',
    'git.exe',
  };

  WorkstationWatcherService(this._api);

  /// Grants local session exemption for a process (e.g. approved by manager or demo mode)
  void grantTemporaryApproval(String processName) {
    _temporaryApprovals.add(processName.toLowerCase().trim());
    notifyListeners();
  }

  /// Initializes workstation registration with the server and starts background guarding.
  Future<void> initializeAndStart({
    String? userId,
    String? userName,
    String? userEmail,
    String? department,
    String? organizationName,
  }) async {
    if (!kIsWeb && !Platform.isWindows) {
      // Station watcher runs natively on Windows Desktop
      return;
    }

    try {
      final machineName = Platform.localHostname;
      final winOsUser = Platform.environment['USERNAME'] ?? 'WindowsUser';
      final prevUserName = _userName;
      final prevUserEmail = _userEmail;
      final isSwitchedUser = prevUserName != null &&
          prevUserName.trim().isNotEmpty &&
          userName != null &&
          userName.trim().isNotEmpty &&
          prevUserName.toLowerCase().trim() != userName.toLowerCase().trim();

      _stationKey = 'WS-${machineName.toUpperCase()}';
      _userId = userId;
      _userName = userName;
      _userEmail = userEmail;

      // 1. Handshake with server
      final response = await _api.dio.post('/api/Workstations/register', data: {
        'stationKey': _stationKey,
        'machineName': machineName,
        'userId': userId,
        'userName': userName,
        'userEmail': userEmail,
        'department': department,
        'osVersion': Platform.operatingSystemVersion,
        'clientVersion': '2.0.0',
        'kioskEnforced': false,
      });

      // Log desktop login & PC identity explicitly to activity logs
      await logWorkstationActivity(
        eventType: isSwitchedUser ? 'USER_SWITCHED' : 'USER_LOGIN',
        processName: 'Desktop Session',
        appDisplayName: 'PC: $machineName ($_stationKey)',
        windowTitle: 'Windows User: $winOsUser • ${Platform.operatingSystemVersion}',
        details: isSwitchedUser
            ? 'Account switched on PC $machineName ($_stationKey): ${userName ?? userEmail} (${userEmail ?? ""}) signed into desktop app (previous user: $prevUserName ${prevUserEmail != null ? "($prevUserEmail)" : ""}, Windows OS user: $winOsUser)'
            : 'Signed into desktop app as ${userName ?? userEmail} (${userEmail ?? ""}) on PC $machineName ($_stationKey, Windows OS user: $winOsUser)',
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'];
        if (data != null) {
          _isLocked = data['isLocked'] as bool? ?? false;
          _lockReason = data['lockReason'] as String?;
          final safeOrg = (organizationName != null && organizationName.trim().isNotEmpty)
              ? organizationName.trim().replaceAll(RegExp(r'[^a-zA-Z0-9_\-]'), '')
              : 'Workspace';
          final dynamicFallback = 'C:\\${safeOrg.isNotEmpty ? safeOrg : "Workspace"}-Workspace';
          _approvedDirectory = (data['approvedDirectory'] as String?)?.isNotEmpty == true
              ? data['approvedDirectory'] as String
              : dynamicFallback;
          _blockUsbStorage = data['blockUsbStorage'] as bool? ?? true;
        }
      }

      // 2. Fetch policies
      await refreshPolicies();

      // 3. Ensure approved corporate workspace folder exists on disk
      await _ensureApprovedFolderExists();

      // 4. Start background guard loops
      startGuarding();
    } catch (e) {
      debugPrint('⚠️ [WorkstationService] Init error: $e');
    }
  }

  /// Refreshes app policies, whitelist, and employee access request statuses from the server.
  Future<void> refreshPolicies() async {
    try {
      final res = await _api.dio.get('/api/Workstations/policies');
      if (res.statusCode == 200 && res.data != null) {
        final data = res.data['data'];
        if (data != null) {
          final appsList = data['apps'] as List<dynamic>? ?? [];
          _rules = appsList
              .map((item) => WorkstationAppRule.fromJson(item as Map<String, dynamic>))
              .toList();

          final filePol = data['filePolicy'] as Map<String, dynamic>?;
          if (filePol != null) {
            _approvedDirectory = filePol['approvedDirectoryPath'] as String? ?? _approvedDirectory;
            _blockUsbStorage = filePol['blockUsbStorage'] as bool? ?? _blockUsbStorage;
          }
        }
      }

      // Also sync access requests so any Admin approval or pending request is reflected immediately
      final reqRes = await _api.dio.get('/api/Workstations/requests');
      if (reqRes.statusCode == 200 && reqRes.data != null) {
        final reqList = reqRes.data['data'] as List<dynamic>? ?? [];
        final localHost = Platform.isWindows ? Platform.localHostname.toLowerCase().trim() : '';
        _serverApprovedRequests.clear();
        _serverPendingRequests.clear();
        _serverDeniedRequests.clear();

        for (final raw in reqList) {
          if (raw is! Map<String, dynamic>) continue;
          final machine = (raw['machineName'] as String? ?? '').toLowerCase().trim();
          if (localHost.isNotEmpty && machine.isNotEmpty && machine != localHost) {
            continue;
          }
          final proc = (raw['requestedProcessName'] as String? ?? '').toLowerCase().trim();
          final status = (raw['status'] as String? ?? '').trim();
          if (proc.isEmpty) continue;
          if (status == 'Approved') {
            _serverApprovedRequests.add(proc);
            _temporaryApprovals.add(proc);
          } else if (status == 'Pending') {
            _serverPendingRequests.add(proc);
          } else if (status == 'Denied') {
            _serverDeniedRequests.add(proc);
          }
        }
      }
      notifyListeners();
    } catch (e) {
      debugPrint('⚠️ [WorkstationService] Policy refresh error: $e');
    }
  }

  /// Records user activity (mouse move, click, or keyboard) and resets idle timer.
  /// When the 60s countdown warning overlay is already on screen, passive pointer hover/move
  /// will NOT auto-dismiss it — only an explicit click/keypress or clicking "Resume Duty" will.
  void recordUserActivity({bool isExplicitAction = false}) {
    if (_isLocked) return;
    if (_isIdleCountdownActive && !isExplicitAction) {
      return;
    }
    _inactivitySeconds = 0;
    if (_isIdleCountdownActive) {
      _isIdleCountdownActive = false;
      _idleCountdownSeconds = idleCountdownDurationSeconds;
      notifyListeners();
    }
  }

  /// Cancels the inactivity countdown overlay and resumes active duty.
  void resumeFromIdleCountdown() {
    final totalIdleSecs = idleWarningThresholdSeconds + (idleCountdownDurationSeconds - _idleCountdownSeconds);
    recordUserActivity(isExplicitAction: true);
    logWorkstationActivity(
      eventType: 'IDLE_RESUMED',
      durationSeconds: totalIdleSecs,
      details: 'Operator clicked Resume Duty during 60s inactivity warning after ${totalIdleSecs}s idle.',
    );
  }

  /// Locks the workstation due to inactivity, enforces Windows key-combination lockdown, and syncs to server.
  Future<void> lockStationLocally(String reason) async {
    _isLocked = true;
    _isLocallyLocked = true;
    _serverAcknowledgedLock = false;
    _lockReason = reason;
    _isIdleCountdownActive = false;
    _lockStateController.add(true);
    notifyListeners();

    await setWindowsKeyLockdown(true);

    try {
      final res = await _api.dio.post('/api/Workstations/lock', data: {
        'stationKey': _stationKey ?? 'WS-${Platform.localHostname.toUpperCase()}',
        'lock': true,
        'isLocked': true,
        'reason': reason,
        'lockReason': reason,
      });
      if (res.statusCode == 200) {
        _serverAcknowledgedLock = true;
      }
    } catch (_) {}
  }

  /// Begins native process inspection, idle watchdog, periodic screenshot capture, and telemetry heartbeats.
  void startGuarding() {
    if (_isMonitoring) return;
    _isMonitoring = true;
    _inactivitySeconds = 0;
    _isIdleCountdownActive = false;
    notifyListeners();

    logWorkstationActivity(
      eventType: 'SHIFT_STARTED',
      details: 'Workstation compliance guard and active work session started.',
    );

    // Process guard inspection runs every 3.5 seconds
    _watcherTimer = Timer.periodic(const Duration(milliseconds: 3500), (_) {
      _inspectRunningProcesses();
    });

    // Telemetry heartbeat runs every 4 seconds for real-time Web Console updates
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      _sendTelemetryHeartbeat();
    });

    // Inactivity watchdog ticks every 1 second
    _inactivityTicker = Timer.periodic(const Duration(seconds: 1), (_) {
      _checkInactivityAndIdleLock();
    });

    // Periodic screen capture runs every 10 minutes during active work duty
    _screenshotTimer?.cancel();
    _screenshotTimer = Timer.periodic(const Duration(minutes: 10), (_) {
      if (_isMonitoring && !_isBreakActive && !_isLocked) {
        captureAndUploadScreenshot(reason: 'Periodic active work duty screenshot (10-min interval)');
      }
    });
  }

  /// Inactivity watchdog: if user has no mouse or keyboard input for 3 minutes (180s),
  /// triggers a 1-minute (60s) countdown to workstation lockdown.
  Future<void> _checkInactivityAndIdleLock() async {
    if (!_isMonitoring || _isBreakActive || _isLocked) {
      _inactivitySeconds = 0;
      if (_isIdleCountdownActive) {
        _isIdleCountdownActive = false;
        notifyListeners();
      }
      return;
    }

    // Check OS-wide Windows hardware input idle time (GetLastInputInfo)
    // Only physical mouse movements, clicks, scroll wheel, or keyboard keystrokes reset GetLastInputInfo.
    // Passive video playback (e.g. watching YouTube) does NOT reset GetLastInputInfo.
    final osIdle = await _getWindowsSystemIdleSeconds();
    if (osIdle != null && !_isIdleCountdownActive && osIdle < 3) {
      _inactivitySeconds = 0;
      return;
    }

    _inactivitySeconds++;

    // When 180s (3 minutes) of continuous inactivity is reached, trigger 60s on-screen countdown warning
    if (!_isIdleCountdownActive && _inactivitySeconds >= idleWarningThresholdSeconds) {
      _isIdleCountdownActive = true;
      _idleCountdownSeconds = idleCountdownDurationSeconds;
      notifyListeners();
      logWorkstationActivity(
        eventType: 'IDLE_WARNING',
        durationSeconds: idleWarningThresholdSeconds,
        details: '3 minutes (180s) of no keyboard/mouse activity detected; 60-second lock countdown started.',
      );
      if (!kIsWeb && Platform.isWindows) {
        try {
          await windowManager.show();
          await windowManager.focus();
        } catch (_) {}
      }
      return;
    }

    // Tick the active 60s countdown until lockdown
    if (_isIdleCountdownActive) {
      _idleCountdownSeconds--;
      if (_idleCountdownSeconds <= 0) {
        await lockStationLocally('Locked due to 3 minutes of workstation inactivity');
      } else {
        notifyListeners();
      }
    }
  }

  /// Stops background monitoring.
  void stopGuarding() {
    _watcherTimer?.cancel();
    _watcherTimer = null;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    _inactivityTicker?.cancel();
    _inactivityTicker = null;
    _screenshotTimer?.cancel();
    _screenshotTimer = null;
    _isIdleCountdownActive = false;
    _isMonitoring = false;
    notifyListeners();
  }

  /// Inspects currently running tasks using native Windows tasklist.
  Future<void> _inspectRunningProcesses() async {
    // Process guard interception is suspended while the employee is on an authorized break
    if (!Platform.isWindows || _rules.isEmpty || _isBreakActive) return;

    try {
      // Run Windows tasklist in CSV mode: tasklist /FO CSV /NH
      final result = await Process.run('tasklist', ['/FO', 'CSV', '/NH']);
      if (result.exitCode != 0) return;

      final output = result.stdout.toString();
      final lines = output.split('\n');

      for (final line in lines) {
        if (line.trim().isEmpty) continue;
        final parts = line.split('","');
        if (parts.isEmpty) continue;

        // Process executable name e.g. "telegram.exe"
        var procName = parts[0].replaceAll('"', '').trim().toLowerCase();
        if (procName.isEmpty) continue;

        // Check if exempt (system or development tools)
        if (_systemExemptions.contains(procName)) continue;

        // Check if temporary access was approved by admin
        if (_temporaryApprovals.contains(procName)) continue;

        // Check against active tenant whitelist
        final isAllowed = _rules.any((r) => r.processName == procName && r.isAllowed);

        // If the process is blacklisted or an unapproved high-risk app (social media, torrents, personal messengers)
        final isDangerousOrDisallowed = _isKnownSideJobApp(procName) || (!isAllowed && _isKnownDisallowed(procName));

        if (isDangerousOrDisallowed) {
          // Terminate the unauthorized process immediately
          await _killProcess(procName);
          break; // Process one violation at a time
        }
      }
    } catch (_) {}
  }

  /// Checks for known high-risk side-job, game, or non-work executables.
  bool _isKnownSideJobApp(String proc) {
    const sideHustleApps = {
      'telegram.exe',
      'whatsapp.exe',
      'discord.exe',
      'steam.exe',
      'epicgameslauncher.exe',
      'utorrent.exe',
      'bittorrent.exe',
      'vlc.exe',
      'spotify.exe',
      'obs64.exe',
      'upwork.exe',
    };
    return sideHustleApps.contains(proc);
  }

  bool _isKnownDisallowed(String proc) {
    // If not in allowed rules and not system, it's restricted
    return !_rules.any((r) => r.processName == proc && r.isAllowed);
  }

  /// Gracefully terminates an unauthorized process via Windows taskkill.
  Future<void> _killProcess(String procName) async {
    try {
      final killResult = await Process.run('taskkill', ['/F', '/IM', procName]);
      if (killResult.exitCode == 0) {
        final title = await _getForegroundWindowTitle() ?? procName;
        final event = ViolationEvent(
          processName: procName,
          windowTitle: title,
          actionTaken: 'TERMINATED',
          timestamp: DateTime.now().toUtc(),
        );

        _violationStreamController.add(event);

        // Report violation to backend API
        await _api.dio.post('/api/Workstations/violations', data: {
          'machineName': Platform.localHostname,
          'userId': _userId ?? _userEmail,
          'userName': _userName,
          'processName': procName,
          'windowTitle': title,
          'actionTaken': 'TERMINATED',
          'violationType': 'UNAPPROVED_APP',
        });
      }
    } catch (_) {}
  }

  /// Reads foreground window title using a fast PowerShell command.
  Future<String?> _getForegroundWindowTitle() async {
    if (!Platform.isWindows) return null;
    try {
      final res = await Process.run('powershell', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Add-Type @"\nusing System;\nusing System.Runtime.InteropServices;\npublic class Win { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int c); }\n"@; \$h = [Win]::GetForegroundWindow(); \$b = New-Object System.Text.StringBuilder 256; [void][Win]::GetWindowText(\$h, \$b, 256); \$b.ToString()',
      ]);
      if (res.exitCode == 0) {
        final lines = res.stdout
            .toString()
            .split(RegExp(r'[\r\n]+'))
            .map((l) => l.trim())
            .where((l) => l.isNotEmpty)
            .toList();
        if (lines.isNotEmpty) {
          final t = lines.last
              .replaceAll(RegExp(r'OzikolBCCClient', caseSensitive: false), 'Workspace Portal')
              .replaceAll(RegExp(r'Ozikol-BCC', caseSensitive: false), 'Workspace')
              .trim();
          return t.isNotEmpty ? t : null;
        }
      }
    } catch (_) {}
    return null;
  }

  /// Sends periodic telemetry heartbeat with currently active window title to server.
  Future<void> _sendTelemetryHeartbeat() async {
    if (!Platform.isWindows || _stationKey == null) return;
    try {
      await _trackWindowedApplicationsAndFiles();
      final windowTitle = await _getForegroundWindowTitle();

      if (windowTitle != null && windowTitle.isNotEmpty) {
        await _checkDirectoryBoundary(windowTitle);
      }

      final activeProc = _deriveProcessFromTitle(windowTitle) ?? _lastForegroundProcess;
      final parsedFile = windowTitle != null ? _extractFileNameAndPath(windowTitle) : null;

      final res = await _api.dio.post('/api/Workstations/heartbeat', data: {
        'stationKey': _stationKey,
        'currentWindowTitle': windowTitle,
        'currentProcessName': activeProc,
        'currentDocumentPath': parsedFile?['filePath'] ?? _lastForegroundFilePath,
      });

      if (res.statusCode == 200 && res.data != null) {
        final data = res.data['data'];
        if (data != null) {
          final serverLocked = data['isLocked'] as bool? ?? false;
          if (serverLocked) {
            _serverAcknowledgedLock = true;
            if (!_isLocked) {
              _isLocked = true;
              _lockReason = data['lockReason'] as String?;
              _lockStateController.add(true);
              notifyListeners();
              await setWindowsKeyLockdown(true);
            }
          } else {
            // Only allow server heartbeat to unlock if it wasn't locally locked by inactivity,
            // OR if the server had already acknowledged the lock and an Admin explicitly unlocked it.
            if (_isLocked && (!_isLocallyLocked || _serverAcknowledgedLock)) {
              _isLocked = false;
              _isLocallyLocked = false;
              _serverAcknowledgedLock = false;
              _lockReason = null;
              _inactivitySeconds = 0;
              _lockStateController.add(false);
              notifyListeners();
              await setWindowsKeyLockdown(false);
            } else if (_isLocked && _isLocallyLocked && !_serverAcknowledgedLock) {
              // Ensure the server records our local inactivity lock
              try {
                final lockRes = await _api.dio.post('/api/Workstations/lock', data: {
                  'stationKey': _stationKey,
                  'lock': true,
                  'isLocked': true,
                  'reason': _lockReason ?? 'Locked due to workstation inactivity',
                });
                if (lockRes.statusCode == 200) {
                  _serverAcknowledgedLock = true;
                }
              } catch (_) {}
            }
          }

          // Check if an Admin requested an immediate on-demand screenshot from the Web Console
          final captureScreenshotNow = data['captureScreenshotNow'] as bool? ?? false;
          if (captureScreenshotNow) {
            captureAndUploadScreenshot(reason: 'On-demand screen capture requested by Administrator');
          }

          // Update active temporary access approvals without wiping session approvals
          final approvedList = data['approvedTemporaryProcesses'] as List<dynamic>? ?? [];
          bool addedAny = false;
          for (final item in approvedList) {
            final clean = item.toString().toLowerCase().trim();
            if (_temporaryApprovals.add(clean)) {
              addedAny = true;
            }
          }
          if (addedAny) {
            notifyListeners();
          }
        }
      }
      await refreshPolicies();
    } catch (_) {}
  }

  /// Tracks all user-visible windowed applications (MainWindowHandle != 0),
  /// logs when an application is opened, when the active document/file changes,
  /// and when an application is closed (with exact duration open in seconds).
  Future<void> _trackWindowedApplicationsAndFiles() async {
    if (!Platform.isWindows || !_isMonitoring) return;
    try {
      const psCmd =
          r"Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne '' } | Select-Object -Property ProcessName, MainWindowTitle | ForEach-Object { $p = $_.ProcessName + '.exe'; $t = ($_.MainWindowTitle -replace '[\r\n]+', ' ').Trim(); Write-Output ($p + '|||' + $t) }";
      final res = await Process.run('powershell', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        psCmd,
      ]);
      if (res.exitCode != 0) return;

      final lines = res.stdout
          .toString()
          .split(RegExp(r'[\r\n]+'))
          .map((l) => l.trim())
          .where((l) => l.contains('|||'))
          .toList();

      final currentRunning = <String, String>{};
      for (final line in lines) {
        final idx = line.indexOf('|||');
        if (idx <= 0) continue;
        final proc = line.substring(0, idx).trim().toLowerCase();
        final rawTitle = line.substring(idx + 3).trim();
        final title = rawTitle.replaceAll('OzikolBCCClient', 'Workspace Portal');
        if (proc.isEmpty ||
            proc == 'ozikol.exe' ||
            proc == 'ozikol_bcc.exe' ||
            proc.contains('ozikol') ||
            title == 'Business Command Center' ||
            proc == 'textinputhost.exe' ||
            proc == 'applicationframehost.exe') {
          continue;
        }
        currentRunning[proc] = title;
      }

      final now = DateTime.now().toUtc();

      // 1. Detect newly opened applications or document/title changes in open applications
      for (final entry in currentRunning.entries) {
        final proc = entry.key;
        final title = entry.value;
        final fileInfo = _extractFileNameAndPath(title, processName: proc);
        final fileName = fileInfo['fileName'];
        final filePath = fileInfo['filePath'];

        _lastForegroundProcess = proc;
        if (filePath != null && filePath.isNotEmpty) {
          _lastForegroundFilePath = filePath;
        }

        final existing = _activeAppSessions[proc];
        if (existing == null) {
          final friendly = _resolveDisplayNameForProcess(proc);
          _activeAppSessions[proc] = _TrackedAppSession(
            processName: proc,
            displayName: friendly,
            startedAt: now,
            lastWindowTitle: title,
            fileName: fileName,
            filePath: filePath,
          );
          await logWorkstationActivity(
            eventType: 'APP_OPENED',
            processName: proc,
            appDisplayName: friendly,
            windowTitle: title,
            fileName: fileName,
            filePath: filePath,
            startedAt: now,
            details: fileName != null && fileName.isNotEmpty
                ? 'Opened $friendly working on "$fileName"'
                : 'Opened $friendly ($title)',
          );
        } else if (existing.lastWindowTitle != title && title.isNotEmpty) {
          final prevFile = existing.fileName;
          existing.lastWindowTitle = title;
          if (fileName != null && fileName.isNotEmpty) {
            existing.fileName = fileName;
          }
          if (filePath != null && filePath.isNotEmpty) {
            existing.filePath = filePath;
          }
          if (fileName != null && fileName.isNotEmpty && fileName != prevFile) {
            await logWorkstationActivity(
              eventType: 'DOCUMENT_ACTIVE',
              processName: proc,
              appDisplayName: existing.displayName,
              windowTitle: title,
              fileName: fileName,
              filePath: filePath,
              startedAt: now,
              details: 'Working on document "$fileName" in ${existing.displayName}',
            );
          }
        }
      }

      // 2. Detect closed applications and log exact open duration
      final closedProcs = _activeAppSessions.keys
          .where((proc) => !currentRunning.containsKey(proc))
          .toList();

      for (final proc in closedProcs) {
        final session = _activeAppSessions.remove(proc);
        if (session == null) continue;
        final durationSecs = now.difference(session.startedAt).inSeconds.clamp(1, 86400 * 7);
        await logWorkstationActivity(
          eventType: 'APP_CLOSED',
          processName: session.processName,
          appDisplayName: session.displayName,
          windowTitle: session.lastWindowTitle,
          fileName: session.fileName,
          filePath: session.filePath,
          startedAt: session.startedAt,
          endedAt: now,
          durationSeconds: durationSecs,
          details: 'Closed ${session.displayName} after ${_formatDurationHuman(durationSecs)}',
        );
      }
    } catch (_) {}
  }

  /// Extracts document file name and full file path from a window title or matches inside the approved workspace folder.
  /// Never fabricates fake disk paths for web browser tabs or non-file window titles.
  Map<String, String?> _extractFileNameAndPath(String windowTitle, {String? processName}) {
    final clean = windowTitle.replaceFirst(RegExp(r'^\d+\s+'), '').trim();
    if (clean.isEmpty) return {'fileName': null, 'filePath': null};

    final lowerProc = (processName ?? '').toLowerCase();
    final isBrowser = lowerProc.contains('chrome') ||
        lowerProc.contains('msedge') ||
        lowerProc.contains('firefox') ||
        lowerProc.contains('brave') ||
        lowerProc.contains('opera') ||
        clean.toLowerCase().endsWith('- google chrome') ||
        clean.toLowerCase().endsWith('- microsoft​ edge') ||
        clean.toLowerCase().endsWith('- mozilla firefox');

    // Web browsers show page/tab titles, not local disk files (unless viewing a file:/// or C:\ path)
    if (isBrowser && !RegExp(r'[A-Za-z]:\\').hasMatch(clean)) {
      return {'fileName': null, 'filePath': null};
    }

    // Check if an explicit Windows path is in the window title (e.g. "C:\Folder\Report.xlsx - Excel")
    final pathMatch = RegExp(r'([A-Za-z]:\\[^\r\n*?"<>|]+)').firstMatch(clean);
    if (pathMatch != null) {
      var fullPath = pathMatch.group(1)!.trim();
      final dashIdx = fullPath.indexOf(' - ');
      if (dashIdx > 0) {
        fullPath = fullPath.substring(0, dashIdx).trim();
      }
      final name = fullPath.split(r'\').last.trim();
      return {'fileName': name, 'filePath': fullPath};
    }

    final fileExtRegex = RegExp(
      r'\.(docx?|xlsx?|pptx?|pdf|csv|txt|rtf|psd|ai|fig|xd|indd|json|xml|yaml|yml|cs|ts|js|dart|py|html|css|sql|md|zip|rar|png|jpe?g|svg)\b',
      caseSensitive: false,
    );

    // Extract document name before " - AppName" (e.g., "Budget_2026.xlsx - Excel" or "Proposal.docx - Word")
    String? candidateName;
    final parts = clean.split(' - ');
    if (parts.length >= 2) {
      for (final p in parts) {
        if (fileExtRegex.hasMatch(p)) {
          candidateName = p.trim();
          break;
        }
      }
      candidateName ??= parts.first.trim();
    } else if (fileExtRegex.hasMatch(clean)) {
      candidateName = clean;
    }

    if (candidateName != null && candidateName.isNotEmpty) {
      // 1. Check if this file physically exists inside the approved workspace directory
      if (_approvedDirectory.isNotEmpty) {
        try {
          final candidatePath = '$_approvedDirectory\\$candidateName';
          if (File(candidatePath).existsSync()) {
            return {'fileName': candidateName, 'filePath': candidatePath};
          }
        } catch (_) {}
      }

      // 2. Only report as a file if it has a recognized document/file extension
      if (fileExtRegex.hasMatch(candidateName)) {
        return {
          'fileName': candidateName,
          'filePath': _approvedDirectory.isNotEmpty ? '$_approvedDirectory\\$candidateName' : null,
        };
      }
    }

    return {'fileName': null, 'filePath': null};
  }

  String _resolveDisplayNameForProcess(String procName) {
    final lower = procName.toLowerCase().trim();
    for (final r in _rules) {
      if (r.processName.toLowerCase().trim() == lower && r.displayName.trim().isNotEmpty) {
        return r.displayName.trim();
      }
    }
    final base = lower.replaceAll(RegExp(r'\.exe$'), '');
    if (base.isEmpty) return procName;
    return base[0].toUpperCase() + base.substring(1);
  }

  String _formatDurationHuman(int seconds) {
    final hrs = seconds ~/ 3600;
    final mins = (seconds % 3600) ~/ 60;
    final secs = seconds % 60;
    if (hrs > 0) return '${hrs}h ${mins}m ${secs}s';
    if (mins > 0) return '${mins}m ${secs}s';
    return '${secs}s';
  }

  /// Sends a structured workstation activity log entry to the backend API.
  Future<void> logWorkstationActivity({
    required String eventType,
    String? processName,
    String? appDisplayName,
    String? windowTitle,
    String? fileName,
    String? filePath,
    DateTime? startedAt,
    DateTime? endedAt,
    int? durationSeconds,
    String? screenshotUrl,
    String? details,
  }) async {
    if (!Platform.isWindows) return;
    try {
      await _api.dio.post('/api/Workstations/activity-logs', data: {
        'stationKey': _stationKey ?? 'WS-${Platform.localHostname.toUpperCase()}',
        'machineName': Platform.localHostname,
        'userId': _userId ?? _userEmail,
        'userName': _userName,
        'userEmail': _userEmail,
        'eventType': eventType,
        'processName': processName,
        'appDisplayName': appDisplayName,
        'windowTitle': windowTitle,
        'fileName': fileName,
        'filePath': filePath,
        'startedAt': (startedAt ?? DateTime.now().toUtc()).toIso8601String(),
        'endedAt': endedAt?.toIso8601String(),
        'durationSeconds': durationSeconds,
        'screenshotUrl': screenshotUrl,
        'details': details,
      });
    } catch (_) {}
  }

  /// Captures a compressed JPEG snapshot of the primary Windows desktop screen and logs it to the server.
  Future<bool> captureAndUploadScreenshot({String reason = 'Periodic active duty screen capture'}) async {
    if (kIsWeb || !Platform.isWindows) return false;
    try {
      const psCapture = r'''
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$g.Dispose()

$targetW = [Math]::Min(1280, $bounds.Width)
$targetH = [int]($bounds.Height * ($targetW / $bounds.Width))
$resized = New-Object System.Drawing.Bitmap($targetW, $targetH)
$g2 = [System.Drawing.Graphics]::FromImage($resized)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($bmp, 0, 0, $targetW, $targetH)
$g2.Dispose()
$bmp.Dispose()

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]60)

$ms = New-Object System.IO.MemoryStream
$resized.Save($ms, $codec, $ep)
$resized.Dispose()
$b64 = [Convert]::ToBase64String($ms.ToArray())
$ms.Dispose()
Write-Output ("data:image/jpeg;base64," + $b64)
''';
      final res = await Process.run('powershell', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        psCapture,
      ]).timeout(const Duration(seconds: 12));

      if (res.exitCode != 0) return false;
      final out = res.stdout.toString().trim();
      final idx = out.indexOf('data:image/jpeg;base64,');
      if (idx < 0) return false;

      final dataUri = out.substring(idx).trim();
      final title = await _getForegroundWindowTitle();
      final fileInfo = title != null ? _extractFileNameAndPath(title) : <String, String?>{};

      await logWorkstationActivity(
        eventType: 'SCREENSHOT_CAPTURED',
        processName: _deriveProcessFromTitle(title) ?? _lastForegroundProcess,
        windowTitle: title,
        fileName: fileInfo['fileName'],
        filePath: fileInfo['filePath'] ?? _lastForegroundFilePath,
        screenshotUrl: dataUri,
        details: reason,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  DateTime? _lastDirectoryAlertTime;

  /// Checks if an active productivity/document app is working with a file outside the approved workspace.
  Future<void> _checkDirectoryBoundary(String windowTitle) async {
    if (!Platform.isWindows || _approvedDirectory.isEmpty || _isBreakActive) return;

    // Debounce directory violation alerts to avoid spamming the user
    final now = DateTime.now();
    if (_lastDirectoryAlertTime != null && now.difference(_lastDirectoryAlertTime!).inSeconds < 25) {
      return;
    }

    final lowerTitle = windowTitle.toLowerCase();

    // Check if the foreground window is an editor/office application
    final isDocumentApp = lowerTitle.contains('word') ||
        lowerTitle.contains('excel') ||
        lowerTitle.contains('powerpoint') ||
        lowerTitle.contains('notepad') ||
        lowerTitle.contains('acrobat') ||
        lowerTitle.contains('.docx') ||
        lowerTitle.contains('.xlsx') ||
        lowerTitle.contains('.pptx') ||
        lowerTitle.contains('.pdf');

    if (!isDocumentApp) return;

    // Determine if file is outside approved directory
    final approvedFolderName = _approvedDirectory.split(Platform.pathSeparator).last.toLowerCase();
    final isOutsideWorkspace = lowerTitle.contains(r'\downloads') ||
        lowerTitle.contains('downloads') ||
        lowerTitle.contains(r'\desktop') ||
        lowerTitle.contains('desktop') ||
        lowerTitle.contains(r'd:\') ||
        lowerTitle.contains(r'e:\') ||
        lowerTitle.contains(r'f:\') ||
        (!lowerTitle.contains(approvedFolderName) && (lowerTitle.contains(r':\') || lowerTitle.contains('.doc') || lowerTitle.contains('.xls')));

    if (isOutsideWorkspace) {
      _lastDirectoryAlertTime = now;
      final procName = _deriveProcessFromTitle(windowTitle) ?? 'Document App';

      final event = ViolationEvent(
        processName: procName,
        windowTitle: windowTitle,
        actionTaken: 'WARNING_LOGGED',
        timestamp: DateTime.now().toUtc(),
        violationType: 'DIRECTORY_VIOLATION',
        filePath: windowTitle,
      );

      _violationStreamController.add(event);

      // Report directory violation to central audit trail
      try {
        await _api.dio.post('/api/Workstations/violations', data: {
          'machineName': Platform.localHostname,
          'userId': _userId ?? _userEmail,
          'userName': _userName,
          'processName': procName,
          'windowTitle': windowTitle,
          'actionTaken': 'WARNING_LOGGED',
          'violationType': 'DIRECTORY_VIOLATION',
          'filePath': windowTitle,
        });
      } catch (_) {}
    }
  }

  /// Opens the corporate workspace folder in Windows File Explorer
  Future<void> openWorkspaceFolder() async {
    if (!Platform.isWindows) return;
    try {
      await _ensureApprovedFolderExists();
      await Process.start('explorer.exe', [_approvedDirectory]);
    } catch (e) {
      debugPrint('⚠️ [WorkstationService] Open folder error: $e');
    }
  }

  String? _deriveProcessFromTitle(String? title) {
    if (title == null) return null;
    final lower = title.toLowerCase();
    if (lower.contains('word')) return 'WINWORD.EXE';
    if (lower.contains('excel')) return 'EXCEL.EXE';
    if (lower.contains('powerpoint')) return 'POWERPNT.EXE';
    if (lower.contains('acrobat') || lower.contains('pdf')) return 'AcroRd32.exe';
    if (lower.contains('chrome')) return 'chrome.exe';
    if (lower.contains('edge')) return 'msedge.exe';
    if (lower.contains('calc')) return 'CalculatorApp.exe';
    return null;
  }

  /// Ensures approved local workspace folder exists on disk.
  Future<void> _ensureApprovedFolderExists() async {
    try {
      final dir = Directory(_approvedDirectory);
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
    } catch (_) {}
  }

  /// Requests temporary authorization from management to launch a restricted app.
  Future<bool> requestAccess(String processName, String reason, {String? userId, String? userName}) async {
    try {
      final res = await _api.dio.post('/api/Workstations/request-access', data: {
        'machineName': Platform.localHostname,
        'userId': userId ?? _userId ?? _userEmail ?? 'Staff',
        'userName': userName ?? _userName ?? 'Staff Member',
        'requestedProcessName': processName,
        'reason': reason,
      });
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Launches an approved application from the BCC application launcher.
  /// Resolves system tools, Registry App Paths, Start Menu .lnk shortcuts,
  /// Microsoft Store AppsFolder packages (WhatsApp, Teams, Terminal), and brings the window to front.
  Future<bool> launchApprovedApp(String processName, {String? displayName}) async {
    if (!Platform.isWindows) return false;
    final cleanProc = processName.trim();
    if (cleanProc.isEmpty) return false;

    // Ensure the watcher treats this launched process as approved
    grantTemporaryApproval(cleanProc);

    final baseName = cleanProc.replaceAll(RegExp(r'\.exe$', caseSensitive: false), '').trim();
    final friendly = (displayName ?? baseName).replaceAll("'", "''").trim();
    final safeProc = cleanProc.replaceAll("'", "''");
    final safeBase = baseName.replaceAll("'", "''");

    final psScript = '''
\$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Focus {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);
}
"@

function Focus-ProcessWindow([string]\$name) {
  \$procs = Get-Process -Name \$name -ErrorAction SilentlyContinue | Where-Object { \$_.MainWindowHandle -ne 0 }
  if (\$procs) {
    foreach (\$p in \$procs) {
      [Win32Focus]::ShowWindowAsync(\$p.MainWindowHandle, 9) | Out-Null
      [Win32Focus]::SetForegroundWindow(\$p.MainWindowHandle) | Out-Null
      [Win32Focus]::SwitchToThisWindow(\$p.MainWindowHandle, \$true)
      return \$true
    }
  }
  return \$false
}

\$procName = '$safeProc'
\$baseName = '$safeBase'
\$friendlyName = '$friendly'
\$lower = \$procName.ToLower()

# 1. If already running with a visible window on the taskbar, bring it straight to the front
if (Focus-ProcessWindow \$baseName) {
  Write-Output "FOCUSED"
  exit 0
}

# 2. Known Windows / Store app protocol & alias shortcuts
if (\$lower -eq 'windowsterminal.exe' -or \$lower -eq 'terminal.exe') {
  Start-Process 'wt.exe'
  Write-Output "LAUNCHED"
  exit 0
}
if (\$lower -eq 'calculatorapp.exe' -or \$lower -eq 'calc.exe') {
  Start-Process 'calc.exe'
  Write-Output "LAUNCHED"
  exit 0
}
if (\$lower -like 'whatsapp*') {
  \$wa = Get-StartApps | Where-Object { \$_.Name -like '*WhatsApp*' -or \$_.AppID -like '*WhatsApp*' } | Select-Object -First 1
  if (\$wa) {
    Start-Process 'explorer.exe' -ArgumentList "shell:AppsFolder\\\$(\$wa.AppID)"
    Write-Output "LAUNCHED"
    exit 0
  }
}
if (\$lower -eq 'ms-teams.exe' -or \$lower -eq 'teams.exe') {
  \$tm = Get-StartApps | Where-Object { \$_.Name -like '*Teams*' -or \$_.AppID -like '*Teams*' } | Select-Object -First 1
  if (\$tm) {
    Start-Process 'explorer.exe' -ArgumentList "shell:AppsFolder\\\$(\$tm.AppID)"
    Write-Output "LAUNCHED"
    exit 0
  }
}

# 3. Try direct Start-Process (uses Windows ShellExecute & App Paths registry for chrome.exe, excel.exe, winword.exe, etc.)
\$started = Start-Process -FilePath \$procName -PassThru -ErrorAction SilentlyContinue
if (\$started) {
  Start-Sleep -Milliseconds 350
  Focus-ProcessWindow \$baseName | Out-Null
  Write-Output "LAUNCHED"
  exit 0
}

# 4. If a background process of the same executable is running, get its full disk Path and launch it
\$runningPath = (Get-Process -Name \$baseName -ErrorAction SilentlyContinue | Where-Object { \$_.Path } | Select-Object -First 1).Path
if (\$runningPath -and (Test-Path \$runningPath)) {
  Start-Process -FilePath \$runningPath
  Start-Sleep -Milliseconds 350
  Focus-ProcessWindow \$baseName | Out-Null
  Write-Output "LAUNCHED"
  exit 0
}

# 5. Search Start Menu .lnk shortcuts matching the executable or display name
\$sh = New-Object -ComObject WScript.Shell
\$startDirs = @(
  (Join-Path \$env:ProgramData 'Microsoft\\Windows\\Start Menu\\Programs'),
  (Join-Path \$env:AppData 'Microsoft\\Windows\\Start Menu\\Programs')
)
\$lnks = Get-ChildItem -Path \$startDirs -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue
foreach (\$lnk in \$lnks) {
  \$target = \$sh.CreateShortcut(\$lnk.FullName).TargetPath
  if ((\$target -and (Split-Path \$target -Leaf).ToLower() -eq \$lower) -or (\$lnk.BaseName -eq \$friendlyName)) {
    Start-Process -FilePath \$lnk.FullName
    Start-Sleep -Milliseconds 400
    Focus-ProcessWindow \$baseName | Out-Null
    Write-Output "LAUNCHED"
    exit 0
  }
}

# 6. Search Windows Get-StartApps (shell:AppsFolder for Store / MSIX apps)
\$startApp = Get-StartApps | Where-Object {
  \$_.Name -like "*\$friendlyName*" -or \$_.Name -like "*\$baseName*" -or \$_.AppID -like "*\$baseName*"
} | Select-Object -First 1
if (\$startApp) {
  Start-Process 'explorer.exe' -ArgumentList "shell:AppsFolder\\\$(\$startApp.AppID)"
  Write-Output "LAUNCHED"
  exit 0
}

# 7. Search common install roots (%LOCALAPPDATA%\\Programs, %ProgramFiles%, %ProgramFiles(x86)%)
\$searchRoots = @(
  (Join-Path \$env:LOCALAPPDATA 'Programs'),
  \$env:ProgramFiles,
  \${env:ProgramFiles(x86)}
) | Where-Object { \$_ -and (Test-Path \$_) }

foreach (\$root in \$searchRoots) {
  \$foundExe = Get-ChildItem -Path \$root -Filter \$procName -Depth 3 -ErrorAction SilentlyContinue | Select-Object -First 1
  if (\$foundExe) {
    Start-Process -FilePath \$foundExe.FullName
    Start-Sleep -Milliseconds 400
    Focus-ProcessWindow \$baseName | Out-Null
    Write-Output "LAUNCHED"
    exit 0
  }
}

Write-Output "NOT_FOUND"
exit 1
''';

    try {
      final res = await Process.run(
        'powershell',
        ['-NoProfile', '-NonInteractive', '-Command', psScript],
      ).timeout(const Duration(seconds: 8));
      final out = res.stdout.toString().trim();
      return res.exitCode == 0 && (out.contains('LAUNCHED') || out.contains('FOCUSED'));
    } catch (e) {
      debugPrint('⚠️ [WorkstationService] Launch error: $e');
      return false;
    }
  }

  /// Unlocks the workstation after the signed-in user's account password has been verified,
  /// restores normal Windows keyboard shortcuts, and syncs the unlocked state to the server.
  Future<void> unlockStationAfterPasswordVerified() async {
    _isLocked = false;
    _isLocallyLocked = false;
    _serverAcknowledgedLock = false;
    _lockReason = null;
    _inactivitySeconds = 0;
    _isIdleCountdownActive = false;
    _lockStateController.add(false);
    notifyListeners();

    await setWindowsKeyLockdown(false);

    try {
      await _api.dio.post('/api/Workstations/lock', data: {
        'stationKey': _stationKey ?? 'WS-${Platform.localHostname.toUpperCase()}',
        'lock': false,
        'isLocked': false,
        'reason': 'Unlocked with user account password',
        'lockReason': 'Unlocked with user account password',
      });
    } catch (_) {}
  }

  /// Legacy alias kept for compatibility.
  Future<bool> unlockWithPin(String pin) async {
    await unlockStationAfterPasswordVerified();
    return true;
  }

  @override
  void dispose() {
    stopGuarding();
    _violationStreamController.close();
    _lockStateController.close();
    super.dispose();
  }
}
