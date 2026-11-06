import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/**
 * Central white-label page title template strategy for all Angular routes.
 * Formats every browser tab title as: "<Page Title> | <Tenant BrandName>"
 * and guarantees that platform internal names ("Ozikol") never appear in tenant tabs.
 */
@Injectable({ providedIn: 'root' })
export class TenantPageTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }

  override updateTitle(routerState: RouterStateSnapshot): void {
    const explicitRouteTitle = this.buildTitle(routerState);
    const pageTitle = explicitRouteTitle || this.resolvePageTitleFromUrl(routerState.url || '');
    const brandName = this.resolveTenantBrandName();

    if (pageTitle) {
      this.title.setTitle(`${pageTitle} | ${brandName}`);
    } else {
      this.title.setTitle(brandName);
    }
  }

  /**
   * Resolves the active tenant's brand name from storage or subdomain,
   * stripping any internal platform identifiers.
   */
  public resolveTenantBrandName(): string {
    const saved = localStorage.getItem('tenant_name')?.trim();
    if (saved && !saved.toLowerCase().includes('ozikol') && saved.toLowerCase() !== 'organization') {
      return saved;
    }

    const host = window.location.hostname || '';
    const parts = host.split('.');
    if (
      parts.length >= 2 &&
      parts[0] !== 'www' &&
      parts[0] !== 'localhost' &&
      parts[0] !== '127' &&
      !parts[0].toLowerCase().includes('ozikol')
    ) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }

    return 'Workspace';
  }

  /**
   * Maps application URLs to clean, human-friendly page titles when a route
   * does not explicitly declare a static `title` property.
   */
  public resolvePageTitleFromUrl(url: string): string {
    const clean = (url || '').toLowerCase();

    if (clean.includes('/workspace/stations')) return 'Workstations & Gatekeeper';
    if (clean.includes('/dashboard/workspace')) return 'Workspace Home';
    if (clean.includes('/dashboard/console') || clean.includes('/admin/dashboard')) return 'Dashboard';
    if (clean.includes('/dashboard/mxmails') || clean.includes('/mxmails')) return 'MX Email Logs';
    if (clean.includes('/dashboard/mxsms') || clean.includes('/mxsms')) return 'MX SMS Logs';
    if (clean.includes('/users/console/notifications')) return 'Notification Studio';
    if (clean.includes('/users/workspace/notifications')) return 'Notifications';
    if (clean.includes('/content/console/forms') && clean.includes('/submissions')) return 'Form Leads';
    if (clean.includes('/content/console/forms')) return 'Manage Forms';
    if (clean.includes('/content/console/marketplace') || clean.includes('/admin/marketplace')) return 'UI Marketplace';
    if (clean.includes('/content/console/templates') || clean.includes('/admin/templates')) return 'My Templates';
    if (clean.includes('/content/console') || clean.includes('/admin/content')) return 'CMS Studio';
    if (clean.includes('/users/console') || clean.includes('/admin/users')) return 'User Directory';
    if (clean.includes('/identity/console/roles')) return 'Roles & Permissions';
    if (clean.includes('/identity/console/invitations')) return 'Member Invitations';
    if (clean.includes('/identity/console/policies')) return 'Global Policies';
    if (clean.includes('/identity/console/account') || clean.includes('/users/workspace/account')) return 'Manage Account';
    if (clean.includes('/identity/console') || clean.includes('/admin/identity')) return 'Identity Dashboard';
    if (clean.includes('/users/workspace/chat')) return 'Chat Room';
    if (clean.includes('/users/workspace/groups')) return 'Groups Directory';
    if (clean.includes('/users/workspace/alumni')) return 'Alumni Network';
    if (clean.includes('/users/workspace/profile/biography')) return 'My CV Biography';
    if (clean.includes('/users/workspace/profile')) return 'My Account';
    if (clean.includes('/groups')) return 'Group Channels';
    if (clean.includes('/billing/features') || clean.includes('/billing/plans') || clean.includes('/billing/console')) return 'Features & Capabilities';
    if (clean.includes('/billing/paymentmethod') || clean.includes('/billing/payment-methods')) return 'Payment Methods';
    if (clean.includes('/billing/subscriptions') || clean.includes('/billing/invoices')) return 'Subscriptions & Invoices';
    if (clean.includes('/settings')) return 'Brand Settings';
    if (clean.includes('/auth/login')) return 'Sign In';
    if (clean.includes('/auth/register')) return 'Member Registration';
    if (clean.includes('/auth/forgot-password')) return 'Forgot Password';
    if (clean.includes('/auth/reset-password')) return 'Reset Password';

    return 'Workspace';
  }
}

