using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpUserDevice
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        public string UserId { get; set; } = string.Empty;
        public Profile? User { get; set; }

        [Required]
        [StringLength(255)]
        public string DeviceName { get; set; } = string.Empty; // e.g. "Chrome on Windows 11"

        [Required]
        [StringLength(50)]
        public string IpAddress { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        public string TrustToken { get; set; } = string.Empty; // Cryptographic Guid string

        [Required]
        [StringLength(255)]
        public string JwtId { get; set; } = string.Empty; // Jti claim value of current token

        public bool IsTrusted { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;

        public bool IsActiveSession { get; set; } = true;
    }
}
