using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpLoginAuditLog
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [EmailAddress]
        [StringLength(255)]
        public string Email { get; set; } = string.Empty;

        [StringLength(50)]
        public string? IpAddress { get; set; }

        [StringLength(100)]
        public string? Status { get; set; } // Success, Failed (Invalid Credentials), Blocked (MFA Required), etc.

        [StringLength(255)]
        public string? UserAgent { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
