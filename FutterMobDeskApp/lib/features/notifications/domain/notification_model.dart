import 'package:flutter/material.dart';

/// Canonical 6-tier platform notification and alert severity hierarchy across web, mobile, and desktop.
enum NotificationSeverity {
  error(1, 'Error', Color(0xFFF06548), Icons.error_outline_rounded),
  failed(2, 'Failed', Color(0xFFF7B84B), Icons.warning_amber_rounded),
  success(3, 'Success', Color(0xFF0AB39C), Icons.check_circle_outline_rounded),
  newFeature(4, 'New Feature', Color(0xFF38BDF8), Icons.auto_awesome_rounded),
  update(5, 'Update', Color(0xFF1F6BFF), Icons.info_outline_rounded),
  maintenance(6, 'Maintenance', Color(0xFF9333EA), Icons.build_circle_outlined);

  final int code;
  final String label;
  final Color color;
  final IconData icon;

  const NotificationSeverity(this.code, this.label, this.color, this.icon);

  static NotificationSeverity fromString(String? val) {
    if (val == null) return NotificationSeverity.update;
    final normalized = val.trim().toLowerCase().replaceAll(' ', '').replaceAll('_', '');
    return switch (normalized) {
      'error' => NotificationSeverity.error,
      'failed' => NotificationSeverity.failed,
      'success' => NotificationSeverity.success,
      'newfeature' => NotificationSeverity.newFeature,
      'update' => NotificationSeverity.update,
      'maintenance' => NotificationSeverity.maintenance,
      _ => NotificationSeverity.update,
    };
  }

  static NotificationSeverity fromCode(int? code) {
    return switch (code) {
      1 => NotificationSeverity.error,
      2 => NotificationSeverity.failed,
      3 => NotificationSeverity.success,
      4 => NotificationSeverity.newFeature,
      5 => NotificationSeverity.update,
      6 => NotificationSeverity.maintenance,
      _ => NotificationSeverity.update,
    };
  }
}

/// Standardized notification item model rendered across Flutter mobile and desktop apps.
class NotificationItem {
  final String id;
  final String title;
  final String message;
  final String? actionUrl;
  final bool isRead;
  final String? module;
  final String? icon;
  final String category;
  final String priority;
  final NotificationSeverity severity;
  final String? metadataJson;
  final bool isBroadcast;
  final DateTime createdAt;

  const NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    this.actionUrl,
    this.isRead = false,
    this.module,
    this.icon,
    this.category = 'General',
    this.priority = 'Normal',
    this.severity = NotificationSeverity.update,
    this.metadataJson,
    this.isBroadcast = false,
    required this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    final rawSeverity = json['severity']?.toString();
    final rawSeverityCode = json['severityCode'] as int?;

    final severity = rawSeverityCode != null
        ? NotificationSeverity.fromCode(rawSeverityCode)
        : NotificationSeverity.fromString(rawSeverity);

    return NotificationItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      actionUrl: json['actionUrl']?.toString(),
      isRead: json['isRead'] == true,
      module: json['module']?.toString() ?? 'General',
      icon: json['icon']?.toString(),
      category: json['category']?.toString() ?? 'General',
      priority: json['priority']?.toString() ?? 'Normal',
      severity: severity,
      metadataJson: json['metadataJson']?.toString(),
      isBroadcast: json['isBroadcast'] == true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  NotificationItem copyWith({
    String? id,
    String? title,
    String? message,
    String? actionUrl,
    bool? isRead,
    String? module,
    String? icon,
    String? category,
    String? priority,
    NotificationSeverity? severity,
    String? metadataJson,
    bool? isBroadcast,
    DateTime? createdAt,
  }) {
    return NotificationItem(
      id: id ?? this.id,
      title: title ?? this.title,
      message: message ?? this.message,
      actionUrl: actionUrl ?? this.actionUrl,
      isRead: isRead ?? this.isRead,
      module: module ?? this.module,
      icon: icon ?? this.icon,
      category: category ?? this.category,
      priority: priority ?? this.priority,
      severity: severity ?? this.severity,
      metadataJson: metadataJson ?? this.metadataJson,
      isBroadcast: isBroadcast ?? this.isBroadcast,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
