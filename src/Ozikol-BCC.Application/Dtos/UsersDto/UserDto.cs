using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;
using System.Xml.Linq;

namespace Ozikol_BCC.Application.Dtos.UsersDto
{
    /// <summary>
    /// DTO used by administrative user create/edit flows. It carries Identity profile fields,
    /// selected roles, password entry fields, and optional passport image metadata.
    /// </summary>
    public class UserDto
    {
        public string Id { get; set; }
        [Display(Name = "First Name")]
        [Required]
        public string? FirstName { get; set; }

        [Display(Name = "Middle Name")]
        [Required]
        public string? MiddleName { get; set; }

        [Display(Name = "Last Name")]
        [Required]
        public string? LastName { get; set; }

        [Display(Name = "Full Name")]
        [Required]
        public string? FullName { get; set; }

        [Display(Name = "Email")]
        [Required]
        public string? Email { get; set; }

        [Display(Name = "Username")]
        [Required]
        public string? Username { get; set; }

        [Display(Name = "Phone")]
        [Required]
        public string? Phone { get; set; }
          [Display(Name = "Gender")]
        public GenderStatus Gender { get; set; }
        [Display(Name = "Date of Birth")]
        [Required]
        public DateTime? DateOfBirth { get; set; }

        [Display(Name = "User Status")]
        [Required]
        public UserStatus UserStatus { get; set; }

        [Display(Name = "Passport")]
        public string? PassportFilePathUrl { get; set; }
        public string? PassportFilePathKey { get; set; }

        public List<string> Roles { get; set; }

        [Required]
        public List<string> UserRoles { get; set; }

        public string? Response { get; set; }

        [Required]
        [DataType(DataType.Password)]
        public string Password { get; set; }

        [Required]
        [DataType(DataType.Password)]
        [Compare("Password", ErrorMessage = "Passwords do not match.")]
        public string ConfirmPassword { get; set; }
    }
}

