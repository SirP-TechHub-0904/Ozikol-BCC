using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
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
    [Authorize(Roles = "SuperAdmin,Admin,CmsManager,ContentManager")]
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
            // 1. Real Counts from Database
            var totalPages = await _context.WebPages.CountAsync();
            var publishedPages = await _context.WebPages.CountAsync(p => p.Publish);
            var unpublishedPages = totalPages - publishedPages;

            var totalCategories = await _context.PageCategories.CountAsync();
            var publishedCategories = await _context.PageCategories.CountAsync(c => c.Publish);
            var unpublishedCategories = totalCategories - publishedCategories;

            var totalSliders = await _context.Sliders.CountAsync();
            var publishedSliders = await _context.Sliders.CountAsync(s => s.Show);

            var totalFaqs = await _context.FAQs.CountAsync();
            var publishedFaqs = await _context.FAQs.CountAsync(f => f.Show);
            var totalFaqCategories = await _context.FAQCategories.CountAsync();

            var totalBlogs = await _context.Blogs.CountAsync();
            var totalBlogCategories = await _context.BlogCategories.CountAsync();

            // 2. Real Most Visited Web Pages from Database
            var mostVisitedPages = await _context.WebPages
                .AsNoTracking()
                .OrderByDescending(p => p.ViewCount)
                .Take(7)
                .Select(p => new
                {
                    id = p.Id,
                    title = p.Title ?? "Untitled Page",
                    slug = p.DirectUrl ?? "home",
                    views = p.ViewCount,
                    publish = p.Publish,
                    category = p.PageCategory != null ? p.PageCategory.Title : "Standalone"
                })
                .ToListAsync();

            // 3. Real Broken / Inaccessible Pages Alert Detector from Database
            var brokenPages = await _context.WebPages
                .AsNoTracking()
                .Where(p => string.IsNullOrWhiteSpace(p.DirectUrl) || !p.Publish || (p.PageSections == null || !p.PageSections.Any()))
                .Take(5)
                .Select(p => new
                {
                    id = p.Id,
                    title = p.Title ?? "Untitled Page",
                    slug = p.DirectUrl ?? "(No Direct URL)",
                    issue = string.IsNullOrWhiteSpace(p.DirectUrl) ? "Missing URL Slug" :
                            !p.Publish ? "Unpublished / Draft Mode" : "No Layout Sections Attached",
                    updatedUtc = p.UpdatedAtUtc ?? p.CreatedAtUtc
                })
                .ToListAsync();

            // 4. Real Timeframe Range Cutoff
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

            // 5. Build Real Histogram from Database Logs
            var histogram = BuildRealDatabaseHistogram(range ?? "24h", recentLogs);

            // 6. Build Real Device Breakdown from Database Logs
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

            // If no logs yet in brand new DB, provide clean 0 baseline
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

            // 7. Build Real Browser Breakdown from Database Logs
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
                    unpublishedPages,
                    totalCategories,
                    publishedCategories,
                    unpublishedCategories,
                    totalSliders,
                    publishedSliders,
                    totalFaqs,
                    publishedFaqs,
                    totalFaqCategories,
                    totalBlogs,
                    totalBlogCategories,
                    templateName = "Ozikol Enterprise Clean Pro"
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
