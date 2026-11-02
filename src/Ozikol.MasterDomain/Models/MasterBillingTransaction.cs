using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Domain model for payment and billing transaction records in the central Master Catalog Database.
/// Captures every financial event — subscription payments, manual adjustments, refunds, and offline transfers —
/// linked to a specific tenant and optionally to a feature subscription.
/// </summary>
[Table("MasterBillingTransactions")]
public class MasterBillingTransaction
{
    /// <summary>
    /// Unique identifier for this billing transaction.
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Foreign key to the tenant this transaction belongs to.
    /// </summary>
    public Guid MasterTenantCatalogId { get; set; }

    /// <summary>
    /// Optional foreign key to the specific feature subscription this payment covers.
    /// Null for general account credits, manual adjustments, or platform-wide charges.
    /// </summary>
    public Guid? MasterTenantFeatureSubscriptionId { get; set; }

    /// <summary>
    /// Auto-generated sequential invoice number for accounting and reference purposes.
    /// Format: INV-YYYYMM-NNNNN (e.g., INV-202609-00042).
    /// </summary>
    [MaxLength(30)]
    public string? InvoiceNumber { get; set; }

    /// <summary>
    /// Transaction amount in the specified currency. Positive for payments, negative for refunds.
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    /// <summary>
    /// Three-letter ISO 4217 currency code (e.g., USD, EUR, NGN, ZAR).
    /// </summary>
    [Required]
    [MaxLength(10)]
    public string Currency { get; set; } = "USD";

    /// <summary>
    /// Payment gateway or method used for this transaction.
    /// Standard values: Stripe, PayPal, Flutterwave, BankTransfer, Manual, SystemCredit.
    /// </summary>
    [MaxLength(50)]
    public string? PaymentProvider { get; set; }

    /// <summary>
    /// External reference ID from the payment provider (e.g., Stripe charge_id, PayPal transaction_id).
    /// Used for reconciliation and dispute resolution.
    /// </summary>
    [MaxLength(250)]
    public string? TransactionRef { get; set; }

    /// <summary>
    /// Current status of the transaction.
    /// Standard values: Pending, Completed, Failed, Refunded, Cancelled, Disputed.
    /// </summary>
    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Pending";

    /// <summary>
    /// Optional admin notes or description for manual transactions, adjustments, or refund reasons.
    /// </summary>
    [MaxLength(500)]
    public string? Notes { get; set; }

    /// <summary>
    /// Optional comma-separated list of canonical feature codes covered by this invoice
    /// (supports both single capability renewals and consolidated multi-feature renewals).
    /// </summary>
    [MaxLength(500)]
    public string? FeatureCodesCsv { get; set; }

    /// <summary>
    /// Billing duration cadence covered by this transaction (Monthly, Quarterly, Yearly).
    /// </summary>
    [MaxLength(30)]
    public string? BillingCadence { get; set; }

    /// <summary>
    /// Serialized JSON array of invoice line items with per-capability duration (1 Month, 3 Months, 1 Year),
    /// unit pricing, and calculated annual/quarterly discount savings.
    /// </summary>
    [MaxLength(4000)]
    public string? LineItemsJson { get; set; }

    /// <summary>
    /// Optional bank transfer reference, narration, or payment receipt note submitted by the tenant for Direct Bank Deposit verification.
    /// </summary>
    [MaxLength(250)]
    public string? PaymentProofRef { get; set; }

    /// <summary>
    /// UTC timestamp when this transaction was created.
    /// </summary>
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// UTC timestamp when the transaction status was last updated (e.g., from Pending to Completed).
    /// </summary>
    public DateTime? UpdatedUtc { get; set; }

    // ── Navigation Properties ──

    /// <summary>
    /// Navigation to the tenant catalog entry this transaction belongs to.
    /// </summary>
    [ForeignKey(nameof(MasterTenantCatalogId))]
    public MasterTenantCatalog? Tenant { get; set; }

    /// <summary>
    /// Navigation to the specific feature subscription this payment covers (optional).
    /// </summary>
    [ForeignKey(nameof(MasterTenantFeatureSubscriptionId))]
    public MasterTenantFeatureSubscription? FeatureSubscription { get; set; }
}
