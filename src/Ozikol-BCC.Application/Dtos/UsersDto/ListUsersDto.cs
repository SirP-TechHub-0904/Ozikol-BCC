using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Linq;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Dtos.UsersDto
{
    public class ListUsersDto
    {
        [Display(Name = "Fullname")]
        public string? Fullname { get; set; }

        [Display(Name = "Id")]
        public string? Id { get; set; }

        [Display(Name = "Email")]
        public string? Email { get; set; }
         [Display(Name = "Username")]
        public string? Username { get; set; }


        [Display(Name = "Date of Birth")]
        public DateTime? DateOfBirth { get; set; }

        [Display(Name = "Gender")]
        public string? Gender { get; set; }

        [Display(Name = "Phone")]
        public string? Phone { get; set; }

        [Display(Name = "Role")]
        public string? Role { get; set; }

        [Display(Name = "User Status")]
        public UserStatus UserStatus { get; set; }
    }
}

