import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
  bool _isClosingAll = false;
  List<DetectedRunningApp> _detectedApps = [];

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
    'cmd.exe',
    'powershell.exe',
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

    // Ozikol suite & development IDE whitelist
    'ozikol_app.exe',
    'ozikol.exe',
    'ozikol.central.exe',
    'ozikol-bcc.api.exe',
    'antigravity ide.exe',
    'antigravity.exe',
    'agy.exe',
    'taskmgr.exe',
  };

  static const Set<String> _ignoredWindowTitles = {
    'n/a',
    'olemainthreadwndname',
    'olechannelwnd',
    'desktopwindowxamlsource',
    'dwm notification window',
    'its_user_window',
    'adb power notification window',
    'microsoft onedrive sync service',
    'battery notification window',
    'network flyout',
    'quick settings',
    'start',
    'search',
    'windows widgets',
    'new notification',
    'task host window',
    'pwrmgrbkgndwindow',
    'crossdeviceresumewindow',
    'realtekaudioadminbackgroundprocessclass',
    'realtekaudiobackgroundprocessclass',
    'windows push notifications platform',
    'the event manager dashboard',
    'etdctrl',
    'wisptis',
    'rtc video pnp listener',
    'windows default lock screen',
    'windows input experience',
  };

  @override
  void initState() {
    super.initState();
    _scanRunningApplications();
  }

  DetectedRunningApp _mapProcessToApp(String proc, String windowTitle) {
    final lower = proc.toLowerCase().trim();
    switch (lower) {
      case 'sublime_text.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Sublime Text',
          windowTitle: windowTitle,
          icon: Icons.code_rounded,
        );
      case 'chrome.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Google Chrome',
          windowTitle: windowTitle,
          icon: Icons.public_rounded,
        );
      case 'msedge.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Microsoft Edge',
          windowTitle: windowTitle,
          icon: Icons.public_rounded,
        );
      case 'firefox.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Mozilla Firefox',
          windowTitle: windowTitle,
          icon: Icons.public_rounded,
        );
      case 'brave.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Brave Browser',
          windowTitle: windowTitle,
          icon: Icons.public_rounded,
        );
      case 'snippingtool.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Snipping Tool',
          windowTitle: windowTitle,
          icon: Icons.content_cut_rounded,
        );
      case 'whatsapp.exe':
      case 'whatsapp.root.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'WhatsApp Desktop',
          windowTitle: windowTitle,
          icon: Icons.chat_bubble_outline_rounded,
        );
      case 'windowsterminal.exe':
      case 'terminal.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Windows Terminal',
          windowTitle: windowTitle,
          icon: Icons.terminal_rounded,
        );
      case 'devenv.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Visual Studio',
          windowTitle: windowTitle,
          icon: Icons.integration_instructions_rounded,
        );
      case 'code.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Visual Studio Code',
          windowTitle: windowTitle,
          icon: Icons.code_rounded,
        );
      case 'telegram.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Telegram Messenger',
          windowTitle: windowTitle,
          icon: Icons.send_rounded,
        );
      case 'discord.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Discord',
          windowTitle: windowTitle,
          icon: Icons.sports_esports_rounded,
        );
      case 'spotify.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Spotify Music',
          windowTitle: windowTitle,
          icon: Icons.music_note_rounded,
        );
      case 'steam.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Steam Game Client',
          windowTitle: windowTitle,
          icon: Icons.games_rounded,
        );
      case 'winword.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Microsoft Word',
          windowTitle: windowTitle,
          icon: Icons.description_rounded,
        );
      case 'excel.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Microsoft Excel',
          windowTitle: windowTitle,
          icon: Icons.table_chart_rounded,
        );
      case 'powerpnt.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Microsoft PowerPoint',
          windowTitle: windowTitle,
          icon: Icons.slideshow_rounded,
        );
      case 'onenote.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Microsoft OneNote',
          windowTitle: windowTitle,
          icon: Icons.note_alt_rounded,
        );
      case 'notepad.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Windows Notepad',
          windowTitle: windowTitle,
          icon: Icons.notes_rounded,
        );
      case 'vlc.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'VLC Media Player',
          windowTitle: windowTitle,
          icon: Icons.play_circle_outline_rounded,
        );
      case 'zoom.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Zoom Meetings',
          windowTitle: windowTitle,
          icon: Icons.videocam_rounded,
        );
      case 'teams.exe':
      case 'ms-teams.exe':
        return DetectedRunningApp(
          processName: proc,
          displayName: 'Microsoft Teams',
          windowTitle: windowTitle,
          icon: Icons.groups_rounded,
        );
      default:
        final cleanName = proc.replaceAll(RegExp(r'\.exe$', caseSensitive: false), '');
        return DetectedRunningApp(
          processName: proc,
          displayName: cleanName[0].toUpperCase() + cleanName.substring(1),
          windowTitle: windowTitle,
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

  Future<void> _scanRunningApplications() async {
    setState(() => _isScanning = true);
    final Set<String> seen = {};
    final List<DetectedRunningApp> apps = [];

    if (!kIsWeb && Platform.isWindows) {
      try {
        final result = await Process.run('tasklist', ['/V', '/FO', 'CSV', '/NH']);
        if (result.exitCode == 0) {
          final lines = result.stdout.toString().split('\n');
          for (final line in lines) {
            final trimmed = line.trim();
            if (trimmed.isEmpty) continue;
            final fields = _parseCsvRow(trimmed);
            if (fields.length < 9) continue;

            final procName = fields[0];
            final sessionName = fields[2].toLowerCase();
            final windowTitle = fields[8];
            final procLower = procName.toLowerCase();
            final titleLower = windowTitle.toLowerCase();

            // 1. MUST be in the interactive console session (not Session 0 background services)
            if (sessionName != 'console') continue;

            // 2. MUST have a real, visible taskbar window title (not background task without UI)
            if (windowTitle.isEmpty || titleLower == 'n/a') continue;

            // 3. Skip system and internal framework window handles
            if (_ignoredWindowTitles.contains(titleLower)) continue;
            if (titleLower.startsWith('.net-broadcasteventwindow')) continue;

            // 4. Skip whitelisted Windows system shells, runtime daemons, and Ozikol app itself
            if (_systemShellProcesses.contains(procLower)) continue;

            if (seen.contains(procLower)) continue;
            seen.add(procLower);

            apps.add(_mapProcessToApp(procName, windowTitle));
          }
        }
      } catch (e) {
        debugPrint('[PreWorkAppChecker] Tasklist scan error: $e');
      }
    }

    if (mounted) {
      setState(() {
        _detectedApps = apps;
        _isScanning = false;
      });
    }
  }

  Future<void> _closeSingleApp(String procName) async {
    if (!kIsWeb && Platform.isWindows) {
      try {
        await Process.run('taskkill', ['/F', '/IM', procName]);
      } catch (e) {
        debugPrint('[PreWorkAppChecker] Taskkill error: $e');
      }
    }
    // Refresh scan after closing
    await Future.delayed(const Duration(milliseconds: 300));
    if (mounted) {
      await _scanRunningApplications();
    }
  }

  Future<void> _closeAllDetectedApps() async {
    setState(() => _isClosingAll = true);
    if (!kIsWeb && Platform.isWindows) {
      for (final app in _detectedApps) {
        try {
          await Process.run('taskkill', ['/F', '/IM', app.processName]);
        } catch (_) {}
      }
    }
    await Future.delayed(const Duration(milliseconds: 600));
    if (mounted) {
      setState(() => _isClosingAll = false);
      await _scanRunningApplications();
    }
  }

  Future<void> _confirmAndStartWork() async {
    Navigator.of(context).pop(true);
    await ref
        .read(workstationShiftProvider.notifier)
        .startOrResumeWork(primaryDomain: widget.primaryDomain);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF1E293B) : Colors.white;
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final textPrimary = isDark ? Colors.white : const Color(0xFF0F172A);
    final textSecondary = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    final hasApps = _detectedApps.isNotEmpty;

    return Dialog(
      backgroundColor: bgColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 24,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 580, maxHeight: 680),
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
                          'Please close all external applications before active logging begins.',
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
                              '${_detectedApps.length} Open Taskbar Application(s) Detected',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF991B1B),
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'To maintain strict enterprise audit accuracy, close all personal and third-party apps.',
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
                    hasApps ? 'ACTIVE APPLICATIONS TO CLOSE' : 'COMPLIANCE STATUS',
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
                      TextButton.icon(
                        onPressed: _isScanning ? null : _scanRunningApplications,
                        icon: const Icon(Icons.refresh_rounded, size: 14),
                        label: const Text('Re-Scan Station', style: TextStyle(fontSize: 11.5)),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF4338CA),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        ),
                      ),
                      if (hasApps) ...[
                        const SizedBox(width: 6),
                        OutlinedButton.icon(
                          onPressed: _isClosingAll ? null : _closeAllDetectedApps,
                          icon: _isClosingAll
                              ? const SizedBox(
                                  width: 12,
                                  height: 12,
                                  child: CircularProgressIndicator(strokeWidth: 1.8),
                                )
                              : const Icon(Icons.close_rounded, size: 14),
                          label: Text(
                            _isClosingAll ? 'Closing...' : 'Close All Apps',
                            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
                          ),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFDC2626),
                            side: const BorderSide(color: Color(0xFFFCA5A5)),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                          ),
                        ),
                      ],
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
                                return Row(
                                  children: [
                                    Container(
                                      width: 36,
                                      height: 36,
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: borderColor),
                                      ),
                                      child: Icon(app.icon, size: 18, color: const Color(0xFF4338CA)),
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
                                    ElevatedButton(
                                      onPressed: () => _closeSingleApp(app.processName),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFFFEE2E2),
                                        foregroundColor: const Color(0xFFDC2626),
                                        elevation: 0,
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                      ),
                                      child: const Text('Close App', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                                    ),
                                  ],
                                );
                              },
                            ),
                          ),
              ),

              const SizedBox(height: 18),

              // Action Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: textPrimary,
                      side: BorderSide(color: borderColor),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Cancel / Stay Off-Duty'),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    onPressed: _confirmAndStartWork,
                    icon: const Icon(Icons.play_circle_filled_rounded, size: 16),
                    label: Text(
                      hasApps ? 'Close & Proceed to Work' : 'Start Active Work Duty',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF16A34A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 0,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

