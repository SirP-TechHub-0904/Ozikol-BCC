using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Dtos
{
    public class ParticipantDto
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public string FullnameX { get; set; }
        public string IdNumber { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public string LastLogin { get; set; }
        public string StudyGroupCategory { get; set; }
        public string Accomodation { get; set; }
        public UserStatus UserStatus { get; set; }
    }
}

