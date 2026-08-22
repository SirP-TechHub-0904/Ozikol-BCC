using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a BCP workspace group used to organize users around committees,
    /// teams, departments, or temporary collaboration spaces inside a tenant database.
    /// </summary>
    public class BcpGroup
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [StringLength(255)]
        [Display(Name = "Group Title")]
        public string Title { get; set; } = string.Empty;

        [Display(Name = "Description")]
        public string? Description { get; set; }

        [Display(Name = "Group Type")]
        public BcpGroupType GroupType { get; set; } = BcpGroupType.General;

        [Display(Name = "Visibility")]
        public BcpGroupVisibility Visibility { get; set; } = BcpGroupVisibility.Private;

        [Display(Name = "Chat Mode")]
        public BcpGroupChatMode ChatMode { get; set; } = BcpGroupChatMode.Open;

        [Display(Name = "Avatar URL")]
        public string? AvatarUrl { get; set; }

        [Display(Name = "Background Cover Image URL")]
        public string? CoverImageUrl { get; set; }

        /// <summary>
        /// The platform user who created this group.
        /// </summary>
        public string? CreatedByUserId { get; set; }
        public Profile? CreatedByUser { get; set; }

        [Display(Name = "Is Active")]
        public bool IsActive { get; set; } = true;

        [Display(Name = "Is Archived")]
        public bool IsArchived { get; set; }

        [Display(Name = "Max Members")]
        public int? MaxMembers { get; set; }

        [Display(Name = "Allow Guest Access")]
        public bool AllowGuestAccess { get; set; }

        // ── Operational Hours ──

        /// <summary>
        /// When true, the group chat is available 24/7. When false,
        /// OperationalDays + OpenTime/CloseTime control availability.
        /// </summary>
        [Display(Name = "Always Open (24/7)")]
        public bool IsAlwaysOpen { get; set; } = true;

        /// <summary>
        /// Comma-separated day names, e.g. "Mon,Tue,Wed,Thu,Fri".
        /// </summary>
        [StringLength(100)]
        [Display(Name = "Operational Days")]
        public string? OperationalDays { get; set; }

        [Display(Name = "Open Time")]
        public TimeSpan? OpenTime { get; set; }

        [Display(Name = "Close Time")]
        public TimeSpan? CloseTime { get; set; }

        /// <summary>
        /// Auto-response shown to users when the group is outside operational hours.
        /// </summary>
        [StringLength(500)]
        [Display(Name = "Closed Message")]
        public string? ClosedMessage { get; set; }

        // ── Chat Settings ──

        /// <summary>
        /// Number of minutes a user has to edit their sent message.
        /// </summary>
        [Display(Name = "Edit Window (minutes)")]
        public int EditWindowMinutes { get; set; } = 15;

        /// <summary>
        /// Number of minutes a user has to delete their sent message.
        /// </summary>
        [Display(Name = "Delete Window (minutes)")]
        public int DeleteWindowMinutes { get; set; } = 5;

        /// <summary>
        /// Auto-archive/delete messages older than this many days. Null = forever.
        /// </summary>
        [Display(Name = "Message Retention (days)")]
        public int? MessageRetentionDays { get; set; }

        /// <summary>
        /// Character threshold after which a message is auto-converted to a .txt file.
        /// </summary>
        [Display(Name = "Auto-Convert Threshold")]
        public int AutoConvertThreshold { get; set; } = 1000;

        /// <summary>
        /// Max messages a single user can send per minute before rate limiting.
        /// </summary>
        [Display(Name = "Rate Limit (messages/min)")]
        public int RateLimitPerMinute { get; set; } = 30;

        // ── Privacy Settings (Group-Wide) ──

        /// <summary>
        /// When true, read receipts are visible in this group.
        /// </summary>
        [Display(Name = "Enable Read Receipts")]
        public bool ReadReceiptsEnabled { get; set; } = true;

        /// <summary>
        /// When true, typing indicators are shown in this group.
        /// </summary>
        [Display(Name = "Enable Typing Indicators")]
        public bool TypingIndicatorsEnabled { get; set; } = true;

        /// <summary>
        /// When true, "Last seen" timestamps are visible in this group.
        /// </summary>
        [Display(Name = "Enable Last Seen")]
        public bool LastSeenEnabled { get; set; } = true;

        // ── Cloudinary ──

        /// <summary>
        /// Auto-generated Cloudinary folder path: "{FileFolderName}/groups/{slug}".
        /// </summary>
        [StringLength(500)]
        [Display(Name = "Cloudinary Folder")]
        public string? CloudinaryFolder { get; set; }

        [Display(Name = "Date Created")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ── Navigation Properties ──

        /// <summary>
        /// Users attached to this group.
        /// </summary>
        public virtual ICollection<BcpGroupMember> Members { get; set; } = new List<BcpGroupMember>();

        /// <summary>
        /// Chat messages in this group.
        /// </summary>
        public virtual ICollection<BcpGroupPost> Posts { get; set; } = new List<BcpGroupPost>();

        /// <summary>
        /// Files shared with the group.
        /// </summary>
        public virtual ICollection<BcpGroupFile> Files { get; set; } = new List<BcpGroupFile>();
    }
}

