import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../models/workforce_models.dart';
import '../state/workforce_state.dart';

/// Member Roster & Shifts Screen (`/workforce/workspace/my-shifts`).
/// Allows security guards and staff to view scheduled assignments, inspect
/// Site Assignment Instructions (SIs), confirm shifts, request peer swaps, and submit leave.
class WorkforceRosterScreen extends ConsumerStatefulWidget {
  const WorkforceRosterScreen({super.key});

  @override
  ConsumerState<WorkforceRosterScreen> createState() => _WorkforceRosterScreenState();
}

class _WorkforceRosterScreenState extends ConsumerState<WorkforceRosterScreen> {
  final _dateFormat = DateFormat('EEE, MMM d, yyyy • h:mm a');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(workforceProvider.notifier).loadMyShifts();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workforceProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('My Roster & Shifts', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          TextButton.icon(
            onPressed: () => _showLeaveRequestDialog(context),
            icon: const Icon(Icons.event_busy_rounded, size: 18),
            label: const Text('Request Leave'),
            style: TextButton.styleFrom(foregroundColor: AppColors.primary),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () => ref.read(workforceProvider.notifier).loadMyShifts(),
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : state.myShifts.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: () => ref.read(workforceProvider.notifier).loadMyShifts(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: state.myShifts.length,
                    itemBuilder: (context, index) {
                      final shift = state.myShifts[index];
                      return _buildShiftCard(shift);
                    },
                  ),
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.event_available_rounded, size: 48, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            const Text(
              'No Scheduled Shifts',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 8),
            const Text(
              'You have no upcoming shifts assigned on your rota schedule.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF64748B)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShiftCard(Shift shift) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: shift.isOvernight ? const Color(0xFF6F42C1) : const Color(0xFFE2E8F0),
          width: shift.isOvernight ? 1.5 : 1,
        ),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Code + Tags + Status
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        shift.shiftCode,
                        style: const TextStyle(
                          fontSize: 12,
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF334155),
                        ),
                      ),
                    ),
                    if (shift.isOvernight) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6F42C1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          '24/7 Overnight',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ],
                  ],
                ),
                _buildStatusPill(shift),
              ],
            ),
            const SizedBox(height: 12),

            // Site & Address
            Text(
              shift.siteName,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.place_outlined, size: 16, color: Color(0xFF64748B)),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    shift.siteAddress,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Time & Post Grid
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  _buildMetaRow(Icons.badge_outlined, 'Post / Role', shift.postName),
                  const SizedBox(height: 8),
                  _buildMetaRow(Icons.play_arrow_outlined, 'Starts', _dateFormat.format(shift.startsAtUtc.toLocal())),
                  const SizedBox(height: 8),
                  _buildMetaRow(Icons.stop_outlined, 'Ends', _dateFormat.format(shift.endsAtUtc.toLocal())),
                  const SizedBox(height: 8),
                  _buildMetaRow(
                    Icons.schedule_outlined,
                    'Duration',
                    '${shift.plannedDurationHours.toStringAsFixed(1)} hrs (${shift.breakMinutes}m break)',
                  ),
                  if (shift.requiredWorkspaceStationName != null) ...[
                    const SizedBox(height: 8),
                    _buildMetaRow(
                      Icons.desktop_windows_outlined,
                      'Workstation',
                      shift.requiredWorkspaceStationName!,
                      isHighlight: true,
                    ),
                  ],
                ],
              ),
            ),

            // Site Assignment Instructions (SIs)
            if (shift.siteAssignmentInstructions != null && shift.siteAssignmentInstructions!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline_rounded, size: 18, color: Color(0xFFD97706)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Site Assignment Instructions (SIs)',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            shift.siteAssignmentInstructions!,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF78350F)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),

            // Action Buttons
            Row(
              children: [
                if (!shift.isConfirmedByGuard) ...[
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _confirmShift(shift),
                      icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
                      label: const Text('Confirm Shift'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showSwapRequestDialog(context, shift),
                    icon: const Icon(Icons.swap_horiz_rounded, size: 18),
                    label: const Text('Request Swap'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF475569),
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetaRow(IconData icon, String label, String value, {bool isHighlight = false}) {
    return Row(
      children: [
        Icon(icon, size: 16, color: const Color(0xFF64748B)),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
        const Spacer(),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isHighlight ? AppColors.primary : const Color(0xFF1E293B),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusPill(Shift shift) {
    Color bg = const Color(0xFFFEF3C7);
    Color fg = const Color(0xFF92400E);
    String text = shift.status;

    if (shift.isClockedIn) {
      bg = AppColors.primary.withValues(alpha: 0.15);
      fg = AppColors.primary;
      text = 'ON DUTY';
    } else if (shift.isClockedOut) {
      bg = const Color(0xFFF1F5F9);
      fg = const Color(0xFF475569);
      text = 'COMPLETED';
    } else if (shift.isConfirmedByGuard) {
      bg = const Color(0xFFD1FAE5);
      fg = const Color(0xFF065F46);
      text = 'CONFIRMED';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
      child: Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: fg)),
    );
  }

  Future<void> _confirmShift(Shift shift) async {
    final ok = await ref.read(workforceProvider.notifier).confirmShift(shift.id);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ok ? 'Shift confirmed successfully.' : 'Failed to confirm shift.'),
          backgroundColor: ok ? const Color(0xFF10B981) : const Color(0xFFEF4444),
        ),
      );
    }
  }

  void _showSwapRequestDialog(BuildContext context, Shift shift) {
    final reasonCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Request Shift Swap / Cover'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Shift: ${shift.siteName} (${_dateFormat.format(shift.startsAtUtc.toLocal())})',
              style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Reason for Swap',
                hintText: 'e.g. University exam, urgent personal commitment',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
            onPressed: () async {
              final reason = reasonCtrl.text.trim();
              if (reason.isEmpty) return;
              Navigator.pop(ctx);
              final ok = await ref.read(workforceProvider.notifier).requestSwap(shift.id, reason);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(ok ? 'Swap request submitted for approval.' : 'Swap request failed.'),
                    backgroundColor: ok ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                  ),
                );
              }
            },
            child: const Text('Submit Request'),
          ),
        ],
      ),
    );
  }

  void _showLeaveRequestDialog(BuildContext context) {
    String leaveType = 'Annual';
    DateTime startDate = DateTime.now().add(const Duration(days: 1));
    DateTime endDate = DateTime.now().add(const Duration(days: 2));
    final reasonCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Submit Leave Request'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: leaveType,
                  decoration: const InputDecoration(labelText: 'Leave Type', border: OutlineInputBorder()),
                  items: const [
                    DropdownMenuItem(value: 'Annual', child: Text('Annual Leave')),
                    DropdownMenuItem(value: 'Sick', child: Text('Sick Leave')),
                    DropdownMenuItem(value: 'Compassionate', child: Text('Compassionate Leave')),
                    DropdownMenuItem(value: 'Unpaid', child: Text('Unpaid Leave')),
                  ],
                  onChanged: (val) {
                    if (val != null) setDialogState(() => leaveType = val);
                  },
                ),
                const SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Start Date', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                  subtitle: Text(DateFormat('yyyy-MM-dd').format(startDate), style: const TextStyle(fontWeight: FontWeight.bold)),
                  trailing: const Icon(Icons.calendar_today_rounded, size: 20),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: startDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) setDialogState(() => startDate = picked);
                  },
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('End Date', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                  subtitle: Text(DateFormat('yyyy-MM-dd').format(endDate), style: const TextStyle(fontWeight: FontWeight.bold)),
                  trailing: const Icon(Icons.calendar_today_rounded, size: 20),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: endDate,
                      firstDate: startDate,
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) setDialogState(() => endDate = picked);
                  },
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: reasonCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Reason (Optional)',
                    hintText: 'e.g. Scheduled annual holiday',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
              onPressed: () async {
                Navigator.pop(ctx);
                final ok = await ref.read(workforceProvider.notifier).requestLeave({
                  'leaveType': leaveType,
                  'startDate': startDate.toIso8601String(),
                  'endDate': endDate.toIso8601String(),
                  'reason': reasonCtrl.text.trim(),
                });
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(ok ? 'Leave request submitted.' : 'Failed to submit leave.'),
                      backgroundColor: ok ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                    ),
                  );
                }
              },
              child: const Text('Submit Request'),
            ),
          ],
        ),
      ),
    );
  }
}

