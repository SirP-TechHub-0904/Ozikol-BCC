using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// BCP: Allows admins to attach private HR-style internal notes to any user's profile.
    /// This works like an activity log or case notes system.
    /// IsPrivate = true means only admins can see it.
    /// IsPrivate = false means the user can also see the note on their own profile.
    /// Treat note content as sensitive profile data.
    /// </summary>
    public class BcpUserNote
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        // The user this note belongs to
        [Display(Name = "User")]
        [Required]
        public string? ProfileId { get; set; }
        public Profile? Profile { get; set; }

        [Display(Name = "Note")]
        [Required]
        public string? Note { get; set; }

        // ProfileId of the administrator who wrote this note.
        [Display(Name = "Created By")]
        public string? CreatedBy { get; set; } // ProfileId of the admin

        [Display(Name = "Private (Admin Eyes Only)")]
        public bool IsPrivate { get; set; } = true;

        public DateTime Date { get; set; } = DateTime.UtcNow;
    }
}


