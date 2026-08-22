using System;
using System.Collections.Generic;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpForm
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? ShortCode { get; set; }
        public string? SchemaJson { get; set; }
        public bool IsPublished { get; set; }
        public bool RequireLogin { get; set; }
        public bool AllowMultipleSubmissions { get; set; } = true;
        public bool AllowUserToViewResponses { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<BcpFormResponse>? Responses { get; set; }
    }
}


