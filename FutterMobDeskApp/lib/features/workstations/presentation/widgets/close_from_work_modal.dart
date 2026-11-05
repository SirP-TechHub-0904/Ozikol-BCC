import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/workstation_watcher_service.dart';
import '../../state/workstation_shift_state.dart';

/// Shows the enterprise departure audit modal before exiting At-Work Fullscreen mode.
Future<bool?> showCloseFromWorkModal(BuildContext context, WidgetRef ref) {
  return showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (dialogCtx) => const CloseFromWorkDialog(),
  );
}

class CloseFromWorkDialog extends ConsumerStatefulWidget {
  const CloseFromWorkDialog({super.key});

  @override
  ConsumerState<CloseFromWorkDialog> createState() => _CloseFromWorkDialogState();
}

class _CloseFromWorkDialogState extends ConsumerState<CloseFromWorkDialog> {
  final List<String> _reasons = [
    'Shift Ended (Daily Dismissal)',
    'Lunch / Scheduled Rest Break',
    'Off-station Client Meeting / Errand',
    'Personal / Medical Emergency',
    'Network / Hardware Interruption',
    'Other Temporary Disconnection',
  ];

  late String _selectedReason;
  final TextEditingController _notesCtrl = TextEditingController();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _selectedReason = _reasons.first;
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  String _formatHM(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    return '${h.toString().padLeft(2, '0')} hrs ${m.toString().padLeft(2, '0')} mins';
  }

  Future<void> _handleSubmit() async {
    setState(() => _isSubmitting = true);
    try {
      ref.read(workstationWatcherProvider).stopGuarding(reason: _selectedReason);
      await ref.read(workstationShiftProvider.notifier).closeFromWork(
            reason: _selectedReason,
            notes: _notesCtrl.text.trim(),
          );
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final shiftState = ref.watch(workstationShiftProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bgColor = isDark ? const Color(0xFF1E293B) : Colors.white;
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final textPrimary = isDark ? Colors.white : const Color(0xFF0F172A);
    final textSecondary = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

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
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.logout_rounded,
                      color: Color(0xFFDC2626),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Close From Work',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: textPrimary,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Conclude or pause active shift and record departure audit',
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
                    onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(false),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Shift Metric Snapshot Box
              Container(
                padding: const EdgeInsets.all(14),
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
                          Text('GROSS SPAN', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: textSecondary)),
                          const SizedBox(height: 4),
                          Text(
                            _formatHM(shiftState.grossDuration),
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: textPrimary),
                          ),
                        ],
                      ),
                    ),
                    Container(width: 1, height: 32, color: borderColor),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('INACTIVE / BREAK', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: textSecondary)),
                          const SizedBox(height: 4),
                          Text(
                            '${shiftState.breakMinutesTaken + shiftState.midShiftClosureMinutes} mins',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFFDC2626)),
                          ),
                        ],
                      ),
                    ),
                    Container(width: 1, height: 32, color: borderColor),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('NET WORK HOURS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: textSecondary)),
                          const SizedBox(height: 4),
                          Text(
                            _formatHM(shiftState.netEffectiveDuration),
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF16A34A)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Departure Reason
              Text(
                'DEPARTURE REASON',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: textSecondary, letterSpacing: 0.4),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: borderColor),
                  color: isDark ? const Color(0xFF0F172A) : Colors.white,
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedReason,
                    isExpanded: true,
                    dropdownColor: bgColor,
                    icon: const Icon(Icons.arrow_drop_down_rounded),
                    items: _reasons.map((r) {
                      return DropdownMenuItem(
                        value: r,
                        child: Text(
                          r,
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: textPrimary),
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedReason = val);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Optional Notes
              Text(
                'DEPARTURE NOTES (OPTIONAL)',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: textSecondary, letterSpacing: 0.4),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _notesCtrl,
                maxLines: 2,
                style: TextStyle(fontSize: 13, color: textPrimary),
                decoration: InputDecoration(
                  hintText: 'e.g., Concluding daily duties, clocked off for lunch...',
                  hintStyle: TextStyle(fontSize: 12.5, color: textSecondary.withAlpha(150)),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF0F172A) : Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: borderColor)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: borderColor)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFDC2626))),
                ),
              ),
              const SizedBox(height: 16),

              // Explanatory Note
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Icon(Icons.info_outline_rounded, color: Color(0xFFDC2626), size: 16),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Closing work exits fullscreen mode and unlocks standard desktop controls. You can click "Resume Work" anytime on the workstation dashboard to return to active logging.',
                        style: TextStyle(fontSize: 11.5, color: Color(0xFF991B1B), height: 1.3),
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
                    onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: textPrimary,
                      side: BorderSide(color: borderColor),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Continue Working'),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    onPressed: _isSubmitting ? null : _handleSubmit,
                    icon: _isSubmitting
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.stop_circle_rounded, size: 16),
                    label: Text(_isSubmitting ? 'Recording...' : 'Confirm & Close From Work'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFDC2626),
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
