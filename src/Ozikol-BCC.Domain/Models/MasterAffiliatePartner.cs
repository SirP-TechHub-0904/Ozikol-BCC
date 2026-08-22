namespace Ozikol_BCC.Domain.Models;

/// <summary>
/// Registered promoter / affiliate partner in the Central Master DB.
/// </summary>
public class MasterAffiliatePartner
{
    public int Id { get; set; }
    public string PartnerCode { get; set; } = string.Empty; // e.g. "PARTNER-789"
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? WebsiteOrChannel { get; set; }
    public decimal CommissionRatePercentage { get; set; } = 20.0m; // 20% recurring
    public decimal TotalEarned { get; set; } = 0.0m;
    public decimal PendingBalance { get; set; } = 0.0m;
    public decimal PaidBalance { get; set; } = 0.0m;
    public string Status { get; set; } = "Active"; // Active, Pending, Suspended
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedUtc { get; set; }
    public string? PayoutDetailsJson { get; set; }
}

/// <summary>
/// Referral record tracking an onboarded tenant workspace referred by an affiliate.
/// </summary>
public class MasterAffiliateReferral
{
    public long Id { get; set; }
    public int AffiliatePartnerId { get; set; }
    public string ReferredTenantKey { get; set; } = string.Empty;
    public string ReferredOrganizationName { get; set; } = string.Empty;
    public decimal SubscriptionAmount { get; set; }
    public decimal CommissionEarned { get; set; }
    public string CommissionStatus { get; set; } = "Pending"; // Pending, Approved, Paid
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime? PaidUtc { get; set; }
}
