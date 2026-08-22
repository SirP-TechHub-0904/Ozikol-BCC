using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpUserMfaBackupCode
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        public string UserId { get; set; } = string.Empty;
        public Profile? User { get; set; }

        [Required]
        [StringLength(255)]
        public string HashedCode { get; set; } = string.Empty;

        public bool IsUsed { get; set; } = false;

        public DateTime? UsedAtUtc { get; set; }
    }
}
