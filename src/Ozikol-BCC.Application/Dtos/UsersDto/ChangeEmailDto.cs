using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Dtos.UsersDto
{
    public class ChangeEmailDto
    {
        public string Id { get; set; }
        public string Email { get; set; }
        public string NewEmail { get; set; }
        [Display(Name = "Verify Via Email")]
        public bool VerifyViaEmail { get; set; }
    }
}

