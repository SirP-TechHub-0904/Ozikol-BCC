using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpReportSubmission
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpReportSchemaId { get; set; }
        public BcpReportSchema? BcpReportSchema { get; set; }

        [Required]
        public string? UserProfileId { get; set; }
        public Profile? UserProfile { get; set; }

        // Core Content (Optional now since template is dynamic)
        public string? Content { get; set; }

        // Structured Report Data
        public string? TaskAssigned { get; set; }
        public string? Achievements { get; set; }
        public string? Challenges { get; set; }
        public string? Impact { get; set; }
        public string? PlansForNextPeriod { get; set; }
        public string? AttachmentUrl { get; set; }

        // Evaluation
        public string? ManagerComment { get; set; }
        public string? AdminComment { get; set; }

        public DateTime PeriodDate { get; set; }
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
        public string? Status { get; set; } // "OnTime", "Late"

        public ICollection<BcpReportTimeLog>? TimeLogs { get; set; }
    }
}


