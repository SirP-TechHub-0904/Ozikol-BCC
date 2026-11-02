using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a dynamic communication touchpoint, contact method, or social media channel for a tenant organization.
    /// Stores social media handles, telephone numbers, public email addresses, physical office addresses, and WhatsApp lines.
    /// Supports status toggles (IsPublished), primary/default resolution (IsDefault), and ordering for template loop hydration.
    /// Injected into website layouts, header navigation bars, top utility bars, footers, and contact cards.
    /// </summary>
    [Table("MisWebsiteContactChannels")]
    public class MisWebsiteContactChannel
    {
        /// <summary>
        /// Unique primary key identifier for the contact channel.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Channel category type.
        /// Standard values: "SocialMedia", "Phone", "Email", "Address", "WhatsApp".
        /// </summary>
        [Required]
        [MaxLength(50)]
        [Display(Name = "Channel Type")]
        public string ChannelType { get; set; } = "SocialMedia";

        /// <summary>
        /// Specific platform or subtype identifier (e.g., "Twitter", "LinkedIn", "Facebook", "Instagram", "YouTube", "GitHub", "TikTok", "Mobile", "Office", "Support", "Sales").
        /// </summary>
        [MaxLength(100)]
        [Display(Name = "Platform or Subtype")]
        public string? Platform { get; set; }

        /// <summary>
        /// Public display title or friendly label (e.g., "Customer Care", "Follow Us on X", "Headquarters", "Billing Inquiries").
        /// Injected into templates via {{ Title }}.
        /// </summary>
        [Required]
        [MaxLength(200)]
        [Display(Name = "Title")]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Detailed description, subtitle, or operational hours (e.g., "Mon-Fri: 9am - 5pm", "Direct corporate hotline").
        /// Injected into templates via {{ Description }}.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Description")]
        public string? Description { get; set; }

        /// <summary>
        /// The channel value, target URL, phone digits, or physical address text.
        /// (e.g., "https://x.com/ozikol", "+1 (800) 555-0199", "info@ozikol.cloud", "100 Innovation Way, Suite 400").
        /// Injected into templates via {{ Value }}, {{ Url }}, {{ Content }}, or {{ Address }}.
        /// </summary>
        [Required]
        [MaxLength(1000)]
        [Display(Name = "Value or URL")]
        public string Value { get; set; } = string.Empty;

        /// <summary>
        /// Explicit CSS icon class or icon identifier (e.g., "fa-brands fa-x-twitter", "fa-solid fa-phone", "fa-solid fa-envelope", "fa-solid fa-location-dot").
        /// Injected into templates via {{ IconClass }} and {{ Icon }}.
        /// </summary>
        [MaxLength(150)]
        [Display(Name = "Icon Class")]
        public string? IconClass { get; set; }

        /// <summary>
        /// Whether this record is the default/primary channel of its type.
        /// When true, it resolves single scalar tokens like {{ Phone }}, {{ Email }}, and {{ Address }}.
        /// </summary>
        [Display(Name = "Is Default")]
        public bool IsDefault { get; set; } = false;

        /// <summary>
        /// Published status: true = Live on public site &amp; templates; false = Draft / Disabled.
        /// Inactive items are excluded from public loops and live page rendering.
        /// </summary>
        [Display(Name = "Is Published")]
        public bool IsPublished { get; set; } = true;

        /// <summary>
        /// Display sort order within loops (ascending).
        /// </summary>
        [Display(Name = "Sort Order")]
        public int SortOrder { get; set; } = 0;

        /// <summary>
        /// Timestamp when this contact channel was created in UTC.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when this contact channel was last updated in UTC.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// Well-known channel type constants for <see cref="MisWebsiteContactChannel.ChannelType"/>.
    /// </summary>
    public static class ContactChannelTypes
    {
        /// <summary>
        /// Social media network profile or external channel.
        /// </summary>
        public const string SocialMedia = "SocialMedia";

        /// <summary>
        /// Voice telephone, support hotline, or mobile number.
        /// </summary>
        public const string Phone = "Phone";

        /// <summary>
        /// Electronic mail address or ticketing inbox.
        /// </summary>
        public const string Email = "Email";

        /// <summary>
        /// Physical street address, headquarters, branch, or GPS location.
        /// </summary>
        public const string Address = "Address";

        /// <summary>
        /// WhatsApp messaging or business chat endpoint.
        /// </summary>
        public const string WhatsApp = "WhatsApp";
    }
}
