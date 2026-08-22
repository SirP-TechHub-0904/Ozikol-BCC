using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpJobApplicantDocument
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpJobApplicantId { get; set; }
        public BcpJobApplicant? BcpJobApplicant { get; set; }

        [Required, StringLength(200)]
        public string? Title { get; set; }

        [Required]
        public string? FileUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}


