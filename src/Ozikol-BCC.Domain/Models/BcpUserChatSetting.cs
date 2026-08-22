using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Platform-wide chat preferences for a user. These are defaults
    /// that can be overridden per-group via BcpGroupMember settings.
    /// </summary>
    public class BcpUserChatSetting
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// The user these settings belong to.
        /// </summary>
        public string UserId { get; set; } = string.Empty;
        public Profile? User { get; set; }

        // ── Presence ──

        /// <summary>
        /// The user's default presence status when they come online.
        /// </summary>
        [Display(Name = "Default Presence")]
        public BcpPresenceStatus DefaultPresence { get; set; } = BcpPresenceStatus.Online;

        /// <summary>
        /// Minutes of inactivity before auto-switching to "Away".
        /// </summary>
        [Display(Name = "Auto-Away Timeout (minutes)")]
        public int AutoAwayMinutes { get; set; } = 5;

        // ── Notifications ──

        /// <summary>
        /// Default notification tone key for new groups.
        /// </summary>
        [StringLength(50)]
        [Display(Name = "Default Tone")]
        public string DefaultTone { get; set; } = "default";

        /// <summary>
        /// Default notification volume (0–100).
        /// </summary>
        [Display(Name = "Default Volume")]
        public int DefaultVolume { get; set; } = 80;

        /// <summary>
        /// Master mute — silences all chat notifications platform-wide.
        /// </summary>
        [Display(Name = "Global Mute")]
        public bool GlobalMute { get; set; }

        // ── Privacy ──

        /// <summary>
        /// Global default for read receipts. Can be overridden per-group.
        /// </summary>
        [Display(Name = "Global Read Receipts")]
        public bool GlobalReadReceipts { get; set; } = true;

        /// <summary>
        /// Global default for typing indicator. Can be overridden per-group.
        /// </summary>
        [Display(Name = "Global Typing Indicator")]
        public bool GlobalTypingIndicator { get; set; } = true;

        /// <summary>
        /// Global default for last seen visibility. Can be overridden per-group.
        /// </summary>
        [Display(Name = "Global Last Seen")]
        public bool GlobalLastSeen { get; set; } = true;

        // ── Media ──

        /// <summary>
        /// Auto-download images in chat.
        /// </summary>
        [Display(Name = "Auto-Download Images")]
        public bool AutoDownloadImages { get; set; } = true;

        /// <summary>
        /// Auto-download files in chat.
        /// </summary>
        [Display(Name = "Auto-Download Files")]
        public bool AutoDownloadFiles { get; set; }
    }
}

