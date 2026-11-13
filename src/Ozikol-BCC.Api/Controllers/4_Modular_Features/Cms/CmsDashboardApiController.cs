using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Domain.Constants;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Tags("CMS Studio Analytics & Dashboard")]
    [Authorize(Policy = AuthPolicies.CmsStudio)]
    public class CmsDashboardApiController : ControllerBase
    {
        private readonly DashboardDbContext _context;

        public CmsDashboardApiController(DashboardDbContext context)
        {
            _context = context;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetCmsStats([FromQuery] string range = "24h")
        {
            // 1. Web Pages Metrics
            var totalPages = await _context.WebPages.CountAsync();
            var publishedPages = await _context.WebPages.CountAsync(p => p.Publish);
            var draftPages = totalPages - publishedPages;
            var legalAndSecurityPages = await _context.WebPages.CountAsync(p => p.IsLegal || p.SecurityPage);
            var menuCtaPages = await _context.WebPages.CountAsync(p => p.IsMenuCTA);

            // 2. Page Sections Metrics
            var totalSections = await _context.PageSections.CountAsync();
            var activeSections = await _context.PageSections.CountAsync(s => !s.Disable);
            var disabledSections = totalSections - activeSections;
            var homePage = await _context.WebPages.FirstOrDefaultAsync(p => p.IsHomePage || p.DirectUrl == "/" || p.DirectUrl == "home" || p.DirectUrl == "index");
            var homeSections = homePage != null ? await _context.PageSections.CountAsync(s => s.WebPageId == homePage.Id && !s.Disable) : 0;

            // 3. Menu Categories & Navigation Metrics
            var totalCategories = await _context.PageCategories.CountAsync();
            var publishedCategories = await _context.PageCategories.CountAsync(c => c.Publish);
            var topMenuItems = await _context.WebPages.CountAsync(p => p.ShowInMainMenu && p.Publish);
            var dropdownItems = await _context.WebPages.CountAsync(p => p.ShowInMenuDropDown && p.Publish);
            var footerLinks = await _context.WebPages.CountAsync(p => p.ShowInFooter && p.Publish);

            // 4. Forms & Submissions Metrics
            var totalForms = await _context.PageForms.CountAsync();
            var activeForms = await _context.PageForms.CountAsync(f => f.IsActive);
            var totalSubmissions = await _context.PageFormSubmissions.CountAsync();
            var newSubmissions = await _context.PageFormSubmissions.CountAsync(s => s.Status == "New");

            // 5. Blogs & Sections
            var totalSliders = 0;
            var publishedSliders = 0;
            var totalFaqs = 0;
            var publishedFaqs = 0;
            var totalFaqCategories = 0;
            var totalBlogs = await _context.Blogs.CountAsync();
            var totalBlogCategories = await _context.BlogCategories.CountAsync();

            // 6. Active Theme Suite & Blueprints
            var blueprintCount = await _context.TenantInstalledTemplates.CountAsync();
            var activeInjections = await _context.SiteCodeInjectionTags.CountAsync(t => t.IsActive);

            var activeHeroOrMenu = await _context.TenantInstalledTemplates
                .FirstOrDefaultAsync(t => (t.CategoryKey.ToLower() == "hero" || t.CategoryKey.ToLower() == "menu") && t.IsActive);

            string activeTemplateName = activeHeroOrMenu != null && !string.IsNullOrWhiteSpace(activeHeroOrMenu.Name)
                ? activeHeroOrMenu.Name
                : "Corporate Suite";

            // Helper: Check if a webpage uses direct routing, external URL, or dedicated system destination
            bool IsDirectOrSystemPage(WebPage p)
            {
                if (p.EnableDirectUrl) return true;
                if (p.IsMenuCTA) return true;
                if (!string.IsNullOrWhiteSpace(p.MenuCtaUrl)) return true;
                if (string.IsNullOrWhiteSpace(p.DirectUrl)) return false;

                var slug = p.DirectUrl.Trim().ToLowerInvariant();
                return slug.StartsWith("http://") ||
                       slug.StartsWith("https://") ||
                       slug.StartsWith("mailto:") ||
                       slug.StartsWith("tel:") ||
                       slug.StartsWith("/auth") || slug.StartsWith("auth/") ||
                       slug.StartsWith("/portal") || slug.StartsWith("portal/") ||
                       slug.StartsWith("/store") || slug.StartsWith("store/") ||
                       slug.StartsWith("/login") || slug.StartsWith("login") ||
                       slug.StartsWith("/register") || slug.StartsWith("register") ||
                       slug.StartsWith("/admin") || slug.StartsWith("admin/") ||
                       slug.StartsWith("/settings") || slug.StartsWith("settings/") ||
                       slug.StartsWith("/users") || slug.StartsWith("users/") ||
                       slug.StartsWith("/products") || slug.StartsWith("products/") ||
                       slug.StartsWith("#");
            }

            // 7. Content Health Diagnostics & Inaccessible Pages Audit
            // Exclude direct URL, system routes, and menu CTA pages from empty section checks
            var allWebPagesForAudit = await _context.WebPages
                .AsNoTracking()
                .Include(p => p.PageSections)
                .ToListAsync();

            // Detect genuine broken pages: missing direct URL slug OR published content page with 0 active layout sections
            var issuesList = allWebPagesForAudit
                .Where(p => string.IsNullOrWhiteSpace(p.DirectUrl) ||
                            (p.Publish && !IsDirectOrSystemPage(p) && (p.PageSections == null || !p.PageSections.Any(s => !s.Disable))))
                .ToList();

            var emptyPagesCount = issuesList.Count;

            // 8. Real Most Visited Web Pages from Database (Aggregating ViewCount & WebPageViewLogs)
            var allPagesForViews = await _context.WebPages
                .AsNoTracking()
                .Include(p => p.PageCategory)
                .ToListAsync();

            var allLogs = await _context.WebPageViewLogs
                .AsNoTracking()
                .Select(l => new { l.Id, l.WebPageId, PageUrl = (l.PageUrl ?? string.Empty).Trim().ToLower() })
                .ToListAsync();

            var mostVisitedPages = allPagesForViews
                .Select(p =>
                {
                    var cleanUrl = (p.DirectUrl ?? string.Empty).Trim().ToLower().Trim('/');
                    var slashUrl = "/" + cleanUrl;

                    // Each unique log entry is counted at most once for this page
                    var logCount = allLogs.Count(l =>
                        (l.WebPageId.HasValue && l.WebPageId.Value == p.Id) ||
                        (!l.WebPageId.HasValue && !string.IsNullOrEmpty(l.PageUrl) && (l.PageUrl == slashUrl || l.PageUrl == cleanUrl || l.PageUrl.Trim('/') == cleanUrl)));

                    // If logs exist, the distinct logged events count is the authoritative count of real user visits;
                    // otherwise fall back to the stored ViewCount.
                    var totalVisits = logCount > 0 ? (long)logCount : (long)p.ViewCount;
                    return new
                    {
                        id = p.Id,
                        title = p.Title ?? "Untitled Page",
                        slug = p.DirectUrl ?? "home",
                        views = totalVisits,
                        publish = p.Publish,
                        category = p.PageCategory != null ? p.PageCategory.Title : "Standalone"
                    };
                })
                .OrderByDescending(p => p.views)
                .Take(7)
                .ToList();

            // 9. Real Broken / Inaccessible Pages Alert Detector from Database
            var brokenPages = issuesList
                .Take(50)
                .Select(p => new
                {
                    id = p.Id,
                    title = p.Title ?? "Untitled Page",
                    slug = p.DirectUrl ?? "(No Direct URL)",
                    issue = string.IsNullOrWhiteSpace(p.DirectUrl) ? "Missing URL Slug" :
                            "Published Content Page with 0 Layout Sections Attached",
                    updatedUtc = p.UpdatedAtUtc ?? p.CreatedAtUtc
                })
                .ToList();

            // 9. Real Timeframe Range Cutoff
            DateTime cutoff = range?.ToLowerInvariant() switch
            {
                "7d" => DateTime.UtcNow.AddDays(-7),
                "30d" => DateTime.UtcNow.AddDays(-30),
                "1y" => DateTime.UtcNow.AddYears(-1),
                _ => DateTime.UtcNow.AddHours(-24)
            };

            // Query Real Logs from WebPageViewLogs
            var recentLogs = await _context.WebPageViewLogs
                .AsNoTracking()
                .Where(l => l.CreatedAtUtc >= cutoff)
                .ToListAsync();

            // 10. Build Real Histogram from Database Logs
            var histogram = BuildRealDatabaseHistogram(range ?? "24h", recentLogs);

            // 11. Build Real Device Breakdown from Database Logs
            var totalRecentLogs = recentLogs.Count;
            var deviceGroups = recentLogs
                .GroupBy(l => l.DeviceType ?? "Desktop")
                .ToDictionary(g => g.Key, g => g.Count());

            var deviceStats = new List<object>();
            var knownDevices = new[] { "Desktop (Windows/Mac)", "Android Mobile", "iOS (iPhone/iPad)", "Huawei & Other" };
            foreach (var d in knownDevices)
            {
                var count = deviceGroups.ContainsKey(d) ? deviceGroups[d] :
                            deviceGroups.ContainsKey(d.Split(' ')[0]) ? deviceGroups[d.Split(' ')[0]] : 0;
                var pct = totalRecentLogs > 0 ? (int)Math.Round((double)count / totalRecentLogs * 100) : 0;
                deviceStats.Add(new { name = d, percentage = pct, count });
            }

            if (totalRecentLogs == 0)
            {
                deviceStats = new List<object>
                {
                    new { name = "Desktop (Windows/Mac)", percentage = 0, count = 0 },
                    new { name = "Android Mobile", percentage = 0, count = 0 },
                    new { name = "iOS (iPhone/iPad)", percentage = 0, count = 0 },
                    new { name = "Huawei & Other", percentage = 0, count = 0 }
                };
            }

            // 12. Build Real Browser Breakdown from Database Logs
            var browserGroups = recentLogs
                .GroupBy(l => l.Browser ?? "Google Chrome")
                .ToDictionary(g => g.Key, g => g.Count());

            var browserStats = new List<object>();
            var knownBrowsers = new[]
            {
                new { name = "Google Chrome", color = "#2563eb" },
                new { name = "Apple Safari", color = "#0284c7" },
                new { name = "Microsoft Edge", color = "#0d9488" },
                new { name = "Mozilla Firefox", color = "#ea580c" },
                new { name = "Other Browsers", color = "#64748b" }
            };

            foreach (var b in knownBrowsers)
            {
                var count = browserGroups.ContainsKey(b.name) ? browserGroups[b.name] :
                            browserGroups.ContainsKey(b.name.Split(' ').Last()) ? browserGroups[b.name.Split(' ').Last()] : 0;
                var pct = totalRecentLogs > 0 ? (int)Math.Round((double)count / totalRecentLogs * 100) : 0;
                browserStats.Add(new { name = b.name, percentage = pct, color = b.color, count });
            }

            var response = new
            {
                metrics = new
                {
                    totalPages,
                    publishedPages,
                    draftPages,
                    unpublishedPages = draftPages,
                    legalAndSecurityPages,
                    menuCtaPages,
                    totalSections,
                    activeSections,
                    disabledSections,
                    homeSections,
                    totalCategories,
                    publishedCategories,
                    unpublishedCategories = totalCategories - publishedCategories,
                    topMenuItems,
                    dropdownItems,
                    footerLinks,
                    totalSliders,
                    publishedSliders,
                    totalFaqs,
                    publishedFaqs,
                    totalFaqCategories,
                    totalForms,
                    activeForms,
                    totalSubmissions,
                    newSubmissions,
                    blueprintCount,
                    activeInjections,
                    emptyPagesCount,
                    templateName = activeTemplateName
                },
                mostVisitedPages,
                brokenPages,
                timelineRange = range,
                trafficHistogram = histogram,
                deviceStats,
                browserStats
            };

            return Ok(ApiResponse<object>.SuccessResponse(response, "CMS dashboard database analytics retrieved."));
        }

        private static List<object> BuildRealDatabaseHistogram(string range, List<WebPageViewLog> logs)
        {
            var list = new List<object>();

            switch (range?.ToLowerInvariant())
            {
                case "7d":
                    for (int i = 6; i >= 0; i--)
                    {
                        var day = DateTime.UtcNow.AddDays(-i).Date;
                        var dayLogs = logs.Where(l => l.CreatedAtUtc.Date == day).ToList();
                        list.Add(new
                        {
                            label = day.ToString("ddd"),
                            visits = dayLogs.Count,
                            uniqueUsers = dayLogs.Select(l => l.IpAddress).Distinct().Count()
                        });
                    }
                    break;

                case "30d":
                    for (int i = 29; i >= 0; i -= 3)
                    {
                        var start = DateTime.UtcNow.AddDays(-i).Date;
                        var end = start.AddDays(3);
                        var intervalLogs = logs.Where(l => l.CreatedAtUtc.Date >= start && l.CreatedAtUtc.Date < end).ToList();
                        list.Add(new
                        {
                            label = start.ToString("MMM dd"),
                            visits = intervalLogs.Count,
                            uniqueUsers = intervalLogs.Select(l => l.IpAddress).Distinct().Count()
                        });
                    }
                    break;

                case "1y":
                    for (int i = 11; i >= 0; i--)
                    {
                        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-i);
                        var monthEnd = monthStart.AddMonths(1);
                        var monthLogs = logs.Where(l => l.CreatedAtUtc >= monthStart && l.CreatedAtUtc < monthEnd).ToList();
                        list.Add(new
                        {
                            label = monthStart.ToString("MMM"),
                            visits = monthLogs.Count,
                            uniqueUsers = monthLogs.Select(l => l.IpAddress).Distinct().Count()
                        });
                    }
                    break;

                default: // 24h
                    for (int i = 7; i >= 0; i--)
                    {
                        var hour = DateTime.UtcNow.AddHours(-i * 3);
                        var hourStart = hour.AddHours(-3);
                        var bucketLogs = logs.Where(l => l.CreatedAtUtc >= hourStart && l.CreatedAtUtc <= hour).ToList();
                        list.Add(new
                        {
                            label = hour.ToString("HH:00"),
                            visits = bucketLogs.Count,
                            uniqueUsers = bucketLogs.Select(l => l.IpAddress).Distinct().Count()
                        });
                    }
                    break;
            }

            return list;
        }
    }
}
