using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a staff member's availability status for a specific date or recurring day.
    /// Supports tri-state availability: "Available", "Unavailable", and "PartlyUnavailable" with time intervals.
    /// Table: [dbo].[BcpShiftAvailabilities]
    /// </summary>
    public class BcpShiftAvailability : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the availability entry.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this availability entry to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// User identifier of the staff member.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Target calendar date for this availability record (UTC).
        /// </summary>
        public DateTime TargetDate { get; set; }

        /// <summary>
        /// Tri-state availability status: "Available", "Unavailable", or "PartlyUnavailable".
        /// </summary>
        [Required]
        [StringLength(50)]
        public string State { get; set; } = "Available";

        /// <summary>
        /// Starting time of the unavailable window if State is "PartlyUnavailable".
        /// </summary>
        public TimeSpan? UnavailableFromTime { get; set; }

        /// <summary>
        /// Ending time of the unavailable window if State is "PartlyUnavailable".
        /// </summary>
        public TimeSpan? UnavailableToTime { get; set; }

        /// <summary>
        /// Optional reason provided by staff when marking dates as unavailable or partly unavailable.
        /// </summary>
        [StringLength(500)]
        public string? Reason { get; set; }

        /// <summary>
        /// Timestamp when the availability entry was logged in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the availability entry was last updated in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
    }
}

