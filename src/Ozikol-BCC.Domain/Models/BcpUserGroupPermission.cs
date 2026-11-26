using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents an individual modular capability permission rule within a User Group blueprint.
    /// Maps a feature/module key to an authorized action role (None, ReadOnly, FeatureEditor, GlobalEditor).
    /// </summary>
    [Table("BcpUserGroupPermissions")]
    public class BcpUserGroupPermission
    {
        /// <summary>
        /// Unique primary key identifier for the permission rule.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Foreign key linking to the parent User Group.
        /// </summary>
        [Required]
        public Guid BcpUserGroupId { get; set; }

        /// <summary>
        /// Navigation property referencing the parent User Group.
        /// </summary>
        [ForeignKey(nameof(BcpUserGroupId))]
        public BcpUserGroup? BcpUserGroup { get; set; }

        /// <summary>
        /// Identifier key of the feature or capability module (e.g., "Dashboard", "UserManager", "Workforce").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string FeatureAreaKey { get; set; } = string.Empty;

        /// <summary>
        /// Action scope granted to group members for this feature area.
        /// </summary>
        public BcpActionRole ActionRole { get; set; } = BcpActionRole.ReadOnly;
    }
}
