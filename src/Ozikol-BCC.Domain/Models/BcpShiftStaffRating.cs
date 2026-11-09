using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a supervisor or manager post-shift review and rating for a staff member.
    /// Captures performance stars (1-5), punctuality scoring (1-5), and qualitative feedback notes.
    /// Table: [dbo].[BcpShiftStaffRatings]
    /// </summary>
    public class BcpShiftStaffRating : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the staff rating entry.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this rating to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// Foreign key referencing the specific <see cref="BcpShift"/> during which performance was evaluated.
        /// </summary>
        [Required]
        public Guid ShiftId { get; set; }

        /// <summary>
        /// Navigation property to the evaluated shift.
        /// </summary>
        [ForeignKey(nameof(ShiftId))]
        public BcpShift? Shift { get; set; }

        /// <summary>
        /// User identifier of the staff member being rated.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// User identifier of the supervisor or manager who submitted the review.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string RatedByUserId { get; set; } = string.Empty;

        /// <summary>
        /// Full name of the supervisor at review submission time.
        /// </summary>
        [StringLength(200)]
        public string? RatedByUserName { get; set; }

        /// <summary>
        /// Overall performance rating score on a 1 to 5 integer scale.
        /// </summary>
        [Range(1, 5)]
        public int RatingStars { get; set; } = 5;

        /// <summary>
        /// Punctuality rating on a 1 to 5 scale (5 = arrived early/on-time, 1 = severely late).
        /// </summary>
        [Range(1, 5)]
        public int PunctualityScore { get; set; } = 5;

        /// <summary>
        /// Qualitative supervisory feedback notes and observations.
        /// </summary>
        [StringLength(1000)]
        public string? FeedbackNotes { get; set; }

        /// <summary>
        /// Timestamp when the rating review was submitted in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the rating review was last modified in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
    }
}

