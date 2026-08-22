using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Defines the help/manual content for one BCP feature module. Manuals are
    /// attached to ModuleFolder so the UI can load relevant guidance per feature.
    /// </summary>
    public class BcpManual
    {
        public BcpManual()
        {
            BcpManualPages = new HashSet<BcpManualPage>();
        }

        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Feature module key. This should match the BCP feature catalog and route folder.
        /// </summary>
        [Required]
        public string? ModuleFolder { get; set; }

        [Required]
        public string? Title { get; set; }

        public string? Overview { get; set; }

        public ICollection<BcpManualPage> BcpManualPages { get; set; }
    }
}


