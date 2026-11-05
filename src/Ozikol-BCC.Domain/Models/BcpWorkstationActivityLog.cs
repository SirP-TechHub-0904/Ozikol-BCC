using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Comprehensive chronological activity log for a workstation and its assigned operator:
    /// Tracks opened/closed applications with exact duration, active document file names & paths,
    /// idle warning / idle lock / password resume events, shift transitions, and periodic desktop screenshots.
    /// Table: [dbo].[BcpWorkstationActivityLogs]
    /// </summary>
    public class BcpWorkstationActivityLog
    {
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid? WorkstationId { get; set; }

        [StringLength(100)]
        public string? StationKey { get; set; }

        [Required]
        [StringLength(150)]
        public string MachineName { get; set; } = string.Empty;

        [StringLength(100)]
        public string? UserId { get; set; }

        [StringLength(255)]
        public string? UserName { get; set; }

        [StringLength(255)]
        public string? UserEmail { get; set; }

        /// <summary>
        /// Event category:
        /// APP_OPENED, APP_CLOSED, DOCUMENT_ACTIVE,
        /// IDLE_WARNING, IDLE_LOCKED, PASSWORD_RESUMED, ADMIN_LOCKED, ADMIN_UNLOCKED,
        /// SHIFT_STARTED, BREAK_STARTED, BREAK_ENDED, SHIFT_CLOSED,
        /// SCREENSHOT_CAPTURED
        /// </summary>
        [Required]
        [StringLength(60)]
        public string EventType { get; set; } = "APP_OPENED";

        [StringLength(150)]
        public string? ProcessName { get; set; }

        [StringLength(200)]
        public string? AppDisplayName { get; set; }

        [StringLength(500)]
        public string? WindowTitle { get; set; }

        [StringLength(260)]
        public string? FileName { get; set; }

        [StringLength(1000)]
        public string? FilePath { get; set; }

        public DateTime StartedAt { get; set; } = DateTime.UtcNow;

        public DateTime? EndedAt { get; set; }

        /// <summary>
        /// Duration in seconds (e.g. how long an application remained open, or how long the screen remained idle/locked before password resume).
        /// </summary>
        public int? DurationSeconds { get; set; }

        /// <summary>
        /// Optional captured desktop screenshot (Data URI or uploaded URL).
        /// </summary>
        public string? ScreenshotUrl { get; set; }

        [StringLength(1000)]
        public string? Details { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}

