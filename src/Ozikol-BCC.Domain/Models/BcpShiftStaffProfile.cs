using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents the extended operational workforce profile for a staff member, guard, or healthcare worker.
    /// Captures job roles, contracted hours, billing baselines, aggregate star ratings, and punctuality scores.
    /// Table: [dbo].[BcpShiftStaffProfiles]
    /// </summary>
    public class BcpShiftStaffProfile : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the staff workforce profile.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this profile to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// User identifier referencing the central <c>ApplicationUser</c> in the tenant identity pool.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Designated workforce job title or specialization (e.g., "SIA Door Supervisor", "Care Assistant", "Event Steward").
        /// </summary>
        [Required]
        [StringLength(150)]
        public string JobTitle { get; set; } = "Staff Member";

        /// <summary>
        /// Default hourly wage rate for standard duty hours.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? DefaultHourlyRate { get; set; }

        /// <summary>
        /// Agreed contracted weekly duty hours (e.g., 40.0, 37.5).
        /// </summary>
        [Column(TypeName = "decimal(6,2)")]
        public decimal? ContractedWeeklyHours { get; set; }

        /// <summary>
        /// Cumulative average performance rating calculated from supervisor post-shift reviews (scale 1.0 to 5.0).
        /// </summary>
        [Column(TypeName = "decimal(3,2)")]
        public decimal AverageRating { get; set; } = 5.0m;

        /// <summary>
        /// Total number of post-shift ratings submitted for this staff member.
        /// </summary>
        public int TotalRatingsCount { get; set; } = 0;

        /// <summary>
        /// Total number of scheduled shifts successfully completed by this worker.
        /// </summary>
        public int TotalShiftsCompleted { get; set; } = 0;

        /// <summary>
        /// Historical punctuality score percentage (shifts clocked in within grace period / total shifts).
        /// </summary>
        [Column(TypeName = "decimal(5,2)")]
        public decimal PunctualityScorePercent { get; set; } = 100.0m;

        /// <summary>
        /// Total count of unexcused absences or no-shows recorded.
        /// </summary>
        public int NoShowCount { get; set; } = 0;

        /// <summary>
        /// Indicates whether this worker is active and eligible for shift scheduling and open shift bidding.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Timestamp when the staff member was enrolled into the workforce rota system in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the profile was last modified in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
    }
}

