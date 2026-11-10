import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Service for creating and redeeming one‑time invitation links.
 */
@Injectable({ providedIn: 'root' })
export class InvitationService {
  constructor(private http: HttpClient) {}

  /**
   * Sends a request to create a new invitation.
   */
  createInvitation(payload: CreateInvitationRequest): Observable<string> {
    return this.http.post<string>('/api/workforce/invitations', payload, { responseType: 'text' as 'json' });
  }

  /**
   * Redeems a token – returns the invitation data.
   */
  redeem(token: string): Observable<InvitationDto> {
    return this.http.get<InvitationDto>(`/api/workforce/invitations/${token}`);
  }
}

/** Request DTO used by the API */
export interface CreateInvitationRequest {
  fullName: string;
  email: string;
  phoneNumber?: string;
}

/** DTO returned after a successful redeem */
export interface InvitationDto {
  fullName: string;
  email: string;
  phoneNumber?: string;
  token: string;
  createdUtc: string;
  expiresUtc?: string;
}

