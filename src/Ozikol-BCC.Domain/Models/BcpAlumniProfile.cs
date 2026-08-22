using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpAlumniProfile
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        public string? UserProfileId { get; set; }
        public Profile? UserProfile { get; set; }

        [Display(Name = "Exit / Graduation Year")]
        public int ExitYear { get; set; }

        [Display(Name = "Current Profession")]
        [StringLength(150)]
        public string? CurrentProfession { get; set; }

        [Display(Name = "Current Company")]
        [StringLength(150)]
        public string? Company { get; set; }

        [Display(Name = "LinkedIn Profile URL")]
        [StringLength(255)]
        [Url]
        public string? LinkedInUrl { get; set; }

        [Display(Name = "Available for Mentorship?")]
        public bool IsAvailableForMentorship { get; set; }

        [Display(Name = "Short Biography")]
        [StringLength(1000)]
        public string? Bio { get; set; }

        [Display(Name = "Verification Status")]
        public string VerificationStatus { get; set; } = "Verified"; // Pending, Verified, Suspended

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}


