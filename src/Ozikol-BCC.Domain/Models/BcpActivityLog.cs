using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Audit record for workspace and user actions, operational events, and administrative changes.
    /// Stored directly in the tenant's relational database table [dbo].[BcpActivityLogs].
    /// </summary>
    public class BcpActivityLog
    {
        /// <summary>
        /// Gets or sets the primary key identifier generated as a sequential Version 7 GUID.
        /// </summary>
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Gets or sets the category or type of action (e.g., "USER_UPDATE", "ROLE_ASSIGNED", "LOGIN_SUCCESS").
        /// </summary>
        [Required]
        [StringLength(100)]
        public string? ActionType { get; set; } 

        /// <summary>
        /// Gets or sets the human-readable description of what was performed.
        /// </summary>
        [Required]
        [StringLength(1000)]
        public string? Description { get; set; } 

        /// <summary>
        /// Gets or sets the Profile ID of the user who performed the action.
        /// </summary>
        [StringLength(100)]
        public string? PerformedByProfileId { get; set; }

        /// <summary>
        /// Gets or sets the full name of the user who performed the action.
        /// </summary>
        [StringLength(255)]
        public string? PerformedByFullName { get; set; }

        /// <summary>
        /// Gets or sets the email address of the user who performed the action.
        /// </summary>
        [StringLength(255)]
        public string? PerformedByUserEmail { get; set; }

        /// <summary>
        /// Gets or sets the Profile ID of the target user affected by this action (if applicable).
        /// </summary>
        [StringLength(100)]
        public string? TargetProfileId { get; set; }

        /// <summary>
        /// Gets or sets the full name of the target user affected by this action (if applicable).
        /// </summary>
        [StringLength(255)]
        public string? TargetFullName { get; set; }

        /// <summary>
        /// Gets or sets the UTC timestamp when the action occurred.
        /// </summary>
        public DateTime Date { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// Gets or sets the workspace module or domain area (e.g., "User Management", "Settings", "Auth").
        /// </summary>
        [StringLength(100)]
        public string? Module { get; set; } 

        /// <summary>
        /// Gets or sets the originating client IP address.
        /// </summary>
        [StringLength(60)]
        public string? IpAddress { get; set; }

        /// <summary>
        /// Gets or sets the persistent unique client machine or device identifier (from X-System-Id).
        /// </summary>
        [StringLength(100)]
        public string? SystemId { get; set; }

        /// <summary>
        /// Gets or sets the client User-Agent header string.
        /// </summary>
        [StringLength(500)]
        public string? UserAgent { get; set; }

        /// <summary>
        /// Gets or sets arbitrary JSON-serialized metadata capturing entity state changes or context.
        /// </summary>
        public string? MetadataJson { get; set; }
    }
}
