using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Platform Operator User account stored strictly in the central Master Catalog database.
/// Used for SuperAdmins, Support Staff, Affiliate Partners, and Template Creators
/// managing tenant fleets, template catalogs, billing, and referral networks.
/// </summary>
public class CentralUser : IdentityUser
{
    /// <summary>
    /// First name of the central platform user.
    /// </summary>
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// Last name of the central platform user.
    /// </summary>
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// Computed full name from first and last name components.
    /// </summary>
    public string FullName => $"{FirstName} {LastName}".Trim();

    /// <summary>
    /// Organisational department this user belongs to (e.g., "Engineering", "Support", "Marketing").
    /// </summary>
    public string? Department { get; set; }

    /// <summary>
    /// Whether this user account is currently active. Disabled accounts cannot log in to any portal.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// UTC timestamp of when this user account was created.
    /// </summary>
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// UTC timestamp of the user's most recent successful login across any portal.
    /// </summary>
    public DateTime? LastLoginUtc { get; set; }

    /// <summary>
    /// Optional URL to the user's profile avatar image.
    /// </summary>
    [MaxLength(500)]
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// Optional foreign key linking this user to an approved affiliate partner record.
    /// Set when an AffiliatePartner application is approved and a CentralUser account is auto-provisioned.
    /// </summary>
    public Guid? AffiliatePartnerId { get; set; }

    /// <summary>
    /// Optional foreign key linking this user to a creator application record.
    /// Set when a CreatorApplication is approved and a CentralUser account is auto-provisioned.
    /// </summary>
    public Guid? CreatorApplicationId { get; set; }

    // ── Navigation Properties ──

    /// <summary>
    /// Navigation to the linked affiliate partner record (if this user is an affiliate).
    /// </summary>
    [ForeignKey(nameof(AffiliatePartnerId))]
    public MasterAffiliatePartner? AffiliatePartner { get; set; }

    /// <summary>
    /// Navigation to the linked creator application record (if this user is a template creator).
    /// </summary>
    [ForeignKey(nameof(CreatorApplicationId))]
    public MasterCreatorApplication? CreatorApplication { get; set; }
}

