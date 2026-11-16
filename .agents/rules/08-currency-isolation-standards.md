# Multi-Tenant Currency Isolation & Zero Hardcoded Currency Standard (Ozikol-BCC)

---

## 26. Multi-Tenant Currency Isolation & Zero Hardcoded Currency Standard (Mandatory)
* **Strict Separation Between Central Billing Currency & Tenant Operational Currency**:
  * **Central Platform Billing Currency (`MasterTenantCatalog.DefaultCurrencyCode`)**: Governs **only** Ozikol Central platform subscriptions, feature add-ons, monthly/annual plans, and Central billing invoices (`BillingApiController`, `BillingSnapshotService`, `TenantFeatureGateService`, `Ozikol.Central`).
  * **Tenant Operational Running Currency (`MisConfigurationSettings.CurrencyCode` & `CurrencySymbol`)**: Governs **all** day-to-day tenant workspace operations across Web, Desktop, Mobile, and API — including Commerce products, storefront checkout, customer orders, invoices, finance/donations, and Workforce payroll, hourly rates, monthly salaries, and shift fines.
* **Zero Hardcoded Currency Symbols or ISO Codes (CRITICAL)**:
  * NEVER hardcode currency symbols (`₦`, `$`, `£`, `€`) or ISO codes (`NGN`, `USD`, `GBP`) in Angular templates, Flutter widgets, Razor views, or backend financial calculations/emails.
  * Every component, service, and controller displaying or calculating monetary values MUST bind dynamically to the tenant's configured `currencySymbol` / `currencyCode` from the API (e.g., `WorkforceService.getTenantCurrency()`, `SettingsApi/currency`, or the endpoint's `currencyCode` / `currencySymbol` payload).
  * Initialize UI `currencySymbol` fields to `''` (empty string) before API resolution so a wrong symbol never flashes or leaks into another tenant's workspace.
* **Cross-Platform Parity**:
  * Ensure Angular (`Ozikol-BCC.Client`), Flutter (`ozikol_bcc_app`), and ASP.NET Core (`Ozikol-BCC.Api` / `Ozikol-BCC.Application`) all resolve and render the tenant's operational currency identically without hardcoded fallbacks.
