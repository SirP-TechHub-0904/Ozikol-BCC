using System;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.NotifyRegister
{
    /// <summary>
    /// SMS gateway service stub. SMS provider is unconfigured; all SMS communications
    /// remain safely in the pool awaiting future provider configuration.
    /// </summary>
    public class SmsSendService : ISmsSendService
    {
        public Task<bool> SendSmsWithResult(string contact, string message)
        {
            // SMS provider is unconfigured; communications remain in pool
            return Task.FromResult(false);
        }

        public Task SendSms(string contact, string message)
        {
            return Task.CompletedTask;
        }

        public Task<SmsSendResult> SendCampaignSmsAsync(string contact, string message, string senderId)
        {
            // SMS provider is unconfigured; campaigns remain pending
            return Task.FromResult(SmsSendResult.ProviderUnconfigured);
        }
    }
}
