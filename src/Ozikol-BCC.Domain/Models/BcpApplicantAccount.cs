using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Public job-board applicant account. This is intentionally separate from
    /// Profile because applicants are external users until hired or promoted.
    /// </summary>
    public class BcpApplicantAccount
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required, StringLength(100)]
        public string? FirstName { get; set; }

        [Required, StringLength(100)]
        public string? LastName { get; set; }

        [Required, EmailAddress, StringLength(255)]
        public string? Email { get; set; }

        [Required]
        public string? PasswordHash { get; set; }

        [Phone, StringLength(50)]
        public string? Phone { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Job applications submitted by this external applicant.
        /// </summary>
        public ICollection<BcpJobApplicant> Applications { get; set; } = new List<BcpJobApplicant>();
    }
}


