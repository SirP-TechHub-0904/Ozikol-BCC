using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Tracks pending invitations to join a group.
    /// </summary>
    public class BcpGroupInvitation
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid GroupId { get; set; }
        public BcpGroup? Group { get; set; }

        /// <summary>
        /// The user being invited.
        /// </summary>
        public string InvitedUserId { get; set; } = string.Empty;
        public Profile? InvitedUser { get; set; }

        /// <summary>
        /// The user who sent the invitation.
        /// </summary>
        public string InvitedByUserId { get; set; } = string.Empty;
        public Profile? InvitedByUser { get; set; }

        /// <summary>
        /// Current status: "Pending", "Accepted", "Declined".
        /// </summary>
        [StringLength(20)]
        [Display(Name = "Status")]
        public string Status { get; set; } = "Pending";

        [Display(Name = "Date Invited")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

