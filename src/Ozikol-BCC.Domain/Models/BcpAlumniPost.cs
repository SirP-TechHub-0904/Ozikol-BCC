using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpAlumniPost
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        public string? UserProfileId { get; set; }
        public Profile? UserProfile { get; set; }

        [Required]
        [StringLength(200)]
        public string? Title { get; set; }

        [Required]
        public string? Content { get; set; }

        [Display(Name = "Post Category")]
        public string PostType { get; set; } = "General"; // Job Opening, Business Opportunity, Mentorship Request, Mentorship Offer, General

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Display(Name = "Active Status")]
        public bool IsActive { get; set; } = true;
    }
}


