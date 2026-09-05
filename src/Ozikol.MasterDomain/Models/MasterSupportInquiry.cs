using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents an enterprise support inquiry or helpdesk ticket submitted through the central portal.
    /// </summary>
    [Table("MasterSupportInquiries")]
    public class MasterSupportInquiry
    {
        /// <summary>
        /// Gets or sets the unique primary key identifier.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Gets or sets the human-readable tracking reference code (e.g. OZK-SUP-20260905-ABCD).
        /// </summary>
        [Required]
        [MaxLength(40)]
        public string ReferenceNumber { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the full name of the inquirer.
        /// </summary>
        [Required]
        [MaxLength(120)]
        public string FullName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the work or organization contact email address.
        /// </summary>
        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the optional international contact telephone number.
        /// </summary>
        [MaxLength(40)]
        public string? Phone { get; set; }

        /// <summary>
        /// Gets or sets the company, estate, or institutional organization name.
        /// </summary>
        [Required]
        [MaxLength(150)]
        public string Organization { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the professional job title or administrative role.
        /// </summary>
        [MaxLength(100)]
        public string? JobTitle { get; set; }

        /// <summary>
        /// Gets or sets the inquiry classification category (e.g., Sales, Support, Partnership, Billing, General).
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string InquiryType { get; set; } = "Support";

        /// <summary>
        /// Gets or sets the optional targeted suite identifier code (e.g. suite-workforce, suite-people).
        /// </summary>
        [MaxLength(80)]
        public string? SuiteCode { get; set; }

        /// <summary>
        /// Gets or sets the optional targeted feature permalink code (e.g. staff-rota, community-messenger).
        /// </summary>
        [MaxLength(80)]
        public string? FeatureCode { get; set; }

        /// <summary>
        /// Gets or sets the inquiry summary or message subject.
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string Subject { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the detailed inquiry text, issue description, or question.
        /// </summary>
        [Required]
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the 2-letter ISO culture code of the submission locale (e.g. en, fr, es, de).
        /// </summary>
        [Required]
        [MaxLength(10)]
        public string Culture { get; set; } = "en";

        /// <summary>
        /// Gets or sets the operational lifecycle status of the ticket (e.g. New, InProgress, Resolved, Closed).
        /// </summary>
        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = "New";

        /// <summary>
        /// Gets or sets the client IP address recorded at the time of submission for security auditing.
        /// </summary>
        [MaxLength(50)]
        public string? IpAddress { get; set; }

        /// <summary>
        /// Gets or sets the timestamp when this inquiry was submitted in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the timestamp of the most recent activity on this ticket (creation or latest reply) in UTC.
        /// Used for calculating the 24-hour inactivity threshold.
        /// </summary>
        public DateTime LastActivityUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the timestamp when this ticket was marked resolved or closed in UTC.
        /// </summary>
        public DateTime? ClosedAtUtc { get; set; }

        /// <summary>
        /// Gets or sets the audit reason if this ticket was closed automatically or by a user/staff member.
        /// </summary>
        [MaxLength(250)]
        public string? AutoClosedReason { get; set; }

        /// <summary>
        /// Gets or sets the collection of conversation thread replies associated with this inquiry.
        /// </summary>
        public virtual System.Collections.Generic.ICollection<MasterTicketReply> Replies { get; set; } = new System.Collections.Generic.List<MasterTicketReply>();
    }
}
