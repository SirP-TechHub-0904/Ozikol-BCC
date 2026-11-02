import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ExportService, ExportColumn } from '../../../core/services/export.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

Chart.register(...registerables);

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="users-management-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="USER MANAGEMENT & DIRECTORY"
        icon="groups"
        title="Member Directory & Performance Hub"
        subtitle="Manage workspace members, customize category tiers, evaluate KPI metrics, and inspect forensic audit logs."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Navigation Tabs Toolbar -->
      <div class="feature-nav-bar">
        <button type="button" class="tab-btn" [class.active]="activeTab === 'directory'" (click)="setTab('directory')">
          <span class="material-symbols-outlined">groups</span>
          <span>All Members</span>
          <span class="count-pill">{{ users.length }}</span>
        </button>

        <button type="button" class="tab-btn" [class.active]="activeTab === 'categories'" (click)="setTab('categories')">
          <span class="material-symbols-outlined">category</span>
          <span>User Categories</span>
          <span class="count-pill">{{ categories.length }}</span>
        </button>

        <button type="button" class="tab-btn" [class.active]="activeTab === 'kpi'" (click)="setTab('kpi')">
          <span class="material-symbols-outlined">monitoring</span>
          <span>KPIs & Leaderboard</span>
          <span class="count-pill">{{ kpiIndicators.length }}</span>
        </button>

        <button type="button" class="tab-btn" [class.active]="activeTab === 'activity'" (click)="setTab('activity')">
          <span class="material-symbols-outlined">history</span>
          <span>Activity Audit Logs</span>
        </button>

        <button type="button" class="tab-btn" [class.active]="activeTab === 'dashboard'" (click)="setTab('dashboard')">
          <span class="material-symbols-outlined">analytics</span>
          <span>Analytics Overview</span>
        </button>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 1: ALL MEMBERS DIRECTORY & MULTI-FORMAT EXPORTS                       -->
      <!-- ========================================================================= -->
      <div *ngIf="activeTab === 'directory'" class="tab-content-area">
        <!-- Filter & Export Action Toolbar -->
        <div class="filter-export-card">
          <div class="filter-row">
            <!-- Search Bar -->
            <div class="search-field">
              <span class="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="applyFilters()"
                placeholder="Search by name, email, member ID, designation, or category..."
              />
              <button *ngIf="searchQuery" (click)="searchQuery=''; applyFilters()" class="clear-btn" title="Clear search">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <!-- Category Filter -->
            <div class="select-field">
              <label>Category</label>
              <select [(ngModel)]="selectedCategoryFilter" (change)="applyFilters()">
                <option value="">All Categories</option>
                <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
              </select>
            </div>

            <!-- Role Filter -->
            <div class="select-field">
              <label>Role</label>
              <select [(ngModel)]="selectedRoleFilter" (change)="applyFilters()">
                <option value="All">All Roles</option>
                <option value="SuperAdmin">SuperAdmin</option>
                <option value="Admin">Admin</option>
                <option value="Editor">Editor</option>
                <option value="Moderator">Moderator</option>
                <option value="Member">Member</option>
              </select>
            </div>

            <!-- Status Filter -->
            <div class="select-field">
              <label>Status</label>
              <select [(ngModel)]="selectedStatusFilter" (change)="applyFilters()">
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>

            <!-- Reset Filter -->
            <button type="button" class="btn btn-outline btn-sm reset-btn" (click)="resetFilters()" title="Reset All Filters">
              <span class="material-symbols-outlined">restart_alt</span>
              <span>Reset</span>
            </button>
          </div>

          <!-- Export Actions Toolbar -->
          <div class="export-row">
            <div class="export-info">
              <span class="material-symbols-outlined text-blue">inventory</span>
              <span>Showing <strong>{{ filteredUsers.length }}</strong> of <strong>{{ users.length }}</strong> members</span>
            </div>

            <div class="export-buttons">
              <button type="button" class="btn btn-export" (click)="exportPdf()" title="Print or Save Official PDF Register">
                <span class="material-symbols-outlined">picture_as_pdf</span>
                <span>Export PDF</span>
              </button>

              <button type="button" class="btn btn-export" (click)="exportExcel()" title="Export Spreadsheet (.csv)">
                <span class="material-symbols-outlined">table_view</span>
                <span>Export Excel</span>
              </button>

              <button type="button" class="btn btn-export" (click)="exportWord()" title="Export Word Document (.doc)">
                <span class="material-symbols-outlined">description</span>
                <span>Export Word</span>
              </button>

              <div class="category-export-dropdown">
                <button type="button" class="btn btn-export" (click)="showCategoryExportMenu = !showCategoryExportMenu">
                  <span class="material-symbols-outlined">filter_alt</span>
                  <span>Export by Category</span>
                  <span class="material-symbols-outlined arrow">expand_more</span>
                </button>
                <div class="dropdown-menu" *ngIf="showCategoryExportMenu">
                  <a href="javascript:void(0)" *ngFor="let cat of categories" (click)="exportSpecificCategory(cat)">
                    <span class="cat-dot" [style.background]="cat.colorCode || '#0050e5'"></span>
                    <span>{{ cat.name }} ({{ cat.memberCount }})</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Members Data Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th (click)="sortBy('fullName')">
                  <div class="th-content">
                    <span>Member & Profile</span>
                    <span class="material-symbols-outlined sort-icon">unfold_more</span>
                  </div>
                </th>
                <th (click)="sortBy('memberId')">
                  <div class="th-content">
                    <span>Member ID</span>
                    <span class="material-symbols-outlined sort-icon">unfold_more</span>
                  </div>
                </th>
                <th>Category Tier</th>
                <th>Assigned Role</th>
                <th>Account Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of filteredUsers" [class.suspended-row]="u.userStatus === 'Suspended'">
                <!-- Member Avatar & Name -->
                <td>
                  <div class="member-cell">
                    <div class="avatar-box" [style.background]="getGradient(u.fullName)">
                      <img *ngIf="u.avatarUrl" [src]="u.avatarUrl" [alt]="u.fullName" class="avatar-img" onerror="this.style.display='none'">
                      <span *ngIf="!u.avatarUrl">{{ getInitials(u.fullName) }}</span>
                    </div>
                    <div class="member-info">
                      <div class="member-name">{{ u.fullName || 'Unnamed Member' }}</div>
                      <div class="member-email">{{ u.email }}</div>
                      <div class="member-designation" *ngIf="u.designation">{{ u.designation }}</div>
                    </div>
                  </div>
                </td>

                <!-- Member ID -->
                <td>
                  <span class="member-id-pill">{{ u.memberId || 'CC-2026-' + u.id.substring(0,4).toUpperCase() }}</span>
                </td>

                <!-- Category Tier -->
                <td>
                  <span class="category-badge" *ngIf="u.bcpUserCategoryId && u.categoryName" [style.background]="(u.categoryColor || '#0050e5') + '15'" [style.color]="u.categoryColor || '#0050e5'" [style.border-color]="(u.categoryColor || '#0050e5') + '35'">
                    <span class="material-symbols-outlined badge-icon">{{ u.categoryIcon || 'category' }}</span>
                    <span>{{ u.categoryName }}</span>
                  </span>
                  <span class="unassigned-badge" *ngIf="!u.bcpUserCategoryId || !u.categoryName">
                    <span>Unassigned</span>
                  </span>
                </td>

                <!-- Role -->
                <td>
                  <span class="role-pill" [class.role-admin]="u.roles.includes('SuperAdmin') || u.roles.includes('Admin')">
                    {{ u.roles.join(', ') || 'Member' }}
                  </span>
                </td>

                <!-- Account Status Toggle -->
                <td>
                  <button type="button" class="status-badge-btn" [class.active-status]="u.userStatus === 'Active'" [class.suspended-status]="u.userStatus === 'Suspended'" (click)="toggleMemberStatus(u)">
                    <span class="status-dot"></span>
                    <span>{{ u.userStatus || 'Active' }}</span>
                  </button>
                </td>

                <!-- Actions Menu -->
                <td style="text-align:right;">
                  <div class="action-buttons-group">
                    <button type="button" class="icon-btn" (click)="openGradeModal(u)" title="Evaluate KPI Performance">
                      <span class="material-symbols-outlined">monitoring</span>
                    </button>
                    <button type="button" class="icon-btn" (click)="openNotesDrawer(u)" title="Confidential Admin Notes">
                      <span class="material-symbols-outlined">sticky_note_2</span>
                    </button>
                    <button type="button" class="icon-btn" (click)="openResetPasswordModal(u)" title="Reset Password / Generate Setup Link">
                      <span class="material-symbols-outlined">key</span>
                    </button>
                    <button type="button" class="icon-btn" (click)="openEditModal(u)" title="Edit Member Profile">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Empty State -->
              <tr *ngIf="filteredUsers.length === 0">
                <td colspan="7" class="empty-table-cell">
                  <div class="empty-state-wrap">
                    <span class="material-symbols-outlined empty-icon">person_search</span>
                    <h3>No members found</h3>
                    <p>Try refining your search terms or clearing selected category and role filters.</p>
                    <button type="button" class="btn btn-outline btn-sm" (click)="resetFilters()">Clear Filters</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 2: USER CATEGORIES & TIERS                                            -->
      <!-- ========================================================================= -->
      <div *ngIf="activeTab === 'categories'" class="tab-content-area">
        <div class="section-topbar">
          <div>
            <h2 class="section-title">Organizational Category Tiers</h2>
            <p class="section-subtitle">Define custom tiers, permission groups, and badge colors for members across the platform.</p>
          </div>
          <button type="button" class="btn btn-primary" (click)="openCreateCategoryModal()">
            <span class="material-symbols-outlined">add</span>
            <span>Add Category Tier</span>
          </button>
        </div>

        <div class="category-cards-grid" *ngIf="categories.length > 0">
          <div class="category-card" *ngFor="let cat of categories">
            <div class="category-card-header">
              <div class="category-icon-wrap" [style.background]="cat.colorCode + '20'" [style.color]="cat.colorCode">
                <span class="material-symbols-outlined">{{ cat.icon || 'category' }}</span>
              </div>
              <div class="category-card-actions">
                <button type="button" class="icon-btn" (click)="openEditCategoryModal(cat)" title="Edit Tier">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <a [routerLink]="['/users/console/categories/delete', cat.id]" class="icon-btn text-danger" title="Delete Category">
                  <span class="material-symbols-outlined">delete</span>
                </a>
              </div>
            </div>

            <h3 class="category-name">{{ cat.name }}</h3>
            <p class="category-desc">{{ cat.description || 'No description provided.' }}</p>

            <div class="category-card-footer">
              <div class="member-count-badge">
                <span class="material-symbols-outlined">group</span>
                <span><strong>{{ cat.memberCount || 0 }}</strong> Members</span>
              </div>
              <button type="button" class="filter-by-cat-btn" (click)="filterByThisCategory(cat)">
                <span>View Members</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State for Categories -->
        <div class="empty-state-card" *ngIf="categories.length === 0">
          <div class="empty-icon-circle"><span class="material-symbols-outlined">category</span></div>
          <h3>No User Categories Created Yet</h3>
          <p>You haven't defined any custom membership categories or tiers. Click below to add your organization's first tier (e.g. Staff, Volunteers, Board, Alumni).</p>
          <button type="button" class="btn btn-primary" (click)="openCreateCategoryModal()">
            <span class="material-symbols-outlined">add</span>
            <span>Create First Category Tier</span>
          </button>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 3: KPIS, SCORING & LEADERBOARD                                        -->
      <!-- ========================================================================= -->
      <div *ngIf="activeTab === 'kpi'" class="tab-content-area">
        <!-- Top Toolbar -->
        <div class="section-topbar">
          <div>
            <h2 class="section-title">Key Performance Indicators & Leaderboard</h2>
            <p class="section-subtitle">Define evaluation metrics, batch grade members, and track performance rankings.</p>
          </div>
          <div class="header-actions-group">
            <button type="button" class="btn btn-outline" (click)="openCreateIndicatorModal()">
              <span class="material-symbols-outlined">add_chart</span>
              <span>New KPI Metric</span>
            </button>
            <button type="button" class="btn btn-outline" (click)="openCreatePeriodModal()">
              <span class="material-symbols-outlined">date_range</span>
              <span>New Period</span>
            </button>
          </div>
        </div>

        <!-- KPI Indicators Cards Row -->
        <div class="kpi-metrics-grid">
          <div class="kpi-metric-card" *ngFor="let kpi of kpiIndicators">
            <div class="kpi-card-top">
              <span class="kpi-group-tag">{{ kpi.category || 'General' }}</span>
              <div class="kpi-actions">
                <button type="button" class="icon-btn-sm" (click)="openEditIndicatorModal(kpi)"><span class="material-symbols-outlined">edit</span></button>
                <a [routerLink]="['/users/console/kpi/metrics/delete', kpi.id]" class="icon-btn-sm text-danger" title="Delete Metric"><span class="material-symbols-outlined">delete</span></a>
              </div>
            </div>
            <h4 class="kpi-title">{{ kpi.title }}</h4>
            <p class="kpi-desc">{{ kpi.description || 'Standard performance evaluation indicator.' }}</p>
            <div class="kpi-meta-row">
              <span>Max Score: <strong>{{ kpi.maxScore }} pts</strong></span>
              <span>Weight: <strong>{{ kpi.weight }}x</strong></span>
            </div>
          </div>
        </div>

        <!-- Leaderboard Table -->
        <div class="leaderboard-section">
          <div class="leaderboard-header">
            <div class="leaderboard-title-wrap">
              <span class="material-symbols-outlined text-amber">military_tech</span>
              <h3>Performance Leaderboard Rankings</h3>
            </div>
            <div class="period-select-box">
              <label>Evaluation Period:</label>
              <select [(ngModel)]="selectedLeaderboardPeriod" (change)="loadLeaderboard()">
                <option *ngFor="let p of kpiPeriods" [value]="p.title">{{ p.title }}</option>
              </select>
            </div>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:60px;">Rank</th>
                  <th>Member Name</th>
                  <th>Category Tier</th>
                  <th>Evaluated KPIs</th>
                  <th>Average Score</th>
                  <th style="width:180px;">Performance Level</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of leaderboard; let idx = index">
                  <td>
                    <div class="rank-badge" [class.rank-gold]="idx === 0" [class.rank-silver]="idx === 1" [class.rank-bronze]="idx === 2">
                      {{ idx + 1 }}
                    </div>
                  </td>
                  <td>
                    <div class="member-cell">
                      <div class="avatar-box" [style.background]="getGradient(item.fullName)">
                        <span>{{ getInitials(item.fullName) }}</span>
                      </div>
                      <span class="member-name">{{ item.fullName }}</span>
                    </div>
                  </td>
                  <td>{{ item.categoryName || 'General' }}</td>
                  <td>{{ item.totalIndicators }} Metrics</td>
                  <td><strong>{{ item.averageScore }}%</strong></td>
                  <td>
                    <div class="progress-bar-wrap">
                      <div class="progress-bar-fill" [style.width]="item.averageScore + '%'" [style.background]="item.averageScore >= 80 ? '#10b981' : (item.averageScore >= 60 ? '#f59e0b' : '#ef4444')"></div>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="leaderboard.length === 0">
                  <td colspan="6" class="empty-table-cell">
                    <p>No evaluation scores recorded yet for period <strong>{{ selectedLeaderboardPeriod }}</strong>.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 4: ACTIVITY AUDIT LOGS                                                -->
      <!-- ========================================================================= -->
      <div *ngIf="activeTab === 'activity'" class="tab-content-area">
        <div class="section-topbar">
          <div>
            <h2 class="section-title">Forensic Activity & Security Logs</h2>
            <p class="section-subtitle">Complete chronological audit trail capturing sensitive member actions, status changes, and KPI gradings.</p>
          </div>
          <button type="button" class="btn btn-outline" (click)="loadActivityLogs()">
            <span class="material-symbols-outlined">refresh</span>
            <span>Refresh Logs</span>
          </button>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action Type</th>
                <th>Performed By</th>
                <th>Target Member</th>
                <th>IP Address</th>
                <th>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of activityLogs">
                <td class="time-cell">{{ log.date | date:'medium' }}</td>
                <td><span class="action-tag">{{ log.actionType }}</span></td>
                <td><strong>{{ log.performedByFullName || 'System Admin' }}</strong></td>
                <td>{{ log.targetFullName || '-' }}</td>
                <td class="code-cell">{{ log.ipAddress || '127.0.0.1' }}</td>
                <td class="log-desc">{{ log.description }}</td>
              </tr>
              <tr *ngIf="activityLogs.length === 0">
                <td colspan="6" class="empty-table-cell">No activity logs recorded yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 5: ANALYTICS OVERVIEW                                                 -->
      <!-- ========================================================================= -->
      <div *ngIf="activeTab === 'dashboard'" class="tab-content-area">
        <div class="metric-cards-grid">
          <div class="stat-card">
            <div class="stat-icon-wrap text-blue"><span class="material-symbols-outlined">groups</span></div>
            <div class="stat-content">
              <span class="stat-label">Total Directory Members</span>
              <h2 class="stat-value">{{ users.length }}</h2>
              <span class="stat-trend text-blue">Registered Accounts</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrap text-green"><span class="material-symbols-outlined">category</span></div>
            <div class="stat-content">
              <span class="stat-label">Active Category Tiers</span>
              <h2 class="stat-value">{{ categories.length }}</h2>
              <span class="stat-trend text-green">Configured Tiers</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrap text-purple"><span class="material-symbols-outlined">monitoring</span></div>
            <div class="stat-content">
              <span class="stat-label">KPI Metrics</span>
              <h2 class="stat-value">{{ kpiIndicators.length }}</h2>
              <span class="stat-trend text-purple">Evaluation Indicators</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrap text-amber"><span class="material-symbols-outlined">history</span></div>
            <div class="stat-content">
              <span class="stat-label">Audit Logs Captured</span>
              <h2 class="stat-value">{{ activityLogs.length }}</h2>
              <span class="stat-trend text-amber">Forensic Events</span>
            </div>
          </div>
        </div>

        <div class="charts-2col-row">
          <div class="chart-box-card">
            <h3 class="chart-box-title">Monthly Member Registrations</h3>
            <div class="chart-canvas-container">
              <canvas #registrationChartCanvas></canvas>
            </div>
          </div>

          <div class="chart-box-card">
            <h3 class="chart-box-title">Category Distribution</h3>
            <div class="chart-canvas-container">
              <canvas #categoryDonutChartCanvas></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- MODALS & DRAWERS                                                          -->
      <!-- ========================================================================= -->

      <!-- 1. CREATE USER MODAL -->
      <div class="modal-backdrop" *ngIf="showCreateUserModal" (click)="showCreateUserModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Add New Member Account</h3>
            <button type="button" class="modal-close-btn" (click)="showCreateUserModal = false"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label>First Name *</label>
                <input type="text" [(ngModel)]="newUser.firstName" placeholder="e.g. John" />
              </div>
              <div class="form-group">
                <label>Last Name *</label>
                <input type="text" [(ngModel)]="newUser.lastName" placeholder="e.g. Doe" />
              </div>
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label>Email Address *</label>
                <input type="email" [(ngModel)]="newUser.email" placeholder="e.g. john@domain.com" />
              </div>
              <div class="form-group">
                <label>Phone Number</label>
                <input type="text" [(ngModel)]="newUser.phoneNumber" placeholder="+123456789" />
              </div>
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label>Member ID / Code</label>
                <input type="text" [(ngModel)]="newUser.memberId" placeholder="Auto-generated if blank" />
              </div>
              <div class="form-group">
                <label>Category Tier</label>
                <select [(ngModel)]="newUser.bcpUserCategoryId">
                  <option [ngValue]="null">Select Category</option>
                  <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                </select>
              </div>
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label>Designation / Title</label>
                <input type="text" [(ngModel)]="newUser.designation" placeholder="e.g. Operations Officer" />
              </div>
              <div class="form-group">
                <label>Phone Number</label>
                <input type="text" [(ngModel)]="newUser.phoneNumber" placeholder="+123456789" />
              </div>
            </div>

            <div class="form-group">
              <label>Assigned System Role</label>
              <select [(ngModel)]="newUser.role">
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
                <option value="Editor">Editor</option>
                <option value="Moderator">Moderator</option>
                <option value="SuperAdmin">SuperAdmin</option>
              </select>
            </div>

            <!-- Password Provisioning -->
            <div class="form-section-divider">
              <span>Security & Password Credentials</span>
            </div>

            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label style="margin:0;">Initial Temporary Password</label>
                <button type="button" class="text-link-btn" (click)="generateNewUserPassword()">
                  <span class="material-symbols-outlined" style="font-size:14px;">autorenew</span>
                  <span>Generate Secure Password</span>
                </button>
              </div>
              <input type="text" [(ngModel)]="newUser.password" placeholder="e.g. TempPassword@2026" />
              <div class="field-hint">User will be prompted to set a permanent password upon first login.</div>
            </div>

            <div class="form-checkbox-row">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="newUser.mustChangePassword" />
                <span>Require user to change password on first login</span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showCreateUserModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveNewUser()" [disabled]="isSaving">
              <span *ngIf="!isSaving">Create Member</span>
              <span *ngIf="isSaving">Creating...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. EDIT USER MODAL -->
      <div class="modal-backdrop" *ngIf="showEditUserModal" (click)="showEditUserModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Edit Member Profile: {{ editingUser?.fullName }}</h3>
            <button type="button" class="modal-close-btn" (click)="showEditUserModal = false"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body" *ngIf="editingUser">
            <div class="form-grid-2">
              <div class="form-group">
                <label>First Name</label>
                <input type="text" [(ngModel)]="editingUser.firstName" />
              </div>
              <div class="form-group">
                <label>Last Name</label>
                <input type="text" [(ngModel)]="editingUser.lastName" />
              </div>
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label>Member ID</label>
                <input type="text" [(ngModel)]="editingUser.memberId" />
              </div>
              <div class="form-group">
                <label>Category Tier</label>
                <select [(ngModel)]="editingUser.bcpUserCategoryId">
                  <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                </select>
              </div>
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label>Designation</label>
                <input type="text" [(ngModel)]="editingUser.designation" />
              </div>
              <div class="form-group">
                <label>Phone Number</label>
                <input type="text" [(ngModel)]="editingUser.phoneNumber" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showEditUserModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveEditedUser()" [disabled]="isSaving">
              <span *ngIf="!isSaving">Save Changes</span>
              <span *ngIf="isSaving">Saving...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 3. KPI EVALUATION MODAL -->
      <div class="modal-backdrop" *ngIf="showGradeModal" (click)="showGradeModal = false">
        <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>Evaluate Performance: {{ gradingTarget?.fullName }}</h3>
              <p class="modal-subtitle">Submit KPI score evaluations for period: <strong>{{ gradingPeriod }}</strong></p>
            </div>
            <button type="button" class="modal-close-btn" (click)="showGradeModal = false"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body">
            <div class="form-group" style="margin-bottom:16px;">
              <label>Evaluation Period Cycle</label>
              <select [(ngModel)]="gradingPeriod">
                <option *ngFor="let p of kpiPeriods" [value]="p.title">{{ p.title }}</option>
              </select>
            </div>

            <div class="kpi-grading-table">
              <div class="kpi-grade-row" *ngFor="let metric of gradingMetrics">
                <div class="metric-label-box">
                  <strong>{{ metric.title }}</strong>
                  <span>Max: {{ metric.maxScore }} pts (Weight: {{ metric.weight }}x)</span>
                </div>
                <div class="metric-input-box">
                  <input type="number" min="0" [max]="metric.maxScore" [(ngModel)]="metric.score" placeholder="Score" />
                  <input type="text" [(ngModel)]="metric.remarks" placeholder="Optional remarks / feedback..." />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showGradeModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="submitKpiEvaluation()" [disabled]="isSaving">
              <span *ngIf="!isSaving">Submit KPI Scores</span>
              <span *ngIf="isSaving">Submitting...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 4. CATEGORY CREATE / EDIT MODAL -->
      <div class="modal-backdrop" *ngIf="showCategoryModal" (click)="showCategoryModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ categoryForm?.id ? 'Edit Category Tier' : 'Add Category Tier' }}</h3>
            <button type="button" class="modal-close-btn" (click)="showCategoryModal = false"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body" *ngIf="categoryForm">
            <div class="form-group">
              <label>Category Name *</label>
              <input type="text" [(ngModel)]="categoryForm.name" placeholder="e.g. Executive Board, Volunteer, Staff" />
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea rows="2" [(ngModel)]="categoryForm.description" placeholder="Brief description of this membership tier..."></textarea>
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label>Badge Color</label>
                <div class="color-picker-input">
                  <input type="color" [(ngModel)]="categoryForm.colorCode" />
                  <input type="text" [(ngModel)]="categoryForm.colorCode" style="font-family:monospace;" />
                </div>
              </div>
              <div class="form-group">
                <label>Icon Identifier</label>
                <input type="text" [(ngModel)]="categoryForm.icon" placeholder="e.g. shield, badge, star, groups" />
              </div>
            </div>

            <div class="form-group">
              <label>Sort Order</label>
              <input type="number" [(ngModel)]="categoryForm.sortOrder" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showCategoryModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveCategory()" [disabled]="isSaving">
              <span>Save Category</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 5. RESET PASSWORD MODAL -->
      <div class="modal-backdrop" *ngIf="showResetPasswordModal" (click)="showResetPasswordModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>Account Credentials & Password Reset</h3>
              <p class="modal-header-sub">Manage security for <strong>{{ resetPasswordTarget?.fullName }}</strong> ({{ resetPasswordTarget?.email }})</p>
            </div>
            <button type="button" class="modal-close-btn" (click)="showResetPasswordModal = false"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body" *ngIf="resetPasswordTarget">
            <!-- Method Switcher -->
            <div class="pill-segmented-control" style="margin-bottom:20px;">
              <button type="button" class="segment-btn" [class.active]="resetPasswordMethod === 'direct'" (click)="resetPasswordMethod = 'direct'">
                <span class="material-symbols-outlined">password</span>
                <span>Set Temporary Password</span>
              </button>
              <button type="button" class="segment-btn" [class.active]="resetPasswordMethod === 'link'" (click)="resetPasswordMethod = 'link'">
                <span class="material-symbols-outlined">link</span>
                <span>Generate Setup Link</span>
              </button>
            </div>

            <!-- Method 1: Set Temporary Password -->
            <div *ngIf="resetPasswordMethod === 'direct'">
              <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <label style="margin:0;">New Temporary Password *</label>
                  <button type="button" class="text-link-btn" (click)="generateResetTempPassword()">
                    <span class="material-symbols-outlined" style="font-size:14px;">autorenew</span>
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <input type="text" [(ngModel)]="resetPasswordModel.newPassword" placeholder="e.g. TempPass@2026!" />
                <div class="field-hint">A temporary password allows the user to log in immediately.</div>
              </div>

              <div class="form-checkbox-row">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="resetPasswordModel.mustChangePassword" />
                  <span><strong>Require user to change password on next login</strong></span>
                </label>
              </div>
            </div>

            <!-- Method 2: Generate Setup Link -->
            <div *ngIf="resetPasswordMethod === 'link'">
              <p style="font-size:13px; color:#64748b; margin-top:0;">
                Generate a cryptographically signed, one-time activation link that you can share with the member via email, SMS, or private channel.
              </p>

              <button type="button" class="btn btn-outline" (click)="generateMemberActivationLink()" [disabled]="isSaving" *ngIf="!generatedResetLink">
                <span class="material-symbols-outlined">link</span>
                <span>Generate Activation Link</span>
              </button>

              <div class="generated-link-box" *ngIf="generatedResetLink">
                <label style="font-size:12px; font-weight:700; color:#334155; display:block; margin-bottom:6px;">One-Time Activation URL (Valid for 24 hours)</label>
                <div style="display:flex; gap:8px;">
                  <input type="text" readonly [value]="generatedResetLink" style="font-family:monospace; font-size:12px; flex:1;" />
                  <button type="button" class="btn btn-primary btn-sm" (click)="copyToClipboard(generatedResetLink)">
                    <span class="material-symbols-outlined">content_copy</span>
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showResetPasswordModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="submitAdminPasswordReset()" [disabled]="isSaving || !resetPasswordModel.newPassword" *ngIf="resetPasswordMethod === 'direct'">
              <span *ngIf="!isSaving">Apply New Password</span>
              <span *ngIf="isSaving">Updating...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 6. PRIVATE NOTES DRAWER -->
      <div class="drawer-backdrop" *ngIf="showNotesDrawer" (click)="showNotesDrawer = false">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <div>
              <h3>Admin Notes: {{ notesTargetUser?.fullName }}</h3>
              <p class="drawer-subtitle">Confidential administrative records & logs</p>
            </div>
            <button type="button" class="modal-close-btn" (click)="showNotesDrawer = false"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="drawer-body">
            <!-- Add Note Input -->
            <div class="add-note-box">
              <textarea rows="3" [(ngModel)]="newNoteText" placeholder="Write a confidential note..."></textarea>
              <button type="button" class="btn btn-primary btn-sm" (click)="submitAdminNote()" [disabled]="!newNoteText.trim() || isSaving">
                <span class="material-symbols-outlined">add_comment</span>
                <span>Post Note</span>
              </button>
            </div>

            <!-- Notes List -->
            <div class="notes-timeline">
              <div class="note-card" *ngFor="let n of userNotes">
                <div class="note-meta">
                  <span class="note-author">Admin Record</span>
                  <span class="note-date">{{ n.date | date:'medium' }}</span>
                </div>
                <div class="note-content">{{ n.note }}</div>
              </div>
              <div class="empty-notes" *ngIf="userNotes.length === 0">
                <p>No confidential notes recorded on this profile yet.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .users-management-page { display: flex; flex-direction: column; gap: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }

    /* Navigation Bar */
    .feature-nav-bar { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; overflow-x: auto; }
    .tab-btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border: none; background: transparent; border-radius: 8px; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s ease; white-space: nowrap; }
    .tab-btn:hover { background: #f1f5f9; color: #0f172a; }
    .tab-btn.active { background: #0050e5; color: #ffffff; }
    .tab-btn.active .count-pill { background: rgba(255,255,255,0.25); color: #ffffff; }
    .count-pill { font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: #e2e8f0; color: #475569; font-weight: 700; }

    /* Filter & Export Card */
    .filter-export-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .filter-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
    .search-field { position: relative; flex: 1; min-width: 260px; }
    .search-field input { width: 100%; height: 40px; padding: 0 34px 0 38px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; transition: border-color 0.15s ease; }
    .search-field input:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.1); }
    .search-icon { position: absolute; left: 10px; top: 10px; font-size: 20px; color: #94a3b8; pointer-events: none; }
    .clear-btn { position: absolute; right: 8px; top: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; }

    .select-field { display: flex; flex-direction: column; gap: 4px; }
    .select-field label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .select-field select { height: 40px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; color: #1e293b; outline: none; background: #ffffff; min-width: 140px; }
    .select-field select:focus { border-color: #0050e5; }
    .reset-btn { height: 40px; align-self: flex-end; }

    /* Export Row */
    .export-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 12px; flex-wrap: wrap; gap: 12px; }
    .export-info { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; }
    .export-buttons { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .btn-export { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; font-size: 12px; font-weight: 600; border-radius: 7px; cursor: pointer; transition: all 0.15s ease; }
    .btn-export:hover { background: #0050e5; color: #ffffff; border-color: #0050e5; }
    .category-export-dropdown { position: relative; }
    .dropdown-menu { position: absolute; right: 0; top: 100%; margin-top: 4px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); width: 220px; z-index: 100; overflow: hidden; }
    .dropdown-menu a { display: flex; align-items: center; gap: 8px; padding: 10px 14px; font-size: 12px; color: #1e293b; text-decoration: none; transition: background 0.1s ease; }
    .dropdown-menu a:hover { background: #f1f5f9; }
    .cat-dot { width: 8px; height: 8px; border-radius: 50%; }

    /* Tables */
    .table-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: #f8fafc; padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; user-select: none; }
    .th-content { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    .sort-icon { font-size: 16px; color: #94a3b8; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: middle; }
    .data-table tr:hover { background: #fafafa; }
    .suspended-row { opacity: 0.65; background: #fff5f5; }

    /* Member Cell */
    .member-cell { display: flex; align-items: center; gap: 12px; }
    .avatar-box { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 700; font-size: 14px; overflow: hidden; flex-shrink: 0; }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .member-name { font-weight: 700; color: #0f172a; }
    .member-email { font-size: 12px; color: #64748b; }
    .member-designation { font-size: 11px; color: #0050e5; font-weight: 600; }
    .member-id-pill { font-family: monospace; font-size: 12px; background: #f1f5f9; color: #334155; padding: 3px 8px; border-radius: 4px; font-weight: 600; }

    /* Badges */
    .category-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: 1px solid transparent; }
    .unassigned-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #64748b; }
    .badge-icon { font-size: 14px; }
    .role-pill { font-size: 11px; padding: 3px 8px; border-radius: 6px; background: #f1f5f9; color: #475569; font-weight: 600; }
    .role-admin { background: #f5f3ff; color: #7c3aed; font-weight: 700; }
    .dept-text { font-size: 12px; color: #475569; }

    /* Empty State Card */
    .empty-state-card { background: #ffffff; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 48px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 12px; }
    .empty-icon-circle { width: 56px; height: 56px; border-radius: 50%; background: #eff6ff; color: #0050e5; display: flex; align-items: center; justify-content: center; font-size: 28px; }
    .empty-state-card h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .empty-state-card p { margin: 0; font-size: 13px; color: #64748b; max-width: 420px; line-height: 1.5; }

    /* Status Buttons */
    .status-badge-btn { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; transition: transform 0.1s ease; }
    .status-badge-btn:hover { transform: scale(1.05); }
    .active-status { background: #ecfdf5; color: #059669; }
    .active-status .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #059669; }
    .suspended-status { background: #fef2f2; color: #dc2626; }
    .suspended-status .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #dc2626; }

    /* Action Buttons */
    .action-buttons-group { display: flex; justify-content: flex-end; gap: 4px; }
    .icon-btn { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e2e8f0; background: #ffffff; color: #475569; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease; }
    .icon-btn:hover { background: #0050e5; color: #ffffff; border-color: #0050e5; }
    .icon-btn.text-danger:hover { background: #dc2626; color: #ffffff; border-color: #dc2626; }

    /* Categories Grid */
    .section-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .section-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; color: #0f172a; }
    .section-subtitle { font-size: 13px; color: #64748b; margin: 0; }
    .category-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .category-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .category-card-header { display: flex; justify-content: space-between; align-items: center; }
    .category-icon-wrap { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .category-card-actions { display: flex; gap: 4px; }
    .category-name { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
    .category-desc { font-size: 12px; color: #64748b; margin: 0; line-height: 1.4; min-height: 34px; }
    .category-card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 12px; }
    .member-count-badge { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #475569; }
    .filter-by-cat-btn { display: flex; align-items: center; gap: 4px; border: none; background: transparent; color: #0050e5; font-size: 12px; font-weight: 600; cursor: pointer; }

    /* KPI Metrics & Leaderboard */
    .kpi-metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-metric-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 8px; }
    .kpi-card-top { display: flex; justify-content: space-between; align-items: center; }
    .kpi-group-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; }
    .kpi-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0; }
    .kpi-desc { font-size: 11px; color: #64748b; margin: 0; }
    .kpi-meta-row { display: flex; justify-content: space-between; font-size: 11px; color: #475569; border-top: 1px solid #f1f5f9; padding-top: 8px; }

    .leaderboard-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .leaderboard-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .leaderboard-title-wrap { display: flex; align-items: center; gap: 8px; }
    .leaderboard-title-wrap h3 { font-size: 16px; font-weight: 700; margin: 0; }
    .period-select-box { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .period-select-box select { height: 34px; padding: 0 10px; border-radius: 6px; border: 1px solid #cbd5e1; }
    .rank-badge { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; background: #f1f5f9; color: #475569; }
    .rank-gold { background: #fef3c7; color: #d97706; }
    .rank-silver { background: #f1f5f9; color: #475569; }
    .rank-bronze { background: #ffedd5; color: #c2410c; }
    .progress-bar-wrap { width: 100%; height: 8px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; }
    .progress-bar-fill { height: 100%; border-radius: 9999px; }

    /* Activity Logs */
    .time-cell { font-size: 12px; color: #64748b; font-family: monospace; }
    .action-tag { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: #eff6ff; color: #0050e5; }
    .log-desc { font-size: 12px; color: #334155; }

    /* Dashboard Analytics */
    .metric-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .stat-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; display: flex; align-items: center; gap: 16px; }
    .stat-icon-wrap { width: 48px; height: 48px; border-radius: 12px; background: #f8fafc; display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .stat-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .stat-value { font-size: 24px; font-weight: 800; color: #0f172a; margin: 4px 0; }
    .stat-trend { font-size: 11px; font-weight: 600; }
    .charts-2col-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 900px) { .charts-2col-row { grid-template-columns: 1fr; } }
    .chart-box-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .chart-box-title { font-size: 14px; font-weight: 700; margin: 0 0 16px; }
    .chart-canvas-container { height: 260px; position: relative; }

    /* Modals & Drawers */
    .modal-backdrop, .drawer-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px; }
    .modal-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 580px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
    .modal-lg { max-width: 720px; }
    @keyframes modalPop { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
    .modal-header, .drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; }
    .modal-header h3, .drawer-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
    .modal-subtitle, .drawer-subtitle { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .modal-close-btn { border: none; background: none; color: #94a3b8; cursor: pointer; font-size: 20px; }
    .modal-body, .drawer-body { padding: 20px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; }

    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; }
    .form-group input, .form-group select, .form-group textarea { height: 40px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; background: #ffffff; }
    .form-group textarea { height: auto; padding: 8px 12px; resize: vertical; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.1); }
    .color-picker-input { display: flex; gap: 8px; align-items: center; }
    .color-picker-input input[type="color"] { width: 44px; height: 40px; padding: 2px; cursor: pointer; }

    /* Password & Form Helpers */
    .form-section-divider { display: flex; align-items: center; gap: 10px; margin: 12px 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0050e5; letter-spacing: 0.06em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .field-hint { font-size: 11px; color: #64748b; margin-top: 4px; }
    .text-link-btn { background: none; border: none; color: #0050e5; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 0; }
    .text-link-btn:hover { text-decoration: underline; }
    .form-checkbox-row { margin: 6px 0; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #1e293b; cursor: pointer; user-select: none; }
    .pill-segmented-control { display: flex; background: #f1f5f9; padding: 4px; border-radius: 10px; gap: 4px; }
    .segment-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; border: none; background: transparent; border-radius: 8px; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s ease; }
    .segment-btn.active { background: #ffffff; color: #0050e5; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .generated-link-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-top: 12px; }
    .modal-header-sub { margin: 2px 0 0; font-size: 12px; color: #64748b; }

    /* KPI Grading Table */
    .kpi-grading-table { display: flex; flex-direction: column; gap: 10px; }
    .kpi-grade-row { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; gap: 16px; }
    .metric-label-box { display: flex; flex-direction: column; font-size: 13px; }
    .metric-label-box span { font-size: 11px; color: #64748b; }
    .metric-input-box { display: flex; gap: 8px; }
    .metric-input-box input[type="number"] { width: 80px; height: 36px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 6px; }
    .metric-input-box input[type="text"] { width: 220px; height: 36px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; }

    /* Drawer */
    .drawer-panel { position: fixed; right: 0; top: 0; bottom: 0; width: 100%; max-width: 440px; background: #ffffff; box-shadow: -10px 0 30px rgba(0,0,0,0.15); display: flex; flex-direction: column; z-index: 100000; animation: drawerSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes drawerSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .add-note-box { display: flex; flex-direction: column; gap: 8px; }
    .notes-timeline { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
    .note-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .note-meta { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 6px; }
    .note-author { font-weight: 700; color: #0050e5; }
    .note-content { font-size: 13px; color: #1e293b; white-space: pre-wrap; line-height: 1.4; }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s ease; }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover { background: #003db3; }
    .btn-outline { background: #ffffff; border: 1px solid #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
    .btn-sm { padding: 6px 12px; font-size: 12px; }

    /* Utilities */
    .text-blue { color: #0050e5; }
    .text-green { color: #10b981; }
    .text-purple { color: #8b5cf6; }
    .text-amber { color: #f59e0b; }
    .text-danger { color: #dc2626; }
  `]
})
export class UsersComponent implements OnInit, AfterViewInit {
  activeTab = 'directory';
  isLoading = false;
  isSaving = false;

  // Header button
  headerButtons: PageHeaderButton[] = [
    {
      text: 'Add Member',
      icon: 'person_add',
      isPrimary: true,
      action: () => this.openCreateUserModal()
    }
  ];

  // Data Store
  users: any[] = [];
  filteredUsers: any[] = [];
  categories: any[] = [];
  kpiIndicators: any[] = [];
  kpiPeriods: any[] = [];
  leaderboard: any[] = [];
  activityLogs: any[] = [];
  userNotes: any[] = [];

  // Filter Models
  searchQuery = '';
  selectedCategoryFilter = '';
  selectedRoleFilter = 'All';
  selectedStatusFilter = 'All';
  sortColumn = 'fullName';
  sortAsc = true;
  showCategoryExportMenu = false;
  selectedLeaderboardPeriod = 'August 2026';

  // Modals & Drawers
  showCreateUserModal = false;
  showEditUserModal = false;
  showResetPasswordModal = false;
  showGradeModal = false;
  showCategoryModal = false;
  showNotesDrawer = false;

  // Form Objects
  newUser: any = { role: 'Member', bcpUserCategoryId: null, password: 'Member@2026', mustChangePassword: true };
  editingUser: any = null;
  resetPasswordTarget: any = null;
  resetPasswordMethod: 'direct' | 'link' = 'direct';
  resetPasswordModel = { newPassword: '', mustChangePassword: true };
  generatedResetLink = '';
  gradingTarget: any = null;
  gradingPeriod = 'August 2026';
  gradingMetrics: any[] = [];
  categoryForm: any = {};
  notesTargetUser: any = null;
  newNoteText = '';

  // Charts
  @ViewChild('registrationChartCanvas') registrationChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryDonutChartCanvas') categoryDonutChartRef!: ElementRef<HTMLCanvasElement>;
  private regChart: Chart | null = null;
  private donutChart: Chart | null = null;

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private exportService: ExportService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Read ?tab= query param if present
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });

    this.loadAllData();
  }

  ngAfterViewInit(): void {
    if (this.activeTab === 'dashboard') {
      setTimeout(() => this.initCharts(), 300);
    }
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    this.router.navigate([], { queryParams: { tab }, queryParamsHandling: 'merge' });
    if (tab === 'dashboard') {
      setTimeout(() => this.initCharts(), 200);
    }
  }

  loadAllData(): void {
    this.isLoading = true;
    this.loadUsers();
    this.loadCategories();
    this.loadKpiIndicators();
    this.loadKpiPeriods();
    this.loadActivityLogs();
  }

  loadUsers(): void {
    this.api.get<any>('UsersApi').subscribe({
      next: (res) => {
        this.isLoading = false;
        this.users = res?.data || [];
        this.applyFilters();
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err?.error?.message || 'Failed to load member directory.');
      }
    });
  }

  loadCategories(): void {
    this.api.get<any>('UsersApi/categories').subscribe({
      next: (res) => {
        this.categories = res?.data || [];
      }
    });
  }

  loadKpiIndicators(): void {
    this.api.get<any>('UsersApi/kpi-indicators').subscribe({
      next: (res) => {
        this.kpiIndicators = res?.data || [];
      }
    });
  }

  loadKpiPeriods(): void {
    this.api.get<any>('UsersApi/kpi-periods').subscribe({
      next: (res) => {
        this.kpiPeriods = res?.data || [];
        if (this.kpiPeriods.length > 0 && !this.selectedLeaderboardPeriod) {
          this.selectedLeaderboardPeriod = this.kpiPeriods[0].title;
        }
        this.loadLeaderboard();
      }
    });
  }

  loadLeaderboard(): void {
    this.api.get<any>(`UsersApi/kpi-leaderboard?period=${encodeURIComponent(this.selectedLeaderboardPeriod)}`).subscribe({
      next: (res) => {
        this.leaderboard = res?.data || [];
      }
    });
  }

  loadActivityLogs(): void {
    this.api.get<any>('UsersApi/activity-logs').subscribe({
      next: (res) => {
        this.activityLogs = res?.data?.logs || [];
      }
    });
  }

  // =========================================================================
  // FILTERING, SORTING & EXPORT ENGINE
  // =========================================================================

  applyFilters(): void {
    let list = [...this.users];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(u =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.memberId?.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q) ||
        u.categoryName?.toLowerCase().includes(q) ||
        u.phoneNumber?.includes(q)
      );
    }

    if (this.selectedCategoryFilter) {
      list = list.filter(u => u.bcpUserCategoryId === this.selectedCategoryFilter);
    }

    if (this.selectedRoleFilter !== 'All') {
      list = list.filter(u => u.roles?.includes(this.selectedRoleFilter));
    }

    if (this.selectedStatusFilter !== 'All') {
      list = list.filter(u => stringEquals(u.userStatus, this.selectedStatusFilter));
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[this.sortColumn] || '';
      let valB = b[this.sortColumn] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      return this.sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    this.filteredUsers = list;
  }

  sortBy(col: string): void {
    if (this.sortColumn === col) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = col;
      this.sortAsc = true;
    }
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategoryFilter = '';
    this.selectedRoleFilter = 'All';
    this.selectedStatusFilter = 'All';
    this.applyFilters();
  }

  filterByThisCategory(cat: any): void {
    this.selectedCategoryFilter = cat.id;
    this.setTab('directory');
    this.applyFilters();
  }

  // Export Columns Definition
  private getExportColumns(): ExportColumn[] {
    return [
      { key: 'memberId', header: 'Member ID' },
      { key: 'fullName', header: 'Full Name' },
      { key: 'email', header: 'Email Address' },
      { key: 'phoneNumber', header: 'Phone Number' },
      { key: 'categoryName', header: 'Category Tier' },
      { key: 'roles', header: 'Assigned Roles', format: (val) => Array.isArray(val) ? val.join(', ') : (val || 'Member') },
      { key: 'designation', header: 'Designation' },
      { key: 'userStatus', header: 'Status' },
      { key: 'joinDate', header: 'Join Date', format: (val) => val ? new Date(val).toLocaleDateString() : '-' }
    ];
  }

  exportPdf(): void {
    this.exportService.printReport(
      'Official Member Directory Register',
      'Business Command Center',
      this.getExportColumns(),
      this.filteredUsers,
      this.searchQuery ? `Search: "${this.searchQuery}"` : undefined
    );
  }

  exportExcel(): void {
    this.exportService.exportToCsv(
      `Member_Directory_${new Date().toISOString().substring(0,10)}`,
      this.getExportColumns(),
      this.filteredUsers
    );
    this.toast.success('Spreadsheet exported successfully!');
  }

  exportWord(): void {
    this.exportService.exportToWord(
      `Member_Register_${new Date().toISOString().substring(0,10)}`,
      'Official Member Directory Register',
      'Business Command Center',
      this.getExportColumns(),
      this.filteredUsers
    );
    this.toast.success('Word document exported successfully!');
  }

  exportSpecificCategory(cat: any): void {
    this.showCategoryExportMenu = false;
    const categoryMembers = this.users.filter(u => u.bcpUserCategoryId === cat.id);
    this.exportService.printReport(
      `Member Register - ${cat.name}`,
      'Business Command Center',
      this.getExportColumns(),
      categoryMembers,
      `Category: ${cat.name}`
    );
  }

  // =========================================================================
  // MEMBER ACTIONS (STATUS, EDIT, CREATE)
  // =========================================================================

  openCreateUserModal(): void {
    this.newUser = {
      role: 'Member',
      bcpUserCategoryId: null,
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      designation: '',
      password: this.generateRandomStringPassword(),
      mustChangePassword: true
    };
    this.showCreateUserModal = true;
  }

  generateNewUserPassword(): void {
    this.newUser.password = this.generateRandomStringPassword();
    this.toast.info('New temporary password generated.');
  }

  generateResetTempPassword(): void {
    this.resetPasswordModel.newPassword = this.generateRandomStringPassword();
    this.toast.info('New secure password generated.');
  }

  private generateRandomStringPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Pass@';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  openResetPasswordModal(user: any): void {
    this.resetPasswordTarget = user;
    this.resetPasswordMethod = 'direct';
    this.resetPasswordModel = {
      newPassword: this.generateRandomStringPassword(),
      mustChangePassword: true
    };
    this.generatedResetLink = '';
    this.showResetPasswordModal = true;
  }

  submitAdminPasswordReset(): void {
    if (!this.resetPasswordTarget || !this.resetPasswordModel.newPassword) {
      this.toast.warning('New temporary password is required.');
      return;
    }

    this.isSaving = true;
    this.api.put<any>(`UsersApi/${this.resetPasswordTarget.id}/reset-password`, this.resetPasswordModel).subscribe({
      next: () => {
        this.isSaving = false;
        this.showResetPasswordModal = false;
        this.toast.success(`Password for ${this.resetPasswordTarget.fullName} reset successfully!`);
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to reset password.');
      }
    });
  }

  generateMemberActivationLink(): void {
    if (!this.resetPasswordTarget) return;

    this.isSaving = true;
    this.api.post<any>(`UsersApi/${this.resetPasswordTarget.id}/generate-reset-link`, {}).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.generatedResetLink = res.data?.resetUrl || '';
        this.toast.success('Activation link generated successfully!');
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to generate link.');
      }
    });
  }

  copyToClipboard(text: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.toast.success('Link copied to clipboard!');
    }).catch(() => {
      this.toast.error('Failed to copy to clipboard.');
    });
  }

  saveNewUser(): void {
    if (!this.newUser.email || !this.newUser.firstName || !this.newUser.lastName) {
      this.toast.warning('First name, last name, and email are required.');
      return;
    }

    this.isSaving = true;
    this.api.post<any>('UsersApi', this.newUser).subscribe({
      next: () => {
        this.isSaving = false;
        this.showCreateUserModal = false;
        this.toast.success(`Member account for ${this.newUser.firstName} created successfully!`);
        this.loadUsers();
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to create member.');
      }
    });
  }

  openEditModal(user: any): void {
    this.editingUser = { ...user };
    this.showEditUserModal = true;
  }

  saveEditedUser(): void {
    this.isSaving = true;
    this.api.put<any>(`UsersApi/${this.editingUser.id}`, this.editingUser).subscribe({
      next: () => {
        this.isSaving = false;
        this.showEditUserModal = false;
        this.toast.success('Member profile updated successfully!');
        this.loadUsers();
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to update profile.');
      }
    });
  }

  async toggleMemberStatus(u: any): Promise<void> {
    const isCurrentlyActive = u.userStatus === 'Active';
    const targetStatus = isCurrentlyActive ? 'Suspended' : 'Active';

    const confirmed = await this.toast.confirm(
      'Change Account Status',
      `Are you sure you want to change status of ${u.fullName} to "${targetStatus}"?`,
      `Set to ${targetStatus}`,
      'Cancel',
      isCurrentlyActive ? 'danger' : 'info'
    );

    if (confirmed) {
      this.api.put<any>(`UsersApi/${u.id}/status`, { isActive: !isCurrentlyActive }).subscribe({
        next: () => {
          u.userStatus = targetStatus;
          this.toast.success(`Account status updated to ${targetStatus}.`);
        },
        error: (err) => {
          this.toast.error(err?.error?.message || 'Failed to update account status.');
        }
      });
    }
  }

  // =========================================================================
  // KPI EVALUATION & SCORING
  // =========================================================================

  openGradeModal(u: any): void {
    this.gradingTarget = u;
    this.gradingPeriod = this.selectedLeaderboardPeriod || 'August 2026';
    this.gradingMetrics = this.kpiIndicators.map(k => ({
      indicatorId: k.id,
      title: k.title,
      maxScore: k.maxScore || 100,
      weight: k.weight || 1.0,
      score: 85,
      remarks: ''
    }));
    this.showGradeModal = true;
  }

  submitKpiEvaluation(): void {
    this.isSaving = true;
    const payload = {
      profileId: this.gradingTarget.id,
      period: this.gradingPeriod,
      scores: this.gradingMetrics.map(m => ({
        indicatorId: m.indicatorId,
        score: Number(m.score),
        remarks: m.remarks
      }))
    };

    this.api.post<any>('UsersApi/kpi-scores/batch', payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.showGradeModal = false;
        this.toast.success(`KPI evaluation submitted for ${this.gradingTarget.fullName}!`);
        this.loadLeaderboard();
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to submit KPI scores.');
      }
    });
  }

  // KPI Indicators Management
  openCreateIndicatorModal(): void {
    const title = prompt('Enter KPI Metric Title (e.g. "Attendance & Punctuality"):');
    if (!title) return;
    const maxScore = Number(prompt('Enter Maximum Score (e.g. 100):', '100')) || 100;

    this.api.post<any>('UsersApi/kpi-indicators', { title, maxScore, weight: 1.0, category: 'General' }).subscribe({
      next: () => {
        this.toast.success('KPI Metric created successfully!');
        this.loadKpiIndicators();
      },
      error: (err) => this.toast.error(err?.error?.message || 'Failed to create metric.')
    });
  }

  openEditIndicatorModal(kpi: any): void {
    const newTitle = prompt('Edit KPI Title:', kpi.title);
    if (!newTitle) return;

    this.api.put<any>(`UsersApi/kpi-indicators/${kpi.id}`, { ...kpi, title: newTitle }).subscribe({
      next: () => {
        this.toast.success('KPI Metric updated.');
        this.loadKpiIndicators();
      },
      error: (err) => this.toast.error(err?.error?.message || 'Failed to update metric.')
    });
  }

  async deleteKpiIndicator(kpi: any): Promise<void> {
    const confirmed = await this.toast.confirm('Delete KPI Metric', `Delete "${kpi.title}"?`, 'Delete', 'Cancel', 'danger');
    if (confirmed) {
      this.api.delete<any>(`UsersApi/kpi-indicators/${kpi.id}`).subscribe({
        next: () => {
          this.toast.success('Metric deleted.');
          this.loadKpiIndicators();
        },
        error: (err) => this.toast.error(err?.error?.message || 'Failed to delete metric.')
      });
    }
  }

  openCreatePeriodModal(): void {
    const title = prompt('Enter Evaluation Period Title (e.g. "Q4 2026"):');
    if (!title) return;

    this.api.post<any>('UsersApi/kpi-periods', { title, description: 'Evaluation Cycle' }).subscribe({
      next: () => {
        this.toast.success('Evaluation period created.');
        this.loadKpiPeriods();
      },
      error: (err) => this.toast.error(err?.error?.message || 'Failed to create period.')
    });
  }

  // =========================================================================
  // CATEGORIES MANAGEMENT
  // =========================================================================

  openCreateCategoryModal(): void {
    this.categoryForm = {
      name: '',
      description: '',
      colorCode: '#0050e5',
      icon: 'category',
      sortOrder: this.categories.length + 1,
      isActive: true
    };
    this.showCategoryModal = true;
  }

  openEditCategoryModal(cat: any): void {
    this.categoryForm = { ...cat };
    this.showCategoryModal = true;
  }

  saveCategory(): void {
    if (!this.categoryForm.name?.trim()) {
      this.toast.warning('Category Name is required.');
      return;
    }

    this.isSaving = true;
    const req = this.categoryForm.id
      ? this.api.put<any>(`UsersApi/categories/${this.categoryForm.id}`, this.categoryForm)
      : this.api.post<any>('UsersApi/categories', this.categoryForm);

    req.subscribe({
      next: () => {
        this.isSaving = false;
        this.showCategoryModal = false;
        this.toast.success('Category tier saved successfully!');
        this.loadCategories();
        this.loadUsers();
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to save category.');
      }
    });
  }

  async deleteCategory(cat: any): Promise<void> {
    const confirmed = await this.toast.confirm(
      'Delete Category Tier',
      `Are you sure you want to delete tier "${cat.name}"?`,
      'Delete Category',
      'Cancel',
      'danger'
    );

    if (confirmed) {
      this.api.delete<any>(`UsersApi/categories/${cat.id}`).subscribe({
        next: () => {
          this.toast.success(`Category "${cat.name}" deleted.`);
          this.loadCategories();
        },
        error: (err) => {
          this.toast.error(err?.error?.message || 'Failed to delete category.');
        }
      });
    }
  }

  // =========================================================================
  // CONFIDENTIAL ADMIN NOTES
  // =========================================================================

  openNotesDrawer(u: any): void {
    this.notesTargetUser = u;
    this.newNoteText = '';
    this.loadNotes(u.id);
    this.showNotesDrawer = true;
  }

  loadNotes(userId: string): void {
    this.api.get<any>(`UsersApi/${userId}/notes`).subscribe({
      next: (res) => {
        this.userNotes = res?.data || [];
      }
    });
  }

  submitAdminNote(): void {
    if (!this.newNoteText?.trim()) return;

    this.isSaving = true;
    this.api.post<any>(`UsersApi/${this.notesTargetUser.id}/notes`, { note: this.newNoteText }).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success('Confidential note recorded.');
        this.newNoteText = '';
        this.loadNotes(this.notesTargetUser.id);
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to post note.');
      }
    });
  }

  // =========================================================================
  // ANALYTICS & CHARTS
  // =========================================================================

  private initCharts(): void {
    if (this.registrationChartRef?.nativeElement) {
      if (this.regChart) this.regChart.destroy();
      this.regChart = new Chart(this.registrationChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: ['March', 'April', 'May', 'June', 'July', 'August'],
          datasets: [{
            label: 'New Registrations',
            data: [12, 19, 15, 25, 22, 30],
            backgroundColor: '#0050e5',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    if (this.categoryDonutChartRef?.nativeElement && this.categories.length > 0) {
      if (this.donutChart) this.donutChart.destroy();
      this.donutChart = new Chart(this.categoryDonutChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: this.categories.map(c => c.name),
          datasets: [{
            data: this.categories.map(c => c.memberCount || 1),
            backgroundColor: this.categories.map(c => c.colorCode || '#0050e5')
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }

  // Helper visual utils
  getInitials(name?: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getGradient(name?: string): string {
    const colors = [
      'linear-gradient(135deg, #0050e5, #6366f1)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #8b5cf6, #ec4899)',
      'linear-gradient(135deg, #f59e0b, #d97706)'
    ];
    let hash = 0;
    if (name) {
      for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    }
    return colors[hash % colors.length];
  }
}

function stringEquals(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}
