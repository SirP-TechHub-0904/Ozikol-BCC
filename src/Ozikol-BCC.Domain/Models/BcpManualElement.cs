using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Documents one visible UI element in a manual page. This supports contextual
    /// help and can later feed page tours without hard-coding descriptions in views.
    /// </summary>
    public class BcpManualElement
    {
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpManualPageId { get; set; }
        public BcpManualPage? BcpManualPage { get; set; }

        [Required]
        public string? ElementName { get; set; }
        
        public string? ElementType { get; set; } // e.g. Button, Table, Form
        
        public string? Description { get; set; }

        /// <summary>
        /// Optional role restriction, such as GlobalEditor or SystemAdmin.
        /// Empty means the element guidance is generally visible.
        /// </summary>
        public string? RequiredRole { get; set; } 
    }
}


