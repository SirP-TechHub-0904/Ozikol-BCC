using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpProductOrderItem
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpProductOrderId { get; set; }
        public BcpProductOrder? Order { get; set; }

        public Guid BcpProductId { get; set; }
        public BcpProduct? Product { get; set; }

        [Required]
        [StringLength(250)]
        public string ProductTitle { get; set; } = string.Empty;

        public ProductType ProductType { get; set; } = ProductType.Physical;

        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; } = 1;
        public decimal TotalPrice { get; set; }

        // Digital Deliveries & Licenses
        public string? GeneratedLicenseKey { get; set; }
        public string? DownloadAccessToken { get; set; }
        public int DownloadCount { get; set; } = 0;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
