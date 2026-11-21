using System;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Application.Services.Notifications
{
    /// <summary>
    /// Service that wraps inner message content tables/cards in a standardized, responsive HTML5
    /// email shell dynamically populated with tenant branding, salutations, action links, and footers.
    /// Preserves strict multi-tenant white-labeling (zero Ozikol branding in outbound emails).
    /// </summary>
    public class TenantEmailShellService : ITenantEmailShellService
    {
        private const string DefaultBrandColor = "#0050e5"; // Official Royal Blue (AGENTS.md Rule 7)

        /// <inheritdoc />
        public string WrapWithTenantShell(
            string innerHtml,
            string title,
            string? recipientFirstName = null,
            string? tenantBrandName = null,
            string? tenantLogoUrl = null,
            string? actionUrl = null,
            string? actionText = null,
            string? brandColorHex = null,
            string? badgeLabel = null)
        {
            if (string.IsNullOrWhiteSpace(innerHtml))
            {
                innerHtml = "<p style='color:#334155; font-size:14.5px;'>No message content provided.</p>";
            }

            // If the content is already a full HTML document, avoid double-wrapping
            if (innerHtml.IndexOf("<!DOCTYPE html", StringComparison.OrdinalIgnoreCase) >= 0 ||
                innerHtml.IndexOf("<html", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return innerHtml;
            }

            var brand = !string.IsNullOrWhiteSpace(tenantBrandName) ? tenantBrandName.Trim() : "Workspace";
            var primaryColor = !string.IsNullOrWhiteSpace(brandColorHex) ? brandColorHex.Trim() : DefaultBrandColor;
            var safeTitle = !string.IsNullOrWhiteSpace(title) ? title.Trim() : "Notification";

            // Salutation formatting — avoid duplicate greetings if innerHtml already begins with a greeting
            var trimmedContent = innerHtml.TrimStart();
            var hasExistingGreeting = trimmedContent.StartsWith("Hello", StringComparison.OrdinalIgnoreCase) ||
                                      trimmedContent.StartsWith("Dear", StringComparison.OrdinalIgnoreCase) ||
                                      trimmedContent.StartsWith("<p>Hello", StringComparison.OrdinalIgnoreCase) ||
                                      trimmedContent.StartsWith("<p>Dear", StringComparison.OrdinalIgnoreCase);

            var salutationHtml = (!string.IsNullOrWhiteSpace(recipientFirstName) && !hasExistingGreeting)
                ? $"<p style='margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#1e293b;'>Hello <strong>{System.Net.WebUtility.HtmlEncode(recipientFirstName.Trim())}</strong>,</p>"
                : string.Empty;

            // Normalize plain text messages with markdown formatting into clean HTML
            var renderedContent = innerHtml;
            if (!renderedContent.Contains("<p>") && !renderedContent.Contains("<div>") && !renderedContent.Contains("<table"))
            {
                if (renderedContent.Contains("**"))
                {
                    renderedContent = System.Text.RegularExpressions.Regex.Replace(renderedContent, @"\*\*(.+?)\*\*", "<strong>$1</strong>");
                }
                if (renderedContent.Contains("\n"))
                {
                    renderedContent = renderedContent.Replace("\r\n", "\n").Replace("\n", "<br/>");
                }
            }

            // Brand header logo or text (displayed against crisp white header)
            var headerBrandHtml = !string.IsNullOrWhiteSpace(tenantLogoUrl)
                ? $"<img src='{tenantLogoUrl.Trim()}' alt='{System.Net.WebUtility.HtmlEncode(brand)}' style='max-height:44px; max-width:220px; object-fit:contain; display:inline-block; vertical-align:middle;' />"
                : $"<span style='font-size:20px; font-weight:800; color:#0f172a; letter-spacing:-0.4px;'>{System.Net.WebUtility.HtmlEncode(brand)}</span>";

            // Header badge (e.g. Security, Urgent, Invitation)
            var badgeHtml = !string.IsNullOrWhiteSpace(badgeLabel)
                ? $"<div style='margin-top:8px;'><span style='display:inline-block; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; padding:3px 10px; border-radius:100px; background-color:#f1f5f9; color:#475569; border:1px solid #cbd5e1;'>{System.Net.WebUtility.HtmlEncode(badgeLabel.Trim())}</span></div>"
                : string.Empty;

            // Primary action button (Official Royal Blue #0050E5 per AGENTS.md Rule 7)
            const string buttonColor = "#0050e5";
            var buttonHtml = string.Empty;
            if (!string.IsNullOrWhiteSpace(actionUrl))
            {
                var btnText = !string.IsNullOrWhiteSpace(actionText) ? actionText.Trim() : "Open in Workspace";
                buttonHtml = $@"
                    <div style='margin-top:32px; text-align:center;'>
                        <a href='{actionUrl.Trim()}' style='background-color:{buttonColor}; color:#ffffff; padding:13px 32px; border-radius:8px; text-decoration:none; font-weight:700; font-size:14px; display:inline-block; box-shadow:0 2px 6px rgba(0,80,229,0.25);'>
                            {System.Net.WebUtility.HtmlEncode(btnText)}
                        </a>
                    </div>";
            }

            return $@"<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1'>
    <title>{System.Net.WebUtility.HtmlEncode(safeTitle)}</title>
</head>
<body style='margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;'>
    <table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f8fafc; padding:32px 16px;'>
        <tr>
            <td align='center'>
                <table width='600' cellpadding='0' cellspacing='0' style='max-width:600px; width:100%; background-color:#ffffff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05);'>
                    <!-- Header Banner (Crisp White + Centered Logo) -->
                    <tr>
                        <td align='center' style='background-color:#ffffff; padding:28px 24px; text-align:center; border-bottom:1px solid #e2e8f0;'>
                            <div style='text-align:center; margin:0 auto;'>
                                {headerBrandHtml}
                            </div>
                            {badgeHtml}
                        </td>
                    </tr>
                    <!-- Main Body Card -->
                    <tr>
                        <td style='padding:32px 28px; color:#334155; font-size:14px; line-height:1.6;'>
                            <h2 style='margin:0 0 18px 0; font-size:19px; font-weight:700; color:#0f172a; line-height:1.3;'>
                                {System.Net.WebUtility.HtmlEncode(safeTitle)}
                            </h2>
                            {salutationHtml}
                            <div style='color:#334155;'>
                                {renderedContent}
                            </div>
                            {buttonHtml}
                        </td>
                    </tr>
                    <!-- Footer Notice (White-Labeled) -->
                    <tr>
                        <td style='background-color:#f8fafc; padding:18px 28px; border-top:1px solid #e2e8f0; font-size:11.5px; color:#94a3b8; text-align:center; line-height:1.5;'>
                            This automated alert was dispatched by <strong>{System.Net.WebUtility.HtmlEncode(brand)}</strong>. If you did not expect this notification or have questions, please contact your workspace administrator.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
        }

        /// <inheritdoc />
        public async Task<string> WrapWithTenantShellAsync(
            DashboardDbContext dbContext,
            string innerHtml,
            string title,
            string? recipientFirstName = null,
            string? actionUrl = null,
            string? actionText = null,
            string? badgeLabel = null,
            CancellationToken cancellationToken = default)
        {
            if (dbContext == null) throw new ArgumentNullException(nameof(dbContext));

            string brandName = "Workspace";
            string? logoUrl = null;

            try
            {
                var site = await dbContext.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
                if (site != null)
                {
                    if (!string.IsNullOrWhiteSpace(site.BrandName))
                    {
                        brandName = site.BrandName.Trim();
                    }
                    else if (!string.IsNullOrWhiteSpace(site.CompanyName))
                    {
                        brandName = site.CompanyName.Trim();
                    }

                    logoUrl = site.CompanyWhiteLogoUrl ?? site.WhiteLogoUrl ?? site.CompanyLogoUrl ?? site.LogoUrl;
                }
            }
            catch
            {
                // Fail-safe: fallback to default Workspace branding
            }

            return WrapWithTenantShell(
                innerHtml: innerHtml,
                title: title,
                recipientFirstName: recipientFirstName,
                tenantBrandName: brandName,
                tenantLogoUrl: logoUrl,
                actionUrl: actionUrl,
                actionText: actionText,
                brandColorHex: DefaultBrandColor,
                badgeLabel: badgeLabel);
        }
    }
}
