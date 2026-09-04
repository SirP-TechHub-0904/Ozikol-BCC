using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Pure content model for Blogs and Editorial News templates.
    /// </summary>
    [Table("MasterBlogContents")]
    public class MasterBlogContent
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("MasterMarketplaceTemplate")]
        public Guid MasterMarketplaceTemplateId { get; set; }
        public MasterMarketplaceTemplate MasterMarketplaceTemplate { get; set; } = null!;

        [MaxLength(100)]
        public string? MiniTitle { get; set; }

        [Required]
        [MaxLength(250)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? SubTitle { get; set; }

        [MaxLength(100)]
        public string? ViewAllButtonText { get; set; }

        [MaxLength(500)]
        public string? ViewAllButtonUrl { get; set; }

        public ICollection<MasterBlogPostItem> Posts { get; set; } = new List<MasterBlogPostItem>();
    }

    /// <summary>
    /// Child mock article item for Blogs and News layouts.
    /// </summary>
    [Table("MasterBlogPostItems")]
    public class MasterBlogPostItem
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("BlogContent")]
        public Guid MasterBlogContentId { get; set; }
        public MasterBlogContent BlogContent { get; set; } = null!;

        [Required]
        [MaxLength(250)]
        public string Title { get; set; } = string.Empty;

        public string? Excerpt { get; set; }

        [MaxLength(500)]
        public string? ThumbnailUrl { get; set; }

        [MaxLength(50)]
        public string? CategoryTag { get; set; } // "Security", "Economics", "Engineering"

        [MaxLength(100)]
        public string? AuthorName { get; set; }

        [MaxLength(500)]
        public string? AuthorAvatarUrl { get; set; }

        [MaxLength(50)]
        public string? PublishDateText { get; set; } // "August 20, 2026"

        [MaxLength(30)]
        public string? ReadTimeText { get; set; } // "5 min read"

        [MaxLength(500)]
        public string? ArticleUrl { get; set; }

        public int SortOrder { get; set; } = 1;
    }
}
