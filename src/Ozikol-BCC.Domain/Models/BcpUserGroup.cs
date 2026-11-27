using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a tenant-defined user group that bundles a primary system role
    /// with a blueprint of granular modular capability action roles.
    /// Allows workspace administrators to assign pre-configured access rights to members in bulk.
    /// </summary>
    [Table("BcpUserGroups")]
    public class BcpUserGroup
    {
        /// <summary>
        /// Unique primary key identifier for the user group.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Descriptive display name of the user group (e.g., "Member", "Operations Manager", "Finance Admin").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Summary description explaining the group's purpose and authority boundaries.
        /// </summary>
        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// Primary system access tier associated with this group (Member, Admin, Global Editor, Feature Editor, Read Only).
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string BaseRole { get; set; } = "Member";

        /// <summary>
        /// Indicates whether this is the default user group assigned to newly registered or invited members.
        /// </summary>
        public bool IsDefault { get; set; } = false;

        /// <summary>
        /// Indicates whether this is a protected system group that cannot be deleted.
        /// </summary>
        public bool IsSystem { get; set; } = false;

        /// <summary>
        /// Visual color badge code (hex) for group tags in member tables.
        /// </summary>
        [MaxLength(20)]
        public string ColorBadge { get; set; } = "#0050E5";

        /// <summary>
        /// Visual Material Symbol icon identifier.
        /// </summary>
        [MaxLength(50)]
        public string Icon { get; set; } = "group";

        /// <summary>
        /// Timestamp in UTC when the user group was created.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp in UTC when the user group was last modified.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }

        /// <summary>
        /// Collection of capability permissions bundled within this user group blueprint.
        /// </summary>
        public ICollection<BcpUserGroupPermission> Permissions { get; set; } = new List<BcpUserGroupPermission>();

        /// <summary>
        /// Members currently assigned to this user group.
        /// </summary>
        public ICollection<Profile> Members { get; set; } = new List<Profile>();
    }
}
