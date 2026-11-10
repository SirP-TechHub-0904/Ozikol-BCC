using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a one‑time invitation sent to an external user to join the BCC platform.
    /// The invitation contains a unique token that can be used exactly once; after the first
    /// successful registration the token is marked as used and becomes invalid.
    /// </summary>
    public class Invitation
    {
        /// <summary>
        /// Primary key (GUID) for the invitation record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Full name of the person being invited.
        /// </summary>
        [Required]
        [StringLength(200)]
        public string FullName { get; set; } = string.Empty;

        /// <summary>
        /// Email address where the invitation link will be delivered.
        /// </summary>
        [Required]
        [EmailAddress]
        [StringLength(200)]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Phone number in international format (e.g. +44 7700 900123).
        /// </summary>
        [StringLength(30)]
        public string? PhoneNumber { get; set; }

        /// <summary>
        /// Secure token embedded in the invitation URL. Generated as a GUID string.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string Token { get; set; } = Guid.NewGuid().ToString("N");

        /// <summary>
        /// Indicates whether the invitation has already been redeemed.
        /// </summary>
        public bool IsUsed { get; set; } = false;

        /// <summary>
        /// UTC timestamp when the invitation was created.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Optional expiry time after which the token is considered invalid.
        /// </summary>
        public DateTime? ExpiresUtc { get; set; }
    }
}

