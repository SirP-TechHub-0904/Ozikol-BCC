using Ozikol_BCC.Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.NotifyRegister
{
    /// <summary>
    /// Provider contract used by EmailBackgroundWorker for tenant-scoped ZeptoMail delivery.
    /// Implementations should return provider errors instead of throwing for ordinary send failures.
    /// </summary>
    public interface IZeptoMailService
    {
        Task<(bool IsSuccess, string ErrorMessage)> SendEmailAsync(string toEmail, string toName, string subject, string htmlBody, string trackingGuid);
    }
}

