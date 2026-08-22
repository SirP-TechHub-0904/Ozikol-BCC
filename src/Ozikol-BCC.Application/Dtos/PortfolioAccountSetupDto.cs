using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Linq;

namespace Ozikol_BCC.Application.Dtos
{
    public class PortfolioAccountSetupDto
    {
        [Display(Name = "First Name")]
        [Required]
        public string? FirstName { get; set; }

        [Display(Name = "Middle Name")]
        [Required]
        public string? MiddleName { get; set; }

        [Display(Name = "Last Name")]
        [Required]
        public string? LastName { get; set; }
        [Display(Name = "Email Address")]
        [Required]
        public string Email { get; set; }
        [Display(Name = "Phone Number")]
        [Required]
        public string Phone { get; set; }

        [Display(Name = "Profile Domain")]
        [Required]
        public string ProfileDomain { get; set; }

        [Required]
        [StringLength(100, ErrorMessage = "The {0} must be at least {2} and at max {1} characters long.", MinimumLength = 6)]
        [DataType(DataType.Password)]
        [Display(Name = "Password")]
        public string Password { get; set; }

        [DataType(DataType.Password)]
        [Display(Name = "Confirm password")]
        [Compare("Password", ErrorMessage = "The password and confirmation password do not match.")]
        public string ConfirmPassword { get; set; }
    }
}

