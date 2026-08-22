using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Tracks individual active user login device sessions, user agents, IP addresses, and revocation states.
    /// </summary>
    public class UserDeviceSession
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string ProfileId { get; set; } = string.Empty;

        [ForeignKey(nameof(ProfileId))]
        public Profile? Profile { get; set; }

        /// <summary>
        /// Unique session identifier stored in user claims to match the active browser cookie.
        /// </summary>
        [Required]
        public string SessionKey { get; set; } = Guid.NewGuid().ToString();

        /// <summary>
        /// Device categorization: Desktop, Mobile, or Tablet.
        /// </summary>
        public string DeviceType { get; set; } = "Desktop";

        /// <summary>
        /// Parsed browser and operating system description (e.g. Chrome 126 on Windows 11).
        /// </summary>
        public string DeviceName { get; set; } = "Unknown Device";

        /// <summary>
        /// Raw User-Agent string from the HTTP request headers.
        /// </summary>
        public string UserAgent { get; set; } = string.Empty;

        /// <summary>
        /// Client IP address at login/last activity.
        /// </summary>
        public string IpAddress { get; set; } = "127.0.0.1";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;

        public bool IsRevoked { get; set; } = false;

        public DateTime? RevokedAt { get; set; }
    }
}

