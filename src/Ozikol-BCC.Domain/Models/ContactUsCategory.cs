using System;
using System.Collections.Generic;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a department or inquiry category for the Contact Us form (e.g., 'Support', 'Sales', 'Careers').
    /// </summary>
    public class ContactUsCategory
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Category Name.
        /// </summary>
        public string? Title { get; set; }

        /// <summary>
        /// Optional: Auto-forward inquiries in this category to a specific department email.
        /// </summary>
        public string? ForwardEmail { get; set; }

        /// <summary>
        /// Toggle visibility in the frontend dropdown.
        /// </summary>
        public bool Publish { get; set; }

        /// <summary>
        /// Navigation property for all inquiries submitted under this category.
        /// </summary>
        public ICollection<ContactUs>? ContactUsInquiries { get; set; }
    }
}


