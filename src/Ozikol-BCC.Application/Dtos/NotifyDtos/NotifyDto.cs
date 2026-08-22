using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Dtos.NotifyDtos
{
    public class NotifyDto
    {
        public string Title { get; set; }
        public string Name { get; set; }
        public string NotificationTitle { get; set; }
        public string Content { get; set; }
        public string Receipient { get; set; }
        public bool IsEmail { get; set; }
    }
}

