using Ozikol_BCC.Domain.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Services
{
    /// <summary>
    /// Contract for managing multi-channel message templates (Email, SMS, In-App Notifications)
    /// and dynamic placeholder interpolation.
    /// </summary>
    public interface IMessageTemplateService
    {
        /// <summary>
        /// Renders subject and body with interpolated placeholders. Falls back to default copy if no custom template is active.
        /// </summary>
        Task<(string Subject, string Body)> RenderMessageAsync(
            BcpEventType eventType,
            BcpMessageChannel channel,
            Dictionary<string, string> placeholders,
            string? fallbackSubject = null,
            string? fallbackBody = null);

        /// <summary>
        /// Retrieves all configured message templates for the active tenant.
        /// </summary>
        Task<List<BcpMessageTemplate>> GetAllTemplatesAsync();

        /// <summary>
        /// Retrieves template for specific event and channel.
        /// </summary>
        Task<BcpMessageTemplate?> GetTemplateAsync(BcpEventType eventType, BcpMessageChannel channel);

        /// <summary>
        /// Saves or updates a customized template for an event and channel.
        /// </summary>
        Task<BcpMessageTemplate> SaveTemplateAsync(
            BcpEventType eventType,
            BcpMessageChannel channel,
            string name,
            string? subject,
            string body,
            bool isActive,
            string? updatedBy = null);

        /// <summary>
        /// Ensures all standard system event templates exist in the database with rich HTML & SMS defaults.
        /// </summary>
        Task SeedDefaultTemplatesAsync();

        /// <summary>
        /// Resets a specific template back to system default.
        /// </summary>
        Task<BcpMessageTemplate?> ResetToDefaultAsync(BcpEventType eventType, BcpMessageChannel channel);
    }
}
