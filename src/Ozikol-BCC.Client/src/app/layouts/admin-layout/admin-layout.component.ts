import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { SignalRService } from '../../core/services/signalr.service';
import { AiAssistantComponent } from '../../shared/components/ai-assistant/ai-assistant.component';
import { AiAssistantContextService } from '../../core/services/ai-assistant-context.service';
import { FirstRunSetupModalComponent } from '../../shared/components/first-run-setup-modal/first-run-setup-modal.component';
import { TranslationService, SupportedLanguage, LanguageOption, SUPPORTED_LANGUAGES } from '../../core/services/translation.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { 
  getStoredUserRoles, 
  canAccessConsole, 
  isGlobalAdmin, 
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
      </div>

      <nav class="sidebar-nav">
        <!-- Section: PIN NAVIGATION -->
        <div id="pinned-sidebar-section" *ngIf="pinnedItems.length > 0">
          <div class="menu-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>Pin Navigation</span>
            <span class="badge-pill" style="background:#0050e5;">{{ pinnedItems.length }}</span>
          </div>
          <div class="nav-item" *ngFor="let item of pinnedItems">
            <a [routerLink]="item.url" routerLinkActive="active" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">{{ item.icon }}</span>
                <span>{{ item.title }}</span>
              </div>
              <button type="button" class="pin-btn pinned" (click)="togglePin(item.title, item.url, item.icon); $event.preventDefault(); $event.stopPropagation();" title="Unpin Task">
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
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('core_command', $event)" title="Executive Command Overview">
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
                <span>Analytics & Telemetry</span>
                <span class="badge-pill badge-hot">Live</span>
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
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('website_cms', $event)" title="Website & CMS Overview">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <!-- Suite 1: Website & CMS (Web Exclusive) -->
          <div class="nav-item has-sub" [class.open]="isMenuOpen('content')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isCmsStudioActive()" (click)="toggleMenu('content')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">dynamic_feed</span>
                <span>{{ 'nav.cms_studio' | translate }}</span>
                <span class="badge-pill badge-new">Live</span>
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
                <span class="sub-divider-text">Form Inquiries & Leads</span>
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
                <span class="badge-pill badge-hot">Hot</span>
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
                <span>Live Public Site</span>
              </div>
              <span class="material-symbols-outlined nav-external-hint">open_in_new</span>
            </a>
          </div>

          <!-- Suite 2: User Management -->
          <ng-container *ngIf="canAccessSuite('user_management')">
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.user_management' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('user_management', $event)" title="User Management Overview">
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
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">analytics</span>Dashboard Overview</span>
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
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">category</span>{{ categoryAlias || 'User Categories' }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/console/categories')" (click)="togglePin(categoryAlias || 'User Categories', '/users/console/categories', 'category')" [title]="isPinned('/users/console/categories') ? 'Unpin Task' : 'Pin Task'">
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
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">branding_watermark</span>Auth Page Setup</span>
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
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">tune</span>User Settings</span>
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
              <!-- Manage Account Dropdown Group -->
              <li class="has-nested-sub">
                <div class="sub-nav-wrapper">
                  <a href="javascript:void(0)" [class.active]="isCurrentRoute('/identity/console/account')" class="sub-nav-item" (click)="toggleNestedMenu('manage_account', $event)">
                    <span class="sub-nav-content">
                      <span class="material-symbols-outlined sub-icon">manage_accounts</span>
                      {{ 'nav.manage_account' | translate }}
                    </span>
                    <span class="material-symbols-outlined nested-arrow-icon" style="font-size: 16px; margin-left: auto;">
                      {{ isNestedMenuOpen('manage_account') ? 'expand_more' : 'chevron_right' }}
                    </span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/account')" (click)="togglePin('Manage Account', '/identity/console/account', 'manage_accounts')" [title]="isPinned('/identity/console/account') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console/account') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
                <ul class="nested-sub-menu" *ngIf="isNestedMenuOpen('manage_account')" style="list-style: none; padding: 4px 0 6px 18px; margin: 0; display: flex; flex-direction: column; gap: 4px;">
                  <li>
                    <a routerLink="/identity/console/account" [queryParams]="{ tab: 'password' }" [class.active]="isCurrentRouteWithQuery('/identity/console/account', 'password')" class="sub-nav-item" style="padding: 6px 12px; font-size: 12.5px;">
                      <span class="material-symbols-outlined sub-icon" style="font-size: 15px;">key</span>
                      <span>{{ 'nav.change_password' | translate }}</span>
                    </a>
                  </li>
                  <li>
                    <a routerLink="/identity/console/account" [queryParams]="{ tab: '2fa' }" [class.active]="isCurrentRouteWithQuery('/identity/console/account', '2fa')" class="sub-nav-item" style="padding: 6px 12px; font-size: 12.5px;">
                      <span class="material-symbols-outlined sub-icon" style="font-size: 15px;">shield_lock</span>
                      <span>{{ 'nav.mfa_security' | translate }}</span>
                    </a>
                  </li>
                  <li>
                    <a routerLink="/identity/console/account" [queryParams]="{ tab: 'devices' }" [class.active]="isCurrentRouteWithQuery('/identity/console/account', 'devices')" class="sub-nav-item" style="padding: 6px 12px; font-size: 12.5px;">
                      <span class="material-symbols-outlined sub-icon" style="font-size: 15px;">devices</span>
                      <span>{{ 'nav.manage_devices' | translate }}</span>
                    </a>
                  </li>
                  <li>
                    <a routerLink="/identity/console/account" [queryParams]="{ tab: 'activity' }" [class.active]="isCurrentRouteWithQuery('/identity/console/account', 'activity')" class="sub-nav-item" style="padding: 6px 12px; font-size: 12.5px;">
                      <span class="material-symbols-outlined sub-icon" style="font-size: 15px;">history</span>
                      <span>{{ 'nav.login_history' | translate }}</span>
                    </a>
                  </li>
                  <li>
                    <a routerLink="/identity/console/account" [class.active]="isAccountHubActive()" class="sub-nav-item" style="padding: 6px 12px; font-size: 12.5px; opacity: 0.9;">
                      <span class="material-symbols-outlined sub-icon" style="font-size: 15px;">tune</span>
                      <span>{{ 'nav.account_hub' | translate }}</span>
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
          </ng-container>

          <!-- Suite 3: People & Community -->
          <ng-container *ngIf="canAccessSuite('people_community')">
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.people_community' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('people_community', $event)" title="People & Community Overview">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('groups')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/groups/console') || isParentActive('/admin/groups')" (click)="toggleMenu('groups')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">diversity_3</span>
                <span>{{ groupAlias || 'Groups & Committees' }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('groups')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/groups/console" [class.active]="isParentActive('/groups/console')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>Groups Dashboard</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/groups/console')" (click)="togglePin('Groups Dashboard', '/groups/console', 'space_dashboard')" [title]="isPinned('/groups/console') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/groups/console') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/groups/console" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">diversity_3</span>Manage Groups</span>
                  </a>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Groups Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('alumni')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/admin/alumni') || isParentActive('/users/workspace/alumni')" (click)="toggleMenu('alumni')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">school</span>
                <span>{{ alumniAlias || 'Alumni Network' }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('alumni')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/admin/alumni" [class.active]="isCurrentRoute('/admin/alumni')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>Alumni Dashboard</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/admin/alumni')" (click)="togglePin('Alumni Dashboard', '/admin/alumni', 'space_dashboard')" [title]="isPinned('/admin/alumni') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/admin/alumni') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/admin/alumni/cohorts" [class.active]="isCurrentRoute('/admin/alumni/cohorts')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">calendar_month</span>Manage Alumni & Cohorts</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/admin/alumni/cohorts')" (click)="togglePin('Alumni Cohorts', '/admin/alumni/cohorts', 'calendar_month')" [title]="isPinned('/admin/alumni/cohorts') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/admin/alumni/cohorts') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Alumni Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item">
            <a routerLink="/admin/messenger" [class.active]="isCurrentRoute('/admin/messenger') || isCurrentRoute('/users/workspace/chat')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">chat</span>
                <span>{{ 'nav.chat_messenger' | translate }}</span>
                <span class="badge-pill badge-hot">Live</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/admin/messenger')" (click)="togglePin('Chat Messenger', '/admin/messenger', 'chat'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/admin/messenger') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/admin/messenger') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">feedback</span><span>{{ 'nav.whistleblowing' | translate }}</span></span>
            <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
          </span>
          </ng-container>

          <!-- Suite 4: Workforce & Shifts -->
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.workforce_shifts' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('workforce_shifts', $event)" title="Workforce & Shifts Overview">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('workforce')">
            <a class="nav-link" href="javascript:void(0)" (click)="toggleMenu('workforce')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">calendar_month</span>
                <span>Workforce & Shifts</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('workforce')">
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>Workforce Dashboard</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">event_note</span>Staff & Volunteer Rota</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">swap_horiz</span>Shift Swaps & Leave</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">timer</span>Attendance & Clock-In</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Workforce Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">event_repeat</span><span>{{ 'nav.calendar_followups' | translate }}</span></span>
            <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
          </span>

          <!-- Suite 5: Events & Ticketing -->
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.events_ticketing' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('events_ticketing', $event)" title="Events & Ticketing Overview">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('events')">
            <a class="nav-link" href="javascript:void(0)" (click)="toggleMenu('events')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">confirmation_number</span>
                <span>Events & Ticketing</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('events')">
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>Events Dashboard</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">event</span>Manage Events & Passes</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">mic</span>Speaker & Session Tracks</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">how_to_reg</span>Attendee Management & Check-In</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Events Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <!-- Suite 6: Commerce & Store -->
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.commerce_store' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('commerce_store', $event)" title="Commerce & Store Overview">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('commerce')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/products/console')" (click)="toggleMenu('commerce')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">storefront</span>
                <span>{{ 'nav.commerce_studio' | translate }}</span>
                <span class="badge-pill badge-new">New</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('commerce')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/products/console" [class.active]="isCurrentRoute('/products/console')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>Store Dashboard</span>
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
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">category</span>Product Categories</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/products/console/categories')" (click)="togglePin('Product Categories', '/products/console/categories', 'category')" [title]="isPinned('/products/console/categories') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/products/console/categories') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/products/console/orders" [class.active]="isCurrentRoute('/products/console/orders')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">local_shipping</span>Customer Orders & Fulfillment</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/products/console/orders')" (click)="togglePin('Customer Orders', '/products/console/orders', 'local_shipping')" [title]="isPinned('/products/console/orders') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/products/console/orders') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/products/console/transactions" [class.active]="isCurrentRoute('/products/console/transactions')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">receipt_long</span>Financial Settlement Ledger</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/products/console/transactions')" (click)="togglePin('Financial Ledger', '/products/console/transactions', 'receipt_long')" [title]="isPinned('/products/console/transactions') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/products/console/transactions') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Store Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
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

          <!-- Suite 7: Finance & Banking -->
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.finance_banking' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('finance_banking', $event)" title="Finance & Banking Overview">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('invoicing')">
            <a class="nav-link" href="javascript:void(0)" (click)="toggleMenu('invoicing')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">account_balance_wallet</span>
                <span>{{ 'nav.invoicing_dues' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('invoicing')">
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>Invoicing Dashboard</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">receipt</span>Manage Invoices & Dues</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Invoicing Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('banking')">
            <a class="nav-link" href="javascript:void(0)" (click)="toggleMenu('banking')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">account_balance</span>
                <span>{{ 'nav.embedded_banking' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('banking')">
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">hub</span>Connected Gateways & Payouts</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Payment Rail Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">request_quote</span><span>{{ 'nav.grant_ledger' | translate }}</span></span>
            <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
          </span>
          <div class="nav-item">
            <a routerLink="/products/console/transactions" [class.active]="isCurrentRoute('/products/console/transactions')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">receipt_long</span>
                <span>Financial Ledger</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/products/console/transactions')" (click)="togglePin('Financial Ledger', '/products/console/transactions', 'receipt_long')" [title]="isPinned('/products/console/transactions') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/products/console/transactions') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>

          <!-- Suite 8: Communication & Support -->
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.communication_support' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('communication_support', $event)" title="Communication & Support Overview">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('notifications')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isCurrentRoute('/users/console/notifications')" (click)="toggleMenu('notifications')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">campaign</span>
                <span>{{ 'nav.notification_studio' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('notifications')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/console/notifications" [class.active]="isCurrentRoute('/users/console/notifications')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">analytics</span>Broadcasts Dashboard</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/console/notifications')" (click)="togglePin('Notification Studio', '/users/console/notifications', 'campaign')" [title]="isPinned('/users/console/notifications') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/console/notifications') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/console/notifications" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">send</span>Compose Broadcast</span>
                  </a>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">security</span>Anti-Spam Scanner</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Delivery Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('helpdesk')">
            <a class="nav-link" href="javascript:void(0)" (click)="toggleMenu('helpdesk')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">support_agent</span>
                <span>{{ 'nav.helpdesk_support' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('helpdesk')">
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>Support Dashboard</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">confirmation_number</span>Manage Tickets</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">chat_bubble</span>Live Chat Widget Control</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Helpdesk & SLA Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">link</span><span>Bio Link-Tree Builder</span></span>
            <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
          </span>

          <!-- Suite 9: Forms & Intelligence -->
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.forms_intelligence' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('forms_intelligence', $event)" title="Forms & Intelligence Overview">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('forms')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isCurrentRoute('/content/console/forms')" (click)="toggleMenu('forms')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">dynamic_form</span>
                <span>{{ 'nav.forms_surveys' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('forms')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/forms" [class.active]="isCurrentRoute('/content/console/forms')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>Forms Dashboard</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/forms')" (click)="togglePin('Forms Dashboard', '/content/console/forms', 'dynamic_form')" [title]="isPinned('/content/console/forms') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console/forms') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/forms" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">edit_note</span>Form Builder & Responses</span>
                  </a>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">schema</span>Custom Field Schemas</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Form Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">query_stats</span><span>Survey Analytics & Reports</span></span>
            <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
          </span>

          <!-- Suite 10: Academy & Training -->
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.academy_training' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('academy_training', $event)" title="Academy & Training Overview">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('lms')">
            <a class="nav-link" href="javascript:void(0)" (click)="toggleMenu('lms')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">school</span>
                <span>{{ 'nav.lms_training' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('lms')">
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>LMS Dashboard</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">menu_book</span>Manage Courses & Lessons</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">quiz</span>Quizzes & Assessment</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Course Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('certificates')">
            <a class="nav-link" href="javascript:void(0)" (click)="toggleMenu('certificates')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">verified</span>
                <span>{{ 'nav.certificate_verification' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('certificates')">
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">design_services</span>Certificate Designer</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">history_edu</span>Issued Certificates</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">qr_code</span>Public QR Verification</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Credential Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <!-- Suite 11: Compliance & Governance -->
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.compliance_governance' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('compliance_governance', $event)" title="Compliance & Governance Overview">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('vault')">
            <a class="nav-link" href="javascript:void(0)" (click)="toggleMenu('vault')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">folder_zip</span>
                <span>{{ 'nav.document_vault' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('vault')">
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>Vault Overview</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">lock</span>Secure Documents & Folders</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Permissions & Retention</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('kyc')">
            <a class="nav-link" href="javascript:void(0)" (click)="toggleMenu('kyc')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">badge</span>
                <span>{{ 'nav.kyc_verification' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('kyc')">
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">pending_actions</span>Verification Queue</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Verification Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('visitor')">
            <a class="nav-link" href="javascript:void(0)" (click)="toggleMenu('visitor')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">door_front</span>
                <span>Visitor & Gate Passes</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('visitor')">
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">pin</span>Active Passes & Check-In</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Gate Pass Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <!-- Suite 12: Demographics & Census -->
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.demographics_census' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('demographics_census', $event)" title="Demographics & Census Overview">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('census')">
            <a class="nav-link" href="javascript:void(0)" (click)="toggleMenu('census')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">map</span>
                <span>{{ 'nav.community_census' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('census')">
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">pin_drop</span>Census Map & Heatmap</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">home</span>Household Units</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>Census Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('resident_id')">
            <a class="nav-link" href="javascript:void(0)" (click)="toggleMenu('resident_id')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">badge</span>
                <span>Digital Resident IDs</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('resident_id')">
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">contact_emergency</span>Manage Issued ID Cards</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">design_services</span>Card Template Designer</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <span class="sub-nav-item disabled">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">settings</span>ID Card Settings</span>
                    <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">query_stats</span><span>Demographic Analytics</span></span>
            <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
          </span>

          <!-- Suite 13: Billing & Subscriptions (Platform Governance) -->
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.billing_subscriptions' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('billing_subscriptions', $event)" title="Billing & Subscriptions Overview">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">credit_card</span><span>Subscription Plans</span></span>
            <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
          </span>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">account_balance_wallet</span><span>Payment Methods & Contacts</span></span>
            <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
          </span>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">calculate</span><span>Usage Bill Calculator</span></span>
            <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
          </span>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">extension</span><span>{{ 'nav.feature_billing' | translate }}</span></span>
            <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
          </span>

          <!-- Suite 14: Security & Audit (Platform Protection) -->
          <div class="menu-title suite-header-row">
            <span class="suite-header-text">{{ 'suite.security_audit' | translate }}</span>
            <button type="button" class="suite-info-trigger" (click)="openSuiteInfo('security_audit', $event)" title="Security & Audit Overview">
              <span class="material-symbols-outlined suite-info-icon">info</span>
            </button>
          </div>
          <div class="nav-item">
            <a routerLink="/identity/console/audit-logs" [class.active]="isCurrentRoute('/identity/console/audit-logs')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">security</span>
                <span>{{ 'nav.security_audit' | translate }}</span>
                <span class="badge-pill badge-hot">Live</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/audit-logs')" (click)="togglePin('Security Logs', '/identity/console/audit-logs', 'security'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/identity/console/audit-logs') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/identity/console/audit-logs') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">manage_accounts</span><span>Login & Access History</span></span>
            <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
          </span>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">devices</span><span>Active Sessions & Remote Kill</span></span>
            <span class="badge-pill badge-soon">{{ 'badge.soon' | translate }}</span>
          </span>
          <div class="nav-item">
            <a routerLink="/identity/console/policies" [class.active]="isCurrentRoute('/identity/console/policies')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">password</span>
                <span>{{ 'nav.global_policies' | translate }}</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/policies')" (click)="togglePin('Global Policies', '/identity/console/policies', 'password')" [title]="isPinned('/identity/console/policies') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/identity/console/policies') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
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

          <!-- 2. Manage My Account Dropdown -->
          <div class="nav-item has-sub" [class.open]="isMenuOpen('workspace_account')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/users/workspace/account') || isParentActive('/identity/console/account')" (click)="toggleMenu('workspace_account')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">manage_accounts</span>
                <span>{{ 'nav.manage_my_account' | translate }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('workspace_account')">
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
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/workspace/account?tab=activity')" (click)="togglePin('Login History', '/users/workspace/account?tab=activity', 'history')" [title]="isPinned('/users/workspace/account?tab=activity') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/workspace/account?tab=activity') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/workspace/account" [class.active]="isAccountHubActive()" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">tune</span>{{ 'nav.account_hub' | translate }}</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/workspace/account')" (click)="togglePin('Account Hub', '/users/workspace/account', 'tune')" [title]="isPinned('/users/workspace/account') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/workspace/account') ? 'keep_off' : 'push_pin' }}</span>
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
          <a href="javascript:void(0)" (click)="showHelpModal = true" title="Help & Support">
            <span class="material-symbols-outlined">help_outline</span>
            <span>Help & Support</span>
          </a>
        </div>
      </div>
    </aside>

    <!-- Main Shell -->
    <main id="main-content" [class.sidebar-collapsed]="sidebarCollapsed">
      <!-- Standardized Topbar from Materialdesignui -->
      <header id="topbar">
        <div class="topbar-left">
          <a routerLink="/admin/dashboard" class="topbar-brand-logo" [title]="brandName" *ngIf="brandIconUrl">
            <img [src]="brandIconUrl" [alt]="brandName" class="topbar-brand-img">
          </a>
          <button type="button" class="topbar-action-btn" id="toggle-sidebar" (click)="toggleSidebar()" title="Toggle Navigation">
            <span class="material-symbols-outlined">menu</span>
          </button>
          <div class="topbar-search-box">
            <span class="material-symbols-outlined search-icon">search</span>
            <input type="text" [placeholder]="'shell.search_placeholder' | translate" aria-label="Search">
          </div>
        </div>

        <div class="topbar-right">
          <!-- Central Pattern Multi-Language Switcher Component -->
          <div class="oz-lang-switcher" id="ozLangSwitcher" (click)="$event.stopPropagation()">
            <button type="button" class="oz-lang-btn" (click)="toggleDropdown('language', $event)" [attr.aria-expanded]="activeDropdown === 'language'" aria-label="Select Language" [title]="'Select Language (' + currentLangOption.name + ')'">
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
            <button type="button" class="topbar-action-btn" (click)="toggleDropdown('apps', $event)" title="Apps Launcher">
              <span class="material-symbols-outlined">grid_view</span>
            </button>
            <div class="apps-grid-dropdown" *ngIf="activeDropdown === 'apps'">
              <div class="apps-grid-header">Workspace Apps & Features</div>
              <div class="apps-grid-container">
                <a routerLink="/admin/dashboard" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#0050e5"><span class="material-symbols-outlined">space_dashboard</span></div>
                  <span>Console</span>
                </a>
                <a routerLink="/admin/content" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#1f6bff"><span class="material-symbols-outlined">dynamic_feed</span></div>
                  <span>CMS Studio</span>
                </a>
                <a routerLink="/admin/users" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#22c55e"><span class="material-symbols-outlined">groups</span></div>
                  <span>Users</span>
                </a>
                <a routerLink="/admin/identity" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#ef4444"><span class="material-symbols-outlined">admin_panel_settings</span></div>
                  <span>Identity</span>
                </a>
                <a routerLink="/admin/groups" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#a855f7"><span class="material-symbols-outlined">forum</span></div>
                  <span>Channels</span>
                </a>
                <a routerLink="/admin/settings" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#f59e0b"><span class="material-symbols-outlined">palette</span></div>
                  <span>Brand</span>
                </a>
                <a routerLink="/" target="_blank" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#14b8a6"><span class="material-symbols-outlined">language</span></div>
                  <span>Public Site</span>
                </a>
                <a href="javascript:void(0)" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#64748b"><span class="material-symbols-outlined">summarize</span></div>
                  <span>Reports</span>
                </a>
                <a href="javascript:void(0)" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#3b82f6"><span class="material-symbols-outlined">edit_document</span></div>
                  <span>Forms</span>
                </a>
                <a href="javascript:void(0)" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#ca8a04"><span class="material-symbols-outlined">payments</span></div>
                  <span>Financials</span>
                </a>
                <a href="javascript:void(0)" (click)="closeDropdowns()" class="app-grid-item">
                  <div class="app-icon-bg" style="background:#8b5cf6"><span class="material-symbols-outlined">calendar_month</span></div>
                  <span>Events</span>
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
            <button type="button" class="topbar-action-btn" (click)="toggleDropdown('calendar', $event)" title="Calendar">
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
          <button type="button" class="topbar-action-btn" (click)="showHelpModal = true" title="Contextual Help">
            <span class="material-symbols-outlined">help_outline</span>
          </button>

          <!-- Fullscreen Toggle -->
          <button type="button" class="topbar-action-btn" (click)="toggleFullscreen()" title="Toggle Fullscreen">
            <span class="material-symbols-outlined">fullscreen</span>
          </button>

          <!-- Theme Toggle (Light / Dark) -->
          <button type="button" class="topbar-action-btn" (click)="toggleTheme()" [title]="darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
            <span class="material-symbols-outlined">{{ darkMode ? 'light_mode' : 'dark_mode' }}</span>
          </button>

          <!-- Notifications Bell -->
          <div class="notifications-wrapper">
            <button type="button" class="topbar-action-btn notification-circle-btn" (click)="toggleDropdown('notifications', $event)" title="Notifications">
              <span class="material-symbols-outlined">notifications</span>
              <sup class="notif-badge-sup" *ngIf="unreadNotifCount > 0">{{ unreadNotifCount > 9 ? '9+' : unreadNotifCount }}</sup>
            </button>
            <div class="notifications-dropdown" *ngIf="activeDropdown === 'notifications'">
              <div class="dropdown-header">
                <span>System Notifications</span>
                <div class="dropdown-hdr-actions">
                  <button type="button" class="hdr-mini-btn" (click)="markAllNotificationsRead(); $event.stopPropagation();" title="Mark all as read" *ngIf="unreadNotifCount > 0">
                    <span class="material-symbols-outlined">done_all</span>
                  </button>
                  <button type="button" class="hdr-mini-btn danger" (click)="clearAllNotifications(); $event.stopPropagation();" title="Clear all">
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
                    <div class="notif-time">{{ notif.createdAt | date:'short' }}</div>
                  </div>
                  <span class="unread-dot" *ngIf="!notif.isRead"></span>
                </div>
                <div class="notification-empty" *ngIf="!notificationFeed?.length">
                  <span class="material-symbols-outlined empty-icon">notifications_off</span>
                  <p>No notifications</p>
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
                <span>Workspace Settings</span>
              </a>
              <a routerLink="/products/console/queues" (click)="closeDropdowns()" class="dropdown-item" *ngIf="isAdmin">
                <span class="material-symbols-outlined">sync_alt</span>
                <span>Queue Monitor</span>
              </a>
              <div class="dropdown-divider"></div>
              <button type="button" (click)="onLogout()" class="dropdown-item text-danger">
                <span class="material-symbols-outlined">logout</span>
                <span>{{ 'shell.sign_out' | translate }}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Central Feature Expiration Notice Banner (Strictly visible to BCC Admins in Admin Console) -->
      <div class="central-feature-expiration-banner" *ngIf="isAdmin && isConsoleActive && expiringFeatures.length > 0">
        <div class="banner-content">
          <span class="material-symbols-outlined banner-icon">warning</span>
          <div class="banner-text">
            <span class="banner-title">{{ 'billing.notice_title' | translate }}</span>
            <span class="banner-desc">{{ getExpirationBannerText() }}</span>
          </div>
        </div>
        <div class="banner-actions">
          <a routerLink="/settings/console" class="banner-btn">{{ 'billing.review_entitlements' | translate }}</a>
        </div>
      </div>

      <!-- Page Content & AI Side-by-Side Split Workspace Container (70% Body / 30% AI) -->
      <div class="bcp-workspace-container" [class.ai-docked-bottom]="isAiOpen && aiLayoutMode === 'docked-bottom'" [class.ai-docked-right-active]="isAiOpen && aiLayoutMode === 'docked-right'">
        <div class="bcp-page-shell" [class.ai-split-70]="isAiOpen && aiLayoutMode === 'docked-right'" [class.ai-split-bottom]="isAiOpen && aiLayoutMode === 'docked-bottom'">
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
            <h3>BCP Contextual Help & Guide</h3>
          </div>
          <button (click)="showHelpModal = false" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <h4>Welcome to Ozikol BCP Multi-Tenant Workspace</h4>
          <p>This system allows you to manage members, collaborative chat channels, dynamic database-driven website pages, and brand customizations.</p>
          <ul>
            <li><strong>Taskbar Tabs:</strong> As you navigate, pages stay open as browser-like tabs in the header for quick multitasking.</li>
            <li><strong>Pin Navigation:</strong> Click the push-pin icon on any sidebar item to pin it to your personal favorites bar.</li>
            <li><strong>Theme Engine:</strong> Toggle between the crisp Light Theme and Dark Mode at any time using the moon/sun icon in the topbar.</li>
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
          <button type="button" class="btn-primary" (click)="closePrivilegesModal()">Done</button>
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
          <button (click)="closeSuiteInfoModal()" class="btn-close" aria-label="Close">&times;</button>
        </div>

        <div class="modal-body suite-info-modal-body" *ngIf="activeSuiteInfo">
          <p class="suite-info-desc">{{ activeSuiteInfo.shortDesc }}</p>

          <div class="suite-info-section">
            <div class="suite-info-section-title">
              <span class="material-symbols-outlined">group</span>
              <span>Target Organizations & Users</span>
            </div>
            <div class="suite-info-target-box">
              {{ activeSuiteInfo.whoUsesIt }}
            </div>
          </div>

          <div class="suite-info-section">
            <div class="suite-info-section-title">
              <span class="material-symbols-outlined">verified</span>
              <span>Key Capabilities & Features Unlocked</span>
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
              <span>Operational & Business Impact</span>
            </div>
            <div class="suite-info-impact-box">
              <span class="material-symbols-outlined impact-icon">lightbulb</span>
              <span>{{ activeSuiteInfo.impact }}</span>
            </div>
          </div>
        </div>

        <div class="modal-footer suite-info-modal-footer">
          <button type="button" class="btn-secondary" (click)="closeSuiteInfoModal()">Dismiss</button>
        </div>
      </div>
    </div>

    <!-- First-Run Workspace Setup & Default Website Seeder Modal -->
    <app-first-run-setup-modal
      [isOpen]="showFirstRunModal"
      [brandName]="brandName"
      (completed)="onFirstRunCompleted($event)">
    </app-first-run-setup-modal>
  `,
  styles: [`
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

    .apps-grid-wrapper, .calendar-wrapper, .notifications-wrapper, .user-profile-wrapper {
      position: relative;
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
      margin: 10px 14px 0 14px;
      padding: 10px 16px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      color: #92400e;
      font-size: 13px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
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
export class AdminLayoutComponent implements OnInit {
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

  brandName = localStorage.getItem('tenant_name') || 'Workspace';
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
   * 
   * @param suiteKey - Identifier of the suite ('user_management', 'identity', 'cms', 'settings', 'people_community')
   * @returns True if the suite should be visible and accessible in the sidebar
   */
  canAccessSuite(suiteKey: string): boolean {
    if (this.isGlobalAdmin) return true;

    switch (suiteKey) {
      case 'user_management':
        return hasUserRole('UserManager', this.userRoles) || hasUserRole('IdentityManager', this.userRoles);
      case 'identity':
        return hasUserRole('IdentityManager', this.userRoles);
      case 'cms':
        return hasUserRole('CmsManager', this.userRoles);
      case 'settings':
        return this.isGlobalAdmin;
      case 'people_community':
        return hasUserRole('UserManager', this.userRoles) || hasUserRole('IdentityManager', this.userRoles);
      default:
        return true;
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

  loadFeatureExpirations(): void {
    if (!this.isAdmin) return;
    this.api.get<any>('SettingsApi/feature-expirations').subscribe({
      next: (res) => {
        if (res && res.isSuccess && Array.isArray(res.data)) {
          this.expiringFeatures = res.data;
        }
      },
      error: () => {
        this.expiringFeatures = [];
      }
    });
  }

  getExpirationBannerText(): string {
    if (!this.expiringFeatures || this.expiringFeatures.length === 0) return '';
    const names = this.expiringFeatures.map(f => f.featureName || f.featureCode).join(', ');
    const minDays = Math.min(...this.expiringFeatures.map(f => f.daysRemaining ?? 0));
    if (minDays <= 0) {
      return `${names} capability subscription has expired. Renew immediately to restore full feature access.`;
    }
    return `${names} capability subscription expires in ${minDays} day${minDays === 1 ? '' : 's'}. Renew to maintain uninterrupted platform capabilities.`;
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
    public translation: TranslationService
  ) {}

  public get currentLang(): SupportedLanguage {
    return this.translation.currentLanguage;
  }

  public get currentLangOption(): LanguageOption {
    return this.translation.currentLanguageOption;
  }

  public get supportedLanguages(): LanguageOption[] {
    return this.translation.supportedLanguages;
  }

  public selectLanguage(lang: SupportedLanguage): void {
    this.translation.setLanguage(lang);
  }

  ngOnInit(): void {
    // Subscribe to global AI assistant layout and open state
    this.aiAssistantService.isOpen$.subscribe(open => this.isAiOpen = open);
    this.aiAssistantService.layoutMode$.subscribe(mode => this.aiLayoutMode = mode);
    // 1. Live verify and refresh session against backend DB
    this.verifyAndRefreshSession();

    // 2. Real-time SignalR security & branding listener
    this.signalR.startConnection();
    this.signalR.permissionUpdated$.subscribe((data) => {
      console.log('[AdminLayout] Live real-time permission update received via SignalR -> Syncing session...', data);
      this.verifyAndRefreshSession();
    });

    this.signalR.brandUpdated$.subscribe((data: any) => {
      console.log('[AdminLayout] Live real-time brand update received via SignalR -> Syncing brand...', data);
      if (data) {
        if (data.companyName) {
          this.brandName = data.companyName;
          document.title = `${this.brandName} - Console`;
          localStorage.setItem('tenant_name', data.companyName);
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

    // Track router changes for dynamic tabs and active sidebar menu
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.currentRoute = e.urlAfterRedirects || e.url;
      this.updateActiveMenu(this.currentRoute);
      this.handleRouteTab(this.currentRoute);
    });

    this.loadTenantInfo();
    this.loadNotificationFeed();
    this.loadSidebarForms();
    this.checkFirstRunSetupStatus();

    if (this.isAdmin) {
      this.loadFeatureExpirations();
    }

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

          // If user was demoted and is no longer an administrator
          if (freshData.isAdmin) {
            this.loadFeatureExpirations();
          } else {
            console.warn('[AdminLayout] User is no longer an Administrator. Evicting from admin dashboard...');
            this.toast.error('Your administrator permissions have been updated. Redirecting...', 'Access Revoked');
            this.router.navigate(['/portal']);
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
    if (url.startsWith('/users/console') || url.startsWith('/admin/users')) {
      this.openMenus = { users: true };
    } else if (url.startsWith('/content/console') || url.startsWith('/admin/content')) {
      this.openMenus = { content: true };
    } else if (url.startsWith('/identity/console') || url.startsWith('/admin/identity')) {
      this.openMenus = { identity: true };
    } else if (url.startsWith('/groups/console') || url.startsWith('/admin/groups')) {
      this.openMenus = { groups: true };
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
    return this.currentRoute.startsWith('/admin/content/sections');
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
          if (res.data.companyName) {
            this.brandName = res.data.companyName;
            localStorage.setItem('tenant_name', res.data.companyName);
            document.title = `${this.brandName} - Console`;
          }
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

  isAccountHubActive(): boolean {
    return (this.isCurrentRoute('/identity/console/account') || this.isCurrentRoute('/users/workspace/account')) && !this.router.url.includes('tab=');
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

    if (url.includes('/users/console/notifications')) { tabTitle = 'Notification Studio'; tabIcon = 'campaign'; }
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
    else if (url.includes('/groups')) { tabTitle = 'Group Channels'; tabIcon = 'diversity_3'; }
    else if (url.includes('/settings')) { tabTitle = 'Brand Settings'; tabIcon = 'palette'; }

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

  onLogout(): void {
    localStorage.removeItem('access_token');
    this.router.navigate(['/auth/login']);
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
}
