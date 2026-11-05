import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../models/workforce_models.dart';
import 'workforce_clock_screen.dart';

/// Desktop Workstation Gatekeeping Dialog.
/// Triggered on desktop platforms when a guard attempts to access or unlock
/// a workstation assigned to a shift without having completed their GPS clock-in.
class WorkforceStationGatekeeperDialog extends StatelessWidget {
  final StationAccessValidation validation;
  final VoidCallback onRetry;

  const WorkforceStationGatekeeperDialog({
    super.key,
    required this.validation,
    required this.onRetry,
  });

  /// Displays the gatekeeper warning modal if station access requires clock-in.
  static Future<bool> checkAndGatekeep(
    BuildContext context,
    StationAccessValidation validation,
    VoidCallback onRetry,
  ) async {
    if (validation.isAuthorized) return true;

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => WorkforceStationGatekeeperDialog(
        validation: validation,
        onRetry: onRetry,
      ),
    );

    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.lock_clock_rounded, color: Color(0xFFDC2626), size: 24),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Shift Clock-In Required',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
          ),
        ],
      ),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              validation.message.isNotEmpty
                  ? validation.message
                  : 'This workstation is scheduled for an assigned shift duty. Access remains locked until your GPS duty attendance is verified.',
              style: const TextStyle(fontSize: 14, color: Color(0xFF475569)),
            ),
            if (validation.shiftCode != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.badge_outlined, size: 18, color: Color(0xFF64748B)),
                    const SizedBox(width: 8),
                    Text(
                      'Shift Reference: ${validation.shiftCode}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
      actionsPadding: const EdgeInsets.all(16),
      actions: [
        OutlinedButton(
          onPressed: () {
            Navigator.pop(context, false);
            onRetry();
          },
          child: const Text('Re-check Status'),
        ),
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
          ),
          onPressed: () {
            Navigator.pop(context, false);
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const WorkforceClockScreen()),
            );
          },
          icon: const Icon(Icons.fingerprint_rounded, size: 18),
          label: const Text('Clock In Now'),
        ),
      ],
    );
  }
}

