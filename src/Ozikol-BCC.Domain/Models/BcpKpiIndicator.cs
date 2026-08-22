using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// BCP: Defines a single Key Performance Indicator (KPI) created by the admin.
    /// These are 100% custom — the admin creates them to match their organization's needs.
    /// e.g., "Punctuality", "Task Completion Rate", "Attendance Score", "Monthly Sales Target"
    /// Every tenant starts with zero indicators and builds their own set.
    /// Indicators are definitions only; actual per-user values live in BcpKpiUserScore.
    /// </summary>
    public class BcpKpiIndicator
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Display(Name = "Indicator Title")]
        [Required]
        public string? Title { get; set; }

        [Display(Name = "Description")]
        public string? Description { get; set; }

        [Display(Name = "Maximum Score")]
        public decimal MaxScore { get; set; } = 100;

        [Display(Name = "Weighting Multiplier")]
        public decimal Weight { get; set; } = 1.0m;

        [Display(Name = "KPI Category")]
        [StringLength(50)]
        public string? Category { get; set; } = "General";

        [Display(Name = "Sort Order")]
        public int SortOrder { get; set; }

        [Display(Name = "Is Active")]
        public bool IsActive { get; set; } = true;

        public DateTime Date { get; set; } = DateTime.UtcNow;

        // Navigation: scores recorded against this indicator for users and periods.
        public ICollection<BcpKpiUserScore>? BcpKpiUserScores { get; set; }
    }
}


