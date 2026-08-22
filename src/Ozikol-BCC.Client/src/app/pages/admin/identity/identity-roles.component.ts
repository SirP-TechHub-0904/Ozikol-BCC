import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface FeatureRoleScope {
  featureName: string;
  scope: 'None' | 'ReadOnly' | 'FeatureEdit' | 'GlobalEdit';
}

@Component({
  selector: 'app-identity-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="identity-page">
      <app-page-header
        eyebrow="ACCESS CONTROL LIST"
        icon="shield_person"
        title="Roles & Feature Scopes"
        subtitle="Manage user administrative statuses and assign fine-grained, feature-specific CRUD scopes."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Main Layout Grid -->
      <div class="roles-layout">
        <!-- Sidebar: User Search & Autocomplete -->
        <div class="search-sidebar">
          <div class="console-widget">
            <h3 class="sidebar-title">Select User Account</h3>
            <div class="search-box-wrapper" style="position: relative;">
              <span class="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                class="form-control"
                placeholder="Search by name or email..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange($event)"
                style="padding-left: 36px;"
              />
            </div>

            <!-- Matching Users List -->
            <div class="search-results">
              <div *ngIf="isSearching" class="search-status">Searching users...</div>
              <div *ngIf="!isSearching && searchResults.length === 0 && searchQuery.length >= 2" class="search-status">No matching users found.</div>
              
              <ul class="user-list" *ngIf="searchResults.length > 0">
                <li 
                  *ngFor="let u of searchResults" 
                  (click)="selectUser(u)"
                  [class.active]="selectedUser && selectedUser.id === u.id"
                  class="user-item"
                >
                  <div class="user-avatar-placeholder">
                    {{ u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U' }}
                  </div>
                  <div class="user-meta">
                    <span class="user-name">{{ u.fullName }}</span>
                    <span class="user-email">{{ u.email }}</span>
                    <span class="user-designation" *ngIf="u.designation">{{ u.designation }}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Main Workspace: Roles Form Mapping -->
        <div class="form-workspace">
          <div *ngIf="!selectedUser" class="empty-state">
            <span class="material-symbols-outlined empty-icon">lock_open</span>
            <h4>No User Selected</h4>
            <p>Search and select a workspace user from the left panel to configure their authorization profile.</p>
          </div>

          <div *ngIf="selectedUser" class="console-widget animate-fade">
            <!-- Header Selected Info -->
            <div class="selected-user-header">
              <div class="user-info-large">
                <div class="avatar-large">
                  {{ selectedUser.fullName ? selectedUser.fullName.charAt(0).toUpperCase() : 'U' }}
                </div>
                <div>
                  <h2 class="user-title-name">{{ selectedUser.fullName }}</h2>
                  <span class="user-title-email">{{ selectedUser.email }}</span>
                  <div class="meta-badges" style="margin-top: 6px; display: flex; gap: 8px;">
                    <span class="badge badge-member" *ngIf="selectedUser.memberId">ID: {{ selectedUser.memberId }}</span>
                    <span class="badge badge-admin" *ngIf="selectedUserRoles.isAdmin">Global Admin</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Global Admin Switch -->
            <div class="policy-card" [class.is-admin-active]="selectedUserRoles.isAdmin" style="margin-bottom: 24px;">
              <div class="policy-info">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="material-symbols-outlined policy-icon" [style.color]="selectedUserRoles.isAdmin ? '#0050e5' : '#64748b'">
                    {{ selectedUserRoles.isAdmin ? 'admin_panel_settings' : 'shield' }}
                  </span>
                  <span class="policy-title">Global Administrator Rights</span>
                  <span class="badge badge-admin-active" *ngIf="selectedUserRoles.isAdmin">ACTIVE PRIVILEGES</span>
                </div>
                <span class="policy-desc">Grants unrestricted operational access to CMS, Identity Console, Brand settings, System Widgets, and Member Governance.</span>
              </div>
              <label class="toggle-switch" (click)="onToggleClick($event)">
                <input type="checkbox" [checked]="selectedUserRoles.isAdmin" readonly />
                <span class="slider"></span>
              </label>
            </div>

            <!-- Admin Privileges Notice Banner if Admin Active -->
            <div *ngIf="selectedUserRoles.isAdmin" class="admin-elevated-banner animate-fade">
              <span class="material-symbols-outlined banner-icon">verified_user</span>
              <div class="banner-content">
                <strong>Global Administrator Active:</strong>
                <span> This account has unrestricted Global Edit permissions across all feature modules. Fine-grained scopes below are superseded.</span>
              </div>
            </div>

            <!-- Feature Scopes Matrix Table -->
            <h3 class="widget-subtitle" style="margin-bottom: 12px; margin-top: 24px;">Fine-Grained Feature Access Scopes</h3>
            <p class="section-desc" style="margin-bottom: 16px;">Configure specific action scopes for modules when global administrator rights are not assigned.</p>
            
            <table class="table-clean" style="margin-bottom: 24px;">
              <thead>
                <tr>
                  <th>Feature/Module Name</th>
                  <th>None</th>
                  <th>Read-Only</th>
                  <th>Feature Edit</th>
                  <th>Global Edit</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let f of featureCatalog">
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="material-symbols-outlined text-purple" style="font-size: 18px;">{{ getFeatureIcon(f) }}</span>
                      <strong>{{ getFeatureLabel(f) }}</strong>
                    </div>
                  </td>
                  <td>
                    <input type="radio" [name]="'scope_' + f" value="None" [ngModel]="getScopeValue(f)" (ngModelChange)="setScopeValue(f, $event)" [disabled]="selectedUserRoles.isAdmin" />
                  </td>
                  <td>
                    <input type="radio" [name]="'scope_' + f" value="ReadOnly" [ngModel]="getScopeValue(f)" (ngModelChange)="setScopeValue(f, $event)" [disabled]="selectedUserRoles.isAdmin" />
                  </td>
                  <td>
                    <input type="radio" [name]="'scope_' + f" value="FeatureEdit" [ngModel]="getScopeValue(f)" (ngModelChange)="setScopeValue(f, $event)" [disabled]="selectedUserRoles.isAdmin" />
                  </td>
                  <td>
                    <input type="radio" [name]="'scope_' + f" value="GlobalEdit" [ngModel]="getScopeValue(f)" (ngModelChange)="setScopeValue(f, $event)" [disabled]="selectedUserRoles.isAdmin" />
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Save Toolbar -->
            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; border-top: 1px solid var(--md-sys-color-outline-variant); padding-top: 20px;">
              <button type="button" class="btn btn-outline" (click)="clearSelection()">Cancel</button>
              <button type="button" class="btn btn-primary" (click)="savePermissions()" [disabled]="isSaving">
                <span class="material-symbols-outlined" *ngIf="!isSaving">save</span>
                <span>{{ isSaving ? 'Saving Changes...' : 'Save Permissions' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- ELEVATE TO GLOBAL ADMINISTRATOR MODAL -->
      <!-- ========================================================================= -->
      <div class="modal-backdrop animate-fade" *ngIf="showElevationModal" (click)="cancelElevation()">
        <div class="modal-card elevation-modal animate-scale" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-badge-wrapper">
              <span class="material-symbols-outlined modal-badge-icon">admin_panel_settings</span>
            </div>
            <div class="modal-header-text">
              <span class="modal-eyebrow">CRITICAL PRIVILEGE ESCALATION</span>
              <h2 class="modal-title">Elevate to Global Administrator</h2>
              <p class="modal-subtitle">
                You are about to grant unrestricted administrative authority to <strong>{{ selectedUser?.fullName }}</strong> ({{ selectedUser?.email }}).
              </p>
            </div>
          </div>

          <div class="modal-body">
            <h4 class="consequences-heading">Operational & Governance Consequences:</h4>
            
            <div class="consequence-grid">
              <div class="consequence-card">
                <div class="consequence-icon-wrap icon-blue">
                  <span class="material-symbols-outlined">settings_suggest</span>
                </div>
                <div class="consequence-text">
                  <strong>Full Workspace Control</strong>
                  <p>Unrestricted access to Brand settings, CMS publishing, Commerce store, and workspace configurations.</p>
                </div>
              </div>

              <div class="consequence-card">
                <div class="consequence-icon-wrap icon-purple">
                  <span class="material-symbols-outlined">manage_accounts</span>
                </div>
                <div class="consequence-text">
                  <strong>Identity & Member Governance</strong>
                  <p>Ability to create members, generate reset OTPs, modify passwords, and assign system permissions.</p>
                </div>
              </div>

              <div class="consequence-card">
                <div class="consequence-icon-wrap icon-amber">
                  <span class="material-symbols-outlined">lock_clock</span>
                </div>
                <div class="consequence-text">
                  <strong>Mandatory MFA Enforcement</strong>
                  <p>In accordance with workspace policy, Two-Factor Authentication (2FA) will be strictly enforced on next login.</p>
                </div>
              </div>

              <div class="consequence-card">
                <div class="consequence-icon-wrap icon-emerald">
                  <span class="material-symbols-outlined">history_edu</span>
                </div>
                <div class="consequence-text">
                  <strong>Permanent Audit Logging</strong>
                  <p>Every administrative action taken by this user is permanently stamped with IP, timestamp, and operator identity.</p>
                </div>
              </div>
            </div>

            <!-- Mandatory Acknowledgment Checkbox -->
            <label class="acknowledgment-box">
              <input type="checkbox" [(ngModel)]="elevationAcknowledged" />
              <span>I acknowledge the security implications of granting full Global Administrator rights to this account.</span>
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="cancelElevation()">Cancel</button>
            <button 
              type="button" 
              class="btn btn-elevate" 
              [disabled]="!elevationAcknowledged" 
              (click)="confirmElevation()"
            >
              <span class="material-symbols-outlined">verified_user</span>
              <span>Confirm & Grant Admin Privileges</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- REVOKE GLOBAL ADMINISTRATOR MODAL -->
      <!-- ========================================================================= -->
      <div class="modal-backdrop animate-fade" *ngIf="showRevocationModal" (click)="cancelRevocation()">
        <div class="modal-card revocation-modal animate-scale" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-badge-wrapper badge-warn">
              <span class="material-symbols-outlined modal-badge-icon text-danger">gpp_bad</span>
            </div>
            <div class="modal-header-text">
              <span class="modal-eyebrow text-danger">PRIVILEGE DEMOTION</span>
              <h2 class="modal-title">Revoke Global Administrator Rights</h2>
              <p class="modal-subtitle">
                Are you sure you want to remove Global Administrator rights from <strong>{{ selectedUser?.fullName }}</strong>?
              </p>
            </div>
          </div>

          <div class="modal-body">
            <div class="revocation-notice-box">
              <span class="material-symbols-outlined text-danger" style="font-size: 24px;">info</span>
              <div>
                <strong>Impact of Revocation:</strong>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">
                  This user will immediately lose access to all Administrative Consoles (Identity Console, CMS Studio, Workspace Settings). Their access will revert exclusively to standard member features and fine-grained scopes.
                </p>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="cancelRevocation()">Keep Admin Rights</button>
            <button type="button" class="btn btn-danger" (click)="confirmRevocation()">
              <span class="material-symbols-outlined">person_remove</span>
              <span>Confirm Revocation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .roles-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 24px;
      align-items: start;
    }
    .search-sidebar {
      background: transparent;
    }
    .sidebar-title {
      font-size: 13px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--md-sys-color-on-surface-variant, #94a3b8);
      letter-spacing: 0.05em;
      margin-bottom: 14px;
    }
    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 20px;
      color: var(--md-sys-color-on-surface-variant, #94a3b8);
    }
    .search-results {
      margin-top: 14px;
      max-height: 480px;
      overflow-y: auto;
    }
    .search-status {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #94a3b8);
      padding: 10px 0;
      text-align: center;
    }
    .user-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .user-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
      border: 1px solid transparent;
    }
    .user-item:hover {
      background: var(--md-sys-color-surface-container-high, #334155);
    }
    .user-item:hover {
      background: #f8fafc;
    }
    .user-item.active {
      background: rgba(0, 80, 229, 0.08);
      border-color: rgba(0, 80, 229, 0.2);
    }
    .user-avatar-placeholder {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #cbd5e1;
      color: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
    }
    .user-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-email {
      font-size: 11px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-designation {
      font-size: 10px;
      color: #0050e5;
      font-weight: 500;
    }
    .empty-state {
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 16px;
      padding: 60px 20px;
      text-align: center;
      color: #64748b;
    }
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .empty-state h4 {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 6px;
      color: #0f172a;
    }
    .empty-state p {
      font-size: 13px;
      max-width: 320px;
      margin: 0 auto;
    }
    .selected-user-header {
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .user-info-large {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .avatar-large {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: #0050e5;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 20px;
    }
    .user-title-name {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .user-title-email {
      font-size: 13px;
      color: #64748b;
    }
    .badge {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
    }
    .badge-member {
      background: #f1f5f9;
      color: #475569;
    }
    .badge-admin {
      background: rgba(0,80,229,0.1);
      color: #0050e5;
    }
    .policy-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
    }
    .policy-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-width: 80%;
    }
    .policy-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .policy-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #cbd5e1;
      transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 24px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 50%;
    }
    input:checked + .slider {
      background-color: #0050e5;
    }
    input:checked + .slider:before {
      transform: translateX(20px);
    }
    .btn {
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }
    .btn-outline {
      background: transparent;
      border-color: #cbd5e1;
      color: #475569;
    }
    .btn-outline:hover {
      background: #f8fafc;
    }
    .btn-primary {
      background: #0050e5;
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #0040b3;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .console-widget {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
    }
    .form-control {
      width: 100%;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
    }
    .form-control:focus {
      border-color: #0050e5;
    }
    .table-clean {
      width: 100%;
      border-collapse: collapse;
    }
    .table-clean th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      padding: 10px 12px;
      border-bottom: 2px solid #e2e8f0;
    }
    .table-clean td {
      padding: 12px;
      font-size: 13px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    /* Modern Modal Styling */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 20px;
      width: 100%;
      max-width: 600px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .elevation-modal {
      border: 1px solid rgba(0, 80, 229, 0.2);
    }
    .modal-header {
      padding: 24px 28px 16px 28px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      border-bottom: 1px solid #f1f5f9;
    }
    .modal-badge-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: rgba(0, 80, 229, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .modal-badge-wrapper.badge-warn {
      background: rgba(225, 29, 72, 0.1);
    }
    .modal-badge-icon {
      font-size: 28px;
      color: #0050e5;
    }
    .text-danger {
      color: #e11d48 !important;
    }
    .modal-eyebrow {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #0050e5;
      text-transform: uppercase;
      display: block;
      margin-bottom: 4px;
    }
    .modal-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }
    .modal-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    }
    .modal-body {
      padding: 20px 28px;
    }
    .consequences-heading {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin: 0 0 14px 0;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .consequence-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    .consequence-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .consequence-icon-wrap {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .consequence-icon-wrap .material-symbols-outlined {
      font-size: 18px;
    }
    .icon-blue { background: rgba(0, 80, 229, 0.1); color: #0050e5; }
    .icon-purple { background: rgba(147, 51, 234, 0.1); color: #9333ea; }
    .icon-amber { background: rgba(217, 119, 6, 0.1); color: #d97706; }
    .icon-emerald { background: rgba(16, 185, 129, 0.1); color: #10b981; }

    .consequence-text strong {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      display: block;
      margin-bottom: 2px;
    }
    .consequence-text p {
      font-size: 11px;
      color: #64748b;
      margin: 0;
      line-height: 1.35;
    }
    .acknowledgment-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      color: #1e40af;
      user-select: none;
    }
    .acknowledgment-box input {
      width: 18px;
      height: 18px;
      accent-color: #0050e5;
      cursor: pointer;
    }
    .modal-footer {
      padding: 16px 28px 24px 28px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid #f1f5f9;
      background: #fafafa;
    }
    .btn-elevate {
      background: linear-gradient(135deg, #0050e5, #4338ca);
      color: #fff;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.3);
    }
    .btn-elevate:hover:not(:disabled) {
      background: linear-gradient(135deg, #0040b3, #3730a3);
    }
    .btn-danger {
      background: #e11d48;
      color: #fff;
    }
    .btn-danger:hover:not(:disabled) {
      background: #be123c;
    }
    .revocation-notice-box {
      background: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    .policy-card.is-admin-active {
      border-color: rgba(0, 80, 229, 0.3);
      background: rgba(0, 80, 229, 0.02);
    }
    .badge-admin-active {
      background: #0050e5;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .admin-elevated-banner {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      color: #1e40af;
      font-size: 13px;
    }
    .admin-elevated-banner .banner-icon {
      font-size: 22px;
      color: #0050e5;
    }
    .animate-scale {
      animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class IdentityRolesComponent implements OnInit {
  isLoading = false;
  isSearching = false;
  isSaving = false;

  searchQuery = '';
  searchResults: any[] = [];
  private searchSubject = new Subject<string>();

  selectedUser: any = null;
  selectedUserRoles = {
    userId: '',
    email: '',
    isAdmin: false,
    featureRoles: [] as FeatureRoleScope[]
  };

  showElevationModal = false;
  showRevocationModal = false;
  elevationAcknowledged = false;

  featureCatalog = ['CMS', 'Products', 'Community', 'KPI'];

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Clear Selection',
      icon: 'close',
      action: () => { this.clearSelection(); }
    }
  ];

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    // Setup debounced user search trigger
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.executeUserSearch(term);
    });
  }

  onSearchChange(value: string): void {
    if (value.trim().length >= 2) {
      this.isSearching = true;
      this.searchSubject.next(value);
    } else {
      this.searchResults = [];
      this.isSearching = false;
    }
  }

  executeUserSearch(term: string): void {
    this.api.get<any[]>(`IdentityApi/users/search?term=${encodeURIComponent(term)}`).subscribe({
      next: (res: any) => {
        this.isSearching = false;
        this.searchResults = res?.data || [];
      },
      error: () => {
        this.isSearching = false;
        this.searchResults = [];
      }
    });
  }

  selectUser(user: any): void {
    this.isLoading = true;
    this.api.get<any>(`IdentityApi/users/${user.id}/feature-roles`).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.data) {
          this.selectedUser = user;
          this.selectedUserRoles = res.data;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.warning(err?.error?.message || 'Standard administrators are restricted from modifying governance roles of SuperAdmin accounts.', 'SuperAdmin Isolation');
      }
    });
  }

  clearSelection(): void {
    this.selectedUser = null;
    this.selectedUserRoles = {
      userId: '',
      email: '',
      isAdmin: false,
      featureRoles: []
    };
    this.searchQuery = '';
    this.searchResults = [];
    this.showElevationModal = false;
    this.showRevocationModal = false;
    this.elevationAcknowledged = false;
  }

  onToggleClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.selectedUser) return;

    if (!this.selectedUserRoles.isAdmin) {
      // Opening elevation modal
      this.elevationAcknowledged = false;
      this.showElevationModal = true;
    } else {
      // Opening revocation modal
      this.showRevocationModal = true;
    }
  }

  confirmElevation(): void {
    if (!this.elevationAcknowledged) return;
    this.selectedUserRoles.isAdmin = true;
    this.showElevationModal = false;
    this.toast.info('Global Administrator privileges granted. Click "Save Permissions" to commit changes.', 'Privileges Elevated');
  }

  cancelElevation(): void {
    this.showElevationModal = false;
    this.elevationAcknowledged = false;
  }

  confirmRevocation(): void {
    this.selectedUserRoles.isAdmin = false;
    this.showRevocationModal = false;
    this.toast.warning('Global Administrator privileges revoked. Click "Save Permissions" to commit changes.', 'Privileges Revoked');
  }

  cancelRevocation(): void {
    this.showRevocationModal = false;
  }

  getScopeValue(featureName: string): string {
    const matched = this.selectedUserRoles.featureRoles.find(r => r.featureName === featureName);
    return matched ? matched.scope : 'None';
  }

  setScopeValue(featureName: string, newScope: 'None' | 'ReadOnly' | 'FeatureEdit' | 'GlobalEdit'): void {
    let matched = this.selectedUserRoles.featureRoles.find(r => r.featureName === featureName);
    if (matched) {
      matched.scope = newScope;
    } else {
      this.selectedUserRoles.featureRoles.push({ featureName, scope: newScope });
    }
  }

  savePermissions(): void {
    if (!this.selectedUser) return;
    this.isSaving = true;

    this.api.post<any>(`IdentityApi/users/${this.selectedUser.id}/feature-roles`, this.selectedUserRoles).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success('Permissions profile successfully saved and email alert queued.', 'Roles Saved');
        this.clearSelection();
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to save roles.', 'Save Error');
      }
    });
  }

  getFeatureIcon(feature: string): string {
    switch (feature) {
      case 'CMS': return 'web';
      case 'Products': return 'shopping_bag';
      case 'Community': return 'forum';
      case 'KPI': return 'speed';
      default: return 'widgets';
    }
  }

  getFeatureLabel(feature: string): string {
    switch (feature) {
      case 'CMS': return 'Content CMS Studio';
      case 'Products': return 'Commerce Catalog & Store';
      case 'Community': return 'Committees & Channels';
      case 'KPI': return 'KPI Analytics & Performance';
      default: return feature;
    }
  }
}
