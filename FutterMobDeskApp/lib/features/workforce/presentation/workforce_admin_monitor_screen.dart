import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../models/workforce_models.dart';
import '../state/workforce_state.dart';

/// Administrator Live Duty Monitor Screen (`/attendance/console/live`).
/// Real-time operational dashboard feed showing guards currently on site, geofence audit flags,
/// missed clock-ins (>15m), and lone-worker safety welfare checks.
class WorkforceAdminMonitorScreen extends ConsumerStatefulWidget {
  const WorkforceAdminMonitorScreen({super.key});

  @override
  ConsumerState<WorkforceAdminMonitorScreen> createState() => _WorkforceAdminMonitorScreenState();
}

class _WorkforceAdminMonitorScreenState extends ConsumerState<WorkforceAdminMonitorScreen> {
  final _timeFormat = DateFormat('h:mm a');
  String _filter = 'All';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(workforceProvider.notifier).loadLiveDutyMonitor();
      ref.read(workforceProvider.notifier).loadSites();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workforceProvider);

    final filtered = state.liveMonitor.where((item) {
      if (_filter == 'Flagged') return item.isFlagged || item.isMissedClockIn;
      if (_filter == 'On Duty') return item.clockInUtc != null;
      if (_filter == 'Missed') return item.isMissedClockIn;
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Live Duty & Attendance Monitor', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Feed',
            onPressed: () => ref.read(workforceProvider.notifier).loadLiveDutyMonitor(),
          ),
        ],
      ),
      body: Column(
        children: [
          // KPI / Summary bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Row(
              children: [
                _buildKpiCard('Total Active', '${state.liveMonitor.length}', Icons.groups_rounded, AppColors.primary),
                const SizedBox(width: 10),
                _buildKpiCard(
                  'On Duty',
                  '${state.liveMonitor.where((x) => x.clockInUtc != null).length}',
                  Icons.check_circle_rounded,
                  const Color(0xFF10B981),
                ),
                const SizedBox(width: 10),
                _buildKpiCard(
                  'Flagged / Missed',
                  '${state.liveMonitor.where((x) => x.isFlagged || x.isMissedClockIn).length}',
                  Icons.warning_rounded,
                  const Color(0xFFEF4444),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Filter chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _buildFilterChip('All'),
                const SizedBox(width: 8),
                _buildFilterChip('On Duty'),
                const SizedBox(width: 8),
                _buildFilterChip('Flagged'),
                const SizedBox(width: 8),
                _buildFilterChip('Missed'),
              ],
            ),
          ),

          // Items list
          Expanded(
            child: filtered.isEmpty
                ? const Center(
                    child: Text('No shift attendance records matching filter.', style: TextStyle(color: Color(0xFF64748B))),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    itemBuilder: (ctx, index) => _buildMonitorCard(filtered[index]),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
                Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    final isSelected = _filter == label;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: AppColors.primary,
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: isSelected ? Colors.white : const Color(0xFF475569),
      ),
      onSelected: (val) {
        if (val) setState(() => _filter = label);
      },
    );
  }

  Widget _buildMonitorCard(LiveDutyMonitorItem item) {
    final isMissed = item.isMissedClockIn;
    final isFlagged = item.isFlagged;

    Color borderColor = const Color(0xFFE2E8F0);
    if (isMissed || isFlagged) borderColor = const Color(0xFFFCA5A5);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(color: borderColor),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.person_pin_rounded, size: 18, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Text(
                      item.guardName,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    ),
                  ],
                ),
                _buildDutyBadge(item),
              ],
            ),
            const SizedBox(height: 8),

            // Site and post
            Row(
              children: [
                const Icon(Icons.business_rounded, size: 14, color: Color(0xFF64748B)),
                const SizedBox(width: 4),
                Text(
                  '${item.siteName} • ${item.postName}',
                  style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
                ),
              ],
            ),
            const SizedBox(height: 6),

            // Scheduled Shift Hours
            Row(
              children: [
                const Icon(Icons.access_time_rounded, size: 14, color: Color(0xFF64748B)),
                const SizedBox(width: 4),
                Text(
                  'Shift: ${_timeFormat.format(item.startsAtUtc.toLocal())} – ${_timeFormat.format(item.endsAtUtc.toLocal())}',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                if (item.clockInUtc != null) ...[
                  const SizedBox(width: 8),
                  Text(
                    '• Clock-in: ${_timeFormat.format(item.clockInUtc!.toLocal())}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                  ),
                ],
              ],
            ),

            // Geofence & Alert Banner
            if (item.isFlagged || item.isMissedClockIn) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFFEE2E2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, size: 16, color: Color(0xFFDC2626)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        item.flagReason ??
                            (item.isMissedClockIn ? 'Missed clock-in (>15m past shift start)' : 'Geofence audit flag'),
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFB91C1C)),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            if (item.isGeofenceVerified) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.verified_rounded, size: 14, color: Color(0xFF10B981)),
                  const SizedBox(width: 4),
                  Text(
                    'Geofence Verified (${item.distanceFromSiteMeters?.toStringAsFixed(0) ?? '0'}m from site)',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF047857), fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDutyBadge(LiveDutyMonitorItem item) {
    if (item.isMissedClockIn) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(6)),
        child: const Text('MISSED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFDC2626))),
      );
    }
    if (item.clockInUtc != null) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(6)),
        child: const Text('ON DUTY', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6)),
      child: const Text('SCHEDULED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF92400E))),
    );
  }
}

