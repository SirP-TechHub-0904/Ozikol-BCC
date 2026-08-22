using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Pending user invitation issued by BCP Identity admins.
    /// Tracks email invitations, secure tokens, category/role assignments, and acceptance status.
    /// </summary>
    public class BcpUserInvitation
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Token { get; set; } = string.Empty;

        public string? RoleName { get; set; }

        public Guid? BcpUserCategoryId { get; set; }
        public BcpUserCategory? BcpUserCategory { get; set; }

        public string? InvitedByProfileId { get; set; }
        public Profile? InvitedByProfile { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7);

        public bool IsAccepted { get; set; } = false;
        public DateTime? AcceptedAt { get; set; }
    }
}

