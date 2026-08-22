using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpProduct
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [StringLength(250)]
        public string Title { get; set; } = string.Empty;

        [StringLength(300)]
        public string? Slug { get; set; }


        [StringLength(1000)]
        public string? ShortDescription { get; set; }

        public string? FullDescription { get; set; } // Rich Text WYSIWYG HTML

        public ProductType Type { get; set; } = ProductType.Physical;
        public ProductPublishStatus PublishStatus { get; set; } = ProductPublishStatus.Draft;

        // Pricing & Inventory
        public decimal Price { get; set; }
        public decimal? CompareAtPrice { get; set; } // Strikethrough price
        public string Currency { get; set; } = "USD";
        public string? Sku { get; set; }
        public string? Barcode { get; set; }

        // Media Gallery
        public string? CoverImageUrl { get; set; }
        public string? CoverImageKey { get; set; }
        public string? GalleryImagesJson { get; set; } // JSON array of image URLs
        public string? DemoVideoUrl { get; set; }

        // Scheduling & Automated Release
        public bool IsScheduled { get; set; }
        public DateTime? ScheduledReleaseUtc { get; set; }
        public DateTime? PublishedAtUtc { get; set; }

        // Archetype 1: Software / Digital Download
        public string? DownloadFileUrl { get; set; }
        public string? VersionTag { get; set; }
        public string? FileSize { get; set; }
        public bool RequiresLicenseKey { get; set; }
        public string? LicenseKeyPattern { get; set; }

        // Archetype 2: Professional Service & Consultation
        public int? DeliveryTimeframeDays { get; set; }
        public bool RequiresBookingSchedule { get; set; }
        public int? ConsultationDurationMinutes { get; set; }
        public string? DeliverablesSummary { get; set; }

        // Archetype 3: Physical Products & Logistics
        public bool TrackInventory { get; set; } = true;
        public int StockQuantity { get; set; } = 0;
        public int LowStockThreshold { get; set; } = 5;
        public decimal? WeightKg { get; set; }
        public bool RequiresShipping { get; set; } = true;

        // Archetype 4: Subscriptions & Recurring Access
        public SubscriptionBillingInterval? BillingInterval { get; set; }
        public int? TrialPeriodDays { get; set; }
        public bool AutoRenew { get; set; } = true;

        // Organization & Category Taxonomy
        public Guid? BcpProductCategoryId { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.ForeignKey("BcpProductCategoryId")]
        public BcpProductCategory? Category { get; set; }


        public string? Tags { get; set; }
        public bool IsFeatured { get; set; }
        public string? MetaTitle { get; set; }
        public string? MetaDescription { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAtUtc { get; set; }

        public ICollection<BcpProductOrderItem> OrderItems { get; set; } = new List<BcpProductOrderItem>();
    }
}
