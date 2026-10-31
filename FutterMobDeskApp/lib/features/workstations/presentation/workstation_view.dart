import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/localization/language_provider.dart';
import '../services/workstation_watcher_service.dart';

/// <summary>
/// Workstation & Shift Tracker Screen (bcp-workspace).
/// Features:
/// 1. Work Shift Controller (Start Work, Take Break, Close Work)
/// 2. Today's Shift Card (Start Work, Break Range, Close Work Time)
/// 3. Shift Calendar & Future Schedule Viewer Modal
/// 4. History of Works Ledger with Automated Overtime (OT) Detection & Responsive Min-Width Scrolling
/// 5. Sandboxed Work Folder Access
/// </summary>
class WorkstationView extends ConsumerStatefulWidget {
  final dynamic workspace;

  const WorkstationView({super.key, this.workspace});

  @override
  ConsumerState<WorkstationView> createState() => _WorkstationViewState();
}

class _WorkstationViewState extends ConsumerState<WorkstationView> {
  final TextEditingController _adjustmentReasonCtrl = TextEditingController();

  // Realistic Interactive Shift State
  bool _isShiftActive = true;
  bool _isOnBreak = false;
  DateTime _shiftStartTime = DateTime.now().subtract(const Duration(hours: 6, minutes: 15));
  DateTime? _shiftEndTime;
  DateTime? _breakStartTime;
  int _breakMinutesTaken = 45;
  final int _midShiftClosureMinutes = 30;
  Timer? _tickerTimer;

  // Pre-populated History of Works ledger with Overtime (OT)
  final List<Map<String, dynamic>> _workHistory = [
    {
      'date': 'Today (Live)',
      'start': '08:30 AM',
      'close': '06:30 PM (Projected)',
      'breakDuration': '45 mins',
      'breakRange': '12:30 PM – 01:15 PM',
      'inactiveDuration': '30 mins',
      'inactiveRange': '02:10 PM – 02:40 PM',
      'totalWorkHours': '9 hrs 15 mins',
      'overtime': '+1h 30m OT',
      'status': 'In Progress',
      'isToday': true,
      'hasOvertime': true,
    },
    {
      'date': 'Yesterday (30 Oct)',
      'start': '08:32 AM',
      'close': '05:05 PM',
      'breakDuration': '40 mins',
      'breakRange': '12:45 PM – 01:25 PM',
      'inactiveDuration': 'None',
      'inactiveRange': '',
      'totalWorkHours': '7 hrs 53 mins',
      'overtime': '+5m OT',
      'status': 'Approved',
      'isToday': false,
      'hasOvertime': true,
    },
    {
      'date': 'Wed, 29 Oct 2026',
      'start': '08:45 AM',
      'close': '04:30 PM',
      'breakDuration': '60 mins',
      'breakRange': '01:00 PM – 02:00 PM',
      'inactiveDuration': '15 mins',
      'inactiveRange': '11:15 AM – 11:30 AM',
      'totalWorkHours': '6 hrs 30 mins',
      'overtime': '—',
      'status': 'Approved',
      'isToday': false,
      'hasOvertime': false,
    },
    {
      'date': 'Tue, 28 Oct 2026',
      'start': '08:28 AM',
      'close': '05:12 PM',
      'breakDuration': '45 mins',
      'breakRange': '12:30 PM – 01:15 PM',
      'inactiveDuration': 'None',
      'inactiveRange': '',
      'totalWorkHours': '7 hrs 59 mins',
      'overtime': '+12m OT',
      'status': 'Approved',
      'isToday': false,
      'hasOvertime': true,
    },
    {
      'date': 'Mon, 27 Oct 2026',
      'start': '08:50 AM',
      'close': '06:50 PM',
      'breakDuration': '50 mins',
      'breakRange': '01:10 PM – 02:00 PM',
      'inactiveDuration': '20 mins',
      'inactiveRange': '03:30 PM – 03:50 PM',
      'totalWorkHours': '8 hrs 40 mins',
      'overtime': '+1h 50m OT',
      'status': 'Approved',
      'isToday': false,
      'hasOvertime': true,
    },
  ];

  @override
  void initState() {
    super.initState();
    // Live UI tick to refresh elapsed counter
    _tickerTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted && _isShiftActive) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _tickerTimer?.cancel();
    _adjustmentReasonCtrl.dispose();
    super.dispose();
  }

  Duration get _elapsedGrossDuration {
    if (!_isShiftActive && _shiftEndTime != null) {
      return _shiftEndTime!.difference(_shiftStartTime);
    }
    return DateTime.now().difference(_shiftStartTime);
  }

  Duration get _netEffectiveDuration {
    final gross = _elapsedGrossDuration;
    final deductions = Duration(minutes: _breakMinutesTaken + _midShiftClosureMinutes);
    if (gross > deductions) {
      return gross - deductions;
    }
    return Duration.zero;
  }

  String _formatDuration(Duration d) {
    final hours = d.inHours;
    final minutes = d.inMinutes.remainder(60);
    final seconds = d.inSeconds.remainder(60);
    return '${hours.toString().padLeft(2, '0')}h ${minutes.toString().padLeft(2, '0')}m ${seconds.toString().padLeft(2, '0')}s';
  }

  String _formatDurationHM(Duration d) {
    final hours = d.inHours;
    final minutes = d.inMinutes.remainder(60);
    return '${hours.toString().padLeft(2, '0')} hrs ${minutes.toString().padLeft(2, '0')} mins';
  }

  void _handleStartWork() {
    setState(() {
      _isShiftActive = true;
      _isOnBreak = false;
      _shiftStartTime = DateTime.now();
      _shiftEndTime = null;
      _breakMinutesTaken = 0;
      _workHistory[0]['status'] = 'In Progress';
      _workHistory[0]['close'] = '05:00 PM (Projected)';
      _workHistory[0]['start'] = 'Just Started';
      _workHistory[0]['overtime'] = '—';
      _workHistory[0]['hasOvertime'] = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Shift started! Enterprise workstation logging is active.'),
        backgroundColor: Color(0xFF16A34A),
      ),
    );
  }

  void _handleToggleBreak() {
    setState(() {
      if (!_isOnBreak) {
        _isOnBreak = true;
        _breakStartTime = DateTime.now();
      } else {
        _isOnBreak = false;
        if (_breakStartTime != null) {
          final diff = DateTime.now().difference(_breakStartTime!).inMinutes;
          _breakMinutesTaken += (diff > 0 ? diff : 1);
        }
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(_isOnBreak ? 'Break started. Work timer paused.' : 'Break ended. Work timer resumed!'),
        backgroundColor: _isOnBreak ? const Color(0xFFD97706) : const Color(0xFF16A34A),
      ),
    );
  }

  void _handleCloseWork() {
    setState(() {
      _isShiftActive = false;
      _isOnBreak = false;
      _shiftEndTime = DateTime.now();
      _workHistory[0]['status'] = 'Closed';
      _workHistory[0]['close'] = 'Closed Just Now';
      _workHistory[0]['totalWorkHours'] = _formatDurationHM(_netEffectiveDuration);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Work session closed! Shift report calculated and saved to history.'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(languageProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? const Color(0xFF1E293B) : Colors.white;
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final textPrimary = isDark ? Colors.white : const Color(0xFF0F172A);
    final textSecondary = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    final watcher = ref.watch(workstationWatcherProvider);
    final machineName = Platform.isWindows ? Platform.localHostname : 'Office Workstation';

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Header & Breadcrumbs
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.desktop_windows_rounded, size: 13, color: AppColors.primary),
                      SizedBox(width: 5),
                      Text(
                        'SUITE 11 • WORKSPACE [DESKTOP ONLY]',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'workstation.title'.tr(ref, fallback: 'Workstation Shift Tracker & Gatekeeper'),
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'workstation.subtitle'.tr(
                          ref,
                          fallback: "Track today's shift hours, monitor breaks and inactive time with automated station auditing.",
                        ),
                        style: TextStyle(fontSize: 13, color: textSecondary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                // Shift Calendar Button
                OutlinedButton.icon(
                  onPressed: () => _openShiftCalendarDialog(context),
                  icon: const Icon(Icons.calendar_month_rounded, size: 16),
                  label: const Text('Shift Calendar'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF4338CA),
                    backgroundColor: isDark ? const Color(0xFF312E81).withValues(alpha: 0.2) : const Color(0xFFEEF2FF),
                    side: const BorderSide(color: Color(0xFFC7D2FE)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  ),
                ),
                const SizedBox(width: 10),
                OutlinedButton.icon(
                  onPressed: () => _openLocalFolder(watcher.approvedDirectory),
                  icon: const Icon(Icons.folder_open_rounded, size: 16),
                  label: const Text('Open Work Folder'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: Color(0xFFBFDBFE)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // 2. LIVE SESSION CONTROL BAR
            _buildSessionControlBar(isDark, surfaceColor, borderColor, textPrimary, textSecondary),
            const SizedBox(height: 20),

            // 3. TODAY'S SHIFT CARD (Start, Break, Close Work Time)
            _buildTodaysShiftCard(isDark, surfaceColor, borderColor, textPrimary, textSecondary, machineName),
            const SizedBox(height: 24),

            // 4. HISTORY OF WORKS (Audited Shift Ledger with Overtime & Horizontal Scroll)
            _buildHistoryOfWorksLedger(isDark, surfaceColor, borderColor, textPrimary, textSecondary),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // WIDGET: SESSION CONTROL BAR
  // ==========================================
  Widget _buildSessionControlBar(
    bool isDark,
    Color surfaceColor,
    Color borderColor,
    Color textPrimary,
    Color textSecondary,
  ) {
    Color statusBg;
    Color statusFg;
    String statusText;
    IconData statusIcon;

    if (!_isShiftActive) {
      statusBg = isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9);
      statusFg = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
      statusText = 'SHIFT CLOSED';
      statusIcon = Icons.stop_circle_outlined;
    } else if (_isOnBreak) {
      statusBg = const Color(0xFFFEF3C7);
      statusFg = const Color(0xFFD97706);
      statusText = 'ON BREAK • WORK PAUSED';
      statusIcon = Icons.coffee_rounded;
    } else {
      statusBg = const Color(0xFFDCFCE7);
      statusFg = const Color(0xFF15803D);
      statusText = 'ACTIVE SHIFT • LOGGING IN PROGRESS';
      statusIcon = Icons.radio_button_checked_rounded;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: Live Status Pill & Timer Counter
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(statusIcon, color: statusFg, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      statusText,
                      style: TextStyle(
                        color: statusFg,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'SESSION TIMER',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: textSecondary, letterSpacing: 0.5),
                  ),
                  Text(
                    _formatDuration(_elapsedGrossDuration),
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'monospace',
                      color: textPrimary,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Right: Action Control Buttons
          Row(
            children: [
              if (_isShiftActive) ...[
                OutlinedButton.icon(
                  onPressed: _handleToggleBreak,
                  icon: Icon(_isOnBreak ? Icons.play_arrow_rounded : Icons.coffee_rounded, size: 16),
                  label: Text(_isOnBreak ? 'Resume Work' : 'Take Break'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _isOnBreak ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                    side: BorderSide(color: _isOnBreak ? const Color(0xFF86EFAC) : const Color(0xFFFDE68A)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                ),
                const SizedBox(width: 10),
                ElevatedButton.icon(
                  onPressed: _handleCloseWork,
                  icon: const Icon(Icons.stop_circle_rounded, size: 16),
                  label: const Text('Close Work'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDC2626),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                ),
              ] else ...[
                ElevatedButton.icon(
                  onPressed: _handleStartWork,
                  icon: const Icon(Icons.play_circle_filled_rounded, size: 16),
                  label: const Text('Start Work'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF16A34A),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  // ==========================================
  // WIDGET: TODAY'S SHIFT CARD
  // ==========================================
  Widget _buildTodaysShiftCard(
    bool isDark,
    Color surfaceColor,
    Color borderColor,
    Color textPrimary,
    Color textSecondary,
    String machineName,
  ) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.04),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Card Header with Machine Name and Today label
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.badge_outlined, color: AppColors.primary, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Today's Shift Card",
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: textPrimary,
                          letterSpacing: -0.3,
                        ),
                      ),
                      Text(
                        'Standard Schedule: Monday – Friday (09:00 AM – 05:00 PM) • Station $machineName',
                        style: TextStyle(fontSize: 12, color: textSecondary),
                      ),
                    ],
                  ),
                ],
              ),
              OutlinedButton.icon(
                onPressed: () => _openAdjustmentDialog(context),
                icon: const Icon(Icons.edit_note_rounded, size: 16),
                label: const Text('Request Time Adjustment'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: textSecondary,
                  side: BorderSide(color: borderColor),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // 3 Primary Time Blocks: Start Work, Break Time Range, Close Work Time
          Row(
            children: [
              Expanded(
                child: _buildTimeMetricBlock(
                  title: 'START WORK TIME',
                  timeValue: '08:30 AM',
                  subtitle: 'Clocked in today at station',
                  icon: Icons.login_rounded,
                  accentColor: const Color(0xFF16A34A),
                  isDark: isDark,
                  borderColor: borderColor,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: _buildTimeMetricBlock(
                  title: 'BREAK TIME RANGE',
                  timeValue: '12:30 PM – 01:15 PM',
                  subtitle: '$_breakMinutesTaken mins taken today',
                  icon: Icons.coffee_rounded,
                  accentColor: const Color(0xFFD97706),
                  isDark: isDark,
                  borderColor: borderColor,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: _buildTimeMetricBlock(
                  title: 'CLOSE WORK TIME',
                  timeValue: _isShiftActive ? '05:00 PM (Projected)' : '05:00 PM (Logged)',
                  subtitle: _isShiftActive ? 'Expected close today' : 'Concluded today',
                  icon: Icons.logout_rounded,
                  accentColor: const Color(0xFF6366F1),
                  isDark: isDark,
                  borderColor: borderColor,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimeMetricBlock({
    required String title,
    required String timeValue,
    required String subtitle,
    required IconData icon,
    required Color accentColor,
    required bool isDark,
    required Color borderColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: accentColor),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  color: accentColor,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            timeValue,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 11.5,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // WIDGET: HISTORY OF WORKS LEDGER (Min-Width Protected)
  // ==========================================
  Widget _buildHistoryOfWorksLedger(
    bool isDark,
    Color surfaceColor,
    Color borderColor,
    Color textPrimary,
    Color textSecondary,
  ) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.history_toggle_off_rounded, color: AppColors.primary, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'History of Works & Audited Shifts',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: textPrimary,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.bolt_rounded, size: 14, color: Color(0xFFD97706)),
                        SizedBox(width: 4),
                        Text(
                          'Overtime (OT) Tracked',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFB45309)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: borderColor),
                    ),
                    child: Text(
                      '${_workHistory.length} Days Audited',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: textSecondary),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Scrollable Container for Compact / Minimized Viewports (guarantees no text crunching)
          LayoutBuilder(
            builder: (context, constraints) {
              const minTableWidth = 920.0;
              final effectiveWidth = constraints.maxWidth < minTableWidth ? minTableWidth : constraints.maxWidth;

              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: SizedBox(
                  width: effectiveWidth,
                  child: Column(
                    children: [
                      // Ledger Table Headers
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: borderColor),
                        ),
                        child: const Row(
                          children: [
                            SizedBox(width: 130, child: Text('DATE', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                            SizedBox(width: 80, child: Text('START', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                            SizedBox(width: 140, child: Text('CLOSE WORK', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                            Expanded(flex: 3, child: Text('BREAKS TAKEN', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                            Expanded(flex: 3, child: Text('INACTIVE TIME', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                            SizedBox(width: 110, child: Text('WORK HRS', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                            SizedBox(width: 100, child: Text('OVERTIME', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                            SizedBox(width: 95, child: Text('STATUS', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Ledger Rows
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _workHistory.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 6),
                        itemBuilder: (context, index) {
                          final row = _workHistory[index];
                          final isToday = row['isToday'] == true;
                          final dateStr = (row['date'] ?? '').toString();
                          final startStr = (row['start'] ?? '08:30 AM').toString();
                          final closeStr = (row['close'] ?? '05:00 PM').toString();
                          final breakDur = (row['breakDuration'] ?? row['breaks'] ?? '45 mins').toString();
                          final breakRng = (row['breakRange'] ?? '').toString();
                          final inactiveDur = (row['inactiveDuration'] ?? row['closureGap'] ?? 'None').toString();
                          final inactiveRng = (row['inactiveRange'] ?? '').toString();
                          final totalWorkStr = (row['totalWorkHours'] ?? '7 hrs 30 mins').toString();
                          final otStr = (row['overtime'] ?? '—').toString();
                          final statusStr = (row['status'] ?? 'Approved').toString();
                          final hasInactive = inactiveDur != 'None' && inactiveDur.isNotEmpty;
                          final hasOT = (row['hasOvertime'] == true) || (otStr != '—' && otStr.isNotEmpty);

                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            decoration: BoxDecoration(
                              color: isToday
                                  ? (isDark ? const Color(0xFF1E3A8A).withValues(alpha: 0.2) : const Color(0xFFEFF6FF))
                                  : (isDark ? const Color(0xFF0F172A).withValues(alpha: 0.5) : Colors.white),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isToday ? const Color(0xFF93C5FD) : borderColor,
                                width: isToday ? 1.2 : 1.0,
                              ),
                            ),
                            child: Row(
                              children: [
                                // 1. Date
                                SizedBox(
                                  width: 130,
                                  child: Text(
                                    dateStr,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: isToday ? FontWeight.w800 : FontWeight.w600,
                                      color: isToday ? AppColors.primary : textPrimary,
                                    ),
                                  ),
                                ),

                                // 2. Start Work
                                SizedBox(
                                  width: 80,
                                  child: Text(
                                    startStr,
                                    style: TextStyle(fontSize: 12, color: textPrimary),
                                  ),
                                ),

                                // 3. Close Work
                                SizedBox(
                                  width: 140,
                                  child: Text(
                                    closeStr,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: isToday ? FontWeight.w700 : FontWeight.w500,
                                      color: isToday ? const Color(0xFF16A34A) : textPrimary,
                                    ),
                                  ),
                                ),

                                // 4. Breaks Taken (Two-line clear layout)
                                Expanded(
                                  flex: 3,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        breakDur,
                                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: textPrimary),
                                      ),
                                      if (breakRng.isNotEmpty)
                                        Text(
                                          breakRng,
                                          style: TextStyle(fontSize: 10.5, color: textSecondary),
                                        ),
                                    ],
                                  ),
                                ),

                                // 5. Inactive Time (Two-line clear layout)
                                Expanded(
                                  flex: 3,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        inactiveDur,
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: hasInactive ? FontWeight.w800 : FontWeight.w500,
                                          color: hasInactive ? const Color(0xFFDC2626) : textSecondary,
                                        ),
                                      ),
                                      if (hasInactive && inactiveRng.isNotEmpty)
                                        Text(
                                          inactiveRng,
                                          style: const TextStyle(fontSize: 10.5, color: Color(0xFFDC2626)),
                                        ),
                                    ],
                                  ),
                                ),

                                // 6. Work Hours
                                SizedBox(
                                  width: 110,
                                  child: Text(
                                    totalWorkStr,
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontFamily: 'monospace',
                                      fontWeight: FontWeight.w800,
                                      color: isToday ? const Color(0xFF16A34A) : textPrimary,
                                    ),
                                  ),
                                ),

                                // 7. Overtime (OT)
                                SizedBox(
                                  width: 100,
                                  child: hasOT
                                      ? Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFFEF3C7),
                                            borderRadius: BorderRadius.circular(4),
                                            border: Border.all(color: const Color(0xFFFDE68A)),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.bolt_rounded, size: 12, color: Color(0xFFD97706)),
                                              const SizedBox(width: 2),
                                              Text(
                                                otStr,
                                                style: const TextStyle(
                                                  fontSize: 10.5,
                                                  fontWeight: FontWeight.w800,
                                                  color: Color(0xFFB45309),
                                                ),
                                              ),
                                            ],
                                          ),
                                        )
                                      : Text(
                                          '—',
                                          style: TextStyle(fontSize: 12, color: textSecondary),
                                        ),
                                ),

                                // 8. Status Pill
                                SizedBox(
                                  width: 95,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: isToday
                                          ? const Color(0xFFDCFCE7)
                                          : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        if (!isToday) ...[
                                          const Icon(Icons.check_circle_rounded, size: 11, color: Color(0xFF16A34A)),
                                          const SizedBox(width: 3),
                                        ],
                                        Text(
                                          statusStr,
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            color: isToday ? const Color(0xFF15803D) : textSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // ==========================================
  // SHIFT CALENDAR DIALOG
  // ==========================================
  void _openShiftCalendarDialog(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF1E293B) : Colors.white;
    final border = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final textP = isDark ? Colors.white : const Color(0xFF0F172A);
    final textS = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    final weekdays = [
      {'day': 'Monday', 'date': '27 Oct', 'hours': '09:00 AM – 05:00 PM', 'status': 'Worked (8h 40m • +1h 50m OT)', 'isOff': false, 'isToday': false},
      {'day': 'Tuesday', 'date': '28 Oct', 'hours': '09:00 AM – 05:00 PM', 'status': 'Worked (7h 59m • +12m OT)', 'isOff': false, 'isToday': false},
      {'day': 'Wednesday', 'date': '29 Oct', 'hours': '09:00 AM – 05:00 PM', 'status': 'Worked (6h 30m • Standard)', 'isOff': false, 'isToday': false},
      {'day': 'Thursday', 'date': '30 Oct', 'hours': '09:00 AM – 05:00 PM', 'status': 'Worked (7h 53m • +5m OT)', 'isOff': false, 'isToday': false},
      {'day': 'Friday', 'date': '31 Oct', 'hours': '09:00 AM – 05:00 PM', 'status': 'Today (Active Shift)', 'isOff': false, 'isToday': true},
      {'day': 'Saturday', 'date': '01 Nov', 'hours': 'Off-Duty', 'status': 'Weekend Rest Day', 'isOff': true, 'isToday': false},
      {'day': 'Sunday', 'date': '02 Nov', 'hours': 'Off-Duty', 'status': 'Weekend Rest Day', 'isOff': true, 'isToday': false},
    ];

    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          backgroundColor: surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 620, maxHeight: 680),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title & Close Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEEF2FF),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.calendar_month_rounded, color: Color(0xFF4338CA), size: 22),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Shift Calendar & Schedule Roster',
                                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: textP),
                              ),
                              Text(
                                'Official Company Policy: 9 to 5 (Mon – Fri)',
                                style: TextStyle(fontSize: 12, color: textS),
                              ),
                            ],
                          ),
                        ],
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(ctx).pop(),
                        icon: const Icon(Icons.close_rounded, size: 20),
                        splashRadius: 18,
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // Overtime & Policy Banner
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.bolt_rounded, color: Color(0xFFD97706), size: 20),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Overtime (OT) Policy: Any active work past 05:00 PM on weekdays or anytime on weekends is automatically recorded as billable Overtime.',
                            style: TextStyle(fontSize: 12, color: Color(0xFF92400E), height: 1.3, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  Text(
                    'WEEKLY SHIFT SCHEDULE',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: textS, letterSpacing: 0.6),
                  ),
                  const SizedBox(height: 10),

                  // Weekdays Roster List
                  Expanded(
                    child: ListView.separated(
                      itemCount: weekdays.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final item = weekdays[index];
                        final isToday = item['isToday'] == true;
                        final isOff = item['isOff'] == true;

                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: isToday
                                ? const Color(0xFFEFF6FF)
                                : (isOff ? (isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC)) : surface),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isToday ? const Color(0xFF93C5FD) : border,
                              width: isToday ? 1.4 : 1.0,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  SizedBox(
                                    width: 80,
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item['day'] as String,
                                          style: TextStyle(
                                            fontSize: 12.5,
                                            fontWeight: isToday ? FontWeight.w800 : FontWeight.w700,
                                            color: isToday ? AppColors.primary : (isOff ? textS : textP),
                                          ),
                                        ),
                                        Text(
                                          item['date'] as String,
                                          style: TextStyle(fontSize: 11, color: textS),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Text(
                                    item['hours'] as String,
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                      color: isOff ? textS : textP,
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isToday
                                      ? const Color(0xFFDCFCE7)
                                      : (isOff ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)) : const Color(0xFFF1F5F9)),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  item['status'] as String,
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700,
                                    color: isToday
                                        ? const Color(0xFF15803D)
                                        : (isOff ? textS : const Color(0xFF475569)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Close button
                  Align(
                    alignment: Alignment.centerRight,
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Close Schedule'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _openLocalFolder(String path) async {
    if (!Platform.isWindows) return;
    try {
      await Process.start('explorer.exe', [path]);
    } catch (_) {}
  }

  void _openAdjustmentDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          title: const Row(
            children: [
              Icon(Icons.edit_calendar_rounded, color: AppColors.primary),
              SizedBox(width: 8),
              Text('Request Time Adjustment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Need to explain an off-station period, power outage, or external assignment? Submit a justification for supervisor review.',
                  style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _adjustmentReasonCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Adjustment Reason & Time Window',
                    hintText: 'e.g. Off-site client meeting from 02:10 PM to 02:40 PM...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Time adjustment request submitted for supervisor approval!'),
                    backgroundColor: Color(0xFF16A34A),
                  ),
                );
                _adjustmentReasonCtrl.clear();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
              child: const Text('Submit Adjustment'),
            ),
          ],
        );
      },
    );
  }
}
