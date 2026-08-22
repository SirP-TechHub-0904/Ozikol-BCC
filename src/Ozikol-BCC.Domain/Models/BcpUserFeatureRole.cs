using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// BCP: The Permission Matrix table — the core of the Role-Based Access Control system.
    /// Each row grants a specific user access to one BCP feature/module at a specific action level.
    ///
    /// Examples:
    ///   - ProfileId: "John" | FeatureAreaKey: "Elections"  | ActionRole: Readonly
    ///   - ProfileId: "John" | FeatureAreaKey: "Ticketing"  | ActionRole: FeatureEditor
    ///   - ProfileId: "Jane" | FeatureAreaKey: "Ticketing"  | ActionRole: GlobalEditor
    ///
    /// A user can have multiple rows — one per feature they are assigned to.
    /// GlobalEditor should be interpreted by services as the highest action level.
    /// </summary>
    public class BcpUserFeatureRole
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        // The user receiving the role
        [Display(Name = "User")]
        [Required]
        public string? ProfileId { get; set; }
        public Profile? Profile { get; set; }

        // The feature/module key this role applies to. It must match the BCP feature catalog
        // and route/module key used by Console and Workspace pages.
        [Display(Name = "Feature Area Key")]
        [Required]
        public string? FeatureAreaKey { get; set; }

        [Display(Name = "Action Role")]
        public BcpActionRole ActionRole { get; set; }

        [Display(Name = "Is Active")]
        public bool IsActive { get; set; } = true;

        // Who granted this role
        [Display(Name = "Assigned By")]
        public string? AssignedBy { get; set; } // ProfileId of the admin

        public DateTime Date { get; set; } = DateTime.UtcNow;
    }
}


