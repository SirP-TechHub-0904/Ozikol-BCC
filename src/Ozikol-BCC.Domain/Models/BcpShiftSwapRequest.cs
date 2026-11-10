using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a peer-to-peer shift swap request, shift handover, or open-shift claim.
    /// Handles guard requests to trade shifts or claim open rosters with multi-step supervisor approval.
    /// Table: [dbo].[BcpShiftSwapRequests]
    /// </summary>
    public class BcpShiftSwapRequest : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the swap request.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this swap request to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// Foreign key referencing the <see cref="BcpShift"/> being offered or swapped.
        /// </summary>
        [Required]
        public Guid ShiftId { get; set; }

        /// <summary>
        /// Navigation property to the scheduled shift.
        /// </summary>
        [ForeignKey(nameof(ShiftId))]
        public BcpShift? Shift { get; set; }

        /// <summary>
        /// User identifier of the guard requesting the swap or offering the shift.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string RequestingUserId { get; set; } = string.Empty;

        /// <summary>
        /// Full name of the requesting guard for audit records.
        /// </summary>
        [StringLength(200)]
        public string RequestingUserName { get; set; } = string.Empty;

        /// <summary>
        /// Specific guard this shift is offered to. If null, the shift is broadcast to all qualified staff on the open market.
        /// </summary>
        [StringLength(100)]
        public string? OfferedToUserId { get; set; }

        /// <summary>
        /// Name of the specific guard this shift is offered to.
        /// </summary>
        [StringLength(200)]
        public string? OfferedToUserName { get; set; }

        /// <summary>
        /// Optional target shift ID being traded in exchange (for 1-to-1 shift swaps).
        /// </summary>
        public Guid? TargetShiftId { get; set; }

        /// <summary>
        /// Reason provided by the officer for requesting the swap or cover.
        /// </summary>
        [StringLength(300)]
        public string? Reason { get; set; }

        /// <summary>
        /// Swap lifecycle status: PendingPeer, PendingSupervisor, Approved, Rejected, Cancelled.
        /// </summary>
        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "PendingSupervisor";

        /// <summary>
        /// Supervisor user ID who signed off on the swap or claim.
        /// </summary>
        [StringLength(100)]
        public string? SupervisorApprovedBy { get; set; }

        /// <summary>
        /// Timestamp in UTC when the supervisor approved or rejected the request.
        /// </summary>
        public DateTime? SupervisorApprovedAtUtc { get; set; }

        /// <summary>
        /// Reason given if the swap or claim was rejected by supervisor or conflict checker.
        /// </summary>
        [StringLength(300)]
        public string? SupervisorRejectionReason { get; set; }

        /// <summary>
        /// Timestamp when the swap request was submitted in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the swap request was last modified in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
    }
}

