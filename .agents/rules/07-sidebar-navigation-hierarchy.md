# Canonical Sidebar Navigation Hierarchy & Feature Gating Standards (Ozikol-BCC)

---

## 1. Absolute Sidebar Navigation Ordering Contract (Mandatory)

Across ALL client applications (Flutter Desktop/Mobile, Angular BCC Client, and Central Web), sidebars MUST strictly conform to the following top-to-bottom sequence without exception:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. CORE NAVIGATION & USER MANAGEMENT                        │
│    • Dashboard / Workspace Home                             │
│    • User Directory (All Members, Categories, KPIs, Settings)│
│    • Identity & Access Control (Roles, Policies, MFA)       │
│    • Manage My Account & Profile                            │
├─────────────────────────────────────────────────────────────┤
│ 2. MODULAR FEATURES & EXTENSIONS (Subscribed Only)          │
│    • Workspace / Station Gatekeeper (bcp-workspace)         │
│    • Messenger / Direct Messages (bcp-chat)                 │
│    • Channel Groups (bcp-groups)                            │
│    • Alumni Network (bcp-alumni)                            │
│    • Additional Licensed Tenant Feature Modules             │
├─────────────────────────────────────────────────────────────┤
│ 3. BILLING & SUBSCRIPTIONS (Admin / Tenant Only)            │
│    • Subscription Plans (Master Catalog Features)           │
│    • Subscriptions & Invoices                               │
├─────────────────────────────────────────────────────────────┤
│ 4. SECURITY, AUDIT & SYSTEM LOGS (Admin / Tenant Only)      │
│    • Security Audit & Telemetry Logs                        │
│    • Diagnostic Error Codes                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Menu vs. Modular Feature Isolation Rules

1. **Default Menus for Members (Personal Workspace Hub)**:
   - The ONLY default menu items permitted for regular members are:
     1. **Dashboard** (`Workspace Home`)
     2. **Manage My Account** (`Profile`, `Password`, `2FA`, `Devices`, `Activity`)
   - **Zero Feature Leakage**: No modular feature (e.g. Chat, Groups, Alumni, Workstations) may ever appear in the member navigation unless that specific feature is actively subscribed and enabled by the tenant administrator.
   - **Zero Billing & Log Leakage**: Billing & Subscriptions and Security Logs are strictly prohibited from appearing in the member menu.

2. **Feature Placement**:
   - In both Admin Console and Member Portal, all active modular features MUST appear immediately after the Core / User Management / Dashboard group, and **strictly before** Billing and Security Logs.

3. **URL & Route Guarding (Web & Deep Links)**:
   - Navigating directly via browser URL bar to an unassigned or unsubscribed feature (e.g. `/workspace/stations`) MUST be blocked by `FeatureGuard` (`feature.guard.ts`), redirecting immediately to `/feature-unavailable` displaying the "Not Available" / "Subscription Required" advisory.

4. **Dynamic White-Label Brand Compliance**:
   - All folder names, titles, and breadcrumbs must resolve dynamically from the active tenant's brand name (e.g. `C:\{BrandName}-Workspace`). Never hardcode platform or vendor names.
