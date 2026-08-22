using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpJobInterview
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpJobApplicantId { get; set; }
        public BcpJobApplicant? BcpJobApplicant { get; set; }

        public DateTime InterviewDate { get; set; }

        public string? LocationOrLink { get; set; }

        public Enum.Enum.InterviewType InterviewType { get; set; } = Enum.Enum.InterviewType.OnlineVideo;

        [Range(0, 100)]
        public int? Score { get; set; }

        public string? AdminFeedback { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}


