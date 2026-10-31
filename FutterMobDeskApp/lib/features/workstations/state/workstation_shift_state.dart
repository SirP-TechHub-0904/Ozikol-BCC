import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:window_manager/window_manager.dart';

/// Models an audited departure / closure event from an active work shift.
class DepartureRecord {
  final DateTime timestamp;
  final String reason;
  final String notes;
  final Duration activeSpanAtClosure;

  const DepartureRecord({
    required this.timestamp,
    required this.reason,
    this.notes = '',
    required this.activeSpanAtClosure,
  });

  Map<String, dynamic> toMap() {
    return {
      'timestamp': timestamp.toIso8601String(),
      'reason': reason,
      'notes': notes,
      'activeSpanAtClosureMinutes': activeSpanAtClosure.inMinutes,
    };
  }
}

/// State representation for Enterprise Workstation Shift & Enforced Work Mode.
class WorkstationShiftState {
  final bool isAtWork;
  final bool hasStartedToday;
  final bool isOnBreak;
  final String currentBreakType;
  final String lastBreakTimeRange;
  final DateTime? shiftStartTime;
  final DateTime? shiftEndTime;
  final DateTime? breakStartTime;
  final int breakMinutesTaken;
  final int midShiftClosureMinutes;
  final String lastInactiveRange;
  final DateTime? lastClosureTime;
  final List<DepartureRecord> departureRecords;
  final List<Map<String, dynamic>> shiftHistory;

  const WorkstationShiftState({
    required this.isAtWork,
    required this.hasStartedToday,
    required this.isOnBreak,
    this.currentBreakType = 'Break',
    this.lastBreakTimeRange = '',
    this.shiftStartTime,
    this.shiftEndTime,
    this.breakStartTime,
    this.breakMinutesTaken = 0,
    this.midShiftClosureMinutes = 0,
    this.lastInactiveRange = '',
    this.lastClosureTime,
    this.departureRecords = const [],
    this.shiftHistory = const [],
  });

  WorkstationShiftState copyWith({
    bool? isAtWork,
    bool? hasStartedToday,
    bool? isOnBreak,
    String? currentBreakType,
    String? lastBreakTimeRange,
    DateTime? shiftStartTime,
    DateTime? shiftEndTime,
    bool clearShiftEndTime = false,
    DateTime? breakStartTime,
    bool clearBreakStartTime = false,
    int? breakMinutesTaken,
    int? midShiftClosureMinutes,
    String? lastInactiveRange,
    DateTime? lastClosureTime,
    List<DepartureRecord>? departureRecords,
    List<Map<String, dynamic>>? shiftHistory,
  }) {
    return WorkstationShiftState(
      isAtWork: isAtWork ?? this.isAtWork,
      hasStartedToday: hasStartedToday ?? this.hasStartedToday,
      isOnBreak: isOnBreak ?? this.isOnBreak,
      currentBreakType: currentBreakType ?? this.currentBreakType,
      lastBreakTimeRange: lastBreakTimeRange ?? this.lastBreakTimeRange,
      shiftStartTime: shiftStartTime ?? this.shiftStartTime,
      shiftEndTime: clearShiftEndTime ? null : (shiftEndTime ?? this.shiftEndTime),
      breakStartTime: clearBreakStartTime ? null : (breakStartTime ?? this.breakStartTime),
      breakMinutesTaken: breakMinutesTaken ?? this.breakMinutesTaken,
      midShiftClosureMinutes: midShiftClosureMinutes ?? this.midShiftClosureMinutes,
      lastInactiveRange: lastInactiveRange ?? this.lastInactiveRange,
      lastClosureTime: lastClosureTime ?? this.lastClosureTime,
      departureRecords: departureRecords ?? this.departureRecords,
      shiftHistory: shiftHistory ?? this.shiftHistory,
    );
  }

  Duration get grossDuration {
    if (!hasStartedToday || shiftStartTime == null) {
      return Duration.zero;
    }
    if (!isAtWork && shiftEndTime != null) {
      final diff = shiftEndTime!.difference(shiftStartTime!);
      return diff.isNegative ? Duration.zero : diff;
    }
    final diff = DateTime.now().difference(shiftStartTime!);
    return diff.isNegative ? Duration.zero : diff;
  }

  Duration get currentBreakDuration {
    if (isOnBreak && breakStartTime != null) {
      final diff = DateTime.now().difference(breakStartTime!);
      return diff.isNegative ? Duration.zero : diff;
    }
    return Duration.zero;
  }

  Duration get netEffectiveDuration {
    if (!hasStartedToday || shiftStartTime == null) {
      return Duration.zero;
    }
    final gross = grossDuration;
    final deductions = Duration(minutes: breakMinutesTaken + midShiftClosureMinutes) + currentBreakDuration;
    if (gross > deductions) {
      return gross - deductions;
    }
    return Duration.zero;
  }
}

/// Central Riverpod Notifier orchestrating fullscreen lock, workspace dock blur,
/// chrome auto-launch, and dynamic shift history persistence.
class WorkstationShiftNotifier extends StateNotifier<WorkstationShiftState> {
  WorkstationShiftNotifier()
      : super(
          const WorkstationShiftState(
            isAtWork: false,
            hasStartedToday: false,
            isOnBreak: false,
          ),
        ) {
    _loadPersistedHistory();
  }

  File get _historyFile {
    final baseDir = (!kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux))
        ? Directory.systemTemp.path
        : '.';
    return File('$baseDir${Platform.pathSeparator}ozikol_workstation_shifts.json');
  }

  Future<void> _loadPersistedHistory() async {
    if (kIsWeb) return;
    try {
      final file = _historyFile;
      if (!await file.exists()) return;
      final raw = await file.readAsString();
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        final list = decoded
            .whereType<Map>()
            .map((m) => Map<String, dynamic>.from(m))
            .toList();
        state = state.copyWith(shiftHistory: list);
      }
    } catch (_) {}
  }

  Future<void> _savePersistedHistory(List<Map<String, dynamic>> history) async {
    if (kIsWeb) return;
    try {
      await _historyFile.writeAsString(jsonEncode(history));
    } catch (_) {}
  }

  static String formatTime12(DateTime dt) {
    final h = dt.hour;
    final m = dt.minute;
    final ampm = h >= 12 ? 'PM' : 'AM';
    final displayH = h % 12 == 0 ? 12 : h % 12;
    return '${displayH.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')} $ampm';
  }

  static String formatDateKey(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }

  /// Starts or resumes work shift dynamically.
  Future<void> startOrResumeWork({String? primaryDomain}) async {
    final now = DateTime.now();
    int additionalGap = 0;
    String inactiveRange = state.lastInactiveRange;

    if (state.hasStartedToday && state.lastClosureTime != null) {
      final gapMinutes = now.difference(state.lastClosureTime!).inMinutes;
      if (gapMinutes > 0) {
        additionalGap = gapMinutes;
        inactiveRange = '${formatTime12(state.lastClosureTime!)} – ${formatTime12(now)}';
      }
    }

    final effectiveStart = state.hasStartedToday && state.shiftStartTime != null
        ? state.shiftStartTime!
        : now;

    state = state.copyWith(
      isAtWork: true,
      hasStartedToday: true,
      isOnBreak: false,
      shiftStartTime: effectiveStart,
      clearShiftEndTime: true,
      midShiftClosureMinutes: state.midShiftClosureMinutes + additionalGap,
      lastInactiveRange: inactiveRange,
    );

    _syncTodayRecordToHistory(status: 'In Progress');

    // Enforce Fullscreen on Desktop
    await _enforceFullScreen(true);
  }

  /// Concludes or pauses shift dynamically.
  Future<void> closeFromWork({
    required String reason,
    String notes = '',
  }) async {
    final now = DateTime.now();
    final newRecord = DepartureRecord(
      timestamp: now,
      reason: reason,
      notes: notes,
      activeSpanAtClosure: state.netEffectiveDuration,
    );

    final updatedRecords = List<DepartureRecord>.from(state.departureRecords)..add(newRecord);

    state = state.copyWith(
      isAtWork: false,
      isOnBreak: false,
      shiftEndTime: now,
      lastClosureTime: now,
      departureRecords: updatedRecords,
    );

    _syncTodayRecordToHistory(status: 'Closed');

    // Exit Fullscreen to standard desktop window
    await _enforceFullScreen(false);
  }

  /// Begins official break dynamically.
  Future<void> startBreak({String breakType = 'Break'}) async {
    final now = DateTime.now();
    state = state.copyWith(
      isOnBreak: true,
      breakStartTime: now,
      currentBreakType: breakType,
    );

    _syncTodayRecordToHistory(status: 'On Break');

    // Release fullscreen lock: allow window minimizing & free desktop usage
    await _enforceFullScreen(false);
  }

  /// Ends official break and resumes active work shift dynamically.
  Future<void> endBreakAndResumeWork({String? primaryDomain}) async {
    final now = DateTime.now();
    int additionalBreak = 0;
    String newRange = state.lastBreakTimeRange;

    if (state.breakStartTime != null) {
      final diff = now.difference(state.breakStartTime!).inMinutes;
      additionalBreak = diff > 0 ? diff : 1;
      newRange = '${formatTime12(state.breakStartTime!)} – ${formatTime12(now)}';
    }

    state = state.copyWith(
      isOnBreak: false,
      clearBreakStartTime: true,
      breakMinutesTaken: state.breakMinutesTaken + additionalBreak,
      lastBreakTimeRange: newRange,
      isAtWork: true,
    );

    _syncTodayRecordToHistory(status: 'In Progress');

    // Re-engage Fullscreen mode & lock
    await _enforceFullScreen(true);
  }

  void _syncTodayRecordToHistory({required String status}) {
    if (state.shiftStartTime == null) return;
    final now = DateTime.now();
    final dateKey = formatDateKey(now);
    final net = state.netEffectiveDuration;
    final netHours = net.inHours;
    final netMins = net.inMinutes.remainder(60);
    final workHoursStr = '${netHours.toString().padLeft(2, '0')} hrs ${netMins.toString().padLeft(2, '0')} mins';

    // Standard shift is 8 hours (480 minutes); anything beyond 480 mins is Overtime (OT)
    final otMinutes = net.inMinutes > 480 ? (net.inMinutes - 480) : 0;
    final hasOvertime = otMinutes > 0;
    final otHours = otMinutes ~/ 60;
    final otRemMins = otMinutes % 60;
    final overtimeStr = hasOvertime
        ? (otHours > 0 ? '+${otHours}h ${otRemMins}m OT' : '+${otRemMins}m OT')
        : '—';

    final entry = <String, dynamic>{
      'dateKey': dateKey,
      'timestamp': now.toIso8601String(),
      'start': formatTime12(state.shiftStartTime!),
      'close': state.shiftEndTime != null ? formatTime12(state.shiftEndTime!) : 'In Progress',
      'breakDuration': state.breakMinutesTaken > 0 ? '${state.breakMinutesTaken} mins' : 'None',
      'breakRange': state.lastBreakTimeRange,
      'inactiveDuration': state.midShiftClosureMinutes > 0 ? '${state.midShiftClosureMinutes} mins' : 'None',
      'inactiveRange': state.lastInactiveRange,
      'totalWorkHours': workHoursStr,
      'overtime': overtimeStr,
      'status': status,
      'hasOvertime': hasOvertime,
    };

    final updated = List<Map<String, dynamic>>.from(state.shiftHistory);
    final idx = updated.indexWhere((e) => e['dateKey'] == dateKey);
    if (idx >= 0) {
      updated[idx] = entry;
    } else {
      updated.insert(0, entry);
    }
    state = state.copyWith(shiftHistory: updated);
    unawaited(_savePersistedHistory(updated));
  }

  /// Toggles official break (pauses work timer).
  void toggleBreak() {
    final now = DateTime.now();
    if (!state.isOnBreak) {
      state = state.copyWith(
        isOnBreak: true,
        breakStartTime: now,
      );
    } else {
      int additionalBreak = 0;
      String newRange = state.lastBreakTimeRange;
      if (state.breakStartTime != null) {
        final diff = now.difference(state.breakStartTime!).inMinutes;
        additionalBreak = diff > 0 ? diff : 1;
        newRange = '${formatTime12(state.breakStartTime!)} – ${formatTime12(now)}';
      }
      state = state.copyWith(
        isOnBreak: false,
        clearBreakStartTime: true,
        breakMinutesTaken: state.breakMinutesTaken + additionalBreak,
        lastBreakTimeRange: newRange,
      );
    }
  }

  static const MethodChannel _kioskChannel = MethodChannel('com.ozikol.bcc/kiosk');

  /// Toggles or sets fullscreen and native Windows key-combination lockdown safely.
  Future<void> _enforceFullScreen(bool fullScreen) async {
    if (kIsWeb || (!Platform.isWindows && !Platform.isMacOS && !Platform.isLinux)) {
      return;
    }
    try {
      if (Platform.isWindows) {
        try {
          await _kioskChannel.invokeMethod('setLockdownMode', {'enabled': fullScreen});
        } catch (_) {}
      }
      if (fullScreen) {
        await windowManager.show();
        await windowManager.restore();
        await windowManager.focus();
        await windowManager.setFullScreen(true);
        await windowManager.setPreventClose(true);
      } else {
        await windowManager.setPreventClose(false);
        await windowManager.setAlwaysOnTop(false);
        await windowManager.setFullScreen(false);
      }
    } catch (e) {
      debugPrint('[WorkstationShiftNotifier] Window manager fullScreen error: $e');
    }
  }

  /// Launches Google Chrome by default to the designated workspace URL.
  static Future<void> launchChromeBrowser([String url = '']) async {
    if (url.trim().isEmpty) return;
    if (!kIsWeb && Platform.isWindows) {
      final chromeCandidates = [
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
        '${Platform.environment['LOCALAPPDATA'] ?? ''}\\Google\\Chrome\\Application\\chrome.exe',
      ];

      for (final chromePath in chromeCandidates) {
        if (File(chromePath).existsSync()) {
          try {
            await Process.start(chromePath, [url], mode: ProcessStartMode.detached);
            return;
          } catch (e) {
            debugPrint('[launchChromeBrowser] Process start error: $e');
          }
        }
      }

      try {
        await Process.start('cmd.exe', ['/c', 'start', 'chrome', url], mode: ProcessStartMode.detached);
        return;
      } catch (_) {}
    }

    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('[launchChromeBrowser] Fallback launchUrl error: $e');
    }
  }
}

/// Global provider for workstation shift state and controls.
final workstationShiftProvider =
    StateNotifierProvider<WorkstationShiftNotifier, WorkstationShiftState>((ref) {
  return WorkstationShiftNotifier();
});
