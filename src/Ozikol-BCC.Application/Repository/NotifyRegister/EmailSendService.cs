using Ozikol_BCC.Application.Dtos.NotifyDtos;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.NotifyRegister
{
    public class EmailSendService : IEmailSendService
    {
        public Task SendEmail(string name, string to, string cc, string bcc, string subject, string body) { return Task.CompletedTask; }
        public Task SendEmailPostmaster(string name, string to, string cc, string bcc, string subject, string body) { return Task.CompletedTask; }
        public Task SendEmailPostmasterAddFrom(string from, string name, string to, string cc, string bcc, string subject, string body) { return Task.CompletedTask; }
        public Task<bool> SendEmailWithResult(string name, string to, string cc, string bcc, string subject, string body) { return Task.FromResult(true); }
        public Task<bool> SendEmailPostmasterReturn(string name, string to, string cc, string bcc, string subject, string body) { return Task.FromResult(true); }
    }
}
