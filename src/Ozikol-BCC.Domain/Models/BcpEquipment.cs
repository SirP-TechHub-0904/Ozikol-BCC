using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpEquipment
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [Display(Name = "Equipment Name / Make")]
        public string? Name { get; set; }

        [Display(Name = "Serial Number / VIN")]
        public string? SerialNumber { get; set; }

        [Display(Name = "Category")]
        public Guid BcpEquipmentCategoryId { get; set; }
        public BcpEquipmentCategory? BcpEquipmentCategory { get; set; }

        public string? ImageUrl { get; set; }
        public string? ImageKey { get; set; }

        // Financials
        [Display(Name = "Purchase Date")]
        public DateTime PurchaseDate { get; set; }

        [Display(Name = "Purchase Price (₦)")]
        public decimal PurchasePrice { get; set; }

        [Display(Name = "Salvage Value (₦)")]
        public decimal SalvageValue { get; set; }

        [Display(Name = "Lifespan (Months)")]
        public int LifespanMonths { get; set; }

        // Tracking
        [Display(Name = "Current Status")]
        public BcpEquipmentStatus CurrentStatus { get; set; }

        public string? AssignedToUserId { get; set; }
        public Profile? AssignedToUser { get; set; }

        [Display(Name = "Additional Specifications & Details")]
        public string? AdditionalDetails { get; set; }

        public ICollection<BcpMaintenanceLog>? BcpMaintenanceLogs { get; set; }

        // Helper Method for Depreciation
        public decimal CurrentValue()
        {
            if (LifespanMonths <= 0 || PurchasePrice <= SalvageValue)
                return SalvageValue > 0 ? SalvageValue : PurchasePrice;

            var monthsPassed = ((DateTime.UtcNow.Year - PurchaseDate.Year) * 12) + DateTime.UtcNow.Month - PurchaseDate.Month;
            if (monthsPassed < 0) monthsPassed = 0;
            if (monthsPassed >= LifespanMonths) return SalvageValue;

            var depreciableAmount = PurchasePrice - SalvageValue;
            var depreciationPerMonth = depreciableAmount / LifespanMonths;
            var accumulatedDepreciation = depreciationPerMonth * monthsPassed;

            return Math.Max(SalvageValue, PurchasePrice - accumulatedDepreciation);
        }
    }
}


