using System.Threading;
using System.Threading.Tasks;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Application.Interfaces.Services
{
    /// <summary>
    /// Contract for wrapping inner email content snippets in a unified, responsive HTML email shell
    /// populated dynamically with tenant branding, headers, user salutations, and footers.
    /// Ensures callers only produce inner content tables while the email pool pipeline handles full HTML assembly.
    /// </summary>
    public interface ITenantEmailShellService
    {
        /// <summary>
        /// Wraps an inner HTML message snippet with a responsive, tenant-branded HTML email shell.
        /// If the content is already a complete HTML document, it returns the content directly without double-wrapping.
        /// </summary>
        /// <param name="innerHtml">The inner content table, cards, or message snippet.</param>
        /// <param name="title">Headline or title of the message (e.g. "Security Advisory", "Workspace Invitation").</param>
        /// <param name="recipientFirstName">Optional first name of recipient for salutation.</param>
        /// <param name="tenantBrandName">Tenant display brand name (e.g. "Acme Logistics"). Defaults to "Workspace".</param>
        /// <param name="tenantLogoUrl">Optional logo URL for the tenant header banner.</param>
        /// <param name="actionUrl">Optional primary action button URL.</param>
        /// <param name="actionText">Optional primary action button text (default: "Open Workspace").</param>
        /// <param name="brandColorHex">Brand primary color hex (defaults to Royal Blue #0050E5).</param>
        /// <param name="badgeLabel">Optional pill badge label in the header (e.g. "Security", "Important", "Invitation").</param>
        /// <returns>A self-contained, responsive HTML5 email document string.</returns>
        string WrapWithTenantShell(
            string innerHtml,
            string title,
            string? recipientFirstName = null,
            string? tenantBrandName = null,
            string? tenantLogoUrl = null,
            string? actionUrl = null,
            string? actionText = null,
            string? brandColorHex = null,
            string? badgeLabel = null);

        /// <summary>
        /// Dynamically queries tenant brand settings from <see cref="DashboardDbContext"/> and wraps
        /// the inner content snippet in the tenant's brand-styled email shell.
        /// </summary>
        /// <param name="dbContext">The scoped tenant database context.</param>
        /// <param name="innerHtml">The inner content table, cards, or message snippet.</param>
        /// <param name="title">Headline or title of the message.</param>
        /// <param name="recipientFirstName">Optional first name of recipient for salutation.</param>
        /// <param name="actionUrl">Optional primary action button URL.</param>
        /// <param name="actionText">Optional primary action button text.</param>
        /// <param name="badgeLabel">Optional pill badge label in the header.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A fully hydrated, tenant-branded responsive HTML5 email document.</returns>
        Task<string> WrapWithTenantShellAsync(
            DashboardDbContext dbContext,
            string innerHtml,
            string title,
            string? recipientFirstName = null,
            string? actionUrl = null,
            string? actionText = null,
            string? badgeLabel = null,
            CancellationToken cancellationToken = default);
    }
}
