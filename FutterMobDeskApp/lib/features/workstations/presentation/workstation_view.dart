import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/localization/language_provider.dart';
import '../services/workstation_watcher_service.dart';

/// <summary>
/// Workstation & Application Gatekeeper Screen (bcp-workspace).
/// Features:
/// 1. Work Shift Controller (Start Work, Take Break, Close Work)
/// 2. Today's Shift Card with 3 core time reports (Gross, Mid-Shift Closures, Net Effective Hours)
/// 3. History of Works Ledger
/// 4. Approved Applications & Sandbox Folder Launcher
/// </summary>
class WorkstationView extends ConsumerStatefulWidget {
  final dynamic workspace;

  const WorkstationView({super.key, this.workspace});

  @override
  ConsumerState<WorkstationView> createState() => _WorkstationViewState();
}

class _WorkstationViewState extends ConsumerState<WorkstationView> {
  final TextEditingController _requestAppCtrl = TextEditingController();
  final TextEditingController _requestReasonCtrl = TextEditingController();
  final TextEditingController _adjustmentReasonCtrl = TextEditingController();
  bool _isSubmitting = false;

  // Realistic Interactive Shift State
  bool _isShiftActive = true;
  bool _isOnBreak = false;
  DateTime _shiftStartTime = DateTime.now().subtract(const Duration(hours: 6, minutes: 15));
  DateTime? _shiftEndTime;
  DateTime? _breakStartTime;
  int _breakMinutesTaken = 45;
  final int _midShiftClosureMinutes = 30;
  Timer? _tickerTimer;

  // Pre-populated History of Works ledger
  final List<Map<String, dynamic>> _workHistory = [
    {
      'date': 'Today (Live)',
      'start': '08:30 AM',
      'close': 'In Progress',
      'breaks': '45 mins (12:30 PM - 01:15 PM)',
      'closureGap': '30 mins (02:10 PM - 02:40 PM)',
      'totalWorkHours': '5 hrs 00 mins',
      'status': 'In Progress',
      'isToday': true,
    },
    {
      'date': 'Yesterday (30 Oct)',
      'start': '08:32 AM',
      'close': '05:05 PM',
      'breaks': '40 mins (12:45 PM - 01:25 PM)',
      'closureGap': 'None',
      'totalWorkHours': '7 hrs 53 mins',
      'status': 'Audited & Approved',
      'isToday': false,
    },
    {
      'date': 'Wed, 29 Oct 2026',
      'start': '08:45 AM',
      'close': '04:30 PM',
      'breaks': '60 mins (01:00 PM - 02:00 PM)',
      'closureGap': '15 mins (11:15 AM - 11:30 AM)',
      'totalWorkHours': '6 hrs 30 mins',
      'status': 'Audited & Approved',
      'isToday': false,
    },
    {
      'date': 'Tue, 28 Oct 2026',
      'start': '08:28 AM',
      'close': '05:12 PM',
      'breaks': '45 mins (12:30 PM - 01:15 PM)',
      'closureGap': 'None',
      'totalWorkHours': '7 hrs 59 mins',
      'status': 'Audited & Approved',
      'isToday': false,
    },
    {
      'date': 'Mon, 27 Oct 2026',
      'start': '08:50 AM',
      'close': '05:20 PM',
      'breaks': '50 mins (01:10 PM - 02:00 PM)',
      'closureGap': '20 mins (03:30 PM - 03:50 PM)',
      'totalWorkHours': '7 hrs 20 mins',
      'status': 'Audited & Approved',
      'isToday': false,
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
    _requestAppCtrl.dispose();
    _requestReasonCtrl.dispose();
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
      _workHistory[0]['close'] = 'In Progress';
      _workHistory[0]['start'] = 'Just Started';
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
      _workHistory[0]['status'] = 'Shift Closed';
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
                          fallback: 'Track shift hours, log breaks and mid-shift closures, and launch approved enterprise tools.',
                        ),
                        style: TextStyle(fontSize: 13, color: textSecondary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                OutlinedButton.icon(
                  onPressed: () => _openLocalFolder(watcher.approvedDirectory),
                  icon: const Icon(Icons.folder_open_rounded, size: 16),
                  label: const Text('Open Work Folder'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: Color(0xFFBFDBFE)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                ),
                const SizedBox(width: 10),
                ElevatedButton.icon(
                  onPressed: () => _openRequestDialog(context),
                  icon: const Icon(Icons.add_moderator_rounded, size: 16),
                  label: Text('workstation.request_btn'.tr(ref, fallback: 'Request Software Access')),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // 2. LIVE SESSION CONTROL BAR
            _buildSessionControlBar(isDark, surfaceColor, borderColor, textPrimary, textSecondary),
            const SizedBox(height: 20),

            // 3. TODAY'S SHIFT CARD (Top 3 Time Reports & Anomaly Calculator)
            _buildTodaysShiftCard(isDark, surfaceColor, borderColor, textPrimary, textSecondary, machineName),
            const SizedBox(height: 24),

            // 4. HISTORY OF WORKS (Audited Shift Ledger)
            _buildHistoryOfWorksLedger(isDark, surfaceColor, borderColor, textPrimary, textSecondary),
            const SizedBox(height: 28),

            // 5. Section: Approved Company Applications
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'workstation.approved_apps'.tr(ref, fallback: 'Approved Company Applications (1-Click Launch)'),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: textPrimary,
                  ),
                ),
                Text(
                  '${watcher.rules.isEmpty ? 6 : watcher.rules.length} Authorized Tools',
                  style: TextStyle(fontSize: 12, color: textSecondary, fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 6. Launcher Grid
            if (watcher.rules.isEmpty)
              _buildDefaultLauncherGrid(context, watcher, isDark, surfaceColor, borderColor, textPrimary, textSecondary)
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 260,
                  mainAxisExtent: 110,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                ),
                itemCount: watcher.rules.length,
                itemBuilder: (context, index) {
                  final rule = watcher.rules[index];
                  return _buildAppLauncherCard(
                    context,
                    title: rule.displayName,
                    processName: rule.processName,
                    category: rule.category,
                    icon: _resolveIcon(rule.iconName),
                    isDark: isDark,
                    surfaceColor: surfaceColor,
                    borderColor: borderColor,
                    textPrimary: textPrimary,
                    textSecondary: textSecondary,
                    onTap: () => _launchApp(watcher, rule.processName, rule.displayName),
                  );
                },
              ),
            const SizedBox(height: 60),
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
  // WIDGET: TODAY'S SHIFT CARD (Top 3 Reports)
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
                    child: const Icon(Icons.analytics_rounded, color: AppColors.primary, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Today's Shift Card & Work Hour Analytics",
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: textPrimary,
                          letterSpacing: -0.3,
                        ),
                      ),
                      Text(
                        'Logged on $machineName • Enforced Station Schedule (08:30 AM - 05:00 PM)',
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
                  subtitle: 'Station boot & biometric login',
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
                  subtitle: _isShiftActive ? 'Expected daily dismissal' : 'Work concluded',
                  icon: Icons.logout_rounded,
                  accentColor: const Color(0xFF6366F1),
                  isDark: isDark,
                  borderColor: borderColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Divider with Section Badge
          Row(
            children: [
              Text(
                'TOP 3 TIME REPORTS (AUDIT & HOUR CALCULATOR)',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: textSecondary,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(child: Divider(color: borderColor, height: 1)),
            ],
          ),
          const SizedBox(height: 16),

          // TOP 3 DETAILED TIME REPORTS
          _buildReportRow(
            number: '1',
            title: 'Gross Shift Duration (Wall-Clock Elapsed)',
            timeString: _formatDurationHM(_elapsedGrossDuration),
            description: 'Total continuous wall-clock span from initial station clock-in (08:30 AM) to the current moment.',
            badgeText: 'GROSS SPAN',
            badgeBg: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
            badgeFg: textSecondary,
            isDark: isDark,
            borderColor: borderColor,
            textPrimary: textPrimary,
            textSecondary: textSecondary,
          ),
          const SizedBox(height: 12),

          _buildReportRow(
            number: '2',
            title: 'Mid-Shift Closures & Deducted Interruption Report',
            timeString: '01 hr 15 mins (Total Non-Work)',
            description: 'Detected workstation gaps: • Closed between work hours: 02:10 PM - 02:40 PM (30 mins off-station) • Official break: 12:30 PM - 01:15 PM (45 mins).',
            badgeText: 'GAP AUDITED',
            badgeBg: const Color(0xFFFEE2E2),
            badgeFg: const Color(0xFFDC2626),
            isDark: isDark,
            borderColor: borderColor,
            textPrimary: textPrimary,
            textSecondary: textSecondary,
            highlightAlert: true,
          ),
          const SizedBox(height: 12),

          _buildReportRow(
            number: '3',
            title: 'Net Effective Work Hours (Calculated Work Hours)',
            timeString: _formatDurationHM(_netEffectiveDuration),
            description: 'Automated math: Gross Shift (${_formatDurationHM(_elapsedGrossDuration)}) minus Non-Work Interruptions (01 hr 15 mins) = Verified billable work.',
            badgeText: 'NET APPROVED',
            badgeBg: const Color(0xFFDCFCE7),
            badgeFg: const Color(0xFF15803D),
            isDark: isDark,
            borderColor: borderColor,
            textPrimary: textPrimary,
            textSecondary: textSecondary,
            isPrimaryResult: true,
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

  Widget _buildReportRow({
    required String number,
    required String title,
    required String timeString,
    required String description,
    required String badgeText,
    required Color badgeBg,
    required Color badgeFg,
    required bool isDark,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
    bool highlightAlert = false,
    bool isPrimaryResult = false,
  }) {
    Color cardBg = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);
    Color borderLine = borderColor;

    if (isPrimaryResult) {
      cardBg = isDark ? const Color(0xFF064E3B).withValues(alpha: 0.25) : const Color(0xFFECFDF5);
      borderLine = const Color(0xFF86EFAC);
    } else if (highlightAlert) {
      cardBg = isDark ? const Color(0xFF7F1D1D).withValues(alpha: 0.15) : const Color(0xFFFFF1F2);
      borderLine = const Color(0xFFFECDD3);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderLine, width: isPrimaryResult ? 1.5 : 1.0),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: badgeFg.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            alignment: Alignment.center,
            child: Text(
              number,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 13,
                color: badgeFg,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: textPrimary,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: badgeBg,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        badgeText,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: badgeFg,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(fontSize: 12, color: textSecondary, height: 1.3),
                ),
              ],
            ),
          ),
          const SizedBox(width: 20),
          Text(
            timeString,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              fontFamily: 'monospace',
              color: isPrimaryResult ? const Color(0xFF16A34A) : (highlightAlert ? const Color(0xFFDC2626) : textPrimary),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // WIDGET: HISTORY OF WORKS LEDGER
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
          const SizedBox(height: 14),

          // Ledger Table Headers
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: borderColor),
            ),
            child: const Row(
              children: [
                Expanded(flex: 3, child: Text('DATE', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                Expanded(flex: 2, child: Text('START WORK', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                Expanded(flex: 2, child: Text('CLOSE WORK', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                Expanded(flex: 4, child: Text('BREAKS TAKEN', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                Expanded(flex: 4, child: Text('MID-SHIFT CLOSURES', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                Expanded(flex: 3, child: Text('TOTAL WORK HR', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
                Expanded(flex: 3, child: Text('STATUS', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF64748B)))),
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
              final hasClosure = row['closureGap'] != 'None';

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                    Expanded(
                      flex: 3,
                      child: Text(
                        row['date'] as String,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: isToday ? FontWeight.w800 : FontWeight.w600,
                          color: isToday ? AppColors.primary : textPrimary,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        row['start'] as String,
                        style: TextStyle(fontSize: 12, color: textPrimary),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        row['close'] as String,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: isToday ? FontWeight.w700 : FontWeight.w500,
                          color: isToday ? const Color(0xFF16A34A) : textPrimary,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 4,
                      child: Text(
                        row['breaks'] as String,
                        style: TextStyle(fontSize: 11.5, color: textSecondary),
                      ),
                    ),
                    Expanded(
                      flex: 4,
                      child: Text(
                        row['closureGap'] as String,
                        style: TextStyle(
                          fontSize: 11.5,
                          color: hasClosure ? const Color(0xFFDC2626) : textSecondary,
                          fontWeight: hasClosure ? FontWeight.w700 : FontWeight.w400,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        row['totalWorkHours'] as String,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.w800,
                          color: isToday ? const Color(0xFF16A34A) : textPrimary,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: isToday ? const Color(0xFFDCFCE7) : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          row['status'] as String,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: isToday ? const Color(0xFF15803D) : textSecondary,
                          ),
                          overflow: TextOverflow.ellipsis,
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
    );
  }

  // ==========================================
  // LAUNCHER HELPERS
  // ==========================================
  Widget _buildDefaultLauncherGrid(
    BuildContext context,
    WorkstationWatcherService watcher,
    bool isDark,
    Color surfaceColor,
    Color borderColor,
    Color textPrimary,
    Color textSecondary,
  ) {
    final defaultTools = [
      {'name': 'Microsoft Word', 'process': 'winword.exe', 'category': 'Documents', 'icon': Icons.description_rounded},
      {'name': 'Microsoft Excel', 'process': 'excel.exe', 'category': 'Spreadsheets', 'icon': Icons.table_chart_rounded},
      {'name': 'Microsoft PowerPoint', 'process': 'powerpnt.exe', 'category': 'Presentations', 'icon': Icons.slideshow_rounded},
      {'name': 'Adobe Acrobat Reader', 'process': 'acrord32.exe', 'category': 'PDF Reader', 'icon': Icons.picture_as_pdf_rounded},
      {'name': 'Windows Calculator', 'process': 'calc.exe', 'category': 'Utilities', 'icon': Icons.calculate_rounded},
      {'name': 'Microsoft Teams', 'process': 'ms-teams.exe', 'category': 'Communication', 'icon': Icons.forum_rounded},
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 260,
        mainAxisExtent: 110,
        crossAxisSpacing: 14,
        mainAxisSpacing: 14,
      ),
      itemCount: defaultTools.length,
      itemBuilder: (context, index) {
        final tool = defaultTools[index];
        return _buildAppLauncherCard(
          context,
          title: tool['name'] as String,
          processName: tool['process'] as String,
          category: tool['category'] as String,
          icon: tool['icon'] as IconData,
          isDark: isDark,
          surfaceColor: surfaceColor,
          borderColor: borderColor,
          textPrimary: textPrimary,
          textSecondary: textSecondary,
          onTap: () => _launchApp(watcher, tool['process'] as String, tool['name'] as String),
        );
      },
    );
  }

  Widget _buildAppLauncherCard(
    BuildContext context, {
    required String title,
    required String processName,
    required String category,
    required IconData icon,
    required bool isDark,
    required Color surfaceColor,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
    required VoidCallback onTap,
  }) {
    return Material(
      color: surfaceColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(color: borderColor),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      processName,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontFamily: 'monospace',
                        color: textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        category,
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                          color: textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }

  IconData _resolveIcon(String? iconName) {
    switch (iconName) {
      case 'table_chart':
      case 'table_view':
        return Icons.table_chart_rounded;
      case 'slideshow':
        return Icons.slideshow_rounded;
      case 'picture_as_pdf':
        return Icons.picture_as_pdf_rounded;
      case 'calculate':
        return Icons.calculate_rounded;
      case 'chat':
      case 'forum':
        return Icons.forum_rounded;
      default:
        return Icons.description_rounded;
    }
  }

  Future<void> _launchApp(WorkstationWatcherService watcher, String processName, String appTitle) async {
    final success = await watcher.launchApprovedApp(processName);
    if (!mounted) return;
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Launching $appTitle...'),
          duration: const Duration(seconds: 2),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$appTitle ($processName) is not installed on this computer.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
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
                  'Need to explain a mid-shift closure, power outage, or external assignment? Submit a justification for supervisor review.',
                  style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _adjustmentReasonCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Adjustment Reason & Time Window',
                    hintText: 'e.g. Off-site client emergency meeting from 02:10 PM to 02:40 PM...',
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

  void _openRequestDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          title: const Row(
            children: [
              Icon(Icons.add_moderator_rounded, color: AppColors.primary),
              SizedBox(width: 8),
              Text('Request Software Access', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Need an application not currently on your workstation whitelist? Submit an access request for manager approval.',
                  style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _requestAppCtrl,
                  decoration: InputDecoration(
                    labelText: 'Process or Application Name',
                    hintText: 'e.g. photoshop.exe or CorelDraw',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _requestReasonCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Official Business Justification',
                    hintText: 'Describe why you need this tool for your office duties...',
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
              onPressed: _isSubmitting
                  ? null
                  : () async {
                      if (_requestAppCtrl.text.trim().isEmpty || _requestReasonCtrl.text.trim().isEmpty) return;
                      setState(() => _isSubmitting = true);
                      final watcher = ref.read(workstationWatcherProvider);
                      final ok = await watcher.requestAccess(
                        _requestAppCtrl.text.trim(),
                        _requestReasonCtrl.text.trim(),
                      );
                      setState(() => _isSubmitting = false);
                      if (!ctx.mounted) return;
                      Navigator.of(ctx).pop();

                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            ok
                                ? 'Access request submitted! Management will review shortly.'
                                : 'Failed to submit request. Please check connection.',
                          ),
                          backgroundColor: ok ? const Color(0xFF16A34A) : AppColors.error,
                        ),
                      );
                      _requestAppCtrl.clear();
                      _requestReasonCtrl.clear();
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
              child: const Text('Submit Request'),
            ),
          ],
        );
      },
    );
  }
}
