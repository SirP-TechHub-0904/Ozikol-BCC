using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Dashboard widget definition used by BCP Console and feature dashboards.
    /// WidgetCode identifies what to render; SortOrder and ColSpan control layout.
    /// </summary>
    public class BcpWidget
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Stable widget key resolved by the UI or dashboard service.
        /// </summary>
        [Required]
        [StringLength(100)]
        [Display(Name = "Widget Code")]
        public string? WidgetCode { get; set; }

        [Display(Name = "Sort Order")]
        public int SortOrder { get; set; }

        [Display(Name = "Column Span")]
        public int ColSpan { get; set; } // 3, 4, 6, 8, 12
    }
}


