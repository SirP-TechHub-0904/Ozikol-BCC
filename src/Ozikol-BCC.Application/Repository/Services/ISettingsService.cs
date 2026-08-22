
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.Services
{
    /// <summary>
    /// Application contract for resolving website, portfolio, HTTPS, and BCP settings
    /// needed while handling a web request.
    /// </summary>
    public interface ISettingsService
    {
        Task<bool> GetMaxUserCount();

        Task<Ozikol_BCC.Application.Dtos.UI.ConfigSettingDto> GetConfigAsync();

        Task<bool> UseHttpsWWW();
        Task<bool> UseHttps();
        Task<Ozikol_BCC.Application.Dtos.VerificationWebDto> ValidateWeb(HttpContext context);
    }
}
