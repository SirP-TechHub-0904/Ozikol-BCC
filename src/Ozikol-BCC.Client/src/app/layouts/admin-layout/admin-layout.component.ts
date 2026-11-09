import { Component, OnInit, HostListener, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { SignalRService } from '../../core/services/signalr.service';
import { AiAssistantComponent } from '../../shared/components/ai-assistant/ai-assistant.component';
import { AiAssistantContextService } from '../../core/services/ai-assistant-context.service';
import { FirstRunSetupModalComponent } from '../../shared/components/first-run-setup-modal/first-run-setup-modal.component';
import { TranslationService, SupportedLanguage, LanguageOption, SUPPORTED_LANGUAGES } from '../../core/services/translation.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { MultiWorkspaceService, EnrolledWorkspaceSession } from '../../core/services/multi-workspace.service';
import { CommitteesService } from '../../core/services/committees.service';
import { 
  getStoredUserRoles, 
  canAccessConsole, 
  isGlobalAdmin, 
  isGlobalEditor,
  isReadOnlyUser,
  hasFeatureScope,
  hasUserRole, 
  getUserPrimaryRoleName 
} from '../../core/utils/user-role.utils';

interface TaskTab {
  title: string;
  url: string;
  icon: string;
  closable: boolean;
}

interface PinnedItem {
  title: string;
  url: string;
  icon: string;
}

export interface SuiteInfoDetail {
  key: string;
  badge: string;
  icon: string;
  title: string;
  shortDesc: string;
  whoUsesIt: string;
  capabilities: string[];
  impact: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, AiAssistantComponent, FirstRunSetupModalComponent, TranslatePipe],
  template: `
    <!-- Sidebar / Navigation Drawer -->
    <aside id="sidebar" [class.collapsed]="sidebarCollapsed" [attr.data-bcp-sidebar]="isConsoleActive ? 'console' : 'workspace'">
      <div class="sidebar-header">
        <a routerLink="/admin/dashboard" class="brand-logo ozikol-brand-logo" [title]="brandName">
          <img [src]="brandLogoUrl" [alt]="brandName" class="brand-logo-img" *ngIf="brandLogoUrl">
          <span *ngIf="!brandLogoUrl" class="brand-logo-text">{{ brandName || 'Workspace' }}</span>
        </a>
        <button type="button" class="sidebar-close-btn" (click)="closeSidebarMobile()" title="Close Navigation Drawer">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <nav class="sidebar-nav">
        <!-- Section: PIN NAVIGATION -->
        <div id="pinned-sidebar-section" *ngIf="pinnedItems.length > 0">
          <div class="menu-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>{{ 'adm.pin_navigation' | translate:'Pin Navigation' }}</span>
            <span class="badge-pill" style="background:#0050e5;">{{ pinnedItems.length }}</span>
          </div>
          <div class="nav-item" *ngFor="let item of pinnedItems">
            <a [routerLink]="item.url" routerLinkActive="active" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">{{ item.icon }}</span>
                <span>{{ item.title }}</span>
              </div>
              <button type="button" class="pin-btn pinned" (click)="togglePin(item.title, item.url, item.icon); $event.preventDefault(); $event.stopPropagation();" [title]="'adm.unpin_task' | translate:'Unpin Task'">
                <span class="material-symbols-outlined">keep_off</span>
              </button>
            </a>
          </div>
        </div>

        <!-- ============================================== -->
        <!-- ADMIN CONSOLE SIDEBAR (when isConsoleActive)  -->
        <!-- ============================================== -->
        <ng-container *ngIf="isConsoleActive">
          <!-- 1. Executive Command -->
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.core_command' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('core_command', $event)" [title]="'adm.executive_command_overview' | translate:'Executive Command Overview'">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item">
            <a routerLink="/dashboard/console" [class.active]="isCurrentRoute('/dashboard/console') || isCurrentRoute('/admin/dashboard')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">space_dashboard</span>
                <span>{{ 'nav.console_dashboard' | translate }}</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/dashboard/console')" (click)="togglePin('Console Dashboard', '/dashboard/console', 'space_dashboard'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/dashboard/console') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/dashboard/console') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/dashboard/console/analytics" [class.active]="isCurrentRoute('/dashboard/console/analytics')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">analytics</span>
                <span>{{ 'adm.analytics_telemetry' | translate:'Analytics & Telemetry' }}</span>
                <span class="badge-pill badge-hot">{{ 'adm.live' | translate:'Live' }}</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/dashboard/console/analytics')" (click)="togglePin('Analytics', '/dashboard/console/analytics', 'analytics'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/dashboard/console/analytics') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/dashboard/console/analytics') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>

          <!-- 2. Website & CMS (Web Exclusive) -->
          <ng-container *ngIf="canAccessSuite('cms')">
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.website_cms' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('website_cms', $event)" [title]="'adm.website_cms_overview' | translate:'Website & CMS Overview'">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <!-- Suite 1: Website & CMS (Web Exclusive) -->
          <div class="nav-item has-sub" [class.open]="isMenuOpen('content')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isCmsStudioActive()" (click)="toggleMenu('content')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">dynamic_feed</span>
                <span>{{ 'nav.cms_studio' | translate }}</span>
                <span class="badge-pill badge-new">{{ 'adm.live' | translate:'Live' }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('content')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console" [class.active]="isCurrentRoute('/content/console')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>{{ 'nav.cms_dashboard' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console')" (click)="togglePin('CMS Dashboard', '/content/console', 'dynamic_feed')" [title]="isPinned('/content/console') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/categories" [class.active]="isContentCategoriesActive()" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">folder_open</span>{{ 'nav.web_categories' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/categories')" (click)="togglePin('Web Categories', '/content/console/categories', 'folder_open')" [title]="isPinned('/content/console/categories') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console/categories') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/pages" [class.active]="isContentPagesActive()" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">description</span>{{ 'nav.all_web_pages' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/pages')" (click)="togglePin('Web Pages', '/content/console/pages', 'description')" [title]="isPinned('/content/console/pages') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console/pages') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/blogs" [class.active]="isParentActive('/content/console/blogs')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">post_add</span>{{ 'nav.blog_articles' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/blogs')" (click)="togglePin('Blog Articles', '/content/console/blogs', 'post_add')" [title]="isPinned('/content/console/blogs') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console/blogs') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/blog-categories" [class.active]="isParentActive('/content/console/blog-categories')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">topic</span>{{ 'nav.blog_categories' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/blog-categories')" (click)="togglePin('Blog Categories', '/content/console/blog-categories', 'topic')" [title]="isPinned('/content/console/blog-categories') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console/blog-categories') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li class="sub-nav-divider">
                <span class="sub-divider-text">{{ 'adm.form_inquiries_leads' | translate:'Form Inquiries & Leads' }}</span>
              </li>
              <li *ngFor="let formItem of sidebarForms">
                <div class="sub-nav-wrapper">
                  <a [routerLink]="['/content/console/forms', formItem.formKey, 'submissions']"
                     [class.active]="currentRoute.includes('/content/console/forms/' + formItem.formKey + '/submissions')"
                     class="sub-nav-item">
                    <span class="sub-nav-content">
                      <span class="material-symbols-outlined sub-icon">inbox</span>
                      {{ formItem.title }}
                      <span *ngIf="formItem.newSubmissions > 0" class="badge-sub-new">+{{ formItem.newSubmissions }}</span>
                    </span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/forms/' + formItem.formKey + '/submissions')"
                          (click)="togglePin(formItem.title + ' Leads', '/content/console/forms/' + formItem.formKey + '/submissions', 'inbox')"
                          [title]="isPinned('/content/console/forms/' + formItem.formKey + '/submissions') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console/forms/' + formItem.formKey + '/submissions') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>
          </ng-container>
          <ng-container *ngIf="canAccessSuite('settings')">
          <div class="nav-item">
            <a routerLink="/settings/console" [class.active]="isCurrentRoute('/settings/console') || isCurrentRoute('/admin/settings')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">palette</span>
                <span>{{ 'nav.brand_settings' | translate }}</span>
                <span class="badge-pill badge-hot">{{ 'adm.hot' | translate:'Hot' }}</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/settings/console')" (click)="togglePin('Brand Settings', '/settings/console', 'palette'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/settings/console') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/settings/console') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/settings/console/custom-domain" class="nav-link domain-nav-link" [class.is-linked]="hasCustomDomain" [title]="hasCustomDomain ? 'Manage Custom Domain (' + customDomain + ')' : 'Link a Custom Domain'">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">{{ hasCustomDomain ? 'domain_verification' : 'add_link' }}</span>
                <span>{{ hasCustomDomain ? ('nav.manage_domain' | translate) : ('nav.link_domain' | translate) }}</span>
              </div>
              <span class="badge-pill" [class.badge-linked]="hasCustomDomain" [class.badge-unlinked]="!hasCustomDomain">
                {{ hasCustomDomain ? ('badge.active' | translate) : ('badge.setup' | translate) }}
              </span>
            </a>
          </div>
          </ng-container>
          <ng-container *ngIf="canAccessSuite('cms') || canAccessSuite('forms_intelligence')">
          <div class="nav-item">
            <a routerLink="/content/console/forms" routerLinkActive="active" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">dynamic_form</span>
                <span>{{ 'nav.manage_forms' | translate }}</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/forms')" (click)="togglePin('Manage Forms', '/content/console/forms', 'dynamic_form'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/content/console/forms') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/content/console/forms') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/content/console/templates" routerLinkActive="active" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">layers</span>
                <span>{{ 'nav.my_templates' | translate }}</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/templates')" (click)="togglePin('My Templates', '/content/console/templates', 'layers'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/content/console/templates') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/content/console/templates') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/content/console/marketplace" routerLinkActive="active" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">widgets</span>
                <span>{{ 'nav.ui_marketplace' | translate }}</span>
                <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/marketplace')" (click)="togglePin('UI Marketplace', '/content/console/marketplace', 'widgets'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/content/console/marketplace') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/content/console/marketplace') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
          <div class="nav-item">
            <a [href]="liveWebsiteUrl" target="_blank" class="nav-link" [title]="hasCustomDomain ? 'Visit ' + customDomain + ' in new tab' : 'Visit live public website in new tab'">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">open_in_browser</span>
                <span>{{ 'adm.live_public_site' | translate:'Live Public Site' }}</span>
              </div>
              <span class="material-symbols-outlined nav-external-hint">open_in_new</span>
            </a>
          </div>
          </ng-container>

          <!-- Suite 2: User Management -->
          <ng-container *ngIf="canAccessSuite('user_management')">
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.user_management' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('user_management', $event)" [title]="'adm.user_management_overview' | translate:'User Management Overview'">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('users')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/users/console') || isParentActive('/admin/users')" (click)="toggleMenu('users')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">groups</span>
                <span>{{ 'nav.user_directory' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('users')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/console/dashboard" [class.active]="isCurrentRoute('/users/console/dashboard')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">analytics</span>{{ 'adm.dashboard_overview' | translate:'Dashboard Overview' }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/console/dashboard')" (click)="togglePin('User Dashboard', '/users/console/dashboard', 'analytics')" [title]="isPinned('/users/console/dashboard') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/console/dashboard') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/console/list" [class.active]="isUserListActive()" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">groups</span>{{ 'nav.all_members' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/console/list')" (click)="togglePin('All Members', '/users/console/list', 'groups')" [title]="isPinned('/users/console/list') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/console/list') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/console/categories" [class.active]="isUserCategoriesActive()" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">category</span>{{ 'nav.user_categories' | translate:'User Categories' }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/console/categories')" (click)="togglePin('User Categories', '/users/console/categories', 'category')" [title]="isPinned('/users/console/categories') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/console/categories') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/console/registration-form" [class.active]="isCurrentRoute('/users/console/registration-form')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">dynamic_form</span>{{ 'nav.registration_form_builder' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/console/registration-form')" (click)="togglePin('Registration Form Builder', '/users/console/registration-form', 'dynamic_form')" [title]="isPinned('/users/console/registration-form') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/console/registration-form') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/console/auth-setup" [class.active]="isCurrentRoute('/users/console/auth-setup')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">branding_watermark</span>{{ 'adm.auth_page_setup' | translate:'Auth Page Setup' }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/console/auth-setup')" (click)="togglePin('Auth Page Setup', '/users/console/auth-setup', 'branding_watermark')" [title]="isPinned('/users/console/auth-setup') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/console/auth-setup') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/console/kpi" [class.active]="isUserKpiActive()" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">monitoring</span>{{ 'nav.kpis_leaderboard' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/console/kpi')" (click)="togglePin('KPIs & Leaderboard', '/users/console/kpi', 'monitoring')" [title]="isPinned('/users/console/kpi') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/console/kpi') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/console/settings" [class.active]="isCurrentRoute('/users/console/settings')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">tune</span>{{ 'adm.user_settings' | translate:'User Settings' }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/console/settings')" (click)="togglePin('User Settings', '/users/console/settings', 'tune')" [title]="isPinned('/users/console/settings') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/console/settings') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>
          </ng-container>
          <ng-container *ngIf="canAccessSuite('identity')">
          <div class="nav-item has-sub" [class.open]="isMenuOpen('identity')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/identity/console') || isParentActive('/admin/identity')" (click)="toggleMenu('identity')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">admin_panel_settings</span>
                <span>{{ 'nav.identity_control' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('identity')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/identity/console" [class.active]="isCurrentRoute('/identity/console') || isCurrentRoute('/identity/console/dashboard')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>{{ 'nav.identity_dashboard' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console')" (click)="togglePin('Identity Dashboard', '/identity/console', 'space_dashboard')" [title]="isPinned('/identity/console') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/identity/console/roles" [class.active]="isCurrentRoute('/identity/console/roles')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">verified_user</span>{{ 'nav.roles_permissions' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/roles')" (click)="togglePin('Roles & Permissions', '/identity/console/roles', 'verified_user')" [title]="isPinned('/identity/console/roles') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console/roles') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/identity/console/invitations" [class.active]="isCurrentRoute('/identity/console/invitations')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">mail</span>{{ 'nav.user_invitations' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/invitations')" (click)="togglePin('User Invitations', '/identity/console/invitations', 'mail')" [title]="isPinned('/identity/console/invitations') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console/invitations') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/identity/console/policies" [class.active]="isCurrentRoute('/identity/console/policies')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">password</span>{{ 'nav.global_policies' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/policies')" (click)="togglePin('Global Policies', '/identity/console/policies', 'password')" [title]="isPinned('/identity/console/policies') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console/policies') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>
          </ng-container>

          <!-- Administrator Account & Security Management Dropdown (Top-Level) -->
          <div class="nav-item has-sub" [class.open]="isMenuOpen('admin_manage_account')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isCurrentRoute('/identity/console/account') || isCurrentRoute('/users/workspace/profile')" (click)="toggleMenu('admin_manage_account')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">manage_accounts</span>
                <span>{{ 'nav.manage_my_account' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">{{ isMenuOpen('admin_manage_account') ? 'expand_more' : 'chevron_right' }}</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('admin_manage_account')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/workspace/profile" [class.active]="isCurrentRoute('/users/workspace/profile')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">account_circle</span>{{ 'nav.my_account' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/workspace/profile')" (click)="togglePin('My Account', '/users/workspace/profile', 'account_circle')" [title]="isPinned('/users/workspace/profile') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/workspace/profile') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/identity/console/account" [queryParams]="{ tab: 'password' }" [class.active]="isCurrentRouteWithQuery('/identity/console/account', 'password')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">key</span>{{ 'nav.change_password' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/account?tab=password')" (click)="togglePin('Change Password', '/identity/console/account?tab=password', 'key')" [title]="isPinned('/identity/console/account?tab=password') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console/account?tab=password') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/identity/console/account" [queryParams]="{ tab: '2fa' }" [class.active]="isCurrentRouteWithQuery('/identity/console/account', '2fa')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">shield_lock</span>{{ 'nav.mfa_security' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/account?tab=2fa')" (click)="togglePin('2FA Security', '/identity/console/account?tab=2fa', 'shield_lock')" [title]="isPinned('/identity/console/account?tab=2fa') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console/account?tab=2fa') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/identity/console/account" [queryParams]="{ tab: 'devices' }" [class.active]="isCurrentRouteWithQuery('/identity/console/account', 'devices')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">devices</span>{{ 'nav.manage_devices' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/account?tab=devices')" (click)="togglePin('Manage Devices', '/identity/console/account?tab=devices', 'devices')" [title]="isPinned('/identity/console/account?tab=devices') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console/account?tab=devices') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/identity/console/account" [queryParams]="{ tab: 'activity' }" [class.active]="isCurrentRouteWithQuery('/identity/console/account', 'activity')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">history</span>{{ 'nav.login_history' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/account?tab=activity')" (click)="togglePin('Log Activity', '/identity/console/account?tab=activity', 'history')" [title]="isPinned('/identity/console/account?tab=activity') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console/account?tab=activity') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <!-- Dynamic Suites & Capabilities strictly ordered by Suite SortOrder & Feature SortOrder from Central -->
          <ng-container *ngFor="let suite of orderedSidebarSuites">
            <ng-container *ngIf="canAccessSuite(suite.suiteAccessKey || suite.infoKey || suite.categoryName) && isAnyFeatureVisible(suite.featureCodes)">
              <div class="menu-title suite-header-row">
                <span class="suite-header-text">{{ getSuiteMenuTitle(suite.categoryName, suite.defaultMenuTitle) }}</span>
                <button *ngIf="suite.infoKey" type="button" class="suite-info-trigger" (click)="openSuiteInfo(suite.infoKey, $event)" [title]="(suite.infoTitleKey || '') | translate:(suite.infoTitleFallback || '')">
                  <span class="material-symbols-outlined suite-info-icon">info</span>
                </button>
              </div>
              <ng-container *ngFor="let featCode of suite.featureCodes">
                <ng-container *ngIf="isFeatureVisible(featCode)" [ngSwitch]="featCode">
          <div class="nav-item" *ngSwitchCase="'bcp-community-messenger'">
            <a [routerLink]="isFeatureActive('bcp-community-messenger') ? '/admin/messenger' : null" href="javascript:void(0)" [class.active]="isFeatureActive('bcp-community-messenger') && (isCurrentRoute('/admin/messenger') || isCurrentRoute('/users/workspace/chat'))" [class.feature-locked]="!isFeatureActive('bcp-community-messenger')" (click)="onFeatureMenuClick('bcp-community-messenger', getFeatureFullTitle('bcp-community-messenger', 'Community Messenger & Team Chat'), $event)" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">chat</span>
                <span>{{ getFeatureMenuTitle('bcp-community-messenger', 'Chat Messenger') }}</span>
                <span class="badge-pill badge-hot" *ngIf="isFeatureActive('bcp-community-messenger')">{{ 'adm.live' | translate:'Live' }}</span>
              </div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-community-messenger') && !isFeatureActive('bcp-community-messenger')" title="Available — Click to view details & install">
                <span class="material-symbols-outlined">lock</span>
              </span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-community-messenger')">{{ 'badge.soon' | translate }}</span>
              <button *ngIf="isFeatureActive('bcp-community-messenger')" type="button" class="pin-btn" [class.pinned]="isPinned('/admin/messenger')" (click)="togglePin('Chat Messenger', '/admin/messenger', 'chat'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/admin/messenger') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/admin/messenger') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
          <div class="nav-item has-sub" [class.open]="isFeatureActive('bcp-committees') && isMenuOpen('groups')" *ngSwitchCase="'bcp-committees'">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isFeatureActive('bcp-committees') && (isParentActive('/committees/console') || isParentActive('/groups/console'))" [class.feature-locked]="!isFeatureActive('bcp-committees')" (click)="onFeatureMenuClick('bcp-committees', getFeatureFullTitle('bcp-committees', 'Committees & Sub-Groups'), $event, 'groups')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">diversity_3</span>
                <span>{{ committeeAliases.aliasPlural || getFeatureMenuTitle('bcp-committees', 'Groups & Committees') }}</span>
              </div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-committees') && !isFeatureActive('bcp-committees')" title="Available — Click to view details & install">
                <span class="material-symbols-outlined">lock</span>
              </span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-committees')">{{ 'badge.soon' | translate }}</span>
              <span class="material-symbols-outlined arrow-icon" *ngIf="isFeatureActive('bcp-committees')">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isFeatureActive('bcp-committees') && isMenuOpen('groups')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/committees/console/dashboard" [class.active]="isCurrentRoute('/committees/console/dashboard')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>Dashboard</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/committees/console/dashboard')" (click)="togglePin('Dashboard', '/committees/console/dashboard', 'space_dashboard')" [title]="isPinned('/committees/console/dashboard') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/committees/console/dashboard') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/committees/console/manage" [class.active]="isCurrentRoute('/committees/console/manage')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">diversity_3</span>Manage {{ committeeAliases.aliasPlural }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/committees/console/manage')" (click)="togglePin('Manage ' + committeeAliases.aliasPlural, '/committees/console/manage', 'diversity_3')" [title]="isPinned('/committees/console/manage') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/committees/console/manage') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/committees/console/registrations" [class.active]="isCurrentRoute('/committees/console/registrations')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">how_to_reg</span>Registrations &amp; Intake</span>
                  </a>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/committees/console/reports" [class.active]="isCurrentRoute('/committees/console/reports')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">summarize</span>Meeting Reports</span>
                  </a>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/committees/console/forms" [class.active]="isCurrentRoute('/committees/console/forms')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">dynamic_form</span>Extra-Info Forms</span>
                  </a>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/committees/console/settings" [class.active]="isCurrentRoute('/committees/console/settings')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Settings</span>
                  </a>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item has-sub" [class.open]="isFeatureActive('bcp-alumni-directory') && isMenuOpen('alumni')" *ngSwitchCase="'bcp-alumni-directory'">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isFeatureActive('bcp-alumni-directory') && (isParentActive('/admin/alumni') || isParentActive('/users/workspace/alumni'))" [class.feature-locked]="!isFeatureActive('bcp-alumni-directory')" (click)="onFeatureMenuClick('bcp-alumni-directory', getFeatureFullTitle('bcp-alumni-directory', 'Alumni Network & Directory'), $event, 'alumni')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">school</span>
                <span>{{ getFeatureMenuTitle('bcp-alumni-directory', 'Alumni Network') }}</span>
              </div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-alumni-directory') && !isFeatureActive('bcp-alumni-directory')" title="Available — Click to view details & install">
                <span class="material-symbols-outlined">lock</span>
              </span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-alumni-directory')">{{ 'badge.soon' | translate }}</span>
              <span class="material-symbols-outlined arrow-icon" *ngIf="isFeatureActive('bcp-alumni-directory')">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isFeatureActive('bcp-alumni-directory') && isMenuOpen('alumni')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/admin/alumni" [class.active]="isCurrentRoute('/admin/alumni')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>{{ 'adm.alumni_dashboard' | translate:'Alumni Dashboard' }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/admin/alumni')" (click)="togglePin('Alumni Dashboard', '/admin/alumni', 'space_dashboard')" [title]="isPinned('/admin/alumni') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/admin/alumni') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/admin/alumni/cohorts" [class.active]="isCurrentRoute('/admin/alumni/cohorts')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">calendar_month</span>{{ 'adm.manage_alumni_cohorts' | translate:'Manage Alumni & Cohorts' }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/admin/alumni/cohorts')" (click)="togglePin('Alumni Cohorts', '/admin/alumni/cohorts', 'calendar_month')" [title]="isPinned('/admin/alumni/cohorts') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/admin/alumni/cohorts') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-whistleblowing'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-whistleblowing')" (click)="onFeatureMenuClick('bcp-whistleblowing', getFeatureFullTitle('bcp-whistleblowing', 'Anonymous Whistleblowing & Feedback'), $event)">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">feedback</span>
                <span>{{ getFeatureMenuTitle('bcp-whistleblowing', 'Whistleblowing') }}</span>
              </div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-whistleblowing') && !isFeatureActive('bcp-whistleblowing')" title="Available — Click to view details & install">
                <span class="material-symbols-outlined">lock</span>
              </span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-whistleblowing')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item has-sub" [class.open]="isFeatureActive('bcp-staff-rota') && isMenuOpen('staff_rota')" *ngSwitchCase="'bcp-staff-rota'">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isFeatureActive('bcp-staff-rota') && isParentActive('/workforce/console')" [class.feature-locked]="!isFeatureActive('bcp-staff-rota')" (click)="onFeatureMenuClick('bcp-staff-rota', getFeatureFullTitle('bcp-staff-rota', 'Staff & Volunteer Rota Scheduling'), $event, 'staff_rota')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">event_note</span>
                <span>{{ getFeatureMenuTitle('bcp-staff-rota', 'Staff Rota & Shifts') }}</span>
              </div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-staff-rota') && !isFeatureActive('bcp-staff-rota')" title="Available — Click to view details & install">
                <span class="material-symbols-outlined">lock</span>
              </span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-staff-rota')">{{ 'badge.soon' | translate }}</span>
              <span class="material-symbols-outlined arrow-icon" *ngIf="isFeatureActive('bcp-staff-rota')">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isFeatureActive('bcp-staff-rota') && isMenuOpen('staff_rota')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/workforce/console/schedule" [class.active]="isCurrentRoute('/workforce/console/schedule')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">calendar_month</span>Rota Calendar</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/workforce/console/schedule')" (click)="togglePin('Rota Calendar', '/workforce/console/schedule', 'calendar_month')" [title]="isPinned('/workforce/console/schedule') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/workforce/console/schedule') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/workforce/console/sites" [class.active]="isCurrentRoute('/workforce/console/sites')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">location_on</span>Client Sites &amp; Geofences</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/workforce/console/sites')" (click)="togglePin('Client Sites', '/workforce/console/sites', 'location_on')" [title]="isPinned('/workforce/console/sites') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/workforce/console/sites') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item has-sub" [class.open]="isFeatureActive('bcp-attendance-tracking') && isMenuOpen('attendance_tracking')" *ngSwitchCase="'bcp-attendance-tracking'">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isFeatureActive('bcp-attendance-tracking') && isParentActive('/attendance/console')" [class.feature-locked]="!isFeatureActive('bcp-attendance-tracking')" (click)="onFeatureMenuClick('bcp-attendance-tracking', getFeatureFullTitle('bcp-attendance-tracking', 'Biometric & QR Attendance Tracking'), $event, 'attendance_tracking')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">timer</span>
                <span>{{ getFeatureMenuTitle('bcp-attendance-tracking', 'Attendance & Live Duty') }}</span>
              </div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-attendance-tracking') && !isFeatureActive('bcp-attendance-tracking')" title="Available — Click to view details & install">
                <span class="material-symbols-outlined">lock</span>
              </span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-attendance-tracking')">{{ 'badge.soon' | translate }}</span>
              <span class="material-symbols-outlined arrow-icon" *ngIf="isFeatureActive('bcp-attendance-tracking')">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isFeatureActive('bcp-attendance-tracking') && isMenuOpen('attendance_tracking')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/attendance/console/live" [class.active]="isCurrentRoute('/attendance/console/live')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">radar</span>Live Duty Monitor</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/attendance/console/live')" (click)="togglePin('Live Duty Monitor', '/attendance/console/live', 'radar')" [title]="isPinned('/attendance/console/live') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/attendance/console/live') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-appointment-booking'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-appointment-booking')" (click)="onFeatureMenuClick('bcp-appointment-booking', getFeatureFullTitle('bcp-appointment-booking', 'Appointment & Facility Booking'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">book_online</span><span>{{ getFeatureMenuTitle('bcp-appointment-booking', 'Appointment Booking') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-appointment-booking') && !isFeatureActive('bcp-appointment-booking')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-appointment-booking')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-calendar-followups'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-calendar-followups')" (click)="onFeatureMenuClick('bcp-calendar-followups', getFeatureFullTitle('bcp-calendar-followups', 'Calendar & Automated Follow-Up Routine'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">event_repeat</span><span>{{ getFeatureMenuTitle('bcp-calendar-followups', 'Calendar & Follow-Ups') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-calendar-followups') && !isFeatureActive('bcp-calendar-followups')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-calendar-followups')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-interval-reporting'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-interval-reporting')" (click)="onFeatureMenuClick('bcp-interval-reporting', getFeatureFullTitle('bcp-interval-reporting', 'Interval & Periodic Reporting'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">assessment</span><span>{{ getFeatureMenuTitle('bcp-interval-reporting', 'Periodic Reports') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-interval-reporting') && !isFeatureActive('bcp-interval-reporting')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-interval-reporting')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item has-sub" [class.open]="isFeatureActive('bcp-form-builder') && isMenuOpen('forms')" *ngSwitchCase="'bcp-form-builder'">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isFeatureActive('bcp-form-builder') && isCurrentRoute('/content/console/forms')" [class.feature-locked]="!isFeatureActive('bcp-form-builder')" (click)="onFeatureMenuClick('bcp-form-builder', getFeatureFullTitle('bcp-form-builder', 'Custom Dynamic Form Builder'), $event, 'forms')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">dynamic_form</span>
                <span>{{ getFeatureMenuTitle('bcp-form-builder', 'Forms & Surveys') }}</span>
              </div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-form-builder') && !isFeatureActive('bcp-form-builder')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-form-builder')">{{ 'badge.soon' | translate }}</span>
              <span class="material-symbols-outlined arrow-icon" *ngIf="isFeatureActive('bcp-form-builder')">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isFeatureActive('bcp-form-builder') && isMenuOpen('forms')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/forms" [class.active]="isCurrentRoute('/content/console/forms')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>{{ 'adm.forms_dashboard' | translate:'Forms Dashboard' }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/forms')" (click)="togglePin('Forms Dashboard', '/content/console/forms', 'dynamic_form')" [title]="isPinned('/content/console/forms') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console/forms') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/forms" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">edit_note</span>{{ 'adm.form_builder_responses' | translate:'Form Builder & Responses' }}</span>
                  </a>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-survey-analytics'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-survey-analytics')" (click)="onFeatureMenuClick('bcp-survey-analytics', getFeatureFullTitle('bcp-survey-analytics', 'Survey & Opinion Poll Analytics'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">poll</span><span>{{ getFeatureMenuTitle('bcp-survey-analytics', 'Opinion Polls') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-survey-analytics') && !isFeatureActive('bcp-survey-analytics')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-survey-analytics')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-reference-forms'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-reference-forms')" (click)="onFeatureMenuClick('bcp-reference-forms', getFeatureFullTitle('bcp-reference-forms', 'Reference Form & Referee Verification'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">fact_check</span><span>{{ getFeatureMenuTitle('bcp-reference-forms', 'Reference Forms') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-reference-forms') && !isFeatureActive('bcp-reference-forms')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-reference-forms')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-event-ticketing'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-event-ticketing')" (click)="onFeatureMenuClick('bcp-event-ticketing', getFeatureFullTitle('bcp-event-ticketing', 'Event Registration & Ticketing'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">confirmation_number</span><span>{{ getFeatureMenuTitle('bcp-event-ticketing', 'Events & Passes') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-event-ticketing') && !isFeatureActive('bcp-event-ticketing')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-event-ticketing')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-speaker-sessions'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-speaker-sessions')" (click)="onFeatureMenuClick('bcp-speaker-sessions', getFeatureFullTitle('bcp-speaker-sessions', 'Speaker & Session Lineup Management'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">mic</span><span>{{ getFeatureMenuTitle('bcp-speaker-sessions', 'Speaker & Sessions') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-speaker-sessions') && !isFeatureActive('bcp-speaker-sessions')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-speaker-sessions')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-attendee-management'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-attendee-management')" (click)="onFeatureMenuClick('bcp-attendee-management', getFeatureFullTitle('bcp-attendee-management', 'Attendee Badges & Check-In Kiosk'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">how_to_reg</span><span>{{ getFeatureMenuTitle('bcp-attendee-management', 'Attendee Check-In') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-attendee-management') && !isFeatureActive('bcp-attendee-management')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-attendee-management')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-invoicing-dues'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-invoicing-dues')" (click)="onFeatureMenuClick('bcp-invoicing-dues', getFeatureFullTitle('bcp-invoicing-dues', 'Membership Dues & Recurring Invoicing'), $event)">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">account_balance_wallet</span>
                <span>{{ getFeatureMenuTitle('bcp-invoicing-dues', 'Invoicing & Dues') }}</span>
              </div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-invoicing-dues') && !isFeatureActive('bcp-invoicing-dues')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-invoicing-dues')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item has-sub" [class.open]="isFeatureActive('bcp-store-ecommerce') && isMenuOpen('commerce')" *ngSwitchCase="'bcp-store-ecommerce'">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isFeatureActive('bcp-store-ecommerce') && isParentActive('/products/console')" [class.feature-locked]="!isFeatureActive('bcp-store-ecommerce')" (click)="onFeatureMenuClick('bcp-store-ecommerce', getFeatureFullTitle('bcp-store-ecommerce', 'Store & E-Commerce Catalog'), $event, 'commerce')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">storefront</span>
                <span>{{ getFeatureMenuTitle('bcp-store-ecommerce', 'Commerce Studio') }}</span>
                <span class="badge-pill badge-new" *ngIf="isFeatureActive('bcp-store-ecommerce')">{{ 'adm.new' | translate:'New' }}</span>
              </div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-store-ecommerce') && !isFeatureActive('bcp-store-ecommerce')" title="Available — Click to view details & install">
                <span class="material-symbols-outlined">lock</span>
              </span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-store-ecommerce')">{{ 'badge.soon' | translate }}</span>
              <span class="material-symbols-outlined arrow-icon" *ngIf="isFeatureActive('bcp-store-ecommerce')">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isFeatureActive('bcp-store-ecommerce') && isMenuOpen('commerce')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/products/console" [class.active]="isCurrentRoute('/products/console')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>{{ 'adm.store_dashboard' | translate:'Store Dashboard' }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/products/console')" (click)="togglePin('Store Dashboard', '/products/console', 'space_dashboard')" [title]="isPinned('/products/console') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/products/console') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/products/console" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">inventory_2</span>{{ 'nav.products_catalog' | translate }}</span>
                  </a>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/products/console/categories" [class.active]="isParentActive('/products/console/categories')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">category</span>{{ 'adm.product_categories' | translate:'Product Categories' }}</span>
                  </a>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/products/console/orders" [class.active]="isCurrentRoute('/products/console/orders')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">local_shipping</span>{{ 'adm.customer_orders_fulfillment' | translate:'Customer Orders & Fulfillment' }}</span>
                  </a>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/products/console/transactions" [class.active]="isCurrentRoute('/products/console/transactions')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">receipt_long</span>{{ 'adm.financial_settlement_ledger' | translate:'Financial Settlement Ledger' }}</span>
                  </a>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/store" target="_blank" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">open_in_new</span>Live Storefront ↗</span>
                  </a>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-proposal-pipeline'">
            <a [routerLink]="isFeatureActive('bcp-proposal-pipeline') ? '/products/console/transactions' : null" href="javascript:void(0)" [class.active]="isFeatureActive('bcp-proposal-pipeline') && isCurrentRoute('/products/console/transactions')" [class.feature-locked]="!isFeatureActive('bcp-proposal-pipeline')" (click)="onFeatureMenuClick('bcp-proposal-pipeline', getFeatureFullTitle('bcp-proposal-pipeline', 'Commercial Proposals & Bidding Pipeline'), $event)" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">request_quote</span>
                <span>{{ getFeatureMenuTitle('bcp-proposal-pipeline', 'Proposals & Pipeline') }}</span>
              </div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-proposal-pipeline') && !isFeatureActive('bcp-proposal-pipeline')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-proposal-pipeline')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-grant-ledger'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-grant-ledger')" (click)="onFeatureMenuClick('bcp-grant-ledger', getFeatureFullTitle('bcp-grant-ledger', 'Grants, Donations & Fund Accounting'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">volunteer_activism</span><span>{{ getFeatureMenuTitle('bcp-grant-ledger', 'Grants & Donations') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-grant-ledger') && !isFeatureActive('bcp-grant-ledger')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-grant-ledger')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-embedded-banking'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-embedded-banking')" (click)="onFeatureMenuClick('bcp-embedded-banking', getFeatureFullTitle('bcp-embedded-banking', 'Virtual Wallets & Payout Treasury'), $event)">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">account_balance</span>
                <span>{{ getFeatureMenuTitle('bcp-embedded-banking', 'Wallets & Treasury') }}</span>
              </div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-embedded-banking') && !isFeatureActive('bcp-embedded-banking')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-embedded-banking')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>

          <div class="nav-item" *ngSwitchCase="'bcp-recruitment-hiring'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-recruitment-hiring')" (click)="onFeatureMenuClick('bcp-recruitment-hiring', getFeatureFullTitle('bcp-recruitment-hiring', 'Applicant Tracking & Talent Recruitment'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">work</span><span>{{ getFeatureMenuTitle('bcp-recruitment-hiring', 'Recruitment & Hiring') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-recruitment-hiring') && !isFeatureActive('bcp-recruitment-hiring')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-recruitment-hiring')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-elections-evoting'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-elections-evoting')" (click)="onFeatureMenuClick('bcp-elections-evoting', getFeatureFullTitle('bcp-elections-evoting', 'Secure E-Voting & Elections Center'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">how_to_vote</span><span>{{ getFeatureMenuTitle('bcp-elections-evoting', 'E-Voting & Elections') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-elections-evoting') && !isFeatureActive('bcp-elections-evoting')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-elections-evoting')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-equipment-fleet'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-equipment-fleet')" (click)="onFeatureMenuClick('bcp-equipment-fleet', getFeatureFullTitle('bcp-equipment-fleet', 'Equipment & Vehicle Logistics'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">local_shipping</span><span>{{ getFeatureMenuTitle('bcp-equipment-fleet', 'Equipment Logistics') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-equipment-fleet') && !isFeatureActive('bcp-equipment-fleet')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-equipment-fleet')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-company-assets'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-company-assets')" (click)="onFeatureMenuClick('bcp-company-assets', getFeatureFullTitle('bcp-company-assets', 'IT & Fixed Asset Inventory Register'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">inventory_2</span><span>{{ getFeatureMenuTitle('bcp-company-assets', 'Asset Inventory') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-company-assets') && !isFeatureActive('bcp-company-assets')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-company-assets')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-project-tasks'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-project-tasks')" (click)="onFeatureMenuClick('bcp-project-tasks', getFeatureFullTitle('bcp-project-tasks', 'Project Kanban & Milestone Tracker'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">view_kanban</span><span>{{ getFeatureMenuTitle('bcp-project-tasks', 'Projects & Tasks') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-project-tasks') && !isFeatureActive('bcp-project-tasks')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-project-tasks')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-ai-smart-assist'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-ai-smart-assist')" (click)="onFeatureMenuClick('bcp-ai-smart-assist', getFeatureFullTitle('bcp-ai-smart-assist', 'AI Smart Assist & Workflows'), $event)">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">smart_toy</span>
                <span>{{ getFeatureMenuTitle('bcp-ai-smart-assist', 'AI Smart Assist') }}</span>
              </div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-ai-smart-assist') && !isFeatureActive('bcp-ai-smart-assist')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-ai-smart-assist')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item has-sub" [class.open]="isFeatureActive('bcp-mass-communication') && isMenuOpen('notifications')" *ngSwitchCase="'bcp-mass-communication'">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isFeatureActive('bcp-mass-communication') && isCurrentRoute('/users/console/notifications')" [class.feature-locked]="!isFeatureActive('bcp-mass-communication')" (click)="onFeatureMenuClick('bcp-mass-communication', getFeatureFullTitle('bcp-mass-communication', 'Mass Multi-Channel SMS & Email'), $event, 'notifications')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">campaign</span>
                <span>{{ getFeatureMenuTitle('bcp-mass-communication', 'Notification Studio') }}</span>
              </div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-mass-communication') && !isFeatureActive('bcp-mass-communication')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-mass-communication')">{{ 'badge.soon' | translate }}</span>
              <span class="material-symbols-outlined arrow-icon" *ngIf="isFeatureActive('bcp-mass-communication')">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isFeatureActive('bcp-mass-communication') && isMenuOpen('notifications')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/console/notifications" [class.active]="isCurrentRoute('/users/console/notifications')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">analytics</span>{{ 'adm.broadcasts_dashboard' | translate:'Broadcasts Dashboard' }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/console/notifications')" (click)="togglePin('Notification Studio', '/users/console/notifications', 'campaign')" [title]="isPinned('/users/console/notifications') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/console/notifications') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/console/notifications" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">send</span>{{ 'adm.compose_broadcast' | translate:'Compose Broadcast' }}</span>
                  </a>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-helpdesk-support'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-helpdesk-support')" (click)="onFeatureMenuClick('bcp-helpdesk-support', getFeatureFullTitle('bcp-helpdesk-support', 'Helpdesk & Ticketing Support'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">support_agent</span><span>{{ getFeatureMenuTitle('bcp-helpdesk-support', 'Helpdesk Support') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-helpdesk-support') && !isFeatureActive('bcp-helpdesk-support')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-helpdesk-support')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-live-chat'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-live-chat')" (click)="onFeatureMenuClick('bcp-live-chat', getFeatureFullTitle('bcp-live-chat', 'Live Chat & Widget Messenger'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">forum</span><span>{{ getFeatureMenuTitle('bcp-live-chat', 'Live Chat Widget') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-live-chat') && !isFeatureActive('bcp-live-chat')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-live-chat')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-social-media'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-social-media')" (click)="onFeatureMenuClick('bcp-social-media', getFeatureFullTitle('bcp-social-media', 'Social Media Publisher & Queue'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">share</span><span>{{ getFeatureMenuTitle('bcp-social-media', 'Social Publisher') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-social-media') && !isFeatureActive('bcp-social-media')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-social-media')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-bio-link'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-bio-link')" (click)="onFeatureMenuClick('bcp-bio-link', getFeatureFullTitle('bcp-bio-link', 'Bio Link Hub & Public Microsite'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">link</span><span>{{ getFeatureMenuTitle('bcp-bio-link', 'Bio Link Hub') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-bio-link') && !isFeatureActive('bcp-bio-link')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-bio-link')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-gocall-ai'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-gocall-ai')" (click)="onFeatureMenuClick('bcp-gocall-ai', getFeatureFullTitle('bcp-gocall-ai', 'Voice & Video Conferencing Rooms'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">video_call</span><span>{{ getFeatureMenuTitle('bcp-gocall-ai', 'Video Conferencing') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-gocall-ai') && !isFeatureActive('bcp-gocall-ai')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-gocall-ai')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>

          <div class="nav-item" *ngSwitchCase="'bcp-document-management'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-document-management')" (click)="onFeatureMenuClick('bcp-document-management', getFeatureFullTitle('bcp-document-management', 'Document Vault & Revision Control'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">folder_zip</span><span>{{ getFeatureMenuTitle('bcp-document-management', 'Document Vault') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-document-management') && !isFeatureActive('bcp-document-management')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-document-management')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-learning-management'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-learning-management')" (click)="onFeatureMenuClick('bcp-learning-management', getFeatureFullTitle('bcp-learning-management', 'Learning Management & Course LMS'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">school</span><span>{{ getFeatureMenuTitle('bcp-learning-management', 'LMS & Courses') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-learning-management') && !isFeatureActive('bcp-learning-management')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-learning-management')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-certificate-verification'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-certificate-verification')" (click)="onFeatureMenuClick('bcp-certificate-verification', getFeatureFullTitle('bcp-certificate-verification', 'Certificate Issuance & Verification'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">verified</span><span>{{ getFeatureMenuTitle('bcp-certificate-verification', 'Certificates') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-certificate-verification') && !isFeatureActive('bcp-certificate-verification')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-certificate-verification')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-visitor-gate'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-visitor-gate')" (click)="onFeatureMenuClick('bcp-visitor-gate', getFeatureFullTitle('bcp-visitor-gate', 'Visitor & Gate Pass Management'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">door_front</span><span>{{ getFeatureMenuTitle('bcp-visitor-gate', 'Visitor Gate Passes') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-visitor-gate') && !isFeatureActive('bcp-visitor-gate')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-visitor-gate')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-kyc-verification'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-kyc-verification')" (click)="onFeatureMenuClick('bcp-kyc-verification', getFeatureFullTitle('bcp-kyc-verification', 'Identity KYC & Background Vetting'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">badge</span><span>{{ getFeatureMenuTitle('bcp-kyc-verification', 'KYC Verification') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-kyc-verification') && !isFeatureActive('bcp-kyc-verification')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-kyc-verification')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-community-census'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-community-census')" (click)="onFeatureMenuClick('bcp-community-census', getFeatureFullTitle('bcp-community-census', 'Household & Community Census Registry'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">map</span><span>{{ getFeatureMenuTitle('bcp-community-census', 'Community Census') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-community-census') && !isFeatureActive('bcp-community-census')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-community-census')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-field-surveyor'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-field-surveyor')" (click)="onFeatureMenuClick('bcp-field-surveyor', getFeatureFullTitle('bcp-field-surveyor', 'Offline Field Enumeration App'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">explore</span><span>{{ getFeatureMenuTitle('bcp-field-surveyor', 'Field Surveyor') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-field-surveyor') && !isFeatureActive('bcp-field-surveyor')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-field-surveyor')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-resident-id-cards'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-resident-id-cards')" (click)="onFeatureMenuClick('bcp-resident-id-cards', getFeatureFullTitle('bcp-resident-id-cards', 'Digital & Printable Member ID Cards'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">badge</span><span>{{ getFeatureMenuTitle('bcp-resident-id-cards', 'Digital Member IDs') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-resident-id-cards') && !isFeatureActive('bcp-resident-id-cards')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-resident-id-cards')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-demographic-analytics'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-demographic-analytics')" (click)="onFeatureMenuClick('bcp-demographic-analytics', getFeatureFullTitle('bcp-demographic-analytics', 'Demographic & Population Intelligence'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">query_stats</span><span>{{ getFeatureMenuTitle('bcp-demographic-analytics', 'Population Analytics') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-demographic-analytics') && !isFeatureActive('bcp-demographic-analytics')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-demographic-analytics')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-digital-memorials'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-digital-memorials')" (click)="onFeatureMenuClick('bcp-digital-memorials', getFeatureFullTitle('bcp-digital-memorials', 'Digital Memorials & Funeral Tributes'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">local_fire_department</span><span>{{ getFeatureMenuTitle('bcp-digital-memorials', 'Digital Memorials') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-digital-memorials') && !isFeatureActive('bcp-digital-memorials')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-digital-memorials')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-wedding-portals'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-wedding-portals')" (click)="onFeatureMenuClick('bcp-wedding-portals', getFeatureFullTitle('bcp-wedding-portals', 'Weddings & Celebration Portals'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">celebration</span><span>{{ getFeatureMenuTitle('bcp-wedding-portals', 'Wedding Portals') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-wedding-portals') && !isFeatureActive('bcp-wedding-portals')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-wedding-portals')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-digital-brochures'">
            <a href="javascript:void(0)" class="nav-link" [class.feature-locked]="!isFeatureActive('bcp-digital-brochures')" (click)="onFeatureMenuClick('bcp-digital-brochures', getFeatureFullTitle('bcp-digital-brochures', 'Digital Brochures & Magazine Publishing'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">auto_stories</span><span>{{ getFeatureMenuTitle('bcp-digital-brochures', 'Digital Brochures') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-digital-brochures') && !isFeatureActive('bcp-digital-brochures')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-digital-brochures')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
          <div class="nav-item" *ngSwitchCase="'bcp-workspace'">
            <a [routerLink]="isFeatureActive('bcp-workspace') ? '/workspace/stations' : null" href="javascript:void(0)" class="nav-link" [class.active]="isFeatureActive('bcp-workspace') && (isCurrentRoute('/workspace/stations') || isCurrentRoute('/admin/workspace/stations'))" [class.feature-locked]="!isFeatureActive('bcp-workspace')" (click)="onFeatureMenuClick('bcp-workspace', getFeatureFullTitle('bcp-workspace', 'Workspace (Desktop only)'), $event)">
              <div class="nav-link-content"><span class="material-symbols-outlined">desktop_windows</span><span>{{ getFeatureMenuTitle('bcp-workspace', 'Workspace (Desktop only)') }}</span></div>
              <span class="feature-lock-pill" *ngIf="isFeatureAvailable('bcp-workspace') && !isFeatureActive('bcp-workspace')"><span class="material-symbols-outlined">lock</span></span>
              <span class="badge-pill badge-soon" *ngIf="!isFeatureAvailable('bcp-workspace')">{{ 'badge.soon' | translate }}</span>
            </a>
          </div>
                </ng-container>
              </ng-container>
            </ng-container>
          </ng-container>

          <!-- Suite 13: Billing & Subscriptions (Fixed System Menu at Bottom) -->
          <ng-container *ngIf="canAccessSuite('billing_subscriptions')">
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.billing_subscriptions' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('billing_subscriptions', $event)" [title]="'adm.billing_subscriptions_overview' | translate:'Billing & Subscriptions Overview'">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item">
            <a routerLink="/billing/features" [class.active]="isCurrentRoute('/billing/features') || isCurrentRoute('/billing/plans') || isCurrentRoute('/billing/console')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">extension</span>
                <span>{{ 'adm.subscription_plans' | translate:'Features & Capabilities' }}</span>
                <span class="badge-pill badge-hot">{{ 'adm.live' | translate:'Live' }}</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/billing/features')" (click)="togglePin('Features & Capabilities', '/billing/features', 'extension'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/billing/features') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/billing/features') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/billing/subscriptions" [class.active]="isCurrentRoute('/billing/subscriptions') || isCurrentRoute('/billing/invoices')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">receipt_long</span>
                <span>{{ 'adm.invoices_receipts' | translate:'Subscriptions & Invoices' }}</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/billing/subscriptions')" (click)="togglePin('Subscriptions & Invoices', '/billing/subscriptions', 'receipt_long'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/billing/subscriptions') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/billing/subscriptions') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
          </ng-container>

          <!-- Suite 14: Security & Audit (Platform Protection) -->
          <ng-container *ngIf="canAccessSuite('security_audit')">
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.security_audit' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('security_audit', $event)" [title]="'adm.security_audit_overview' | translate:'Security & Audit Overview'">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item">
            <a routerLink="/identity/console/audit-logs" [class.active]="isCurrentRoute('/identity/console/audit-logs')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">security</span>
                <span>{{ 'nav.security_audit' | translate }}</span>
                <span class="badge-pill badge-hot">{{ 'adm.live' | translate:'Live' }}</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/audit-logs')" (click)="togglePin('Security Logs', '/identity/console/audit-logs', 'security'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/identity/console/audit-logs') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/identity/console/audit-logs') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/identity/console/error-codes" [class.active]="isCurrentRoute('/identity/console/error-codes')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">menu_book</span>
                <span>{{ 'nav.error_codes' | translate:'Error Codes' }}</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/error-codes')" (click)="togglePin('Error Codes', '/identity/console/error-codes', 'menu_book'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/identity/console/error-codes') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/identity/console/error-codes') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
          </ng-container>
        </ng-container>

        <!-- ============================================== -->
        <!-- MEMBER WORKSPACE SIDEBAR (when !isConsoleActive)-->
        <!-- ============================================== -->
        <ng-container *ngIf="!isConsoleActive">
          <div class="menu-title">{{ 'suite.member_workspace' | translate }}</div>

          <!-- 1. Workspace Dashboard -->
          <div class="nav-item">
            <a routerLink="/dashboard/workspace" [class.active]="isCurrentRoute('/dashboard/workspace') || isCurrentRoute('/users/workspace/dashboard')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">space_dashboard</span>
                <span>{{ 'nav.workspace_home' | translate }}</span>
              </div>
            </a>
          </div>

          <!-- 2. Committees & Sub-Groups Member Workspace (bcp-committees) -->
          <!-- Placed before Manage My Account per Canonical Navigation Hierarchy -->
          <div class="nav-item has-sub" [class.open]="isMenuOpen('workspace_committees')" *ngIf="isFeatureActive('bcp-committees')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/committees/workspace') || isParentActive('/groups/workspace')" (click)="toggleMenu('workspace_committees')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">diversity_3</span>
                <span>{{ committeeAliases.aliasPlural }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('workspace_committees')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/committees/workspace/my" [class.active]="isCurrentRoute('/committees/workspace/my')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">groups</span>My {{ committeeAliases.aliasPlural }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/committees/workspace/my')" (click)="togglePin('My ' + committeeAliases.aliasPlural, '/committees/workspace/my', 'groups')" [title]="isPinned('/committees/workspace/my') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/committees/workspace/my') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/committees/workspace/discover" [class.active]="isCurrentRoute('/committees/workspace/discover')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">explore</span>Browse &amp; Join</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/committees/workspace/discover')" (click)="togglePin('Browse & Join', '/committees/workspace/discover', 'explore')" [title]="isPinned('/committees/workspace/discover') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/committees/workspace/discover') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/committees/workspace/reports/compose" [class.active]="isCurrentRoute('/committees/workspace/reports/compose')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">edit_document</span>Compose Meeting Report</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/committees/workspace/reports/compose')" (click)="togglePin('Compose Meeting Report', '/committees/workspace/reports/compose', 'edit_document')" [title]="isPinned('/committees/workspace/reports/compose') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/committees/workspace/reports/compose') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/committees/workspace/cloud-links" [class.active]="isCurrentRoute('/committees/workspace/cloud-links')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">cloud_done</span>Connected Cloud Docs</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/committees/workspace/cloud-links')" (click)="togglePin('Connected Cloud Docs', '/committees/workspace/cloud-links', 'cloud_done')" [title]="isPinned('/committees/workspace/cloud-links') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/committees/workspace/cloud-links') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <!-- 3. Workforce Rota & Shift Management Member Workspace (bcp-staff-rota) -->
          <div class="nav-item has-sub" [class.open]="isMenuOpen('workspace_workforce')" *ngIf="isFeatureActive('bcp-staff-rota')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/workforce/workspace')" (click)="toggleMenu('workspace_workforce')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">event_note</span>
                <span>My Shifts &amp; Rota</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('workspace_workforce')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/workforce/workspace/my-shifts" [class.active]="isCurrentRoute('/workforce/workspace/my-shifts')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">calendar_month</span>My Assigned Shifts</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/workforce/workspace/my-shifts')" (click)="togglePin('My Assigned Shifts', '/workforce/workspace/my-shifts', 'calendar_month')" [title]="isPinned('/workforce/workspace/my-shifts') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/workforce/workspace/my-shifts') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <!-- 4. Attendance & Duty Clock-In Member Workspace (bcp-attendance-tracking) -->
          <div class="nav-item has-sub" [class.open]="isMenuOpen('workspace_attendance')" *ngIf="isFeatureActive('bcp-attendance-tracking')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/attendance/workspace')" (click)="toggleMenu('workspace_attendance')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">timer</span>
                <span>Duty Clock &amp; GPS</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('workspace_attendance')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/attendance/workspace/clock" [class.active]="isCurrentRoute('/attendance/workspace/clock')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">timer</span>Live Shift Clock-In</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/attendance/workspace/clock')" (click)="togglePin('Live Shift Clock-In', '/attendance/workspace/clock', 'timer')" [title]="isPinned('/attendance/workspace/clock') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/attendance/workspace/clock') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <!-- 5. Manage My Account Dropdown -->
          <div class="nav-item has-sub" [class.open]="isMenuOpen('workspace_account')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/users/workspace/account') || isParentActive('/identity/console/account') || isParentActive('/users/workspace/profile')" (click)="toggleMenu('workspace_account')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">manage_accounts</span>
                <span>{{ 'nav.manage_my_account' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('workspace_account')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/workspace/profile" [class.active]="isCurrentRoute('/users/workspace/profile')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">account_circle</span>{{ 'nav.my_account' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/workspace/profile')" (click)="togglePin('My Account', '/users/workspace/profile', 'account_circle')" [title]="isPinned('/users/workspace/profile') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/workspace/profile') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/workspace/account" [queryParams]="{ tab: 'password' }" [class.active]="isCurrentRouteWithQuery('/users/workspace/account', 'password')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">key</span>{{ 'nav.change_password' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/workspace/account?tab=password')" (click)="togglePin('Change Password', '/users/workspace/account?tab=password', 'key')" [title]="isPinned('/users/workspace/account?tab=password') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/workspace/account?tab=password') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/workspace/account" [queryParams]="{ tab: '2fa' }" [class.active]="isCurrentRouteWithQuery('/users/workspace/account', '2fa')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">shield_lock</span>{{ 'nav.mfa_security' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/workspace/account?tab=2fa')" (click)="togglePin('2FA Security', '/users/workspace/account?tab=2fa', 'shield_lock')" [title]="isPinned('/users/workspace/account?tab=2fa') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/workspace/account?tab=2fa') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/workspace/account" [queryParams]="{ tab: 'devices' }" [class.active]="isCurrentRouteWithQuery('/users/workspace/account', 'devices')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">devices</span>{{ 'nav.manage_devices' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/workspace/account?tab=devices')" (click)="togglePin('Manage Devices', '/users/workspace/account?tab=devices', 'devices')" [title]="isPinned('/users/workspace/account?tab=devices') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/workspace/account?tab=devices') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/workspace/account" [queryParams]="{ tab: 'activity' }" [class.active]="isCurrentRouteWithQuery('/users/workspace/account', 'activity')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">history</span>{{ 'nav.login_history' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/workspace/account?tab=activity')" (click)="togglePin('Log Activity', '/users/workspace/account?tab=activity', 'history')" [title]="isPinned('/users/workspace/account?tab=activity') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/workspace/account?tab=activity') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </ng-container>
      </nav>

      <!-- Sidebar Docked Footer -->
      <div class="sidebar-footer">
        <div class="sidebar-footer-brand">
          <img [src]="brandIconUrl" [alt]="brandName" class="sidebar-footer-icon" *ngIf="brandIconUrl">
          <div>
            <div class="sidebar-footer-title">{{ brandAbbreviation || 'CC' }} Workspace</div>
            <div class="sidebar-footer-meta">{{ isAdmin ? 'Console v1.0.0' : 'Portal v1.0.0' }}</div>
          </div>
        </div>
        <div class="sidebar-footer-actions">
          <a href="javascript:void(0)" (click)="showHelpModal = true" [title]="'adm.help_support' | translate:'Help & Support'">
            <span class="material-symbols-outlined">help_outline</span>
            <span>{{ 'adm.help_support' | translate:'Help & Support' }}</span>
          </a>
        </div>
      </div>
    </aside>

    <!-- Mobile Sidebar Backdrop Overlay -->
    <div class="sidebar-mobile-backdrop" *ngIf="!sidebarCollapsed" (click)="closeSidebarMobile()"></div>

    <!-- Main Shell -->
    <main id="main-content" [class.sidebar-collapsed]="sidebarCollapsed">
      <!-- Standardized Topbar from Materialdesignui -->
      <header id="topbar">
        <div class="topbar-left">
          <a routerLink="/admin/dashboard" class="topbar-brand-logo" [title]="brandName" *ngIf="brandIconUrl">
            <img [src]="brandIconUrl" [alt]="brandName" class="topbar-brand-img">
          </a>
          <button type="button" class="topbar-action-btn" id="toggle-sidebar" (click)="toggleSidebar()" [title]="'adm.toggle_navigation' | translate:'Toggle Navigation'">
            <span class="material-symbols-outlined">menu</span>
          </button>
          <div class="topbar-search-box">
            <span class="material-symbols-outlined search-icon">search</span>
            <input type="text" [placeholder]="'shell.search_placeholder' | translate" [attr.aria-label]="'adm.search' | translate:'Search'">
          </div>
        </div>

        <div class="topbar-right">
          <!-- Multi-Workspace Switcher Dropdown Trigger -->
          <div class="workspace-switcher-wrapper" *ngIf="enrolledWorkspaces.length > 0">
            <button type="button" class="topbar-action-btn workspace-badge-btn" (click)="toggleDropdown('workspaces', $event)" [title]="'Current: ' + (brandName || tenantKey) + ' (Switch Organization)'">
              <span class="material-symbols-outlined">domain</span>
              <span class="workspace-short-pill" *ngIf="enrolledWorkspaces.length > 1">{{ enrolledWorkspaces.length }}</span>
            </button>
            <div class="workspace-switch-dropdown" *ngIf="activeDropdown === 'workspaces'">
              <div class="dropdown-header">
                <span>{{ 'adm.switch_organization' | translate:'Switch Organization' }}</span>
                <span class="badge-pill" style="background: #10b981;">{{ activeWorkspacesCount }} Active</span>
              </div>
              <div class="workspace-list">
                <div 
                  *ngFor="let ws of enrolledWorkspaces" 
                  class="workspace-item" 
                  [class.current]="ws.tenantKey.toLowerCase() === (tenantKey || '').toLowerCase()"
                  (click)="onSelectWorkspace(ws)"
                >
                  <div class="ws-item-avatar">
                    <img *ngIf="ws.brandIconUrl || ws.brandLogoUrl" [src]="ws.brandIconUrl || ws.brandLogoUrl" class="ws-avatar-img" />
                    <span *ngIf="!ws.brandIconUrl && !ws.brandLogoUrl" class="material-symbols-outlined">domain</span>
                  </div>
                  <div class="ws-item-info">
                    <div class="ws-item-name">{{ ws.organizationName || ws.tenantKey }}</div>
                    <div class="ws-item-sub">
                      <span *ngIf="ws.tenantKey.toLowerCase() === (tenantKey || '').toLowerCase()" class="ws-current-tag">{{ 'adm.current' | translate:'Current' }}</span>
                      <span *ngIf="ws.tenantKey.toLowerCase() !== (tenantKey || '').toLowerCase() && ws.authToken" class="ws-active-tag">● Logged In</span>
                      <span *ngIf="!ws.authToken" class="ws-signed-out-tag">{{ 'adm.signed_out' | translate:'Signed Out' }}</span>
                      <span class="ws-item-email" *ngIf="ws.userEmail">&bull; {{ ws.userEmail }}</span>
                    </div>
                  </div>
                  <div class="ws-item-action">
                    <span class="material-symbols-outlined" *ngIf="ws.tenantKey.toLowerCase() === (tenantKey || '').toLowerCase()">check</span>
                    <span class="material-symbols-outlined" *ngIf="ws.tenantKey.toLowerCase() !== (tenantKey || '').toLowerCase() && ws.authToken">swap_horiz</span>
                    <span class="material-symbols-outlined" *ngIf="!ws.authToken">login</span>
                  </div>
                </div>
              </div>
              <div class="dropdown-footer" style="padding: 8px 12px; border-top: 1px solid var(--md-sys-color-outline); display: flex; justify-content: space-between; align-items: center;">
                <a routerLink="/auth/login" (click)="closeDropdowns()" class="view-all-link" style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #0050e5; text-decoration: none; font-weight: 600;">
                  <span class="material-symbols-outlined" style="font-size: 16px;">add_business</span>
                  Connect Another Workspace
                </a>
              </div>
            </div>
          </div>

          <!-- Central Pattern Multi-Language Switcher Component -->
          <div class="oz-lang-switcher" id="ozLangSwitcher" (click)="$event.stopPropagation()">
            <button type="button" class="oz-lang-btn" (click)="toggleDropdown('language', $event)" [attr.aria-expanded]="activeDropdown === 'language'" [attr.aria-label]="'adm.select_language' | translate:'Select Language'" [title]="'Select Language (' + currentLangOption.name + ')'">
              <span class="oz-lang-flag">{{ currentLangOption.shortLabel }}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 1L5 5L9 1"/>
              </svg>
            </button>
            <div class="oz-lang-menu" *ngIf="activeDropdown === 'language'">
              <a href="javascript:void(0)" *ngFor="let opt of supportedLanguages" (click)="selectLanguage(opt.code); closeDropdowns()" class="oz-lang-item" [class.active]="currentLang === opt.code">
                <span class="oz-flag-icon">{{ opt.flag }}</span>
                <span class="oz-lang-name">{{ opt.nativeName }}</span>
                <span class="material-symbols-outlined check-icon" *ngIf="currentLang === opt.code">check</span>
              </a>
            </div>
          </div>

          <!-- 12-App Grid Launcher -->
          <div class="apps-grid-wrapper">
            <button type="button" class="topbar-action-btn" (click)="toggleDropdown('apps', $event)" [title]="'adm.apps_launcher' | translate:'Apps Launcher'">
              <span class="material-symbols-outlined">grid_view</span>
            </button>
            <div class="apps-grid-dropdown" *ngIf="activeDropdown === 'apps'">
              <div class="apps-grid-header">{{ 'adm.workspace_apps_features' | translate:'Workspace Apps & Features' }}</div>
              <div class="apps-grid-container">
                <a routerLink="/admin/dashboard" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#0050e5"><span class="material-symbols-outlined">space_dashboard</span></div>
                  <span>{{ 'adm.console' | translate:'Console' }}</span>
                </a>
                <a routerLink="/admin/content" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#1f6bff"><span class="material-symbols-outlined">dynamic_feed</span></div>
                  <span>{{ 'adm.cms_studio' | translate:'CMS Studio' }}</span>
                </a>
                <a routerLink="/admin/users" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#22c55e"><span class="material-symbols-outlined">groups</span></div>
                  <span>{{ 'adm.users' | translate:'Users' }}</span>
                </a>
                <a routerLink="/admin/identity" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#ef4444"><span class="material-symbols-outlined">admin_panel_settings</span></div>
                  <span>{{ 'adm.identity' | translate:'Identity' }}</span>
                </a>
                <a routerLink="/admin/groups" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#a855f7"><span class="material-symbols-outlined">forum</span></div>
                  <span>{{ 'adm.channels' | translate:'Channels' }}</span>
                </a>
                <a routerLink="/admin/settings" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#f59e0b"><span class="material-symbols-outlined">palette</span></div>
                  <span>{{ 'adm.brand' | translate:'Brand' }}</span>
                </a>
                <a routerLink="/" target="_blank" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#14b8a6"><span class="material-symbols-outlined">language</span></div>
                  <span>{{ 'adm.public_site' | translate:'Public Site' }}</span>
                </a>
                <a href="javascript:void(0)" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#64748b"><span class="material-symbols-outlined">summarize</span></div>
                  <span>{{ 'adm.reports' | translate:'Reports' }}</span>
                </a>
                <a href="javascript:void(0)" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#3b82f6"><span class="material-symbols-outlined">edit_document</span></div>
                  <span>{{ 'adm.forms' | translate:'Forms' }}</span>
                </a>
                <a href="javascript:void(0)" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#ca8a04"><span class="material-symbols-outlined">payments</span></div>
                  <span>{{ 'adm.financials' | translate:'Financials' }}</span>
                </a>
                <a href="javascript:void(0)" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#8b5cf6"><span class="material-symbols-outlined">calendar_month</span></div>
                  <span>{{ 'adm.events' | translate:'Events' }}</span>
                </a>
                <a routerLink="/admin/settings" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#0f172a"><span class="material-symbols-outlined">settings</span></div>
                  <span>Settings</span>
                </a>
              </div>
            </div>
          </div>

          <!-- Calendar Popover -->
          <div class="calendar-wrapper">
            <button type="button" class="topbar-action-btn" (click)="toggleDropdown('calendar', $event)" [title]="'adm.calendar' | translate:'Calendar'">
              <span class="material-symbols-outlined">calendar_today</span>
            </button>
            <div class="calendar-dropdown-menu" *ngIf="activeDropdown === 'calendar'">
              <div class="calendar-header">
                <span class="calendar-month-title">August 2026</span>
                <div style="display:flex; gap:4px;">
                  <button type="button" class="calendar-nav-btn"><span class="material-symbols-outlined">chevron_left</span></button>
                  <button type="button" class="calendar-nav-btn"><span class="material-symbols-outlined">chevron_right</span></button>
                </div>
              </div>
              <div class="calendar-weekdays">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>
              <div class="calendar-days">
                <span class="prev-month">26</span><span class="prev-month">27</span><span class="prev-month">28</span><span class="prev-month">29</span><span class="prev-month">30</span><span class="prev-month">31</span><span>1</span>
                <span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
                <span>9</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span><span class="today">15</span>
                <span>16</span><span>17</span><span>18</span><span>19</span><span>20</span><span>21</span><span>22</span>
                <span>23</span><span>24</span><span>25</span><span>26</span><span>27</span><span>28</span><span>29</span>
                <span>30</span><span>31</span>
              </div>
            </div>
          </div>

          <!-- Help Trigger -->
          <button type="button" class="topbar-action-btn" (click)="showHelpModal = true" [title]="'adm.contextual_help' | translate:'Contextual Help'">
            <span class="material-symbols-outlined">help_outline</span>
          </button>

          <!-- Fullscreen Toggle -->
          <button type="button" class="topbar-action-btn" (click)="toggleFullscreen()" [title]="'adm.toggle_fullscreen' | translate:'Toggle Fullscreen'">
            <span class="material-symbols-outlined">fullscreen</span>
          </button>

          <!-- Theme Toggle (Light / Dark) -->
          <button type="button" class="topbar-action-btn" (click)="toggleTheme()" [title]="darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
            <span class="material-symbols-outlined">{{ darkMode ? 'light_mode' : 'dark_mode' }}</span>
          </button>

          <!-- Notifications Bell -->
          <div class="notifications-wrapper">
            <button type="button" class="topbar-action-btn notification-circle-btn" (click)="toggleDropdown('notifications', $event)" [title]="'adm.notifications' | translate:'Notifications'">
              <span class="material-symbols-outlined">notifications</span>
              <sup class="notif-badge-sup" *ngIf="unreadNotifCount > 0">{{ unreadNotifCount > 9 ? '9+' : unreadNotifCount }}</sup>
            </button>
            <div class="notifications-dropdown" *ngIf="activeDropdown === 'notifications'">
              <div class="dropdown-header">
                <span>{{ 'adm.system_notifications' | translate:'System Notifications' }}</span>
                <div class="dropdown-hdr-actions">
                  <button type="button" class="hdr-mini-btn" (click)="markAllNotificationsRead(); $event.stopPropagation();" [title]="'adm.mark_all_as_read' | translate:'Mark all as read'" *ngIf="unreadNotifCount > 0">
                    <span class="material-symbols-outlined">done_all</span>
                  </button>
                  <button type="button" class="hdr-mini-btn danger" (click)="clearAllNotifications(); $event.stopPropagation();" [title]="'adm.clear_all' | translate:'Clear all'">
                    <span class="material-symbols-outlined">delete_sweep</span>
                  </button>
                </div>
              </div>
              <div class="notifications-list">
                <div class="notification-item" *ngFor="let notif of notificationFeed" [class.unread]="!notif.isRead" (click)="handleNotificationClick(notif)">
                  <div class="notif-icon-circle" [ngClass]="getNotifColorClass(notif.module, notif.category)">
                    <span class="material-symbols-outlined">{{ notif.icon || 'notifications' }}</span>
                  </div>
                  <div class="notif-content">
                    <div class="notif-title">{{ notif.title }}</div>
                    <div class="notif-desc">{{ notif.message }}</div>
                    <div class="notif-time">{{ formatTimeAgo(notif.createdAt) }}</div>
                  </div>
                  <span class="unread-dot" *ngIf="!notif.isRead"></span>
                </div>
                <div class="notification-empty" *ngIf="!notificationFeed?.length">
                  <span class="material-symbols-outlined empty-icon">notifications_off</span>
                  <p>{{ 'adm.no_notifications' | translate:'No notifications' }}</p>
                </div>
              </div>
              <div class="dropdown-footer">
                <a [routerLink]="isAdmin ? '/users/console/notifications' : '/users/workspace/notifications'" (click)="closeDropdowns()" class="view-all-link">
                  View All Notifications →
                </a>
              </div>
            </div>
          </div>

          <!-- User Profile Dropdown -->
          <div class="user-profile-wrapper">
            <button type="button" class="user-profile-btn" (click)="toggleDropdown('profile', $event)">
              <div class="user-avatar-circle">
                <span>{{ userInitials }}</span>
              </div>
              <div class="user-profile-info">
                <span class="user-profile-name">{{ userFullName }}</span>
                <span class="user-profile-role">{{ userRoleBadge }}</span>
              </div>
            </button>
            <div class="user-profile-dropdown" *ngIf="activeDropdown === 'profile'">
              <div class="profile-dropdown-header">
                <strong>{{ userFullName }}</strong>
                <small>{{ userEmail }}</small>
                <div class="profile-badge-tag">{{ userRoleBadge }}</div>
              </div>
              <a href="javascript:void(0)" (click)="openPrivilegesModal(); closeDropdowns()" class="dropdown-item">
                <span class="material-symbols-outlined">verified_user</span>
                <span>{{ 'rbac.view_privileges' | translate }}</span>
              </a>
              <a href="javascript:void(0)" (click)="toggleConsoleMode(); closeDropdowns()" class="dropdown-item" *ngIf="isAdmin">
                <span class="material-symbols-outlined">{{ isConsoleActive ? 'badge' : 'admin_panel_settings' }}</span>
                <span>{{ isConsoleActive ? ('shell.switch_to_workspace' | translate) : ('shell.switch_to_console' | translate) }}</span>
              </a>
              <a routerLink="/users/workspace/profile" (click)="closeDropdowns()" class="dropdown-item">
                <span class="material-symbols-outlined">account_circle</span>
                <span>{{ 'nav.my_profile' | translate }}</span>
              </a>
              <a routerLink="/identity/console/account" (click)="closeDropdowns()" class="dropdown-item">
                <span class="material-symbols-outlined">manage_accounts</span>
                <span>{{ 'nav.manage_account' | translate }}</span>
              </a>
              <a routerLink="/admin/settings" (click)="closeDropdowns()" class="dropdown-item" *ngIf="isAdmin">
                <span class="material-symbols-outlined">settings</span>
                <span>{{ 'adm.workspace_settings' | translate:'Workspace Settings' }}</span>
              </a>
              <a routerLink="/products/console/queues" (click)="closeDropdowns()" class="dropdown-item" *ngIf="isAdmin">
                <span class="material-symbols-outlined">sync_alt</span>
                <span>{{ 'adm.queue_monitor' | translate:'Queue Monitor' }}</span>
              </a>
              <!-- Multi-Workspace Quick Switch in Profile Dropdown -->
              <ng-container *ngIf="otherActiveWorkspaces.length > 0">
                <div class="dropdown-divider"></div>
                <div class="profile-dropdown-section-title" style="padding: 6px 16px 4px; font-size: 10px; font-weight: 700; color: var(--sidebar-header-color); letter-spacing: 0.5px; text-transform: uppercase;">
                  Switch Workspace
                </div>
                <button 
                  type="button" 
                  *ngFor="let other of otherActiveWorkspaces" 
                  (click)="onSelectWorkspace(other)"
                  class="dropdown-item"
                  style="display: flex; align-items: center; justify-content: space-between;"
                >
                  <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                    <span class="material-symbols-outlined" style="color: #0050e5; font-size: 18px;">domain</span>
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 600;">
                      {{ other.organizationName || other.tenantKey }}
                    </span>
                  </div>
                  <span style="font-size: 9px; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; padding: 1px 5px; border-radius: 9999px;">
                    Active
                  </span>
                </button>
              </ng-container>
              <div class="dropdown-divider"></div>
              <button type="button" (click)="onLogout()" class="dropdown-item text-danger">
                <span class="material-symbols-outlined">logout</span>
                <span>{{ 'shell.sign_out' | translate }}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Central Feature Expiration Notice Banner (Strictly visible to BCC Admins in Admin Console, re-shows every 24h after dismissal) -->
      <div class="central-feature-expiration-banner" *ngIf="isAdmin && isConsoleActive && expiringFeatures.length > 0 && !isExpirationBannerDismissed" style="align-items: flex-start;">
        <div class="banner-content" style="flex: 1; min-width: 0; align-items: flex-start;">
          <span class="material-symbols-outlined banner-icon" style="margin-top: 2px;">warning</span>
          <div class="banner-text" style="display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="banner-title" style="font-weight: 800;">{{ 'billing.notice_title' | translate:'Subscription & Free Trial Renewal Notice:' }}</span>
              <span class=" banner-desc">{{ getExpirationBannerText() }}</span>
              <span *ngIf="getTotalExpirationAmountDue() > 0" style="display: inline-flex; align-items: center; gap: 4px; background: rgba(180, 83, 9, 0.14); color: #78350f; border: 1px solid rgba(180, 83, 9, 0.3); padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 800;">
                <span>{{ 'billing.total_due' | translate:'Total Amount to Pay:' }}</span>
                <span>{{ getExpirationCurrencySymbol() }}{{ getTotalExpirationAmountDue() | number:'1.2-2' }}</span>
              </span>
            </div>

            <!-- Consolidated Multi-Feature Itemized List (shown when 1 or more features are expiring within 30 days) -->
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px;">
              <span *ngFor="let f of expiringFeatures; let idx = index"
                    style="display: inline-flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.78); border: 1px solid rgba(217, 119, 6, 0.35); border-radius: 6px; padding: 3px 9px; font-size: 11.5px; color: #78350f; font-weight: 600;">
                <strong style="color: #451a03;">{{ idx + 1 }}. {{ (f.featureName || f.featureCode) | translate:(f.featureName || f.featureCode) }}</strong>
                <span style="padding: 1px 5px; border-radius: 4px; font-size: 10px; font-weight: 800; background: rgba(124, 58, 237, 0.12); color: #6d28d9;" *ngIf="f.isTrialPeriod">Free Trial</span>
                <span style="color: #b45309; font-weight: 700;">
                  ({{ (f.daysRemaining ?? 0) < 0 ? ((f.daysRemaining * -1) + 'd overdue') : ((f.daysRemaining ?? 0) === 0 ? 'Due today' : (f.daysRemaining + 'd left')) }})
                </span>
                <strong style="color: #0f172a;" *ngIf="(f.renewalPrice ?? 0) > 0">
                  &bull; {{ f.currencySymbol || getExpirationCurrencySymbol() }}{{ (f.renewalPrice || 0) | number:'1.2-2' }}
                </strong>
              </span>
            </div>
          </div>
        </div>
        <div class="banner-actions" style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
          <a routerLink="/billing/subscriptions" class="banner-btn">{{ 'billing.review_entitlements' | translate:'Review & Pay Now' }}</a>
          <button type="button"
                  (click)="dismissExpirationBanner()"
                  title="Close notice (will remind you again in 24 hours and remains in Notifications)"
                  style="background: rgba(180, 83, 9, 0.12); border: 1px solid rgba(180, 83, 9, 0.28); color: #78350f; width: 28px; height: 28px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;">
            <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
          </button>
        </div>
      </div>

      <!-- Page Content & AI Side-by-Side Split Workspace Container (70% Body / 30% AI) -->
      <div class="bcp-workspace-container" [class.is-workspace-mode]="!isConsoleActive" [class.ai-docked-bottom]="isAiOpen && aiLayoutMode === 'docked-bottom'" [class.ai-docked-right-active]="isAiOpen && aiLayoutMode === 'docked-right'">
        <div class="bcp-page-shell" [class.is-workspace-mode]="!isConsoleActive" [class.ai-split-70]="isAiOpen && aiLayoutMode === 'docked-right'" [class.ai-split-bottom]="isAiOpen && aiLayoutMode === 'docked-bottom'">
          <router-outlet></router-outlet>
        </div>

        <!-- Global AI Section Studio Assistant & Co-pilot (30% Width Docked Non-overlapping) -->
        <app-ai-assistant></app-ai-assistant>
      </div>
    </main>

    <!-- Contextual Help Modal -->
    <div class="modal-backdrop" *ngIf="showHelpModal" (click)="showHelpModal = false">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="material-symbols-outlined text-blue">help_outline</span>
            <h3>{{ 'adm.bcp_contextual_help_guide' | translate:'BCP Contextual Help & Guide' }}</h3>
          </div>
          <button (click)="showHelpModal = false" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <h4>{{ 'adm.welcome_to_ozikol_bcp_multi_tenant_workspace' | translate:'Welcome to Ozikol BCP Multi-Tenant Workspace' }}</h4>
          <p>{{ 'adm.this_system_allows_you_to_manage_members_col' | translate:'This system allows you to manage members, collaborative chat channels, dynamic database-driven website pages, and brand customizations.' }}</p>
          <ul>
            <li><strong>{{ 'adm.taskbar_tabs' | translate:'Taskbar Tabs:' }}</strong> {{ 'adm.as_you_navigate_pages_stay_open_as_browser_l' | translate:'As you navigate, pages stay open as browser-like tabs in the header for quick multitasking.' }}</li>
            <li><strong>{{ 'adm.pin_navigation' | translate:'Pin Navigation:' }}</strong> {{ 'adm.click_the_push_pin_icon_on_any_sidebar_item' | translate:'Click the push-pin icon on any sidebar item to pin it to your personal favorites bar.' }}</li>
            <li><strong>{{ 'adm.theme_engine' | translate:'Theme Engine:' }}</strong> {{ 'adm.toggle_between_the_crisp_light_theme_and_dar' | translate:'Toggle between the crisp Light Theme and Dark Mode at any time using the moon/sun icon in the topbar.' }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- User Privileges & Access Modal -->
    <div class="modal-backdrop" *ngIf="showPrivilegesModal" (click)="closePrivilegesModal()">
      <div class="modal-card privileges-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="material-symbols-outlined text-blue">verified_user</span>
            <div>
              <h3>{{ 'rbac.privileges_modal_title' | translate }}</h3>
              <p class="modal-subtitle">{{ userFullName }} &bull; <span class="role-highlight-badge">{{ userRoleBadge }}</span></p>
            </div>
          </div>
          <button (click)="closePrivilegesModal()" class="btn-close">&times;</button>
        </div>
        <div class="modal-body privileges-modal-body">
          <div class="privilege-section">
            <div class="privilege-section-title">
              <span class="material-symbols-outlined">badge</span>
              <span>{{ 'rbac.assigned_roles' | translate }}</span>
            </div>
            <div class="role-chips">
              <span class="role-chip" *ngFor="let role of userRoles">
                {{ role }}
              </span>
              <span class="role-chip" *ngIf="!userRoles?.length">
                {{ userRoleBadge }}
              </span>
            </div>
          </div>

          <div class="privilege-section">
            <div class="privilege-section-title">
              <span class="material-symbols-outlined">lock_open</span>
              <span>{{ 'rbac.unlocked_capabilities' | translate }}</span>
            </div>
            <ul class="capability-list">
              <li *ngFor="let cap of userCapabilities">
                <span class="material-symbols-outlined check-icon-cap">check_circle</span>
                <span>{{ cap }}</span>
              </li>
            </ul>
          </div>

          <div class="privilege-section">
            <div class="privilege-section-title">
              <span class="material-symbols-outlined">grid_view</span>
              <span>{{ 'rbac.accessible_pages' | translate }}</span>
            </div>
            <div class="suite-pills">
              <span class="suite-pill" *ngFor="let suite of accessibleSuites">
                <span class="material-symbols-outlined">{{ suite.icon }}</span>
                <span>{{ suite.name }}</span>
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer privileges-footer">
          <button type="button" class="btn-primary" (click)="closePrivilegesModal()">{{ 'adm.done' | translate:'Done' }}</button>
        </div>
      </div>
    </div>

    <!-- Suite Overview & Capabilities Modal -->
    <div class="modal-backdrop" *ngIf="showSuiteInfoModal" (click)="closeSuiteInfoModal()">
      <div class="modal-content suite-info-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header suite-info-modal-header" *ngIf="activeSuiteInfo">
          <div class="suite-info-header-badge">
            <span class="material-symbols-outlined">{{ activeSuiteInfo.icon }}</span>
          </div>
          <div class="suite-info-header-meta">
            <div class="suite-info-kicker">{{ activeSuiteInfo.badge }}</div>
            <h3 class="suite-info-title">{{ activeSuiteInfo.title }}</h3>
          </div>
          <button (click)="closeSuiteInfoModal()" class="btn-close" [attr.aria-label]="'adm.close' | translate:'Close'">&times;</button>
        </div>

        <div class="modal-body suite-info-modal-body" *ngIf="activeSuiteInfo">
          <p class="suite-info-desc">{{ activeSuiteInfo.shortDesc }}</p>

          <div class="suite-info-section">
            <div class="suite-info-section-title">
              <span class="material-symbols-outlined">group</span>
              <span>{{ 'adm.target_organizations_users' | translate:'Target Organizations & Users' }}</span>
            </div>
            <div class="suite-info-target-box">
              {{ activeSuiteInfo.whoUsesIt }}
            </div>
          </div>

          <div class="suite-info-section">
            <div class="suite-info-section-title">
              <span class="material-symbols-outlined">verified</span>
              <span>{{ 'adm.key_capabilities_features_unlocked' | translate:'Key Capabilities & Features Unlocked' }}</span>
            </div>
            <ul class="suite-capabilities-list">
              <li *ngFor="let cap of activeSuiteInfo.capabilities">
                <span class="material-symbols-outlined check-icon">check_circle</span>
                <span>{{ cap }}</span>
              </li>
            </ul>
          </div>

          <div class="suite-info-section" *ngIf="activeSuiteInfo.impact">
            <div class="suite-info-section-title">
              <span class="material-symbols-outlined">trending_up</span>
              <span>{{ 'adm.operational_business_impact' | translate:'Operational & Business Impact' }}</span>
            </div>
            <div class="suite-info-impact-box">
              <span class="material-symbols-outlined impact-icon">lightbulb</span>
              <span>{{ activeSuiteInfo.impact }}</span>
            </div>
          </div>
        </div>

        <div class="modal-footer suite-info-modal-footer">
          <button type="button" class="btn-secondary" (click)="closeSuiteInfoModal()">{{ 'adm.dismiss' | translate:'Dismiss' }}</button>
        </div>
      </div>
    </div>

    <!-- First-Run Workspace Setup & Default Website Seeder Modal -->
    <app-first-run-setup-modal
      [isOpen]="showFirstRunModal"
      [brandName]="brandName"
      (completed)="onFirstRunCompleted($event)">
    </app-first-run-setup-modal>

    <!-- Language Change Confirmation Modal -->
    <div class="modal-backdrop oz-lang-modal-backdrop" *ngIf="showLanguageConfirmModal" (click)="cancelLanguageChange()">
      <div class="oz-lang-modal-card" (click)="$event.stopPropagation()">
        <div class="oz-lang-modal-icon-wrap">
          <span class="material-symbols-outlined">translate</span>
        </div>
        <h3 class="oz-lang-modal-title">{{ 'shell.confirm_lang_title' | translate }}</h3>
        <p class="oz-lang-modal-desc">{{ 'shell.confirm_lang_desc' | translate }}</p>

        <div class="oz-lang-modal-target-pill" *ngIf="pendingLanguage">
          <span class="oz-flag-lg">{{ pendingLanguage.flag }}</span>
          <div class="oz-lang-modal-target-names">
            <span class="oz-lang-modal-target-native">{{ pendingLanguage.nativeName }}</span>
            <span class="oz-lang-modal-target-en">({{ pendingLanguage.name }})</span>
          </div>
        </div>

        <div class="oz-lang-modal-actions">
          <button type="button" class="btn-lang-modal-cancel" (click)="cancelLanguageChange()">
            {{ 'btn.cancel' | translate }}
          </button>
          <button type="button" class="btn-lang-modal-confirm" (click)="confirmLanguageChange()">
            <span class="material-symbols-outlined">check</span>
            <span>{{ 'shell.confirm_lang_btn' | translate }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Feature Not Active / Coming Soon Modal -->
    <div class="modal-backdrop oz-lang-modal-backdrop" *ngIf="showLockedFeatureModal" (click)="closeLockedFeatureModal()">
      <div class="oz-lang-modal-card" (click)="$event.stopPropagation()">
        <div class="oz-lang-modal-icon-wrap"
             [style.background]="lockedFeatureIsAvailable ? 'rgba(0, 80, 229, 0.10)' : 'rgba(245, 158, 11, 0.12)'"
             [style.color]="lockedFeatureIsAvailable ? '#0050E5' : '#d97706'">
          <span class="material-symbols-outlined">{{ lockedFeatureIsAvailable ? 'lock' : 'schedule' }}</span>
        </div>
        <h3 class="oz-lang-modal-title">
          {{ lockedFeatureTitle || 'Feature' }} &mdash; {{ lockedFeatureIsAvailable ? 'Not Active' : 'Coming Soon' }}
        </h3>
        <p class="oz-lang-modal-desc" *ngIf="lockedFeatureIsAvailable">
          This modular capability is <strong>Available</strong> for your workspace, but is currently <strong>Not Active</strong> (Locked). Open the Feature Details page to review what it does, its suite, and install &amp; activate it in one click.
        </p>
        <p class="oz-lang-modal-desc" *ngIf="!lockedFeatureIsAvailable">
          This modular capability is currently in <strong>Coming Soon</strong> status on our product roadmap. Open the Feature Details page to preview its suite, specification, and capabilities we are building for your workspace.
        </p>
        <div class="oz-lang-modal-actions" style="margin-top: 18px;">
          <button type="button" class="btn-lang-modal-cancel" (click)="closeLockedFeatureModal()">
            Dismiss
          </button>
          <button type="button" class="btn-lang-modal-confirm" (click)="goToActivateFeature()">
            <span class="material-symbols-outlined">{{ lockedFeatureIsAvailable ? 'bolt' : 'visibility' }}</span>
            <span>{{ lockedFeatureIsAvailable ? 'View Details & Install' : 'View Feature Details' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sidebar-close-btn {
      display: none;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      min-width: 32px;
      padding: 0;
      border: 1px solid var(--sidebar-border, #e2e8f0);
      border-radius: 8px;
      background: #f8fafc;
      color: #64748b;
      cursor: pointer;
      margin-left: auto;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .sidebar-close-btn:hover {
      background: #fee2e2;
      border-color: #fca5a5;
      color: #ef4444;
      transform: scale(1.05);
    }
    .sidebar-close-btn .material-symbols-outlined {
      font-size: 18px !important;
      line-height: 1 !important;
      color: inherit;
    }
    :host-context(.dark-mode) .sidebar-close-btn {
      background: #1e293b;
      border-color: #334155;
      color: #94a3b8;
    }
    :host-context(.dark-mode) .sidebar-close-btn:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #f87171;
    }
    .sidebar-mobile-backdrop {
      display: none;
    }
    @media (max-width: 900px) {
      .sidebar-close-btn {
        display: flex !important;
      }
      .sidebar-mobile-backdrop {
        display: block !important;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
        z-index: 1040;
        cursor: pointer;
      }
    }
    .feature-locked {
      opacity: 0.78;
    }
    .feature-lock-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: rgba(100, 116, 139, 0.12);
      color: #64748b;
      margin-left: auto;
      flex-shrink: 0;
    }
    .feature-lock-pill .material-symbols-outlined {
      font-size: 14px !important;
    }
    :host {
      display: flex;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    #main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      min-width: 0;
      overflow: hidden;
      background-color: var(--md-sys-color-background);
    }
    .bcp-workspace-container {
      display: flex;
      flex-direction: row;
      flex: 1 1 0;
      min-height: 0;
      height: calc(100vh - var(--topbar-height, 70px));
      max-height: calc(100vh - var(--topbar-height, 70px));
      overflow: hidden;
      position: relative;
      width: 100%;
      padding: 8px 14px 18px 14px;
      gap: 14px;
      box-sizing: border-box;
      background-color: var(--md-sys-color-background);
    }
    .bcp-workspace-container.ai-docked-bottom {
      flex-direction: column;
    }
    .bcp-workspace-container.is-workspace-mode {
      padding: 0;
      gap: 0;
    }
    .bcp-page-shell {
      flex: 1 1 0;
      min-height: 0;
      height: 100%;
      max-height: 100%;
      overflow-y: auto;
      padding: 24px;
      min-width: 0;
      box-sizing: border-box;
      background-color: var(--md-sys-color-background);
      border-radius: 12px;
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
      transition: flex 0.25s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .bcp-page-shell.is-workspace-mode {
      border: none;
      border-radius: 0;
      box-shadow: none;
      padding: 24px 32px;
      width: 100%;
    }
    .bcp-page-shell.ai-split-70 {
      flex: 1 1 0;
      min-width: 0;
      max-width: none;
    }
    .bcp-page-shell.ai-split-bottom {
      flex: 1 1 0;
      min-height: 0;
      max-height: none;
    }
    .pinned-taskbar {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: 12px;
      overflow-x: auto;
      max-width: 480px;
    }
    .taskbar-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--md-sys-color-surface-variant);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 500;
      color: var(--sidebar-color);
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .taskbar-tab.active {
      background: var(--sidebar-active-bg);
      border-color: var(--sidebar-active-color);
      color: var(--sidebar-active-color);
      font-weight: 700;
    }
    .tab-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      text-decoration: none;
      color: inherit;
    }
    .tab-icon { font-size: 16px; }
    .tab-close-btn {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 0 2px;
    }
    .tab-close-btn:hover { color: var(--md-sys-color-error); }

    .apps-grid-wrapper, .calendar-wrapper, .notifications-wrapper, .user-profile-wrapper, .workspace-switcher-wrapper {
      position: relative;
    }
    .workspace-badge-btn {
      position: relative;
    }
    .workspace-short-pill {
      position: absolute;
      top: 2px;
      right: 2px;
      background: #0050e5;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      min-width: 14px;
      height: 14px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
      line-height: 1;
    }
    .workspace-switch-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 320px;
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      z-index: 1000;
      overflow: hidden;
    }
    .workspace-list {
      max-height: 280px;
      overflow-y: auto;
      padding: 6px;
    }
    .workspace-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .workspace-item:hover {
      background: var(--sidebar-hover-bg);
    }
    .workspace-item.current {
      background: rgba(0, 80, 229, 0.08);
    }
    .ws-item-avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
      border: 1px solid var(--md-sys-color-outline);
    }
    .ws-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .ws-item-avatar span {
      font-size: 18px;
      color: #0050e5;
    }
    .ws-item-info {
      flex: 1;
      min-width: 0;
    }
    .ws-item-name {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--md-sys-color-on-surface);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ws-item-sub {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      margin-top: 2px;
    }
    .ws-current-tag {
      font-weight: 700;
      color: #0050e5;
    }
    .ws-active-tag {
      font-weight: 700;
      color: #10b981;
    }
    .ws-signed-out-tag {
      font-weight: 600;
      color: #94a3b8;
    }
    .ws-item-email {
      color: var(--sidebar-header-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 130px;
    }
    .ws-item-action span {
      font-size: 18px;
      color: var(--sidebar-header-color);
    }
    .apps-grid-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 320px;
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      z-index: 1000;
      padding: 14px;
    }
    .apps-grid-header {
      font-size: 12px;
      font-weight: 700;
      color: var(--sidebar-header-color);
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .apps-grid-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .app-grid-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      color: var(--sidebar-color);
      padding: 8px 4px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      transition: background 0.15s;
    }
    .app-grid-item:hover {
      background: var(--sidebar-hover-bg);
      color: var(--sidebar-active-color);
    }
    .app-icon-bg {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .app-icon-bg span { font-size: 20px; }

    .calendar-dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 280px;
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      z-index: 1000;
      padding: 14px;
    }
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 10px;
    }
    .calendar-nav-btn {
      background: none;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      color: var(--sidebar-color);
    }
    .calendar-weekdays, .calendar-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-size: 11px;
    }
    .calendar-weekdays { font-weight: 700; color: var(--sidebar-header-color); margin-bottom: 6px; }
    .calendar-days span {
      padding: 6px 0;
      border-radius: 4px;
      cursor: pointer;
      color: var(--sidebar-color);
    }
    .calendar-days span:hover { background: var(--sidebar-hover-bg); }
    .calendar-days .today { background: var(--sidebar-active-color); color: #fff; font-weight: 700; }
    .calendar-days .prev-month { color: var(--md-sys-color-outline); }

    .notification-circle-btn {
      width: 38px !important;
      height: 38px !important;
      border-radius: 50% !important;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 !important;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--sidebar-color);
      transition: all 0.2s ease;
    }
    .notification-circle-btn:hover {
      background: var(--sidebar-hover-bg) !important;
      color: var(--sidebar-active-color);
      border-radius: 50% !important;
    }
    .notif-badge-sup {
      position: absolute;
      top: 2px;
      right: 2px;
      min-width: 17px;
      height: 17px;
      padding: 0 4px;
      border-radius: 10px;
      background: #ef4444;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--md-sys-color-surface, #ffffff);
      box-sizing: border-box;
      pointer-events: none;
      line-height: 1;
    }
    .notifications-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 330px;
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      z-index: 1000;
      overflow: hidden;
    }
    .dropdown-header {
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      font-size: 13px;
      border-bottom: 1px solid var(--md-sys-color-outline);
    }
    .dropdown-hdr-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .hdr-mini-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
    }
    .hdr-mini-btn:hover { background: rgba(0, 80, 229, 0.1); }
    .hdr-mini-btn.danger { color: #ef4444; }
    .hdr-mini-btn.danger:hover { background: rgba(239, 68, 68, 0.1); }
    .hdr-mini-btn span { font-size: 17px; }
    .notifications-list {
      display: flex;
      flex-direction: column;
      max-height: 320px;
      overflow-y: auto;
    }
    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--md-sys-color-outline);
      font-size: 12px;
      cursor: pointer;
      position: relative;
      transition: background 0.15s;
    }
    .notification-item:hover { background: var(--sidebar-hover-bg); }
    .notification-item.unread { background: var(--sidebar-active-bg); }
    .notif-icon-circle {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .notif-icon-circle span { font-size: 18px; }
    .notif-icon-blue { background: rgba(0, 80, 229, 0.12); color: #0050e5; }
    .notif-icon-green { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
    .notif-icon-purple { background: rgba(168, 85, 247, 0.12); color: #9333ea; }
    .notif-icon-red { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
    .notif-icon-amber { background: rgba(245, 158, 11, 0.12); color: #d97706; }
    .notif-content { flex: 1; min-width: 0; }
    .notif-title { font-weight: 700; color: var(--md-sys-color-on-surface); margin-bottom: 2px; }
    .notif-desc { font-size: 11.5px; color: var(--sidebar-header-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .notif-time { font-size: 10.5px; color: var(--sidebar-header-color); margin-top: 2px; }
    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #0050e5;
      position: absolute;
      right: 14px;
      top: 14px;
    }
    .notification-empty {
      padding: 24px 16px;
      text-align: center;
      color: var(--sidebar-header-color);
      font-size: 12px;
    }
    .empty-icon { font-size: 28px; margin-bottom: 4px; color: var(--sidebar-header-color); }
    .dropdown-footer {
      padding: 8px 16px;
      border-top: 1px solid var(--md-sys-color-outline);
      background: var(--md-sys-color-surface-variant);
      text-align: center;
    }
    .view-all-link {
      font-size: 12px;
      font-weight: 700;
      color: #0050e5;
      text-decoration: none;
    }
    .view-all-link:hover { text-decoration: underline; }

    .user-profile-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .user-profile-btn:hover { background: var(--sidebar-hover-bg); }
    .user-avatar-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0050e5, #38bdf8);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
    }
    .user-profile-info { display: flex; flex-direction: column; text-align: left; }
    .user-profile-name { font-size: 13px; font-weight: 700; color: var(--md-sys-color-on-surface); }
    .user-profile-role { font-size: 11px; color: var(--sidebar-header-color); }

    .user-profile-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 220px;
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      z-index: 1000;
      padding: 6px 0;
    }
    .profile-dropdown-header {
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid var(--md-sys-color-outline);
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      font-size: 13px;
      color: var(--sidebar-color);
      text-decoration: none;
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      transition: background 0.15s;
    }
    .dropdown-item:hover { background: var(--sidebar-hover-bg); color: var(--sidebar-active-color); }
    .dropdown-divider { height: 1px; background: var(--md-sys-color-outline); margin: 4px 0; }
    .text-danger { color: var(--md-sys-color-error) !important; }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }
    .modal-card {
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .modal-header {
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--md-sys-color-outline);
    }
    .modal-title-group { display: flex; align-items: center; gap: 10px; }
    .modal-title-group h3 { margin: 0; font-size: 17px; font-weight: 700; color: var(--md-sys-color-on-surface); }
    .btn-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--sidebar-header-color); }
    .modal-body { padding: 24px; color: var(--sidebar-color); font-size: 14px; line-height: 1.6; }
    .modal-body h4 { margin: 0 0 10px; color: var(--md-sys-color-on-surface); font-size: 15px; font-weight: 700; }
    .modal-body ul { padding-left: 20px; margin: 12px 0 0; }
    .modal-body li { margin-bottom: 8px; }

    .sub-nav-divider { padding: 8px 16px 4px; list-style: none; }
    .sub-divider-text { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #94a3b8; }
    .badge-sub-new { background: #ef4444; color: #fff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; margin-left: auto; }

    /* Sidebar Mode Switcher (Admin Console <-> Users Workspace) */
    .sidebar-mode-switcher {
      display: flex;
      margin: 8px 14px 12px;
      padding: 3px;
      background: var(--sidebar-hover-bg, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--md-sys-color-outline, rgba(255, 255, 255, 0.1));
      border-radius: 8px;
      gap: 4px;
    }
    .mode-switch-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 8px;
      background: transparent;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--sidebar-color, #94a3b8);
      cursor: pointer;
      transition: all 0.18s ease;
    }
    .mode-switch-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.04);
    }
    .mode-switch-btn.active {
      background: #0050e5;
      color: #ffffff;
      font-weight: 700;
      box-shadow: 0 2px 6px rgba(0, 80, 229, 0.35);
    }
    .mode-switch-icon {
      font-size: 15px;
    }

    /* Central Feature Expiration Banner (Strictly Admin Console) */
    .central-feature-expiration-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 10px 14px 4px 14px;
      padding: 12px 18px;
      background: #fffbeb;
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-left: 4px solid #f59e0b;
      border-radius: 10px;
      color: #92400e;
      font-size: 13px;
      box-shadow: 0 2px 6px rgba(245, 158, 11, 0.08);
      transition: all 0.2s ease;
    }
    :host-context(.dark-mode) .central-feature-expiration-banner {
      background: #2d2010;
      border-color: #78350f;
      border-left-color: #f59e0b;
      color: #fde68a;
    }
    .banner-content {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .banner-icon {
      font-size: 20px;
      color: #d97706;
      flex-shrink: 0;
    }
    .banner-text {
      display: flex;
      flex-direction: row;
      gap: 6px;
      align-items: baseline;
      flex-wrap: wrap;
    }
    .banner-title {
      font-weight: 700;
      color: #b45309;
    }
    :host-context(.dark-mode) .banner-title {
      color: #f59e0b;
    }
    .banner-desc {
      color: inherit;
    }
    .banner-actions {
      flex-shrink: 0;
      margin-left: 12px;
    }
    .banner-btn {
      padding: 5px 12px;
      background: #d97706;
      color: #ffffff;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      white-space: nowrap;
      transition: background 0.15s ease;
      display: inline-block;
    }
    .banner-btn:hover {
      background: #b45309;
    }

    /* Central Pattern Multi-Language Switcher */
    .oz-lang-switcher {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .oz-lang-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: var(--text-color, #475569);
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 9999px;
      cursor: pointer;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: all 0.2s ease;
      line-height: 1;
    }
    :host-context(.dark-mode) .oz-lang-btn {
      color: #cbd5e1;
      background: rgba(30, 41, 59, 0.7);
      border-color: #334155;
    }
    .oz-lang-btn:hover {
      background: var(--bg-hover, #f1f5f9);
      border-color: #cbd5e1;
      color: var(--text-heading, #0f172a);
    }
    :host-context(.dark-mode) .oz-lang-btn:hover {
      background: #1e293b;
      border-color: #475569;
      color: #ffffff;
    }
    .oz-lang-btn[aria-expanded="true"] {
      border-color: #0050e5;
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.15);
    }
    .oz-lang-btn svg {
      transition: transform 0.2s ease;
    }
    .oz-lang-btn[aria-expanded="true"] svg {
      transform: rotate(180deg);
    }
    .oz-lang-flag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .oz-lang-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      min-width: 170px;
      background: #ffffff;
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      padding: 6px;
      z-index: 1050;
      animation: ozFadeSlideDown 0.18s ease-out;
    }
    :host-context(.dark-mode) .oz-lang-menu {
      background: #18191f;
      border-color: #2e384d;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    @keyframes ozFadeSlideDown {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .oz-lang-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-color, #334155);
      text-decoration: none;
      border-radius: 8px;
      transition: background 0.15s ease, color 0.15s ease;
      cursor: pointer;
    }
    :host-context(.dark-mode) .oz-lang-item {
      color: #94a3b8;
    }
    .oz-lang-item:hover {
      background: #f1f5f9;
      color: #0050e5;
    }
    :host-context(.dark-mode) .oz-lang-item:hover {
      background: #252836;
      color: #60a5fa;
    }
    .oz-lang-item.active {
      background: #eef2ff;
      color: #0050e5;
      font-weight: 600;
    }
    :host-context(.dark-mode) .oz-lang-item.active {
      background: rgba(0, 80, 229, 0.15);
      color: #60a5fa;
    }
    .oz-flag-icon {
      font-size: 16px;
      line-height: 1;
    }
    .oz-lang-name {
      flex: 1;
      white-space: nowrap;
    }
    .check-icon {
      font-size: 16px;
      color: #0050e5;
      margin-left: auto;
    }
    :host-context(.dark-mode) .check-icon {
      color: #60a5fa;
    }

    /* User Role Badge & Privileges Modal Styles */
    .privileges-modal-card {
      max-width: 600px;
    }
    .modal-subtitle {
      margin: 2px 0 0;
      font-size: 12px;
      color: var(--sidebar-header-color, #94a3b8);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .role-highlight-badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 9999px;
      background: rgba(0, 80, 229, 0.12);
      color: #0050e5;
    }
    :host-context(.dark-mode) .role-highlight-badge {
      background: rgba(0, 80, 229, 0.25);
      color: #60a5fa;
    }
    .profile-badge-tag {
      margin-top: 4px;
      display: inline-block;
      align-self: flex-start;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 9999px;
      background: #0050e5;
      color: #ffffff;
    }
    .privileges-modal-body {
      max-height: 65vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .privilege-section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: var(--md-sys-color-on-surface);
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .privilege-section-title .material-symbols-outlined {
      font-size: 18px;
      color: #0050e5;
    }
    .role-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .role-chip {
      padding: 6px 12px;
      background: rgba(0, 80, 229, 0.08);
      border: 1px solid rgba(0, 80, 229, 0.25);
      color: #0050e5;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    :host-context(.dark-mode) .role-chip {
      background: rgba(0, 80, 229, 0.2);
      border-color: rgba(0, 80, 229, 0.4);
      color: #60a5fa;
    }
    .capability-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    @media (max-width: 640px) {
      .capability-list {
        grid-template-columns: 1fr;
      }
    }
    .capability-list li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      padding: 8px 10px;
      background: var(--sidebar-hover-bg, rgba(0,0,0,0.03));
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 8px;
      margin: 0;
    }
    :host-context(.dark-mode) .capability-list li {
      background: rgba(255,255,255,0.03);
      border-color: rgba(255,255,255,0.08);
    }
    .check-icon-cap {
      font-size: 16px;
      color: #10b981;
      flex-shrink: 0;
    }
    .suite-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .suite-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--sidebar-hover-bg, rgba(0,0,0,0.04));
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }
    :host-context(.dark-mode) .suite-pill {
      background: rgba(255,255,255,0.04);
      border-color: rgba(255,255,255,0.08);
      color: #e2e8f0;
    }
    .suite-pill .material-symbols-outlined {
      font-size: 16px;
      color: #0050e5;
    }
    :host-context(.dark-mode) .suite-pill .material-symbols-outlined {
      color: #60a5fa;
    }
    .privileges-footer {
      padding: 14px 24px;
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid var(--md-sys-color-outline);
    }
    .btn-primary {
      padding: 8px 20px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-primary:hover {
      background: #0040b8;
    }

    /* Suite Header & Info Trigger Styles */
    .suite-header-row {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 12px 10px 4px 10px !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .suite-header-text {
      flex: 1 1 auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .suite-info-trigger {
      flex: 0 0 auto;
      background: transparent;
      border: none;
      padding: 2px 4px;
      margin: 0;
      cursor: pointer;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      color: var(--sidebar-header-color, #64748b) !important;
      opacity: 0.75;
      transition: all 0.2s ease;
      line-height: 1;
    }
    :host-context(.dark-mode) .suite-info-trigger {
      color: rgba(255, 255, 255, 0.5) !important;
    }
    .suite-info-trigger:hover {
      opacity: 1 !important;
      color: #0050e5 !important;
      background: rgba(0, 80, 229, 0.1) !important;
      transform: scale(1.15);
    }
    :host-context(.dark-mode) .suite-info-trigger:hover {
      color: #38bdf8 !important;
      background: rgba(255, 255, 255, 0.1) !important;
    }
    .suite-info-icon {
      font-size: 14px !important;
      width: 14px;
      height: 14px;
      line-height: 14px !important;
      display: inline-block !important;
    }

    /* Suite Info Modal Card & Details */
    .suite-info-modal-card {
      max-width: 620px;
      width: 100%;
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
    }
    :host-context(.dark-mode) .suite-info-modal-card {
      background: #1e222d;
      border-color: rgba(255, 255, 255, 0.1);
    }
    .suite-info-modal-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 20px 24px;
      border-bottom: 1px solid var(--md-sys-color-outline, #e2e8f0);
      position: relative;
    }
    :host-context(.dark-mode) .suite-info-modal-header {
      border-bottom-color: rgba(255, 255, 255, 0.08);
    }
    .suite-info-header-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0050e5, #3b82f6);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
    }
    .suite-info-header-badge .material-symbols-outlined {
      font-size: 24px;
    }
    .suite-info-header-meta {
      flex: 1;
      min-width: 0;
    }
    .suite-info-kicker {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0050e5;
      margin-bottom: 2px;
    }
    :host-context(.dark-mode) .suite-info-kicker {
      color: #60a5fa;
    }
    .suite-info-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--md-sys-color-on-surface, #0f172a);
    }
    :host-context(.dark-mode) .suite-info-title {
      color: #f8fafc;
    }
    .suite-info-modal-body {
      padding: 22px 24px;
      max-height: 65vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .suite-info-desc {
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
      color: var(--md-sys-color-on-surface-variant, #475569);
    }
    :host-context(.dark-mode) .suite-info-desc {
      color: #cbd5e1;
    }
    .suite-info-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .suite-info-section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--md-sys-color-on-surface, #1e293b);
    }
    :host-context(.dark-mode) .suite-info-section-title {
      color: #94a3b8;
    }
    .suite-info-section-title .material-symbols-outlined {
      font-size: 18px;
      color: #0050e5;
    }
    :host-context(.dark-mode) .suite-info-section-title .material-symbols-outlined {
      color: #60a5fa;
    }
    .suite-info-target-box {
      padding: 10px 14px;
      background: rgba(0, 80, 229, 0.05);
      border-left: 3px solid #0050e5;
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      color: var(--md-sys-color-on-surface, #1e293b);
      line-height: 1.5;
    }
    :host-context(.dark-mode) .suite-info-target-box {
      background: rgba(0, 80, 229, 0.12);
      color: #e2e8f0;
      border-left-color: #60a5fa;
    }
    .suite-capabilities-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .suite-capabilities-list li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13px;
      line-height: 1.45;
      color: var(--md-sys-color-on-surface, #334155);
    }
    :host-context(.dark-mode) .suite-capabilities-list li {
      color: #cbd5e1;
    }
    .suite-capabilities-list .check-icon {
      font-size: 17px;
      color: #10b981;
      margin-top: 1px;
      flex-shrink: 0;
    }
    .suite-info-impact-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      font-size: 13px;
      color: #166534;
      line-height: 1.5;
    }
    :host-context(.dark-mode) .suite-info-impact-box {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.25);
      color: #86efac;
    }
    .suite-info-impact-box .impact-icon {
      font-size: 20px;
      color: #10b981;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .suite-info-modal-footer {
      padding: 14px 24px;
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid var(--md-sys-color-outline, #e2e8f0);
    }
    :host-context(.dark-mode) .suite-info-modal-footer {
      border-top-color: rgba(255, 255, 255, 0.08);
    }
    .btn-secondary {
      padding: 8px 20px;
      background: #e2e8f0;
      color: #1e293b;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    /* Language Change Confirmation Modal */
    .oz-lang-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 10005;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .oz-lang-modal-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      max-width: 440px;
      width: 100%;
      padding: 28px 24px 24px;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    }
    :host-context(.dark-mode) .oz-lang-modal-card {
      background: #1e293b;
      border-color: rgba(255, 255, 255, 0.1);
    }
    .oz-lang-modal-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .oz-lang-modal-icon-wrap .material-symbols-outlined {
      font-size: 28px;
    }
    .oz-lang-modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px;
    }
    :host-context(.dark-mode) .oz-lang-modal-title {
      color: #f8fafc;
    }
    .oz-lang-modal-desc {
      font-size: 13.5px;
      line-height: 1.5;
      color: #64748b;
      margin: 0 0 20px;
    }
    :host-context(.dark-mode) .oz-lang-modal-desc {
      color: #94a3b8;
    }
    .oz-lang-modal-target-pill {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 10px 18px;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    :host-context(.dark-mode) .oz-lang-modal-target-pill {
      background: #0f172a;
      border-color: rgba(255, 255, 255, 0.12);
    }
    .oz-flag-lg {
      font-size: 24px;
    }
    .oz-lang-modal-target-names {
      text-align: left;
    }
    .oz-lang-modal-target-native {
      display: block;
      font-size: 14.5px;
      font-weight: 700;
      color: #0f172a;
    }
    :host-context(.dark-mode) .oz-lang-modal-target-native {
      color: #f8fafc;
    }
    .oz-lang-modal-target-en {
      display: block;
      font-size: 11.5px;
      color: #64748b;
    }
    :host-context(.dark-mode) .oz-lang-modal-target-en {
      color: #94a3b8;
    }
    .oz-lang-modal-actions {
      display: flex;
      gap: 12px;
    }
    .btn-lang-modal-cancel {
      flex: 1;
      padding: 10px 16px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    :host-context(.dark-mode) .btn-lang-modal-cancel {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
    }
    .btn-lang-modal-cancel:hover {
      background: #e2e8f0;
      color: #1e293b;
    }
    .btn-lang-modal-confirm {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 16px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 2px 4px rgba(0, 80, 229, 0.25);
    }
    .btn-lang-modal-confirm:hover {
      background: #003db3;
    }
    .btn-lang-modal-confirm .material-symbols-outlined {
      font-size: 18px;
    }
    .btn-secondary:hover {
      background: #cbd5e1;
    }
    :host-context(.dark-mode) .btn-secondary {
      background: #334155;
      color: #f1f5f9;
    }
    :host-context(.dark-mode) .btn-secondary:hover {
      background: #475569;
    }
  `]
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  private committeeAliasesSub?: Subscription;
  sidebarCollapsed = false;
  darkMode = false;

  // Suite Overview & Capabilities Modal State
  showSuiteInfoModal = false;
  activeSuiteInfo: SuiteInfoDetail | null = null;
  suiteInfoCatalog: { [key: string]: SuiteInfoDetail } = {
    core_command: {
      key: 'core_command',
      badge: 'Executive Command • Core Platform',
      icon: 'dashboard',
      title: 'Central Command & Cockpit',
      shortDesc: 'The unified executive cockpit for leadership, directors, and executives. Aggregates real-time telemetry across revenue, operations, task queues, and automated audit health.',
      whoUsesIt: 'Executive leadership, C-suite, Board members, Managing Directors, Operations Heads.',
      capabilities: [
        'Central Executive Command Cockpit with real-time KPI aggregations',
        'Visual Analytics & System Health Telemetry',
        'Cross-organizational task delegation and status boards',
        'Active alert dispatch monitor and milestone trackers'
      ],
      impact: 'Provides real-time visibility into high-level organizational health and operational bottlenecks without manual spreadsheet reporting.'
    },
    website_cms: {
      key: 'website_cms',
      badge: 'Suite 01 • Web & Content',
      icon: 'language',
      title: 'Website & CMS Studio',
      shortDesc: 'Complete no-code content management suite. Enables organizations to design, publish, and host responsive multi-page public portals, hero showcases, dynamic blogs, and custom domain integrations.',
      whoUsesIt: 'Marketing teams, Content creators, Web administrators, Brand managers, Community leaders.',
      capabilities: [
        'Visual Modular Content & Page Designer with live previews',
        'Dynamic Blog Post & Article Publishing with Rich Media & Tags',
        'Visual Menu Navigation, Topbars & Dropdown Hierarchy Editor',
        'Footer & Legal Compliance Pages Builder',
        'Live Theme Customizer (Palette, Typography, Card Styles)',
        'Custom Domain Setup & Cloudflare SSL Integration'
      ],
      impact: 'Eliminates the cost of standalone CMS platforms (WordPress, Webflow) and keeps public branding tightly coupled to membership directories.'
    },
    user_management: {
      key: 'user_management',
      badge: 'Suite 02 • Core Identity',
      icon: 'manage_accounts',
      title: 'User Management & Access Control',
      shortDesc: 'Unified directory and security governance suite. Manage user directories, categorized cohorts, custom registration forms, dynamic leaderboards, and role-based permissions.',
      whoUsesIt: 'System administrators, HR managers, Membership coordinators, Community managers.',
      capabilities: [
        'Central Member Directory with real-time status and quick search',
        'Role & Permission Matrices with granular security policies',
        'Dynamic Registration Form Builder with custom field schemas',
        'Member KPIs, Badges & Activity Telemetry Leaderboards',
        'Direct Email Invitations and Security Credential Management'
      ],
      impact: 'Secures organizational identity, automates self-registration onboarding, and delivers continuous member engagement metrics.'
    },
    people_community: {
      key: 'people_community',
      badge: 'Suite 03 • Community Add-on',
      icon: 'groups',
      title: 'People, Groups & Community',
      shortDesc: 'Comprehensive member identity, staff directory, and community organization hub. Manages classifications, sub-categories, alumni tracking, and working committee collaboration.',
      whoUsesIt: 'HR managers, Membership coordinators, Community managers, Alumni directors, Association secretaries.',
      capabilities: [
        'Central Member Directory with quick search, filters & export',
        'Category & Sub-Category Segmentation (e.g. VIP, Staff, Volunteers)',
        'Interactive Working Groups, Working Committees & Community Hubs',
        'Alumni Network Tracking & Graduation Cohorts',
        'Real-time Ozikol Chat Messenger for staff and member collaboration',
        'Confidential Whistleblowing & Feedback Oversight'
      ],
      impact: 'Transforms passive contact lists into structured, searchable communities with custom taxonomy and lifecycle history.'
    },
    workforce_shifts: {
      key: 'workforce_shifts',
      badge: 'Suite 04 • Operations Add-on',
      icon: 'calendar_month',
      title: 'Workforce, Shifts & Scheduling',
      shortDesc: 'Operational staff and volunteer roster management. Coordinate rota shifts, handle shift swaps, track clock-in attendance, and synchronize team calendars.',
      whoUsesIt: 'Operations managers, Shift supervisors, Volunteer coordinators, Department leads.',
      capabilities: [
        'Visual Staff & Volunteer Rota Scheduling',
        'Interactive Shift Swaps & Leave Request Approvals',
        'Clock-In Attendance Tracking with geolocation verification',
        'Master Team Calendar & Automated Follow-Up Reminders'
      ],
      impact: 'Eliminates scheduling conflicts, ensures adequate operational coverage, and automates labor attendance tracking.'
    },
    daily_operations: {
      key: 'workforce_shifts',
      badge: 'Suite 04 • Operations Add-on',
      icon: 'calendar_month',
      title: 'Workforce, Shifts & Scheduling',
      shortDesc: 'Operational staff and volunteer roster management. Coordinate rota shifts, handle shift swaps, track clock-in attendance, and synchronize team calendars.',
      whoUsesIt: 'Operations managers, Shift supervisors, Volunteer coordinators, Department leads.',
      capabilities: [
        'Visual Staff & Volunteer Rota Scheduling',
        'Interactive Shift Swaps & Leave Request Approvals',
        'Clock-In Attendance Tracking with geolocation verification',
        'Master Team Calendar & Automated Follow-Up Reminders'
      ],
      impact: 'Eliminates scheduling conflicts, ensures adequate operational coverage, and automates labor attendance tracking.'
    },
    events_ticketing: {
      key: 'events_ticketing',
      badge: 'Suite 05 • Events Add-on',
      icon: 'confirmation_number',
      title: 'Events & Ticketing',
      shortDesc: 'Comprehensive event planning and ticketing platform. Sell tickets, manage attendee tiers, coordinate multi-track speaker sessions, and verify QR check-ins.',
      whoUsesIt: 'Event directors, Conference coordinators, Program managers, Ticket sales agents.',
      capabilities: [
        'Event Publishing & Multi-Tier Pass Ticketing Engine',
        'Speaker & Session Track Agenda Builder',
        'Real-Time QR Code Attendee Check-In Desk',
        'Attendee Communication & Automated Badge Generation'
      ],
      impact: 'Maximizes ticket revenue and streamlines day-of-event check-in lines with fast QR scanning.'
    },
    commerce_store: {
      key: 'commerce_store',
      badge: 'Suite 06 • Commerce Add-on',
      icon: 'storefront',
      title: 'Commerce & Store Studio',
      shortDesc: 'Full-featured physical and digital product storefront. Manage product variants, inventory levels, promotional categories, shopping cart checkout, and fulfillment dispatch.',
      whoUsesIt: 'Merchandise teams, Retail businesses, Non-profits selling branded swag, Digital product creators.',
      capabilities: [
        'Product Catalog & Inventory Management with low-stock alerts',
        'New Product Creation with Multi-image Galleries & Variants',
        'Category Taxonomy & Storefront Showcase Sorting',
        'Customer Order Processing, Tracking & Fulfillment Pipeline',
        'Store Financial Transaction Ledger & Settlement Summaries'
      ],
      impact: 'Empowers organizations to sell merchandise, tickets, and digital downloads directly to their community with integrated payment processing.'
    },
    finance_banking: {
      key: 'finance_banking',
      badge: 'Suite 07 • Fiscal Add-on',
      icon: 'account_balance',
      title: 'Finance & Banking Rail',
      shortDesc: 'Institutional fiscal governance engine: automate recurring membership dues, issue professional multi-currency invoices, connect banking gateways, and manage grant applications.',
      whoUsesIt: 'Finance controllers, Treasurers, Accountants, Grant officers, Executive directors.',
      capabilities: [
        'Member Dues Invoicing with recurring billing schedules',
        'Multi-currency Invoice Generation with PDF receipt export',
        'Integrated Banking Gateways & Settlement reconciliation',
        'Proposals, Philanthropic Grants Pipeline & Donor Funding Logs'
      ],
      impact: 'Automates dues collection cycles, minimizes accounts receivable delays, and maintains audit-ready fiscal ledgers.'
    },
    communication_support: {
      key: 'communication_support',
      badge: 'Suite 08 • Engagement Add-on',
      icon: 'forum',
      title: 'Communication & Support Hub',
      shortDesc: 'Unified multi-channel outreach and member assistance center. Broadcast mass alerts across Email, SMS, WhatsApp, and in-app with built-in anti-spam scanning, live chat, and support ticketing.',
      whoUsesIt: 'Communications teams, Customer support reps, Community liaisons, Crisis responders.',
      capabilities: [
        'Mass Notification Studio with Email, SMS, WhatsApp & In-App delivery',
        'Real-time Anti-Spam Scanner & Mailbox Blacklist Guard',
        'Delivery Telemetry, Open-rate and Click-through Analytics',
        'Internal Ozikol Chat Messenger for staff & team collaboration',
        'Embeddable Live Chat Widget for public websites',
        'Multi-agent Helpdesk Ticketing System with SLA routing',
        'Social Bio Link-Tree Landing Page Builder'
      ],
      impact: 'Consolidates Mailchimp, Zendesk, and Twilio into one unified suite with high deliverability spam defenses.'
    },
    forms_intelligence: {
      key: 'forms_intelligence',
      badge: 'Suite 09 • Data Add-on',
      icon: 'dynamic_form',
      title: 'Forms & Intelligence',
      shortDesc: 'No-code dynamic form builder and feedback engine. Create member onboarding questionnaires, event registration surveys, voting ballots, and automate downstream actions.',
      whoUsesIt: 'Research officers, Program managers, HR evaluators, Event planners, Community organizers.',
      capabilities: [
        'Drag-and-Drop Dynamic Form & Survey Builder',
        'Survey Response Analytics with real-time charts & CSV exports',
        'Custom Field Schema Designer with conditional branching',
        'Automated workflow triggers based on form submission values'
      ],
      impact: 'Replaces external tools (Google Forms, Typeform) with deeply integrated, GDPR-compliant data capture directly linked to member profiles.'
    },
    intelligence_forms: {
      key: 'forms_intelligence',
      badge: 'Suite 09 • Data Add-on',
      icon: 'dynamic_form',
      title: 'Forms & Intelligence',
      shortDesc: 'No-code dynamic form builder and feedback engine. Create member onboarding questionnaires, event registration surveys, voting ballots, and automate downstream actions.',
      whoUsesIt: 'Research officers, Program managers, HR evaluators, Event planners, Community organizers.',
      capabilities: [
        'Drag-and-Drop Dynamic Form & Survey Builder',
        'Survey Response Analytics with real-time charts & CSV exports',
        'Custom Field Schema Designer with conditional branching',
        'Automated workflow triggers based on form submission values'
      ],
      impact: 'Replaces external tools (Google Forms, Typeform) with deeply integrated, GDPR-compliant data capture directly linked to member profiles.'
    },
    reports_forms: {
      key: 'forms_intelligence',
      badge: 'Suite 09 • Data Add-on',
      icon: 'dynamic_form',
      title: 'Forms & Intelligence',
      shortDesc: 'No-code dynamic form builder and feedback engine. Create member onboarding questionnaires, event registration surveys, voting ballots, and automate downstream actions.',
      whoUsesIt: 'Research officers, Program managers, HR evaluators, Event planners, Community organizers.',
      capabilities: [
        'Drag-and-Drop Dynamic Form & Survey Builder',
        'Survey Response Analytics with real-time charts & CSV exports',
        'Custom Field Schema Designer with conditional branching',
        'Automated workflow triggers based on form submission values'
      ],
      impact: 'Replaces external tools (Google Forms, Typeform) with deeply integrated, GDPR-compliant data capture directly linked to member profiles.'
    },
    academy_training: {
      key: 'academy_training',
      badge: 'Suite 10 • Education Add-on',
      icon: 'school',
      title: 'Academy & Training Suite',
      shortDesc: 'Modern Learning Management System (LMS) and credentialing engine. Host video lessons, track student progress, administer quizzes, and generate cryptographically verifiable QR certificates.',
      whoUsesIt: 'Corporate trainers, Educational institutions, Professional certification boards, Internal onboarding teams.',
      capabilities: [
        'Course Curriculum Builder with modular video, audio & text lessons',
        'Student Enrollment, Quiz Scoring & Progress Telemetry',
        'Dynamic Certificate Designer with automated credential generation',
        'Cryptographic QR-Code Verification Portal for public credential verification'
      ],
      impact: 'Enables continuous education, compliance accreditation, and monetization of training programs under your own brand.'
    },
    compliance_governance: {
      key: 'compliance_governance',
      badge: 'Suite 11 • Governance Add-on',
      icon: 'verified_user',
      title: 'Compliance & Governance Vault',
      shortDesc: 'Enterprise trust, security, and physical access suite. Securely archive confidential contracts, verify customer identities (KYC), and issue digital visitor gate passes.',
      whoUsesIt: 'Legal counsel, Compliance officers, Security personnel, Facility receptionists, Audit committees.',
      capabilities: [
        'Document Vault & Cloud Archive with role-based access encryption',
        'KYC & Government Identity Document Verification Pipeline',
        'Visitor & Digital Gate Pass Management with entry/exit timestamps',
        'Policy acknowledgment tracking and audit verification trail'
      ],
      impact: 'Guarantees regulatory compliance, protects sensitive institutional documents, and digitizes physical visitor security.'
    },
    demographics_census: {
      key: 'demographics_census',
      badge: 'Suite 12 • Community Add-on',
      icon: 'analytics',
      title: 'Demographics & Census',
      shortDesc: 'Territorial and population analytics for communities, municipalities, and religious organizations. Map geographic spread, issue digital resident ID cards, and analyze demographic shifts.',
      whoUsesIt: 'Community leaders, Municipal boards, NGO field directors, Census coordinators, Faith organizations.',
      capabilities: [
        'Community Geographic Census with territorial heatmaps',
        'Digital Resident & Member ID Card Generation with QR codes',
        'Demographic Analytics & Longitudinal Cohort Growth Charts',
        'Household & Family Unit Relationship Grouping'
      ],
      impact: 'Delivers clear demographic insights to allocate community resources, plan outreach programs, and issue verifiable digital identity badges.'
    },
    billing_subscriptions: {
      key: 'billing_subscriptions',
      badge: 'Suite 13 • Platform Governance',
      icon: 'credit_card',
      title: 'Billing & Subscriptions',
      shortDesc: 'Tenant subscription and feature billing management. Track plan usage, manage credit card payment methods, review past invoices, and add modular feature add-ons.',
      whoUsesIt: 'Tenant Owners, Primary Billing Contacts, Financial Administrators.',
      capabilities: [
        'Subscription Dashboard with active plan and renewal cycle details',
        'Payment Methods Management (Stripe, Cards, Bank Transfers)',
        'Transparent Bill Calculator based on active members and activated suites',
        'Modular Feature Add-on Marketplace with instant activation'
      ],
      impact: 'Provides total transparency into tenant infrastructure costs and self-service scalability.'
    },
    security_audit: {
      key: 'security_audit',
      badge: 'Suite 14 • Platform Protection',
      icon: 'security',
      title: 'Security & Audit',
      shortDesc: 'Comprehensive platform security and compliance logging. Inspect immutable audit logs, review authentication history, enforce security policies, and manage active sessions.',
      whoUsesIt: 'Security administrators, IT directors, Compliance auditors, System administrators.',
      capabilities: [
        'Live Security & Audit Logs with IP tracking and payload inspection',
        'Login & Access History with geo-location risk flagging',
        'Active Sessions Directory with one-click remote session termination',
        'Global Security Policies (MFA enforcement, password rotation rules)'
      ],
      impact: 'Ensures zero unauthorized access, maintains forensic audit trails for SOC2/ISO27001 compliance, and safeguards tenant data.'
    }
  };

  /**
   * Opens the suite overview and capabilities info modal for the given suite key.
   * @param key The unique key identifying the suite in suiteInfoCatalog.
   * @param event Optional DOM click event to stop propagation.
   */
  openSuiteInfo(key: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const info = this.suiteInfoCatalog[key];
    if (info) {
      this.activeSuiteInfo = info;
      this.showSuiteInfoModal = true;
    }
  }

  /**
   * Closes the suite overview and capabilities modal.
   */
  closeSuiteInfoModal(): void {
    this.showSuiteInfoModal = false;
    this.activeSuiteInfo = null;
  }

  brandName = this.resolveInitialBrandName();
  currentPageTitle = 'Dashboard';

  private resolveInitialBrandName(): string {
    const saved = localStorage.getItem('tenant_name');
    if (saved && !saved.toLowerCase().includes('ozikol')) {
      return saved;
    }
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length >= 2 && parts[0] !== 'www' && parts[0] !== 'localhost' && !parts[0].toLowerCase().includes('ozikol')) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return 'Workspace';
  }

  /**
   * Central page title template synchronization: "<Page Title> | <Tenant BrandName>"
   */
  syncDocumentTitle(pageTitle?: string): void {
    if (pageTitle && pageTitle !== 'Page') {
      this.currentPageTitle = pageTitle;
    }
    const cleanBrand = (this.brandName && !this.brandName.toLowerCase().includes('ozikol'))
      ? this.brandName
      : this.resolveInitialBrandName();
    document.title = this.currentPageTitle
      ? `${this.currentPageTitle} | ${cleanBrand}`
      : `${cleanBrand} | Workspace Portal`;
  }
  brandAbbreviation = this.computeAbbreviation(localStorage.getItem('tenant_abbreviation') && localStorage.getItem('tenant_abbreviation') !== 'CC' ? localStorage.getItem('tenant_abbreviation')! : (localStorage.getItem('tenant_name') || 'Workspace'));
  brandLogoUrl = localStorage.getItem('tenant_logo') || '';
  brandIconUrl = localStorage.getItem('tenant_icon') || '';
  categoryAlias = localStorage.getItem('alias_category') || 'User Categories';
  subCategoryAlias = localStorage.getItem('alias_subcategory') || 'Sub-Categories';
  groupAlias = localStorage.getItem('alias_group') || 'Groups & Communities';
  alumniAlias = localStorage.getItem('alias_alumni') || 'Alumni';
  userFullName = localStorage.getItem('user_name') || 'Member';
  userEmail = localStorage.getItem('user_email') || '';
  userInitials = 'MB';
  get isAdmin(): boolean {
    return canAccessConsole(this.userRoles);
  }

  get isGlobalAdmin(): boolean {
    return isGlobalAdmin(this.userRoles);
  }

  showPrivilegesModal = false;

  openPrivilegesModal(): void {
    this.showPrivilegesModal = true;
  }

  closePrivilegesModal(): void {
    this.showPrivilegesModal = false;
  }

  get userRoles(): string[] {
    return getStoredUserRoles();
  }

  get userRoleBadge(): string {
    return getUserPrimaryRoleName(this.userRoles);
  }

  /**
   * Evaluates if the current authenticated user has permission to see and access a management suite.
   * If the user is not SuperAdmin or Admin (or Global Editor), ONLY the suites matching their
   * assigned role / feature scope (`BcpUserFeatureRoles`) are visible.
   * 
   * @param suiteKey - Identifier or category name of the suite
   * @returns True if the suite should be visible and accessible in the sidebar
   */
  canAccessSuite(suiteKey: string): boolean {
    const cleanKey = (suiteKey || '').trim().toLowerCase().replace(/[\s\-_,&]/g, '');

    if (this.isGlobalAdmin) {
      return true;
    }

    if (cleanKey === 'settings' || cleanKey === 'billingsubscriptions') {
      return false;
    }

    if (isGlobalEditor(this.userRoles)) {
      return true;
    }

    switch (cleanKey) {
      case 'usermanagement':
        return hasFeatureScope('usermanager', this.userRoles);
      case 'identity':
      case 'securityaudit':
      case 'compliancegovernance':
      case 'compliancelearningcertification':
      case 'academylearning':
        return hasFeatureScope('identitymanager', this.userRoles);
      case 'cms':
      case 'websitecms':
      case 'lifeeventspublications':
        return hasFeatureScope('contentmanager', this.userRoles);
      case 'formsintelligence':
      case 'reportsformsanalytics':
        return hasFeatureScope('formsmanager', this.userRoles) ||
               hasFeatureScope('contentmanager', this.userRoles);
      case 'peoplecommunity':
      case 'peoplecommunitycollaboration':
      case 'workforceshifts':
      case 'workforcerotascheduling':
      case 'communicationsupport':
      case 'communicationaisupport':
      case 'operationsworkflows':
        return hasFeatureScope('crmmanager', this.userRoles) ||
               hasFeatureScope('usermanager', this.userRoles);
      case 'eventsticketing':
      case 'eventstrainingmanagement':
        return hasFeatureScope('eventsmanager', this.userRoles);
      case 'financebanking':
      case 'financecommercialrevenue':
      case 'commercestore':
        return hasFeatureScope('storemanager', this.userRoles) ||
               hasFeatureScope('billingmanager', this.userRoles);
      case 'demographicscensus':
      case 'demographicsciviccensus':
        return hasFeatureScope('telemetrymanager', this.userRoles) ||
               hasFeatureScope('usermanager', this.userRoles);
      default:
        return hasFeatureScope(cleanKey, this.userRoles);
    }
  }

  get userCapabilities(): string[] {
    const badge = this.userRoleBadge;
    if (badge === 'SuperAdmin') {
      return [
        'Full System Executive Administration',
        'Identity & RBAC Governance',
        'Security Audit & User Forensics',
        'Emergency 2FA Bypass & Log Analysis',
        'Suite Entitlements & Feature Billing',
        'Remote Session Kill & Revocation',
        'Brand Configuration & Custom Domains',
        'CMS Studio & Template Marketplace'
      ];
    }
    if (badge === 'Administrator') {
      return [
        'User Directory & Invitation Dispatch',
        'Content CMS & Category Publishing',
        'Role Assignment & Membership Control',
        'Broadcast Studio Notifications',
        'Commerce Products & Order Management',
        'Community & Cohort Moderation',
        'Personal Workspace & Collaborative Tools',
        'Audit Log Verification'
      ];
    }
    return [
      'Personal Workspace & Profile',
      'Dynamic CV Biography Portfolio',
      'Encrypted Real-Time Chat Messenger',
      'Community Groups & Cohort Forums',
      'Alumni Directory Access',
      'Personal Order & Purchase History',
      'Two-Factor Authentication Setup',
      'Account Security & Active Session View'
    ];
  }

  get accessibleSuites(): { name: string; icon: string }[] {
    const badge = this.userRoleBadge;
    if (badge === 'SuperAdmin') {
      return [
        { name: 'Core Executive Command', icon: 'space_dashboard' },
        { name: 'Suite 00: Content CMS Studio', icon: 'dynamic_feed' },
        { name: 'Suite 01: People & Community', icon: 'groups' },
        { name: 'Suite 02: Workforce & Shifts', icon: 'calendar_month' },
        { name: 'Suite 03: Reports & Forms', icon: 'summarize' },
        { name: 'Suite 04: Events & Ticketing', icon: 'confirmation_number' },
        { name: 'Suite 05: Finance & Revenue', icon: 'account_balance_wallet' },
        { name: 'Suite 06: Operations & Logistics', icon: 'storefront' },
        { name: 'Suite 07: Communication & AI', icon: 'campaign' },
        { name: 'Suite 08: Governance & Compliance', icon: 'folder_zip' },
        { name: 'Suite 09: Demographics & Census', icon: 'map' },
        { name: 'Member Workspace Hub', icon: 'person' }
      ];
    }
    if (badge === 'Administrator') {
      return [
        { name: 'Core Executive Command', icon: 'space_dashboard' },
        { name: 'Suite 00: Content CMS Studio', icon: 'dynamic_feed' },
        { name: 'Suite 01: People & Community', icon: 'groups' },
        { name: 'Suite 06: Operations & Logistics', icon: 'storefront' },
        { name: 'Suite 07: Communication & AI', icon: 'campaign' },
        { name: 'Member Workspace Hub', icon: 'person' }
      ];
    }
    return [
      { name: 'Member Workspace Hub', icon: 'person' },
      { name: 'Community Channels & Groups', icon: 'groups' },
      { name: 'Chat Messenger', icon: 'chat' },
      { name: 'Alumni Network', icon: 'school' },
      { name: 'My Purchases & Dues', icon: 'shopping_bag' }
    ];
  }

  currentConsoleMode: 'console' | 'workspace' = (localStorage.getItem('bcp_console_mode') as any) || 'console';
  expiringFeatures: any[] = [];
  isExpirationBannerDismissed = false;

  committeeAliases: {
    aliasSingular: string;
    aliasPlural: string;
    subGroupAliasSingular: string;
    subGroupAliasPlural: string;
  } = {
    aliasSingular: 'Committee',
    aliasPlural: 'Committees',
    subGroupAliasSingular: 'Sub-Group',
    subGroupAliasPlural: 'Sub-Groups'
  };

  get isConsoleActive(): boolean {
    return this.isAdmin && this.currentConsoleMode === 'console';
  }

  setConsoleMode(mode: 'console' | 'workspace'): void {
    if (!this.isAdmin) {
      this.currentConsoleMode = 'workspace';
      return;
    }
    this.currentConsoleMode = mode;
    localStorage.setItem('bcp_console_mode', mode);

    if (mode === 'workspace' && (this.currentRoute.startsWith('/dashboard/console') || this.currentRoute.startsWith('/admin/dashboard'))) {
      this.router.navigate(['/dashboard/workspace']);
    } else if (mode === 'console' && (this.currentRoute.startsWith('/dashboard/workspace') || this.currentRoute.startsWith('/users/workspace/dashboard'))) {
      this.router.navigate(['/dashboard/console']);
    }
  }

  toggleConsoleMode(): void {
    const next = this.currentConsoleMode === 'console' ? 'workspace' : 'console';
    this.setConsoleMode(next);
  }

  private getExpirationBannerStorageKey(): string {
    const tKey = (this.tenantKey || localStorage.getItem('tenant_key') || 'workspace').toLowerCase();
    return `bcp_exp_banner_dismissed_${tKey}`;
  }

  private computeExpirationFingerprint(items: any[]): string {
    if (!Array.isArray(items) || items.length === 0) return '';
    return items
      .map(f => `${f.featureCode || f.featureName}:${f.daysRemaining ?? 0}`)
      .sort()
      .join('|');
  }

  checkExpirationBannerDismissal(): void {
    try {
      const raw = localStorage.getItem(this.getExpirationBannerStorageKey());
      if (!raw) {
        this.isExpirationBannerDismissed = false;
        return;
      }
      const parsed = JSON.parse(raw);
      const dismissedAt = Number(parsed?.dismissedAt || 0);
      const savedFp = String(parsed?.fingerprint || '');
      const currentFp = this.computeExpirationFingerprint(this.expiringFeatures);
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;

      // Re-show the banner if 24 hours have passed OR if the expiring feature list / remaining days changed
      if (!dismissedAt || (Date.now() - dismissedAt) >= twentyFourHoursMs || (savedFp && savedFp !== currentFp)) {
        this.isExpirationBannerDismissed = false;
      } else {
        this.isExpirationBannerDismissed = true;
      }
    } catch {
      this.isExpirationBannerDismissed = false;
    }
  }

  /**
   * Dismisses the top-of-page expiration banner for 24 hours.
   * Automatically re-displays after 24 hours if capabilities are still within 30 days of expiring.
   */
  dismissExpirationBanner(): void {
    this.isExpirationBannerDismissed = true;
    try {
      localStorage.setItem(
        this.getExpirationBannerStorageKey(),
        JSON.stringify({
          dismissedAt: Date.now(),
          fingerprint: this.computeExpirationFingerprint(this.expiringFeatures)
        })
      );
    } catch {}
  }

  loadFeatureExpirations(): void {
    if (!this.isGlobalAdmin) return;
    this.api.get<any>('SettingsApi/feature-expirations').subscribe({
      next: (res) => {
        if (res && res.isSuccess && Array.isArray(res.data)) {
          this.expiringFeatures = res.data.filter((f: any) =>
            (Number(f.renewalPrice) > 0 || f.isTrialPeriod) &&
            f.daysRemaining !== null && f.daysRemaining !== undefined
          );
          this.checkExpirationBannerDismissal();
          this.loadNotificationFeed();
        }
      },
      error: () => {
        this.expiringFeatures = [];
      }
    });
  }

  getTotalExpirationAmountDue(): number {
    if (!this.expiringFeatures || this.expiringFeatures.length === 0) return 0;
    return this.expiringFeatures.reduce((sum, f) => sum + (Number(f.renewalPrice) || 0), 0);
  }

  getExpirationCurrencySymbol(): string {
    if (!this.expiringFeatures || this.expiringFeatures.length === 0) return '$';
    const first = this.expiringFeatures.find(f => f.currencySymbol);
    return first?.currencySymbol || '$';
  }

  getExpirationBannerText(): string {
    if (!this.expiringFeatures || this.expiringFeatures.length === 0) return '';
    const count = this.expiringFeatures.length;
    const minDays = Math.min(...this.expiringFeatures.map(f => f.daysRemaining ?? 0));
    if (count === 1) {
      const f = this.expiringFeatures[0];
      const name = f.featureName || f.featureCode;
      const typeLabel = f.isTrialPeriod ? 'free trial' : 'capability subscription';
      if (minDays < 0) {
        return `${name} ${typeLabel} is ${Math.abs(minDays)} day${Math.abs(minDays) === 1 ? '' : 's'} overdue. Renew immediately to restore full feature access.`;
      }
      if (minDays === 0) {
        return `${name} ${typeLabel} expires today. Renew immediately to maintain uninterrupted platform capabilities.`;
      }
      return `${name} ${typeLabel} expires in ${minDays} day${minDays === 1 ? '' : 's'}. Renew to maintain uninterrupted platform capabilities.`;
    }

    if (minDays <= 0) {
      return `${count} workspace capabilities are expiring or overdue (within 30 days). Review the list below and complete renewal payment.`;
    }
    return `${count} workspace capabilities are expiring within 30 days (soonest in ${minDays} day${minDays === 1 ? '' : 's'}). Review the list below to renew.`;
  }

  showHelpModal = false;
  showFirstRunModal = false;

  currentRoute = '/admin/dashboard';
  websiteMode: string = localStorage.getItem('tenant_website_mode') || 'standard';
  customDomain: string = localStorage.getItem('tenant_custom_domain') || '';
  primaryDomain: string = localStorage.getItem('tenant_primary_domain') || '';
  websiteUrl: string = localStorage.getItem('tenant_website_url') || '';
  tenantKey: string = localStorage.getItem('tenant_key') || '';

  get hasCustomDomain(): boolean {
    return !!(this.customDomain && this.customDomain.trim());
  }

  formatDomainUrl(domainOrUrl: string): string {
    if (!domainOrUrl) return '';
    const trimmed = domainOrUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    const isLocal = trimmed.includes('localhost') || trimmed.includes('127.0.0.1');
    return `${isLocal ? 'http://' : 'https://'}${trimmed}`;
  }

  get liveWebsiteUrl(): string {
    if (this.hasCustomDomain) {
      return this.formatDomainUrl(this.customDomain);
    }
    if (this.websiteUrl && this.websiteUrl.trim()) {
      return this.formatDomainUrl(this.websiteUrl);
    }
    if (this.primaryDomain && this.primaryDomain.trim()) {
      return this.formatDomainUrl(this.primaryDomain);
    }
    return window.location.origin;
  }
  openTabs: TaskTab[] = [
    { title: 'Dashboard', url: '/admin/dashboard', icon: 'dashboard', closable: false }
  ];

  pinnedItems: PinnedItem[] = [];
  notificationFeed: any[] = [];
  unreadNotifCount = 0;

  sidebarForms: any[] = [
    { title: 'Contact Us', formKey: 'contact-us', newSubmissions: 0 },
    { title: 'Service Requests', formKey: 'service-request', newSubmissions: 0 },
    { title: 'Newsletter', formKey: 'newsletter', newSubmissions: 0 }
  ];

  openMenus: { [key: string]: boolean } = {};
  activeDropdown: string | null = null;

  public isAiOpen: boolean = false;
  public aiLayoutMode: 'floating' | 'docked-right' | 'docked-bottom' | 'minimized' = 'docked-right';

  constructor(
    private api: ApiService, 
    private router: Router, 
    private toast: ToastService,
    private signalR: SignalRService,
    private aiAssistantService: AiAssistantContextService,
    public translation: TranslationService,
    private multiWorkspace: MultiWorkspaceService,
    private committeesService: CommitteesService,
    private cdr: ChangeDetectorRef
  ) {}

  /// <summary>
  /// Gets all enrolled workspace sessions stored in the browser's persistent storage.
  /// </summary>
  public get enrolledWorkspaces(): EnrolledWorkspaceSession[] {
    return this.multiWorkspace.getEnrolledWorkspaces();
  }

  /// <summary>
  /// Gets other enrolled workspace sessions with active tokens excluding the currently active workspace.
  /// </summary>
  public get otherActiveWorkspaces(): EnrolledWorkspaceSession[] {
    const cur = (this.tenantKey || localStorage.getItem('tenant_key') || '').toLowerCase();
    return this.enrolledWorkspaces.filter(w => w.tenantKey.toLowerCase() !== cur && !!w.authToken);
  }

  /// <summary>
  /// Gets total count of active authenticated workspaces.
  /// </summary>
  public get activeWorkspacesCount(): number {
    return this.enrolledWorkspaces.filter(w => !!w.authToken).length;
  }

  public get currentLang(): SupportedLanguage {
    return this.translation.currentLanguage;
  }

  public get currentLangOption(): LanguageOption {
    return this.translation.currentLanguageOption;
  }

  public get supportedLanguages(): LanguageOption[] {
    return this.translation.supportedLanguages;
  }

  public pendingLanguage: LanguageOption | null = null;
  public showLanguageConfirmModal = false;

  public selectLanguage(lang: SupportedLanguage): void {
    if (lang === this.currentLang) return;
    const target = this.supportedLanguages.find(l => l.code === lang);
    if (!target) return;
    this.pendingLanguage = target;
    this.showLanguageConfirmModal = true;
  }

  public confirmLanguageChange(): void {
    if (this.pendingLanguage) {
      this.translation.setLanguage(this.pendingLanguage.code);
    }
    this.showLanguageConfirmModal = false;
    this.pendingLanguage = null;
  }

  public cancelLanguageChange(): void {
    this.showLanguageConfirmModal = false;
    this.pendingLanguage = null;
  }

  ngOnInit(): void {
    // Subscribe to global AI assistant layout and open state
    this.aiAssistantService.isOpen$.subscribe(open => this.isAiOpen = open);
    this.aiAssistantService.layoutMode$.subscribe(mode => this.aiLayoutMode = mode);
    // Subscribe to dynamic Committee & Sub-Group aliases
    this.committeeAliasesSub = this.committeesService.aliases$.subscribe(aliases => {
      if (aliases) {
        this.committeeAliases = {
          aliasSingular: aliases.aliasSingular || 'Committee',
          aliasPlural: aliases.aliasPlural || 'Committees',
          subGroupAliasSingular: aliases.subGroupAliasSingular || 'Sub-Group',
          subGroupAliasPlural: aliases.subGroupAliasPlural || 'Sub-Groups'
        };
        this.cdr.markForCheck();
      }
    });

    // Also load fresh settings from backend if committees module is accessible
    this.committeesService.getSettings().subscribe({
      next: (res) => {
        if (res?.isSuccess && res.data) {
          this.committeesService.applyAliases(res.data);
        }
      },
      error: () => {}
    });

    // 1. Live verify and refresh session against backend DB
    this.verifyAndRefreshSession();

    // 2. Real-time SignalR security & branding listener
    this.signalR.startConnection();
    this.signalR.permissionUpdated$.subscribe((data) => {
      console.log('[AdminLayout] Live real-time permission update received via SignalR -> Syncing session...', data);
      this.verifyAndRefreshSession();
    });

    this.signalR.sessionRevoked$.subscribe((data: any) => {
      console.log('[AdminLayout] Live real-time session revocation received via SignalR:', data);
      const token = localStorage.getItem('access_token');
      if (token && data?.terminatedJwtIds?.length) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const myJti = payload?.jti;
          if (myJti && data.terminatedJwtIds.includes(myJti)) {
            console.warn('[AdminLayout] Current session JTI was terminated remotely. Logging out immediately...');
            this.toast.warning('Your session was terminated remotely from another device. Please sign in again.', 'Session Terminated');
            localStorage.removeItem('access_token');
            this.router.navigate(['/auth/login'], { queryParams: { sessionTerminated: 'true' } });
            return;
          }
        } catch {}
      }
    });

    this.signalR.brandUpdated$.subscribe((data: any) => {
      console.log('[AdminLayout] Live real-time brand update received via SignalR -> Syncing brand...', data);
      if (data) {
        if (data.companyName) {
          this.brandName = data.companyName;
          localStorage.setItem('tenant_name', data.companyName);
          this.syncDocumentTitle();
        }
        if (data.companyNameAbbreviation) {
          this.brandAbbreviation = data.companyNameAbbreviation;
          localStorage.setItem('tenant_abbreviation', data.companyNameAbbreviation);
        } else if (data.companyName) {
          this.brandAbbreviation = this.computeAbbreviation(data.companyName);
          localStorage.setItem('tenant_abbreviation', this.brandAbbreviation);
        }
        if (data.companyLogoUrl !== undefined) {
          this.brandLogoUrl = data.companyLogoUrl || '';
          if (this.brandLogoUrl) localStorage.setItem('tenant_logo', this.brandLogoUrl);
          else localStorage.removeItem('tenant_logo');
        }
        if (data.companyIconUrl !== undefined) {
          this.brandIconUrl = data.companyIconUrl || '';
          if (this.brandIconUrl) localStorage.setItem('tenant_icon', this.brandIconUrl);
          else localStorage.removeItem('tenant_icon');
        }
      }
    });

    this.signalR.aliasesUpdated$.subscribe((data: any) => {
      this.loadTerminologyAliases(data);
    });

    // Check saved theme
    const savedTheme = localStorage.getItem('bcp_theme');
    if (savedTheme === 'dark') {
      this.darkMode = true;
      document.body.classList.add('dark-mode');
    }

    // Check saved pinned items
    const savedPinned = localStorage.getItem('bcp_pinned_items');
    if (savedPinned) {
      try { this.pinnedItems = JSON.parse(savedPinned); } catch {}
    }

    // Initialize current route and active menus
    this.currentRoute = this.router.url;
    this.updateActiveMenu(this.currentRoute);
    this.handleRouteTab(this.currentRoute);

    // Auto-collapse navigation sidebar on mobile screens (<= 900px)
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      this.sidebarCollapsed = true;
      document.body.classList.add('sidebar-closed');
    }

    // Track router changes for dynamic tabs, active sidebar menu, and auto-closing mobile sidebar
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.currentRoute = e.urlAfterRedirects || e.url;
      this.updateActiveMenu(this.currentRoute);
      this.handleRouteTab(this.currentRoute);
      if (typeof window !== 'undefined' && window.innerWidth <= 900) {
        this.closeSidebarMobile();
      }
    });

    this.loadTenantInfo();
    this.loadNotificationFeed();
    this.loadSidebarForms();
    this.loadActiveBillingFeatures();
    this.checkFirstRunSetupStatus();

    if (this.isAdmin) {
      this.loadFeatureExpirations();
    }

    // Listen for real-time SignalR billing/feature updates from Central or tenant billing console
    this.signalR.billingUpdated$.subscribe((incoming: any) => {
      if (incoming && (incoming.included || incoming.subscribed || incoming.available)) {
        this.applyBillingSnapshot(incoming);
      } else {
        this.loadActiveBillingFeatures();
      }
    });

    // Listen for instant feature activation/deactivation from /billing/features
    window.addEventListener('tenant_features_updated', (e: any) => {
      if (e?.detail && (e.detail.included || e.detail.subscribed || e.detail.available)) {
        this.applyBillingSnapshot(e.detail);
      } else {
        this.loadActiveBillingFeatures();
      }
    });

    // Listen for live brand settings updates from the Settings page
    window.addEventListener('brand_settings_updated', () => {
      this.loadTenantInfo();
    });

    // Listen for dynamic tenant domain updates from the Domain Settings suite
    window.addEventListener('tenant_domain_updated', (e: any) => {
      if (e?.detail) {
        this.customDomain = e.detail.customDomain || '';
        if (this.customDomain) {
          localStorage.setItem('tenant_custom_domain', this.customDomain);
        } else {
          localStorage.removeItem('tenant_custom_domain');
        }
      }
    });

    // Listen for dynamic forms changes from Manage Forms suite
    window.addEventListener('forms_updated', () => {
      this.loadSidebarForms();
    });
  }

  /**
   * Baseline published capability codes before the first billing snapshot sync completes.
   * Features that are not installed are excluded from sidebar display.
   */
  private static readonly DEFAULT_PUBLISHED_FEATURE_CODES: string[] = [];

  /**
   * Baseline available capability codes before the first billing snapshot sync completes.
   */
  private static readonly DEFAULT_AVAILABLE_FEATURE_CODES: string[] = [];

  /**
   * Canonical short sidebar MenuTitle lookup by FeatureCode (matching MasterFeatureCatalogs.MenuTitle).
   */
  private static readonly DEFAULT_FEATURE_MENU_TITLES: Record<string, string> = {
    'bcp-community-messenger': 'Chat Messenger',
    'bcp-committees': 'Groups & Committees',
    'bcp-alumni-directory': 'Alumni Network',
    'bcp-whistleblowing': 'Whistleblowing',
    'bcp-staff-rota': 'Staff Rota & Shifts',
    'bcp-attendance-tracking': 'Attendance & Clock-In',
    'bcp-appointment-booking': 'Appointment Booking',
    'bcp-calendar-followups': 'Calendar & Follow-Ups',
    'bcp-interval-reporting': 'Interval Reports',
    'bcp-form-builder': 'Form Builder',
    'bcp-survey-analytics': 'Surveys & Polls',
    'bcp-reference-forms': 'Reference Forms',
    'bcp-event-ticketing': 'Events & Ticketing',
    'bcp-speaker-sessions': 'Speakers & Sessions',
    'bcp-attendee-management': 'Attendee Check-In',
    'bcp-invoicing-dues': 'Invoicing & Dues',
    'bcp-store-ecommerce': 'Commerce Studio',
    'bcp-proposal-pipeline': 'Proposals & Pipeline',
    'bcp-grant-ledger': 'Grants & Donations',
    'bcp-embedded-banking': 'Embedded Banking',
    'bcp-recruitment-hiring': 'Recruitment & Hiring',
    'bcp-elections-evoting': 'Elections & E-Voting',
    'bcp-equipment-fleet': 'Equipment & Logistics',
    'bcp-company-assets': 'Company Assets',
    'bcp-project-tasks': 'Projects & Tasks',
    'bcp-ai-smart-assist': 'AI Smart Assist',
    'bcp-mass-communication': 'Broadcasts & Alerts',
    'bcp-helpdesk-support': 'Helpdesk & Support',
    'bcp-live-chat': 'Live Chat Widget',
    'bcp-social-media': 'Social Publisher',
    'bcp-bio-link': 'Bio Link Pages',
    'bcp-gocall-ai': 'GoCall Video & Voice',
    'bcp-document-management': 'Document Vault',
    'bcp-learning-management': 'Courses & LMS',
    'bcp-certificate-verification': 'Certificates & Badges',
    'bcp-visitor-gate': 'Visitor & Gate Pass',
    'bcp-kyc-verification': 'KYC & Verification',
    'bcp-community-census': 'Community Census',
    'bcp-field-surveyor': 'Field Surveyor App',
    'bcp-resident-id-cards': 'Digital ID Cards',
    'bcp-demographic-analytics': 'Demographic Analytics',
    'bcp-digital-memorials': 'Digital Memorials',
    'bcp-wedding-portals': 'Wedding & Celebrations',
    'bcp-digital-brochures': 'Digital Brochures',
    'bcp-workspace': 'Workspace (Desktop only)'
  };

  /**
   * Canonical short sidebar section header MenuTitle lookup by Suite Full Name (matching MasterFeatureSuites.MenuTitle).
   */
  private static readonly DEFAULT_SUITE_MENU_TITLES: Record<string, string> = {
    'People, Community & Collaboration': 'People & Community',
    'Workforce, Rota & Scheduling': 'Workforce & Shifts',
    'Reports, Forms & Analytics': 'Reports & Forms',
    'Events & Training Management': 'Events & Ticketing',
    'Finance & Commercial Revenue': 'Finance & Commerce',
    'Operations & Workflows': 'Operations & Workflows',
    'Communication, AI & Support': 'Communication & AI',
    'Compliance, Learning & Certification': 'Compliance & Learning',
    'Demographics & Civic Census': 'Demographics & Census',
    'Life Events & Publications': 'Life Events & Media',
    'Workspace': 'Workspace'
  };

  /**
   * Dynamic map of FeatureCode -> concise Sidebar MenuTitle loaded from the Master Catalog billing snapshot.
   */
  featureMenuTitles: Record<string, string> = { ...AdminLayoutComponent.DEFAULT_FEATURE_MENU_TITLES };

  /**
   * Dynamic map of FeatureCode -> Full Feature Name loaded from the Master Catalog billing snapshot.
   */
  featureFullTitles: Record<string, string> = {};

  /**
   * Dynamic map of Suite Full Name -> concise Sidebar Section Header MenuTitle loaded from the Master Catalog billing snapshot.
   */
  suiteMenuTitles: Record<string, string> = { ...AdminLayoutComponent.DEFAULT_SUITE_MENU_TITLES };

  /**
   * Resolves the concise sidebar menu label for a modular capability so sidebar items never truncate with "...".
   * @param featureCode Canonical feature code (e.g. 'bcp-community-messenger').
   * @param fallback Fallback label if not yet loaded.
   * @returns Concise sidebar menu label.
   */
  getFeatureMenuTitle(featureCode: string, fallback: string = ''): string {
    if (!featureCode) return this.translation.translateDynamic(fallback);
    const key = featureCode.toLowerCase();
    const raw = this.featureMenuTitles[key] || AdminLayoutComponent.DEFAULT_FEATURE_MENU_TITLES[key] || fallback;
    return this.translation.translateDynamic(raw);
  }

  /**
   * Resolves the full descriptive title for a modular capability (used in the Locked/Coming Soon modal and Feature Details page).
   * @param featureCode Canonical feature code (e.g. 'bcp-community-messenger').
   * @param fallback Fallback full title if not yet loaded.
   * @returns Full descriptive capability title.
   */
  getFeatureFullTitle(featureCode: string, fallback: string = ''): string {
    if (!featureCode) return this.translation.translateDynamic(fallback);
    const key = featureCode.toLowerCase();
    const raw = this.featureFullTitles[key] || fallback;
    return this.translation.translateDynamic(raw);
  }

  /**
   * Resolves the concise uppercase sidebar section header label for a feature suite.
   * @param suiteFullTitle Canonical suite full name (e.g. 'Suite A: People, Community & Collaboration').
   * @param fallback Fallback uppercase suite header label.
   * @returns Concise sidebar section header label.
   */
  getSuiteMenuTitle(suiteFullTitle: string, fallback: string = ''): string {
    if (!suiteFullTitle) return this.translation.translateDynamic(fallback);
    const raw = this.suiteMenuTitles[suiteFullTitle] || AdminLayoutComponent.DEFAULT_SUITE_MENU_TITLES[suiteFullTitle] || fallback;
    return this.translation.translateDynamic(raw);
  }

  /**
   * Set of lowercase FeatureCodes that are visible to the tenant in the sidebar navigation menu.
   * Only features that are Installed & Active OR Installed but Expired are included.
   * Features that are Not Installed are excluded from the sidebar.
   */
  visibleFeatureCodes: Set<string> = new Set<string>(
    (() => {
      try {
        const raw = localStorage.getItem('bcp_visible_feature_codes_v6');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
        return [];
      } catch {
        return [];
      }
    })()
  );

  /**
   * Set of lowercase FeatureCodes that are Available for use (either via general availability or custom tenant availability).
   */
  availableFeatureCodes: Set<string> = new Set<string>(
    (() => {
      try {
        const raw = localStorage.getItem('bcp_available_feature_codes_v6');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
        return AdminLayoutComponent.DEFAULT_AVAILABLE_FEATURE_CODES;
      } catch {
        return AdminLayoutComponent.DEFAULT_AVAILABLE_FEATURE_CODES;
      }
    })()
  );

  /**
   * Set of lowercase FeatureCodes that are currently installed and active for the tenant workspace.
   */
  activeFeatureCodes: Set<string> = new Set<string>(
    (() => {
      try {
        const raw = localStorage.getItem('bcp_active_feature_codes');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })()
  );

  /**
   * Set of lowercase FeatureCodes that were installed but have expired (displaying the lock icon).
   */
  expiredFeatureCodes: Set<string> = new Set<string>(
    (() => {
      try {
        const raw = localStorage.getItem('bcp_expired_feature_codes_v2');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })()
  );

  /**
   * Canonical baseline sidebar suites and their default feature order before or alongside live snapshot sync.
   */
  private static readonly DEFAULT_SIDEBAR_SUITES: Array<{
    categoryName: string;
    defaultMenuTitle: string;
    suiteAccessKey?: string;
    infoKey?: string;
    infoTitleKey?: string;
    infoTitleFallback?: string;
    suiteSortOrder: number;
    featureCodes: string[];
  }> = [
    {
      categoryName: 'People, Community & Collaboration',
      defaultMenuTitle: 'People & Community',
      suiteAccessKey: 'people_community',
      infoKey: 'people_community',
      infoTitleKey: 'adm.people_community_overview',
      infoTitleFallback: 'People & Community Overview',
      suiteSortOrder: 1,
      featureCodes: ['bcp-community-messenger', 'bcp-committees', 'bcp-alumni-directory', 'bcp-whistleblowing']
    },
    {
      categoryName: 'Workforce, Rota & Scheduling',
      defaultMenuTitle: 'Workforce & Shifts',
      infoKey: 'workforce_shifts',
      infoTitleKey: 'adm.workforce_shifts_overview',
      infoTitleFallback: 'Workforce & Shifts Overview',
      suiteSortOrder: 2,
      featureCodes: ['bcp-staff-rota', 'bcp-attendance-tracking', 'bcp-appointment-booking', 'bcp-calendar-followups']
    },
    {
      categoryName: 'Reports, Forms & Analytics',
      defaultMenuTitle: 'Reports & Forms',
      infoKey: 'forms_intelligence',
      infoTitleKey: 'adm.forms_intelligence_overview',
      infoTitleFallback: 'Forms & Intelligence Overview',
      suiteSortOrder: 3,
      featureCodes: ['bcp-interval-reporting', 'bcp-form-builder', 'bcp-survey-analytics', 'bcp-reference-forms']
    },
    {
      categoryName: 'Events & Training Management',
      defaultMenuTitle: 'Events & Ticketing',
      infoKey: 'events_ticketing',
      infoTitleKey: 'adm.events_ticketing_overview',
      infoTitleFallback: 'Events & Ticketing Overview',
      suiteSortOrder: 4,
      featureCodes: ['bcp-event-ticketing', 'bcp-speaker-sessions', 'bcp-attendee-management']
    },
    {
      categoryName: 'Finance & Commercial Revenue',
      defaultMenuTitle: 'Finance & Commerce',
      infoKey: 'finance_banking',
      infoTitleKey: 'adm.finance_banking_overview',
      infoTitleFallback: 'Finance & Banking Overview',
      suiteSortOrder: 5,
      featureCodes: ['bcp-invoicing-dues', 'bcp-store-ecommerce', 'bcp-proposal-pipeline', 'bcp-grant-ledger', 'bcp-embedded-banking']
    },
    {
      categoryName: 'Operations & Workflows',
      defaultMenuTitle: 'Operations & Workflows',
      suiteSortOrder: 6,
      featureCodes: ['bcp-recruitment-hiring', 'bcp-elections-evoting', 'bcp-equipment-fleet', 'bcp-company-assets', 'bcp-project-tasks']
    },
    {
      categoryName: 'Communication, AI & Support',
      defaultMenuTitle: 'Communication & AI',
      infoKey: 'communication_support',
      infoTitleKey: 'adm.communication_support_overview',
      infoTitleFallback: 'Communication & Support Overview',
      suiteSortOrder: 7,
      featureCodes: ['bcp-ai-smart-assist', 'bcp-mass-communication', 'bcp-helpdesk-support', 'bcp-live-chat', 'bcp-social-media', 'bcp-bio-link', 'bcp-gocall-ai']
    },
    {
      categoryName: 'Compliance, Learning & Certification',
      defaultMenuTitle: 'Compliance & Learning',
      infoKey: 'compliance_governance',
      infoTitleKey: 'adm.compliance_governance_overview',
      infoTitleFallback: 'Compliance & Governance Overview',
      suiteSortOrder: 8,
      featureCodes: ['bcp-document-management', 'bcp-learning-management', 'bcp-certificate-verification', 'bcp-visitor-gate', 'bcp-kyc-verification']
    },
    {
      categoryName: 'Demographics & Civic Census',
      defaultMenuTitle: 'Demographics & Census',
      infoKey: 'demographics_census',
      infoTitleKey: 'adm.demographics_census_overview',
      infoTitleFallback: 'Demographics & Census Overview',
      suiteSortOrder: 9,
      featureCodes: ['bcp-community-census', 'bcp-field-surveyor', 'bcp-resident-id-cards', 'bcp-demographic-analytics']
    },
    {
      categoryName: 'Life Events & Publications',
      defaultMenuTitle: 'Life Events & Media',
      suiteSortOrder: 10,
      featureCodes: ['bcp-digital-memorials', 'bcp-wedding-portals', 'bcp-digital-brochures']
    },
    {
      categoryName: 'Workspace',
      defaultMenuTitle: 'Workspace',
      suiteSortOrder: 11,
      featureCodes: ['bcp-workspace']
    }
  ];

  /**
   * Dynamically ordered sidebar suites and feature codes respecting MasterFeatureSuites.SortOrder and MasterFeatureCatalogs.SortOrder.
   */
  orderedSidebarSuites: Array<{
    categoryName: string;
    defaultMenuTitle: string;
    suiteAccessKey?: string;
    infoKey?: string;
    infoTitleKey?: string;
    infoTitleFallback?: string;
    suiteSortOrder: number;
    featureCodes: string[];
  }> = (() => {
    try {
      const raw = localStorage.getItem('bcp_ordered_sidebar_suites_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return AdminLayoutComponent.DEFAULT_SIDEBAR_SUITES.map(s => ({ ...s, featureCodes: [...s.featureCodes] }));
    } catch {
      return AdminLayoutComponent.DEFAULT_SIDEBAR_SUITES.map(s => ({ ...s, featureCodes: [...s.featureCodes] }));
    }
  })();

  /**
   * Controls the "Feature Not Active / Coming Soon" modal when a user clicks a non-active capability in the sidebar.
   */
  showLockedFeatureModal = false;
  lockedFeatureCode = '';
  lockedFeatureTitle = '';
  lockedFeatureIsAvailable = true;

  /**
   * Applies a BillingFeaturesSnapshot payload to update visibleFeatureCodes, availableFeatureCodes, activeFeatureCodes,
   * dynamic sidebar MenuTitles, and dynamic Suite + Feature SortOrder strictly from Central Master DB.
   * @param d BillingFeaturesSnapshot payload.
   */
  applyBillingSnapshot(d: any): void {
    if (!d) return;
    const all = [
      ...(d.included || []),
      ...(d.subscribed || []),
      ...(d.available || [])
    ];
    const visible = new Set<string>();
    const available = new Set<string>();
    const active = new Set<string>();
    const expired = new Set<string>();

    const suiteMap = new Map<string, {
      categoryName: string;
      defaultMenuTitle: string;
      suiteAccessKey?: string;
      infoKey?: string;
      infoTitleKey?: string;
      infoTitleFallback?: string;
      suiteSortOrder: number;
      features: Array<{ code: string; sortOrder: number }>;
    }>();

    // Seed baseline metadata lookup
    const defaultMetaByCat = new Map<string, typeof AdminLayoutComponent.DEFAULT_SIDEBAR_SUITES[0]>();
    for (const def of AdminLayoutComponent.DEFAULT_SIDEBAR_SUITES) {
      defaultMetaByCat.set(def.categoryName.toLowerCase(), def);
    }

    const dynamicTexts: string[] = [
      ...Object.values(AdminLayoutComponent.DEFAULT_FEATURE_MENU_TITLES),
      ...Object.values(AdminLayoutComponent.DEFAULT_SUITE_MENU_TITLES)
    ];

    for (const item of all) {
      if (!item || !item.featureCode) continue;
      const code = String(item.featureCode).toLowerCase();
      if (item.menuTitle) {
        this.featureMenuTitles[code] = String(item.menuTitle);
        dynamicTexts.push(String(item.menuTitle));
      }
      if (item.name) {
        this.featureFullTitles[code] = String(item.name);
        dynamicTexts.push(String(item.name));
      }
      if (item.description) {
        dynamicTexts.push(String(item.description));
      }
      const catName = String(item.category || 'Operations').trim();
      if (catName) {
        dynamicTexts.push(catName);
      }
      if (catName && item.suiteMenuTitle) {
        this.suiteMenuTitles[catName] = String(item.suiteMenuTitle);
        dynamicTexts.push(String(item.suiteMenuTitle));
      }
      if (item.isPublished === false) {
        continue;
      }
      if (item.isAvailableForUse === true) {
        available.add(code);
      }

      // Feature Visibility & Lock Architecture:
      // - Features that are Not Installed (!item.isActive && !isExpired) MUST NOT show in the sidebar.
      // - Features that are Installed & Active show normally (clickable, unlocked).
      // - Features that were Installed but are now Expired show in the sidebar with a Lock icon [lock].
      // - Deactivated / uninstalled capabilities (status === 'Suspended') are NOT expired and MUST NOT show in the sidebar.
      // - isPublished means it appears in Central Subscription Dashboard (/billing/features) so the tenant can install it.
      const isInstalledActive = Boolean(item.isActive && item.isAvailableForUse === true);
      const isInstalledExpired = !isInstalledActive && String(item.status || '').trim().toLowerCase() === 'expired';

      if (isInstalledActive) {
        active.add(code);
        visible.add(code);
      } else if (isInstalledExpired) {
        expired.add(code);
        visible.add(code);
      }

      const catKey = catName.toLowerCase();
      const defMeta = defaultMetaByCat.get(catKey);
      const suiteOrder = (typeof item.suiteSortOrder === 'number' && item.suiteSortOrder > 0)
        ? item.suiteSortOrder
        : (defMeta?.suiteSortOrder ?? 99);
      const featOrder = (typeof item.sortOrder === 'number' && item.sortOrder > 0)
        ? item.sortOrder
        : 999;

      let group = suiteMap.get(catKey);
      if (!group) {
        group = {
          categoryName: catName,
          defaultMenuTitle: item.suiteMenuTitle || defMeta?.defaultMenuTitle || catName,
          suiteAccessKey: defMeta?.suiteAccessKey,
          infoKey: defMeta?.infoKey,
          infoTitleKey: defMeta?.infoTitleKey,
          infoTitleFallback: defMeta?.infoTitleFallback,
          suiteSortOrder: suiteOrder,
          features: []
        };
        suiteMap.set(catKey, group);
      } else if (suiteOrder < group.suiteSortOrder) {
        group.suiteSortOrder = suiteOrder;
      }

      if (!group.features.some(f => f.code === code)) {
        group.features.push({ code, sortOrder: featOrder });
      }
    }

    if (suiteMap.size > 0) {
      const sortedSuites = Array.from(suiteMap.values())
        .sort((a, b) => a.suiteSortOrder - b.suiteSortOrder)
        .map(g => ({
          categoryName: g.categoryName,
          defaultMenuTitle: g.defaultMenuTitle,
          suiteAccessKey: g.suiteAccessKey,
          infoKey: g.infoKey,
          infoTitleKey: g.infoTitleKey,
          infoTitleFallback: g.infoTitleFallback,
          suiteSortOrder: g.suiteSortOrder,
          featureCodes: g.features
            .sort((x, y) => x.sortOrder - y.sortOrder)
            .map(x => x.code)
        }));
      this.orderedSidebarSuites = sortedSuites;
      localStorage.setItem('bcp_ordered_sidebar_suites_v1', JSON.stringify(sortedSuites));
    }

    this.visibleFeatureCodes = visible;
    this.availableFeatureCodes = available;
    this.activeFeatureCodes = active;
    this.expiredFeatureCodes = expired;
    localStorage.setItem('bcp_visible_feature_codes_v6', JSON.stringify(Array.from(visible)));
    localStorage.setItem('bcp_available_feature_codes_v6', JSON.stringify(Array.from(available)));
    localStorage.setItem('bcp_active_feature_codes', JSON.stringify(Array.from(active)));
    localStorage.setItem('bcp_expired_feature_codes_v2', JSON.stringify(Array.from(expired)));
    localStorage.removeItem('bcp_visible_feature_codes_v5');
    localStorage.removeItem('bcp_available_feature_codes_v5');
    localStorage.removeItem('bcp_expired_feature_codes');
    localStorage.removeItem('bcp_visible_feature_codes_v4');
    localStorage.removeItem('bcp_available_feature_codes_v4');
    if (Array.isArray(d.notices)) {
      this.expiringFeatures = d.notices.filter((f: any) =>
        (Number(f.renewalPrice) > 0 || f.isTrialPeriod) &&
        f.daysRemaining !== null && f.daysRemaining !== undefined
      );
      this.checkExpirationBannerDismissal();
    }
    this.translation.registerDynamicCatalogStrings(dynamicTexts);
  }

  /**
   * Fetches the tenant's published features from the Master Catalog billing snapshot
   * and updates sidebar visibility, availability, and lock states in real time.
   */
  loadActiveBillingFeatures(): void {
    this.api.get<any>('billing/features').subscribe({
      next: (res) => {
        if (res && (res.success || res.isSuccess) && res.data) {
          this.applyBillingSnapshot(res.data);
        }
      },
      error: () => {}
    });
  }

  /**
   * Checks whether a modular capability is visible to the tenant (Published in Central).
   * @param featureCode Canonical feature code (e.g. 'bcp-committees').
   * @returns True when the feature should appear in the sidebar.
   */
  isFeatureVisible(featureCode: string): boolean {
    if (!featureCode) return false;
    return this.visibleFeatureCodes.has(featureCode.toLowerCase());
  }

  /**
   * Checks whether at least one of the specified modular capability codes is visible to the tenant.
   * @param featureCodes Array of canonical feature codes belonging to the suite.
   * @returns True when one or more features in the list are visible.
   */
  isAnyFeatureVisible(featureCodes: string[]): boolean {
    if (!featureCodes || featureCodes.length === 0) return false;
    return featureCodes.some(code => this.isFeatureVisible(code));
  }

  /**
   * Checks whether a modular capability is Available for use (either via general Central release or custom tenant release).
   * When false, the feature is displayed with a "SOON" badge in the sidebar.
   * @param featureCode Canonical feature code (e.g. 'bcp-committees').
   * @returns True when the feature is available to be installed and activated.
   */
  isFeatureAvailable(featureCode: string): boolean {
    if (!featureCode) return false;
    return this.availableFeatureCodes.has(featureCode.toLowerCase());
  }

  /**
   * Checks whether at least one of the specified modular capability codes is Available for use.
   * @param featureCodes Array of canonical feature codes belonging to the group.
   * @returns True when one or more features in the list are available for use.
   */
  isAnyFeatureAvailable(featureCodes: string[]): boolean {
    if (!featureCodes || featureCodes.length === 0) return false;
    return featureCodes.some(code => this.isFeatureAvailable(code));
  }

  /**
   * Checks whether a specific modular capability code is currently installed and active for the tenant.
   * @param featureCode Canonical feature code (e.g. 'bcp-committees').
   * @returns True when the feature is active for the tenant.
   */
  isFeatureActive(featureCode: string): boolean {
    if (!featureCode) return false;
    return this.activeFeatureCodes.has(featureCode.toLowerCase());
  }

  /**
   * Checks whether at least one of the specified modular capability codes is installed and active.
   * @param featureCodes Array of canonical feature codes belonging to the suite.
   * @returns True when one or more features in the list are active.
   */
  isAnyFeatureActive(featureCodes: string[]): boolean {
    if (!featureCodes || featureCodes.length === 0) return false;
    return featureCodes.some(code => this.isFeatureActive(code));
  }

  /**
   * Checks whether a specific modular capability was previously installed but has expired.
   * When expired, the capability remains visible in the sidebar with a Lock icon.
   * @param featureCode Canonical feature code (e.g. 'bcp-workspace').
   * @returns True when the feature is installed but expired.
   */
  isFeatureExpired(featureCode: string): boolean {
    if (!featureCode) return false;
    return this.expiredFeatureCodes.has(featureCode.toLowerCase());
  }

  /**
   * Handles clicking a modular capability menu item in the sidebar.
   * If the capability is Not Active or Coming Soon, prevents navigation and opens the modal.
   * @param featureCode Canonical feature code.
   * @param featureTitle Human-readable title of the capability.
   * @param event DOM click event.
   * @param menuKeyToToggle Optional submenu key to toggle when the capability is active.
   */
  onFeatureMenuClick(featureCode: string, featureTitle: string, event: Event, menuKeyToToggle?: string): void {
    if (!this.isFeatureActive(featureCode)) {
      event.preventDefault();
      event.stopPropagation();
      this.lockedFeatureCode = featureCode;
      this.lockedFeatureTitle = featureTitle;
      this.lockedFeatureIsAvailable = this.isFeatureAvailable(featureCode);
      this.showLockedFeatureModal = true;
      return;
    }
    if (menuKeyToToggle) {
      this.toggleMenu(menuKeyToToggle);
    }
  }

  /**
   * Handles clicking a grouped parent submenu item in the sidebar.
   * If none of the group's capabilities are active, opens the modal.
   * @param featureCodes Array of canonical feature codes in the group.
   * @param groupTitle Human-readable group title.
   * @param event DOM click event.
   * @param menuKeyToToggle Optional submenu key to toggle when at least one capability is active.
   */
  onFeatureGroupMenuClick(featureCodes: string[], groupTitle: string, event: Event, menuKeyToToggle?: string): void {
    if (!this.isAnyFeatureActive(featureCodes)) {
      event.preventDefault();
      event.stopPropagation();
      this.lockedFeatureCode = featureCodes[0] || '';
      this.lockedFeatureTitle = groupTitle;
      this.lockedFeatureIsAvailable = this.isAnyFeatureAvailable(featureCodes);
      this.showLockedFeatureModal = true;
      return;
    }
    if (menuKeyToToggle) {
      this.toggleMenu(menuKeyToToggle);
    }
  }

  /**
   * Closes the "Feature Not Active / Coming Soon" modal.
   */
  closeLockedFeatureModal(): void {
    this.showLockedFeatureModal = false;
    this.lockedFeatureCode = '';
    this.lockedFeatureTitle = '';
  }

  /**
   * Navigates the administrator to the dedicated Feature Details view on /billing/features?feature=<code >
   * to inspect what the feature does, its suite, description, and install button.
   */
  goToActivateFeature(): void {
    const code = this.lockedFeatureCode;
    this.closeLockedFeatureModal();
    if (code) {
      this.router.navigate(['/billing/features'], { queryParams: { feature: code } });
    } else {
      this.router.navigate(['/billing/features']);
    }
  }

  loadSidebarForms(): void {
    this.api.get<any>('PageFormsApi').subscribe({
      next: (res) => {
        if (res && res.isSuccess && Array.isArray(res.data) && res.data.length > 0) {
          this.sidebarForms = res.data.map((f: any) => ({
            id: f.id,
            title: f.title,
            formKey: f.formKey,
            newSubmissions: f.newSubmissions || 0
          }));
        }
      },
      error: () => {}
    });
  }

  verifyAndRefreshSession(): void {
    const token = localStorage.getItem('access_token');
    if (!token) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.api.get<any>('auth/me').subscribe({
      next: (res) => {
        if (res && res.data) {
          const freshData = res.data;
          if (freshData.roles) {
            localStorage.setItem('user_roles', JSON.stringify(freshData.roles));
          }
          if (freshData.token) {
            localStorage.setItem('access_token', freshData.token);
          }
          if (freshData.fullName) {
            this.userFullName = freshData.fullName;
            localStorage.setItem('user_name', freshData.fullName);
          }
          if (freshData.email) {
            this.userEmail = freshData.email;
            localStorage.setItem('user_email', freshData.email);
          }

          // Persist and keep active workspace session in sync for seamless multi-workspace switching
          this.multiWorkspace.saveSession({
            tenantKey: this.tenantKey || localStorage.getItem('tenant_key') || '',
            token: freshData.token || token,
            fullName: freshData.fullName || this.userFullName,
            email: freshData.email || this.userEmail,
            roles: freshData.roles,
            organizationName: this.brandName,
            brandLogoUrl: this.brandLogoUrl,
            brandIconUrl: this.brandIconUrl
          });

          // If user is a global administrator, load administrative feature expirations
          if (this.isGlobalAdmin) {
            this.loadFeatureExpirations();
          }

          // Only redirect to personal workspace if the user has NO console-level roles at all (Member only)
          if (!canAccessConsole(freshData.roles || this.userRoles)) {
            const activeUrl = this.router.url || this.currentRoute || '';
            const isWorkspaceRoute = activeUrl.includes('/workspace');
            const isOnAdminRoute = !isWorkspaceRoute && (
              activeUrl.startsWith('/dashboard/console') ||
              activeUrl.includes('/console') ||
              activeUrl.startsWith('/admin')
            );

            if (isOnAdminRoute) {
              console.warn('[AdminLayout] Member-only user on console route -> Redirecting to workspace:', activeUrl);
              this.router.navigate(['/dashboard/workspace']);
            }
          }
        }
      },
      error: (err) => {
        if (err.status === 401 || err.status === 403) {
          console.warn('[AdminLayout] Session invalid or forbidden -> Redirecting to login');
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_roles');
          this.router.navigate(['/auth/login']);
        }
      }
    });
  }

  updateActiveMenu(url: string): void {
    if (url.startsWith('/identity/console/account')) {
      this.openMenus = { admin_manage_account: true };
    } else if (url.startsWith('/users/workspace/account')) {
      this.openMenus = { workspace_account: true };
    } else if (url.startsWith('/users/console') || url.startsWith('/admin/users')) {
      this.openMenus = { users: true };
    } else if (url.startsWith('/content/console') || url.startsWith('/admin/content')) {
      this.openMenus = { content: true };
    } else if (url.startsWith('/identity/console') || url.startsWith('/admin/identity')) {
      this.openMenus = { identity: true };
    } else if (url.startsWith('/groups/console') || url.startsWith('/admin/groups') || url.startsWith('/committees/console')) {
      this.openMenus = { groups: true };
    } else if (url.startsWith('/committees/workspace') || url.startsWith('/groups/workspace')) {
      this.openMenus = { workspace_committees: true };
    } else if (url.startsWith('/admin/alumni') || url.startsWith('/users/workspace/alumni')) {
      this.openMenus = { alumni: true };
    } else if (url.startsWith('/products/console')) {
      this.openMenus = { commerce: true };
    }
  }

  isCurrentRoute(url: string): boolean {
    return this.currentRoute === url;
  }

  isParentActive(prefix: string): boolean {
    return this.currentRoute.startsWith(prefix);
  }

  isCmsStudioActive(): boolean {
    if (this.currentRoute.startsWith('/content/console/marketplace') ||
        this.currentRoute.startsWith('/admin/marketplace') ||
        this.currentRoute.startsWith('/content/console/templates') ||
        this.currentRoute.startsWith('/admin/templates') ||
        this.currentRoute === '/content/console/forms' ||
        this.currentRoute === '/content/console/forms/create' ||
        this.currentRoute.startsWith('/content/console/forms/edit/')) {
      return false;
    }
    return this.currentRoute.startsWith('/content/console') ||
           this.currentRoute.startsWith('/admin/content');
  }

  isUserListActive(): boolean {
    return this.currentRoute === '/users/console/list' ||
           this.currentRoute.startsWith('/users/console/create') ||
           this.currentRoute.startsWith('/users/console/edit') ||
           this.currentRoute.startsWith('/users/console/details') ||
           this.currentRoute === '/admin/users/list' ||
           this.currentRoute.startsWith('/admin/users/create') ||
           this.currentRoute.startsWith('/admin/users/edit') ||
           this.currentRoute.startsWith('/admin/users/details');
  }

  isUserCategoriesActive(): boolean {
    return this.currentRoute.startsWith('/users/console/categories') ||
           this.currentRoute.startsWith('/admin/users/categories');
  }

  isUserKpiActive(): boolean {
    return this.currentRoute.startsWith('/users/console/kpi') ||
           this.currentRoute.startsWith('/admin/users/kpi');
  }

  isContentCategoriesActive(): boolean {
    return this.currentRoute.startsWith('/admin/content/categories');
  }

  isContentPagesActive(): boolean {
    return this.currentRoute.startsWith('/admin/content/pages');
  }

  isContentSectionsActive(): boolean {
    return this.currentRoute.startsWith('/admin/content/sections') || this.currentRoute.startsWith('/content/console/sections');
  }


  computeAbbreviation(name: string): string {
    if (!name || !name.trim()) return 'ORG';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      const single = words[0].trim();
      return single.length >= 3 ? single.substring(0, 3).toUpperCase() : single.toUpperCase();
    }
    return words.slice(0, 4).map(w => w[0].toUpperCase()).join('');
  }

  loadTenantInfo(): void {
    this.api.get<any>('SettingsApi/brand').subscribe({
      next: (res) => {
        if (res?.data) {
          const name = res.data.companyName || this.brandName;
          if (res.data.companyName && !res.data.companyName.toLowerCase().includes('ozikol')) {
            this.brandName = res.data.companyName;
            localStorage.setItem('tenant_name', res.data.companyName);
          }
          this.syncDocumentTitle();
          if (res.data.companyNameAbbreviation && res.data.companyNameAbbreviation !== 'CC') {
            this.brandAbbreviation = res.data.companyNameAbbreviation;
            localStorage.setItem('tenant_abbreviation', res.data.companyNameAbbreviation);
          } else {
            this.brandAbbreviation = this.computeAbbreviation(name);
            localStorage.setItem('tenant_abbreviation', this.brandAbbreviation);
          }
          this.brandLogoUrl = res.data.companyLogoUrl || '';
          if (res.data.companyLogoUrl) {
            localStorage.setItem('tenant_logo', res.data.companyLogoUrl);
          } else {
            localStorage.removeItem('tenant_logo');
          }

          const rawIcon = res.data.companyIconUrl;
          const activeIcon = (rawIcon && rawIcon !== '/favicon.ico') ? rawIcon : '';
          this.brandIconUrl = activeIcon;
          if (activeIcon) {
            localStorage.setItem('tenant_icon', activeIcon);
          } else {
            localStorage.removeItem('tenant_icon');
          }
          const favicons = document.querySelectorAll("link[rel*='icon']");
          if (favicons.length > 0) {
            favicons.forEach(el => (el as HTMLLinkElement).href = activeIcon || 'data:,');
          } else if (activeIcon) {
            const link = document.createElement('link');
            link.rel = 'shortcut icon';
            link.type = 'image/x-icon';
            link.href = activeIcon;
            document.head.appendChild(link);
          }
        }
      },
      error: () => {}
    });

    this.loadTerminologyAliases();

    this.api.get<any>('UsersApi/profile').subscribe({
      next: (res) => {
        if (res?.data) {
          const first = res.data.firstName || 'Admin';
          const last = res.data.lastName || 'User';
          this.userFullName = `${first} ${last}`.trim();
          this.userEmail = res.data.email || 'cola@admin.com';
          this.userInitials = `${first[0]}${last[0]}`.toUpperCase();
        }
      },
      error: () => {}
    });

    this.api.get<any>('SettingsApi/ecommerce').subscribe({
      next: (res) => {
        if (res?.data?.storeOperatingMode) {
          this.websiteMode = res.data.storeOperatingMode;
          localStorage.setItem('tenant_website_mode', res.data.storeOperatingMode);
        }
      },
      error: () => {}
    });

    this.api.get<any>('DashboardApi/metrics').subscribe({
      next: (res) => {
        if (res?.data?.masterTenantInfo) {
          const info = res.data.masterTenantInfo;
          this.customDomain = info.customDomain || '';
          this.primaryDomain = info.primaryDomain || '';
          this.websiteUrl = info.websiteUrl || '';
          this.tenantKey = info.tenantKey || '';
          if (this.customDomain) {
            localStorage.setItem('tenant_custom_domain', this.customDomain);
          } else {
            localStorage.removeItem('tenant_custom_domain');
          }
          if (this.primaryDomain) {
            localStorage.setItem('tenant_primary_domain', this.primaryDomain);
          }
          if (this.websiteUrl) {
            localStorage.setItem('tenant_website_url', this.websiteUrl);
          }
          if (this.tenantKey) {
            localStorage.setItem('tenant_key', this.tenantKey);
          }
        }
      },
      error: () => {}
    });
  }

  /**
   * Loads custom terminology aliases (Category, Sub-Category, Group, Alumni) from the API or SignalR payload.
   * @param data Optional live SignalR payload containing updated aliases.
   */
  loadTerminologyAliases(data?: any): void {
    if (data) {
      this.categoryAlias = data.categoryAlias || this.categoryAlias || 'User Categories';
      this.subCategoryAlias = data.subCategoryAlias || this.subCategoryAlias || 'Sub-Categories';
      this.groupAlias = data.groupAlias || this.groupAlias || 'Groups & Communities';
      this.alumniAlias = data.alumniAlias || this.alumniAlias || 'Alumni';
      localStorage.setItem('alias_category', this.categoryAlias);
      localStorage.setItem('alias_subcategory', this.subCategoryAlias);
      localStorage.setItem('alias_group', this.groupAlias);
      localStorage.setItem('alias_alumni', this.alumniAlias);
      return;
    }

    this.api.get<any>('SettingsApi/aliases').subscribe({
      next: (res) => {
        if (res?.data) {
          this.categoryAlias = res.data.categoryAlias || 'User Categories';
          this.subCategoryAlias = res.data.subCategoryAlias || 'Sub-Categories';
          this.groupAlias = res.data.groupAlias || 'Groups & Communities';
          this.alumniAlias = res.data.alumniAlias || 'Alumni';
          localStorage.setItem('alias_category', this.categoryAlias);
          localStorage.setItem('alias_subcategory', this.subCategoryAlias);
          localStorage.setItem('alias_group', this.groupAlias);
          localStorage.setItem('alias_alumni', this.alumniAlias);
        }
      },
      error: () => {}
    });
  }

  closeSidebarMobile(): void {
    this.sidebarCollapsed = true;
    document.body.classList.add('sidebar-closed');
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    document.body.classList.toggle('sidebar-closed', this.sidebarCollapsed);
  }

  toggleTheme(): void {
    this.darkMode = !this.darkMode;
    if (this.darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('bcp_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('bcp_theme', 'light');
    }
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  toggleMenu(menuKey: string): void {
    if (this.openMenus[menuKey]) {
      this.openMenus = {};
    } else {
      this.openMenus = { [menuKey]: true };
    }
  }

  isMenuOpen(menuKey: string): boolean {
    return !!this.openMenus[menuKey];
  }

  nestedOpenMenus: { [key: string]: boolean } = { manage_account: false };

  toggleNestedMenu(menuKey: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.nestedOpenMenus[menuKey] = !this.nestedOpenMenus[menuKey];
  }

  isNestedMenuOpen(menuKey: string): boolean {
    return !!this.nestedOpenMenus[menuKey];
  }

  isCurrentRouteWithQuery(path: string, tabQuery: string): boolean {
    return this.router.url.includes(path) && this.router.url.includes(`tab=${tabQuery}`);
  }

  toggleDropdown(dropdownName: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.activeDropdown = this.activeDropdown === dropdownName ? null : dropdownName;
  }

  closeDropdowns(): void {
    this.activeDropdown = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.apps-grid-wrapper') &&
        !target.closest('.calendar-wrapper') &&
        !target.closest('.notifications-wrapper') &&
        !target.closest('.user-profile-wrapper') &&
        !target.closest('.oz-lang-switcher')) {
      this.closeDropdowns();
    }
  }

  // Pinned Items Management
  isPinned(url: string): boolean {
    return this.pinnedItems.some(p => p.url === url);
  }

  togglePin(title: string, url: string, icon: string): void {
    const index = this.pinnedItems.findIndex(p => p.url === url);
    if (index >= 0) {
      this.pinnedItems.splice(index, 1);
    } else {
      this.pinnedItems.push({ title, url, icon });
    }
    localStorage.setItem('bcp_pinned_items', JSON.stringify(this.pinnedItems));
  }

  // Dynamic Multi-Tab Taskbar Management
  handleRouteTab(url: string): void {
    let tabTitle = 'Page';
    let tabIcon = 'description';

    if (url.includes('/dashboard/mxmails') || url.includes('/admin/mxmails') || url.includes('/mxmails')) { tabTitle = 'MX Email Logs'; tabIcon = 'mark_email_read'; }
    else if (url.includes('/dashboard/mxsms') || url.includes('/admin/mxsms') || url.includes('/mxsms')) { tabTitle = 'MX SMS Logs'; tabIcon = 'sms'; }
    else if (url.includes('/users/console/notifications')) { tabTitle = 'Notification Studio'; tabIcon = 'campaign'; }
    else if (url.includes('/users/workspace/notifications')) { tabTitle = 'Notifications'; tabIcon = 'notifications'; }
    else if (url.includes('/dashboard/workspace')) { tabTitle = 'Workspace Home'; tabIcon = 'space_dashboard'; }
    else if (url.includes('/dashboard/console') || url.includes('/admin/dashboard')) { tabTitle = 'Dashboard'; tabIcon = 'dashboard'; }
    else if (url.includes('/content/console/forms') && url.includes('/submissions')) { tabTitle = 'Form Leads'; tabIcon = 'inbox'; }
    else if (url.includes('/content/console/forms')) { tabTitle = 'Manage Forms'; tabIcon = 'dynamic_form'; }
    else if (url.includes('/content/console/marketplace') || url.includes('/admin/marketplace')) { tabTitle = 'UI Marketplace'; tabIcon = 'widgets'; }
    else if (url.includes('/content/console/templates') || url.includes('/admin/templates')) { tabTitle = 'My Templates'; tabIcon = 'layers'; }
    else if (url.includes('/content/console') || url.includes('/admin/content')) { tabTitle = 'CMS Studio'; tabIcon = 'dynamic_feed'; }
    else if (url.includes('/users/console') || url.includes('/admin/users')) { tabTitle = 'User Directory'; tabIcon = 'groups'; }
    else if (url.includes('/identity/console/roles')) { tabTitle = 'Roles & Permissions'; tabIcon = 'verified_user'; }
    else if (url.includes('/identity/console/invitations')) { tabTitle = 'Member Invitations'; tabIcon = 'mail'; }
    else if (url.includes('/identity/console/policies')) { tabTitle = 'Global Policies'; tabIcon = 'password'; }
    else if (url.includes('/identity/console/account') || url.includes('/users/workspace/account')) { tabTitle = 'Manage Account'; tabIcon = 'manage_accounts'; }
    else if (url.includes('/identity/console') || url.includes('/admin/identity')) { tabTitle = 'Identity Dashboard'; tabIcon = 'space_dashboard'; }
    else if (url.includes('/users/workspace/chat')) { tabTitle = 'Chat Room'; tabIcon = 'chat'; }
    else if (url.includes('/users/workspace/groups')) { tabTitle = 'Groups Directory'; tabIcon = 'groups'; }
    else if (url.includes('/users/workspace/alumni')) { tabTitle = 'Alumni Network'; tabIcon = 'school'; }
    else if (url.includes('/users/workspace/profile/biography')) { tabTitle = 'My CV Biography'; tabIcon = 'assignment_ind'; }
    else if (url.includes('/users/workspace/profile')) { tabTitle = 'My Account'; tabIcon = 'account_circle'; }
    else if (url.includes('/committees/console/dashboard')) { tabTitle = `${this.committeeAliases.aliasSingular} Dashboard`; tabIcon = 'space_dashboard'; }
    else if (url.includes('/committees/console/manage')) { tabTitle = `Manage ${this.committeeAliases.aliasPlural}`; tabIcon = 'diversity_3'; }
    else if (url.includes('/committees/console/registrations')) { tabTitle = 'Registrations & Intake'; tabIcon = 'how_to_reg'; }
    else if (url.includes('/committees/console/reports')) { tabTitle = 'Meeting Reports'; tabIcon = 'summarize'; }
    else if (url.includes('/committees/console/forms')) { tabTitle = 'Extra-Info Forms'; tabIcon = 'dynamic_form'; }
    else if (url.includes('/committees/console/settings')) { tabTitle = `${this.committeeAliases.aliasSingular} Settings`; tabIcon = 'settings'; }
    else if (url.includes('/committees/workspace/my')) { tabTitle = `My ${this.committeeAliases.aliasPlural}`; tabIcon = 'groups'; }
    else if (url.includes('/committees/workspace/discover')) { tabTitle = `Browse & Join ${this.committeeAliases.aliasPlural}`; tabIcon = 'explore'; }
    else if (url.includes('/committees/workspace/view')) { tabTitle = `${this.committeeAliases.aliasSingular} Hub`; tabIcon = 'diversity_3'; }
    else if (url.includes('/committees/workspace/reports/compose')) { tabTitle = 'Compose Meeting Report'; tabIcon = 'edit_document'; }
    else if (url.includes('/committees/workspace/cloud-links')) { tabTitle = 'Connected Cloud Docs'; tabIcon = 'cloud_done'; }
    else if (url.includes('/groups')) { tabTitle = 'Group Channels'; tabIcon = 'diversity_3'; }
    else if (url.includes('/billing/features') || url.includes('/billing/plans') || url.includes('/billing/console')) { tabTitle = 'Features & Capabilities'; tabIcon = 'extension'; }
    else if (url.includes('/billing/paymentmethod') || url.includes('/billing/payment-methods')) { tabTitle = 'Payment Methods'; tabIcon = 'account_balance_wallet'; }
    else if (url.includes('/billing/subscriptions') || url.includes('/billing/invoices')) { tabTitle = 'Subscriptions & Invoices'; tabIcon = 'receipt_long'; }
    else if (url.includes('/workspace/stations')) { tabTitle = 'Workstations & Gatekeeper'; tabIcon = 'desktop_windows'; }
    else if (url.includes('/settings')) { tabTitle = 'Brand Settings'; tabIcon = 'palette'; }

    this.syncDocumentTitle(tabTitle !== 'Page' ? tabTitle : 'Workspace');

    const exists = this.openTabs.some(t => t.url === url);
    if (!exists) {
      this.openTabs.push({
        title: tabTitle,
        url: url,
        icon: tabIcon,
        closable: url !== '/admin/dashboard'
      });
    }
  }

  closeTab(tab: TaskTab, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const index = this.openTabs.indexOf(tab);
    if (index >= 0) {
      this.openTabs.splice(index, 1);
      if (this.currentRoute === tab.url) {
        const nextTab = this.openTabs[this.openTabs.length - 1] || { url: '/admin/dashboard' };
        this.router.navigate([nextTab.url]);
      }
    }
  }

  loadNotificationFeed(): void {
    this.api.get<any>('NotificationsApi/feed').subscribe({
      next: (res) => {
        if (res?.data) {
          this.notificationFeed = res.data.items || [];
          this.unreadNotifCount = res.data.unreadCount || 0;
        }
      },
      error: () => {}
    });
  }

  markAllNotificationsRead(): void {
    this.api.put<any>('NotificationsApi/mark-all-read', {}).subscribe({
      next: () => {
        this.notificationFeed.forEach(n => n.isRead = true);
        this.unreadNotifCount = 0;
      },
      error: () => {}
    });
  }

  clearAllNotifications(): void {
    this.api.delete<any>('NotificationsApi/clear-all').subscribe({
      next: () => {
        this.notificationFeed = [];
        this.unreadNotifCount = 0;
      },
      error: () => {}
    });
  }

  handleNotificationClick(notif: any): void {
    if (!notif.isRead) {
      this.api.put<any>(`NotificationsApi/${notif.id}/read`, {}).subscribe({
        next: () => {
          notif.isRead = true;
          this.unreadNotifCount = Math.max(0, this.unreadNotifCount - 1);
        },
        error: () => {}
      });
    }

    this.closeDropdowns();

    if (notif.actionUrl) {
      this.router.navigateByUrl(notif.actionUrl);
    }
  }

  getNotifColorClass(module: string, category: string): string {
    const key = (module || category || '').toLowerCase();
    if (key.includes('security') || key.includes('password')) return 'notif-icon-red';
    if (key.includes('kpi') || key.includes('performance')) return 'notif-icon-green';
    if (key.includes('user') || key.includes('membership')) return 'notif-icon-blue';
    if (key.includes('announcement') || key.includes('system')) return 'notif-icon-purple';
    return 'notif-icon-blue';
  }

  formatTimeAgo(dateStr: any): string {
    if (!dateStr) return '';
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - dt.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45 || diffMs < 0) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return '1d ago';
    if (diffDays < 7) return `${diffDays}d ago`;
    const day = dt.getDate().toString().padStart(2, '0');
    const month = (dt.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  }

  /// <summary>
  /// Signs out of the current active workspace while preserving its enrollment configuration.
  /// </summary>
  onLogout(): void {
    const current = this.tenantKey || localStorage.getItem('tenant_key') || '';
    if (current) {
      this.multiWorkspace.signOutWorkspace(current);
    } else {
      localStorage.removeItem('access_token');
      this.router.navigate(['/auth/login']);
    }
  }

  /// <summary>
  /// Switches active workspace context to target enrolled session without asking for credentials if already authenticated.
  /// </summary>
  /// <param name="session">Target enrolled workspace session</param>
  onSelectWorkspace(session: EnrolledWorkspaceSession): void {
    this.closeDropdowns();
    const current = (this.tenantKey || localStorage.getItem('tenant_key') || '').toLowerCase();
    if (session.tenantKey.toLowerCase() === current) {
      return;
    }
    if (session.authToken) {
      this.multiWorkspace.switchWorkspace(session.tenantKey);
    } else {
      this.router.navigate(['/auth/login'], { queryParams: { tenant: session.tenantKey } });
    }
  }

  /**
   * Checks if the workspace has been initialized with default or blank settings.
   * If not, presents the first-run onboarding setup wizard modal to administrators.
   */
  checkFirstRunSetupStatus(): void {
    // 1. Instant local/session guard: Avoid unnecessary network checks once verified in current browser session
    if (sessionStorage.getItem('bcp_setup_modal_dismissed') === 'true' ||
        localStorage.getItem('bcp_workspace_initialized') === 'true') {
      return;
    }

    // 2. Only administrators should run or configure workspace initial seeding
    if (!this.isAdmin) {
      return;
    }

    this.api.get<any>('ContentApi/workspace/setup-status').subscribe({
      next: (res) => {
        if (res && res.isSuccess && res.data) {
          if (res.data.isInitialized) {
            // Workspace already has content or has completed initialization previously
            localStorage.setItem('bcp_workspace_initialized', 'true');
            this.showFirstRunModal = false;
          } else {
            // Pristine new workspace: present modal
            this.showFirstRunModal = true;
          }
        }
      },
      error: (err) => {
        console.warn('[AdminLayout] Failed to query workspace initialization status:', err);
      }
    });
  }

  /**
   * Handles completion of the first-run workspace setup wizard.
   * @param mode Selected setup mode ('default' or 'blank')
   */
  onFirstRunCompleted(mode: 'default' | 'blank'): void {
    this.showFirstRunModal = false;
    if (mode === 'default') {
      this.loadSidebarForms();
    }
  }

  ngOnDestroy(): void {
    this.committeeAliasesSub?.unsubscribe();
  }
}
