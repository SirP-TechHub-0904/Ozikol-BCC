using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Audit row for sensitive BCP user-management actions such as feature-role changes,
    /// KPI scoring, and private notes.
    /// </summary>
    public class BcpActivityLog
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        public string? ActionType { get; set; } 

        [Required]
        public string? Description { get; set; } 

        public string? PerformedByProfileId { get; set; }
        public string? PerformedByFullName { get; set; }

        public string? TargetProfileId { get; set; }
        public string? TargetFullName { get; set; }

        public DateTime Date { get; set; } = DateTime.UtcNow;
        
        public string? Module { get; set; } 

        [StringLength(50)]
        public string? IpAddress { get; set; }

        public string? MetadataJson { get; set; }
    }
}


