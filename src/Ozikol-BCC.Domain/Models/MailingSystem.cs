using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    public class MailingSystem
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        public string? Title { get; set; }
        public string? Receipient { get; set; }
        public string? Content { get; set; } 
        public int Retries { get; set; }
        public NotificationStatus NotificationStatus { get; set; }
        public NotificationType NotificationType { get; set; }
    }
}


