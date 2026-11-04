import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

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
}

export interface Shift {
  id: string;
  shiftCode: string;
  clientSiteId: string;
  siteName: string;
  siteAddress: string;
  postName: string;
  assignedUserId?: string;
  assignedUserName?: string;
  startsAtUtc: string;
  endsAtUtc: string;
  isOvernight: boolean;
  breakMinutes: number;
  plannedDurationHours: number;
  requiredWorkspaceStationId?: string;
  requiredWorkspaceStationName?: string;
  status: string;
  isConfirmedByGuard: boolean;
  confirmedAtUtc?: string;
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
}

export interface ClockInResult {
  attendanceId: string;
  clockInUtc: string;
  isGeofenceVerified: boolean;
  distanceFromSiteMeters: number;
  isFlagged: boolean;
  flagReason?: string;
  requiredStationUnlocked: boolean;
}

export interface ClockOutPayload {
  shiftId: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  method?: string;
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
 */
@Injectable({
  providedIn: 'root'
})
export class WorkforceService {
  private readonly baseUrl = `${environment.apiUrl || ''}/api/workforce`;

  constructor(
    private readonly http: HttpClient,
    private readonly apiService: ApiService
  ) {}

  // --- SITES ---
  getSites(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/sites`);
  }

  upsertSite(site: Partial<ClientSite>): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/sites`, site);
  }

  // --- SHIFTS ---
  getShifts(filters?: { startDate?: string; endDate?: string; siteId?: string; userId?: string; status?: string }): Observable<any> {
    const params: any = {};
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.siteId) params.siteId = filters.siteId;
    if (filters?.userId) params.userId = filters.userId;
    if (filters?.status) params.status = filters.status;
    return this.http.get<any>(`${this.baseUrl}/shifts`, { params });
  }

  getMyShifts(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/shifts/my`);
  }

  createShift(shift: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/shifts`, shift);
  }

  confirmShift(shiftId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/shifts/${shiftId}/confirm`, {});
  }

  // --- SWAPS ---
  requestSwap(swap: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/swaps`, swap);
  }

  claimOpenShift(swapId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/swaps/${swapId}/claim`, {});
  }

  reviewSwap(swapId: string, review: { isApproved: boolean; rejectionReason?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/swaps/${swapId}/review`, review);
  }

  // --- LEAVE ---
  requestLeave(leave: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/leave`, leave);
  }

  // --- ATTENDANCE & GEOFENCE ---
  clockIn(payload: ClockInPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/attendance/clock-in`, payload);
  }

  clockOut(payload: ClockOutPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/attendance/clock-out`, payload);
  }

  confirmWelfareCheck(shiftId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/attendance/welfare-check`, { shiftId });
  }

  getLiveDutyMonitor(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/attendance/live-monitor`);
  }

  approveTimesheet(attendanceId: string, payload: { adjustedBillableHours?: number; supervisorNotes?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/attendance/timesheets/${attendanceId}/approve`, payload);
  }

  validateStationAccess(stationId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/attendance/validate-station-access`, { params: { stationId } });
  }
}

