using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpProductCategory
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [StringLength(250)]
        public string? Slug { get; set; }


        [StringLength(1000)]
        public string? Description { get; set; }

        [StringLength(100)]
        public string? Icon { get; set; } = "category";

        public string? BannerUrl { get; set; }
        public string? BannerKey { get; set; }

        public Guid? ParentId { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.ForeignKey("ParentId")]
        public BcpProductCategory? ParentCategory { get; set; }


        public int SortOrder { get; set; } = 0;
        public bool Publish { get; set; } = true;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAtUtc { get; set; }

        public ICollection<BcpProduct> Products { get; set; } = new List<BcpProduct>();
        public ICollection<BcpProductCategory> SubCategories { get; set; } = new List<BcpProductCategory>();
    }
}
