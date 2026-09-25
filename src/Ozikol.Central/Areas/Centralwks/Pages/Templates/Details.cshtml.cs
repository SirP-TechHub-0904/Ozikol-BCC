using System;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Templates
{
    /// <summary>
    /// PageModel displaying the deep inspection of a UI Marketplace template blueprint, its code tabs,
    /// live markup preview simulation, and placeholder metadata.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public DetailsModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// The loaded marketplace template entity.
        /// </summary>
        public MasterMarketplaceTemplate Template { get; set; } = default!;

        /// <summary>
        /// Simulated rendered HTML snippet with mock placeholder substitutions.
        /// </summary>
        public string RenderedPreviewHtml { get; set; } = string.Empty;

        /// <summary>
        /// Feedback status message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to load the template and prepare the simulated preview.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var template = await _dbContext.MasterMarketplaceTemplates
                .Include(t => t.Category)
                .Include(t => t.Placeholders)
                .Include(t => t.Sections)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (template == null)
            {
                return NotFound($"Template with ID {id} was not found.");
            }

            Template = template;
            RenderedPreviewHtml = RenderTemplateMarkup(template);

            return Page();
        }

        /// <summary>
        /// Serves an isolated, sandboxed HTML document specifically for iframe live previews.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        public async Task<IActionResult> OnGetLivePreviewFrameAsync(Guid id)
        {
            var template = await _dbContext.MasterMarketplaceTemplates
                .Include(t => t.Category)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (template == null)
            {
                return Content("<!DOCTYPE html><html><body style='background:#ffffff;color:#64748b;font-family:sans-serif;padding:30px;text-align:center;'>Template not found.</body></html>", "text/html");
            }

            var compiledHtml = RenderTemplateMarkup(template);
            var safeJs = string.IsNullOrWhiteSpace(template.JsScript) ? string.Empty : $@"
<script>
document.addEventListener('DOMContentLoaded', function() {{
    try {{
        {template.JsScript}
    }} catch(err) {{
        console.warn('Sandboxed preview script error:', err);
    }}
}});
</script>";

            var variantClassUnderscore = $"sec-variant-{template.VariantCode.ToLowerInvariant()}";
            var variantClassHyphen = $"sec-variant-{template.VariantCode.ToLowerInvariant().Replace('_', '-')}";

            var fullDocument = $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{template.Name} - Live Preview</title>
    <!-- Fonts -->
    <link rel=""preconnect"" href=""https://fonts.googleapis.com"">
    <link rel=""preconnect"" href=""https://fonts.gstatic.com"" crossorigin>
    <link href=""https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap"" rel=""stylesheet"">
    <link rel=""stylesheet"" href=""https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"" />
    
    <!-- Core UI & Icon Frameworks -->
    <link rel=""stylesheet"" href=""https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"" />
    <link rel=""stylesheet"" href=""https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"" />
    <link rel=""stylesheet"" href=""https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"" />
    <link rel=""stylesheet"" href=""https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"" />
    <link rel=""stylesheet"" href=""https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"" />
    
    <style>
        *, *::before, *::after {{
            box-sizing: border-box;
        }}
        html, body {{
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #ffffff;
            color: #1e293b;
            min-height: 100vh;
            overflow-x: hidden;
        }}
        a {{ text-decoration: none; color: inherit; }}
        img {{ max-width: 100%; height: auto; }}
        
        /* Universal Icon Fallbacks for Vendor Themes (ThemeJunction, Bexon, etc.) */
        [class*='tji-']:before, [class^='tji-']:before {{
            font-family: 'bootstrap-icons', 'Font Awesome 6 Free', sans-serif !important;
            font-style: normal;
            font-weight: 900;
            display: inline-block;
        }}
        .tji-list:before, .tji-check:before {{ content: '\f26e' !important; font-family: 'bootstrap-icons' !important; }}
        .tji-arrow-right-long:before, .tji-arrow-right:before, .tji-arrow-right-big:before {{ content: '\f138' !important; font-family: 'bootstrap-icons' !important; }}
        .tji-arrow-left:before {{ content: '\f12f' !important; font-family: 'bootstrap-icons' !important; }}
        .tji-service-1:before {{ content: '\f46b' !important; font-family: 'bootstrap-icons' !important; }}
        .tji-service-2:before {{ content: '\f3e8' !important; font-family: 'bootstrap-icons' !important; }}
        .tji-service-3:before {{ content: '\f562' !important; font-family: 'bootstrap-icons' !important; }}
        .tji-service-4:before {{ content: '\f22d' !important; font-family: 'bootstrap-icons' !important; }}
        .tji-clock:before {{ content: '\f293' !important; font-family: 'bootstrap-icons' !important; }}
        .tji-quote:before {{ content: '\f50e' !important; font-family: 'bootstrap-icons' !important; }}
        .tji-at:before {{ content: '\f147' !important; font-family: 'bootstrap-icons' !important; }}
        .tji-phone:before {{ content: '\f5c1' !important; font-family: 'bootstrap-icons' !important; }}
        .tji-mail:before, .tji-envelope:before {{ content: '\f32f' !important; font-family: 'bootstrap-icons' !important; }}

        /* Dark Section Background Resilience */
        .tj-service-section.service-2,
        section.service-2,
        section.dark-section,
        section.bg-dark-section {{
            background-color: #0c1222;
            padding: 80px 0;
            position: relative;
        }}

        /* Neutralize scroll-animation opacity traps in preview mode */
        .wow, .fadeInUp, [class*='fadein'], [class*='fade-in'], [class*='text-anim'], .tj-fadein-right-on-scroll, [data-wow-delay] {{
            opacity: 1 !important;
            visibility: visible !important;
            transform: none !important;
            animation: none !important;
        }}

        /* Scoped Template Styles */
        {template.CssStyles}
    </style>
</head>
<body class=""preview-body"">
    <div class=""{variantClassUnderscore} {variantClassHyphen}"" style=""width: 100%;"">
        {compiledHtml}
    </div>

    <!-- Core Scripts -->
    <script src=""https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js""></script>
    <script src=""https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js""></script>
    {safeJs}
</body>
</html>";

            return Content(fullDocument, "text/html");
        }

        /// <summary>
        /// Renders realistic mock HTML replacing mustache tokens and loop blocks.
        /// </summary>
        private static string RenderTemplateMarkup(MasterMarketplaceTemplate template)
        {
            var html = template.HtmlTemplate ?? string.Empty;
            if (string.IsNullOrWhiteSpace(html))
                return "<div style='padding:20px;color:#94a3b8;text-align:center;'>No HTML markup defined for this template.</div>";

            // 1. Process SectionLists / PageSectionLists loop blocks
            var listBlockRegex = new Regex(@"\{\{#each\s+(?:SectionLists|PageSectionLists)\}\}([\s\S]*?)\{\{/each\}\}", RegexOptions.IgnoreCase);
            if (listBlockRegex.IsMatch(html))
            {
                html = listBlockRegex.Replace(html, match =>
                {
                    var itemTemplate = match.Groups[1].Value;
                    return GenerateMockListItems(template, itemTemplate);
                });
            }

            // 2. Substitute standard single tokens
            html = html.Replace("{{ Title }}", template.PreviewTitle ?? template.Name, StringComparison.OrdinalIgnoreCase);
            html = html.Replace("{{ MiniTitle }}", "Enterprise Platform", StringComparison.OrdinalIgnoreCase);
            html = html.Replace("{{ Subtitle }}", template.PreviewSubtitle ?? template.Description ?? "Accelerate digital growth with modular, high-performance architecture.", StringComparison.OrdinalIgnoreCase);
            html = html.Replace("{{ Description }}", template.Description ?? "Designed for scalable enterprise workloads with automated workflows and real-time telemetry.", StringComparison.OrdinalIgnoreCase);
            html = html.Replace("{{ ImageUrl }}", string.IsNullOrWhiteSpace(template.PreviewImageUrl) ? "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=800&auto=format&fit=crop" : template.PreviewImageUrl, StringComparison.OrdinalIgnoreCase);
            html = html.Replace("{{ SecondaryImageUrl }}", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop", StringComparison.OrdinalIgnoreCase);
            html = html.Replace("{{ ButtonText }}", "Explore Solutions", StringComparison.OrdinalIgnoreCase);
            html = html.Replace("{{ ButtonUrl }}", "#", StringComparison.OrdinalIgnoreCase);
            html = html.Replace("{{ SecondaryButtonText }}", "Book a Demo", StringComparison.OrdinalIgnoreCase);
            html = html.Replace("{{ SecondaryButtonUrl }}", "#", StringComparison.OrdinalIgnoreCase);
            html = html.Replace("{{ VideoUrl }}", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", StringComparison.OrdinalIgnoreCase);

            return html;
        }

        /// <summary>
        /// Generates mock loop item instances based on template category and default JSON.
        /// </summary>
        private static string GenerateMockListItems(MasterMarketplaceTemplate template, string itemTemplate)
        {
            // If default JSON is present, attempt to parse items
            if (!string.IsNullOrWhiteSpace(template.DefaultSectionListsJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(template.DefaultSectionListsJson);
                    if (doc.RootElement.ValueKind == JsonValueKind.Array)
                    {
                        var rendered = new System.Text.StringBuilder();
                        foreach (var el in doc.RootElement.EnumerateArray())
                        {
                            var itemHtml = itemTemplate;
                            if (el.TryGetProperty("Title", out var title))
                                itemHtml = itemHtml.Replace("{{ Title }}", title.GetString() ?? "", StringComparison.OrdinalIgnoreCase);
                            if (el.TryGetProperty("Description", out var desc))
                                itemHtml = itemHtml.Replace("{{ Description }}", desc.GetString() ?? "", StringComparison.OrdinalIgnoreCase);
                            if (el.TryGetProperty("Icon", out var icon))
                                itemHtml = itemHtml.Replace("{{ IconName }}", icon.GetString() ?? "star", StringComparison.OrdinalIgnoreCase)
                                                   .Replace("{{ Icon }}", icon.GetString() ?? "star", StringComparison.OrdinalIgnoreCase);
                            if (el.TryGetProperty("ImageUrl", out var img))
                                itemHtml = itemHtml.Replace("{{ ImageUrl }}", img.GetString() ?? "", StringComparison.OrdinalIgnoreCase);
                            if (el.TryGetProperty("LinkUrl", out var link))
                                itemHtml = itemHtml.Replace("{{ LinkUrl }}", link.GetString() ?? "#", StringComparison.OrdinalIgnoreCase);

                            rendered.Append(itemHtml);
                        }
                        return rendered.ToString();
                    }
                }
                catch
                {
                    // Fallback to default mock generation
                }
            }

            // Default fallback 3 mock items
            var mockCards = new[]
            {
                new { Title = "Cloud Orchestration", Desc = "Automate multi-tenant provisioning with zero downtime deployments.", Icon = "cloud_sync", Img = "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop" },
                new { Title = "Real-Time Telemetry", Desc = "Monitor system health, error traces, and performance metrics instantly.", Icon = "monitoring", Img = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=400&auto=format&fit=crop" },
                new { Title = "Enterprise Security", Desc = "Bank-grade tenant data isolation, encrypted logs, and granular RBAC.", Icon = "security", Img = "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=400&auto=format&fit=crop" }
            };

            var sb = new System.Text.StringBuilder();
            foreach (var card in mockCards)
            {
                var itemHtml = itemTemplate
                    .Replace("{{ Title }}", card.Title, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ Description }}", card.Desc, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ IconName }}", card.Icon, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ Icon }}", card.Icon, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ ImageUrl }}", card.Img, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ LinkUrl }}", "#", StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ ButtonText }}", "Learn More", StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ ButtonUrl }}", "#", StringComparison.OrdinalIgnoreCase);
                sb.Append(itemHtml);
            }
            return sb.ToString();
        }

        /// <summary>
        /// Handles HTTP POST requests to permanently delete the template blueprint.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var template = await _dbContext.MasterMarketplaceTemplates.FindAsync(id);
            if (template == null)
            {
                return NotFound();
            }

            _dbContext.MasterMarketplaceTemplates.Remove(template);
            await _dbContext.SaveChangesAsync();

            TempData["StatusMessage"] = $"Template '{template.Name}' was permanently deleted.";
            return RedirectToPage("./Index");
        }

        /// <summary>
        /// Toggles template active/hidden state.
        /// </summary>
        /// <param name="id">Template identifier.</param>
        public async Task<IActionResult> OnPostToggleActiveAsync(Guid id)
        {
            var template = await _dbContext.MasterMarketplaceTemplates.FindAsync(id);
            if (template == null)
            {
                return NotFound();
            }

            template.IsActive = !template.IsActive;
            template.UpdatedUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Template '{template.Name}' status updated to {(template.IsActive ? "Active" : "Hidden")}.";
            return RedirectToPage(new { id });
        }
    }
}

