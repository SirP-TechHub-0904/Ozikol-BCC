using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// BCP: Records the actual score given to a specific user on a specific KPI Indicator.
    /// Each score is tied to a Period (e.g., "Q1 2025", "January 2025") 
    /// so performance can be tracked and compared over time.
    /// Scores belong to both a Profile and a KPI definition.
    /// </summary>
    public class BcpKpiUserScore
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        // The user being evaluated
        [Display(Name = "User")]
        [Required]
        public string? ProfileId { get; set; }
        public Profile? Profile { get; set; }

        // Which KPI indicator is being scored
        [Display(Name = "KPI Indicator")]
        [Required]
        public Guid BcpKpiIndicatorId { get; set; }
        public BcpKpiIndicator? BcpKpiIndicator { get; set; }

        [Display(Name = "Score")]
        public decimal Score { get; set; }

        [Display(Name = "Evaluation Period")]
        [Required]
        public string? Period { get; set; } // e.g., "Q1 2025", "January 2025"

        [Display(Name = "Remarks / Notes")]
        public string? Remarks { get; set; }

        // ProfileId of the evaluator who submitted this score.
        [Display(Name = "Evaluated By")]
        public string? EvaluatedBy { get; set; } // ProfileId of the evaluator

        public DateTime Date { get; set; } = DateTime.UtcNow;
    }
}


