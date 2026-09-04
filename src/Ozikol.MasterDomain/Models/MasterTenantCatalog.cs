using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Domain model for the central Master Catalog Database.
/// Tracks registered tenant databases, subdomains, primary platform domains, custom domains, and API endpoints.
/// </summary>
[Table("MasterTenantCatalogs")]
public class MasterTenantCatalog
{
    [Key]
    public int Id { get; set; }

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

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedUtc { get; set; }

    public ICollection<MasterTenantFeatureSubscription> FeatureSubscriptions { get; set; } = new List<MasterTenantFeatureSubscription>();
}
