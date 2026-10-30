import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/localization/language_provider.dart';
import '../services/workstation_watcher_service.dart';

/// <summary>
/// Workstation & Application Gatekeeper Screen (bcp-workspace).
/// Displays live station monitoring status, approved corporate apps launcher grid,
/// document directory sandboxing status, and access request modal.
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
  bool _isSubmitting = false;

  @override
  void dispose() {
    _requestAppCtrl.dispose();
    _requestReasonCtrl.dispose();
    super.dispose();
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
            // 1. Breadcrumbs & Title
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
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'workstation.title'.tr(ref, fallback: 'Workstation Gatekeeper & App Launcher'),
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
                        fallback: 'Enforced enterprise workspace. Only approved company applications and sandboxed documents may run on this PC.',
                      ),
                      style: TextStyle(fontSize: 13, color: textSecondary),
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: () => _openRequestDialog(context),
                  icon: const Icon(Icons.add_moderator_rounded, size: 16),
                  label: Text('workstation.request_btn'.tr(ref, fallback: 'Request App Access')),
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

            // 2. Workstation Status Banner Card
            Container(
              padding: const EdgeInsets.all(18),
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
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: const Icon(Icons.verified_user_rounded, color: Color(0xFF16A34A), size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              machineName,
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: textPrimary),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFDCFCE7),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'STATION GUARD ACTIVE',
                                style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF15803D)),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Approved Folder: ${watcher.approvedDirectory} • USB Storage: ${watcher.blockUsbStorage ? "Blocked" : "Allowed"}',
                          style: TextStyle(fontSize: 12, color: textSecondary),
                        ),
                      ],
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => _openLocalFolder(watcher.approvedDirectory),
                    icon: const Icon(Icons.folder_open_rounded, size: 16),
                    label: const Text('Open Work Folder'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: Color(0xFFBFDBFE)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 3. Section Title: Approved Applications
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
                  '${watcher.rules.length} Authorized Tools',
                  style: TextStyle(fontSize: 12, color: textSecondary, fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 4. Launcher Grid
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

  Widget _buildDefaultLauncherGrid(
    BuildContext context,
    WorkstationWatcherService watcher,
    bool isDark,
    Color surfaceColor,
    Color borderColor,
    Color textPrimary,
    Color textSecondary,
  ) {
    // Standard offline presets when server list hasn't resolved
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
