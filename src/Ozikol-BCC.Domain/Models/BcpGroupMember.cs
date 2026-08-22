using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Joins a Profile to a BCP group and records the user's group-level role,
    /// membership state, and per-member notification/privacy preferences.
    /// </summary>
    public class BcpGroupMember
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpGroupId { get; set; }
        public BcpGroup? BcpGroup { get; set; }

        public string UserProfileId { get; set; } = string.Empty;
        public Profile? UserProfile { get; set; }

        /// <summary>
        /// Enum-based role within this group. Controls chat permissions.
        /// </summary>
        [Display(Name = "Group Role")]
        public BcpGroupRole GroupRole { get; set; } = BcpGroupRole.Member;

        /// <summary>
        /// Human-facing position inside this group, such as Chairman, Secretary, or Member.
        /// This is a display label; permission checks use GroupRole.
        /// </summary>
        [StringLength(100)]
        [Display(Name = "Role / Position")]
        public string? RolePosition { get; set; }

        /// <summary>
        /// Workflow status for group membership.
        /// </summary>
        public string MembershipStatus { get; set; } = "Active"; // Active, Pending, Declined

        /// <summary>
        /// Admin muted this user — can read messages but cannot post.
        /// </summary>
        [Display(Name = "Is Muted")]
        public bool IsMuted { get; set; }

        /// <summary>
        /// Admin suspended this user — cannot access the group at all.
        /// </summary>
        [Display(Name = "Is Suspended")]
        public bool IsSuspended { get; set; }

        // ── Read Tracking ──

        /// <summary>
        /// ID of the last message this user has read. Used to calculate unread counts.
        /// </summary>
        public Guid? LastReadMessageId { get; set; }

        // ── Per-Member Notification Preferences ──

        /// <summary>
        /// Selected notification tone key: "default", "chime", "bell", "pop".
        /// </summary>
        [StringLength(50)]
        [Display(Name = "Notification Tone")]
        public string NotificationTone { get; set; } = "default";

        /// <summary>
        /// Notification volume for this group (0–100).
        /// </summary>
        [Display(Name = "Notification Volume")]
        public int NotificationVolume { get; set; } = 80;

        /// <summary>
        /// When true, all notifications for this group are muted.
        /// </summary>
        [Display(Name = "Is Notification Muted")]
        public bool IsNotificationMuted { get; set; }

        // ── Per-Member Privacy Preferences ──

        /// <summary>
        /// When false, this user's read receipts are hidden from others.
        /// </summary>
        [Display(Name = "Show My Read Receipts")]
        public bool ShowMyReadReceipts { get; set; } = true;

        /// <summary>
        /// When false, this user's typing indicator is hidden from others.
        /// </summary>
        [Display(Name = "Show My Typing")]
        public bool ShowMyTyping { get; set; } = true;

        /// <summary>
        /// When false, this user's "Last seen" timestamp is hidden from others.
        /// </summary>
        [Display(Name = "Show My Last Seen")]
        public bool ShowMyLastSeen { get; set; } = true;

        /// <summary>
        /// Last time this user was active in the group. Used for "Last seen" display.
        /// </summary>
        [Display(Name = "Last Seen")]
        public DateTime? LastSeenAt { get; set; }

        /// <summary>
        /// Current real-time presence state in this group.
        /// Updated via SignalR connections.
        /// </summary>
        [Display(Name = "Presence Status")]
        public BcpPresenceStatus PresenceStatus { get; set; } = BcpPresenceStatus.Offline;

        [Display(Name = "Date Joined")]
        public DateTime DateJoined { get; set; } = DateTime.UtcNow;
    }
}

