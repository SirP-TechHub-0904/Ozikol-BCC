using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// The canonical Single Source of Truth for a planned workforce shift across the organization.
    /// Captures planned duty hours, cross-midnight overnight schedules, post assignment,
    /// break deductions, and links to designated workspace hardware and attendance records.
    /// Table: [dbo].[BcpShifts]
    /// </summary>
    public class BcpShift : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the scheduled shift.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this shift to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// Human-readable shift reference code (e.g., "SHF-202611-0042").
        /// </summary>
        [Required]
        [StringLength(50)]
        public string ShiftCode { get; set; } = string.Empty;

        /// <summary>
        /// Foreign key linking this shift to its operating <see cref="BcpClientSite"/>.
        /// </summary>
        [Required]
        public Guid ClientSiteId { get; set; }

        /// <summary>
        /// Navigation property to the client operating site.
        /// </summary>
        [ForeignKey(nameof(ClientSiteId))]
        public BcpClientSite? ClientSite { get; set; }

        /// <summary>
        /// User identifier of the guard or staff member assigned to this shift. Null indicates an Open/Unassigned shift.
        /// </summary>
        [StringLength(100)]
        public string? AssignedUserId { get; set; }

        /// <summary>
        /// Full name of the assigned staff member snapshot at scheduling time for quick visual grids.
        /// </summary>
        [StringLength(200)]
        public string? AssignedUserName { get; set; }

        /// <summary>
        /// Specific post or duty assignment within the site (e.g., "Main Gatehouse", "Reception Desk", "Patrol Alpha").
        /// </summary>
        [Required]
        [StringLength(150)]
        public string PostName { get; set; } = "General Post";

        /// <summary>
        /// Shift start date and time in UTC.
        /// </summary>
        public DateTime StartsAtUtc { get; set; }

        /// <summary>
        /// Shift end date and time in UTC. Supports cross-midnight 24/7 overnight operations seamlessly.
        /// </summary>
        public DateTime EndsAtUtc { get; set; }

        /// <summary>
        /// Flag indicating whether the shift crosses midnight (EndsAtUtc is on a later calendar day than StartsAtUtc).
        /// </summary>
        public bool IsOvernight { get; set; }

        /// <summary>
        /// Unpaid break allowance in minutes deducted from total scheduled shift time (e.g., 30 or 60 mins).
        /// </summary>
        public int BreakMinutes { get; set; } = 0;

        /// <summary>
        /// Net planned working duration in decimal hours (e.g., 8.0, 11.5) calculated as (EndsAtUtc - StartsAtUtc) minus BreakMinutes.
        /// </summary>
        [Column(TypeName = "decimal(6,2)")]
        public decimal PlannedDurationHours { get; set; }

        /// <summary>
        /// Optional hardware station/laptop ID from <c>bcp-workspace</c> required for this shift.
        /// Used by the workstation gatekeeper to unlock the physical device when the officer clocks in.
        /// </summary>
        public Guid? RequiredWorkspaceStationId { get; set; }

        /// <summary>
        /// Descriptive hardware identifier (e.g., "Gatehouse Laptop #2", "Control Desk PC").
        /// </summary>
        [StringLength(150)]
        public string? RequiredWorkspaceStationName { get; set; }

        /// <summary>
        /// Optional internal hourly pay rate for payroll calculations.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? HourlyPayRate { get; set; }

        /// <summary>
        /// Optional client billable charge rate for invoice calculations.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? HourlyChargeRate { get; set; }

        /// <summary>
        /// Shift lifecycle status: Scheduled, Confirmed, InProgress, Completed, Cancelled, Absent.
        /// </summary>
        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "Scheduled";

        /// <summary>
        /// Indicates whether the assigned guard has actively reviewed and confirmed acceptance of this shift.
        /// </summary>
        public bool IsConfirmedByGuard { get; set; }

        /// <summary>
        /// Timestamp in UTC when the guard confirmed acceptance of the shift.
        /// </summary>
        public DateTime? ConfirmedAtUtc { get; set; }

        /// <summary>
        /// Optional deadline in UTC for the assigned worker to confirm acceptance of the shift.
        /// If not accepted prior to this timestamp, the shift automatically unassigns and returns to Open Shifts.
        /// </summary>
        public DateTime? AcceptanceDeadlineUtc { get; set; }

        /// <summary>
        /// Optional operational tag categorizing the shift (e.g., "Event", "Care Home", "Healthcare", "Corporate", "Retail").
        /// </summary>
        [StringLength(50)]
        public string? EventTag { get; set; }

        /// <summary>
        /// Name of the specific client facility or venue (e.g., "Oakleigh Park Care Home", "Wembley Stadium", "Bradford College").
        /// </summary>
        [StringLength(150)]
        public string? FacilityName { get; set; }

        /// <summary>
        /// Street address or physical location instructions for the assigned post.
        /// </summary>
        [StringLength(250)]
        public string? Address { get; set; }

        /// <summary>
        /// Postal code of the duty location (e.g., "N20 9NH", "HA9 0WS").
        /// </summary>
        [StringLength(20)]
        public string? PostCode { get; set; }

        /// <summary>
        /// Operational notes or shift briefing remarks provided by the rota supervisor.
        /// </summary>
        public string? Notes { get; set; }

        /// <summary>
        /// Timestamp in UTC when the guard or duty officer submitted their post completion report.
        /// </summary>
        public DateTime? ReportSubmissionUtc { get; set; }

        /// <summary>
        /// Handover notes, occurrence book entries, security observations, and post incident report.
        /// </summary>
        public string? ReportContent { get; set; }

        /// <summary>
        /// Indicates whether an administrative penalty or fine was attached to this shift execution.
        /// </summary>
        public bool FineAttached { get; set; } = false;

        /// <summary>
        /// Monetary penalty amount in local currency (e.g., ₦) deducted for operational non-compliance.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? FineAmount { get; set; }

        /// <summary>
        /// Specific reason for fine deduction (e.g. Late check-in > 30m, Uniform violation, Abandoned post).
        /// </summary>
        [StringLength(250)]
        public string? FineReason { get; set; }

        /// <summary>
        /// User identifier or name of the supervisor who authorized the fine deduction.
        /// </summary>
        [StringLength(100)]
        public string? FineAuthorizedBy { get; set; }

        /// <summary>
        /// Administrative status of the penalty deduction: "Pending", "Applied", "Waived".
        /// </summary>
        [StringLength(50)]
        public string? FineStatus { get; set; }

        /// <summary>
        /// User identifier of the administrator or supervisor who created this shift.
        /// </summary>
        [StringLength(100)]
        public string? CreatedByUserId { get; set; }

        /// <summary>
        /// Timestamp when the shift was created in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the shift was last modified in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
        [Column(TypeName = "nvarchar(max)")]
        /// <summary>
        /// Serialized JSON representation of the full user account information at the time of shift creation.
        /// Stored as a string to allow flexible schema evolution without requiring a separate relational model.
        /// </summary>
        public string? UserAccountJson { get; set; }

        /// <summary>
        /// Navigation property to the 1-to-1 attendance execution record for this shift.
        /// </summary>
        public BcpShiftAttendance? AttendanceRecord { get; set; }

        /// <summary>
        /// Navigation collection of swap or trade requests initiated for this shift.
        /// </summary>
        public ICollection<BcpShiftSwapRequest> SwapRequests { get; set; } = new List<BcpShiftSwapRequest>();
    }
}

