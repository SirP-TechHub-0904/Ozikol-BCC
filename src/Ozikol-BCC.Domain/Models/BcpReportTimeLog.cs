using System;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpReportTimeLog
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        public Guid BcpReportSubmissionId { get; set; }
        public BcpReportSubmission? BcpReportSubmission { get; set; }

        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string? ActivityDescription { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public bool IsBreak { get; set; }
    }
}


