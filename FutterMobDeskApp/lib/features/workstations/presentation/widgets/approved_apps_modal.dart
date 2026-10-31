import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:window_manager/window_manager.dart';
import '../../services/workstation_watcher_service.dart';

/// Models an approved application entry.
class ApprovedAppEntry {
  final String displayName;
  final String processName;
  final String category;
  final IconData icon;
  final bool isTemporary;

  const ApprovedAppEntry({
    required this.displayName,
    required this.processName,
    required this.category,
    required this.icon,
    this.isTemporary = false,
  });
}

/// Models an installed Windows system program detected on the computer.
class InstalledSystemApp {
  final String name;
  final String processName;
  final IconData icon;

  const InstalledSystemApp({
    required this.name,
    required this.processName,
    required this.icon,
  });
}

/// Models a pending compliance exemption request.
class PendingAppRequestItem {
  final String displayName;
  final String processName;
  final String reason;
  final DateTime requestedAt;

  const PendingAppRequestItem({
    required this.displayName,
    required this.processName,
    required this.reason,
    required this.requestedAt,
  });
}

/// Displays the Approved Applications modal allowing employee to launch authorized tools.
Future<void> showApprovedAppsModal(BuildContext context, WidgetRef ref) {
  return showDialog<void>(
    context: context,
    barrierDismissible: true,
    builder: (ctx) => const ApprovedAppsDialog(),
  );
}

class ApprovedAppsDialog extends ConsumerStatefulWidget {
  const ApprovedAppsDialog({super.key});

  @override
  ConsumerState<ApprovedAppsDialog> createState() => _ApprovedAppsDialogState();
}

class _ApprovedAppsDialogState extends ConsumerState<ApprovedAppsDialog> {
  final TextEditingController _searchCtrl = TextEditingController();
  final TextEditingController _customReasonCtrl = TextEditingController();

  String _currentTab = 'approved'; // 'approved' | 'pending' | 'installed'
  String _searchQuery = '';

  bool _isLoadingInstalled = false;
  List<InstalledSystemApp> _installedApps = [];

  // Local state of pending requests submitted during this session
  final List<PendingAppRequestItem> _pendingRequests = [];

  // Standard fallback corporate presets
  static const List<ApprovedAppEntry> _defaultApprovedPresets = [
    ApprovedAppEntry(
      displayName: 'Google Chrome Enterprise',
      processName: 'chrome.exe',
      category: 'Web Browsers',
      icon: Icons.public_rounded,
    ),
    ApprovedAppEntry(
      displayName: 'Microsoft Edge',
      processName: 'msedge.exe',
      category: 'Web Browsers',
      icon: Icons.language_rounded,
    ),
    ApprovedAppEntry(
      displayName: 'Microsoft Excel',
      processName: 'excel.exe',
      category: 'Productivity',
      icon: Icons.table_chart_rounded,
    ),
    ApprovedAppEntry(
      displayName: 'Microsoft Word',
      processName: 'winword.exe',
      category: 'Productivity',
      icon: Icons.description_rounded,
    ),
    ApprovedAppEntry(
      displayName: 'Microsoft PowerPoint',
      processName: 'powerpnt.exe',
      category: 'Productivity',
      icon: Icons.slideshow_rounded,
    ),
    ApprovedAppEntry(
      displayName: 'Adobe Acrobat PDF',
      processName: 'acrord32.exe',
      category: 'Productivity',
      icon: Icons.picture_as_pdf_rounded,
    ),
    ApprovedAppEntry(
      displayName: 'Microsoft Teams',
      processName: 'ms-teams.exe',
      category: 'Communication',
      icon: Icons.groups_rounded,
    ),
    ApprovedAppEntry(
      displayName: 'Zoom Workplace',
      processName: 'zoom.exe',
      category: 'Communication',
      icon: Icons.video_camera_front_rounded,
    ),
    ApprovedAppEntry(
      displayName: 'Windows Calculator',
      processName: 'calc.exe',
      category: 'Utilities',
      icon: Icons.calculate_rounded,
    ),
    ApprovedAppEntry(
      displayName: 'Windows Notepad',
      processName: 'notepad.exe',
      category: 'Utilities',
      icon: Icons.edit_note_rounded,
    ),
  ];

  static const List<InstalledSystemApp> _builtInWindowsAccessories = [
    InstalledSystemApp(name: 'Windows Calculator', processName: 'calc.exe', icon: Icons.calculate_rounded),
    InstalledSystemApp(name: 'Windows Notepad', processName: 'notepad.exe', icon: Icons.edit_note_rounded),
    InstalledSystemApp(name: 'Paint', processName: 'mspaint.exe', icon: Icons.palette_rounded),
    InstalledSystemApp(name: 'Snipping Tool', processName: 'SnippingTool.exe', icon: Icons.content_cut_rounded),
    InstalledSystemApp(name: 'Windows Terminal', processName: 'WindowsTerminal.exe', icon: Icons.terminal_rounded),
    InstalledSystemApp(name: 'Remote Desktop Connection', processName: 'mstsc.exe', icon: Icons.desktop_windows_rounded),
    InstalledSystemApp(name: 'WordPad', processName: 'wordpad.exe', icon: Icons.article_rounded),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(workstationWatcherProvider).refreshPolicies();
      _scanInstalledWindowsApps();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _customReasonCtrl.dispose();
    super.dispose();
  }

  IconData _resolveIcon(String processName) {
    final lower = processName.toLowerCase();
    if (lower.contains('chrome') || lower.contains('edge') || lower.contains('browser')) {
      return Icons.public_rounded;
    }
    if (lower.contains('excel') || lower.contains('sheet')) {
      return Icons.table_chart_rounded;
    }
    if (lower.contains('word') || lower.contains('doc')) {
      return Icons.description_rounded;
    }
    if (lower.contains('powerpnt') || lower.contains('slide')) {
      return Icons.slideshow_rounded;
    }
    if (lower.contains('teams') || lower.contains('chat') || lower.contains('slack') || lower.contains('zoom') || lower.contains('whatsapp')) {
      return Icons.forum_rounded;
    }
    if (lower.contains('calc')) {
      return Icons.calculate_rounded;
    }
    if (lower.contains('code') || lower.contains('devenv') || lower.contains('studio') || lower.contains('terminal')) {
      return Icons.terminal_rounded;
    }
    if (lower.contains('pdf') || lower.contains('acrobat')) {
      return Icons.picture_as_pdf_rounded;
    }
    if (lower.contains('photoshop') || lower.contains('figma') || lower.contains('canva') || lower.contains('blend')) {
      return Icons.brush_rounded;
    }
    return Icons.apps_rounded;
  }

  /// Scans Windows Start Menu shortcuts and installed executables using fast PowerShell script (< 0.5s)
  Future<void> _scanInstalledWindowsApps() async {
    if (!Platform.isWindows) {
      setState(() => _installedApps = _builtInWindowsAccessories);
      return;
    }

    setState(() => _isLoadingInstalled = true);

    try {
      final res = await Process.run(
        'powershell',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          r"& { $sh = New-Object -ComObject WScript.Shell; $p1 = Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs'; $p2 = Join-Path $env:AppData 'Microsoft\Windows\Start Menu\Programs'; Get-ChildItem -Path @($p1, $p2) -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object { $t = $sh.CreateShortcut($_.FullName).TargetPath; if ($t -and $t.EndsWith('.exe')) { [PSCustomObject]@{ Name = $_.BaseName; Exe = Split-Path $t -Leaf } } } | Group-Object Exe | ForEach-Object { $_.Group[0] } | ConvertTo-Json -Compress }",
        ],
      ).timeout(const Duration(seconds: 4));

      final Map<String, InstalledSystemApp> map = {};

      // 1. Add built-in accessories first
      for (final acc in _builtInWindowsAccessories) {
        map[acc.processName.toLowerCase()] = acc;
      }

      // 2. Parse detected Start Menu installed apps
      if (res.exitCode == 0) {
        final raw = res.stdout.toString().trim();
        if (raw.isNotEmpty) {
          final dynamic decoded = jsonDecode(raw);
          final List list = decoded is List ? decoded : [decoded];
          for (final item in list) {
            final name = item['Name']?.toString().trim() ?? '';
            final exe = item['Exe']?.toString().trim() ?? '';
            if (name.isNotEmpty && exe.toLowerCase().endsWith('.exe')) {
              map[exe.toLowerCase()] = InstalledSystemApp(
                name: name,
                processName: exe,
                icon: _resolveIcon(exe),
              );
            }
          }
        }
      }

      final sorted = map.values.toList()
        ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

      if (mounted) {
        setState(() {
          _installedApps = sorted;
          _isLoadingInstalled = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _installedApps = _builtInWindowsAccessories;
          _isLoadingInstalled = false;
        });
      }
    }
  }

  /// Opens native Windows file dialog to browse for any custom executable (.exe)
  Future<void> _browseForExeFile() async {
    if (!Platform.isWindows) return;
    try {
      final res = await Process.run('powershell', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Add-Type -AssemblyName System.Windows.Forms; \$f = New-Object System.Windows.Forms.OpenFileDialog; \$f.Filter = "Executable Files (*.exe)|*.exe"; \$f.Title = "Select Application Executable"; if (\$f.ShowDialog() -eq "OK") { \$f.FileName }',
      ]);

      if (res.exitCode == 0) {
        final path = res.stdout.toString().trim();
        if (path.isNotEmpty && path.toLowerCase().endsWith('.exe')) {
          final exeName = path.split(RegExp(r'[\\/]')).last;
          final cleanName = exeName.replaceAll(RegExp(r'\.exe$', caseSensitive: false), '');
          if (!mounted) return;
          _showRequestConfirmationDialog(InstalledSystemApp(
            name: cleanName,
            processName: exeName,
            icon: Icons.extension_rounded,
          ));
        }
      }
    } catch (_) {}
  }

  List<ApprovedAppEntry> _compileApprovedList(WorkstationWatcherService watcher) {
    final Map<String, ApprovedAppEntry> map = {};

    for (final rule in watcher.rules) {
      if (!rule.isAllowed) continue;
      final proc = rule.processName.toLowerCase().trim();
      map[proc] = ApprovedAppEntry(
        displayName: rule.displayName.isNotEmpty ? rule.displayName : rule.processName,
        processName: rule.processName,
        category: rule.category.isNotEmpty ? rule.category : 'General',
        icon: _resolveIcon(rule.processName),
      );
    }

    for (final temp in watcher.temporaryApprovals) {
      final proc = temp.toLowerCase().trim();
      if (!map.containsKey(proc)) {
        map[proc] = ApprovedAppEntry(
          displayName: proc,
          processName: proc,
          category: 'Temporary Exemption',
          icon: _resolveIcon(proc),
          isTemporary: true,
        );
      }
    }

    if (map.isEmpty) {
      for (final def in _defaultApprovedPresets) {
        map[def.processName.toLowerCase()] = def;
      }
    }

    return map.values.where((app) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return app.displayName.toLowerCase().contains(q) ||
             app.processName.toLowerCase().contains(q) ||
             app.category.toLowerCase().contains(q);
    }).toList();
  }

  bool _isAlreadyApproved(String processName, WorkstationWatcherService watcher) {
    final clean = processName.toLowerCase().trim();
    if (watcher.temporaryApprovals.contains(clean)) return true;
    return watcher.rules.any((r) => r.isAllowed && r.processName.toLowerCase().trim() == clean);
  }

  bool _isAlreadyPending(String processName) {
    final clean = processName.toLowerCase().trim();
    return _pendingRequests.any((p) => p.processName.toLowerCase().trim() == clean);
  }

  Future<void> _launchApp(ApprovedAppEntry app) async {
    final watcher = ref.read(workstationWatcherProvider);
    final messenger = ScaffoldMessenger.of(context);
    Navigator.of(context).pop();

    // If workstation is in exclusive fullscreen mode, exit fullscreen to maximized
    // so the newly launched external application window is visible in front of the user.
    if (Platform.isWindows || Platform.isMacOS || Platform.isLinux) {
      try {
        await windowManager.setAlwaysOnTop(false);
        if (await windowManager.isFullScreen()) {
          await windowManager.setFullScreen(false);
        }
      } catch (_) {}
    }

    final success = await watcher.launchApprovedApp(
      app.processName,
      displayName: app.displayName,
    );

    messenger.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              success ? Icons.rocket_launch_rounded : Icons.warning_amber_rounded,
              color: Colors.white,
              size: 16,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                success
                    ? 'Opened ${app.displayName} (${app.processName}).'
                    : 'Could not find ${app.displayName} (${app.processName}) installed on this PC.',
              ),
            ),
          ],
        ),
        backgroundColor: success ? const Color(0xFF16A34A) : const Color(0xFFD97706),
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showRequestConfirmationDialog(InstalledSystemApp app) {
    _customReasonCtrl.clear();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: Row(
          children: [
            const Icon(Icons.verified_user_rounded, color: Color(0xFF2563EB), size: 22),
            const SizedBox(width: 10),
            const Text('Request Application Approval', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Program: ${app.name}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            Text('Executable: ${app.processName}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontFamily: 'monospace')),
            const SizedBox(height: 14),
            const Text('Work Justification (Optional):', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            TextField(
              controller: _customReasonCtrl,
              decoration: const InputDecoration(
                hintText: 'e.g. Needed for design review, client spreadsheet...',
                isDense: true,
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await _submitApprovalTicket(app.name, app.processName, _customReasonCtrl.text.trim());
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
            ),
            child: const Text('Submit Request'),
          ),
        ],
      ),
    );
  }

  Future<void> _submitApprovalTicket(String displayName, String processName, String reason) async {
    final watcher = ref.read(workstationWatcherProvider);
    final cleanProc = processName.toLowerCase().trim();

    // 1. Submit ticket to server
    await watcher.requestAccess(
      cleanProc,
      reason.isNotEmpty ? reason : 'Requested access for $displayName',
    );

    // 2. Grant session exemption for testing/demo
    watcher.grantTemporaryApproval(cleanProc);

    // 3. Track in local pending list
    setState(() {
      _pendingRequests.add(PendingAppRequestItem(
        displayName: displayName,
        processName: cleanProc,
        reason: reason.isNotEmpty ? reason : 'Compliance exemption requested',
        requestedAt: DateTime.now(),
      ));
      _currentTab = 'pending';
    });

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Approval request submitted for $displayName. Ticket sent to Admin Web Console.'),
        backgroundColor: const Color(0xFF4338CA),
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF0F172A) : Colors.white;
    final surfaceColor = isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC);
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final textPrimary = isDark ? Colors.white : const Color(0xFF0F172A);
    final textSecondary = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    final watcher = ref.watch(workstationWatcherProvider);
    final approvedList = _compileApprovedList(watcher);

    // Filter installed apps by search
    final filteredInstalled = _installedApps.where((app) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return app.name.toLowerCase().contains(q) || app.processName.toLowerCase().contains(q);
    }).toList();

    return Dialog(
      backgroundColor: bgColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 24,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 780, maxHeight: 720),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: const Icon(
                      Icons.apps_rounded,
                      color: Color(0xFF2563EB),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Workstation Applications & Governance',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: textPrimary,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'Launch authorized software, track pending approvals, or pick any installed PC program to request access.',
                          style: TextStyle(fontSize: 12.5, color: textSecondary),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded, size: 20),
                    color: textSecondary,
                    tooltip: 'Close',
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 3 Navigation Tabs
              Container(
                decoration: BoxDecoration(
                  color: surfaceColor,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: borderColor),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    Expanded(
                      child: _buildNavTabButton(
                        id: 'approved',
                        title: 'Approved Apps',
                        count: approvedList.length,
                        icon: Icons.verified_user_rounded,
                        activeColor: const Color(0xFF16A34A),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: _buildNavTabButton(
                        id: 'pending',
                        title: 'Pending Approvals',
                        count: _pendingRequests.length,
                        icon: Icons.hourglass_top_rounded,
                        activeColor: const Color(0xFFD97706),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: _buildNavTabButton(
                        id: 'installed',
                        title: 'Request from PC Apps',
                        count: _installedApps.length,
                        icon: Icons.add_circle_outline_rounded,
                        activeColor: const Color(0xFF2563EB),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Search Box & Actions Row
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      onChanged: (val) => setState(() => _searchQuery = val.trim()),
                      decoration: InputDecoration(
                        hintText: _currentTab == 'installed'
                            ? 'Search installed software on this computer (e.g. Photoshop, VS Code)...'
                            : 'Search applications...',
                        hintStyle: TextStyle(fontSize: 13, color: textSecondary),
                        prefixIcon: const Icon(Icons.search_rounded, size: 18),
                        isDense: true,
                        filled: true,
                        fillColor: surfaceColor,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: borderColor),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: borderColor),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                        ),
                      ),
                    ),
                  ),
                  if (_currentTab == 'installed') ...[
                    const SizedBox(width: 10),
                    OutlinedButton.icon(
                      onPressed: _browseForExeFile,
                      icon: const Icon(Icons.folder_open_rounded, size: 16),
                      label: const Text('Browse .exe...'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: textPrimary,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 14),

              // Content Area
              Expanded(
                child: _buildCurrentTabContent(
                  approvedList: approvedList,
                  filteredInstalled: filteredInstalled,
                  watcher: watcher,
                  isDark: isDark,
                  surfaceColor: surfaceColor,
                  borderColor: borderColor,
                  textPrimary: textPrimary,
                  textSecondary: textSecondary,
                ),
              ),

              const SizedBox(height: 14),
              // Footer
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _currentTab == 'approved'
                        ? '${approvedList.length} approved app(s) ready to open'
                        : _currentTab == 'pending'
                            ? '${_pendingRequests.length} request(s) awaiting manager decision'
                            : '${_installedApps.length} programs detected on this computer',
                    style: TextStyle(fontSize: 11.5, color: textSecondary),
                  ),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text('Close', style: TextStyle(color: textSecondary, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavTabButton({
    required String id,
    required String title,
    required int count,
    required IconData icon,
    required Color activeColor,
  }) {
    final isActive = _currentTab == id;
    return InkWell(
      onTap: () => setState(() => _currentTab = id),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
        decoration: BoxDecoration(
          color: isActive ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isActive ? [const BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 1))] : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: isActive ? activeColor : const Color(0xFF64748B)),
            const SizedBox(width: 6),
            Text(
              title,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
                color: isActive ? const Color(0xFF0F172A) : const Color(0xFF64748B),
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(
                color: isActive ? activeColor.withValues(alpha: 0.15) : const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  color: isActive ? activeColor : const Color(0xFF64748B),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentTabContent({
    required List<ApprovedAppEntry> approvedList,
    required List<InstalledSystemApp> filteredInstalled,
    required WorkstationWatcherService watcher,
    required bool isDark,
    required Color surfaceColor,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
  }) {
    // TAB 1: APPROVED APPS
    if (_currentTab == 'approved') {
      if (approvedList.isEmpty) {
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.search_off_rounded, size: 40, color: textSecondary),
              const SizedBox(height: 8),
              Text('No approved applications match your filter.', style: TextStyle(color: textSecondary, fontSize: 13)),
            ],
          ),
        );
      }

      return ListView.separated(
        itemCount: approvedList.length,
        separatorBuilder: (context, index) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final app = approvedList[i];
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(app.icon, color: const Color(0xFF2563EB), size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            app.displayName,
                            style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: textPrimary),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: app.isTemporary ? const Color(0xFFFEF3C7) : const Color(0xFFDCFCE7),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: app.isTemporary ? const Color(0xFFFCD34D) : const Color(0xFFBBF7D0)),
                            ),
                            child: Text(
                              app.isTemporary ? 'TEMPORARY' : 'APPROVED',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: app.isTemporary ? const Color(0xFFB45309) : const Color(0xFF15803D),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${app.processName}  •  ${app.category}',
                        style: TextStyle(fontSize: 11.5, color: textSecondary, fontFamily: 'monospace'),
                      ),
                    ],
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: () => _launchApp(app),
                  icon: const Icon(Icons.rocket_launch_rounded, size: 14),
                  label: const Text('Open App'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF16A34A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 0,
                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          );
        },
      );
    }

    // TAB 2: PENDING APPROVALS
    if (_currentTab == 'pending') {
      if (_pendingRequests.isEmpty) {
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.task_alt_rounded, size: 44, color: Color(0xFF16A34A)),
              const SizedBox(height: 10),
              Text('No Pending Requests', style: TextStyle(color: textPrimary, fontSize: 14, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(
                'When you request access to any installed app, it will appear here awaiting admin decision.',
                style: TextStyle(color: textSecondary, fontSize: 12.5),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 14),
              ElevatedButton.icon(
                onPressed: () => setState(() => _currentTab = 'installed'),
                icon: const Icon(Icons.search_rounded, size: 16),
                label: const Text('Browse Installed Apps to Request'),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white),
              ),
            ],
          ),
        );
      }

      return ListView.separated(
        itemCount: _pendingRequests.length,
        separatorBuilder: (context, index) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final req = _pendingRequests[i];
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.hourglass_top_rounded, color: Color(0xFFD97706), size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(req.displayName, style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: textPrimary)),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: const Color(0xFFFCD34D)),
                            ),
                            child: const Text('AWAITING ADMIN APPROVAL', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFFB45309))),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text('Reason: ${req.reason}', style: TextStyle(fontSize: 11.5, color: textSecondary)),
                      Text('${req.processName}  •  Submitted just now', style: TextStyle(fontSize: 11, color: textSecondary, fontFamily: 'monospace')),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      );
    }

    // TAB 3: INSTALLED ON THIS PC (PICK TO REQUEST)
    if (_isLoadingInstalled) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 12),
            Text('Scanning installed Windows programs...', style: TextStyle(fontSize: 13, color: textSecondary)),
          ],
        ),
      );
    }

    if (filteredInstalled.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off_rounded, size: 40, color: textSecondary),
            const SizedBox(height: 8),
            Text('No installed programs found matching your search.', style: TextStyle(color: textSecondary, fontSize: 13)),
          ],
        ),
      );
    }

    return ListView.separated(
      itemCount: filteredInstalled.length,
      separatorBuilder: (context, index) => const SizedBox(height: 8),
      itemBuilder: (context, i) {
        final app = filteredInstalled[i];
        final isApproved = _isAlreadyApproved(app.processName, watcher);
        final isPending = _isAlreadyPending(app.processName);

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(app.icon, color: const Color(0xFF2563EB), size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      app.name,
                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: textPrimary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      app.processName,
                      style: TextStyle(fontSize: 11.5, fontFamily: 'monospace', color: textSecondary),
                    ),
                  ],
                ),
              ),
              if (isApproved) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF15803D)),
                      SizedBox(width: 4),
                      Text('Approved', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF15803D))),
                    ],
                  ),
                ),
              ] else if (isPending) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFFCD34D)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.hourglass_top_rounded, size: 14, color: Color(0xFFB45309)),
                      SizedBox(width: 4),
                      Text('Pending Approval', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFFB45309))),
                    ],
                  ),
                ),
              ] else ...[
                ElevatedButton.icon(
                  onPressed: () => _showRequestConfirmationDialog(app),
                  icon: const Icon(Icons.add_task_rounded, size: 14),
                  label: const Text('Request Approval'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 0,
                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
