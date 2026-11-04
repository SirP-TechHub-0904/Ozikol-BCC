import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../workspace_auth/state/workspace_state.dart';
import '../models/committee_models.dart';

final committeesApiServiceProvider = Provider<CommitteesApiService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return CommitteesApiService(apiClient.dio);
});

/// API service client communicating with ASP.NET Core `CommitteesApiController` (`/api/committees`).
class CommitteesApiService {
  final Dio _dio;

  CommitteesApiService(this._dio);

  // =========================================================================
  // SETTINGS & DASHBOARD
  // =========================================================================

  Future<CommitteeSettings> getSettings() async {
    try {
      final res = await _dio.get('api/committees/settings');
      if (res.data is Map<String, dynamic>) {
        final data = res.data['data'] ?? res.data;
        return CommitteeSettings.fromJson(data as Map<String, dynamic>);
      }
      return const CommitteeSettings();
    } catch (_) {
      return const CommitteeSettings();
    }
  }

  Future<CommitteeSettings> updateSettings(Map<String, dynamic> payload) async {
    final res = await _dio.put('api/committees/settings', data: payload);
    final data = res.data is Map ? (res.data['data'] ?? res.data) : {};
    return CommitteeSettings.fromJson(data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> getDashboard() async {
    final res = await _dio.get('api/committees/dashboard');
    if (res.data is Map<String, dynamic>) {
      return res.data['data'] as Map<String, dynamic>? ?? res.data;
    }
    return {};
  }

  // =========================================================================
  // MANAGE COMMITTEES, ROSTER & MEMBERS
  // =========================================================================

  Future<List<Committee>> getManagedCommittees({String? search, String? status}) async {
    final res = await _dio.get(
      'api/committees/manage',
      queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (status != null && status != 'All') 'status': status,
      },
    );

    final rawList = res.data is Map ? (res.data['data'] ?? res.data['items']) : res.data;
    if (rawList is List) {
      return rawList.map((e) => Committee.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<Committee> getCommitteeDetails(String id) async {
    final res = await _dio.get('api/committees/$id');
    final data = res.data is Map ? (res.data['data'] ?? res.data) : res.data;
    return Committee.fromJson(data as Map<String, dynamic>);
  }

  Future<Committee> createCommittee(Map<String, dynamic> payload) async {
    final res = await _dio.post('api/committees', data: payload);
    final data = res.data is Map ? (res.data['data'] ?? res.data) : res.data;
    return Committee.fromJson(data as Map<String, dynamic>);
  }

  Future<Committee> updateCommittee(String id, Map<String, dynamic> payload) async {
    final res = await _dio.put('api/committees/$id', data: payload);
    final data = res.data is Map ? (res.data['data'] ?? res.data) : res.data;
    return Committee.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteCommittee(String id) async {
    await _dio.delete('api/committees/$id');
  }

  Future<List<Map<String, dynamic>>> searchUserCandidates({String? search, String? committeeId}) async {
    final res = await _dio.get(
      'api/committees/candidates',
      queryParameters: {
        'search': search ?? '',
        if (committeeId != null) 'committeeId': committeeId,
      },
    );
    final rawList = res.data is Map ? (res.data['data'] ?? res.data['items']) : res.data;
    if (rawList is List) {
      return rawList.cast<Map<String, dynamic>>();
    }
    return [];
  }

  Future<void> addMember(
    String committeeId, {
    required String userProfileId,
    required String role,
    String? customRoleTitle,
  }) async {
    await _dio.post(
      'api/committees/$committeeId/members',
      data: {
        'userProfileId': userProfileId,
        'role': role,
        if (customRoleTitle != null) 'customRoleTitle': customRoleTitle,
      },
    );
  }

  Future<void> updateMember(
    String committeeId,
    String memberId, {
    String? role,
    String? customRoleTitle,
    String? status,
  }) async {
    await _dio.put(
      'api/committees/$committeeId/members/$memberId',
      data: {
        if (role != null) 'role': role,
        if (customRoleTitle != null) 'customRoleTitle': customRoleTitle,
        if (status != null) 'status': status,
      },
    );
  }

  Future<void> removeMember(String committeeId, String memberId) async {
    await _dio.delete('api/committees/$committeeId/members/$memberId');
  }

  // =========================================================================
  // EXTRA-INFO FORMS & INTAKE REGISTRATIONS
  // =========================================================================

  Future<List<CommitteeExtraInfoForm>> getForms() async {
    final res = await _dio.get('api/committees/forms');
    final rawList = res.data is Map ? (res.data['data'] ?? res.data['items']) : res.data;
    if (rawList is List) {
      return rawList.map((e) => CommitteeExtraInfoForm.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<CommitteeExtraInfoForm> createForm(Map<String, dynamic> payload) async {
    final res = await _dio.post('api/committees/forms', data: payload);
    final data = res.data is Map ? (res.data['data'] ?? res.data) : res.data;
    return CommitteeExtraInfoForm.fromJson(data as Map<String, dynamic>);
  }

  Future<CommitteeExtraInfoForm> updateForm(String formId, Map<String, dynamic> payload) async {
    final res = await _dio.put('api/committees/forms/$formId', data: payload);
    final data = res.data is Map ? (res.data['data'] ?? res.data) : res.data;
    return CommitteeExtraInfoForm.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteForm(String formId) async {
    await _dio.delete('api/committees/forms/$formId');
  }

  Future<List<CommitteeRegistration>> getRegistrations({String? committeeId, String? status}) async {
    final res = await _dio.get(
      'api/committees/registrations',
      queryParameters: {
        if (committeeId != null) 'committeeId': committeeId,
        if (status != null && status != 'All') 'status': status,
      },
    );
    final rawList = res.data is Map ? (res.data['data'] ?? res.data['items']) : res.data;
    if (rawList is List) {
      return rawList.map((e) => CommitteeRegistration.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<void> reviewRegistration(
    String regId, {
    required String decision,
    String? reassignCommitteeId,
    String? assignedRole,
    String? reviewNotes,
  }) async {
    await _dio.post(
      'api/committees/registrations/$regId/review',
      data: {
        'decision': decision,
        if (reassignCommitteeId != null) 'reassignCommitteeId': reassignCommitteeId,
        if (assignedRole != null) 'assignedRole': assignedRole,
        if (reviewNotes != null) 'reviewNotes': reviewNotes,
      },
    );
  }

  // =========================================================================
  // MEETING REPORTS & AI DIGEST
  // =========================================================================

  Future<List<CommitteeReport>> getReports({String? committeeId, String? reviewStatus}) async {
    final res = await _dio.get(
      'api/committees/reports',
      queryParameters: {
        if (committeeId != null) 'committeeId': committeeId,
        if (reviewStatus != null && reviewStatus != 'All') 'reviewStatus': reviewStatus,
      },
    );
    final rawList = res.data is Map ? (res.data['data'] ?? res.data['items']) : res.data;
    if (rawList is List) {
      return rawList.map((e) => CommitteeReport.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<CommitteeReport> getReportById(String reportId) async {
    final res = await _dio.get('api/committees/reports/$reportId');
    final data = res.data is Map ? (res.data['data'] ?? res.data) : res.data;
    return CommitteeReport.fromJson(data as Map<String, dynamic>);
  }

  Future<CommitteeReport> submitReport(Map<String, dynamic> payload) async {
    final res = await _dio.post('api/committees/reports', data: payload);
    final data = res.data is Map ? (res.data['data'] ?? res.data) : res.data;
    return CommitteeReport.fromJson(data as Map<String, dynamic>);
  }

  Future<void> reviewReport(String reportId, {required String reviewStatus, String? adminRemarks}) async {
    await _dio.post(
      'api/committees/reports/$reportId/review',
      data: {
        'reviewStatus': reviewStatus,
        if (adminRemarks != null) 'adminRemarks': adminRemarks,
      },
    );
  }

  Future<String> generateAiDigest(String reportId) async {
    final res = await _dio.post('api/committees/reports/$reportId/ai-digest');
    final data = res.data is Map ? (res.data['data'] ?? res.data) : res.data;
    return (data is Map ? data['digest'] : data)?.toString() ?? 'Executive summary generated.';
  }

  // =========================================================================
  // MEMBER WORKSPACE & DISCOVER
  // =========================================================================

  Future<Map<String, dynamic>> getMyWorkspaceCommittees() async {
    final res = await _dio.get('api/committees/workspace/my');
    if (res.data is Map<String, dynamic>) {
      return res.data['data'] as Map<String, dynamic>? ?? res.data;
    }
    return {};
  }

  Future<List<Committee>> discoverWorkspaceCommittees() async {
    final res = await _dio.get('api/committees/workspace/discover');
    final rawList = res.data is Map ? (res.data['data'] ?? res.data['items']) : res.data;
    if (rawList is List) {
      return rawList.map((e) => Committee.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<void> joinFromWorkspace(
    String committeeId, {
    Map<String, dynamic>? extraInfoResponses,
    List<String>? attachmentUrls,
  }) async {
    await _dio.post(
      'api/committees/workspace/$committeeId/join',
      data: {
        if (extraInfoResponses != null) 'extraInfoResponses': extraInfoResponses,
        if (attachmentUrls != null) 'attachmentUrls': attachmentUrls,
      },
    );
  }

  // =========================================================================
  // CLOUD SHELF (GOOGLE DOCS, SHEETS, SLIDES, NOTEBOOKLM, EXCEL ONLINE)
  // =========================================================================

  Future<PinnedCloudResource> linkCloudDocument(Map<String, dynamic> payload) async {
    final res = await _dio.post('api/committees/workspace/cloud-docs', data: payload);
    final data = res.data is Map ? (res.data['data'] ?? res.data) : res.data;
    return PinnedCloudResource.fromJson(data as Map<String, dynamic>);
  }

  Future<void> unlinkCloudDocument(String docId) async {
    await _dio.delete('api/committees/workspace/cloud-docs/$docId');
  }
}

