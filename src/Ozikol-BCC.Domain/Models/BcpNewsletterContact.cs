using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpNewsletterContact
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpNewsletterListId { get; set; }
        public BcpNewsletterList? BcpNewsletterList { get; set; }

        public string? Name { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public DateTime DateAdded { get; set; } = DateTime.UtcNow;

        [Display(Name = "Active Subscription")]
        public bool IsActive { get; set; } = true;
    }
}


