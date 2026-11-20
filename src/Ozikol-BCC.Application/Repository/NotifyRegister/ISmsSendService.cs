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
        ProviderUnconfigured,
        Failed
    }

    /// <summary>
    /// SMS delivery contract. SMS provider is unconfigured; SMS items remain in the pool.
    /// </summary>
    public interface ISmsSendService
    {
        Task SendSms(string contact, string message);
        Task<bool> SendSmsWithResult(string contact, string message);
        Task<SmsSendResult> SendCampaignSmsAsync(string contact, string message, string senderId);
    }
}
