import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ResetPasswordComponent } from './pages/auth/reset-password/reset-password.component';
import { AccessDeniedComponent } from './pages/auth/access-denied/access-denied.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';

// Dashboards
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';
import { WorkspaceDashboardComponent } from './pages/workspace/workspace-dashboard.component';
import { WorkspaceProfileComponent } from './pages/workspace/workspace-profile.component';
import { WorkspaceKpiComponent } from './pages/workspace/workspace-kpi.component';
import { WorkspaceSecurityComponent } from './pages/workspace/workspace-security.component';
import { WorkspacePurchasesComponent } from './pages/workspace/workspace-purchases.component';

// BCP Communities, Groups & Alumni Collaboration Components
import { GroupsChatComponent } from './pages/workspace/groups/groups-chat.component';
import { GroupsDirectoryComponent } from './pages/workspace/groups/groups-directory.component';
import { AlumniNetworkComponent } from './pages/workspace/alumni/alumni-network.component';
import { AlumniBioPageComponent } from './pages/workspace/alumni/alumni-bio-page.component';
import { AlumniCohortsComponent } from './pages/workspace/alumni/alumni-cohorts.component';
import { BiographyEditComponent } from './pages/workspace/profile/biography-edit.component';

// User Management Multi-Page Suite (Console)
import { UserDashboardComponent } from './pages/admin/users/user-dashboard.component';
import { UsersListComponent } from './pages/admin/users/users-list.component';
import { UserCreateComponent } from './pages/admin/users/user-create.component';
import { UserDetailsComponent } from './pages/admin/users/user-details.component';
import { UserEditComponent } from './pages/admin/users/user-edit.component';
import { UserCategoriesComponent } from './pages/admin/users/user-categories.component';
import { CategoryEditComponent } from './pages/admin/users/category-edit.component';
import { UserKpiComponent } from './pages/admin/users/user-kpi.component';
import { KpiMetricEditComponent } from './pages/admin/users/kpi-metric-edit.component';
import { KpiGradeComponent } from './pages/admin/users/kpi-grade.component';
import { UserActivityComponent } from './pages/admin/users/user-activity.component';
import { NotificationsManagementComponent } from './pages/admin/users/notifications-management.component';
import { RegistrationFormBuilderComponent } from './pages/admin/users/registration-form-builder.component';
import { AuthPageSetupComponent } from './pages/admin/users/auth-page-setup.component';
import { UserSettingsComponent } from './pages/admin/users/user-settings.component';
import { WorkspaceNotificationsComponent } from './pages/workspace/workspace-notifications.component';

import { IdentityDashboardComponent } from './pages/admin/identity/identity-dashboard.component';
import { IdentityRolesComponent } from './pages/admin/identity/identity-roles.component';
import { IdentityInvitationsComponent } from './pages/admin/identity/identity-invitations.component';
import { IdentityInvitationCreateComponent } from './pages/admin/identity/identity-invitation-create.component';
import { IdentityAuditLogsComponent } from './pages/admin/identity/identity-audit-logs.component';
import { IdentityPoliciesComponent } from './pages/admin/identity/identity-policies.component';
import { IdentityAccountComponent } from './pages/admin/identity/identity-account.component';
import { GroupsComponent } from './pages/admin/groups/groups.component';
import { SettingsComponent } from './pages/admin/settings/settings.component';
import { CustomDomainComponent } from './pages/admin/settings/custom-domain.component';

import { CmsDashboardComponent } from './pages/admin/content/cms-dashboard.component';
import { MarketplaceComponent } from './pages/admin/content/marketplace/marketplace.component';
import { MyTemplatesComponent } from './pages/admin/content/templates/my-templates.component';
import { TemplateVisualsComponent } from './pages/admin/content/templates/template-visuals.component';
import { ImportWebsiteTemplateComponent } from './pages/admin/content/templates/import-website-template.component';
import { TemplateMaintenanceComponent } from './pages/admin/content/templates/template-maintenance.component';
import { FormsListComponent } from './pages/admin/content/forms/forms-list.component';
import { FormBuilderComponent } from './pages/admin/content/forms/form-builder.component';
import { FormSubmissionsComponent } from './pages/admin/content/forms/form-submissions.component';
import { WebPagesComponent } from './pages/admin/content/web-pages.component';
import { WebPageDetailsComponent } from './pages/admin/content/web-page-details.component';
import { WebPageEditComponent } from './pages/admin/content/web-page-edit.component';
import { WebCategoriesComponent } from './pages/admin/content/web-categories.component';
import { WebCategoryEditComponent } from './pages/admin/content/web-category-edit.component';
import { WebCategoryDeleteComponent } from './pages/admin/content/web-category-delete.component';
import { PageSectionsComponent } from './pages/admin/content/page-sections.component';
import { PageSectionDetailsComponent } from './pages/admin/content/page-section-details.component';
import { PageSectionEditComponent } from './pages/admin/content/page-section-edit.component';
import { PageSectionDeleteComponent } from './pages/admin/content/page-section-delete.component';
import { PageSectionListEditComponent } from './pages/admin/content/page-section-list-edit.component';
import { PageSectionListDeleteComponent } from './pages/admin/content/page-section-list-delete.component';
import { BlogsManagementComponent } from './pages/admin/cms/blogs-management.component';
import { BlogCategoriesManagementComponent } from './pages/admin/cms/blog-categories-management.component';
import { BlogCategoryDeleteComponent } from './pages/admin/cms/blog-category-delete.component';
import { BlogEditComponent } from './pages/admin/cms/blog-edit.component';
import { BlogDeleteComponent } from './pages/admin/cms/blog-delete.component';
import { UserDeleteComponent } from './pages/admin/users/user-delete.component';
import { UserCategoryDeleteComponent } from './pages/admin/users/user-category-delete.component';
import { KpiMetricDeleteComponent } from './pages/admin/users/kpi-metric-delete.component';
import { WebPageDeleteComponent } from './pages/admin/content/web-page-delete.component';

// Commerce Studio & Storefront Components
import { ProductsListComponent } from './pages/admin/products/products-list.component';
import { ProductCreateComponent } from './pages/admin/products/product-create.component';
import { ProductEditComponent } from './pages/admin/products/product-edit.component';
import { ProductDeleteComponent } from './pages/admin/products/product-delete.component';
import { ProductCategoriesComponent } from './pages/admin/products/product-categories.component';
import { ProductCategoryEditComponent } from './pages/admin/products/product-category-edit.component';
import { ProductCategoryDeleteComponent } from './pages/admin/products/product-category-delete.component';
import { ProductMarketingComponent } from './pages/admin/products/product-marketing.component';
import { ProductQueuesComponent } from './pages/admin/products/product-queues.component';
import { ProductOrdersComponent } from './pages/admin/products/product-orders.component';
import { ProductTransactionsComponent } from './pages/admin/products/product-transactions.component';
import { ProductOrderDetailsComponent } from './pages/admin/products/product-order-details.component';

// Public Storefront
import { StoreCatalogComponent } from './pages/store/store-catalog.component';
import { StoreProductDetailsComponent } from './pages/store/store-product-details.component';
import { StoreCartComponent } from './pages/store/store-cart.component';
import { StoreCheckoutComponent } from './pages/store/store-checkout.component';

import { authGuard } from './core/guards/auth.guard';

import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';

export const routes: Routes = [
  // Public Landing
  { path: '', component: LandingComponent, pathMatch: 'full' },

  // Unified Authentication Shell & Flows (Login, Password Reset, Access Denied) - Dedicated Split-Screen
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
      { path: 'reset-password', component: ResetPasswordComponent },
      { path: 'forgot-password', component: ResetPasswordComponent },
      { path: 'access-denied', component: AccessDeniedComponent },
      { path: 'register', redirectTo: '/register', pathMatch: 'full' }
    ]
  },

  // Dedicated Standalone Member Onboarding & Registration Suite (Full-Width Viewport, Outside AuthLayout)
  { path: 'register', component: RegisterComponent },
  { path: 'join', component: RegisterComponent },
  { path: 'apply', component: RegisterComponent },
  { path: 'enroll', component: RegisterComponent },
  { path: 'get-started', component: RegisterComponent },
  { path: 'onboarding', component: RegisterComponent },
  { path: 'signup', component: RegisterComponent },
  { path: 'auth/:customSlug', component: RegisterComponent },
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'reset-password', redirectTo: 'auth/reset-password', pathMatch: 'full' },
  { path: 'forgot-password', redirectTo: 'auth/reset-password', pathMatch: 'full' },
  { path: 'access-denied', redirectTo: 'auth/access-denied', pathMatch: 'full' },

  // Public Storefront & Commerce Catalog
  { path: 'store', component: StoreCatalogComponent },
  { path: 'store/product/:slug', component: StoreProductDetailsComponent },
  { path: 'store/cart', component: StoreCartComponent },
  { path: 'store/checkout', component: StoreCheckoutComponent },

  // Unified Application Shell (Console & Workspace)
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      // 1. Unified Dashboards
      { path: 'dashboard/console', component: DashboardComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager', 'CmsManager'] } },
      { path: 'dashboard/workspace', component: WorkspaceDashboardComponent },
      { path: 'dashboard/mxmails', loadComponent: () => import('./pages/admin/mxmails/mxmails.component').then(m => m.MxMailsComponent), data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'admin/dashboard/mxmails', redirectTo: 'dashboard/mxmails', pathMatch: 'full' },
      { path: 'admin/mxmails', redirectTo: 'dashboard/mxmails', pathMatch: 'full' },
      { path: 'mxmails', redirectTo: 'dashboard/mxmails', pathMatch: 'full' },
      { path: 'dashboard', redirectTo: 'dashboard/console', pathMatch: 'full' },

      // 2. User Management Suite: Console (Admin & User Manager)
      { path: 'users/console', component: UserDashboardComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/dashboard', component: UserDashboardComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/list', component: UsersListComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/create', component: UserCreateComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/details/:id', component: UserDetailsComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/details/:id/permissions', loadComponent: () => import('./pages/admin/users/user-permissions.component').then(m => m.UserPermissionsComponent), data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/permissions/:id', loadComponent: () => import('./pages/admin/users/user-permissions.component').then(m => m.UserPermissionsComponent), data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/edit/:id', component: UserEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/delete/:id', component: UserDeleteComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/categories', component: UserCategoriesComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/categories/create', component: CategoryEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/categories/edit/:id', component: CategoryEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/categories/delete/:id', component: UserCategoryDeleteComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/kpi', component: UserKpiComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/kpi/metrics/create', component: KpiMetricEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/kpi/metrics/edit/:id', component: KpiMetricEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/kpi/metrics/delete/:id', component: KpiMetricDeleteComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/kpi/grade/:userId', component: KpiGradeComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/activity', component: UserActivityComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/registration-form', component: RegistrationFormBuilderComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/auth-setup', component: AuthPageSetupComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/settings', component: UserSettingsComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'users/console/notifications', component: NotificationsManagementComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },

      // Backward-Compatibility Aliases for Admin Users Suite
      { path: 'admin/users', redirectTo: 'users/console/list', pathMatch: 'full' },
      { path: 'admin/users/dashboard', redirectTo: 'users/console/dashboard', pathMatch: 'full' },
      { path: 'admin/users/list', redirectTo: 'users/console/list', pathMatch: 'full' },
      { path: 'admin/users/create', redirectTo: 'users/console/create', pathMatch: 'full' },
      { path: 'admin/users/details/:id', redirectTo: 'users/console/details/:id' },
      { path: 'admin/users/edit/:id', redirectTo: 'users/console/edit/:id' },
      { path: 'admin/users/delete/:id', redirectTo: 'users/console/delete/:id' },
      { path: 'admin/users/categories', redirectTo: 'users/console/categories', pathMatch: 'full' },
      { path: 'admin/users/categories/create', redirectTo: 'users/console/categories/create', pathMatch: 'full' },
      { path: 'admin/users/categories/edit/:id', redirectTo: 'users/console/categories/edit/:id' },
      { path: 'admin/users/categories/delete/:id', redirectTo: 'users/console/categories/delete/:id' },
      { path: 'admin/users/kpi', redirectTo: 'users/console/kpi', pathMatch: 'full' },
      { path: 'admin/users/kpi/metrics/create', redirectTo: 'users/console/kpi/metrics/create', pathMatch: 'full' },
      { path: 'admin/users/kpi/metrics/edit/:id', redirectTo: 'users/console/kpi/metrics/edit/:id' },
      { path: 'admin/users/kpi/metrics/delete/:id', redirectTo: 'users/console/kpi/metrics/delete/:id' },
      { path: 'admin/users/kpi/grade/:userId', redirectTo: 'users/console/kpi/grade/:userId' },
      { path: 'admin/users/activity', redirectTo: 'users/console/activity', pathMatch: 'full' },
      { path: 'admin/users/settings', redirectTo: 'users/console/settings', pathMatch: 'full' },
      { path: 'admin/users/notifications', redirectTo: 'users/console/notifications', pathMatch: 'full' },

      // 2. User Management Suite: Workspace (Member Self-Service)
      { path: 'users/workspace', component: WorkspaceDashboardComponent },
      { path: 'users/workspace/dashboard', component: WorkspaceDashboardComponent },
      { path: 'users/workspace/profile', component: WorkspaceProfileComponent },
      { path: 'users/workspace/kpi', component: WorkspaceKpiComponent },
      { path: 'users/workspace/security', component: WorkspaceSecurityComponent },
      { path: 'users/workspace/account', component: IdentityAccountComponent },
      { path: 'users/workspace/notifications', component: WorkspaceNotificationsComponent },
      { path: 'users/workspace/purchases', component: WorkspacePurchasesComponent },
      { path: 'users/workspace/activity', component: WorkspaceDashboardComponent },
      
      // BCP Communities, Groups & Alumni network routes
      { path: 'users/workspace/chat', component: GroupsChatComponent },
      { path: 'users/workspace/groups', component: GroupsDirectoryComponent },
      { path: 'users/workspace/alumni', component: AlumniNetworkComponent },
      { path: 'users/workspace/alumni/bio/:id', component: AlumniBioPageComponent },
      { path: 'users/workspace/alumni/cohorts', component: AlumniCohortsComponent },
      { path: 'users/workspace/profile/biography', component: BiographyEditComponent },

      { path: 'admin/messenger', component: GroupsChatComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'admin/alumni', component: AlumniNetworkComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'admin/alumni/bio/:id', component: AlumniBioPageComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'admin/alumni/cohorts', component: AlumniCohortsComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },

      { path: 'notifications', redirectTo: 'users/workspace/notifications', pathMatch: 'full' },

      // 3. Groups & Channels
      { path: 'groups/console', component: GroupsComponent, data: { roles: ['SuperAdmin', 'Admin', 'UserManager', 'IdentityManager'] } },
      { path: 'groups/workspace', component: GroupsDirectoryComponent },
      { path: 'groups', component: GroupsComponent },

      // 4. Configuration & Identity (Console Only)
      { path: 'settings/console', component: SettingsComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'settings/console/custom-domain', component: CustomDomainComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'settings/custom-domain', redirectTo: 'settings/console/custom-domain', pathMatch: 'full' },
      { path: 'admin/custom-domain', redirectTo: 'settings/console/custom-domain', pathMatch: 'full' },
      { path: 'settings', component: SettingsComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'identity/console', component: IdentityDashboardComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'identity/console/dashboard', component: IdentityDashboardComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'identity/console/roles', component: IdentityRolesComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'identity/console/invitations', component: IdentityInvitationsComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'identity/console/invitations/create', component: IdentityInvitationCreateComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'identity/console/audit-logs', component: IdentityAuditLogsComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'identity/console/policies', component: IdentityPoliciesComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'identity/console/account', component: IdentityAccountComponent, data: { roles: ['SuperAdmin', 'Admin', 'IdentityManager'] } },
      { path: 'identity', redirectTo: 'identity/console/dashboard', pathMatch: 'full' },

      // 5. CMS Studio Suite, Manage Forms, My Templates, & UI Marketplace (Console Only)
      { path: 'content/console/forms', component: FormsListComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/forms/create', component: FormBuilderComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/forms/edit/:id', component: FormBuilderComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/forms/:formKey/submissions', component: FormSubmissionsComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'admin/forms', redirectTo: 'content/console/forms', pathMatch: 'full' },
      { path: 'content/console/templates/import', component: ImportWebsiteTemplateComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/templates/create', redirectTo: 'content/console/templates/visuals', pathMatch: 'full' },
      { path: 'content/console/templates/visuals', component: TemplateVisualsComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/templates/visuals/:id', component: TemplateVisualsComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'templates/visuals', redirectTo: 'content/console/templates/visuals', pathMatch: 'full' },
      { path: 'templates/visuals/:id', redirectTo: 'content/console/templates/visuals/:id' },
      { path: 'content/console/templates/maintenance', component: TemplateMaintenanceComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/templates', component: MyTemplatesComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'admin/templates', redirectTo: 'content/console/templates', pathMatch: 'full' },
      { path: 'content/console/marketplace', component: MarketplaceComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'admin/marketplace', redirectTo: 'content/console/marketplace', pathMatch: 'full' },
      { path: 'content/console', component: CmsDashboardComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/pages', component: WebPagesComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/pages/create', component: WebPageEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/pages/details/:id', component: WebPageDetailsComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/pages/edit/:id', component: WebPageEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/pages/delete/:id', component: WebPageDeleteComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/categories', component: WebCategoriesComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/categories/create', component: WebCategoryEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/categories/edit/:id', component: WebCategoryEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/categories/delete/:id', component: WebCategoryDeleteComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/sections', component: PageSectionsComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/sections/details/:id', component: PageSectionDetailsComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/sections/edit/:id', component: PageSectionEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/sections/delete/:id', component: PageSectionDeleteComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/sections/lists/edit/:id', component: PageSectionListEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/sections/lists/delete/:id', component: PageSectionListDeleteComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/blogs', component: BlogsManagementComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/blogs/create', component: BlogEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/blogs/edit/:id', component: BlogEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/blogs/delete/:id', component: BlogDeleteComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/blog-categories', component: BlogCategoriesManagementComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },
      { path: 'content/console/blog-categories/delete/:id', component: BlogCategoryDeleteComponent, data: { roles: ['SuperAdmin', 'Admin', 'CmsManager'] } },

      // 6. Commerce & Store Studio Suite (Console Only)
      { path: 'products/console', component: ProductsListComponent, data: { roles: ['SuperAdmin', 'Admin', 'CommerceManager', 'CmsManager'] } },
      { path: 'products/console/create', component: ProductCreateComponent, data: { roles: ['SuperAdmin', 'Admin', 'CommerceManager', 'CmsManager'] } },
      { path: 'products/console/edit/:id', component: ProductEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'CommerceManager', 'CmsManager'] } },
      { path: 'products/console/delete/:id', component: ProductDeleteComponent, data: { roles: ['SuperAdmin', 'Admin', 'CommerceManager', 'CmsManager'] } },
      { path: 'products/console/categories', component: ProductCategoriesComponent, data: { roles: ['SuperAdmin', 'Admin', 'CommerceManager', 'CmsManager'] } },
      { path: 'products/console/categories/create', component: ProductCategoryEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'CommerceManager', 'CmsManager'] } },
      { path: 'products/console/categories/edit/:id', component: ProductCategoryEditComponent, data: { roles: ['SuperAdmin', 'Admin', 'CommerceManager', 'CmsManager'] } },
      { path: 'products/console/categories/delete/:id', component: ProductCategoryDeleteComponent, data: { roles: ['SuperAdmin', 'Admin', 'CommerceManager', 'CmsManager'] } },
      { path: 'products/console/marketing', component: ProductMarketingComponent, data: { roles: ['SuperAdmin', 'Admin', 'CommerceManager', 'CmsManager'] } },
      { path: 'products/console/queues', component: ProductQueuesComponent, data: { roles: ['SuperAdmin', 'Admin', 'CommerceManager', 'CmsManager'] } },
      { path: 'products/console/orders', component: ProductOrdersComponent, data: { roles: ['SuperAdmin', 'Admin', 'CommerceManager', 'CmsManager'] } },
      { path: 'products/console/orders/details/:id', component: ProductOrderDetailsComponent, data: { roles: ['SuperAdmin', 'Admin', 'CommerceManager', 'CmsManager'] } },
      { path: 'products/console/transactions', component: ProductTransactionsComponent, data: { roles: ['SuperAdmin', 'Admin', 'CommerceManager', 'CmsManager'] } },

      // 7. Backwards Compatibility Redirects for legacy /admin routes
      { path: 'admin/products', redirectTo: 'products/console', pathMatch: 'full' },
      { path: 'admin/dashboard', redirectTo: 'dashboard/console', pathMatch: 'full' },
      { path: 'admin/users/dashboard', redirectTo: 'users/console/dashboard', pathMatch: 'full' },
      { path: 'admin/users/list', redirectTo: 'users/console/list', pathMatch: 'full' },
      { path: 'admin/users/create', redirectTo: 'users/console/create', pathMatch: 'full' },
      { path: 'admin/users/details/:id', redirectTo: 'users/console/details/:id', pathMatch: 'full' },
      { path: 'admin/users/edit/:id', redirectTo: 'users/console/edit/:id', pathMatch: 'full' },
      { path: 'admin/users/categories', redirectTo: 'users/console/categories', pathMatch: 'full' },
      { path: 'admin/users/registration-form', redirectTo: 'users/console/registration-form', pathMatch: 'full' },
      { path: 'admin/users/settings', redirectTo: 'users/console/settings', pathMatch: 'full' },
      { path: 'admin/users/kpi', redirectTo: 'users/console/kpi', pathMatch: 'full' },
      { path: 'admin/users/activity', redirectTo: 'users/console/activity', pathMatch: 'full' },
      { path: 'admin/groups', redirectTo: 'groups/console', pathMatch: 'full' },
      { path: 'admin/settings', redirectTo: 'settings/console', pathMatch: 'full' },
      { path: 'admin/content/pages/create', redirectTo: 'content/console/pages/create', pathMatch: 'full' },
      { path: 'admin/content/pages/edit/:id', redirectTo: 'content/console/pages/edit/:id' },
      { path: 'admin/content/pages', redirectTo: 'content/console/pages', pathMatch: 'full' },
      { path: 'admin/content/categories/create', redirectTo: 'content/console/categories/create', pathMatch: 'full' },
      { path: 'admin/content/categories/edit/:id', redirectTo: 'content/console/categories/edit/:id' },
      { path: 'admin/content/categories', redirectTo: 'content/console/categories', pathMatch: 'full' },
      { path: 'admin/content/sections', redirectTo: 'content/console/sections', pathMatch: 'full' },
      { path: 'admin/content', redirectTo: 'content/console', pathMatch: 'full' },
      { path: 'admin', redirectTo: 'dashboard/console', pathMatch: 'full' },
      { path: 'portal', redirectTo: 'dashboard/workspace', pathMatch: 'full' },
      { path: 'portal/dashboard', redirectTo: 'dashboard/workspace', pathMatch: 'full' }
    ]
  },
  // Dynamic Public Website Content Routes
  { path: 'page/:slug', component: LandingComponent },
  { path: 'blog', component: LandingComponent },
  { path: 'blog/:id', component: LandingComponent },
  { path: ':slug', component: LandingComponent },
  {
    path: '**',
    redirectTo: ''
  }
];
