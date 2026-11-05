import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/workstation_watcher_service.dart';
import '../../state/workstation_shift_state.dart';

/// Models an active user-facing process running on the host OS with an active taskbar/desktop window.
class DetectedRunningApp {
  final String processName;
  final String displayName;
  final String windowTitle;
  final IconData icon;

  const DetectedRunningApp({
    required this.processName,
    required this.displayName,
    required this.windowTitle,
    required this.icon,
  });
}

/// Displays the pre-shift checklist modal prompting employee to close all
/// applications before entering active full-screen workstation duty.
Future<bool?> showPreWorkAppCheckerModal(
  BuildContext context,
  WidgetRef ref, {
  String? primaryDomain,
}) {
  return showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (dialogCtx) => PreWorkAppCheckerDialog(primaryDomain: primaryDomain),
  );
}

class PreWorkAppCheckerDialog extends ConsumerStatefulWidget {
  final String? primaryDomain;

  const PreWorkAppCheckerDialog({super.key, this.primaryDomain});

  @override
  ConsumerState<PreWorkAppCheckerDialog> createState() => _PreWorkAppCheckerDialogState();
}

class _PreWorkAppCheckerDialogState extends ConsumerState<PreWorkAppCheckerDialog> {
  bool _isScanning = true;
  bool _isScanInFlight = false;
  List<DetectedRunningApp> _detectedApps = [];
  final Set<String> _pendingApprovalApps = {};
  Timer? _liveSyncTimer;

  static const Set<String> _systemShellProcesses = {
    // Windows internal system/shell UI hosts
    'textinputhost.exe',
    'startmenuexperiencehost.exe',
    'shellexperiencehost.exe',
    'shellhost.exe',
    'searchhost.exe',
    'searchapp.exe',
    'lockapp.exe',
    'widgetboard.exe',
    'widgetservice.exe',
    'tabtip.exe',
    'powermgr.exe',
    'crossdeviceresume.exe',
    'crossdeviceservice.exe',
    'phoneexperiencehost.exe',
    'monotificationux.exe',
    'runtimebroker.exe',
    'applicationframehost.exe',
    'systemsettings.exe',
    'dllhost.exe',
    'taskhostw.exe',
    'svchost.exe',
    'dwm.exe',
    'ctfmon.exe',
    'sihost.exe',
    'msedgewebview2.exe',
    'perfwatson2.exe',
    'appactions.exe',
    'messagingplugin.exe',
    'screenrecorderplus.recoveryagent.exe',
    'unsecapp.exe',
    'copilotapp.exe',
    'litssvc.exe',
    'epdctrl.exe',
    'epdservice.exe',
    'rtkauduservice64.exe',
    'igfxemn.exe',
    'onedrive.sync.service.exe',
    'adb.exe',
    'conhost.exe',
    'openconsole.exe',
    'explorer.exe',

    // Developer & Build toolchain daemons
    'dotnet.exe',
    'node.exe',
    'dart.exe',
    'dartvm.exe',
    'dartaotruntime.exe',
    'flutter.exe',
    'git.exe',
    'esbuild.exe',
    'adskflex.exe',
    'wtabletserviceisd.exe',
    'dptf_helper.exe',
    'tposd.exe',
    'shtctky.exe',
    'microsoftstartfeedprovider.exe',
    'defendersessionhelper.exe',
    'applemobiledeviceprocess.exe',
    'xgtrayicon.exe',
    'lenovovantage-(genericmessagingaddin).exe',
    'lenovovantage-(generictelemetryaddin).exe',
    'devhub.exe',
    'servicehub.host.extensibility.x64.exe',
    'useroobebroker.exe',
    'crash_handler.exe',
    'plugin_host-3.14.exe',
    'browser_assistant.exe',

    // Ozikol suite & development IDE whitelist
    'ozikol_app.exe',
    'ozikol.exe',
    'ozikol.central.exe',
    'ozikol-bcc.api.exe',
  };

  // Whitelist of Windows system shells, runtime daemons, and Ozikol app itself

  @override
  void initState() {
    super.initState();
    _scanRunningApplications();
    _liveSyncTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (mounted && !_isScanning) {
        _scanRunningApplications(silent: true);
      }
    });
  }

  @override
  void dispose() {
    _liveSyncTimer?.cancel();
    super.dispose();
  }

  DetectedRunningApp _mapProcessToApp(String proc, [String? windowTitle]) {
    final title = (windowTitle != null && windowTitle.trim().isNotEmpty) ? windowTitle.trim() : proc;
    final lower = proc.toLowerCase().trim();
    switch (lower) {
      case 'sublime_text.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Sublime Text',
          windowTitle: title,
          icon: Icons.code_rounded,
        );
      case 'chrome.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Google Chrome',
          windowTitle: title,
          icon: Icons.public_rounded,
        );
      case 'msedge.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Microsoft Edge',
          windowTitle: title,
          icon: Icons.public_rounded,
        );
      case 'firefox.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Mozilla Firefox',
          windowTitle: title,
          icon: Icons.public_rounded,
        );
      case 'brave.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Brave Browser',
          windowTitle: title,
          icon: Icons.public_rounded,
        );
      case 'snippingtool.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Snipping Tool',
          windowTitle: title,
          icon: Icons.content_cut_rounded,
        );
      case 'whatsapp.exe':
      case 'whatsapp.root.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'WhatsApp Desktop',
          windowTitle: title,
          icon: Icons.chat_bubble_outline_rounded,
        );
      case 'windowsterminal.exe':
      case 'terminal.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Windows Terminal',
          windowTitle: title,
          icon: Icons.terminal_rounded,
        );
      case 'devenv.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Visual Studio',
          windowTitle: title,
          icon: Icons.integration_instructions_rounded,
        );
      case 'code.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Visual Studio Code',
          windowTitle: title,
          icon: Icons.code_rounded,
        );
      case 'telegram.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Telegram Messenger',
          windowTitle: title,
          icon: Icons.send_rounded,
        );
      case 'discord.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Discord',
          windowTitle: title,
          icon: Icons.sports_esports_rounded,
        );
      case 'spotify.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Spotify Music',
          windowTitle: title,
          icon: Icons.music_note_rounded,
        );
      case 'steam.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Steam Game Client',
          windowTitle: title,
          icon: Icons.games_rounded,
        );
      case 'winword.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Microsoft Word',
          windowTitle: title,
          icon: Icons.description_rounded,
        );
      case 'excel.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Microsoft Excel',
          windowTitle: title,
          icon: Icons.table_chart_rounded,
        );
      case 'powerpnt.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Microsoft PowerPoint',
          windowTitle: title,
          icon: Icons.slideshow_rounded,
        );
      case 'onenote.exe':
      case 'onenotem.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Microsoft OneNote',
          windowTitle: title,
          icon: Icons.note_alt_rounded,
        );
      case 'antigravity.exe':
      case 'antigravity ide.exe':
      case 'agy.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Antigravity IDE',
          windowTitle: title,
          icon: Icons.code_rounded,
        );
      case 'cmd.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Command Prompt',
          windowTitle: title,
          icon: Icons.terminal_rounded,
        );
      case 'powershell.exe':
      case 'pwsh.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Windows PowerShell',
          windowTitle: title,
          icon: Icons.terminal_rounded,
        );
      case 'mstsc.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Remote Desktop Connection',
          windowTitle: title,
          icon: Icons.desktop_windows_rounded,
        );
      case 'notepad.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Windows Notepad',
          windowTitle: title,
          icon: Icons.notes_rounded,
        );
      case 'vlc.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'VLC Media Player',
          windowTitle: title,
          icon: Icons.play_circle_outline_rounded,
        );
      case 'zoom.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Zoom Meetings',
          windowTitle: title,
          icon: Icons.videocam_rounded,
        );
      case 'teams.exe':
      case 'ms-teams.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Microsoft Teams',
          windowTitle: title,
          icon: Icons.groups_rounded,
        );
      case 'explorer.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Windows File Explorer',
          windowTitle: title,
          icon: Icons.folder_open_rounded,
        );
      case 'taskmgr.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Windows Task Manager',
          windowTitle: title,
          icon: Icons.monitor_heart_rounded,
        );
      default:
        final cleanName = proc.replaceAll(RegExp(r'\.exe$', caseSensitive: false), '');
        return DetectedRunningApp(
          processName: proc,
          displayName: cleanName[0].toUpperCase() + cleanName.substring(1),
          windowTitle: title,
          icon: Icons.apps_rounded,
        );
    }
  }

  List<String> _parseCsvRow(String line) {
    final List<String> cells = [];
    final buffer = StringBuffer();
    bool inQuotes = false;

    for (int i = 0; i < line.length; i++) {
      final char = line[i];
      if (char == '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] == '"') {
          buffer.write('"');
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char == ',' && !inQuotes) {
        cells.add(buffer.toString());
        buffer.clear();
      } else {
        buffer.write(char);
      }
    }
    cells.add(buffer.toString());
    return cells.map((c) => c.trim()).toList();
  }

  Future<void> _scanRunningApplications({bool silent = false}) async {
    if (!mounted || _isScanInFlight) return;
    _isScanInFlight = true;
    if (!silent) {
      setState(() => _isScanning = true);
    }
    final watcher = ref.read(workstationWatcherProvider);
    final Set<String> seen = {};
    final List<DetectedRunningApp> apps = [];

    try {
      if (!kIsWeb && Platform.isWindows) {
        bool scannedWithTaskbarFilter = false;

        // 1. Primary Scan: Filter ONLY interactive applications with visible windows on the Windows Taskbar
        // PLUS open File Explorer folder windows via Shell.Application COM object.
        try {
          final psResult = await Process.run('powershell', [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            "Get-Process | Where-Object { \$_.MainWindowHandle -ne 0 -and \$_.MainWindowTitle.Trim() -ne '' } | ForEach-Object { \$_.ProcessName + '.exe|' + \$_.MainWindowTitle }; "
            "try { \$expWins = @((New-Object -ComObject Shell.Application).Windows() | Where-Object { \$_.FullName -like '*explorer.exe' } | ForEach-Object { \$_.LocationName }); if (\$expWins.Count -gt 0) { Write-Output ('explorer.exe|File Explorer (' + (\$expWins -join ', ') + ')') } } catch {}",
          ]).timeout(const Duration(seconds: 8));

          if (psResult.exitCode == 0) {
            final lines = psResult.stdout.toString().split(RegExp(r'[\r\n]+'));
            for (final line in lines) {
              final trimmed = line.trim();
              if (trimmed.isEmpty || !trimmed.contains('|')) continue;
              final parts = trimmed.split('|');
              final procName = parts[0].trim();
              final title = parts.length > 1 ? parts.sublist(1).join('|').trim() : '';
              final procLower = procName.toLowerCase();

              // Allow explorer.exe when emitted explicitly by the Shell.Application folder window check
              if (procLower != 'explorer.exe' && _systemShellProcesses.contains(procLower)) continue;
              // Local-only development testing clause: allow Antigravity, Chrome, and CMD/PowerShell on local
              if (watcher.isLocalDevExemptProcess(procLower)) continue;
              if (seen.contains(procLower)) continue;
              seen.add(procLower);

              apps.add(_mapProcessToApp(procName, title));
            }
            scannedWithTaskbarFilter = true;
          }
        } catch (e) {
          debugPrint('[PreWorkAppChecker] Taskbar window scan error: $e');
        }

        // 2. Fallback to fast tasklist (without slow /FI STATUS WMI query) if PowerShell failed
        if (!scannedWithTaskbarFilter) {
          try {
            final result = await Process.run(
              'tasklist',
              ['/FI', 'SESSIONNAME eq Console', '/FO', 'CSV', '/NH'],
            ).timeout(const Duration(seconds: 6));

            if (result.exitCode == 0) {
              final lines = result.stdout.toString().split('\n');
              for (final line in lines) {
                final trimmed = line.trim();
                if (trimmed.isEmpty) continue;
                final fields = _parseCsvRow(trimmed);
                if (fields.isEmpty) continue;

                final procName = fields[0].replaceAll('"', '').trim();
                final sessionName = fields.length >= 3 ? fields[2].replaceAll('"', '').trim().toLowerCase() : '';
                final procLower = procName.toLowerCase();

                // MUST be in the interactive console session
                if (sessionName.isNotEmpty && sessionName != 'console') continue;

                // Skip system shells and daemons
                if (_systemShellProcesses.contains(procLower)) continue;
                // Local-only development testing clause: allow Antigravity, Chrome, and CMD/PowerShell on local
                if (watcher.isLocalDevExemptProcess(procLower)) continue;

                if (seen.contains(procLower)) continue;
                seen.add(procLower);

                apps.add(_mapProcessToApp(procName));
              }
            }
          } catch (e) {
            debugPrint('[PreWorkAppChecker] Tasklist fallback scan error: $e');
          }
        }
      }

      if (!mounted) return;
      await watcher.refreshPolicies();

      if (mounted) {
        setState(() {
          _detectedApps = apps;
          _isScanning = false;
        });
      }
    } finally {
      _isScanInFlight = false;
    }
  }

  Future<void> _requestAdminApproval(DetectedRunningApp app) async {
    final procLower = app.processName.toLowerCase();
    setState(() {
      _pendingApprovalApps.add(procLower);
    });

    final watcher = ref.read(workstationWatcherProvider);
    await watcher.requestAccess(
      app.processName,
      'Workstation compliance exemption requested for ${app.displayName}',
    );
    await watcher.refreshPolicies();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Admin approval requested for ${app.displayName}. Close all apps to start work, then open approved apps from your Workstation.'),
          backgroundColor: const Color(0xFF4338CA),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _requestApprovalForAll() async {
    final watcher = ref.read(workstationWatcherProvider);
    final List<DetectedRunningApp> appsToSubmit = _detectedApps
        .where((a) => !watcher.isProcessApproved(a.processName) && !watcher.isProcessPending(a.processName))
        .toList();

    for (final app in appsToSubmit) {
      _pendingApprovalApps.add(app.processName.toLowerCase());
      unawaited(watcher.requestAccess(
        app.processName,
        'Workstation compliance exemption requested for ${app.displayName}',
      ));
    }
    setState(() {});
    await Future.delayed(const Duration(milliseconds: 400));
    await watcher.refreshPolicies();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unapproved applications submitted for Admin Approval.'),
          backgroundColor: Color(0xFF4338CA),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _confirmAndStartWork() async {
    // Strict Compliance Rule: Work CANNOT start until ALL running applications are closed.
    if (_detectedApps.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please close all running applications first. You can open your Approved Apps from inside your Workstation after starting work.'),
          backgroundColor: Color(0xFFDC2626),
          duration: Duration(seconds: 3),
        ),
      );
      return;
    }

    if (!mounted) return;
    Navigator.of(context).pop(true);
    ref.read(workstationWatcherProvider).startGuarding();
    await ref
        .read(workstationShiftProvider.notifier)
        .startOrResumeWork(primaryDomain: widget.primaryDomain);
  }

  @override
  Widget build(BuildContext context) {
    final watcher = ref.watch(workstationWatcherProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF1E293B) : Colors.white;
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final textPrimary = isDark ? Colors.white : const Color(0xFF0F172A);
    final textSecondary = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    final hasApps = _detectedApps.isNotEmpty;
    final approvedAppsCount = _detectedApps.where((a) => watcher.isProcessApproved(a.processName)).length;
    final unapprovedAppsCount = _detectedApps.length - approvedAppsCount;

    return Dialog(
      backgroundColor: bgColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 24,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 680, maxHeight: 720),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: hasApps ? const Color(0xFFFEF3C7) : const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      hasApps ? Icons.warning_amber_rounded : Icons.verified_user_rounded,
                      color: hasApps ? const Color(0xFFD97706) : const Color(0xFF16A34A),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Pre-Shift Workstation Compliance Check',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: textPrimary,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Close all running applications before starting work. Open your Approved Apps from inside your Workstation.',
                          style: TextStyle(
                            fontSize: 12.5,
                            color: textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: textSecondary, size: 20),
                    onPressed: () => Navigator.of(context).pop(false),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Status Summary Banner
              if (_isScanning)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: borderColor),
                  ),
                  child: Row(
                    children: [
                      const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2.2),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'Scanning running host workstation applications...',
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: textSecondary),
                      ),
                    ],
                  ),
                )
              else if (hasApps)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${_detectedApps.length} Running Application(s) Detected — Please Close All Apps to Start Work',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF991B1B),
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'Please save any unsaved work and close all open applications (even Approved Apps) so no outside project or document remains open. Once inside your Workstation, open your Approved Apps fresh.',
                              style: TextStyle(fontSize: 11.5, color: Color(0xFFB91C1C)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Row(
                    children: const [
                      Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A), size: 20),
                      SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Workstation Clean & Compliant!',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF166534),
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'No conflicting external applications detected. Ready to start active work duty.',
                              style: TextStyle(fontSize: 11.5, color: Color(0xFF15803D)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 14),

              // Title above the list with Re-Scan and Close All buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    hasApps ? 'ACTIVE APPLICATIONS TO CLOSE (${_detectedApps.length})' : 'COMPLIANCE STATUS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: textSecondary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.sync_rounded, size: 12, color: Color(0xFF2563EB)),
                            SizedBox(width: 4),
                            Text(
                              'Auto-refreshes every 3s',
                              style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF1D4ED8)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),
                      TextButton.icon(
                        onPressed: _isScanning ? null : _scanRunningApplications,
                        icon: const Icon(Icons.refresh_rounded, size: 14),
                        label: const Text('Re-Scan Station', style: TextStyle(fontSize: 11.5)),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF4338CA),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Applications Scrollable List
              Expanded(
                child: _isScanning
                    ? const Center(child: CircularProgressIndicator())
                    : !hasApps
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 54,
                                  height: 54,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFDCFCE7),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.done_all_rounded, color: Color(0xFF16A34A), size: 28),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  'All applications are closed',
                                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: textPrimary),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Your desktop is primed for distraction-free enterprise duty.',
                                  style: TextStyle(fontSize: 12, color: textSecondary),
                                ),
                              ],
                            ),
                          )
                        : Container(
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: borderColor),
                            ),
                            child: ListView.separated(
                              padding: const EdgeInsets.all(10),
                              itemCount: _detectedApps.length,
                              separatorBuilder: (context, index) => Divider(color: borderColor, height: 12),
                              itemBuilder: (context, index) {
                                final app = _detectedApps[index];
                                final procLower = app.processName.toLowerCase();
                                final isApproved = watcher.isProcessApproved(procLower);
                                final isPending = !isApproved &&
                                    (watcher.isProcessPending(procLower) || _pendingApprovalApps.contains(procLower));
                                final isDenied = !isApproved && !isPending && watcher.isProcessDenied(procLower);

                                return Row(
                                  children: [
                                    Container(
                                      width: 36,
                                      height: 36,
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(
                                          color: isApproved ? const Color(0xFF86EFAC) : borderColor,
                                        ),
                                      ),
                                      child: Icon(
                                        app.icon,
                                        size: 18,
                                        color: isApproved ? const Color(0xFF16A34A) : const Color(0xFF4338CA),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            app.displayName,
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                              color: textPrimary,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            app.windowTitle.isNotEmpty ? app.windowTitle : app.processName,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        if (isApproved) ...[
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFDCFCE7),
                                              borderRadius: BorderRadius.circular(6),
                                              border: Border.all(color: const Color(0xFF86EFAC)),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: const [
                                                Icon(Icons.check_circle_rounded, size: 13, color: Color(0xFF16A34A)),
                                                SizedBox(width: 4),
                                                Text(
                                                  'Approved • Open from Workstation',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w800,
                                                    color: Color(0xFF166534),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ] else if (isPending) ...[
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFFEF3C7),
                                              borderRadius: BorderRadius.circular(6),
                                              border: Border.all(color: const Color(0xFFFDE68A)),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: const [
                                                Icon(Icons.hourglass_top_rounded, size: 12, color: Color(0xFFD97706)),
                                                SizedBox(width: 4),
                                                Text(
                                                  'Approval Pending',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w700,
                                                    color: Color(0xFFD97706),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ] else if (isDenied) ...[
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFFEE2E2),
                                              borderRadius: BorderRadius.circular(6),
                                              border: Border.all(color: const Color(0xFFFCA5A5)),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: const [
                                                Icon(Icons.block_rounded, size: 12, color: Color(0xFFDC2626)),
                                                SizedBox(width: 4),
                                                Text(
                                                  'Denied • Must Close',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w700,
                                                    color: Color(0xFF991B1B),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ] else ...[
                                          OutlinedButton.icon(
                                            onPressed: () => _requestAdminApproval(app),
                                            icon: const Icon(Icons.admin_panel_settings_outlined, size: 13),
                                            label: const Text(
                                              'Request Approval',
                                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                            ),
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: const Color(0xFF4338CA),
                                              side: const BorderSide(color: Color(0xFFC7D2FE)),
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                            ),
                                          ),
                                        ],
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFFEE2E2),
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(color: const Color(0xFFFCA5A5)),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: const [
                                              Icon(Icons.close_fullscreen_rounded, size: 12, color: Color(0xFFDC2626)),
                                              SizedBox(width: 4),
                                              Text(
                                                'Close App Manually',
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w700,
                                                  color: Color(0xFF991B1B),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                );
                              },
                            ),
                          ),
              ),

              const SizedBox(height: 18),

              // Action Buttons
              Align(
                alignment: Alignment.centerRight,
                child: Wrap(
                  alignment: WrapAlignment.end,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: textPrimary,
                        side: BorderSide(color: borderColor),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Cancel / Stay Off-Duty', style: TextStyle(fontSize: 12)),
                    ),
                    if (unapprovedAppsCount > 0)
                      OutlinedButton.icon(
                        onPressed: _requestApprovalForAll,
                        icon: const Icon(Icons.admin_panel_settings_outlined, size: 15),
                        label: const Text(
                          'Submit for Admin Approval',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF4338CA),
                          side: const BorderSide(color: Color(0xFFA5B4FC)),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ElevatedButton.icon(
                      onPressed: (hasApps || _isScanning) ? null : _confirmAndStartWork,
                      icon: Icon(
                        hasApps ? Icons.lock_rounded : Icons.play_circle_filled_rounded,
                        size: 16,
                      ),
                      label: const Text(
                        'Start Active Work Duty',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF16A34A),
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                        disabledForegroundColor: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        elevation: 0,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

