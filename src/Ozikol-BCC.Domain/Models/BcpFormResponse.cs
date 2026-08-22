using System;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpFormResponse
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        public Guid BcpFormId { get; set; }
        public BcpForm? BcpForm { get; set; }

        public string? UserProfileId { get; set; }
        public Profile? UserProfile { get; set; }

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
        
        public string? ResponsesJson { get; set; }
    }
}


