using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpEquipmentCategory
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [Display(Name = "Category Name")]
        public string? Name { get; set; }

        public string? Description { get; set; }

        public ICollection<BcpEquipment>? BcpEquipments { get; set; }
    }
}


