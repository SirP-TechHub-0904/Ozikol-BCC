using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// The Unified 'Super Form' handling all external inquiries. 
    /// Conditionally acts as a mini-helpdesk based on BcpSetting toggles.
    /// </summary>
    public class ContactUs
    {
        public ContactUs()
        {
            Date = DateTime.UtcNow.AddHours(1);
        }

        /// <summary>
        /// Primary Key.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Optional: The department/category they selected (e.g., 'Sales', 'Support').
        /// </summary>
        public Guid? ContactUsCategoryId { get; set; }

        /// <summary>
        /// Navigation property to the selected department/category.
        /// </summary>
        public ContactUsCategory? ContactUsCategory { get; set; }

        /// <summary>
        /// Standard contact name.
        /// </summary>
        public string? Name { get; set; }

        /// <summary>
        /// Standard contact email address.
        /// </summary>
        public string? Mail { get; set; }

        /// <summary>
        /// Optional: Phone number (enabled via BcpSetting.WebContactEnablePhone).
        /// </summary>
        public string? Phone { get; set; }

        /// <summary>
        /// Optional: Company name (for corporate clients).
        /// </summary>
        [Display(Name = "Company Name")]
        public string? CompanyName { get; set; }

        /// <summary>
        /// The main message subject.
        /// </summary>
        public string? Subject { get; set; }

        /// <summary>
        /// The main message body.
        /// </summary>
        public string? Content { get; set; }

        /// <summary>
        /// Optional: Allows users to upload an attachment (enabled via BcpSetting.WebContactEnableFile).
        /// </summary>
        public string? FileUrl { get; set; }

        /// <summary>
        /// Cloudinary key for the uploaded attachment.
        /// </summary>
        public string? FileKey { get; set; }

        /// <summary>
        /// Acts as a Helpdesk ticket status (e.g., 0 = New, 1 = In Progress, 2 = Resolved).
        /// </summary>
        public int Status { get; set; }

        /// <summary>
        /// Internal admin notes on this ticket/inquiry.
        /// </summary>
        public string? Report { get; set; }

        /// <summary>
        /// Timestamp of submission.
        /// </summary>
        public DateTime Date { get; set; }

        /// <summary>
        /// Timestamp of last admin update/status change.
        /// </summary>
        [Display(Name = "Last Updated")]
        public DateTime LastUpdated { get; set; }
    }
}


