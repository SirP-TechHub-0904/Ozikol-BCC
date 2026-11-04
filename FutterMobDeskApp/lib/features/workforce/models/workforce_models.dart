import 'package:flutter/foundation.dart';

/// Client Site domain model representing a physical customer location and geofence radius.
@immutable
class ClientSite {
  final String id;
  final String siteCode;
  final String siteName;
  final String address;
  final String city;
  final String postalCode;
  final double? latitude;
  final double? longitude;
  final int geofenceRadiusMeters;
  final String? emergencyContactName;
  final String? emergencyContactPhone;
  final String? siteAssignmentInstructions;
  final String? requiredSiaLicenceType;
  final int activeShiftsCount;

  const ClientSite({
    required this.id,
    required this.siteCode,
    required this.siteName,
    required this.address,
    required this.city,
    required this.postalCode,
    this.latitude,
    this.longitude,
    required this.geofenceRadiusMeters,
    this.emergencyContactName,
    this.emergencyContactPhone,
    this.siteAssignmentInstructions,
    this.requiredSiaLicenceType,
    this.activeShiftsCount = 0,
  });

  factory ClientSite.fromJson(Map<String, dynamic> json) {
    return ClientSite(
      id: json['id']?.toString() ?? '',
      siteCode: json['siteCode']?.toString() ?? '',
      siteName: json['siteName']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      city: json['city']?.toString() ?? '',
      postalCode: json['postalCode']?.toString() ?? '',
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      geofenceRadiusMeters: (json['geofenceRadiusMeters'] as num?)?.toInt() ?? 150,
      emergencyContactName: json['emergencyContactName']?.toString(),
      emergencyContactPhone: json['emergencyContactPhone']?.toString(),
      siteAssignmentInstructions: json['siteAssignmentInstructions']?.toString(),
      requiredSiaLicenceType: json['requiredSiaLicenceType']?.toString(),
      activeShiftsCount: (json['activeShiftsCount'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'siteCode': siteCode,
    'siteName': siteName,
    'address': address,
    'city': city,
    'postalCode': postalCode,
    'latitude': latitude,
    'longitude': longitude,
    'geofenceRadiusMeters': geofenceRadiusMeters,
    'emergencyContactName': emergencyContactName,
    'emergencyContactPhone': emergencyContactPhone,
    'siteAssignmentInstructions': siteAssignmentInstructions,
    'requiredSiaLicenceType': requiredSiaLicenceType,
  };
}

/// Planned Shift domain model for single source of truth rota scheduling.
@immutable
class Shift {
  final String id;
  final String shiftCode;
  final String clientSiteId;
  final String siteName;
  final String siteAddress;
  final String postName;
  final String? assignedUserId;
  final String? assignedUserName;
  final DateTime startsAtUtc;
  final DateTime endsAtUtc;
  final bool isOvernight;
  final int breakMinutes;
  final double plannedDurationHours;
  final String? requiredWorkspaceStationId;
  final String? requiredWorkspaceStationName;
  final String status;
  final bool isConfirmedByGuard;
  final DateTime? confirmedAtUtc;
  final String? notes;
  final String? siteAssignmentInstructions;
  final String? emergencyContactPhone;
  final bool isClockedIn;
  final bool isClockedOut;

  const Shift({
    required this.id,
    required this.shiftCode,
    required this.clientSiteId,
    required this.siteName,
    required this.siteAddress,
    required this.postName,
    this.assignedUserId,
    this.assignedUserName,
    required this.startsAtUtc,
    required this.endsAtUtc,
    this.isOvernight = false,
    this.breakMinutes = 0,
    this.plannedDurationHours = 0.0,
    this.requiredWorkspaceStationId,
    this.requiredWorkspaceStationName,
    this.status = 'Scheduled',
    this.isConfirmedByGuard = false,
    this.confirmedAtUtc,
    this.notes,
    this.siteAssignmentInstructions,
    this.emergencyContactPhone,
    this.isClockedIn = false,
    this.isClockedOut = false,
  });

  factory Shift.fromJson(Map<String, dynamic> json) {
    return Shift(
      id: json['id']?.toString() ?? '',
      shiftCode: json['shiftCode']?.toString() ?? '',
      clientSiteId: json['clientSiteId']?.toString() ?? '',
      siteName: json['siteName']?.toString() ?? '',
      siteAddress: json['siteAddress']?.toString() ?? '',
      postName: json['postName']?.toString() ?? 'General Post',
      assignedUserId: json['assignedUserId']?.toString(),
      assignedUserName: json['assignedUserName']?.toString(),
      startsAtUtc: json['startsAtUtc'] != null
          ? DateTime.tryParse(json['startsAtUtc'].toString()) ?? DateTime.now()
          : DateTime.now(),
      endsAtUtc: json['endsAtUtc'] != null
          ? DateTime.tryParse(json['endsAtUtc'].toString()) ?? DateTime.now()
          : DateTime.now(),
      isOvernight: json['isOvernight'] == true,
      breakMinutes: (json['breakMinutes'] as num?)?.toInt() ?? 0,
      plannedDurationHours: (json['plannedDurationHours'] as num?)?.toDouble() ?? 0.0,
      requiredWorkspaceStationId: json['requiredWorkspaceStationId']?.toString(),
      requiredWorkspaceStationName: json['requiredWorkspaceStationName']?.toString(),
      status: json['status']?.toString() ?? 'Scheduled',
      isConfirmedByGuard: json['isConfirmedByGuard'] == true,
      confirmedAtUtc: json['confirmedAtUtc'] != null
          ? DateTime.tryParse(json['confirmedAtUtc'].toString())
          : null,
      notes: json['notes']?.toString(),
      siteAssignmentInstructions: json['siteAssignmentInstructions']?.toString(),
      emergencyContactPhone: json['emergencyContactPhone']?.toString(),
      isClockedIn: json['isClockedIn'] == true,
      isClockedOut: json['isClockedOut'] == true,
    );
  }
}

/// Real-time live duty monitor item for administrator operational tracking.
@immutable
class LiveDutyMonitorItem {
  final String shiftId;
  final String shiftCode;
  final String siteName;
  final String postName;
  final String guardName;
  final String? guardId;
  final DateTime startsAtUtc;
  final DateTime endsAtUtc;
  final bool isOvernight;
  final String shiftStatus;
  final DateTime? clockInUtc;
  final bool isGeofenceVerified;
  final double? distanceFromSiteMeters;
  final bool isFlagged;
  final String? flagReason;
  final DateTime? lastWelfareCheckAtUtc;
  final bool isMissedClockIn;

  const LiveDutyMonitorItem({
    required this.shiftId,
    required this.shiftCode,
    required this.siteName,
    required this.postName,
    required this.guardName,
    this.guardId,
    required this.startsAtUtc,
    required this.endsAtUtc,
    this.isOvernight = false,
    required this.shiftStatus,
    this.clockInUtc,
    this.isGeofenceVerified = false,
    this.distanceFromSiteMeters,
    this.isFlagged = false,
    this.flagReason,
    this.lastWelfareCheckAtUtc,
    this.isMissedClockIn = false,
  });

  factory LiveDutyMonitorItem.fromJson(Map<String, dynamic> json) {
    return LiveDutyMonitorItem(
      shiftId: json['shiftId']?.toString() ?? '',
      shiftCode: json['shiftCode']?.toString() ?? '',
      siteName: json['siteName']?.toString() ?? '',
      postName: json['postName']?.toString() ?? '',
      guardName: json['guardName']?.toString() ?? 'Unassigned',
      guardId: json['guardId']?.toString(),
      startsAtUtc: json['startsAtUtc'] != null
          ? DateTime.tryParse(json['startsAtUtc'].toString()) ?? DateTime.now()
          : DateTime.now(),
      endsAtUtc: json['endsAtUtc'] != null
          ? DateTime.tryParse(json['endsAtUtc'].toString()) ?? DateTime.now()
          : DateTime.now(),
      isOvernight: json['isOvernight'] == true,
      shiftStatus: json['shiftStatus']?.toString() ?? 'Scheduled',
      clockInUtc: json['clockInUtc'] != null
          ? DateTime.tryParse(json['clockInUtc'].toString())
          : null,
      isGeofenceVerified: json['isGeofenceVerified'] == true,
      distanceFromSiteMeters: json['distanceFromSiteMeters'] != null
          ? (json['distanceFromSiteMeters'] as num).toDouble()
          : null,
      isFlagged: json['isFlagged'] == true,
      flagReason: json['flagReason']?.toString(),
      lastWelfareCheckAtUtc: json['lastWelfareCheckAtUtc'] != null
          ? DateTime.tryParse(json['lastWelfareCheckAtUtc'].toString())
          : null,
      isMissedClockIn: json['isMissedClockIn'] == true,
    );
  }
}

/// Result returned from clock-in endpoint.
@immutable
class ClockInResult {
  final String attendanceId;
  final DateTime clockInUtc;
  final bool isGeofenceVerified;
  final double distanceFromSiteMeters;
  final bool isFlagged;
  final String? flagReason;
  final bool requiredStationUnlocked;

  const ClockInResult({
    required this.attendanceId,
    required this.clockInUtc,
    required this.isGeofenceVerified,
    required this.distanceFromSiteMeters,
    required this.isFlagged,
    this.flagReason,
    required this.requiredStationUnlocked,
  });

  factory ClockInResult.fromJson(Map<String, dynamic> json) {
    return ClockInResult(
      attendanceId: json['attendanceId']?.toString() ?? '',
      clockInUtc: json['clockInUtc'] != null
          ? DateTime.tryParse(json['clockInUtc'].toString()) ?? DateTime.now()
          : DateTime.now(),
      isGeofenceVerified: json['isGeofenceVerified'] == true,
      distanceFromSiteMeters: (json['distanceFromSiteMeters'] as num?)?.toDouble() ?? 0.0,
      isFlagged: json['isFlagged'] == true,
      flagReason: json['flagReason']?.toString(),
      requiredStationUnlocked: json['requiredStationUnlocked'] == true,
    );
  }
}

/// Result returned from clock-out endpoint.
@immutable
class ClockOutResult {
  final String attendanceId;
  final DateTime clockOutUtc;
  final double totalDurationHours;
  final double billableHours;
  final double overtimeHours;

  const ClockOutResult({
    required this.attendanceId,
    required this.clockOutUtc,
    required this.totalDurationHours,
    required this.billableHours,
    required this.overtimeHours,
  });

  factory ClockOutResult.fromJson(Map<String, dynamic> json) {
    return ClockOutResult(
      attendanceId: json['attendanceId']?.toString() ?? '',
      clockOutUtc: json['clockOutUtc'] != null
          ? DateTime.tryParse(json['clockOutUtc'].toString()) ?? DateTime.now()
          : DateTime.now(),
      totalDurationHours: (json['totalDurationHours'] as num?)?.toDouble() ?? 0.0,
      billableHours: (json['billableHours'] as num?)?.toDouble() ?? 0.0,
      overtimeHours: (json['overtimeHours'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

/// Workstation desktop gatekeeping check result.
@immutable
class StationAccessValidation {
  final bool isAuthorized;
  final bool requiresClockIn;
  final String? shiftId;
  final String? shiftCode;
  final String message;

  const StationAccessValidation({
    required this.isAuthorized,
    this.requiresClockIn = false,
    this.shiftId,
    this.shiftCode,
    required this.message,
  });

  factory StationAccessValidation.fromJson(Map<String, dynamic> json) {
    return StationAccessValidation(
      isAuthorized: json['isAuthorized'] == true,
      requiresClockIn: json['requiresClockIn'] == true,
      shiftId: json['shiftId']?.toString(),
      shiftCode: json['shiftCode']?.toString(),
      message: json['message']?.toString() ?? '',
    );
  }
}

