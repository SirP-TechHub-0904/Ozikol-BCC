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
}
