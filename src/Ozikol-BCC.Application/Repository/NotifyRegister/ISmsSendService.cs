using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.NotifyRegister
{
    public enum SmsSendResult
    {
        Success,
        InsufficientKudiBalance,
        Failed
    }

    /// <summary>
    /// SMS delivery contract used by immediate sends and scheduled campaign workers.
    /// Campaign sends return a status so balance issues can remain pending instead of failing permanently.
    /// </summary>
    public interface ISmsSendService
    {
        Task SendSms(string contact, string message);
        Task<bool> SendSmsWithResult(string contact, string message);
        Task<SmsSendResult> SendCampaignSmsAsync(string contact, string message, string senderId);
    }
}

