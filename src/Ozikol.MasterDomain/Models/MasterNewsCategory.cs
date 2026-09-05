using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Editorial category entity for central company news, releases, and advisories.
/// Stored in the Master Catalog database.
/// </summary>
[Table("MasterNewsCategories")]
public class MasterNewsCategory
{
    /// <summary>
    /// Gets or sets the primary key identifier.
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Gets or sets the programmatic unique key identifier (e.g. product-releases, engineering-security).
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Key { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the display name.
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the URL permalink slug.
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a brief summary of the category.
    /// </summary>
    [MaxLength(300)]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the badge styling class.
    /// </summary>
    [MaxLength(50)]
    public string BadgeClass { get; set; } = "oz-badge-blue";

    /// <summary>
    /// Gets or sets the display sort order.
    /// </summary>
    public int SortOrder { get; set; } = 1;

    /// <summary>
    /// Gets or sets a value indicating whether this category is active.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Navigation property for all published articles in this category.
    /// </summary>
    public ICollection<MasterNewsArticle> Articles { get; set; } = new List<MasterNewsArticle>();
}
