using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Defines one guided-tour step for a BCP feature. The Material Design UI
    /// can use FeatureName, StepOrder, and TargetElement to render tours consistently.
    /// </summary>
    public class BcpWizardStep
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Feature/module key that owns this tour step.
        /// </summary>
        [Required]
        [StringLength(100)]
        [Display(Name = "Feature Name")]
        public string? FeatureName { get; set; } // e.g., BcpTicketing

        [Display(Name = "Step Order")]
        public int StepOrder { get; set; }

        /// <summary>
        /// CSS selector or stable element key targeted by the tour overlay.
        /// </summary>
        [StringLength(100)]
        [Display(Name = "Target Element")]
        public string? TargetElement { get; set; } // e.g., #btnCreateTicket

        [Required]
        [StringLength(200)]
        public string? Title { get; set; }

        [Required]
        public string? Content { get; set; }
    }
}


