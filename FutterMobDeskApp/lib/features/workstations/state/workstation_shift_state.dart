import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
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
  final DateTime shiftStartTime;
  final DateTime? shiftEndTime;
  final DateTime? breakStartTime;
  final int breakMinutesTaken;
  final int midShiftClosureMinutes;
  final DateTime? lastClosureTime;
  final List<DepartureRecord> departureRecords;

  const WorkstationShiftState({
    required this.isAtWork,
    required this.hasStartedToday,
    required this.isOnBreak,
    this.currentBreakType = 'Lunch Break',
    this.lastBreakTimeRange = '12:30 PM – 01:15 PM',
    required this.shiftStartTime,
    this.shiftEndTime,
    this.breakStartTime,
    this.breakMinutesTaken = 45,
    this.midShiftClosureMinutes = 30,
    this.lastClosureTime,
    this.departureRecords = const [],
  });

  WorkstationShiftState copyWith({
    bool? isAtWork,
    bool? hasStartedToday,
    bool? isOnBreak,
    String? currentBreakType,
    String? lastBreakTimeRange,
    DateTime? shiftStartTime,
    DateTime? shiftEndTime,
    DateTime? breakStartTime,
    int? breakMinutesTaken,
    int? midShiftClosureMinutes,
    DateTime? lastClosureTime,
    List<DepartureRecord>? departureRecords,
  }) {
    return WorkstationShiftState(
      isAtWork: isAtWork ?? this.isAtWork,
      hasStartedToday: hasStartedToday ?? this.hasStartedToday,
      isOnBreak: isOnBreak ?? this.isOnBreak,
      currentBreakType: currentBreakType ?? this.currentBreakType,
      lastBreakTimeRange: lastBreakTimeRange ?? this.lastBreakTimeRange,
      shiftStartTime: shiftStartTime ?? this.shiftStartTime,
      shiftEndTime: shiftEndTime ?? this.shiftEndTime,
      breakStartTime: breakStartTime ?? this.breakStartTime,
      breakMinutesTaken: breakMinutesTaken ?? this.breakMinutesTaken,
      midShiftClosureMinutes: midShiftClosureMinutes ?? this.midShiftClosureMinutes,
      lastClosureTime: lastClosureTime ?? this.lastClosureTime,
      departureRecords: departureRecords ?? this.departureRecords,
    );
  }

  Duration get grossDuration {
    if (!isAtWork && shiftEndTime != null) {
      return shiftEndTime!.difference(shiftStartTime);
    }
    return DateTime.now().difference(shiftStartTime);
  }

  Duration get currentBreakDuration {
    if (isOnBreak && breakStartTime != null) {
      return DateTime.now().difference(breakStartTime!);
    }
    return Duration.zero;
  }

  Duration get netEffectiveDuration {
    final gross = grossDuration;
    final deductions = Duration(minutes: breakMinutesTaken + midShiftClosureMinutes);
    if (gross > deductions) {
      return gross - deductions;
    }
    return Duration.zero;
  }
}

/// Central Riverpod Notifier orchestrating fullscreen lock, workspace dock blur,
/// chrome auto-launch, and departure audit logs.
class WorkstationShiftNotifier extends StateNotifier<WorkstationShiftState> {
  WorkstationShiftNotifier()
      : super(
          WorkstationShiftState(
            isAtWork: false,
            hasStartedToday: false,
            isOnBreak: false,
            // Defaults to 08:30 AM today
            shiftStartTime: DateTime(
              DateTime.now().year,
              DateTime.now().month,
              DateTime.now().day,
              8,
              30,
            ),
          ),
        );

  /// Starts or resumes work shift:
  /// 1. Sets isAtWork = true, hasStartedToday = true
  /// 2. Sets Flutter window to Fullscreen (disables window minimize)
  /// 3. Automatically opens Google Chrome default browser to workspace URL
  Future<void> startOrResumeWork({String? primaryDomain}) async {
    final now = DateTime.now();
    int additionalGap = 0;
    if (state.lastClosureTime != null) {
      final gapMinutes = now.difference(state.lastClosureTime!).inMinutes;
      if (gapMinutes > 0) {
        additionalGap = gapMinutes;
      }
    }

    state = state.copyWith(
      isAtWork: true,
      hasStartedToday: true,
      isOnBreak: false,
      shiftEndTime: null,
      midShiftClosureMinutes: state.midShiftClosureMinutes + additionalGap,
    );

    // Enforce Fullscreen on Desktop
    await _enforceFullScreen(true);

    // Auto-launch Google Chrome default browser
    await launchChromeBrowser(primaryDomain ?? 'https://app.ozikol.cloud');
  }

  /// Concludes or pauses shift:
  /// 1. Exits Fullscreen mode and restores standard desktop window controls
  /// 2. Records departure reason and audit metadata
  /// 3. Allows employee to later click "Resume Work"
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

    // Exit Fullscreen to standard desktop window
    await _enforceFullScreen(false);
  }

  /// Begins official break:
  /// 1. Pauses active billable work timer and starts break timer
  /// 2. Exits Fullscreen mode and restores standard desktop window controls (- □ ✕)
  /// 3. Employee is free to minimize window and use any personal apps
  Future<void> startBreak({String breakType = 'Lunch Break'}) async {
    final now = DateTime.now();
    state = state.copyWith(
      isOnBreak: true,
      breakStartTime: now,
      currentBreakType: breakType,
    );

    // Release fullscreen lock: allow window minimizing & free desktop usage
    await _enforceFullScreen(false);
  }

  /// Ends official break and resumes active work shift:
  /// 1. Calculates exact break duration and logs to break minutes
  /// 2. Re-enters Fullscreen mode and restores workstation lock
  Future<void> endBreakAndResumeWork({String? primaryDomain}) async {
    final now = DateTime.now();
    int additionalBreak = 0;
    String newRange = state.lastBreakTimeRange;

    if (state.breakStartTime != null) {
      final diff = now.difference(state.breakStartTime!).inMinutes;
      additionalBreak = diff > 0 ? diff : 1;
      newRange = '${_formatTime12(state.breakStartTime!)} – ${_formatTime12(now)}';
    }

    state = state.copyWith(
      isOnBreak: false,
      breakStartTime: null,
      breakMinutesTaken: state.breakMinutesTaken + additionalBreak,
      lastBreakTimeRange: newRange,
      isAtWork: true,
    );

    // Re-engage Fullscreen mode & lock
    await _enforceFullScreen(true);

    // Auto-launch Google Chrome default browser if needed
    await launchChromeBrowser(primaryDomain ?? 'https://app.ozikol.cloud');
  }

  static String _formatTime12(DateTime dt) {
    final h = dt.hour;
    final m = dt.minute;
    final ampm = h >= 12 ? 'PM' : 'AM';
    final displayH = h % 12 == 0 ? 12 : h % 12;
    return '${displayH.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')} $ampm';
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
      if (state.breakStartTime != null) {
        final diff = now.difference(state.breakStartTime!).inMinutes;
        additionalBreak = diff > 0 ? diff : 1;
      }
      state = state.copyWith(
        isOnBreak: false,
        breakStartTime: null,
        breakMinutesTaken: state.breakMinutesTaken + additionalBreak,
      );
    }
  }

  /// Toggles or sets fullscreen via window_manager safely.
  Future<void> _enforceFullScreen(bool fullScreen) async {
    if (kIsWeb || (!Platform.isWindows && !Platform.isMacOS && !Platform.isLinux)) {
      return;
    }
    try {
      if (fullScreen) {
        await windowManager.show();
        await windowManager.focus();
        await windowManager.setFullScreen(true);
      } else {
        await windowManager.setFullScreen(false);
      }
    } catch (e) {
      debugPrint('[WorkstationShiftNotifier] Window manager fullScreen error: $e');
    }
  }

  /// Launches Google Chrome by default to the designated workspace URL.
  /// Checks standard Windows paths for Chrome and falls back gracefully.
  static Future<void> launchChromeBrowser([String url = 'https://app.ozikol.cloud']) async {
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

      // Try running via Windows shell start chrome
      try {
        await Process.start('cmd.exe', ['/c', 'start', 'chrome', url], mode: ProcessStartMode.detached);
        return;
      } catch (_) {}
    }

    // Standard fallback via url_launcher
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

