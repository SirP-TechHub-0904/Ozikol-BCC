import 'dart:convert';

/// Dynamic terminology aliases configured by the tenant for bcp-committees.
class CommitteeAliases {
  final String aliasSingular;
  final String aliasPlural;
  final String subGroupAliasSingular;
  final String subGroupAliasPlural;
  final String leaderTitleAlias;
  final String secretaryTitleAlias;

  const CommitteeAliases({
    this.aliasSingular = 'Committee',
    this.aliasPlural = 'Committees',
    this.subGroupAliasSingular = 'Sub-Group',
    this.subGroupAliasPlural = 'Sub-Groups',
    this.leaderTitleAlias = 'Chairperson',
    this.secretaryTitleAlias = 'Secretary',
  });

  factory CommitteeAliases.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const CommitteeAliases();
    return CommitteeAliases(
      aliasSingular: json['aliasSingular']?.toString() ??
          json['committeeAliasSingular']?.toString() ??
          'Committee',
      aliasPlural: json['aliasPlural']?.toString() ??
          json['committeeAliasPlural']?.toString() ??
          json['groupAlias']?.toString() ??
          'Committees',
      subGroupAliasSingular: json['subGroupAliasSingular']?.toString() ?? 'Sub-Group',
      subGroupAliasPlural: json['subGroupAliasPlural']?.toString() ?? 'Sub-Groups',
      leaderTitleAlias: json['leaderTitleAlias']?.toString() ?? 'Chairperson',
      secretaryTitleAlias: json['secretaryTitleAlias']?.toString() ?? 'Secretary',
    );
  }

  Map<String, dynamic> toJson() => {
        'aliasSingular': aliasSingular,
        'aliasPlural': aliasPlural,
        'subGroupAliasSingular': subGroupAliasSingular,
        'subGroupAliasPlural': subGroupAliasPlural,
        'leaderTitleAlias': leaderTitleAlias,
        'secretaryTitleAlias': secretaryTitleAlias,
      };

  CommitteeAliases copyWith({
    String? aliasSingular,
    String? aliasPlural,
    String? subGroupAliasSingular,
    String? subGroupAliasPlural,
    String? leaderTitleAlias,
    String? secretaryTitleAlias,
  }) {
    return CommitteeAliases(
      aliasSingular: aliasSingular ?? this.aliasSingular,
      aliasPlural: aliasPlural ?? this.aliasPlural,
      subGroupAliasSingular: subGroupAliasSingular ?? this.subGroupAliasSingular,
      subGroupAliasPlural: subGroupAliasPlural ?? this.subGroupAliasPlural,
      leaderTitleAlias: leaderTitleAlias ?? this.leaderTitleAlias,
      secretaryTitleAlias: secretaryTitleAlias ?? this.secretaryTitleAlias,
    );
  }
}

/// Committee / Group entity model matching Ozikol BCC Domain.
class Committee {
  final String id;
  final String name;
  final String? code;
  final String? slug;
  final String? description;
  final String? category;
  final int maxMembers;
  final String? meetingSchedule;
  final String? meetingLocation;
  final bool isPublicJoin;
  final bool allowExternalRegistration;
  final String? leaderName;
  final String? leaderEmail;
  final String? leaderTitle;
  final String? parentCommitteeId;
  final String? parentCommitteeName;
  final int memberCount;
  final int subCommitteeCount;
  final String status;
  final String? extraInfoFormId;
  final String? extraInfoFormTitle;
  final DateTime? createdAt;
  final List<CommitteeMember> members;
  final List<Committee> subCommittees;
  final List<PinnedCloudResource> cloudDocuments;

  /// Role of the currently authenticated member within this committee (e.g. "Member", "Chairperson", "Administrator").
  final String? myRole;

  /// User-friendly display label for the authenticated member's role formatted via tenant aliases.
  final String? myRoleDisplay;

  /// Optional custom role title assigned to this member.
  final String? customRoleTitle;

  /// Whether the authenticated member holds an executive or leadership role.
  final bool isLeader;

  /// Whether the authenticated member is authorized to submit meeting reports.
  final bool canSubmitReport;

  /// Aggregate count of recorded meeting minutes/reports for this committee.
  final int reportsCount;

  /// Aggregate count of shared cloud resources and document vaults.
  final int cloudDocsCount;

  /// Whether the authenticated member has joined this committee.
  final bool isJoined;

  /// Whether the authenticated member has an intake registration pending approval.
  final bool isPendingApproval;

  /// Whether joining this committee requires administrative or chairperson approval.
  final bool requiresApproval;

  /// Visibility level: "Public", "ApprovalRequired", or "Private".
  final String? visibility;

  /// Material icon name associated with this committee.
  final String? iconName;

  /// Pinned cover banner image URL.
  final String? coverBannerUrl;

  const Committee({
    required this.id,
    required this.name,
    this.code,
    this.slug,
    this.description,
    this.category,
    this.maxMembers = 0,
    this.meetingSchedule,
    this.meetingLocation,
    this.isPublicJoin = true,
    this.allowExternalRegistration = false,
    this.leaderName,
    this.leaderEmail,
    this.leaderTitle,
    this.parentCommitteeId,
    this.parentCommitteeName,
    this.memberCount = 0,
    this.subCommitteeCount = 0,
    this.status = 'Active',
    this.extraInfoFormId,
    this.extraInfoFormTitle,
    this.createdAt,
    this.members = const [],
    this.subCommittees = const [],
    this.cloudDocuments = const [],
    this.myRole,
    this.myRoleDisplay,
    this.customRoleTitle,
    this.isLeader = false,
    this.canSubmitReport = false,
    this.reportsCount = 0,
    this.cloudDocsCount = 0,
    this.isJoined = false,
    this.isPendingApproval = false,
    this.requiresApproval = false,
    this.visibility = 'Public',
    this.iconName,
    this.coverBannerUrl,
  });

  bool get isSubUnit => parentCommitteeId != null && parentCommitteeId!.isNotEmpty;
  bool get isFull => maxMembers > 0 && memberCount >= maxMembers;

  factory Committee.fromJson(Map<String, dynamic> json) {
    return Committee(
      id: (json['id'] ?? json['committeeId'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      code: json['code']?.toString(),
      slug: json['slug']?.toString(),
      description: json['description']?.toString() ?? json['missionStatement']?.toString(),
      category: json['category']?.toString() ?? json['categoryTag']?.toString(),
      maxMembers: int.tryParse(json['maxMembers']?.toString() ?? json['maxCapacity']?.toString() ?? '0') ?? 0,
      meetingSchedule: json['meetingSchedule']?.toString(),
      meetingLocation: json['meetingLocation']?.toString() ?? json['meetingLocationOrLink']?.toString(),
      isPublicJoin: json['isPublicJoin'] == true || json['visibility'] == 'Public',
      allowExternalRegistration: json['allowExternalRegistration'] == true,
      leaderName: json['leaderName']?.toString() ?? json['leader']?['name']?.toString(),
      leaderEmail: json['leaderEmail']?.toString() ?? json['leader']?['email']?.toString(),
      leaderTitle: json['leaderTitle']?.toString(),
      parentCommitteeId: json['parentCommitteeId']?.toString(),
      parentCommitteeName: json['parentCommitteeName']?.toString(),
      memberCount: int.tryParse(json['memberCount']?.toString() ?? '0') ??
          (json['members'] is List ? (json['members'] as List).length : 0),
      subCommitteeCount: int.tryParse(json['subCommitteeCount']?.toString() ?? '0') ??
          (json['subCommittees'] is List ? (json['subCommittees'] as List).length : 0),
      status: json['status']?.toString() ?? 'Active',
      extraInfoFormId: json['extraInfoFormId']?.toString(),
      extraInfoFormTitle: json['extraInfoFormTitle']?.toString(),
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : (json['joinedAt'] != null ? DateTime.tryParse(json['joinedAt'].toString()) : null),
      members: (json['members'] as List<dynamic>?)
              ?.map((m) => CommitteeMember.fromJson(m as Map<String, dynamic>))
              .toList() ??
          const [],
      subCommittees: (json['subCommittees'] as List<dynamic>?)
              ?.map((s) => Committee.fromJson(s as Map<String, dynamic>))
              .toList() ??
          const [],
      cloudDocuments: (json['cloudDocuments'] as List<dynamic>?)
              ?.map((d) => PinnedCloudResource.fromJson(d as Map<String, dynamic>))
              .toList() ??
          const [],
      myRole: json['myRole']?.toString(),
      myRoleDisplay: json['myRoleDisplay']?.toString() ?? json['myRole']?.toString(),
      customRoleTitle: json['customRoleTitle']?.toString(),
      isLeader: json['isLeader'] == true,
      canSubmitReport: json['canSubmitReport'] == true,
      reportsCount: int.tryParse(json['reportsCount']?.toString() ?? '0') ?? 0,
      cloudDocsCount: int.tryParse(json['cloudDocsCount']?.toString() ?? '0') ?? 0,
      isJoined: json['isJoined'] == true,
      isPendingApproval: json['isPendingApproval'] == true,
      requiresApproval: json['requiresApproval'] == true || json['requireApproval'] == true || json['visibility'] == 'ApprovalRequired',
      visibility: json['visibility']?.toString() ?? 'Public',
      iconName: json['iconName']?.toString(),
      coverBannerUrl: json['coverBannerUrl']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'code': code,
        'slug': slug,
        'description': description,
        'category': category,
        'maxMembers': maxMembers,
        'meetingSchedule': meetingSchedule,
        'meetingLocation': meetingLocation,
        'isPublicJoin': isPublicJoin,
        'allowExternalRegistration': allowExternalRegistration,
        'leaderName': leaderName,
        'leaderEmail': leaderEmail,
        'leaderTitle': leaderTitle,
        'parentCommitteeId': parentCommitteeId,
        'status': status,
        'extraInfoFormId': extraInfoFormId,
      };
}

/// Committee Member roster item.
class CommitteeMember {
  final String id;
  final String? committeeId;
  final String userProfileId;
  final String fullName;
  final String? email;
  final String? phone;
  final String role; // 'Chairperson', 'CoChair', 'Secretary', 'Member', etc.
  final String? customRoleTitle;
  final String status; // 'Active', 'Inactive'
  final DateTime? joinedAt;
  final String? avatarUrl;

  const CommitteeMember({
    required this.id,
    this.committeeId,
    required this.userProfileId,
    required this.fullName,
    this.email,
    this.phone,
    this.role = 'Member',
    this.customRoleTitle,
    this.status = 'Active',
    this.joinedAt,
    this.avatarUrl,
  });

  bool get isLeader =>
      ['Chairperson', 'CoChair', 'Secretary', 'Coordinator', 'Lead'].contains(role);

  factory CommitteeMember.fromJson(Map<String, dynamic> json) {
    return CommitteeMember(
      id: (json['id'] ?? '').toString(),
      committeeId: json['committeeId']?.toString(),
      userProfileId: (json['userProfileId'] ?? json['userId'] ?? '').toString(),
      fullName: (json['fullName'] ?? json['name'] ?? 'Member').toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      role: (json['role'] ?? 'Member').toString(),
      customRoleTitle: json['customRoleTitle']?.toString(),
      status: (json['status'] ?? 'Active').toString(),
      joinedAt: json['joinedAt'] != null ? DateTime.tryParse(json['joinedAt'].toString()) : null,
      avatarUrl: json['avatarUrl']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'committeeId': committeeId,
        'userProfileId': userProfileId,
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'role': role,
        'customRoleTitle': customRoleTitle,
        'status': status,
      };
}

/// Meeting Report model with rich minutes, roll-call, and follow-up action items.
class CommitteeReport {
  final String id;
  final String committeeId;
  final String? committeeName;
  final String title;
  final DateTime meetingDate;
  final String? executiveSummary;
  final String? minutes;
  final String? decisions;
  final String reviewStatus; // 'Draft', 'Submitted', 'Reviewed', 'Published'
  final String? adminRemarks;
  final List<ReportActionItem> actionItems;
  final List<AttendanceRecord> attendanceRollCall;
  final List<PinnedCloudResource> pinnedResources;
  final List<String> attachmentUrls;
  final DateTime? createdAt;
  final String? createdByName;

  const CommitteeReport({
    required this.id,
    required this.committeeId,
    this.committeeName,
    required this.title,
    required this.meetingDate,
    this.executiveSummary,
    this.minutes,
    this.decisions,
    this.reviewStatus = 'Submitted',
    this.adminRemarks,
    this.actionItems = const [],
    this.attendanceRollCall = const [],
    this.pinnedResources = const [],
    this.attachmentUrls = const [],
    this.createdAt,
    this.createdByName,
  });

  int get presentCount => attendanceRollCall.where((a) => a.status.toLowerCase() == 'present').length;
  int get excusedCount => attendanceRollCall.where((a) => a.status.toLowerCase() == 'excused').length;
  int get absentCount => attendanceRollCall.where((a) => a.status.toLowerCase() == 'absent').length;

  factory CommitteeReport.fromJson(Map<String, dynamic> json) {
    return CommitteeReport(
      id: (json['id'] ?? '').toString(),
      committeeId: (json['committeeId'] ?? '').toString(),
      committeeName: json['committeeName']?.toString(),
      title: (json['title'] ?? 'Meeting Report').toString(),
      meetingDate: json['meetingDate'] != null
          ? DateTime.tryParse(json['meetingDate'].toString()) ?? DateTime.now()
          : DateTime.now(),
      executiveSummary: json['executiveSummary']?.toString(),
      minutes: json['minutes']?.toString(),
      decisions: json['decisions']?.toString(),
      reviewStatus: json['reviewStatus']?.toString() ?? 'Submitted',
      adminRemarks: json['adminRemarks']?.toString(),
      actionItems: (json['actionItems'] as List<dynamic>?)
              ?.map((a) => ReportActionItem.fromJson(a as Map<String, dynamic>))
              .toList() ??
          const [],
      attendanceRollCall: (json['attendanceRollCall'] as List<dynamic>?)
              ?.map((r) => AttendanceRecord.fromJson(r as Map<String, dynamic>))
              .toList() ??
          const [],
      pinnedResources: (json['pinnedResources'] as List<dynamic>?)
              ?.map((p) => PinnedCloudResource.fromJson(p as Map<String, dynamic>))
              .toList() ??
          const [],
      attachmentUrls: (json['attachmentUrls'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
      createdByName: json['createdByName']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'committeeId': committeeId,
        'committeeName': committeeName,
        'title': title,
        'meetingDate': meetingDate.toIso8601String(),
        'executiveSummary': executiveSummary,
        'minutes': minutes,
        'decisions': decisions,
        'reviewStatus': reviewStatus,
        'adminRemarks': adminRemarks,
        'actionItems': actionItems.map((a) => a.toJson()).toList(),
        'attendanceRollCall': attendanceRollCall.map((r) => r.toJson()).toList(),
        'pinnedResources': pinnedResources.map((p) => p.toJson()).toList(),
        'attachmentUrls': attachmentUrls,
      };
}

/// Action item task attached to a meeting report.
class ReportActionItem {
  final String id;
  final String task;
  final String? assigneeName;
  final String? assigneeId;
  final DateTime? dueDate;
  final bool isCompleted;

  const ReportActionItem({
    required this.id,
    required this.task,
    this.assigneeName,
    this.assigneeId,
    this.dueDate,
    this.isCompleted = false,
  });

  factory ReportActionItem.fromJson(Map<String, dynamic> json) {
    return ReportActionItem(
      id: (json['id'] ?? '').toString(),
      task: (json['task'] ?? '').toString(),
      assigneeName: json['assigneeName']?.toString(),
      assigneeId: json['assigneeId']?.toString(),
      dueDate: json['dueDate'] != null ? DateTime.tryParse(json['dueDate'].toString()) : null,
      isCompleted: json['isCompleted'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'task': task,
        'assigneeName': assigneeName,
        'assigneeId': assigneeId,
        'dueDate': dueDate?.toIso8601String(),
        'isCompleted': isCompleted,
      };
}

/// Roll-call attendance record.
class AttendanceRecord {
  final String memberId;
  final String fullName;
  final String status; // 'present', 'excused', 'absent'
  final String? notes;

  const AttendanceRecord({
    required this.memberId,
    required this.fullName,
    this.status = 'present',
    this.notes,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      memberId: (json['memberId'] ?? json['userProfileId'] ?? '').toString(),
      fullName: (json['fullName'] ?? json['name'] ?? '').toString(),
      status: (json['status'] ?? 'present').toString(),
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'memberId': memberId,
        'fullName': fullName,
        'status': status,
        'notes': notes,
      };
}

/// Pinned Cloud Resource (Google Doc, Sheet, Slide, NotebookLM, Excel Online).
class PinnedCloudResource {
  final String id;
  final String title;
  final String url;
  final String provider; // 'google_docs', 'google_sheets', 'google_slides', 'notebook_lm', 'excel_online', 'cloud_drive'
  final String? externalFileId;
  final String? ownerEmail;
  final DateTime? pinnedAt;

  const PinnedCloudResource({
    required this.id,
    required this.title,
    required this.url,
    required this.provider,
    this.externalFileId,
    this.ownerEmail,
    this.pinnedAt,
  });

  factory PinnedCloudResource.fromJson(Map<String, dynamic> json) {
    return PinnedCloudResource(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Document').toString(),
      url: (json['url'] ?? '').toString(),
      provider: detectProvider(json['provider']?.toString(), json['url']?.toString()),
      externalFileId: json['externalFileId']?.toString(),
      ownerEmail: json['ownerEmail']?.toString(),
      pinnedAt: json['pinnedAt'] != null ? DateTime.tryParse(json['pinnedAt'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'url': url,
        'provider': provider,
        'externalFileId': externalFileId,
        'ownerEmail': ownerEmail,
      };

  static String detectProvider(String? explicitProvider, String? url) {
    if (explicitProvider != null && explicitProvider.trim().isNotEmpty) {
      return explicitProvider.trim().toLowerCase();
    }
    if (url == null) return 'cloud_drive';
    final u = url.toLowerCase();
    if (u.contains('spreadsheets') || u.contains('sheets.google')) return 'google_sheets';
    if (u.contains('presentation') || u.contains('slides.google')) return 'google_slides';
    if (u.contains('docs.google.com/document')) return 'google_docs';
    if (u.contains('notebooklm.google')) return 'notebook_lm';
    if (u.contains('sharepoint') || u.contains('1drv.ms') || u.contains('onedrive') || u.contains('excel')) {
      return 'excel_online';
    }
    return 'cloud_drive';
  }
}

/// Intake registration application from internal or external applicants.
class CommitteeRegistration {
  final String id;
  final String committeeId;
  final String? committeeName;
  final String fullName;
  final String email;
  final String? phone;
  final String status; // 'Pending', 'Approved', 'Rejected'
  final DateTime submittedAt;
  final Map<String, dynamic> extraInfoResponses;
  final String? rejectionReason;
  final String? reviewNotes;
  final String? assignedRole;

  const CommitteeRegistration({
    required this.id,
    required this.committeeId,
    this.committeeName,
    required this.fullName,
    required this.email,
    this.phone,
    this.status = 'Pending',
    required this.submittedAt,
    this.extraInfoResponses = const {},
    this.rejectionReason,
    this.reviewNotes,
    this.assignedRole,
  });

  factory CommitteeRegistration.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic> responses = {};
    if (json['extraInfoResponses'] is Map) {
      responses = Map<String, dynamic>.from(json['extraInfoResponses'] as Map);
    } else if (json['extraInfoResponses'] is String && (json['extraInfoResponses'] as String).isNotEmpty) {
      try {
        responses = jsonDecode(json['extraInfoResponses'] as String) as Map<String, dynamic>;
      } catch (_) {}
    }

    return CommitteeRegistration(
      id: (json['id'] ?? '').toString(),
      committeeId: (json['committeeId'] ?? '').toString(),
      committeeName: json['committeeName']?.toString(),
      fullName: (json['fullName'] ?? json['name'] ?? 'Applicant').toString(),
      email: (json['email'] ?? '').toString(),
      phone: json['phone']?.toString(),
      status: (json['status'] ?? 'Pending').toString(),
      submittedAt: json['submittedAt'] != null
          ? DateTime.tryParse(json['submittedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      extraInfoResponses: responses,
      rejectionReason: json['rejectionReason']?.toString(),
      reviewNotes: json['reviewNotes']?.toString(),
      assignedRole: json['assignedRole']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'committeeId': committeeId,
        'committeeName': committeeName,
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'status': status,
        'extraInfoResponses': extraInfoResponses,
        'rejectionReason': rejectionReason,
      };
}

/// Dynamic Extra-Info Form designer definition.
class CommitteeExtraInfoForm {
  final String id;
  final String title;
  final String? description;
  final bool isDefault;
  final List<ExtraInfoFormField> fields;
  final DateTime? createdAt;

  const CommitteeExtraInfoForm({
    required this.id,
    required this.title,
    this.description,
    this.isDefault = false,
    this.fields = const [],
    this.createdAt,
  });

  factory CommitteeExtraInfoForm.fromJson(Map<String, dynamic> json) {
    return CommitteeExtraInfoForm(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Form').toString(),
      description: json['description']?.toString(),
      isDefault: json['isDefault'] == true,
      fields: (json['fields'] as List<dynamic>?)
              ?.map((f) => ExtraInfoFormField.fromJson(f as Map<String, dynamic>))
              .toList() ??
          const [],
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'isDefault': isDefault,
        'fields': fields.map((f) => f.toJson()).toList(),
      };
}

/// Dynamic field inside an Extra-Info Form.
class ExtraInfoFormField {
  final String id;
  final String label;
  final String fieldType; // 'text', 'textarea', 'number', 'email', 'dropdown', 'checkbox', 'radio', 'file'
  final bool isRequired;
  final String? placeholder;
  final String? helpText;
  final List<String> options;

  const ExtraInfoFormField({
    required this.id,
    required this.label,
    this.fieldType = 'text',
    this.isRequired = false,
    this.placeholder,
    this.helpText,
    this.options = const [],
  });

  factory ExtraInfoFormField.fromJson(Map<String, dynamic> json) {
    return ExtraInfoFormField(
      id: (json['id'] ?? '').toString(),
      label: (json['label'] ?? 'Field').toString(),
      fieldType: (json['fieldType'] ?? json['type'] ?? 'text').toString(),
      isRequired: json['isRequired'] == true || json['required'] == true,
      placeholder: json['placeholder']?.toString(),
      helpText: json['helpText']?.toString(),
      options: (json['options'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'fieldType': fieldType,
        'isRequired': isRequired,
        'placeholder': placeholder,
        'helpText': helpText,
        'options': options,
      };
}

/// Settings and dynamic configuration for bcp-committees.
class CommitteeSettings {
  final CommitteeAliases aliases;
  final bool allowPublicIntake;
  final bool requireLeaderApproval;
  final bool enableCloudShelf;
  final List<String> customKpis;

  const CommitteeSettings({
    this.aliases = const CommitteeAliases(),
    this.allowPublicIntake = true,
    this.requireLeaderApproval = true,
    this.enableCloudShelf = true,
    this.customKpis = const [],
  });

  factory CommitteeSettings.fromJson(Map<String, dynamic> json) {
    return CommitteeSettings(
      aliases: CommitteeAliases.fromJson(json),
      allowPublicIntake: json['allowPublicIntake'] != false,
      requireLeaderApproval: json['requireLeaderApproval'] != false,
      enableCloudShelf: json['enableCloudShelf'] != false,
      customKpis: (json['customKpis'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }

  Map<String, dynamic> toJson() => {
        ...aliases.toJson(),
        'allowPublicIntake': allowPublicIntake,
        'requireLeaderApproval': requireLeaderApproval,
        'enableCloudShelf': enableCloudShelf,
        'customKpis': customKpis,
      };
}

/// High-level KPI metrics for the Committees Admin Dashboard.
class CommitteeDashboardMetrics {
  final int activeCommitteesCount;
  final int activeSubUnitsCount;
  final int totalEnrolledMembers;
  final double averageAttendanceRate;
  final int recentReportsCount;
  final int pendingRegistrationsCount;

  const CommitteeDashboardMetrics({
    this.activeCommitteesCount = 0,
    this.activeSubUnitsCount = 0,
    this.totalEnrolledMembers = 0,
    this.averageAttendanceRate = 0.0,
    this.recentReportsCount = 0,
    this.pendingRegistrationsCount = 0,
  });

  factory CommitteeDashboardMetrics.fromJson(Map<String, dynamic> json) {
    return CommitteeDashboardMetrics(
      activeCommitteesCount: int.tryParse(json['activeCommitteesCount']?.toString() ?? '0') ?? 0,
      activeSubUnitsCount: int.tryParse(json['activeSubUnitsCount']?.toString() ?? '0') ?? 0,
      totalEnrolledMembers: int.tryParse(json['totalEnrolledMembers']?.toString() ?? '0') ?? 0,
      averageAttendanceRate: double.tryParse(json['averageAttendanceRate']?.toString() ?? '0.0') ?? 0.0,
      recentReportsCount: int.tryParse(json['recentReportsCount']?.toString() ?? '0') ?? 0,
      pendingRegistrationsCount: int.tryParse(json['pendingRegistrationsCount']?.toString() ?? '0') ?? 0,
    );
  }
}

