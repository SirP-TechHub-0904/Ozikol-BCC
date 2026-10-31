import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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

/// Represents an intercepted process violation event.
class ViolationEvent {
  final String processName;
  final String windowTitle;
  final String actionTaken;
  final DateTime timestamp;

  const ViolationEvent({
    required this.processName,
    required this.windowTitle,
    required this.actionTaken,
    required this.timestamp,
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

  // Workstation Inactivity & Idle Countdown Governance (45s idle trigger)
  int _inactivitySeconds = 0;
  int get inactivitySeconds => _inactivitySeconds;

  bool _isIdleCountdownActive = false;
  bool get isIdleCountdownActive => _isIdleCountdownActive;

  int _idleCountdownSeconds = 15;
  int get idleCountdownSeconds => _idleCountdownSeconds;

  String? _stationKey;
  String? get stationKey => _stationKey;

  bool _isLocked = false;
  bool get isLocked => _isLocked;

  String? _lockReason;
  String? get lockReason => _lockReason;

  String _approvedDirectory = '';
  String get approvedDirectory => _approvedDirectory;

  bool _blockUsbStorage = true;
  bool get blockUsbStorage => _blockUsbStorage;

  List<WorkstationAppRule> _rules = [];
  List<WorkstationAppRule> get rules => List.unmodifiable(_rules);

  final Set<String> _temporaryApprovals = {};

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
      _stationKey = 'WS-${machineName.toUpperCase()}';

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

  /// Refreshes app policies and whitelist from the server.
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
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint('⚠️ [WorkstationService] Policy refresh error: $e');
    }
  }

  /// Records user activity (mouse move, click, or keyboard) and resets idle timer.
  void recordUserActivity() {
    _inactivitySeconds = 0;
    if (_isIdleCountdownActive) {
      _isIdleCountdownActive = false;
      _idleCountdownSeconds = 15;
      notifyListeners();
    }
  }

  /// Cancels the inactivity countdown overlay and resumes active duty.
  void resumeFromIdleCountdown() {
    recordUserActivity();
  }

  /// Locks the workstation due to inactivity and broadcasts to server.
  Future<void> lockStationLocally(String reason) async {
    _isLocked = true;
    _lockReason = reason;
    _isIdleCountdownActive = false;
    _lockStateController.add(true);
    notifyListeners();

    try {
      await _api.dio.post('/api/Workstations/lock', data: {
        'stationKey': _stationKey ?? 'WS-${Platform.localHostname.toUpperCase()}',
        'lock': true,
        'reason': reason,
      });
    } catch (_) {}
  }

  /// Begins native process inspection, idle watchdog, and telemetry heartbeats.
  void startGuarding() {
    if (_isMonitoring) return;
    _isMonitoring = true;
    _inactivitySeconds = 0;
    _isIdleCountdownActive = false;
    notifyListeners();

    // Process guard inspection runs every 3.5 seconds
    _watcherTimer = Timer.periodic(const Duration(milliseconds: 3500), (_) {
      _inspectRunningProcesses();
    });

    // Telemetry heartbeat runs every 12 seconds
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      _sendTelemetryHeartbeat();
    });

    // Inactivity watchdog ticks every 1 second
    _inactivityTicker = Timer.periodic(const Duration(seconds: 1), (_) {
      _checkInactivityAndIdleLock();
    });
  }

  /// Inactivity watchdog: if user is inactive for 45s, triggers a 15s countdown to lockdown.
  void _checkInactivityAndIdleLock() {
    if (!_isMonitoring || _isBreakActive || _isLocked) {
      _inactivitySeconds = 0;
      if (_isIdleCountdownActive) {
        _isIdleCountdownActive = false;
        notifyListeners();
      }
      return;
    }

    _inactivitySeconds++;

    // When 45s of continuous inactivity is reached, trigger on-screen countdown warning
    if (!_isIdleCountdownActive && _inactivitySeconds >= 45) {
      _isIdleCountdownActive = true;
      _idleCountdownSeconds = 15;
      notifyListeners();
      return;
    }

    // Tick the active countdown until lockdown
    if (_isIdleCountdownActive) {
      _idleCountdownSeconds--;
      if (_idleCountdownSeconds <= 0) {
        lockStationLocally('Locked due to 45s workstation inactivity');
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
          final t = lines.last;
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
      final windowTitle = await _getForegroundWindowTitle();

      final res = await _api.dio.post('/api/Workstations/heartbeat', data: {
        'stationKey': _stationKey,
        'currentWindowTitle': windowTitle,
        'currentProcessName': _deriveProcessFromTitle(windowTitle),
      });

      if (res.statusCode == 200 && res.data != null) {
        final data = res.data['data'];
        if (data != null) {
          final serverLocked = data['isLocked'] as bool? ?? false;
          if (serverLocked != _isLocked) {
            _isLocked = serverLocked;
            _lockReason = data['lockReason'] as String?;
            _lockStateController.add(_isLocked);
            notifyListeners();
          }

          // Update active temporary access approvals
          final approvedList = data['approvedTemporaryProcesses'] as List<dynamic>? ?? [];
          _temporaryApprovals.clear();
          for (final item in approvedList) {
            _temporaryApprovals.add(item.toString().toLowerCase().trim());
          }
        }
      }
    } catch (_) {}
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
        'userId': userId ?? 'Staff',
        'userName': userName ?? 'Staff Member',
        'requestedProcessName': processName,
        'reason': reason,
      });
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Launches an approved application from the BCC application launcher.
  Future<bool> launchApprovedApp(String processName) async {
    if (!Platform.isWindows) return false;
    try {
      await Process.start(processName, [], runInShell: true);
      return true;
    } catch (e) {
      debugPrint('⚠️ [WorkstationService] Launch error: $e');
      return false;
    }
  }

  /// Attempts to unlock the workstation using administrative PIN or command.
  Future<bool> unlockWithPin(String pin) async {
    try {
      final res = await _api.dio.post('/api/Workstations/lock', data: {
        'stationKey': _stationKey ?? 'WS-${Platform.localHostname.toUpperCase()}',
        'isLocked': false,
        'lockReason': 'Unlocked with PIN ($pin)',
      });
      if (res.statusCode == 200) {
        _isLocked = false;
        _lockReason = null;
        _lockStateController.add(false);
        notifyListeners();
        return true;
      }
    } catch (_) {}
    return false;
  }

  @override
  void dispose() {
    stopGuarding();
    _violationStreamController.close();
    _lockStateController.close();
    super.dispose();
  }
}
