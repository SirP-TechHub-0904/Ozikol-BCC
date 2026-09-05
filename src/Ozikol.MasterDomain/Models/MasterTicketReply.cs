using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents an individual message or reply within a support ticket conversation thread.
    /// Supports both customer follow-ups and staff specialist responses.
    /// </summary>
    [Table("MasterTicketReplies")]
    public class MasterTicketReply
    {
        /// <summary>
        /// Gets or sets the unique primary key identifier for this reply.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Gets or sets the foreign key referencing the parent support inquiry / ticket.
        /// </summary>
        [Required]
        public Guid MasterSupportInquiryId { get; set; }

        /// <summary>
        /// Gets or sets the parent support inquiry navigation property.
        /// </summary>
        [ForeignKey(nameof(MasterSupportInquiryId))]
        public virtual MasterSupportInquiry? Inquiry { get; set; }

        /// <summary>
        /// Gets or sets the display name of the person posting this reply.
        /// </summary>
        [Required]
        [MaxLength(120)]
        public string SenderName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the email address of the person posting this reply.
        /// </summary>
        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string SenderEmail { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets a value indicating whether this message was posted by an authorized support specialist or platform staff.
        /// </summary>
        public bool IsStaffReply { get; set; } = false;

        /// <summary>
        /// Gets or sets the detailed text content of the reply message.
        /// </summary>
        [Required]
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the timestamp when this reply was posted in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    }
}
