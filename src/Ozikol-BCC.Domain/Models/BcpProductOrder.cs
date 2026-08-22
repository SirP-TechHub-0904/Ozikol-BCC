using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpProductOrder
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [StringLength(50)]
        public string OrderNumber { get; set; } = string.Empty;

        public string? CustomerUserId { get; set; }
        public Profile? CustomerUser { get; set; }

        [Required]
        [StringLength(200)]
        public string CustomerName { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        public string CustomerEmail { get; set; } = string.Empty;

        [StringLength(50)]
        public string? CustomerPhone { get; set; }

        // Shipping & Delivery Details
        public string? ShippingAddressLine1 { get; set; }
        public string? ShippingAddressLine2 { get; set; }
        public string? ShippingCity { get; set; }
        public string? ShippingState { get; set; }
        public string? ShippingCountry { get; set; }
        public string? ShippingPostalCode { get; set; }

        // Financials
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; } = 0;
        public decimal ShippingFee { get; set; } = 0;
        public decimal TaxAmount { get; set; } = 0;
        public decimal TotalAmount { get; set; }
        public string Currency { get; set; } = "USD";

        // Payment & Status
        public string? PaymentMethod { get; set; } = "Manual";
        public string? PaymentReference { get; set; }
        public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
        public ProductOrderStatus OrderStatus { get; set; } = ProductOrderStatus.Pending;

        // Fulfillment & Tracking
        public string? TrackingNumber { get; set; }
        public string? CourierName { get; set; }
        public string? AdminNotes { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? PaidAtUtc { get; set; }
        public DateTime? FulfilledAtUtc { get; set; }

        public ICollection<BcpProductOrderItem> Items { get; set; } = new List<BcpProductOrderItem>();
    }
}
