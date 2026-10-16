/// Data models representing the live telemetry feed from /api/DashboardApi/metrics.
class DashboardMetrics {
  final String resolvedDomain;
  final String resolvedDatabase;
  final int totalMembers;
  final int totalActiveMembers;
  final int totalGroups;
  final int totalPublishedPages;
  final int totalSliders;
  final int totalFaqs;
  final List<RecentUserItem> recentUsers;
  final List<RecentActivityItem> recentActivities;

  const DashboardMetrics({
    this.resolvedDomain = '',
    this.resolvedDatabase = '',
    this.totalMembers = 0,
    this.totalActiveMembers = 0,
    this.totalGroups = 0,
    this.totalPublishedPages = 0,
    this.totalSliders = 0,
    this.totalFaqs = 0,
    this.recentUsers = const [],
    this.recentActivities = const [],
  });

  factory DashboardMetrics.fromJson(Map<String, dynamic> json) {
    var rawUsers = json['recentUsers'] as List<dynamic>? ?? [];
    var users = rawUsers
        .whereType<Map<String, dynamic>>()
        .map((u) => RecentUserItem.fromJson(u))
        .toList();

    var rawActivities = json['recentActivities'] as List<dynamic>? ?? [];
    var activities = rawActivities
        .whereType<Map<String, dynamic>>()
        .map((a) => RecentActivityItem.fromJson(a))
        .toList();

    return DashboardMetrics(
      resolvedDomain: json['resolvedDomain']?.toString() ?? '',
      resolvedDatabase: json['resolvedDatabase']?.toString() ?? '',
      totalMembers: json['totalMembers'] as int? ?? users.length,
      totalActiveMembers: json['totalActiveMembers'] as int? ?? (users.isNotEmpty ? users.length : 0),
      totalGroups: json['totalGroups'] as int? ?? 0,
      totalPublishedPages: json['totalPublishedPages'] as int? ?? 0,
      totalSliders: json['totalSliders'] as int? ?? 0,
      totalFaqs: json['totalFaqs'] as int? ?? 0,
      recentUsers: users,
      recentActivities: activities,
    );
  }

  /// Clean empty telemetry state when unpopulated or starting up (strictly 0 dummy data).
  factory DashboardMetrics.empty() {
    return const DashboardMetrics();
  }

  /// Deprecated legacy alias: strictly returns clean empty state without dummy records.
  factory DashboardMetrics.sample() {
    return const DashboardMetrics();
  }
}

/// A member row in the Recently Registered Members table.
class RecentUserItem {
  final String id;
  final String fullName;
  final String email;
  final String category;
  final String? avatarUrl;

  const RecentUserItem({
    required this.id,
    required this.fullName,
    required this.email,
    this.category = 'Member',
    this.avatarUrl,
  });

  factory RecentUserItem.fromJson(Map<String, dynamic> json) {
    return RecentUserItem(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? 'Workspace Member',
      email: json['email']?.toString() ?? '',
      category: json['category']?.toString() ?? 'Member',
      avatarUrl: json['avatarUrl']?.toString(),
    );
  }
}

/// An entry in the Recent Activity & Audit Trail table.
class RecentActivityItem {
  final String action;
  final String user;
  final String details;
  final DateTime? timestamp;

  const RecentActivityItem({
    required this.action,
    required this.user,
    required this.details,
    this.timestamp,
  });

  factory RecentActivityItem.fromJson(Map<String, dynamic> json) {
    DateTime? parsedTime;
    if (json['timestamp'] != null) {
      parsedTime = DateTime.tryParse(json['timestamp'].toString());
    }

    return RecentActivityItem(
      action: json['action']?.toString() ?? 'Action',
      user: json['user']?.toString() ?? 'System',
      details: json['details']?.toString() ?? '',
      timestamp: parsedTime,
    );
  }
}
