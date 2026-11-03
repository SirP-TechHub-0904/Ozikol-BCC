import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ToastService } from '../../../core/services/toast.service';
import {
  CommitteesService,
  CommitteeAliases,
  CommitteeInfoSpec
} from '../../../core/services/committees.service';
import { CommitteesUxHelpersComponent } from '../../../shared/components/committees-ux-helpers/committees-ux-helpers.component';

/**
 * Administrator Master CRUD Directory & 360-Degree Single Group Workspace (A2 & A3) for bcp-committees.
 * Supports creating/editing parent groups & nested sub-groups, managing rosters & leadership micro-roles,
 * pinning Google Docs / Sheets / Notebooks, and copying shareable external registration links.
 */
@Component({
  selector: 'app-committees-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, TranslatePipe, CommitteesUxHelpersComponent],
  template: `
    <div class="comm-page">
      <app-page-header
        [eyebrow]="'committees.eyebrow' | translate:'PEOPLE & COMMUNITY'"
        icon="groups"
        [title]="selectedDetails ? selectedDetails.committee.name : (('committees.manage' | translate:'Manage') + ' ' + aliases.aliasPlural)"
        [subtitle]="selectedDetails ? (selectedDetails.committee.description || '360-degree roster, sub-groups, cloud documents, and external link governance.') : ('Create and organize ' + aliases.aliasPlural.toLowerCase() + ', nested ' + aliases.subGroupAliasPlural.toLowerCase() + ', leadership roles, and external onboarding links.')"
        [backUrl]="selectedDetails ? '/committees/console/manage' : undefined"
        [backText]="selectedDetails ? ('All ' + aliases.aliasPlural) : undefined"
        [buttons]="headerButtons"
        [loading]="loading"
      ></app-page-header>

      <!-- Sub-Navigation Strip -->
      <div class="comm-subnav" *ngIf="!selectedDetails">
        <a routerLink="/committees/console/dashboard" class="comm-subnav-link">
          <span class="material-symbols-outlined">space_dashboard</span>
          <span>{{ aliases.aliasSingular }} {{ 'committees.dashboard' | translate:'Dashboard' }}</span>
        </a>
        <a routerLink="/committees/console/manage" class="comm-subnav-link active">
          <span class="material-symbols-outlined">groups</span>
          <span>{{ 'committees.manage' | translate:'Manage' }} {{ aliases.aliasPlural }}</span>
        </a>
        <a routerLink="/committees/console/registrations" class="comm-subnav-link">
          <span class="material-symbols-outlined">how_to_reg</span>
          <span>{{ 'committees.registrations' | translate:'Registrations & Intake' }}</span>
        </a>
        <a routerLink="/committees/console/reports" class="comm-subnav-link">
          <span class="material-symbols-outlined">assignment</span>
          <span>{{ 'committees.reports_docs' | translate:'Meeting Reports & Docs' }}</span>
        </a>
        <a routerLink="/committees/console/forms" class="comm-subnav-link">
          <span class="material-symbols-outlined">dynamic_form</span>
          <span>{{ 'committees.extra_forms' | translate:'Extra-Info Forms' }}</span>
        </a>
        <a routerLink="/committees/console/settings" class="comm-subnav-link">
          <span class="material-symbols-outlined">tune</span>
          <span>{{ aliases.aliasSingular }} {{ 'committees.settings' | translate:'Settings' }}</span>
        </a>
      </div>

      <!-- =============================================================== -->
      <!-- VIEW A2: MASTER DIRECTORY OF ALL COMMITTEES & SUB-GROUPS        -->
      <!-- =============================================================== -->
      <ng-container *ngIf="!selectedDetails">
        <div class="filter-bar">
          <div class="search-input-wrap">
            <span class="material-symbols-outlined">search</span>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              (keyup.enter)="loadCommittees()"
              [placeholder]="'committees.search_placeholder' | translate:'Search by name, code, or category tag...'"
            />
          </div>
          <select [(ngModel)]="statusFilter" (change)="loadCommittees()" class="select-ctrl">
            <option value="All">{{ 'committees.all_statuses' | translate:'All Statuses' }}</option>
            <option value="Active">{{ 'committees.status_active' | translate:'Active' }}</option>
            <option value="Suspended">{{ 'committees.status_suspended' | translate:'Suspended' }}</option>
            <option value="Archived">{{ 'committees.status_archived' | translate:'Archived' }}</option>
          </select>
          <button type="button" class="btn-secondary-sm" (click)="loadCommittees()">
            <span class="material-symbols-outlined">refresh</span>
            <span>{{ 'committees.refresh' | translate:'Refresh' }}</span>
          </button>
          <button type="button" class="info-icon-btn" (click)="openDirectoryInfo()">
            <span class="material-symbols-outlined">info</span>
          </button>
        </div>

        <div class="cards-grid" *ngIf="committees.length > 0">
          <div class="group-card" *ngFor="let c of committees">
            <div class="card-top">
              <div class="icon-box">
                <span class="material-symbols-outlined">{{ c.iconName || 'diversity_3' }}</span>
              </div>
              <div class="title-wrap">
                <div class="hierarchy-kicker" *ngIf="c.parentCommitteeName">
                  <span class="material-symbols-outlined">subdirectory_arrow_right</span>
                  <span>{{ aliases.subGroupAliasSingular }} of {{ c.parentCommitteeName }}</span>
                </div>
                <h3 (click)="openCommitteeDetail(c.id)">{{ c.name }}</h3>
                <div class="tag-row">
                  <span class="pill-badge status-active" *ngIf="c.status === 'Active'">{{ c.status }}</span>
                  <span class="pill-badge status-warn" *ngIf="c.status !== 'Active'">{{ c.status }}</span>
                  <span class="pill-badge">{{ c.visibility }}</span>
                  <span class="pill-badge" *ngIf="c.categoryTag">{{ c.categoryTag }}</span>
                </div>
              </div>
            </div>

            <p class="card-desc">{{ c.description || c.missionStatement || 'No description provided yet.' }}</p>

            <div class="stats-strip">
              <span><span class="material-symbols-outlined">group</span> {{ c.memberCount }}{{ c.maxCapacity ? '/' + c.maxCapacity : '' }}</span>
              <span><span class="material-symbols-outlined">account_tree</span> {{ c.subGroupCount }} {{ aliases.subGroupAliasPlural }}</span>
              <span><span class="material-symbols-outlined">assignment</span> {{ c.reportsCount }} Reports</span>
              <span *ngIf="c.pendingRegistrationsCount > 0" class="pending-highlight">
                <span class="material-symbols-outlined">how_to_reg</span> +{{ c.pendingRegistrationsCount }} Pending
              </span>
            </div>

            <div class="card-actions">
              <button type="button" class="btn-primary-sm" (click)="openCommitteeDetail(c.id)">
                <span class="material-symbols-outlined">open_in_new</span>
                <span>Manage Workspace</span>
              </button>
              <button type="button" class="btn-icon" [title]="'committees.copy_link' | translate" (click)="copyGroupExternalLink(c)">
                <span class="material-symbols-outlined">link</span>
              </button>
              <button type="button" class="btn-icon" title="Edit" (click)="openEditModal(c)">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button type="button" class="btn-icon danger" title="Delete" (click)="confirmDelete(c)">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        </div>

        <div class="empty-card" *ngIf="committees.length === 0 && !loading">
          <span class="material-symbols-outlined">diversity_3</span>
          <h3>No {{ aliases.aliasPlural }} Created Yet</h3>
          <p>Create your first {{ aliases.aliasSingular.toLowerCase() }} to organize members, share an external registration link, and receive meeting reports.</p>
          <button type="button" class="btn-primary-sm" (click)="openCreateModal()">
            <span class="material-symbols-outlined">add</span>
            <span>{{ 'committees.create_new' | translate:'Create New' }} {{ aliases.aliasSingular }}</span>
          </button>
        </div>
      </ng-container>

      <!-- =============================================================== -->
      <!-- VIEW A3: 360-DEGREE SINGLE COMMITTEE WORKSPACE                  -->
      <!-- =============================================================== -->
      <ng-container *ngIf="selectedDetails">
        <div class="detail-tabs">
          <button type="button" class="d-tab" [class.active]="detailTab === 'roster'" (click)="detailTab = 'roster'">
            <span class="material-symbols-outlined">group</span>
            <span>{{ 'committees.tab_roster' | translate:'Roster & Roles' }} ({{ selectedDetails.members?.length || 0 }})</span>
          </button>
          <button type="button" class="d-tab" [class.active]="detailTab === 'subgroups'" (click)="detailTab = 'subgroups'">
            <span class="material-symbols-outlined">account_tree</span>
            <span>{{ aliases.subGroupAliasPlural }} ({{ selectedDetails.subGroups?.length || 0 }})</span>
          </button>
          <button type="button" class="d-tab" [class.active]="detailTab === 'reports'" (click)="detailTab = 'reports'">
            <span class="material-symbols-outlined">cloud_done</span>
            <span>{{ 'committees.tab_reports_cloud' | translate:'Reports & Cloud Shelf' }} ({{ (selectedDetails.reports?.length || 0) + (selectedDetails.cloudDocuments?.length || 0) }})</span>
          </button>
          <button type="button" class="d-tab" [class.active]="detailTab === 'external'" (click)="detailTab = 'external'">
            <span class="material-symbols-outlined">share</span>
            <span>{{ 'committees.tab_external_link' | translate:'External Link & Form' }}</span>
          </button>
        </div>

        <!-- TAB 1: ROSTER & ROLES -->
        <div class="panel-box" *ngIf="detailTab === 'roster'">
          <div class="panel-head-row">
            <div>
              <h3>Enrolled Members & Delegated Micro-Roles</h3>
              <p>Appoint a {{ aliases.leaderTitleAlias }} or {{ aliases.secretaryTitleAlias }} so they can take attendance, submit reports, and approve applicants for this {{ aliases.aliasSingular.toLowerCase() }}.</p>
            </div>
            <button type="button" class="btn-primary-sm" (click)="showAddMemberModal = true; searchCandidates()">
              <span class="material-symbols-outlined">person_add</span>
              <span>Add Workspace Member</span>
            </button>
          </div>

          <div class="table-wrap" *ngIf="selectedDetails.members?.length > 0">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role in {{ aliases.aliasSingular }}</th>
                  <th>Custom Title / Badge</th>
                  <th>Extra-Info Answers</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of selectedDetails.members">
                  <td>
                    <div class="user-cell">
                      <div class="avatar-circle">{{ (m.fullName || 'M')[0] }}</div>
                      <div>
                        <div class="u-name">{{ m.fullName }}</div>
                        <div class="u-sub">{{ m.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select [ngModel]="m.role" (ngModelChange)="updateMemberRole(m, $event)" class="select-ctrl compact">
                      <option value="Chairperson">{{ aliases.leaderTitleAlias }}</option>
                      <option value="CoChair">Co-{{ aliases.leaderTitleAlias }}</option>
                      <option value="Secretary">{{ aliases.secretaryTitleAlias }}</option>
                      <option value="Coordinator">Coordinator</option>
                      <option value="Member">Member</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      [ngModel]="m.customRoleTitle || ''"
                      (blur)="updateMemberBadge(m, $any($event.target).value)"
                      placeholder="e.g. Lead Coordinator"
                      class="inline-input"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn-secondary-xs"
                      *ngIf="hasExtraInfo(m.extraInfoResponses)"
                      (click)="inspectedResponses = m.extraInfoResponses; inspectedMemberName = m.fullName">
                      View Answers
                    </button>
                    <span class="muted-txt" *ngIf="!hasExtraInfo(m.extraInfoResponses)">—</span>
                  </td>
                  <td>{{ m.joinedAt | date:'mediumDate' }}</td>
                  <td>
                    <button type="button" class="btn-icon danger" title="Remove" (click)="removeMember(m)">
                      <span class="material-symbols-outlined">person_remove</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="empty-inline" *ngIf="!selectedDetails.members?.length">
            <span class="material-symbols-outlined">group_off</span>
            <p>No members enrolled in this {{ aliases.aliasSingular.toLowerCase() }} yet.</p>
          </div>
        </div>

        <!-- TAB 2: SUB-GROUPS -->
        <div class="panel-box" *ngIf="detailTab === 'subgroups'">
          <div class="panel-head-row">
            <div>
              <h3>Nested {{ aliases.subGroupAliasPlural }} under {{ selectedDetails.committee.name }}</h3>
              <p>Break large {{ aliases.aliasPlural.toLowerCase() }} into focused operational {{ aliases.subGroupAliasPlural.toLowerCase() }}.</p>
            </div>
            <button type="button" class="btn-primary-sm" (click)="openCreateModal(selectedDetails.committee.id)">
              <span class="material-symbols-outlined">add</span>
              <span>New {{ aliases.subGroupAliasSingular }}</span>
            </button>
          </div>

          <div class="cards-grid" *ngIf="selectedDetails.subGroups?.length > 0">
            <div class="group-card" *ngFor="let sg of selectedDetails.subGroups">
              <div class="card-top">
                <div class="icon-box"><span class="material-symbols-outlined">{{ sg.iconName || 'workspaces' }}</span></div>
                <div class="title-wrap">
                  <h3 (click)="openCommitteeDetail(sg.id)">{{ sg.name }}</h3>
                  <div class="tag-row">
                    <span class="pill-badge status-active">{{ sg.status }}</span>
                    <span class="pill-badge">{{ sg.memberCount }} members</span>
                  </div>
                </div>
              </div>
              <div class="card-actions">
                <button type="button" class="btn-primary-sm" (click)="openCommitteeDetail(sg.id)">Open {{ aliases.subGroupAliasSingular }}</button>
              </div>
            </div>
          </div>

          <div class="empty-inline" *ngIf="!selectedDetails.subGroups?.length">
            <span class="material-symbols-outlined">account_tree</span>
            <p>No nested {{ aliases.subGroupAliasPlural.toLowerCase() }} under this {{ aliases.aliasSingular.toLowerCase() }} yet.</p>
          </div>
        </div>

        <!-- TAB 3: REPORTS & CLOUD SHELF -->
        <div class="panel-box" *ngIf="detailTab === 'reports'">
          <div class="panel-head-row">
            <div>
              <h3>Pinned Google Docs, Sheets & Cloud Notebooks</h3>
              <p>Live cloud collaborative documents attached to {{ selectedDetails.committee.name }}.</p>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button type="button" class="btn-secondary-sm" (click)="connectGoogleForGroup()">
                <span class="material-symbols-outlined">add_to_drive</span>
                <span>{{ 'committees.connect_google' | translate }}</span>
              </button>
              <a [routerLink]="['/committees/workspace/reports/compose']" [queryParams]="{ committeeId: selectedDetails.committee.id }" class="btn-primary-sm">
                <span class="material-symbols-outlined">edit_document</span>
                <span>{{ 'committees.compose_report' | translate }}</span>
              </a>
            </div>
          </div>

          <!-- Quick Cloud Link Paste Row -->
          <div class="cloud-paste-row">
            <input type="text" [(ngModel)]="quickCloudTitle" placeholder="e.g. Q4 Budget Sheet or Rehearsal Notebook" class="inline-input" style="max-width:240px;" />
            <input type="url" [(ngModel)]="quickCloudUrl" placeholder="https://docs.google.com/document/d/... or Excel Online URL" class="inline-input" style="flex:1;" />
            <button type="button" class="btn-primary-sm" (click)="pinQuickCloudLink()" [disabled]="!quickCloudUrl">
              <span class="material-symbols-outlined">add_link</span>
              <span>Pin to Shelf</span>
            </button>
          </div>

          <div class="cloud-grid" *ngIf="selectedDetails.cloudDocuments?.length > 0">
            <div class="cloud-item" *ngFor="let doc of selectedDetails.cloudDocuments">
              <span class="material-symbols-outlined cloud-icon">{{ getProviderIcon(doc.provider) }}</span>
              <div class="cloud-meta">
                <a [href]="doc.documentUrl" target="_blank" rel="noopener">{{ doc.title }}</a>
                <span>{{ doc.provider }} • Linked by {{ doc.ownerDisplayName || 'Member' }}</span>
              </div>
              <button type="button" class="btn-icon danger" (click)="unlinkCloudDoc(doc.id)">
                <span class="material-symbols-outlined">link_off</span>
              </button>
            </div>
          </div>

          <hr class="sep-line" />

          <div class="panel-head-row">
            <h3>Submitted Meeting Reports ({{ selectedDetails.reports?.length || 0 }})</h3>
            <a routerLink="/committees/console/reports" [queryParams]="{ committeeId: selectedDetails.committee.id }" class="link-action">Open Full Report Reviewer</a>
          </div>

          <div class="table-wrap" *ngIf="selectedDetails.reports?.length > 0">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>Report Title</th>
                  <th>Meeting Date</th>
                  <th>Submitted By</th>
                  <th>Attendance</th>
                  <th>Attachments</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of selectedDetails.reports">
                  <td><strong>{{ r.title }}</strong></td>
                  <td>{{ r.meetingDate | date:'mediumDate' }}</td>
                  <td>{{ r.submittedByName }}</td>
                  <td>{{ r.presentCount }} Present / {{ r.absentCount }} Absent</td>
                  <td>{{ r.uploadedFilesCount }} file(s) • {{ r.cloudLinksCount }} cloud doc(s)</td>
                  <td><span class="pill-badge">{{ r.reviewStatus }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="empty-inline" *ngIf="!selectedDetails.reports?.length">
            <span class="material-symbols-outlined">assignment</span>
            <p>No meeting reports submitted for this {{ aliases.aliasSingular.toLowerCase() }} yet.</p>
          </div>
        </div>

        <!-- TAB 4: EXTERNAL REGISTRATION LINK & EXTRA-INFO FORM -->
        <div class="panel-box" *ngIf="detailTab === 'external'">
          <div class="panel-head-row">
            <div>
              <h3>Shareable External Registration Link</h3>
              <p>Share this link via email, WhatsApp, or website buttons. Existing signed-in members skip basic fields and only answer your Extra-Info Form.</p>
            </div>
          </div>

          <div class="share-box">
            <input type="text" readonly [value]="getSelectedExternalUrl()" class="share-url-input" />
            <button type="button" class="btn-primary-sm" (click)="copyGroupExternalLink(selectedDetails.committee)">
              <span class="material-symbols-outlined">content_copy</span>
              <span>Copy Link</span>
            </button>
            <button type="button" class="btn-secondary-sm" (click)="regenerateInviteToken()">
              <span class="material-symbols-outlined">autorenew</span>
              <span>Rotate Invite Token</span>
            </button>
          </div>

          <div class="form-attach-box">
            <label>Supplemental Extra-Info Form Attached to {{ selectedDetails.committee.name }}</label>
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:8px;">
              <select [(ngModel)]="selectedDetails.committee.extraInfoFormId" class="select-ctrl" style="min-width:280px;">
                <option [ngValue]="null">Use Workspace Default Form (or None)</option>
                <option *ngFor="let f of availableForms" [ngValue]="f.id">{{ f.title }} ({{ f.fields?.length || 0 }} fields)</option>
              </select>
              <button type="button" class="btn-primary-sm" (click)="saveAttachedForm()">
                <span class="material-symbols-outlined">save</span>
                <span>Save Form Binding</span>
              </button>
              <a routerLink="/committees/console/forms" class="btn-secondary-sm">
                <span class="material-symbols-outlined">dynamic_form</span>
                <span>Design Extra-Info Forms</span>
              </a>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- =============================================================== -->
      <!-- MODAL: CREATE / EDIT COMMITTEE OR SUB-GROUP                     -->
      <!-- =============================================================== -->
      <div class="modal-backdrop" *ngIf="showEditorModal" (click)="showEditorModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>{{ editingId ? 'Edit' : 'Create' }} {{ editorForm.parentCommitteeId ? aliases.subGroupAliasSingular : aliases.aliasSingular }}</h3>
            <button type="button" class="btn-icon" (click)="showEditorModal = false"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body">
            <div class="form-grid-2">
              <div class="field-grp">
                <label>Name *</label>
                <input type="text" [(ngModel)]="editorForm.name" placeholder="e.g. Finance & Audit" />
              </div>
              <div class="field-grp">
                <label>Short Code</label>
                <input type="text" [(ngModel)]="editorForm.code" placeholder="e.g. COM-01" />
              </div>
            </div>

            <div class="form-grid-2">
              <div class="field-grp">
                <label>Parent {{ aliases.aliasSingular }} (Optional for {{ aliases.subGroupAliasSingular }})</label>
                <select [(ngModel)]="editorForm.parentCommitteeId">
                  <option [ngValue]="null">Top-Level {{ aliases.aliasSingular }}</option>
                  <option *ngFor="let p of parentCandidates()" [ngValue]="p.id">{{ p.name }}</option>
                </select>
              </div>
              <div class="field-grp">
                <label>Category Tag</label>
                <input type="text" [(ngModel)]="editorForm.categoryTag" placeholder="e.g. Operations, Creative, Governance" />
              </div>
            </div>

            <div class="field-grp">
              <label>Description & Mandate</label>
              <textarea rows="3" [(ngModel)]="editorForm.description" placeholder="Describe core responsibilities and expectations..."></textarea>
            </div>

            <div class="form-grid-2">
              <div class="field-grp">
                <label>Meeting Schedule</label>
                <input type="text" [(ngModel)]="editorForm.meetingSchedule" placeholder="e.g. Every Thursday at 5:00 PM" />
              </div>
              <div class="field-grp">
                <label>Meeting Room or Virtual Link</label>
                <input type="text" [(ngModel)]="editorForm.meetingLocationOrLink" placeholder="e.g. Conference Room B or https://meet.google.com/..." />
              </div>
            </div>

            <div class="form-grid-3">
              <div class="field-grp">
                <label>Visibility</label>
                <select [(ngModel)]="editorForm.visibility">
                  <option value="Public">{{ 'committees.visibility_public' | translate }}</option>
                  <option value="ApprovalRequired">{{ 'committees.visibility_approval' | translate }}</option>
                  <option value="Private">{{ 'committees.visibility_private' | translate }}</option>
                </select>
              </div>
              <div class="field-grp">
                <label>Status</label>
                <select [(ngModel)]="editorForm.status">
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div class="field-grp">
                <label>Max Capacity (Optional)</label>
                <input type="number" [(ngModel)]="editorForm.maxCapacity" placeholder="Unlimited" />
              </div>
            </div>

            <div class="field-grp">
              <label>Supplemental Extra-Info Form</label>
              <select [(ngModel)]="editorForm.extraInfoFormId">
                <option [ngValue]="null">Default / None</option>
                <option *ngFor="let f of availableForms" [ngValue]="f.id">{{ f.title }}</option>
              </select>
            </div>

            <div class="check-row">
              <label><input type="checkbox" [(ngModel)]="editorForm.allowExternalRegistration" /> Enable External Public Registration Link</label>
              <label><input type="checkbox" [(ngModel)]="editorForm.requireApproval" /> Require Leader / Admin Approval Before Joining</label>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn-secondary-sm" (click)="showEditorModal = false">{{ 'committees.cancel' | translate }}</button>
            <button type="button" class="btn-primary-sm" (click)="saveCommittee()" [disabled]="saving">
              {{ saving ? 'Saving...' : ('committees.save_changes' | translate:'Save Changes') }}
            </button>
          </div>
        </div>
      </div>

      <!-- =============================================================== -->
      <!-- MODAL: ADD WORKSPACE MEMBER TO ROSTER                           -->
      <!-- =============================================================== -->
      <div class="modal-backdrop" *ngIf="showAddMemberModal" (click)="showAddMemberModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>Add Member to {{ selectedDetails?.committee?.name }}</h3>
            <button type="button" class="btn-icon" (click)="showAddMemberModal = false"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body">
            <div class="field-grp">
              <label>Search Workspace Members</label>
              <input type="text" [(ngModel)]="candidateQuery" (input)="searchCandidates()" placeholder="e.g. First Last or name@company.com" />
            </div>
            <div class="form-grid-2">
              <div class="field-grp">
                <label>Assign Role</label>
                <select [(ngModel)]="newMemberRole">
                  <option value="Member">Member</option>
                  <option value="Chairperson">{{ aliases.leaderTitleAlias }}</option>
                  <option value="CoChair">Co-{{ aliases.leaderTitleAlias }}</option>
                  <option value="Secretary">{{ aliases.secretaryTitleAlias }}</option>
                  <option value="Coordinator">Coordinator</option>
                </select>
              </div>
              <div class="field-grp">
                <label>Custom Portfolio Title (Optional)</label>
                <input type="text" [(ngModel)]="newMemberCustomTitle" placeholder="e.g. Technical Lead" />
              </div>
            </div>

            <div class="candidate-list">
              <div class="cand-row" *ngFor="let u of userCandidates">
                <div>
                  <div class="u-name">{{ u.fullName || u.email }}</div>
                  <div class="u-sub">{{ u.email }} {{ u.designation ? '• ' + u.designation : '' }}</div>
                </div>
                <button type="button" class="btn-primary-sm" (click)="enrollCandidate(u.id)">Enroll</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: INSPECT MEMBER EXTRA-INFO ANSWERS -->
      <div class="modal-backdrop" *ngIf="inspectedResponses" (click)="inspectedResponses = null">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>Extra-Info Responses — {{ inspectedMemberName }}</h3>
            <button type="button" class="btn-icon" (click)="inspectedResponses = null"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body">
            <div class="kv-row" *ngFor="let kv of objectEntries(inspectedResponses)">
              <strong>{{ kv[0] }}</strong>
              <span>{{ formatAnswer(kv[1]) }}</span>
            </div>
          </div>
        </div>
      </div>

      <app-committees-ux-helpers [activeInfo]="activeInfo" (closeInfo)="activeInfo = null"></app-committees-ux-helpers>
    </div>
  `,
  styles: [`
    .comm-page { display: flex; flex-direction: column; gap: 20px; }
    .comm-subnav, .detail-tabs {
      display: flex; flex-wrap: wrap; gap: 8px; background: #ffffff;
      border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px;
    }
    :host-context(.dark-mode) .comm-subnav, :host-context(.dark-mode) .detail-tabs { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .comm-subnav-link, .d-tab {
      display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px;
      border-radius: 8px; font-size: 13px; font-weight: 600; color: #475569;
      text-decoration: none; border: none; background: transparent; cursor: pointer;
    }
    :host-context(.dark-mode) .comm-subnav-link, :host-context(.dark-mode) .d-tab { color: #cbd5e1; }
    .comm-subnav-link.active, .d-tab.active { background: #0050e5; color: #ffffff; }

    .filter-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .search-input-wrap {
      flex: 1; min-width: 240px; display: flex; align-items: center; gap: 8px;
      background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px 12px;
    }
    :host-context(.dark-mode) .search-input-wrap { background: #1e293b; border-color: rgba(255,255,255,0.12); }
    .search-input-wrap input { border: none; outline: none; background: transparent; width: 100%; font-size: 13.5px; color: inherit; }
    .select-ctrl, .inline-input {
      padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff; font-size: 13px; color: #0f172a;
    }
    :host-context(.dark-mode) .select-ctrl, :host-context(.dark-mode) .inline-input { background: #0f172a; border-color: rgba(255,255,255,0.14); color: #f8fafc; }
    .select-ctrl.compact { padding: 5px 8px; font-size: 12.5px; }

    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .group-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px;
      display: flex; flex-direction: column; gap: 12px;
    }
    :host-context(.dark-mode) .group-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .card-top { display: flex; gap: 12px; align-items: flex-start; }
    .icon-box {
      width: 44px; height: 44px; border-radius: 12px; background: rgba(0,80,229,0.1); color: #0050e5;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .title-wrap { flex: 1; min-width: 0; }
    .hierarchy-kicker { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #0050e5; margin-bottom: 2px; }
    .hierarchy-kicker .material-symbols-outlined { font-size: 14px; }
    .title-wrap h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; cursor: pointer; }
    :host-context(.dark-mode) .title-wrap h3 { color: #f8fafc; }
    .title-wrap h3:hover { color: #0050e5; }
    .tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .pill-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: #f1f5f9; color: #475569; }
    .pill-badge.status-active { background: #dcfce7; color: #166534; }
    .pill-badge.status-warn { background: #fef3c7; color: #92400e; }
    .card-desc { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .stats-strip { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #475569; border-top: 1px solid #f1f5f9; padding-top: 10px; }
    :host-context(.dark-mode) .stats-strip { color: #94a3b8; border-top-color: rgba(255,255,255,0.06); }
    .stats-strip span { display: inline-flex; align-items: center; gap: 4px; }
    .stats-strip .material-symbols-outlined { font-size: 15px; color: #0050e5; }
    .pending-highlight { color: #0050e5; font-weight: 700; }
    .card-actions { display: flex; align-items: center; gap: 8px; margin-top: auto; }

    .btn-primary-sm {
      display: inline-flex; align-items: center; gap: 6px; background: #0050e5; color: #ffffff;
      border: none; border-radius: 8px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; text-decoration: none;
    }
    .btn-primary-sm:hover { background: #003db3; }
    .btn-secondary-sm, .btn-secondary-xs {
      display: inline-flex; align-items: center; gap: 6px; background: #f1f5f9; color: #334155;
      border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer; text-decoration: none;
    }
    .btn-secondary-xs { padding: 4px 9px; font-size: 11.5px; }
    .btn-icon {
      width: 34px; height: 34px; border-radius: 8px; border: 1px solid #e2e8f0; background: transparent;
      color: #475569; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .btn-icon:hover { color: #0050e5; border-color: #0050e5; }
    .btn-icon.danger:hover { color: #dc2626; border-color: #dc2626; }
    .info-icon-btn { background: transparent; border: none; color: #94a3b8; cursor: pointer; }

    .panel-box, .empty-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px;
      display: flex; flex-direction: column; gap: 16px;
    }
    :host-context(.dark-mode) .panel-box, :host-context(.dark-mode) .empty-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .empty-card { align-items: center; text-align: center; padding: 48px 20px; }
    .empty-card .material-symbols-outlined { font-size: 44px; color: #0050e5; }
    .panel-head-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
    .panel-head-row h3 { margin: 0; font-size: 16px; font-weight: 700; }
    .panel-head-row p { margin: 4px 0 0; font-size: 13px; color: #64748b; }

    .table-wrap { overflow-x: auto; }
    .clean-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .clean-table th { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 11.5px; text-transform: uppercase; }
    .clean-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .user-cell { display: flex; align-items: center; gap: 10px; }
    .avatar-circle { width: 34px; height: 34px; border-radius: 50%; background: rgba(0,80,229,0.12); color: #0050e5; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .u-name { font-weight: 700; color: #0f172a; }
    :host-context(.dark-mode) .u-name { color: #f8fafc; }
    .u-sub { font-size: 12px; color: #64748b; }

    .cloud-paste-row, .share-box { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; }
    :host-context(.dark-mode) .cloud-paste-row, :host-context(.dark-mode) .share-box { background: #0f172a; border-color: rgba(255,255,255,0.1); }
    .share-url-input { flex: 1; min-width: 240px; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: monospace; font-size: 13px; background: #ffffff; }
    .cloud-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .cloud-item { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; }
    .cloud-icon { font-size: 26px; color: #0050e5; }
    .cloud-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .cloud-meta a { font-weight: 700; color: #0050e5; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cloud-meta span { font-size: 11.5px; color: #64748b; }
    .sep-line { border: none; border-top: 1px solid #e2e8f0; margin: 6px 0; }
    .form-attach-box { padding: 14px; border: 1px solid #e2e8f0; border-radius: 10px; }
    .form-attach-box label { font-weight: 700; font-size: 13px; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.55); z-index: 10200; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 640px; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.2); }
    :host-context(.dark-mode) .modal-card { background: #1e293b; color: #f8fafc; }
    .modal-head, .modal-foot { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .modal-foot { border-bottom: none; border-top: 1px solid #e2e8f0; justify-content: flex-end; gap: 10px; }
    .modal-head h3 { margin: 0; font-size: 17px; font-weight: 700; }
    .modal-body { padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
    .form-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .form-grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
    .field-grp { display: flex; flex-direction: column; gap: 5px; }
    .field-grp label { font-size: 12.5px; font-weight: 600; color: #475569; }
    :host-context(.dark-mode) .field-grp label { color: #cbd5e1; }
    .field-grp input, .field-grp select, .field-grp textarea { padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; background: inherit; color: inherit; }
    .check-row { display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
    .check-row label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .candidate-list { display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
    .cand-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .kv-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .empty-inline { display: flex; flex-direction: column; align-items: center; padding: 28px; color: #64748b; gap: 6px; }
  `]
})
export class CommitteesManageComponent implements OnInit, OnDestroy {
  aliases: CommitteeAliases;
  loading = false;
  saving = false;
  headerButtons: PageHeaderButton[] = [];

  committees: any[] = [];
  availableForms: any[] = [];
  searchTerm = '';
  statusFilter = 'All';

  // Single 360-degree group workspace view state
  selectedDetails: any = null;
  detailTab: 'roster' | 'subgroups' | 'reports' | 'external' = 'roster';

  // Editor modal
  showEditorModal = false;
  editingId: string | null = null;
  editorForm: any = {};

  // Add member modal
  showAddMemberModal = false;
  candidateQuery = '';
  userCandidates: any[] = [];
  newMemberRole = 'Member';
  newMemberCustomTitle = '';

  // Cloud doc quick pin
  quickCloudTitle = '';
  quickCloudUrl = '';

  // Extra-info answers inspector
  inspectedResponses: any = null;
  inspectedMemberName = '';

  activeInfo: CommitteeInfoSpec | null = null;
  private sub?: Subscription;
  private routeSub?: Subscription;

  constructor(
    private committeesService: CommitteesService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.aliases = this.committeesService.currentAliases;
  }

  ngOnInit(): void {
    this.sub = this.committeesService.aliases$.subscribe((a) => {
      this.aliases = a;
      this.refreshHeaderButtons();
    });

    this.committeesService.getSettings().subscribe();
    this.loadAvailableForms();
    this.loadCommittees();

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadSingleDetail(id);
      } else {
        this.selectedDetails = null;
        this.refreshHeaderButtons();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  refreshHeaderButtons(): void {
    if (this.selectedDetails) {
      this.headerButtons = [
        {
          text: 'Copy Registration Link',
          icon: 'link',
          action: () => this.copyGroupExternalLink(this.selectedDetails.committee)
        },
        {
          text: `Edit ${this.aliases.aliasSingular}`,
          icon: 'edit',
          isPrimary: true,
          action: () => this.openEditModal(this.selectedDetails.committee)
        }
      ];
    } else {
      this.headerButtons = [
        {
          text: `New ${this.aliases.subGroupAliasSingular}`,
          icon: 'account_tree',
          action: () => this.openCreateModal()
        },
        {
          text: `Create ${this.aliases.aliasSingular}`,
          icon: 'add',
          isPrimary: true,
          action: () => this.openCreateModal()
        }
      ];
    }
  }

  loadCommittees(): void {
    this.loading = true;
    this.committeesService.getManagedCommittees(this.searchTerm, this.statusFilter).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.isSuccess) {
          this.committees = res.data || [];
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Unable to load directory.');
      }
    });
  }

  loadAvailableForms(): void {
    this.committeesService.getForms().subscribe({
      next: (res) => {
        if (res?.isSuccess) this.availableForms = res.data || [];
      }
    });
  }

  openCommitteeDetail(id: string): void {
    this.router.navigate(['/committees/console/manage', id]);
  }

  loadSingleDetail(id: string): void {
    this.loading = true;
    this.committeesService.getCommitteeDetails(id).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.isSuccess) {
          this.selectedDetails = res.data;
          this.refreshHeaderButtons();
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Could not load group details.');
      }
    });
  }

  parentCandidates(): any[] {
    return this.committees.filter((c) => !c.parentCommitteeId && c.id !== this.editingId);
  }

  openCreateModal(parentId: string | null = null): void {
    this.editingId = null;
    this.editorForm = {
      parentCommitteeId: parentId,
      name: '',
      code: '',
      categoryTag: '',
      description: '',
      meetingSchedule: '',
      meetingLocationOrLink: '',
      iconName: parentId ? 'workspaces' : 'diversity_3',
      visibility: 'Public',
      status: 'Active',
      maxCapacity: null,
      extraInfoFormId: null,
      allowExternalRegistration: true,
      requireApproval: false
    };
    this.showEditorModal = true;
  }

  openEditModal(c: any): void {
    this.editingId = c.id;
    this.editorForm = {
      parentCommitteeId: c.parentCommitteeId || null,
      name: c.name || '',
      code: c.code || '',
      categoryTag: c.categoryTag || '',
      description: c.description || '',
      meetingSchedule: c.meetingSchedule || '',
      meetingLocationOrLink: c.meetingLocationOrLink || '',
      iconName: c.iconName || 'diversity_3',
      visibility: c.visibility || 'Public',
      status: c.status || 'Active',
      maxCapacity: c.maxCapacity || null,
      extraInfoFormId: c.extraInfoFormId || null,
      allowExternalRegistration: c.allowExternalRegistration !== false,
      requireApproval: !!c.requireApproval
    };
    this.showEditorModal = true;
  }

  saveCommittee(): void {
    if (!this.editorForm.name?.trim()) {
      this.toast.error('Please enter a name.');
      return;
    }
    this.saving = true;
    const req$ = this.editingId
      ? this.committeesService.updateCommittee(this.editingId, this.editorForm)
      : this.committeesService.createCommittee(this.editorForm);

    req$.subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.isSuccess) {
          this.showEditorModal = false;
          this.toast.success('Saved successfully.');
          this.loadCommittees();
          if (this.selectedDetails) {
            this.loadSingleDetail(this.selectedDetails.committee.id);
          }
        }
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err?.error?.message || 'Could not save changes.');
      }
    });
  }

  confirmDelete(c: any): void {
    if (!confirm(`Delete "${c.name}"? Make sure any nested sub-groups are removed first.`)) return;
    this.committeesService.deleteCommittee(c.id).subscribe({
      next: () => {
        this.toast.success('Deleted.');
        this.loadCommittees();
      },
      error: (err) => this.toast.error(err?.error?.message || 'Unable to delete record.')
    });
  }

  searchCandidates(): void {
    this.committeesService.searchUserCandidates(this.candidateQuery).subscribe({
      next: (res) => {
        if (res?.isSuccess) this.userCandidates = res.data || [];
      }
    });
  }

  enrollCandidate(userProfileId: string): void {
    if (!this.selectedDetails) return;
    this.committeesService.addMember(this.selectedDetails.committee.id, {
      userProfileId,
      role: this.newMemberRole,
      customRoleTitle: this.newMemberCustomTitle
    }).subscribe({
      next: () => {
        this.toast.success('Member enrolled and notified.');
        this.showAddMemberModal = false;
        this.loadSingleDetail(this.selectedDetails.committee.id);
      },
      error: (err) => this.toast.error(err?.error?.message || 'Unable to add member.')
    });
  }

  updateMemberRole(m: any, role: string): void {
    this.committeesService.updateMember(this.selectedDetails.committee.id, m.id, {
      role,
      customRoleTitle: m.customRoleTitle
    }).subscribe({
      next: () => {
        m.role = role;
        this.toast.success('Role updated.');
      }
    });
  }

  updateMemberBadge(m: any, badge: string): void {
    if ((m.customRoleTitle || '') === badge) return;
    this.committeesService.updateMember(this.selectedDetails.committee.id, m.id, {
      role: m.role,
      customRoleTitle: badge
    }).subscribe({
      next: () => { m.customRoleTitle = badge; }
    });
  }

  removeMember(m: any): void {
    if (!confirm(`Remove ${m.fullName} from this roster?`)) return;
    this.committeesService.removeMember(this.selectedDetails.committee.id, m.id).subscribe({
      next: () => {
        this.toast.success('Member removed.');
        this.loadSingleDetail(this.selectedDetails.committee.id);
      }
    });
  }

  async connectGoogleForGroup(): Promise<void> {
    const res = await this.committeesService.launchGoogleDrivePicker();
    if (res.picked && this.selectedDetails) {
      this.committeesService.linkCloudDocument({
        committeeId: this.selectedDetails.committee.id,
        provider: res.picked.provider,
        title: res.picked.title,
        documentUrl: res.picked.url,
        externalFileId: res.picked.externalFileId,
        isPinnedToShelf: true
      }).subscribe({
        next: () => {
          this.toast.success('Google document linked to shelf.');
          this.loadSingleDetail(this.selectedDetails.committee.id);
        }
      });
    } else if (res.fallbackReason === 'unconfigured') {
      this.toast.info('Paste your Google Doc, Google Sheet, or Notebook share link directly into the Pin to Shelf bar below.');
    }
  }

  pinQuickCloudLink(): void {
    if (!this.quickCloudUrl.trim() || !this.selectedDetails) return;
    this.committeesService.linkCloudDocument({
      committeeId: this.selectedDetails.committee.id,
      title: this.quickCloudTitle.trim() || 'Shared Cloud Document',
      documentUrl: this.quickCloudUrl.trim(),
      isPinnedToShelf: true
    }).subscribe({
      next: () => {
        this.quickCloudTitle = '';
        this.quickCloudUrl = '';
        this.toast.success('Cloud document pinned to shelf.');
        this.loadSingleDetail(this.selectedDetails.committee.id);
      },
      error: (err) => this.toast.error(err?.error?.message || 'Enter a valid https:// cloud URL.')
    });
  }

  unlinkCloudDoc(docId: string): void {
    this.committeesService.unlinkCloudDocument(docId).subscribe({
      next: () => {
        this.toast.success('Unlinked.');
        this.loadSingleDetail(this.selectedDetails.committee.id);
      }
    });
  }

  getProviderIcon(p: string): string {
    return this.committeesService.getProviderIcon(p);
  }

  getSelectedExternalUrl(): string {
    const c = this.selectedDetails?.committee;
    if (!c) return '';
    return this.committeesService.buildExternalRegistrationUrl(
      c.slug,
      c.visibility === 'Private' ? c.externalInviteToken : undefined
    );
  }

  copyGroupExternalLink(c: any): void {
    const url = this.committeesService.buildExternalRegistrationUrl(
      c.slug,
      c.visibility === 'Private' ? c.externalInviteToken : undefined
    );
    navigator.clipboard.writeText(url).then(() => {
      this.toast.success('External registration link copied.');
    });
  }

  regenerateInviteToken(): void {
    if (!this.selectedDetails) return;
    this.committeesService.regenerateExternalLink(this.selectedDetails.committee.id).subscribe({
      next: (res) => {
        if (res?.isSuccess) {
          this.selectedDetails.committee.externalInviteToken = res.data.externalInviteToken;
          this.toast.success('Invite token rotated.');
        }
      }
    });
  }

  saveAttachedForm(): void {
    const c = this.selectedDetails?.committee;
    if (!c) return;
    this.committeesService.updateCommittee(c.id, c).subscribe({
      next: () => this.toast.success('Extra-Info Form binding saved.')
    });
  }

  hasExtraInfo(obj: any): boolean {
    return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
  }

  objectEntries(obj: any): [string, any][] {
    return obj ? Object.entries(obj) : [];
  }

  formatAnswer(val: any): string {
    if (Array.isArray(val)) return val.join(', ');
    if (val === null || val === undefined) return '—';
    return String(val);
  }

  openDirectoryInfo(): void {
    this.activeInfo = {
      title: `Managing ${this.aliases.aliasPlural} & Hierarchy`,
      purpose: `Central directory to create top-level ${this.aliases.aliasPlural.toLowerCase()}, nested ${this.aliases.subGroupAliasPlural.toLowerCase()}, and shareable external intake links.`,
      inputs: 'Group Name, Visibility (Public, Approval Required, Private), Optional Extra-Info Form, and Schedule.',
      impact: 'Updates immediately reflect in the Member Workspace directory and public registration links.',
      bestPractices: 'Use Private visibility for executive boards so only invited token holders or directly enrolled members can join.'
    };
  }
}

