using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Domain model for the central Master Catalog Database.
/// Tracks registered tenant databases, subdomains, primary platform domains, custom domains, and API endpoints.
/// Includes full lifecycle governance, user attribution, and audit timestamps.
/// </summary>
[Table("MasterTenantCatalogs")]
public class MasterTenantCatalog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Unique tenant key / subdomain prefix (e.g. "acme", "bcp-main").
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string TenantKey { get; set; } = null!;

    /// <summary>
    /// Human readable display name of the organization / tenant.
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string OrganizationName { get; set; } = null!;

    /// <summary>
    /// Default platform subdomain (e.g. "acme.ozikol.com" or "localhost:8230").
    /// </summary>
    [Required]
    [MaxLength(255)]
    public string PrimaryDomain { get; set; } = null!;

    /// <summary>
    /// Optional custom domain owned by the tenant (e.g. "www.acmecorp.com").
    /// If custom domain expires, PrimaryDomain remains active as fallback.
    /// </summary>
    [MaxLength(255)]
    public string? CustomDomain { get; set; }

    /// <summary>
    /// Central or tenant-specific API endpoint URL (e.g. "https://api.ozikol.com" or "http://localhost:5000/api").
    /// </summary>
    [MaxLength(255)]
    public string? ApiUrl { get; set; }

    /// <summary>
    /// Full web URL for the tenant (e.g. "https://acme.ozikol.com" or "http://localhost:4200").
    /// </summary>
    [MaxLength(255)]
    public string? WebsiteUrl { get; set; }

    /// <summary>
    /// Target MSSQL Database name on the VPS SQL instance (e.g. "Ozikol_BCC_Tenant_acme").
    /// </summary>
    [Required]
    [MaxLength(128)]
    public string DatabaseName { get; set; } = null!;

    /// <summary>
    /// Full SQL connection string for this tenant's dedicated database.
    /// </summary>
    [Required]
    public string ConnectionString { get; set; } = null!;

    /// <summary>
    /// Primary Admin email address specified during provisioning.
    /// </summary>
    [MaxLength(256)]
    public string? AdminEmail { get; set; }

    /// <summary>
    /// Indicates whether the tenant database is active and accepting requests.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Optional referral code of the affiliate partner who referred this tenant.
    /// </summary>
    [MaxLength(100)]
    public string? ReferredByPartnerCode { get; set; }

    /// <summary>
    /// UTC timestamp when the tenant was provisioned.
    /// </summary>
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// UTC timestamp when a user/visitor last accessed or interacted with this tenant's website or portal.
    /// </summary>
    public DateTime? LastAccessedUtc { get; set; }

    /// <summary>
    /// Authenticated admin username or system identity who created/provisioned this tenant.
    /// </summary>
    [MaxLength(200)]
    public string? CreatedBy { get; set; }

    /// <summary>
    /// UTC timestamp when this tenant was last updated.
    /// </summary>
    public DateTime? UpdatedUtc { get; set; }

    /// <summary>
    /// Authenticated admin username who last updated this tenant.
    /// </summary>
    [MaxLength(200)]
    public string? LastUpdatedBy { get; set; }

    /// <summary>
    /// Explicit flag indicating if the tenant is paused/suspended by super-admin.
    /// </summary>
    public bool IsSuspended { get; set; } = false;

    /// <summary>
    /// UTC timestamp when the tenant was suspended.
    /// </summary>
    public DateTime? SuspendedUtc { get; set; }

    /// <summary>
    /// Admin username who performed the suspension.
    /// </summary>
    [MaxLength(200)]
    public string? SuspendedBy { get; set; }

    /// <summary>
    /// Reason provided by super-admin for suspending the tenant.
    /// </summary>
    [MaxLength(500)]
    public string? SuspensionReason { get; set; }

    /// <summary>
    /// Soft delete flag: marks the organization as deactivated while safely preserving database.
    /// </summary>
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// UTC timestamp when the tenant was soft-deleted.
    /// </summary>
    public DateTime? DeletedUtc { get; set; }

    /// <summary>
    /// Admin username who performed the soft delete.
    /// </summary>
    [MaxLength(200)]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// Reason provided for deactivating/soft-deleting the tenant.
    /// </summary>
    [MaxLength(500)]
    public string? DeletionReason { get; set; }

    /// <summary>
    /// Indicates whether this tenant uses custom negotiated per-feature pricing (true)
    /// or inherits the general Master Catalog pricing (false).
    /// </summary>
    public bool UseCustomPricing { get; set; } = false;

    /// <summary>
    /// Indicates whether this tenant uses custom per-feature availability overrides (true)
    /// or inherits the general Master Catalog Available for Use / Coming Soon status (false).
    /// </summary>
    public bool UseCustomAvailability { get; set; } = false;

    public ICollection<MasterTenantFeatureSubscription> FeatureSubscriptions { get; set; } = new List<MasterTenantFeatureSubscription>();
}
