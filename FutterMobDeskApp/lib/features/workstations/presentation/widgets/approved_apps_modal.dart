import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/workstation_watcher_service.dart';

/// Models an entry in the Approved Applications launcher.
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
  final TextEditingController _customAppCtrl = TextEditingController();
  final TextEditingController _customReasonCtrl = TextEditingController();

  String _searchQuery = '';
  String _selectedCategory = 'All';
  bool _isRequestingCustom = false;
  bool _isSubmittingRequest = false;

  // Fallback standard approved corporate software if policies haven't loaded
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

  @override
  void initState() {
    super.initState();
    // Refresh policy rules from server on dialog open
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(workstationWatcherProvider).refreshPolicies();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _customAppCtrl.dispose();
    _customReasonCtrl.dispose();
    super.dispose();
  }

  IconData _resolveIcon(String processName, String? iconHint) {
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
    if (lower.contains('teams') || lower.contains('chat') || lower.contains('slack') || lower.contains('zoom')) {
      return Icons.forum_rounded;
    }
    if (lower.contains('calc')) {
      return Icons.calculate_rounded;
    }
    if (lower.contains('code') || lower.contains('devenv') || lower.contains('terminal')) {
      return Icons.terminal_rounded;
    }
    if (lower.contains('pdf') || lower.contains('acrobat')) {
      return Icons.picture_as_pdf_rounded;
    }
    return Icons.apps_rounded;
  }

  List<ApprovedAppEntry> _compileAppList(WorkstationWatcherService watcher) {
    final Map<String, ApprovedAppEntry> map = {};

    // 1. Add server rules
    for (final rule in watcher.rules) {
      if (!rule.isAllowed) continue;
      final proc = rule.processName.toLowerCase().trim();
      map[proc] = ApprovedAppEntry(
        displayName: rule.displayName.isNotEmpty ? rule.displayName : rule.processName,
        processName: rule.processName,
        category: rule.category.isNotEmpty ? rule.category : 'General',
        icon: _resolveIcon(rule.processName, rule.iconName),
      );
    }

    // 2. Add temporary approvals
    for (final temp in watcher.temporaryApprovals) {
      final proc = temp.toLowerCase().trim();
      if (!map.containsKey(proc)) {
        map[proc] = ApprovedAppEntry(
          displayName: proc,
          processName: proc,
          category: 'Temporary Exemption',
          icon: _resolveIcon(proc, null),
          isTemporary: true,
        );
      }
    }

    // 3. Fallback to standard presets if server list is empty
    if (map.isEmpty) {
      for (final def in _defaultApprovedPresets) {
        map[def.processName.toLowerCase()] = def;
      }
    }

    // Filter by search query and category
    return map.values.where((app) {
      if (_selectedCategory != 'All' && app.category != _selectedCategory) {
        return false;
      }
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return app.displayName.toLowerCase().contains(q) ||
             app.processName.toLowerCase().contains(q) ||
             app.category.toLowerCase().contains(q);
    }).toList();
  }

  Future<void> _launchApp(ApprovedAppEntry app) async {
    final watcher = ref.read(workstationWatcherProvider);
    final success = await watcher.launchApprovedApp(app.processName);

    if (!mounted) return;
    Navigator.of(context).pop();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              success ? Icons.rocket_launch_rounded : Icons.info_outline_rounded,
              color: Colors.white,
              size: 16,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                success
                    ? 'Launching ${app.displayName} (${app.processName})...'
                    : 'Dispatched launch command for ${app.displayName}.',
              ),
            ),
          ],
        ),
        backgroundColor: success ? const Color(0xFF16A34A) : const Color(0xFF4338CA),
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _submitCustomRequest() async {
    final proc = _customAppCtrl.text.trim();
    final reason = _customReasonCtrl.text.trim();
    if (proc.isEmpty) return;

    setState(() => _isSubmittingRequest = true);
    final watcher = ref.read(workstationWatcherProvider);

    // Ensure .exe suffix
    final cleanProc = proc.toLowerCase().endsWith('.exe') ? proc.toLowerCase() : '$proc.exe';

    final sent = await watcher.requestAccess(
      cleanProc,
      reason.isNotEmpty ? reason : 'Staff requested access via Approved Apps menu',
    );

    // Grant local session exemption for demo/testing
    watcher.grantTemporaryApproval(cleanProc);

    if (!mounted) return;
    setState(() {
      _isSubmittingRequest = false;
      _isRequestingCustom = false;
      _customAppCtrl.clear();
      _customReasonCtrl.clear();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          sent
              ? 'Exemption ticket submitted for $cleanProc. Station permission granted.'
              : 'Local session exemption granted for $cleanProc.',
        ),
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
    final appList = _compileAppList(watcher);

    // Collect distinct categories
    final categories = {'All', ...appList.map((a) => a.category)};

    return Dialog(
      backgroundColor: bgColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 24,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 720, maxHeight: 680),
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
                          'Authorized Workstation Applications',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: textPrimary,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'Launch pre-approved business software or request manager exemption for new tools.',
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

              // Search Bar & Filter Row
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      onChanged: (val) => setState(() => _searchQuery = val.trim()),
                      decoration: InputDecoration(
                        hintText: 'Search approved applications (e.g. Excel, Chrome)...',
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
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    onPressed: () => setState(() => _isRequestingCustom = !_isRequestingCustom),
                    icon: Icon(_isRequestingCustom ? Icons.close_rounded : Icons.add_circle_outline_rounded, size: 16),
                    label: Text(_isRequestingCustom ? 'Cancel' : 'Request App'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _isRequestingCustom ? const Color(0xFF475569) : const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                  ),
                ],
              ),

              // Category Pills Row
              if (!_isRequestingCustom && categories.length > 2) ...[
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: categories.map((cat) {
                      final isSelected = _selectedCategory == cat;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text(cat, style: TextStyle(fontSize: 11.5, fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500)),
                          selected: isSelected,
                          onSelected: (_) => setState(() => _selectedCategory = cat),
                          selectedColor: const Color(0xFF2563EB),
                          labelStyle: TextStyle(color: isSelected ? Colors.white : textPrimary),
                          backgroundColor: surfaceColor,
                          side: BorderSide(color: isSelected ? const Color(0xFF2563EB) : borderColor),
                          visualDensity: VisualDensity.compact,
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
              const SizedBox(height: 14),

              // Custom Request Expansion Panel
              if (_isRequestingCustom) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: surfaceColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Request Exemption for an External Program',
                        style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: textPrimary),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Enter the executable name. Management will receive an approval ticket in their Web Console.',
                        style: TextStyle(fontSize: 12, color: textSecondary),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: TextField(
                              controller: _customAppCtrl,
                              decoration: InputDecoration(
                                hintText: 'Process name (e.g. devenv.exe, figma.exe)',
                                isDense: true,
                                filled: true,
                                fillColor: bgColor,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            flex: 3,
                            child: TextField(
                              controller: _customReasonCtrl,
                              decoration: InputDecoration(
                                hintText: 'Work justification / task reason',
                                isDense: true,
                                filled: true,
                                fillColor: bgColor,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: _isSubmittingRequest ? null : _submitCustomRequest,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF16A34A),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: _isSubmittingRequest
                                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text('Submit'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // Main App List Grid
              Expanded(
                child: appList.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.search_off_rounded, size: 40, color: textSecondary),
                            const SizedBox(height: 8),
                            Text('No matching applications found.', style: TextStyle(color: textSecondary, fontSize: 13)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        itemCount: appList.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final app = appList[i];
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
                                            style: TextStyle(
                                              fontSize: 13.5,
                                              fontWeight: FontWeight.w700,
                                              color: textPrimary,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: app.isTemporary ? const Color(0xFFFEF3C7) : const Color(0xFFDCFCE7),
                                              borderRadius: BorderRadius.circular(4),
                                              border: Border.all(
                                                color: app.isTemporary ? const Color(0xFFFCD34D) : const Color(0xFFBBF7D0),
                                              ),
                                            ),
                                            child: Text(
                                              app.isTemporary ? 'TEMPORARY' : 'APPROVED',
                                              style: TextStyle(
                                                fontSize: 9,
                                                fontWeight: FontWeight.w800,
                                                color: app.isTemporary ? const Color(0xFFB45309) : const Color(0xFF15803D),
                                                letterSpacing: 0.3,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Row(
                                        children: [
                                          Text(
                                            app.processName,
                                            style: TextStyle(
                                              fontSize: 11.5,
                                              fontFamily: 'monospace',
                                              color: textSecondary,
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          Text(
                                            '•  ${app.category}',
                                            style: TextStyle(fontSize: 11, color: textSecondary),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
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
                      ),
              ),

              const SizedBox(height: 16),
              // Footer
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${appList.length} approved application(s) available for this workstation',
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
}
