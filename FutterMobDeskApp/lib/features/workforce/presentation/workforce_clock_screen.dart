import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../models/workforce_models.dart';
import '../state/workforce_state.dart';

/// Member GPS Clock In & Out Screen (`/attendance/workspace/clock`).
/// Captures device geolocation, submits server-side Haversine geofence verification,
/// unlocks desktop workstation access, and facilitates lone-worker hourly safety welfare checks.
class WorkforceClockScreen extends ConsumerStatefulWidget {
  const WorkforceClockScreen({super.key});

  @override
  ConsumerState<WorkforceClockScreen> createState() => _WorkforceClockScreenState();
}

class _WorkforceClockScreenState extends ConsumerState<WorkforceClockScreen> {
  Position? _currentPosition;
  bool _isAcquiringGps = false;
  String? _gpsError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(workforceProvider.notifier).loadMyShifts();
      _acquireGps();
    });
  }

  Future<void> _acquireGps() async {
    setState(() {
      _isAcquiringGps = true;
      _gpsError = null;
    });

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _gpsError = 'Location services are disabled on this device.';
          _isAcquiringGps = false;
        });
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() {
            _gpsError = 'Location permissions were denied by user.';
            _isAcquiringGps = false;
          });
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _gpsError = 'Location permissions are permanently denied in system settings.';
          _isAcquiringGps = false;
        });
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 12),
        ),
      );

      setState(() {
        _currentPosition = pos;
        _isAcquiringGps = false;
      });
    } catch (e) {
      setState(() {
        _gpsError = 'Could not acquire GPS: $e';
        _isAcquiringGps = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workforceProvider);

    // Find current active or next upcoming shift
    final now = DateTime.now();
    Shift? activeShift;
    try {
      activeShift = state.myShifts.firstWhere(
        (s) =>
            (s.isClockedIn && !s.isClockedOut) ||
            (s.startsAtUtc.isBefore(now.add(const Duration(hours: 4))) &&
                s.endsAtUtc.isAfter(now.subtract(const Duration(hours: 1)))),
      );
    } catch (_) {
      activeShift = state.myShifts.isNotEmpty ? state.myShifts.first : null;
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Duty Clock & Geofence', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.my_location_rounded),
            tooltip: 'Re-acquire GPS',
            onPressed: _acquireGps,
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Shift',
            onPressed: () => ref.read(workforceProvider.notifier).loadMyShifts(),
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : activeShift == null
              ? _buildNoShiftState()
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 580),
                      child: _buildClockCard(activeShift, state),
                    ),
                  ),
                ),
    );
  }

  Widget _buildNoShiftState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.event_busy_rounded, size: 48, color: Color(0xFF94A3B8)),
            ),
            const SizedBox(height: 16),
            const Text(
              'No Active Shift Scheduled',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 8),
            const Text(
              'You can clock in up to 30 minutes before your scheduled shift begins.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF64748B)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClockCard(Shift shift, WorkforceState state) {
    final timeFormat = DateFormat('h:mm a');

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status and Code
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  shift.shiftCode,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: AppColors.primary,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: shift.isClockedIn ? const Color(0xFFD1FAE5) : const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    shift.isClockedIn ? 'ON DUTY' : 'NOT CLOCKED IN',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: shift.isClockedIn ? const Color(0xFF065F46) : const Color(0xFF92400E),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Site Name & Address
            Text(
              shift.siteName,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.place_outlined, size: 16, color: Color(0xFF64748B)),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(shift.siteAddress, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Shift Details Summary
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Post / Duty', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                      Text(shift.postName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Scheduled Hours', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                      Text(
                        '${timeFormat.format(shift.startsAtUtc.toLocal())} – ${timeFormat.format(shift.endsAtUtc.toLocal())}',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  if (shift.requiredWorkspaceStationName != null) ...[
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Assigned Workstation', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                        Text(
                          shift.requiredWorkspaceStationName!,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // GPS Status Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _currentPosition != null ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: _currentPosition != null ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0),
                ),
              ),
              child: Row(
                children: [
                  _isAcquiringGps
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                        )
                      : Icon(
                          _currentPosition != null ? Icons.my_location_rounded : Icons.location_off_rounded,
                          color: _currentPosition != null ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
                          size: 26,
                        ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _isAcquiringGps
                              ? 'Acquiring GPS Signal...'
                              : _currentPosition != null
                                  ? 'GPS Fix Acquired'
                                  : 'GPS Unavailable',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: _currentPosition != null ? const Color(0xFF15803D) : const Color(0xFF64748B),
                          ),
                        ),
                        if (_currentPosition != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            'Lat: ${_currentPosition!.latitude.toStringAsFixed(5)}, Lng: ${_currentPosition!.longitude.toStringAsFixed(5)} (±${_currentPosition!.accuracy.toStringAsFixed(0)}m)',
                            style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Color(0xFF475569)),
                          ),
                        ],
                        if (_gpsError != null) ...[
                          const SizedBox(height: 2),
                          Text(_gpsError!, style: const TextStyle(fontSize: 11, color: Color(0xFFDC2626))),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Clock In / Clock Out Actions
            if (!shift.isClockedIn) ...[
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: state.isActionLoading ? null : () => _performClockIn(shift),
                  icon: const Icon(Icons.login_rounded, size: 20),
                  label: Text(
                    state.isActionLoading ? 'Verifying Geofence...' : 'Clock In Now',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ] else ...[
              // Lone-Worker Check Call
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton.icon(
                  onPressed: state.isActionLoading ? null : () => _submitWelfareCheck(shift),
                  icon: const Icon(Icons.health_and_safety_rounded, size: 20, color: Color(0xFFD97706)),
                  label: const Text('Lone Worker Safety Check-In'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF92400E),
                    side: const BorderSide(color: Color(0xFFFDE68A)),
                    backgroundColor: const Color(0xFFFFFBEB),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Clock Out
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: state.isActionLoading ? null : () => _performClockOut(shift),
                  icon: const Icon(Icons.logout_rounded, size: 20),
                  label: Text(
                    state.isActionLoading ? 'Ending Shift...' : 'Clock Out & End Shift',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEF4444),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],

            // Workstation unlocked banner
            if (shift.isClockedIn && shift.requiredWorkspaceStationName != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.desktop_windows_rounded, size: 20, color: AppColors.primary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Workstation Access Unlocked: You are authorized to access ${shift.requiredWorkspaceStationName}.',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1E40AF)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _performClockIn(Shift shift) async {
    final result = await ref.read(workforceProvider.notifier).clockIn(
      shiftId: shift.id,
      latitude: _currentPosition?.latitude,
      longitude: _currentPosition?.longitude,
      accuracyMeters: _currentPosition?.accuracy,
    );

    if (mounted) {
      if (result != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result.isGeofenceVerified
                  ? 'Clocked in successfully. Geofence verified (${result.distanceFromSiteMeters.toStringAsFixed(0)}m from site).'
                  : 'Clocked in (FLAGGED: Outside geofence boundary).',
            ),
            backgroundColor: result.isGeofenceVerified ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Clock-in failed. Check connection.'), backgroundColor: Color(0xFFEF4444)),
        );
      }
    }
  }

  Future<void> _performClockOut(Shift shift) async {
    final result = await ref.read(workforceProvider.notifier).clockOut(
      shiftId: shift.id,
      latitude: _currentPosition?.latitude,
      longitude: _currentPosition?.longitude,
    );

    if (mounted) {
      if (result != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Clocked out. Total duration: ${result.totalDurationHours.toStringAsFixed(1)} hrs.'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Clock-out failed.'), backgroundColor: Color(0xFFEF4444)),
        );
      }
    }
  }

  Future<void> _submitWelfareCheck(Shift shift) async {
    final ok = await ref.read(workforceProvider.notifier).confirmWelfareCheck(shift.id);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ok ? 'Welfare check-call recorded.' : 'Failed to record welfare check.'),
          backgroundColor: ok ? const Color(0xFF10B981) : const Color(0xFFEF4444),
        ),
      );
    }
  }
}

