import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/workstation_watcher_service.dart';
import '../../state/workstation_shift_state.dart';

/// Shows the Break Selection Modal before entering Break Mode.
Future<bool?> showTakeBreakModal(BuildContext context, WidgetRef ref) {
  return showDialog<bool>(
    context: context,
    barrierDismissible: true,
    builder: (dialogCtx) => const TakeBreakDialog(),
  );
}

class TakeBreakDialog extends ConsumerStatefulWidget {
  const TakeBreakDialog({super.key});

  @override
  ConsumerState<TakeBreakDialog> createState() => _TakeBreakDialogState();
}

class _TakeBreakDialogState extends ConsumerState<TakeBreakDialog> {
  String _selectedType = 'Lunch Break';

  final List<Map<String, dynamic>> _breakTypes = [
    {
      'title': 'Lunch Break',
      'duration': '45 – 60 mins',
      'desc': 'Mid-shift meal & sustained personal rest',
      'icon': Icons.restaurant_rounded,
    },
    {
      'title': 'Coffee / Short Rest',
      'duration': '15 mins',
      'desc': 'Quick refreshment, eye rest, or stretch',
      'icon': Icons.coffee_rounded,
    },
    {
      'title': 'Personal Errand / Bio Break',
      'duration': 'Flexible',
      'desc': 'Brief step away from workstation',
      'icon': Icons.directions_walk_rounded,
    },
  ];

  Future<void> _handleStartBreak() async {
    Navigator.of(context).pop(true);
    // Pause watcher background process killer during break
    ref.read(workstationWatcherProvider).isBreakActive = true;
    // Enter break mode and release fullscreen
    await ref.read(workstationShiftProvider.notifier).startBreak(breakType: _selectedType);
  }

  @override
  Widget build(BuildContext context) {
    final shiftState = ref.watch(workstationShiftProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bgColor = isDark ? const Color(0xFF1E293B) : Colors.white;
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final textPrimary = isDark ? Colors.white : const Color(0xFF0F172A);
    final textSecondary = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    final allowanceMins = 45;
    final takenMins = shiftState.breakMinutesTaken;
    final remainingMins = (allowanceMins - takenMins).clamp(0, allowanceMins);

    return Dialog(
      backgroundColor: bgColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 24,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 540),
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
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.coffee_rounded,
                      color: Color(0xFFD97706),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Take a Workstation Break',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: textPrimary,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Pause active shift logging & unlock desktop for personal activities.',
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
              const SizedBox(height: 18),

              // Break Allowance Metric Strip
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: borderColor),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('DAILY ALLOWANCE', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: textSecondary)),
                          const SizedBox(height: 2),
                          Text('$allowanceMins mins', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: textPrimary)),
                        ],
                      ),
                    ),
                    Container(width: 1, height: 28, color: borderColor),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('TAKEN TODAY', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: textSecondary)),
                          const SizedBox(height: 2),
                          Text('$takenMins mins', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFFD97706))),
                        ],
                      ),
                    ),
                    Container(width: 1, height: 28, color: borderColor),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('REMAINING', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: textSecondary)),
                          const SizedBox(height: 2),
                          Text('$remainingMins mins', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF16A34A))),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Break Type Cards
              Text(
                'SELECT BREAK TYPE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: textSecondary, letterSpacing: 0.4),
              ),
              const SizedBox(height: 8),

              ...List.generate(_breakTypes.length, (idx) {
                final item = _breakTypes[idx];
                final isSelected = _selectedType == item['title'];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: InkWell(
                    onTap: () => setState(() => _selectedType = item['title'] as String),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? (isDark ? const Color(0xFFD97706).withAlpha(40) : const Color(0xFFFFFBEB))
                            : (isDark ? const Color(0xFF0F172A) : Colors.white),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? const Color(0xFFD97706) : borderColor,
                          width: isSelected ? 1.6 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFFFEF3C7) : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              item['icon'] as IconData,
                              size: 18,
                              color: isSelected ? const Color(0xFFD97706) : textSecondary,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      item['title'] as String,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: isSelected ? const Color(0xFFB45309) : textPrimary,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        item['duration'] as String,
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: textSecondary),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  item['desc'] as String,
                                  style: TextStyle(fontSize: 11.5, color: textSecondary),
                                ),
                              ],
                            ),
                          ),
                          Icon(
                            isSelected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                            size: 18,
                            color: isSelected ? const Color(0xFFD97706) : textSecondary.withAlpha(120),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),

              const SizedBox(height: 10),

              // Freedom Explanation Alert
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Icon(Icons.info_outline_rounded, color: Color(0xFF2563EB), size: 16),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'During your break, the desktop window leaves fullscreen mode and unlocks minimize controls. You can freely open any personal browser, app, or step away.',
                        style: TextStyle(fontSize: 11.5, color: Color(0xFF1D4ED8), height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

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
                    child: const Text('Cancel / Stay at Work'),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    onPressed: _handleStartBreak,
                    icon: const Icon(Icons.coffee_rounded, size: 16),
                    label: const Text('Start Break & Unlock Desktop', style: TextStyle(fontWeight: FontWeight.w700)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD97706),
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
