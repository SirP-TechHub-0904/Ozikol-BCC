using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// A route-level page inside a BCP manual. It groups the help elements
    /// that explain buttons, tables, forms, and workflows on that route.
    /// </summary>
    public class BcpManualPage
    {
        public BcpManualPage()
        {
            BcpManualElements = new HashSet<BcpManualElement>();
        }

        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpManualId { get; set; }
        public BcpManual? BcpManual { get; set; }

        /// <summary>
        /// Stable route/page key used by the UI to match help content to a page.
        /// </summary>
        [Required]
        public string? RouteKey { get; set; }

        [Required]
        public string? PageTitle { get; set; }

        public string? PageDescription { get; set; }

        public ICollection<BcpManualElement> BcpManualElements { get; set; }
    }
}


