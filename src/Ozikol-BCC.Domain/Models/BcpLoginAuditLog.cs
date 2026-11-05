using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Audit record for user authentication attempts, 2FA challenges, lockouts, and session establishments.
    /// Stored directly in the tenant's relational database table [dbo].[BcpLoginAuditLogs].
    /// </summary>
    public class BcpLoginAuditLog
    {
        /// <summary>
        /// Gets or sets the primary key identifier generated as a sequential Version 7 GUID.
        /// </summary>
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Gets or sets the unique profile/account identifier of the user (if identified).
        /// </summary>
        [StringLength(100)]
        public string? UserId { get; set; }

        /// <summary>
        /// Gets or sets the email address used in the authentication attempt.
        /// </summary>
        [Required]
        [EmailAddress]
        [StringLength(255)]
        public string Email { get; set; } = string.Empty;

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
        /// Gets or sets the authentication outcome status (e.g. "Success", "Failed (Invalid Credentials)", "Locked Out").
        /// </summary>
        [StringLength(100)]
        public string? Status { get; set; }

        /// <summary>
        /// Gets or sets the client User-Agent header string.
        /// </summary>
        [StringLength(500)]
        public string? UserAgent { get; set; }

        /// <summary>
        /// Gets or sets the UTC timestamp when the login attempt occurred.
        /// </summary>
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
