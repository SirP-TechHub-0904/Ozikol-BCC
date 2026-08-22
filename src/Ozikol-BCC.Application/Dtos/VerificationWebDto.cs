using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Application.Dtos
{
    /// <summary>
    /// Carries resolved site/settings context for web request validation and routing decisions.
    /// BCP pages should treat this as request context, not as a persistence model.
    /// </summary>
    public class VerificationWebDto
    {
        public bool SettingFound { get; set; }
        public string Path { get; set; }
        public string Area { get; set; }
        public bool Portfolio { get; set; }
        public string PortfolioPath { get; set; }
        public ConfigSetting ConfigSetting { get; set; }
        public ManagementSetting ManagementSetting { get; set; }
        public BcpSetting BcpSetting { get; set; }
    }
}
