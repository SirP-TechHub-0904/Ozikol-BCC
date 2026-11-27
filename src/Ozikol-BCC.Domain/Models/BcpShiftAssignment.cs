using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents an individual staff member assignment to a planned shift.
    /// Supports multi-officer shifts (e.g. venues, stadiums, event security, care homes) where multiple staff
    /// are assigned to or claim slots on the same planned <see cref="BcpShift"/>.
    /// Table: [dbo].[BcpShiftAssignments]
    /// </summary>
    public class BcpShiftAssignment : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for this shift assignment record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this assignment to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// Foreign key referencing the parent <see cref="BcpShift"/>.
        /// </summary>
        [Required]
        public Guid ShiftId { get; set; }

        /// <summary>
        /// Navigation property to the parent shift.
        /// </summary>
        [ForeignKey(nameof(ShiftId))]
        public BcpShift? Shift { get; set; }

        /// <summary>
        /// User account identifier of the assigned officer.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Optional foreign key to the staff profile record.
        /// </summary>
        public Guid? StaffProfileId { get; set; }

        /// <summary>
        /// Navigation property to the assigned staff member's workforce profile.
        /// </summary>
        [ForeignKey(nameof(StaffProfileId))]
        public BcpShiftStaffProfile? StaffProfile { get; set; }

        /// <summary>
        /// Full name of the assigned staff member snapshot at assignment time for fast grid rendering.
        /// </summary>
        [StringLength(200)]
        public string? StaffFullName { get; set; }

        /// <summary>
        /// Specific deployed station or operational position on this shift (e.g. "Gate A Turnstile", "VIP Hospitality", "CCTV Control").
        /// </summary>
        [StringLength(150)]
        public string? DutyPosition { get; set; }

        /// <summary>
        /// Operational rank / role on this shift (e.g. "Team Lead", "Senior Officer", "Duty Officer", "First Aider").
        /// </summary>
        [StringLength(100)]
        public string? DutyRole { get; set; }

        /// <summary>
        /// Indicates whether this officer is the designated Team Lead / Supervisor for this shift execution.
        /// </summary>
        public bool IsLeadOfficer { get; set; } = false;

        /// <summary>
        /// Optional custom hourly pay rate for this specific assigned officer (e.g. higher rate for supervisor or emergency bonus).
        /// If null, the system automatically uses the staff member's contracted profile rate or the shift's base HourlyPayRate.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? HourlyPayRateOverride { get; set; }

        /// <summary>
        /// Shift lifecycle assignment status: "Scheduled", "Confirmed", "InProgress", "Completed", "Cancelled", "Absent".
        /// </summary>
        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "Scheduled";

        /// <summary>
        /// Indicates whether this officer actively reviewed and confirmed acceptance of the shift.
        /// </summary>
        public bool IsConfirmedByGuard { get; set; }

        /// <summary>
        /// Timestamp in UTC when the guard confirmed acceptance.
        /// </summary>
        public DateTime? ConfirmedAtUtc { get; set; }

        /// <summary>
        /// Timestamp in UTC when this assignment was created.
        /// </summary>
        public DateTime AssignedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp in UTC when this assignment was created. Required by <see cref="IBcpWorkforceEntity"/>.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp in UTC when this assignment was last modified. Required by <see cref="IBcpWorkforceEntity"/>.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }

        /// <summary>
        /// User identifier of the administrator who assigned this staff member, or "self-claimed".
        /// </summary>
        [StringLength(100)]
        public string? AssignedByUserId { get; set; }

        /// <summary>
        /// When true, this assignment was initiated via open-shift claiming.
        /// </summary>
        public bool IsClaimed { get; set; }

        /// <summary>
        /// Indicates whether supervisor approval has been granted for claimed slots if approval was required.
        /// </summary>
        public bool ClaimApproved { get; set; } = true;

        /// <summary>
        /// Optional operational notes specific to this individual's assignment.
        /// </summary>
        [StringLength(500)]
        public string? Notes { get; set; }
    }
}
