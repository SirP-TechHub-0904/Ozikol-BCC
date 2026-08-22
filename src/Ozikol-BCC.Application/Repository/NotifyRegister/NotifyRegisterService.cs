using Ozikol_BCC.Application.Dtos.NotifyDtos;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.NotifyRegister
{
    public class NotifyRegisterService : INotifyRegisterService
    {
        public Task RegisterNotification(NotifyDto obj) { return Task.CompletedTask; }
    }
}
