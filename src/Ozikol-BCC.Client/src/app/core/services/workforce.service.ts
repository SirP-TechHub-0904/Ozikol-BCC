import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ClientSite {
  id: string;
  siteCode: string;
  siteName: string;
  address: string;
  city: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  siteAssignmentInstructions?: string;
  requiredSiaLicenceType?: string;
  activeShiftsCount: number;
  clientOrganizationId?: string;
  clientOrganizationName?: string;
}

export interface Shift {
  id: string;
  shiftCode: string;
  clientSiteId: string;
  siteName: string;
  siteAddress: string;
  postName: string;
  facilityName?: string;
  address?: string;
  postCode?: string;
  eventTag?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  startsAtUtc: string;
  endsAtUtc: string;
  isOvernight: boolean;
  breakMinutes: number;
  plannedDurationHours: number;
  hourlyPayRate?: number;
  hourlyChargeRate?: number;
  requiredWorkspaceStationId?: string;
  requiredWorkspaceStationName?: string;
  status: string;
  isConfirmedByGuard: boolean;
  confirmedAtUtc?: string;
  acceptanceDeadlineUtc?: string;
  acceptanceCountdownMinutes?: number;
  notes?: string;
  siteAssignmentInstructions?: string;
  emergencyContactPhone?: string;
  isClockedIn: boolean;
  isClockedOut: boolean;
}

export interface LiveDutyMonitorItem {
  shiftId: string;
  shiftCode: string;
  siteName: string;
  postName: string;
  guardName: string;
  guardId?: string;
  startsAtUtc: string;
  endsAtUtc: string;
  isOvernight: boolean;
  shiftStatus: string;
  clockInUtc?: string;
  isGeofenceVerified: boolean;
  distanceFromSiteMeters?: number;
  isFlagged: boolean;
  flagReason?: string;
  lastWelfareCheckAtUtc?: string;
  isMissedClockIn: boolean;
}

export interface ClockInPayload {
  shiftId: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  method?: string;
  biometricVerified?: boolean;
  biometricType?: string;
  photoUrl?: string;
}

export interface ClockInResult {
  attendanceId: string;
  clockInUtc: string;
  isGeofenceVerified: boolean;
  distanceFromSiteMeters: number;
  isFlagged: boolean;
  flagReason?: string;
  requiredStationUnlocked: boolean;
  biometricVerified?: boolean;
  photoUrl?: string;
}

export interface ClockOutPayload {
  shiftId: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  method?: string;
  photoUrl?: string;
}

export interface ClockOutResult {
  attendanceId: string;
  clockOutUtc: string;
  totalDurationHours: number;
  billableHours: number;
  overtimeHours: number;
}

export interface StationAccessValidation {
  isAuthorized: boolean;
  requiresClockIn: boolean;
  shiftId?: string;
  shiftCode?: string;
  message: string;
}

/**
 * Service managing Workforce, 24/7 Rota, Geofenced Attendance and Workstation Gatekeeping
 * for bcp-staff-rota and bcp-attendance-tracking.
 * Uses ApiService to ensure automated tenant headers (X-Tenant-Key), JWT authorization,
 * and reliable URL resolution.
 */
@Injectable({
  providedIn: 'root'
})
export class WorkforceService {
  constructor(private readonly apiService: ApiService) {}

  // --- SITES ---
  getSites(): Observable<any> {
    return this.apiService.get<any>('workforce/sites');
  }

  getSiteById(id: string): Observable<any> {
    return this.apiService.get<any>(`workforce/sites/${id}`);
  }

  upsertSite(site: Partial<ClientSite>): Observable<any> {
    return this.apiService.post<any>('workforce/sites', site);
  }

  // --- SHIFTS ---
  getShifts(filters?: { startDate?: string; endDate?: string; siteId?: string; userId?: string; status?: string }): Observable<any> {
    return this.apiService.get<any>('workforce/shifts', filters);
  }

  getMyShifts(): Observable<any> {
    return this.apiService.get<any>('workforce/shifts/my');
  }

  createShift(shift: any): Observable<any> {
    return this.apiService.post<any>('workforce/shifts', shift);
  }

  confirmShift(shiftId: string): Observable<any> {
    return this.apiService.post<any>(`workforce/shifts/${shiftId}/confirm`, {});
  }

  // --- SWAPS ---
  requestSwap(swap: any): Observable<any> {
    return this.apiService.post<any>('workforce/swaps', swap);
  }

  claimOpenShift(swapId: string): Observable<any> {
    return this.apiService.post<any>(`workforce/swaps/${swapId}/claim`, {});
  }

  reviewSwap(swapId: string, review: { isApproved: boolean; rejectionReason?: string }): Observable<any> {
    return this.apiService.post<any>(`workforce/swaps/${swapId}/review`, review);
  }

  // --- LEAVE ---
  requestLeave(leave: any): Observable<any> {
    return this.apiService.post<any>('workforce/leave', leave);
  }

  // --- ATTENDANCE & GEOFENCE ---
  clockIn(payload: ClockInPayload): Observable<any> {
    return this.apiService.post<any>('workforce/attendance/clock-in', payload);
  }

  clockOut(payload: ClockOutPayload): Observable<any> {
    return this.apiService.post<any>('workforce/attendance/clock-out', payload);
  }

  confirmWelfareCheck(shiftId: string): Observable<any> {
    return this.apiService.post<any>('workforce/attendance/welfare-check', { shiftId });
  }

  getLiveDutyMonitor(): Observable<any> {
    return this.apiService.get<any>('workforce/attendance/live-monitor');
  }

  approveTimesheet(attendanceId: string, payload: { adjustedBillableHours?: number; supervisorNotes?: string }): Observable<any> {
    return this.apiService.post<any>(`workforce/attendance/timesheets/${attendanceId}/approve`, payload);
  }

  validateStationAccess(stationId: string): Observable<any> {
    return this.apiService.get<any>('workforce/attendance/validate-station-access', { stationId });
  }

  // --- STAFF ENROLLMENT & ROSTER ---
  enrollMember(member: any): Observable<any> {
    return this.apiService.post<any>('workforce/members/enroll', member);
  }

  getMembers(): Observable<any> {
    return this.apiService.get<any>('workforce/members');
  }

  // --- GRAPHICAL ANALYTICS & KPIS ---
  getAnalytics(): Observable<any> {
    return this.apiService.get<any>('workforce/analytics');
  }

  /**
   * Retrieves active running currency configured in Central for the tenant.
   */
  getTenantCurrency(): Observable<any> {
    return this.apiService.get<any>('workforce/currency');
  }

  getCurrency(): Observable<any> {
    return this.getTenantCurrency();
  }

  // --- RATINGS & REVIEWS ---
  submitRating(rating: any): Observable<any> {
    return this.apiService.post<any>('workforce/ratings', rating);
  }

  getRatings(userId: string): Observable<any> {
    return this.apiService.get<any>(`workforce/ratings/${userId}`);
  }

  // --- TRI-STATE AVAILABILITY ---
  getAvailability(filters?: { userId?: string; fromDate?: string; toDate?: string }): Observable<any> {
    return this.apiService.get<any>('workforce/availability', filters);
  }

  upsertAvailability(availability: { targetDate: string; state: string; unavailableFromTime?: string; unavailableToTime?: string; reason?: string }): Observable<any> {
    return this.apiService.post<any>('workforce/availability', availability);
  }

  // --- COMPLIANCE & DOCUMENTS ---
  getDocuments(userId?: string): Observable<any> {
    return this.apiService.get<any>('workforce/documents', userId ? { userId } : undefined);
  }

  uploadDocument(doc: { documentType: string; documentName: string; description?: string; fileUrl: string; expiryDateUtc?: string }): Observable<any> {
    return this.apiService.post<any>('workforce/documents', doc);
  }

  // --- CUSTOM SHIFT REMINDER PREFERENCES ---
  getNotificationPreferences(): Observable<any> {
    return this.apiService.get<any>('workforce/notifications/preferences');
  }

  updateNotificationPreferences(pref: any): Observable<any> {
    return this.apiService.post<any>('workforce/notifications/preferences', pref);
  }

  // --- MEMBER ONBOARDING & ENROLLMENT ---
  inviteMember(data: any): Observable<any> {
    return this.apiService.post<any>('workforce/members/invite', data);
  }

  directEnrollMember(data: any): Observable<any> {
    return this.apiService.post<any>('workforce/members/direct-enroll', data);
  }

  verifyOnboardingToken(token: string, email?: string): Observable<any> {
    return this.apiService.get<any>('workforce/members/verify-token', { token, email });
  }

  completeOnboarding(data: any): Observable<any> {
    return this.apiService.post<any>('workforce/members/complete-onboarding', data);
  }

  // --- STAFF TYPES GOVERNANCE ---
  getStaffTypes(): Observable<any> {
    return this.apiService.get<any>('workforce/staff-types');
  }

  createStaffType(type: { name: string; code?: string; description?: string; defaultContractedHours?: number; sortOrder?: number }): Observable<any> {
    return this.apiService.post<any>('workforce/staff-types', type);
  }

  updateStaffType(id: string, type: { name: string; description?: string; defaultContractedHours?: number; isActive?: boolean; sortOrder?: number }): Observable<any> {
    return this.apiService.put<any>(`workforce/staff-types/${id}`, type);
  }

  deleteStaffType(id: string): Observable<any> {
    return this.apiService.delete<any>(`workforce/staff-types/${id}`);
  }

  // --- JOB ROLES & PAY RATES ---
  getJobRoles(): Observable<any> {
    return this.apiService.get<any>('workforce/job-roles');
  }

  createJobRole(role: any): Observable<any> {
    return this.apiService.post<any>('workforce/job-roles', role);
  }

  updateJobRole(id: string, role: any): Observable<any> {
    return this.apiService.put<any>(`workforce/job-roles/${id}`, role);
  }

  deleteJobRole(id: string): Observable<any> {
    return this.apiService.delete<any>(`workforce/job-roles/${id}`);
  }

  // --- WORKFORCE OPERATIONAL POLICIES ---
  getWorkforcePolicies(): Observable<any> {
    return this.apiService.get<any>('workforce/settings/policies');
  }

  updateWorkforcePolicies(policy: any): Observable<any> {
    return this.apiService.put<any>('workforce/settings/policies', policy);
  }

  // --- CLIENT ORGANIZATIONS ---
  getClientOrganizations(): Observable<any> {
    return this.apiService.get<any>('workforce/client-organizations');
  }

  createClientOrganization(org: any): Observable<any> {
    return this.apiService.post<any>('workforce/client-organizations', org);
  }

  updateClientOrganization(id: string, org: any): Observable<any> {
    return this.apiService.put<any>(`workforce/client-organizations/${id}`, org);
  }

  deleteClientOrganization(id: string): Observable<any> {
    return this.apiService.delete<any>(`workforce/client-organizations/${id}`);
  }

  // --- DEDICATED STAFF MEMBER PROFILE HUB ---
  getMemberDetail(userId: string): Observable<any> {
    return this.apiService.get<any>(`workforce/members/${userId}`);
  }

  updateMemberDetail(userId: string, data: any): Observable<any> {
    return this.apiService.put<any>(`workforce/members/${userId}`, data);
  }

  // --- DOCUMENT CATEGORIES & COMPLIANCE POLICIES ---
  getDocumentCategories(): Observable<any> {
    return this.apiService.get<any>('workforce/document-categories');
  }

  createDocumentCategory(category: any): Observable<any> {
    return this.apiService.post<any>('workforce/document-categories', category);
  }

  updateDocumentCategory(id: string, category: any): Observable<any> {
    return this.apiService.put<any>(`workforce/document-categories/${id}`, category);
  }

  deleteDocumentCategory(id: string): Observable<any> {
    return this.apiService.delete<any>(`workforce/document-categories/${id}`);
  }
}
