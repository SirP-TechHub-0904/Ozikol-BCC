using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents an employee or volunteer leave and absence request (annual, sick, compassionate).
    /// Used by the Rota scheduling engine to black out unavailable staff and prevent scheduling conflicts.
    /// Table: [dbo].[BcpShiftLeaveRequests]
    /// </summary>
    public class BcpShiftLeaveRequest : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the leave request.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this leave request to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// User identifier of the guard or staff member requesting leave.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Full name of the staff member.
        /// </summary>
        [StringLength(200)]
        public string UserName { get; set; } = string.Empty;

        /// <summary>
        /// Leave category: "Annual", "Sick", "Compassionate", "Emergency", "Unpaid".
        /// </summary>
        [Required]
        [StringLength(50)]
        public string LeaveType { get; set; } = "Annual";

        /// <summary>
        /// Starting calendar date of the leave period (UTC).
        /// </summary>
        public DateTime StartDate { get; set; }

        /// <summary>
        /// Ending calendar date of the leave period (UTC).
        /// </summary>
        public DateTime EndDate { get; set; }

        /// <summary>
        /// Total days requested.
        /// </summary>
        [Column(TypeName = "decimal(5,1)")]
        public decimal TotalDays { get; set; } = 1.0m;

        /// <summary>
        /// Explanation or medical note reason for the leave request.
        /// </summary>
        [StringLength(500)]
        public string? Reason { get; set; }

        /// <summary>
        /// Optional URL to supporting evidence (doctor's note, medical certificate, proof document).
        /// </summary>
        [StringLength(500)]
        public string? AttachmentUrl { get; set; }

        /// <summary>
        /// Leave status: "Pending", "Approved", "Rejected", "Cancelled".
        /// </summary>
        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "Pending";

        /// <summary>
        /// User identifier of the manager or supervisor who reviewed the request.
        /// </summary>
        [StringLength(100)]
        public string? ReviewedBy { get; set; }

        /// <summary>
        /// Timestamp in UTC when the leave was approved or rejected.
        /// </summary>
        public DateTime? ReviewedAtUtc { get; set; }

        /// <summary>
        /// Explanation given if the leave was rejected.
        /// </summary>
        [StringLength(300)]
        public string? RejectionReason { get; set; }

        /// <summary>
        /// Timestamp when the request was submitted in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the leave request was last modified in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
    }
}

