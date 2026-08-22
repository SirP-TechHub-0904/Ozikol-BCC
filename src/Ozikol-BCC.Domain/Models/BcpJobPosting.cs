using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpJobPosting
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required, StringLength(200)]
        public string? Title { get; set; }

        [Required]
        public string? Description { get; set; }

        public string? AmountOrSalary { get; set; }

        public string? RequiredSkills { get; set; }

        public string? Benefits { get; set; }

        public Enum.Enum.JobType JobType { get; set; } = Enum.Enum.JobType.FullTime;

        public Enum.Enum.JobStatus Status { get; set; } = Enum.Enum.JobStatus.Draft;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ClosingDate { get; set; }

        public ICollection<BcpJobApplicant> Applicants { get; set; } = new List<BcpJobApplicant>();
    }
}


