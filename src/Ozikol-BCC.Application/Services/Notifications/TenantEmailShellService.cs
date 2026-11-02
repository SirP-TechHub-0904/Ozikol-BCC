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

            // Salutation formatting
            var salutationHtml = !string.IsNullOrWhiteSpace(recipientFirstName)
                ? $"<p style='margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#1e293b;'>Hello <strong>{System.Net.WebUtility.HtmlEncode(recipientFirstName.Trim())}</strong>,</p>"
                : string.Empty;

            // Brand header logo or text
            var headerBrandHtml = !string.IsNullOrWhiteSpace(tenantLogoUrl)
                ? $"<img src='{tenantLogoUrl.Trim()}' alt='{System.Net.WebUtility.HtmlEncode(brand)}' style='max-height:36px; max-width:200px; object-fit:contain; vertical-align:middle;' />"
                : $"<span style='font-size:18px; font-weight:800; color:#ffffff; letter-spacing:-0.3px;'>{System.Net.WebUtility.HtmlEncode(brand)}</span>";

            // Header badge (e.g. Security, Urgent, Invitation)
            var badgeHtml = !string.IsNullOrWhiteSpace(badgeLabel)
                ? $"<span style='display:inline-block; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; padding:4px 12px; border-radius:100px; background-color:rgba(255,255,255,0.2); color:#ffffff; border:1px solid rgba(255,255,255,0.3);'>{System.Net.WebUtility.HtmlEncode(badgeLabel.Trim())}</span>"
                : string.Empty;

            // Primary action button
            var buttonHtml = string.Empty;
            if (!string.IsNullOrWhiteSpace(actionUrl))
            {
                var btnText = !string.IsNullOrWhiteSpace(actionText) ? actionText.Trim() : "Open in Workspace";
                buttonHtml = $@"
                    <div style='margin-top:28px; text-align:center;'>
                        <a href='{actionUrl.Trim()}' style='background-color:{primaryColor}; color:#ffffff; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:700; font-size:13.5px; display:inline-block; box-shadow:0 2px 4px rgba(0,0,0,0.1);'>
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
                    <!-- Header Banner -->
                    <tr>
                        <td style='background-color:{primaryColor}; padding:20px 28px;'>
                            <table width='100%' cellpadding='0' cellspacing='0'>
                                <tr>
                                    <td align='left' style='vertical-align:middle;'>
                                        {headerBrandHtml}
                                    </td>
                                    <td align='right' style='vertical-align:middle;'>
                                        {badgeHtml}
                                    </td>
                                </tr>
                            </table>
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
                                {innerHtml}
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
