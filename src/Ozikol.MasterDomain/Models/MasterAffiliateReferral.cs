using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Domain model for tenant signups attributed to an affiliate partner.
/// Recorded during automated onboarding pipeline in TenantOnboardingService.
/// </summary>
[Table("MasterAffiliateReferrals")]
public class MasterAffiliateReferral
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [ForeignKey("AffiliatePartner")]
    public Guid AffiliatePartnerId { get; set; }
    public MasterAffiliatePartner AffiliatePartner { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string ReferredTenantKey { get; set; } = null!;

    [Required]
    [MaxLength(200)]
    public string ReferredOrganizationName { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal SubscriptionAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal CommissionEarned { get; set; }

    [MaxLength(50)]
    public string CommissionStatus { get; set; } = "Pending"; // Pending, Approved, Paid

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    public DateTime? PaidUtc { get; set; }
}
