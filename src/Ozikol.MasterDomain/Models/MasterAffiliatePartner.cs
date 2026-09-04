using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Domain model for registered affiliate partners in the central Master Catalog Database.
/// Tracks partner referral codes, commission percentages, approved status, and wallet earnings.
/// </summary>
[Table("MasterAffiliatePartners")]
public class MasterAffiliatePartner
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    public string PartnerCode { get; set; } = null!; // Unique promo/referral code

    [Required]
    [MaxLength(150)]
    public string FullName { get; set; } = null!;

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = null!;

    [MaxLength(50)]
    public string? PhoneNumber { get; set; }

    [MaxLength(255)]
    public string? WebsiteOrChannel { get; set; }

    [Column(TypeName = "decimal(5,2)")]
    public decimal CommissionRatePercentage { get; set; } = 20.00m; // Default 20% commission

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalEarned { get; set; } = 0.00m;

    [Column(TypeName = "decimal(18,2)")]
    public decimal PendingBalance { get; set; } = 0.00m;

    [Column(TypeName = "decimal(18,2)")]
    public decimal PaidBalance { get; set; } = 0.00m;

    [MaxLength(50)]
    public string Status { get; set; } = "Active"; // Active, Suspended, UnderReview

    public string? PayoutDetailsJson { get; set; }

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    public DateTime? ApprovedUtc { get; set; }

    public ICollection<MasterAffiliateReferral> Referrals { get; set; } = new List<MasterAffiliateReferral>();
}
