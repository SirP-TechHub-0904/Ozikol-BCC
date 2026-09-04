using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Pure content model for Global Footer templates.
    /// Stores brand mission, newsletter copy, social channel links, and column link matrix.
    /// </summary>
    [Table("MasterFooterContents")]
    public class MasterFooterContent
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("MasterMarketplaceTemplate")]
        public Guid MasterMarketplaceTemplateId { get; set; }
        public MasterMarketplaceTemplate MasterMarketplaceTemplate { get; set; } = null!;

        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        [MaxLength(300)]
        public string? BrandMissionText { get; set; }

        [MaxLength(250)]
        public string? CopyrightText { get; set; }

        [MaxLength(150)]
        public string? NewsletterTitle { get; set; }

        [MaxLength(150)]
        public string? NewsletterPlaceholder { get; set; }

        [MaxLength(100)]
        public string? NewsletterButtonText { get; set; }

        [MaxLength(500)]
        public string? TwitterUrl { get; set; }

        [MaxLength(500)]
        public string? LinkedInUrl { get; set; }

        [MaxLength(500)]
        public string? GitHubUrl { get; set; }

        [MaxLength(500)]
        public string? YouTubeUrl { get; set; }

        [MaxLength(500)]
        public string? FacebookUrl { get; set; }

        public ICollection<MasterFooterColumn> Columns { get; set; } = new List<MasterFooterColumn>();
    }

    /// <summary>
    /// Column grouping in a multi-column footer layout (e.g. "Products", "Company", "Legal").
    /// </summary>
    [Table("MasterFooterColumns")]
    public class MasterFooterColumn
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("FooterContent")]
        public Guid MasterFooterContentId { get; set; }
        public MasterFooterContent FooterContent { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string ColumnName { get; set; } = string.Empty;

        public int SortOrder { get; set; } = 1;

        public ICollection<MasterFooterLink> Links { get; set; } = new List<MasterFooterLink>();
    }

    /// <summary>
    /// Individual hyperlink within a footer column.
    /// </summary>
    [Table("MasterFooterLinks")]
    public class MasterFooterLink
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("FooterColumn")]
        public Guid MasterFooterColumnId { get; set; }
        public MasterFooterColumn FooterColumn { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string Title { get; set; } = string.Empty; // e.g. "Voting Engine"

        [Required]
        [MaxLength(500)]
        public string Url { get; set; } = string.Empty;

        public int SortOrder { get; set; } = 1;
    }
}
