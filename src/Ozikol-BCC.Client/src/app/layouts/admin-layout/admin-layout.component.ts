import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { SignalRService } from '../../core/services/signalr.service';

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

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Sidebar / Navigation Drawer -->
    <aside id="sidebar" [class.collapsed]="sidebarCollapsed" [attr.data-bcp-sidebar]="isAdmin ? 'console' : 'workspace'">
      <div class="sidebar-header">
        <a routerLink="/admin/dashboard" class="brand-logo ozikol-brand-logo" [title]="brandName">
          <img [src]="brandLogoUrl" [alt]="brandName" class="brand-logo-img" *ngIf="brandLogoUrl">
          <span *ngIf="!brandLogoUrl" class="brand-logo-text">{{ brandName || 'Workspace' }}</span>
        </a>
      </div>

      <nav class="sidebar-nav">
        <!-- Top of Sidebar: Active Operating Mode Badge -->
        <div class="sidebar-mode-top-banner" *ngIf="isAdmin">
          <div class="mode-banner-inner" [class.is-store]="websiteMode === 'ecommerce'" [class.is-website]="websiteMode !== 'ecommerce'" [title]="websiteMode === 'ecommerce' ? 'Current Mode: E-Commerce Storefront Default' : 'Current Mode: Standard Organization Website Default'">
            <div class="mode-banner-left">
              <span class="mode-pulse-dot"></span>
              <span class="material-symbols-outlined mode-banner-icon">{{ websiteMode === 'ecommerce' ? 'storefront' : 'domain' }}</span>
              <span class="mode-banner-text">{{ websiteMode === 'ecommerce' ? 'Store Default' : 'Website Default' }}</span>
            </div>
            <a routerLink="/admin/settings" class="mode-banner-tune" title="Configure Website Operating Mode in Settings">
              <span class="material-symbols-outlined">tune</span>
            </a>
          </div>
        </div>
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
        <!-- ADMIN CONSOLE SIDEBAR (when isAdmin is true)   -->
        <!-- ============================================== -->
        <ng-container *ngIf="isAdmin">
          <div class="menu-title">Command Center</div>
          <div class="nav-item">
            <a routerLink="/dashboard/console" [class.active]="isCurrentRoute('/dashboard/console') || isCurrentRoute('/admin/dashboard')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">space_dashboard</span>
                <span>Console Dashboard</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/dashboard/console')" (click)="togglePin('Console Dashboard', '/dashboard/console', 'space_dashboard'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/dashboard/console') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/dashboard/console') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>
          <span class="nav-link disabled">
            <span class="nav-link-content">
              <span class="material-symbols-outlined">payments</span>
              <span>Feature Billing</span>
            </span>
            <span class="badge-pill badge-soon">Soon</span>
          </span>
          <span class="nav-link disabled">
            <span class="nav-link-content">
              <span class="material-symbols-outlined">security</span>
              <span>Security Audit</span>
            </span>
            <span class="badge-pill badge-soon">Soon</span>
          </span>

          <div class="menu-title">Content CMS Studio</div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('content')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isCmsStudioActive()" (click)="toggleMenu('content')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">dynamic_feed</span>
                <span>CMS Studio</span>
                <span class="badge-pill badge-new">Live</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('content')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console" [class.active]="isCurrentRoute('/content/console')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>CMS Dashboard</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console')" (click)="togglePin('CMS Dashboard', '/content/console', 'dynamic_feed')" [title]="isPinned('/content/console') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/categories" [class.active]="isContentCategoriesActive()" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">folder_open</span>Web Categories</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/categories')" (click)="togglePin('Web Categories', '/content/console/categories', 'folder_open')" [title]="isPinned('/content/console/categories') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console/categories') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/pages" [class.active]="isContentPagesActive()" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">description</span>All Web Pages</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/pages')" (click)="togglePin('Web Pages', '/content/console/pages', 'description')" [title]="isPinned('/content/console/pages') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console/pages') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/sliders" [class.active]="isContentSlidersActive()" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">view_carousel</span>Hero Sliders</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/sliders')" (click)="togglePin('Hero Sliders', '/content/console/sliders', 'view_carousel')" [title]="isPinned('/content/console/sliders') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console/sliders') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/faqs" [class.active]="isParentActive('/content/console/faqs')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">quiz</span>FAQs & Categories</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/faqs')" (click)="togglePin('FAQs', '/content/console/faqs', 'quiz')" [title]="isPinned('/content/console/faqs') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console/faqs') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/blogs" [class.active]="isParentActive('/content/console/blogs')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">post_add</span>Blog Articles</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/blogs')" (click)="togglePin('Blog Articles', '/content/console/blogs', 'post_add')" [title]="isPinned('/content/console/blogs') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console/blogs') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/content/console/blog-categories" [class.active]="isParentActive('/content/console/blog-categories')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">topic</span>Blog Categories</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/blog-categories')" (click)="togglePin('Blog Categories', '/content/console/blog-categories', 'topic')" [title]="isPinned('/content/console/blog-categories') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/content/console/blog-categories') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <!-- My Installed Templates Standalone Menu Item -->
          <div class="nav-item">
            <a routerLink="/content/console/templates" routerLinkActive="active" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">layers</span>
                <span>My Templates</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/templates')" (click)="togglePin('My Templates', '/content/console/templates', 'layers'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/content/console/templates') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/content/console/templates') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>

          <!-- UI Marketplace Standalone Menu Item -->
          <div class="nav-item">
            <a routerLink="/content/console/marketplace" routerLinkActive="active" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">widgets</span>
                <span>UI Marketplace</span>
                <span class="badge-pill badge-hot">36+</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/content/console/marketplace')" (click)="togglePin('UI Marketplace', '/content/console/marketplace', 'widgets'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/content/console/marketplace') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/content/console/marketplace') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>

          <!-- Commerce & Store Studio Feature -->
          <div class="menu-title">Commerce & Store Studio</div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('commerce')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/products/console')" (click)="toggleMenu('commerce')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">storefront</span>
                <span>Commerce Studio</span>
                <span class="badge-pill badge-new">New</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('commerce')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/products/console" [class.active]="isCurrentRoute('/products/console')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">inventory_2</span>Products Catalog</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/products/console')" (click)="togglePin('Products Catalog', '/products/console', 'inventory_2')" [title]="isPinned('/products/console') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/products/console') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/products/console/create" [class.active]="isCurrentRoute('/products/console/create')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">add_circle</span>Create Product</span>
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
                  <a routerLink="/products/console/marketing" [class.active]="isCurrentRoute('/products/console/marketing')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">campaign</span>Broadcast Studio</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/products/console/marketing')" (click)="togglePin('Broadcast Studio', '/products/console/marketing', 'campaign')" [title]="isPinned('/products/console/marketing') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/products/console/marketing') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/products/console/orders" [class.active]="isCurrentRoute('/products/console/orders')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">local_shipping</span>Customer Orders</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/products/console/orders')" (click)="togglePin('Customer Orders', '/products/console/orders', 'local_shipping')" [title]="isPinned('/products/console/orders') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/products/console/orders') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/products/console/transactions" [class.active]="isCurrentRoute('/products/console/transactions')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">receipt_long</span>Financial Ledger</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/products/console/transactions')" (click)="togglePin('Financial Ledger', '/products/console/transactions', 'receipt_long')" [title]="isPinned('/products/console/transactions') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/products/console/transactions') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
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

          <div class="menu-title">Identity Administration</div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('identity')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/identity/console') || isParentActive('/admin/identity')" (click)="toggleMenu('identity')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">admin_panel_settings</span>
                <span>Identity Control</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('identity')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/identity/console/dashboard" [class.active]="isCurrentRoute('/identity/console/dashboard') || isCurrentRoute('/identity/console')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">analytics</span>Console Overview</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/dashboard')" (click)="togglePin('Identity Dashboard', '/identity/console/dashboard', 'analytics')" [title]="isPinned('/identity/console/dashboard') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console/dashboard') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/identity/console/roles" [class.active]="isCurrentRoute('/identity/console/roles')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">verified_user</span>Roles & Permissions</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/roles')" (click)="togglePin('Roles & Permissions', '/identity/console/roles', 'verified_user')" [title]="isPinned('/identity/console/roles') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console/roles') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/identity/console/invitations" [class.active]="isCurrentRoute('/identity/console/invitations')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">mail</span>Invitations</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/invitations')" (click)="togglePin('User Invitations', '/identity/console/invitations', 'mail')" [title]="isPinned('/identity/console/invitations') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console/invitations') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/identity/console/audit-logs" [class.active]="isCurrentRoute('/identity/console/audit-logs')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">history</span>Security Logs</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/audit-logs')" (click)="togglePin('Security Logs', '/identity/console/audit-logs', 'history')" [title]="isPinned('/identity/console/audit-logs') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console/audit-logs') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/identity/console/policies" [class.active]="isCurrentRoute('/identity/console/policies')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">password</span>Global Policies</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/identity/console/policies')" (click)="togglePin('Global Policies', '/identity/console/policies', 'password')" [title]="isPinned('/identity/console/policies') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/identity/console/policies') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <div class="menu-title">User Management</div>
          <div class="nav-item has-sub" [class.open]="isMenuOpen('users')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/users/console') || isParentActive('/admin/users')" (click)="toggleMenu('users')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">groups</span>
                <span>User Directory</span>
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
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">groups</span>All Members</span>
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
                  <a routerLink="/users/console/kpi" [class.active]="isUserKpiActive()" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">monitoring</span>KPIs & Leaderboard</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/console/kpi')" (click)="togglePin('KPIs & Leaderboard', '/users/console/kpi', 'monitoring')" [title]="isPinned('/users/console/kpi') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/console/kpi') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/console/activity" [class.active]="isCurrentRoute('/users/console/activity')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">history</span>Activity Audit Logs</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/console/activity')" (click)="togglePin('Activity Logs', '/users/console/activity', 'history')" [title]="isPinned('/users/console/activity') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/console/activity') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/users/console/notifications" [class.active]="isCurrentRoute('/users/console/notifications')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">campaign</span>Notification Studio</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/users/console/notifications')" (click)="togglePin('Notification Studio', '/users/console/notifications', 'campaign')" [title]="isPinned('/users/console/notifications') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/users/console/notifications') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <div class="menu-title">People & Community</div>
          
          <!-- 1. Groups & Communities Dropdown -->
          <div class="nav-item has-sub" [class.open]="isMenuOpen('groups')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/groups/console') || isParentActive('/admin/groups')" (click)="toggleMenu('groups')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">diversity_3</span>
                <span>{{ groupAlias || 'Groups & Communities' }}</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('groups')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/groups/console" [class.active]="isParentActive('/groups/console')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">space_dashboard</span>{{ groupAlias || 'Groups' }} Dashboard</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/groups/console')" (click)="togglePin((groupAlias || 'Groups') + ' Dashboard', '/groups/console', 'space_dashboard')" [title]="isPinned('/groups/console') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/groups/console') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <!-- 2. Alumni Suite Dropdown -->
          <div class="nav-item has-sub" [class.open]="isMenuOpen('alumni')">
            <a class="nav-link" href="javascript:void(0)" [class.active]="isParentActive('/admin/alumni') || isParentActive('/users/workspace/alumni')" (click)="toggleMenu('alumni')">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">school</span>
                <span>{{ alumniAlias || 'Alumni' }} Suite</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
            <ul class="nav-submenu" *ngIf="isMenuOpen('alumni')">
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/admin/alumni" [class.active]="isCurrentRoute('/admin/alumni') || isCurrentRoute('/users/workspace/alumni')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">group</span>{{ alumniAlias || 'Alumni' }} Network</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/admin/alumni')" (click)="togglePin((alumniAlias || 'Alumni') + ' Network', '/admin/alumni', 'group')" [title]="isPinned('/admin/alumni') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/admin/alumni') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
              <li>
                <div class="sub-nav-wrapper">
                  <a routerLink="/admin/alumni/cohorts" [class.active]="isCurrentRoute('/admin/alumni/cohorts')" class="sub-nav-item">
                    <span class="sub-nav-content"><span class="material-symbols-outlined sub-icon">calendar_month</span>Graduation Sets & Cohorts</span>
                  </a>
                  <button type="button" class="pin-btn" [class.pinned]="isPinned('/admin/alumni/cohorts')" (click)="togglePin((alumniAlias || 'Alumni') + ' Cohorts', '/admin/alumni/cohorts', 'calendar_month')" [title]="isPinned('/admin/alumni/cohorts') ? 'Unpin Task' : 'Pin Task'">
                    <span class="material-symbols-outlined">{{ isPinned('/admin/alumni/cohorts') ? 'keep_off' : 'push_pin' }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <!-- 3. Ozikol Chat Messenger (DIRECT ITEM - NO DROPDOWN) -->
          <div class="nav-item">
            <a routerLink="/admin/messenger" [class.active]="isCurrentRoute('/admin/messenger') || isCurrentRoute('/users/workspace/chat')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">chat</span>
                <span>Ozikol Chat Messenger</span>
                <span class="badge-pill badge-hot">Live</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/admin/messenger')" (click)="togglePin('Chat Messenger', '/admin/messenger', 'chat'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/admin/messenger') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/admin/messenger') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>

          <div class="menu-title">Configuration</div>
          <div class="nav-item">
            <a routerLink="/settings/console" [class.active]="isParentActive('/settings/console') || isParentActive('/admin/settings')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">palette</span>
                <span>Brand & Settings</span>
                <span class="badge-pill badge-hot">Hot</span>
              </div>
              <button type="button" class="pin-btn" [class.pinned]="isPinned('/settings/console')" (click)="togglePin('Brand Settings', '/settings/console', 'palette'); $event.preventDefault(); $event.stopPropagation();" [title]="isPinned('/settings/console') ? 'Unpin Task' : 'Pin Task'">
                <span class="material-symbols-outlined">{{ isPinned('/settings/console') ? 'keep_off' : 'push_pin' }}</span>
              </button>
            </a>
          </div>

          <div class="menu-title">Reports & Knowledge</div>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">summarize</span><span>Dynamic Reports</span></span>
            <span class="badge-pill badge-soon">Soon</span>
          </span>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">dynamic_form</span><span>Forms & Surveys</span></span>
            <span class="badge-pill badge-soon">Soon</span>
          </span>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">menu_book</span><span>Knowledge Base</span></span>
            <span class="badge-pill badge-soon">Soon</span>
          </span>

          <div class="menu-title">Finance & Revenue</div>
          <span class="nav-link disabled">
            <span class="nav-link-content"><span class="material-symbols-outlined">account_balance_wallet</span><span>Financials & Dues</span></span>
            <span class="badge-pill badge-soon">Soon</span>
          </span>
          <div class="menu-divider" style="margin: 15px 0 10px; border-top: 1px solid rgba(255,255,255,0.08);"></div>
          <div class="menu-title">Personal Workspace</div>
          <div class="nav-item">
            <a routerLink="/users/workspace/profile/biography" [class.active]="isCurrentRoute('/users/workspace/profile/biography')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">assignment_ind</span>
                <span>My CV Biography</span>
              </div>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/users/workspace/chat" [class.active]="isCurrentRoute('/users/workspace/chat')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">chat</span>
                <span>Chat Room</span>
              </div>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/users/workspace/groups" [class.active]="isCurrentRoute('/users/workspace/groups')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">groups</span>
                <span>Groups Directory</span>
              </div>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/users/workspace/alumni" [class.active]="isCurrentRoute('/users/workspace/alumni')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">school</span>
                <span>Alumni Network</span>
              </div>
            </a>
          </div>
        </ng-container>

        <!-- ============================================== -->
        <!-- MEMBER WORKSPACE SIDEBAR (when isAdmin is false)-->
        <!-- ============================================== -->
        <ng-container *ngIf="!isAdmin">
          <div class="menu-title">Member Workspace</div>
          <div class="nav-item">
            <a routerLink="/dashboard/workspace" [class.active]="isCurrentRoute('/dashboard/workspace') || isCurrentRoute('/users/workspace/dashboard')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">space_dashboard</span>
                <span>Workspace Home</span>
              </div>
            </a>
          </div>

          <div class="menu-title">My Dossier & Profile</div>
          <div class="nav-item">
            <a routerLink="/users/workspace/profile" [class.active]="isCurrentRoute('/users/workspace/profile')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">person</span>
                <span>My Profile</span>
              </div>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/users/workspace/profile/biography" [class.active]="isCurrentRoute('/users/workspace/profile/biography')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">assignment_ind</span>
                <span>My CV Biography</span>
              </div>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/users/workspace/kpi" [class.active]="isCurrentRoute('/users/workspace/kpi')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">monitoring</span>
                <span>My KPIs & Performance</span>
              </div>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/users/workspace/purchases" [class.active]="isCurrentRoute('/users/workspace/purchases')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">shopping_bag</span>
                <span>My Purchases</span>
              </div>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/users/workspace/security" [class.active]="isCurrentRoute('/users/workspace/security')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">lock_reset</span>
                <span>Security & Password</span>
              </div>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/users/workspace/notifications" [class.active]="isCurrentRoute('/users/workspace/notifications')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">notifications</span>
                <span>Notifications & Alerts</span>
              </div>
            </a>
          </div>

          <div class="menu-title">Community & Channels</div>
          <div class="nav-item">
            <a routerLink="/users/workspace/chat" [class.active]="isCurrentRoute('/users/workspace/chat')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">chat</span>
                <span>Ozikol Chat Messenger</span>
                <span class="badge-pill badge-hot">Live</span>
              </div>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/users/workspace/groups" [class.active]="isCurrentRoute('/users/workspace/groups')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">groups</span>
                <span>Groups Directory</span>
              </div>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/users/workspace/alumni" [class.active]="isCurrentRoute('/users/workspace/alumni')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">school</span>
                <span>Alumni Network</span>
              </div>
            </a>
          </div>
          <div class="nav-item">
            <a routerLink="/users/workspace/alumni/cohorts" [class.active]="isCurrentRoute('/users/workspace/alumni/cohorts')" class="nav-link">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">calendar_month</span>
                <span>Alumni Cohorts & Sets</span>
              </div>
            </a>
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
            <input type="text" placeholder="Search workspace..." aria-label="Search">
          </div>
        </div>

        <div class="topbar-right">
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
                <span class="user-profile-role">{{ isAdmin ? 'SuperAdmin' : 'Member' }}</span>
              </div>
            </button>
            <div class="user-profile-dropdown" *ngIf="activeDropdown === 'profile'">
              <div class="profile-dropdown-header">
                <strong>{{ userFullName }}</strong>
                <small>{{ userEmail }}</small>
              </div>
              <a routerLink="/dashboard/console" (click)="closeDropdowns()" class="dropdown-item" *ngIf="isAdmin">
                <span class="material-symbols-outlined">space_dashboard</span>
                <span>Console Dashboard (Admin)</span>
              </a>
              <a routerLink="/dashboard/workspace" (click)="closeDropdowns()" class="dropdown-item">
                <span class="material-symbols-outlined">badge</span>
                <span>{{ isAdmin ? 'Switch to Member Workspace' : 'My Workspace Home' }}</span>
              </a>
              <a routerLink="/users/workspace/profile" (click)="closeDropdowns()" class="dropdown-item">
                <span class="material-symbols-outlined">account_circle</span>
                <span>My Profile</span>
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
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content Shell -->
      <div class="bcp-page-shell">
        <router-outlet></router-outlet>
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
    .bcp-page-shell {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      min-width: 0;
      background-color: var(--md-sys-color-background);
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
  `]
})
export class AdminLayoutComponent implements OnInit {
  sidebarCollapsed = false;
  darkMode = false;
  brandName = localStorage.getItem('tenant_name') || 'Workspace';
  brandAbbreviation = localStorage.getItem('tenant_abbreviation') || 'CC';
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
    const rolesJson = localStorage.getItem('user_roles');
    if (rolesJson) {
      try {
        const roles: string[] = JSON.parse(rolesJson);
        return roles.some(r => ['superadmin', 'admin', 'identitymanager', 'cmsmanager', 'systemadministrator'].includes(r.toLowerCase()));
      } catch {}
    }
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const roleClaim = payload['role'] || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        const roles = Array.isArray(roleClaim) ? roleClaim : [roleClaim];
        return roles.some((r: string) => ['superadmin', 'admin', 'identitymanager', 'cmsmanager'].includes(r?.toLowerCase()));
      } catch {}
    }
    return false;
  }
  showHelpModal = false;

  currentRoute = '/admin/dashboard';
  websiteMode: string = localStorage.getItem('tenant_website_mode') || 'standard';
  openTabs: TaskTab[] = [
    { title: 'Dashboard', url: '/admin/dashboard', icon: 'dashboard', closable: false }
  ];

  pinnedItems: PinnedItem[] = [];
  notificationFeed: any[] = [];
  unreadNotifCount = 0;

  openMenus: { [key: string]: boolean } = {};
  activeDropdown: string | null = null;

  constructor(
    private api: ApiService, 
    private router: Router, 
    private toast: ToastService,
    private signalR: SignalRService
  ) {}

  ngOnInit(): void {
    // 1. Live verify and refresh session against backend DB
    this.verifyAndRefreshSession();

    // 2. Real-time SignalR security listener
    this.signalR.startConnection();
    this.signalR.permissionUpdated$.subscribe((data) => {
      console.log('[AdminLayout] Live real-time permission update received via SignalR -> Syncing session...', data);
      this.verifyAndRefreshSession();
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

    // Listen for live brand settings updates from the Settings page
    window.addEventListener('brand_settings_updated', () => {
      this.loadTenantInfo();
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
          if (!freshData.isAdmin) {
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
    if (url.startsWith('/admin/users')) {
      this.openMenus = { users: true };
    } else if (url.startsWith('/admin/content')) {
      this.openMenus = { content: true };
    } else if (url.startsWith('/admin/identity')) {
      this.openMenus = { identity: true };
    } else if (url.startsWith('/admin/groups')) {
      this.openMenus = { groups: true };
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
        this.currentRoute.startsWith('/admin/templates')) {
      return false;
    }
    return this.currentRoute.startsWith('/content/console') ||
           this.currentRoute.startsWith('/admin/content');
  }

  isUserListActive(): boolean {
    return this.currentRoute === '/admin/users/list' ||
           this.currentRoute.startsWith('/admin/users/create') ||
           this.currentRoute.startsWith('/admin/users/edit') ||
           this.currentRoute.startsWith('/admin/users/details');
  }

  isUserCategoriesActive(): boolean {
    return this.currentRoute.startsWith('/admin/users/categories');
  }

  isUserKpiActive(): boolean {
    return this.currentRoute.startsWith('/admin/users/kpi');
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

  isContentSlidersActive(): boolean {
    return this.currentRoute.startsWith('/admin/content/sliders');
  }

  isContentFaqsActive(): boolean {
    return this.currentRoute.startsWith('/admin/content/faqs');
  }

  loadTenantInfo(): void {
    this.api.get<any>('SettingsApi/brand').subscribe({
      next: (res) => {
        if (res?.data) {
          if (res.data.companyName) {
            this.brandName = res.data.companyName;
            localStorage.setItem('tenant_name', res.data.companyName);
            document.title = `${this.brandName} - Console`;
          }
          if (res.data.companyNameAbbreviation) {
            this.brandAbbreviation = res.data.companyNameAbbreviation;
            localStorage.setItem('tenant_abbreviation', res.data.companyNameAbbreviation);
          }
          this.brandLogoUrl = res.data.companyLogoUrl || '';
          if (res.data.companyLogoUrl) {
            localStorage.setItem('tenant_logo', res.data.companyLogoUrl);
          } else {
            localStorage.removeItem('tenant_logo');
          }

          this.brandIconUrl = res.data.companyIconUrl || '';
          if (res.data.companyIconUrl) {
            localStorage.setItem('tenant_icon', res.data.companyIconUrl);
            const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
            if (favicon) favicon.href = res.data.companyIconUrl;
          } else {
            localStorage.removeItem('tenant_icon');
            const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
            if (favicon) favicon.href = 'data:,';
          }
        }
      },
      error: () => {}
    });

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
        !target.closest('.user-profile-wrapper')) {
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
    else if (url.includes('/content/console/marketplace') || url.includes('/admin/marketplace')) { tabTitle = 'UI Marketplace'; tabIcon = 'widgets'; }
    else if (url.includes('/content/console/templates') || url.includes('/admin/templates')) { tabTitle = 'My Templates'; tabIcon = 'layers'; }
    else if (url.includes('/content/console') || url.includes('/admin/content')) { tabTitle = 'CMS Studio'; tabIcon = 'dynamic_feed'; }
    else if (url.includes('/users/console') || url.includes('/admin/users')) { tabTitle = 'User Directory'; tabIcon = 'groups'; }
    else if (url.includes('/identity/console') || url.includes('/admin/identity')) { tabTitle = 'Identity & Roles'; tabIcon = 'admin_panel_settings'; }
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
}
