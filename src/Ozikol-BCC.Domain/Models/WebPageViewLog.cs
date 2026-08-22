using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Real-time database log tracking every visitor page view, device hardware, browser client, dwell time, and route status.
    /// </summary>
    [Table("WebPageViewLogs")]
    public class WebPageViewLog
    {
        [Key]
        public long Id { get; set; }

        public Guid? WebPageId { get; set; }

        [ForeignKey(nameof(WebPageId))]
        public WebPage? WebPage { get; set; }

        [MaxLength(500)]
        public string PageUrl { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? PageTitle { get; set; }

        [MaxLength(50)]
        public string DeviceType { get; set; } = "Desktop";

        [MaxLength(50)]
        public string Browser { get; set; } = "Google Chrome";

        public string? UserAgent { get; set; }

        [MaxLength(64)]
        public string? IpAddress { get; set; }

        [MaxLength(500)]
        public string? Referer { get; set; }

        /// <summary>
        /// Dwell time in seconds spent on the page.
        /// </summary>
        public int DurationSeconds { get; set; } = 0;

        /// <summary>
        /// HTTP status code (200 = Success, 404 = Not Found, 500 = Error).
        /// </summary>
        public int StatusCode { get; set; } = 200;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
