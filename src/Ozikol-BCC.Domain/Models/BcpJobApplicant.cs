using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpJobApplicant
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpJobPostingId { get; set; }
        public BcpJobPosting? BcpJobPosting { get; set; }

        [Required, StringLength(100)]
        public string? FirstName { get; set; }

        [Required, StringLength(100)]
        public string? LastName { get; set; }

        [Required, EmailAddress]
        public string? Email { get; set; }

        [Required, Phone]
        public string? Phone { get; set; }

        public string? ProfessionalSummary { get; set; }
        public string? WorkExperience { get; set; }
        // Link to the Applicant's isolated account
        public Guid BcpApplicantAccountId { get; set; }
        public BcpApplicantAccount? BcpApplicantAccount { get; set; }

        public string? Education { get; set; }
        public string? Skills { get; set; }

        public string? PassportFileUrl { get; set; }
        public string? ResumeFileUrl { get; set; }

        public Enum.Enum.ApplicationStatus Status { get; set; } = Enum.Enum.ApplicationStatus.Applied;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<BcpJobInterview> Interviews { get; set; } = new List<BcpJobInterview>();
        public ICollection<BcpJobApplicantDocument> Documents { get; set; } = new List<BcpJobApplicantDocument>();
    }
}


