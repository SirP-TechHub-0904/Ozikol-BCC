using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Official company news article, press release, or architecture update entity.
/// Stored in the Master Catalog database.
/// </summary>
[Table("MasterNewsArticles")]
public class MasterNewsArticle
{
    /// <summary>
    /// Gets or sets the primary key identifier.
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Gets or sets the unique URL permalink slug.
    /// </summary>
    [Required]
    [MaxLength(150)]
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the article title.
    /// </summary>
    [Required]
    [MaxLength(250)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the category programmatic key.
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string CategoryKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the foreign key to the category.
    /// </summary>
    [ForeignKey(nameof(Category))]
    public Guid MasterNewsCategoryId { get; set; }

    /// <summary>
    /// Navigation property to the parent news category.
    /// </summary>
    public MasterNewsCategory Category { get; set; } = null!;

    /// <summary>
    /// Gets or sets the article summary or card lead text.
    /// </summary>
    [MaxLength(1000)]
    public string Excerpt { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the full rich HTML body content.
    /// </summary>
    [Column(TypeName = "nvarchar(max)")]
    public string ContentHtml { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the author full name.
    /// </summary>
    [MaxLength(100)]
    public string AuthorName { get; set; } = "Ozikol Editorial";

    /// <summary>
    /// Gets or sets the author professional title or group.
    /// </summary>
    [MaxLength(100)]
    public string AuthorRole { get; set; } = "Platform Architecture";

    /// <summary>
    /// Gets or sets the publication timestamp in UTC.
    /// </summary>
    public DateTime PublishedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the estimated read time text (e.g. 5 min read).
    /// </summary>
    [MaxLength(30)]
    public string ReadTimeText { get; set; } = "4 min read";

    /// <summary>
    /// Gets or sets a value indicating whether this article is highlighted as the featured headline.
    /// </summary>
    public bool IsFeatured { get; set; }

    /// <summary>
    /// Gets or sets serialized JSON array of topic tags.
    /// </summary>
    [MaxLength(500)]
    public string TagsJson { get; set; } = "[]";

    /// <summary>
    /// Gets or sets the cover gradient style class.
    /// </summary>
    [MaxLength(50)]
    public string CoverGradientClass { get; set; } = "oz-news-cover-indigo";

    /// <summary>
    /// Gets or sets a value indicating whether the article is published.
    /// </summary>
    public bool IsPublished { get; set; } = true;

    /// <summary>
    /// Gets or sets the record creation timestamp in UTC.
    /// </summary>
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
