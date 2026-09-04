using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Central library of curated stock demo images, vectors, and fallback assets for template authoring.
    /// </summary>
    [Table("MasterMediaAssets")]
    public class MasterMediaAsset
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(100)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string CategoryKey { get; set; } = "hero"; // hero, team, corporate, ecommerce, automotive, community

        [Required]
        [MaxLength(500)]
        public string ImageUrl { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? ThumbnailUrl { get; set; }

        [MaxLength(30)]
        public string AspectRatio { get; set; } = "16:9"; // 16:9, 1:1, 4:3, 3:2, 21:9

        [MaxLength(200)]
        public string? Tags { get; set; } // e.g. "office, technology, meeting, modern"

        public int WidthPx { get; set; } = 1920;
        public int HeightPx { get; set; } = 1080;

        public bool IsActive { get; set; } = true;
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    }
}
