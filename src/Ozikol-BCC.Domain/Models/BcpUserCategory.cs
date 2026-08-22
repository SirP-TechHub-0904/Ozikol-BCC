using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// BCP: Defines the category/type of a user within the organization.
    /// e.g., "Staff", "Volunteer", "Alumni", "Member", "Contractor"
    /// Every tenant creates their own categories specific to their organization.
    /// Profiles may optionally reference one category for filtering and reporting.
    /// </summary>
    public class BcpUserCategory
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Display(Name = "Category Name")]
        [Required]
        public string? Name { get; set; }

        [Display(Name = "Description")]
        public string? Description { get; set; }

        [Display(Name = "Badge Color")]
        [StringLength(20)]
        public string? ColorCode { get; set; } = "#0050e5";

        [Display(Name = "Icon Identifier")]
        [StringLength(50)]
        public string? Icon { get; set; } = "category";

        [Display(Name = "Sort Order")]
        public int SortOrder { get; set; }

        [Display(Name = "Is Active")]
        public bool IsActive { get; set; } = true;

        public DateTime Date { get; set; } = DateTime.UtcNow;
    }
}


