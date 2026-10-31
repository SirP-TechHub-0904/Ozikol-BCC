import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../state/workstation_shift_state.dart';

/// Models an active user-facing process running on the host OS.
class DetectedRunningApp {
  final String processName;
  final String displayName;
  final IconData icon;

  const DetectedRunningApp({
    required this.processName,
    required this.displayName,
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

  static const Set<String> _systemBypass = {
    'system idle process', 'system', 'secure system', 'registry', 'smss.exe', 'csrss.exe',
    'wininit.exe', 'winlogon.exe', 'services.exe', 'lsaiso.exe', 'lsass.exe', 'fontdrvhost.exe',
    'svchost.exe', 'wudfhost.exe', 'dwm.exe', 'spoolsv.exe', 'wmiprvse.exe', 'taskhostw.exe',
    'applicationframehost.exe', 'searchindexer.exe', 'sihost.exe', 'ctfmon.exe', 'explorer.exe',
    'cmd.exe', 'powershell.exe', 'conhost.exe', 'openconsole.exe', 'tasklist.exe', 'taskkill.exe',
    'dart.exe', 'dartvm.exe', 'dartaotruntime.exe', 'flutter.exe', 'ozikol_app.exe', 'ozikol.exe',
    'ozikol.central.exe', 'ozikol-bcc.api.exe', 'antigravity ide.exe', 'antigravity.exe', 'agy.exe',
    'node.exe', 'esbuild.exe', 'git.exe', 'dotnet.exe', 'onedrive.exe', 'onedrive.sync.service.exe',
    'adskflex.exe', 'adb.exe', 'crash_handler.exe', 'plugin_host-3.14.exe', 'epdservice.exe',
    'epdctrl.exe', 'wtabletserviceisd.exe', 'intelcphdpsvc.exe', 'igfxcuiservicen.exe',
    'vmms.exe', 'vmcompute.exe', 'mdnsresponder.exe', 'dax3api.exe', 'fnplicensingservice.exe',
    'fnplicensingservice64.exe', 'fmservice64.exe', 'hpprintscandoctorservice.exe', 'ibmpmsvc.exe',
    'lenovo.modern.imcontroller.exe', 'managerservice.exe', 'licenseservice.exe',
    'endpointservice.exe', 'intelaudioservice.exe', 'esif_uf.exe', 'servicehub.host.extensibility.x64.exe',
    'devhub.exe', 'useroobebroker.exe', 'officeclicktorun.exe', 'appvshnotify.exe', 'litssvc.exe'
  };

  @override
  void initState() {
    super.initState();
    _scanRunningApplications();
  }

  DetectedRunningApp _mapProcessToApp(String proc) {
    final lower = proc.toLowerCase().trim();
    switch (lower) {
      case 'sublime_text.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Sublime Text Editor', icon: Icons.code_rounded);
      case 'chrome.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Google Chrome', icon: Icons.public_rounded);
      case 'msedge.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Microsoft Edge', icon: Icons.public_rounded);
      case 'firefox.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Mozilla Firefox', icon: Icons.public_rounded);
      case 'brave.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Brave Browser', icon: Icons.public_rounded);
      case 'snippingtool.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Windows Snipping Tool', icon: Icons.content_cut_rounded);
      case 'whatsapp.exe':
        return DetectedRunningApp(processName: proc, displayName: 'WhatsApp Desktop', icon: Icons.chat_bubble_outline_rounded);
      case 'telegram.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Telegram Messenger', icon: Icons.send_rounded);
      case 'discord.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Discord', icon: Icons.sports_esports_rounded);
      case 'spotify.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Spotify Music', icon: Icons.music_note_rounded);
      case 'steam.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Steam Game Client', icon: Icons.games_rounded);
      case 'winword.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Microsoft Word', icon: Icons.description_rounded);
      case 'excel.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Microsoft Excel', icon: Icons.table_chart_rounded);
      case 'powerpnt.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Microsoft PowerPoint', icon: Icons.slideshow_rounded);
      case 'notepad.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Windows Notepad', icon: Icons.notes_rounded);
      case 'vlc.exe':
        return DetectedRunningApp(processName: proc, displayName: 'VLC Media Player', icon: Icons.play_circle_outline_rounded);
      case 'zoom.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Zoom Meetings', icon: Icons.videocam_rounded);
      case 'teams.exe':
        return DetectedRunningApp(processName: proc, displayName: 'Microsoft Teams', icon: Icons.groups_rounded);
      default:
        // Format e.g. "my_app.exe" -> "My App"
        final cleanName = proc.replaceAll(RegExp(r'\.exe$', caseSensitive: false), '');
        return DetectedRunningApp(
          processName: proc,
          displayName: cleanName[0].toUpperCase() + cleanName.substring(1),
          icon: Icons.apps_rounded,
        );
    }
  }

  Future<void> _scanRunningApplications() async {
    setState(() => _isScanning = true);
    final Set<String> seen = {};
    final List<DetectedRunningApp> apps = [];

    if (!kIsWeb && Platform.isWindows) {
      try {
        final result = await Process.run('tasklist', ['/FO', 'CSV', '/NH']);
        if (result.exitCode == 0) {
          final lines = result.stdout.toString().split('\n');
          for (final line in lines) {
            final trimmed = line.trim();
            if (trimmed.isEmpty) continue;
            final parts = trimmed.split('","');
            if (parts.isEmpty) continue;

            final procName = parts[0].replaceAll('"', '').trim();
            final procLower = procName.toLowerCase();

            if (_systemBypass.contains(procLower)) continue;
            if (seen.contains(procLower)) continue;

            seen.add(procLower);
            apps.add(_mapProcessToApp(procName));
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
                              '${_detectedApps.length} Open Application(s) Detected',
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
                                          Text(
                                            app.processName,
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontFamily: 'monospace',
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

