using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpMaintenanceLog
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpEquipmentId { get; set; }
        public BcpEquipment? BcpEquipment { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        public string? Description { get; set; }

        public decimal Cost { get; set; }

        [Display(Name = "Performed By (Vendor/Mechanic)")]
        public string? PerformedBy { get; set; }
    }
}


