using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Ozikol_BCC.Infrastructure.TenantSupport;

namespace Ozikol_BCC.Api.Models
{
    /// <summary>
    /// A single modular capability as seen from the tenant billing screens
    /// (included baseline, subscribed add-on, or available add-on).
    /// </summary>
    public class BillingFeatureItemDto
    {
        /// <summary>Master feature catalog identifier.</summary>
        public Guid FeatureId { get; set; }

        /// <summary>Stable canonical feature code (e.g. "bcp-store-ecommerce").</summary>
        public string FeatureCode { get; set; } = string.Empty;

        /// <summary>Full descriptive title of the feature (used in Tables, Cards, and Details page).</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>Concise sidebar navigation menu label (so sidebar items never truncate).</summary>
        public string MenuTitle { get; set; } = string.Empty;

        /// <summary>Optional MasterFeatureSuite identifier.</summary>
        public Guid? SuiteId { get; set; }

        /// <summary>Full descriptive title of the parent suite (e.g. "People, Community &amp; Collaboration").</summary>
        public string Category { get; set; } = string.Empty;

        /// <summary>Concise sidebar header title of the parent suite (e.g. "PEOPLE &amp; COMMUNITY").</summary>
        public string SuiteMenuTitle { get; set; } = string.Empty;

        /// <summary>Short marketing description.</summary>
        public string? Description { get; set; }

        /// <summary>Material icon name used by clients.</summary>
        public string? Icon { get; set; }

        /// <summary>True for compulsory baseline features that are always included.</summary>
        public bool IsCompulsory { get; set; }

        /// <summary>True when the tenant has a subscription record for this feature.</summary>
        public bool IsSubscribed { get; set; }

        /// <summary>True when the feature is currently usable by the tenant.</summary>
        public bool IsActive { get; set; }

        /// <summary>True when the feature is fully built and available for immediate use in tenant workspaces (false = Coming Soon).</summary>
        public bool IsAvailableForUse { get; set; }

        /// <summary>True when the feature is currently under beta/maintenance.</summary>
        public bool IsInBeta { get; set; }

        /// <summary>True when a custom price override is set for this tenant in Central.</summary>
        public bool HasCustomPriceOverride { get; set; }

        /// <summary>True when a custom availability override is set for this tenant in Central.</summary>
        public bool HasCustomAvailabilityOverride { get; set; }

        /// <summary>General catalog first-time free trial days before payment (e.g. 14 days).</summary>
        public int FreeTrialDays { get; set; } = 14;

        /// <summary>Effective first-time free trial days for this tenant (respecting General vs Custom mode).</summary>
        public int EffectiveFreeTrialDays { get; set; } = 14;

        /// <summary>True when a custom free trial days override is set for this tenant in Central.</summary>
        public bool HasCustomFreeTrialOverride { get; set; }

        /// <summary>True when this tenant has already consumed their first-time free trial for this capability.</summary>
        public bool HasUsedFreeTrial { get; set; }

        /// <summary>True when the current active subscription is running in its free trial period before payment.</summary>
        public bool IsTrialPeriod { get; set; }

        /// <summary>True when the tenant can activate and test this capability for <see cref="EffectiveFreeTrialDays"/> free days before payment.</summary>
        public bool IsEligibleForFreeTrial { get; set; }

        /// <summary>Canonical sort order of the parent suite (1..11).</summary>
        public int SuiteSortOrder { get; set; }

        /// <summary>Canonical sort order within the catalog.</summary>
        public int SortOrder { get; set; }

        /// <summary>Billing model classification (FlatSubscription, PayAsYouGo, Hybrid, CustomEnterprise).</summary>
        public string BillingType { get; set; } = "FlatSubscription";

        /// <summary>Frontend route prefix for the feature.</summary>
        public string? RoutePrefix { get; set; }

        /// <summary>Whether the subscription renews automatically.</summary>
        public bool AutoRenew { get; set; }

        /// <summary>Billing cadence: Included, Monthly, Quarterly, or Yearly.</summary>
        public string BillingCadence { get; set; } = "Included";

        /// <summary>Subscription status: Active, Pending, Suspended, Expired, Cancelled, or Included.</summary>
        public string Status { get; set; } = "Included";

        /// <summary>Catalog monthly price in USD.</summary>
        public decimal MonthlyPrice { get; set; }

        /// <summary>Catalog quarterly price in USD.</summary>
        public decimal QuarterlyPrice { get; set; }

        /// <summary>Catalog yearly price in USD.</summary>
        public decimal YearlyPrice { get; set; }

        /// <summary>Price currently charged per cadence period (override, contracted rate, or zero when included).</summary>
        public decimal EffectivePrice { get; set; }

        /// <summary>Subscription identifier, when subscribed.</summary>
        public Guid? SubscriptionId { get; set; }

        /// <summary>Expiration timestamp (UTC) for subscription-based features.</summary>
        public DateTime? ExpiresAtUtc { get; set; }

        /// <summary>Whole days remaining until expiration; negative when overdue.</summary>
        public int? DaysRemaining { get; set; }

        /// <summary>Renewal urgency: None, Warning (14 days or fewer), Urgent (3 days or fewer), Critical (expired).</summary>
        public string Severity { get; set; } = "None";
    }

    /// <summary>
    /// Complete feature billing posture for the current tenant. Pushed over the real-time socket
    /// as the payload of the <c>BillingUpdated</c> event and returned by <c>GET /api/billing/features</c>.
    /// </summary>
    public class BillingFeaturesSnapshotDto
    {
        /// <summary>Tenant key this snapshot belongs to.</summary>
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>ISO 4217 currency code configured for this tenant (e.g., "USD", "NGN", "GBP").</summary>
        public string CurrencyCode { get; set; } = "USD";

        /// <summary>Currency symbol corresponding to <see cref="CurrencyCode"/> (e.g., "$", "₦", "£").</summary>
        public string CurrencySymbol { get; set; } = "$";

        /// <summary>Exchange rate multiplier from 1.00 USD base to <see cref="CurrencyCode"/>.</summary>
        public decimal ExchangeRateFromUsd { get; set; } = 1.0m;

        /// <summary>True when Central has enabled Custom Tenant Pricing for this workspace.</summary>
        public bool UseCustomPricing { get; set; }

        /// <summary>True when Central has enabled Custom Tenant Availability for this workspace.</summary>
        public bool UseCustomAvailability { get; set; }

        /// <summary>Server clock (UTC) when the snapshot was generated, so clients can correct countdown drift.</summary>
        public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;

        /// <summary>Compulsory baseline features.</summary>
        public List<BillingFeatureItemDto> Included { get; set; } = new();

        /// <summary>Optional add-ons the tenant has subscribed to.</summary>
        public List<BillingFeatureItemDto> Subscribed { get; set; } = new();

        /// <summary>Optional add-ons available for activation.</summary>
        public List<BillingFeatureItemDto> Available { get; set; } = new();

        /// <summary>Renewal notices for add-ons expiring within 14 days or already expired.</summary>
        public List<FeatureExpirationNoticeDto> Notices { get; set; } = new();

        /// <summary>Total recurring cost normalised to a monthly figure across active paid add-ons.</summary>
        public decimal TotalRecurringMonthly { get; set; }
    }

    /// <summary>
    /// Payload of the <c>FeatureExpiryAlert</c> socket event raised when a feature crosses a renewal threshold.
    /// Wording is tenant-neutral by design.
    /// </summary>
    public class FeatureExpiryAlertDto
    {
        /// <summary>Stable feature code.</summary>
        public string FeatureCode { get; set; } = string.Empty;

        /// <summary>Feature display name.</summary>
        public string FeatureName { get; set; } = string.Empty;

        /// <summary>Warning, Urgent, or Critical.</summary>
        public string Severity { get; set; } = "Warning";

        /// <summary>Whole days remaining; zero or negative when expired.</summary>
        public int DaysRemaining { get; set; }

        /// <summary>Expiration timestamp (UTC).</summary>
        public DateTime ExpiresAtUtc { get; set; }

        /// <summary>Human-readable alert text.</summary>
        public string Message { get; set; } = string.Empty;
    }

    /// <summary>Request to subscribe to (or renew) an optional add-on feature.</summary>
    public class SubscribeFeatureRequest
    {
        /// <summary>Master feature catalog identifier.</summary>
        [Required]
        public Guid FeatureId { get; set; }

        /// <summary>Billing cadence: Monthly, Quarterly, or Yearly.</summary>
        [Required]
        public string Cadence { get; set; } = "Monthly";
    }

    /// <summary>Request to install/activate or deactivate/uninstall a capability in the tenant workspace.</summary>
    public class ToggleFeatureActiveRequest
    {
        /// <summary>Master feature catalog identifier (optional if FeatureCode is supplied).</summary>
        public Guid? FeatureId { get; set; }

        /// <summary>Canonical feature code (e.g. "bcp-community-messenger").</summary>
        public string? FeatureCode { get; set; }

        /// <summary>Optional explicit target state (true = install/activate, false = deactivate/uninstall; null = toggle).</summary>
        public bool? SetActive { get; set; }

        /// <summary>Billing cadence when activating: Monthly, Quarterly, or Yearly.</summary>
        public string Cadence { get; set; } = "Monthly";
    }

    /// <summary>Result of a subscribe request.</summary>
    public class SubscribeFeatureResultDto
    {
        /// <summary>True when the feature is already active (zero-cost features are activated immediately).</summary>
        public bool Activated { get; set; }

        /// <summary>True when an invoice must be settled before the feature is activated.</summary>
        public bool RequiresPayment { get; set; }

        /// <summary>Invoice created for the request, if any.</summary>
        public Guid? InvoiceId { get; set; }

        /// <summary>Invoice number for display.</summary>
        public string? InvoiceNumber { get; set; }

        /// <summary>Amount due in USD.</summary>
        public decimal AmountDue { get; set; }
    }

    /// <summary>A billing ledger entry shown on the invoices screen.</summary>
    public class BillingInvoiceDto
    {
        /// <summary>Invoice identifier.</summary>
        public Guid Id { get; set; }

        /// <summary>Invoice number (INV-YYYYMM-NNNNN).</summary>
        public string? InvoiceNumber { get; set; }

        /// <summary>Feature name or note describing the charge.</summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>Amount charged.</summary>
        public decimal Amount { get; set; }

        /// <summary>ISO currency code.</summary>
        public string Currency { get; set; } = "USD";

        /// <summary>Pending, Completed, Failed, Refunded, Cancelled, or Disputed.</summary>
        public string Status { get; set; } = "Pending";

        /// <summary>Payment provider used, if any.</summary>
        public string? PaymentProvider { get; set; }

        /// <summary>External gateway reference, if any.</summary>
        public string? Reference { get; set; }

        /// <summary>Creation timestamp (UTC).</summary>
        public DateTime CreatedUtc { get; set; }
    }

    /// <summary>
    /// Request to initialize a Central Paystack Inline payment for one or more workspace capabilities
    /// (supports single capability "Pay &amp; Renew" and consolidated "Pay All Expiring / Overdue").
    /// API keys and amounts are resolved strictly server-side from MasterCatalogDbContext.
    /// </summary>
    public class InitializeFeaturePaymentRequest
    {
        /// <summary>Optional single feature ID when paying for one capability.</summary>
        public Guid? FeatureId { get; set; }

        /// <summary>Optional single feature code when paying for one capability.</summary>
        public string? FeatureCode { get; set; }

        /// <summary>Optional list of feature codes when paying for multiple capabilities in one consolidated checkout.</summary>
        public List<string>? FeatureCodes { get; set; }

        /// <summary>Billing cadence: Monthly, Quarterly, or Yearly.</summary>
        public string Cadence { get; set; } = "Monthly";
    }

    /// <summary>
    /// Server-calculated Paystack Inline Checkout initialization payload returned to the client.
    /// Contains only the non-secret <see cref="PublicKey"/>, <see cref="AccessCode"/>, and <see cref="Reference"/>.
    /// </summary>
    public class InitializeFeaturePaymentResponseDto
    {
        /// <summary>Non-secret Central Paystack Public Key (pk_live_... or pk_test_...).</summary>
        public string PublicKey { get; set; } = string.Empty;

        /// <summary>Paystack inline access code.</summary>
        public string AccessCode { get; set; } = string.Empty;

        /// <summary>Unique transaction reference (PSK-CENTRAL-...).</summary>
        public string Reference { get; set; } = string.Empty;

        /// <summary>Paystack hosted checkout URL fallback.</summary>
        public string AuthorizationUrl { get; set; } = string.Empty;

        /// <summary>Exact server-computed amount in the tenant's running currency.</summary>
        public decimal Amount { get; set; }

        /// <summary>ISO 4217 currency code (e.g., NGN, USD).</summary>
        public string Currency { get; set; } = "NGN";

        /// <summary>Currency symbol (e.g., ₦, $).</summary>
        public string CurrencySymbol { get; set; } = "₦";

        /// <summary>Payer email address attached to the transaction.</summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>Generated Central invoice number (INV-YYYYMM-NNNNN).</summary>
        public string InvoiceNumber { get; set; } = string.Empty;

        /// <summary>Billing cadence (Monthly, Quarterly, Yearly).</summary>
        public string Cadence { get; set; } = "Monthly";

        /// <summary>Display names of the capabilities covered by this checkout.</summary>
        public List<string> FeatureNames { get; set; } = new();
    }

    /// <summary>
    /// Request to verify a completed Central Paystack Inline payment and activate/renew the covered capabilities.
    /// </summary>
    public class VerifyFeaturePaymentRequest
    {
        /// <summary>Paystack transaction reference (PSK-CENTRAL-...).</summary>
        [Required]
        public string Reference { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request to prepare/generate an invoice for either a single capability ("Pay &amp; Renew")
    /// or all expiring/overdue capabilities ("Renew All Expiring Features") and return its Invoice ID.
    /// </summary>
    public class PrepareBillingInvoiceRequest
    {
        /// <summary>Optional single feature code when clicking "Pay &amp; Renew" on a specific row.</summary>
        public string? FeatureCode { get; set; }

        /// <summary>Optional list of feature codes when clicking "Renew All Expiring Features".</summary>
        public List<string>? FeatureCodes { get; set; }

        /// <summary>Optional initial preferred cadence (Monthly, Quarterly, Yearly).</summary>
        public string? Cadence { get; set; }
    }

    /// <summary>
    /// Result of preparing a billing invoice before navigating to <c>/billing/invoices/:id</c>.
    /// </summary>
    public class PrepareBillingInvoiceResponseDto
    {
        /// <summary>Generated or matched pending invoice identifier.</summary>
        public Guid InvoiceId { get; set; }

        /// <summary>Sequential invoice number (INV-YYYYMM-NNNNN).</summary>
        public string InvoiceNumber { get; set; } = string.Empty;
    }

    /// <summary>
    /// Individual capability line item inside a full billing invoice, supporting dynamic per-item duration selection
    /// (1 Month, 3 Months, 1 Year) and automatic discount/savings calculation.
    /// </summary>
    public class BillingInvoiceLineItemDto
    {
        /// <summary>Master feature catalog identifier.</summary>
        public Guid FeatureId { get; set; }

        /// <summary>Canonical feature code.</summary>
        public string FeatureCode { get; set; } = string.Empty;

        /// <summary>Feature display title.</summary>
        public string FeatureName { get; set; } = string.Empty;

        /// <summary>Parent suite title.</summary>
        public string Category { get; set; } = string.Empty;

        /// <summary>Material icon name.</summary>
        public string Icon { get; set; } = "extension";

        /// <summary>Selected billing duration for this line item: Monthly (1 Month), Quarterly (3 Months), or Yearly (1 Year).</summary>
        public string SelectedCadence { get; set; } = "Monthly";

        /// <summary>Number of months covered by <see cref="SelectedCadence"/> (1, 3, or 12).</summary>
        public int Months { get; set; } = 1;

        /// <summary>True when this capability is Yearly-Only (MonthlyPrice &lt;= 0 and YearlyPrice &gt; 0).</summary>
        public bool IsYearlyOnly { get; set; }

        /// <summary>True when this capability is Monthly-Only (MonthlyPrice &gt; 0 and YearlyPrice &lt;= 0).</summary>
        public bool IsMonthlyOnly { get; set; }

        /// <summary>Allowed duration options for this specific feature (e.g. ["Monthly", "Quarterly", "Yearly"] or ["Yearly"]).</summary>
        public List<string> SupportedCadences { get; set; } = new();

        /// <summary>1-Month price in the invoice currency.</summary>
        public decimal MonthlyPrice { get; set; }

        /// <summary>3-Month (Quarterly) total price in the invoice currency.</summary>
        public decimal QuarterlyPrice { get; set; }

        /// <summary>1-Year (Annual) total price in the invoice currency.</summary>
        public decimal YearlyPrice { get; set; }

        /// <summary>Calculated percentage discount when choosing Yearly vs 12 x Monthly (e.g. 17%).</summary>
        public int YearlyDiscountPercent { get; set; }

        /// <summary>Calculated currency amount saved when choosing Yearly vs 12 x Monthly.</summary>
        public decimal YearlySavingsAmount { get; set; }

        /// <summary>Calculated percentage discount when choosing Quarterly (3 Months) vs 3 x Monthly (e.g. 10%).</summary>
        public int QuarterlyDiscountPercent { get; set; }

        /// <summary>Calculated currency amount saved when choosing Quarterly vs 3 x Monthly.</summary>
        public decimal QuarterlySavingsAmount { get; set; }

        /// <summary>Active line total for the currently selected cadence.</summary>
        public decimal LineTotal { get; set; }

        /// <summary>Savings amount applied on the currently selected cadence.</summary>
        public decimal AppliedSavingsAmount { get; set; }

        /// <summary>Discount percentage applied on the currently selected cadence.</summary>
        public int AppliedDiscountPercent { get; set; }
    }

    /// <summary>
    /// Payment method availability posture displayed on the dedicated Invoice Page (<c>/billing/invoices/:id</c>).
    /// Resolved from Central <c>/centralwks/platform-settings</c>.
    /// </summary>
    public class BillingPaymentMethodOptionDto
    {
        /// <summary>Canonical gateway code: Paystack, Flutterwave, Stripe, or BankDeposit.</summary>
        public string ProviderCode { get; set; } = string.Empty;

        /// <summary>Display name of the payment method.</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>Subtitle / supported channels description.</summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>Material icon name.</summary>
        public string Icon { get; set; } = "payments";

        /// <summary>True when enabled in Central Platform Settings.</summary>
        public bool IsEnabled { get; set; }

        /// <summary>True when the required API keys or bank account details are present in Central Platform Settings.</summary>
        public bool IsConfigured { get; set; }

        /// <summary>Status badge label ("Available" or "Not Available — Keys Not Configured").</summary>
        public string StatusBadge { get; set; } = string.Empty;

        /// <summary>Non-secret public key when applicable.</summary>
        public string? PublicKey { get; set; }

        /// <summary>Bank institution name (for Direct Bank Deposit when configured).</summary>
        public string? BankName { get; set; }

        /// <summary>Beneficiary account name (for Direct Bank Deposit when configured).</summary>
        public string? AccountName { get; set; }

        /// <summary>Beneficiary account number / IBAN (for Direct Bank Deposit when configured).</summary>
        public string? AccountNumber { get; set; }

        /// <summary>Optional sort code / routing / SWIFT code (for Direct Bank Deposit).</summary>
        public string? SortCodeOrSwift { get; set; }

        /// <summary>Optional deposit instructions (for Direct Bank Deposit).</summary>
        public string? Instructions { get; set; }
    }

    /// <summary>
    /// Complete detail payload for the dedicated Invoice &amp; Multi-Gateway Checkout Page (<c>/billing/invoices/:id</c>).
    /// </summary>
    public class BillingInvoiceDetailDto
    {
        /// <summary>Invoice unique identifier.</summary>
        public Guid Id { get; set; }

        /// <summary>Sequential invoice number (INV-YYYYMM-NNNNN).</summary>
        public string InvoiceNumber { get; set; } = string.Empty;

        /// <summary>Invoice status: Pending, Completed, AwaitingVerification, Failed, Cancelled.</summary>
        public string Status { get; set; } = "Pending";

        /// <summary>Tenant organization name.</summary>
        public string OrganizationName { get; set; } = string.Empty;

        /// <summary>Tenant workspace key.</summary>
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>Tenant billing email.</summary>
        public string BillingEmail { get; set; } = string.Empty;

        /// <summary>ISO 4217 currency code.</summary>
        public string Currency { get; set; } = "NGN";

        /// <summary>Currency display symbol.</summary>
        public string CurrencySymbol { get; set; } = "₦";

        /// <summary>Subtotal before multi-month/annual discounts.</summary>
        public decimal SubtotalBeforeDiscount { get; set; }

        /// <summary>Total discount savings across all line items.</summary>
        public decimal TotalSavingsAmount { get; set; }

        /// <summary>Final payable invoice total.</summary>
        public decimal TotalAmount { get; set; }

        /// <summary>Selected or completed payment provider.</summary>
        public string? PaymentProvider { get; set; }

        /// <summary>Gateway transaction reference.</summary>
        public string? Reference { get; set; }

        /// <summary>Submitted bank transfer proof reference, if any.</summary>
        public string? PaymentProofRef { get; set; }

        /// <summary>Summary notes.</summary>
        public string? Notes { get; set; }

        /// <summary>Creation timestamp (UTC).</summary>
        public DateTime CreatedUtc { get; set; }

        /// <summary>Last update / settlement timestamp (UTC).</summary>
        public DateTime? UpdatedUtc { get; set; }

        /// <summary>Itemized capabilities covered by this invoice.</summary>
        public List<BillingInvoiceLineItemDto> LineItems { get; set; } = new();

        /// <summary>Payment methods enabled in Central Platform Settings (including unconfigured ones marked Not Available).</summary>
        public List<BillingPaymentMethodOptionDto> PaymentMethods { get; set; } = new();
    }

    /// <summary>
    /// Request to update the billing duration (1 Month, 3 Months, 1 Year) of a capability line item on a pending invoice.
    /// </summary>
    public class UpdateInvoiceLineCadenceRequest
    {
        /// <summary>Target feature code (leave empty/null to apply <see cref="Cadence"/> to all adjustable items on the invoice).</summary>
        public string? FeatureCode { get; set; }

        /// <summary>Desired duration: Monthly, Quarterly, or Yearly.</summary>
        [Required]
        public string Cadence { get; set; } = "Monthly";
    }

    /// <summary>
    /// Request to submit a Direct Bank Deposit transfer reference / proof for a pending invoice.
    /// </summary>
    public class SubmitBankDepositProofRequest
    {
        /// <summary>Bank transfer reference, session ID, or depositor narration.</summary>
        [Required]
        [MaxLength(250)]
        public string TransferReference { get; set; } = string.Empty;
    }
}
