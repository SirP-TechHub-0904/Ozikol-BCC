using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// BCP: Defines a performance evaluation period (e.g. "July 2026", "Q3 2026").
    /// Custom evaluation periods created by the administrator to prevent typographical
    /// errors and group KPI scores consistently on the leaderboard.
    /// </summary>
    public class BcpKpiPeriod
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [StringLength(100)]
        [Display(Name = "Period Title")]
        public string Title { get; set; } = string.Empty;

        [StringLength(255)]
        [Display(Name = "Description")]
        public string? Description { get; set; }

        [Display(Name = "Is Active")]
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

