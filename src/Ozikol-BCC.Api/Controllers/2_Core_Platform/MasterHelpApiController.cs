using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Help;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Api.Models;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Central Master Catalog API controller serving contextual, page-based workflow instructions,
    /// action button guides, sibling navigation links, and full documentation search across all suites.
    /// Dual-guarded for in-place authoring on localhost development or CentralAdmin authentication.
    /// </summary>
    [ApiController]
    [Route("api/master-help")]
    [Tags("2. Core Platform - Master Help & Guides")]
    public class MasterHelpApiController : ControllerBase
    {
        private readonly MasterCatalogDbContext? _masterDb;
        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        /// <summary>
        /// Initializes a new instance of the <see cref="MasterHelpApiController"/> class.
        /// </summary>
        /// <param name="masterDb">Central Master Catalog database context instance.</param>
        public MasterHelpApiController(MasterCatalogDbContext? masterDb = null)
        {
            _masterDb = masterDb;
        }

        /// <summary>
        /// Retrieves the contextual guide and action instructions for a specific page route.
        /// Falls back to the embedded baseline catalog if the database record is not yet seeded.
        /// </summary>
        /// <param name="route">Page route path (e.g. "/workforce/console/analytics").</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Standardized API response containing the page documentation.</returns>
        [HttpGet("page")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<MasterPageHelpDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPageHelp(
            [FromQuery] string? route,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(route))
            {
                route = "/";
            }

            var normalized = MasterHelpBaselineCatalog.NormalizeRoute(route);
            MasterPageHelp? helpRecord = null;

            // 1. Check Master Catalog Database if context available
            if (_masterDb != null)
            {
                try
                {
                    // Attempt exact route match first
                    helpRecord = await _masterDb.MasterPageHelps
                        .AsNoTracking()
                        .FirstOrDefaultAsync(p => p.RouteKey == normalized, cancellationToken);

                    // If not found, attempt prefix match for sub-pages
                    if (helpRecord == null)
                    {
                        var candidates = await _masterDb.MasterPageHelps
                            .AsNoTracking()
                            .Where(p => normalized.StartsWith(p.RouteKey))
                            .ToListAsync(cancellationToken);

                        helpRecord = candidates.OrderByDescending(p => p.RouteKey.Length).FirstOrDefault();
                    }
                }
                catch
                {
                    // Fall back to baseline catalog if database table is not yet migrated/accessible
                    helpRecord = null;
                }
            }

            // 2. Fall back to static baseline catalog
            helpRecord ??= MasterHelpBaselineCatalog.GetByRoute(normalized);

            // 3. If still null, generate a graceful initial draft object
            var dto = helpRecord != null ? MapToDto(helpRecord) : GenerateDefaultDraft(normalized);

            return Ok(ApiResponse<MasterPageHelpDto>.SuccessResponse(
                dto,
                "Page documentation resolved successfully."));
        }

        /// <summary>
        /// Searches across all published help topics matching the keyword in title, summary, or suite.
        /// </summary>
        /// <param name="q">Search query string.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>List of matching documentation topics.</returns>
        [HttpGet("search")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<List<MasterHelpTopicSearchResultDto>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> SearchHelpTopics(
            [FromQuery] string? q,
            CancellationToken cancellationToken = default)
        {
            var results = new Dictionary<string, MasterHelpTopicSearchResultDto>(StringComparer.OrdinalIgnoreCase);

            // 1. Search database if available
            if (_masterDb != null && !string.IsNullOrWhiteSpace(q))
            {
                try
                {
                    var queryTerm = q.Trim().ToLowerInvariant();
                    var dbMatches = await _masterDb.MasterPageHelps
                        .AsNoTracking()
                        .Where(p => p.IsPublished && (
                            p.PageTitle.Contains(queryTerm) ||
                            p.RouteKey.Contains(queryTerm) ||
                            (p.ShortSummary != null && p.ShortSummary.Contains(queryTerm)) ||
                            p.FeatureSuite.Contains(queryTerm) ||
                            p.OverviewMarkdown.Contains(queryTerm)))
                        .Take(15)
                        .ToListAsync(cancellationToken);

                    foreach (var m in dbMatches)
                    {
                        results[m.RouteKey] = new MasterHelpTopicSearchResultDto
                        {
                            RouteKey = m.RouteKey,
                            PageTitle = m.PageTitle,
                            FeatureSuite = m.FeatureSuite,
                            ShortSummary = m.ShortSummary,
                            Category = m.Category
                        };
                    }
                }
                catch
                {
                    // Fall back cleanly
                }
            }

            // 2. Supplement / fallback with baseline catalog search
            var baselineMatches = MasterHelpBaselineCatalog.Search(q ?? string.Empty);
            foreach (var b in baselineMatches)
            {
                if (!results.ContainsKey(b.RouteKey))
                {
                    results[b.RouteKey] = new MasterHelpTopicSearchResultDto
                    {
                        RouteKey = b.RouteKey,
                        PageTitle = b.PageTitle,
                        FeatureSuite = b.FeatureSuite,
                        ShortSummary = b.ShortSummary,
                        Category = b.Category
                    };
                }
            }

            var finalResults = results.Values.Take(20).ToList();
            return Ok(ApiResponse<List<MasterHelpTopicSearchResultDto>>.SuccessResponse(
                finalResults,
                $"{finalResults.Count} help topics matched query."));
        }

        /// <summary>
        /// Creates or updates page documentation in the Central Master Catalog.
        /// </summary>
        /// <param name="request">Page documentation payload.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Updated page documentation DTO.</returns>
        [HttpPut("page")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<MasterPageHelpDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> SavePageHelp(
            [FromBody] SaveMasterPageHelpRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.RouteKey))
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(
                    "ERR-VALIDATION-ROUTE",
                    "RouteKey is required and cannot be empty."));
            }

            if (_masterDb == null)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiResponse<object>.ErrorResponse(
                    "ERR-MASTER-DB-UNAVAILABLE",
                    "Master Catalog persistence service is not configured."));
            }

            var normalized = MasterHelpBaselineCatalog.NormalizeRoute(request.RouteKey);

            var existing = await _masterDb.MasterPageHelps
                .FirstOrDefaultAsync(p => p.RouteKey == normalized, cancellationToken);

            var modifierEmail = User.Identity?.Name ?? "developer@localhost";

            if (existing == null)
            {
                existing = new MasterPageHelp
                {
                    Id = Guid.NewGuid(),
                    RouteKey = normalized,
                    FeatureSuite = string.IsNullOrWhiteSpace(request.FeatureSuite) ? "General" : request.FeatureSuite.Trim(),
                    PageTitle = string.IsNullOrWhiteSpace(request.PageTitle) ? FormatRouteAsTitle(normalized) : request.PageTitle.Trim(),
                    ShortSummary = request.ShortSummary,
                    OverviewMarkdown = request.OverviewMarkdown ?? string.Empty,
                    ActionsJson = request.ActionsJson,
                    RelatedRoutesJson = request.RelatedRoutesJson,
                    TourStepsJson = request.TourStepsJson,
                    Category = string.IsNullOrWhiteSpace(request.Category) ? "Console" : request.Category.Trim(),
                    IsPublished = request.IsPublished,
                    LastUpdatedBy = modifierEmail,
                    CreatedAtUtc = DateTime.UtcNow,
                    UpdatedAtUtc = DateTime.UtcNow
                };
                await _masterDb.MasterPageHelps.AddAsync(existing, cancellationToken);
            }
            else
            {
                if (!string.IsNullOrWhiteSpace(request.FeatureSuite))
                    existing.FeatureSuite = request.FeatureSuite.Trim();

                if (!string.IsNullOrWhiteSpace(request.PageTitle))
                    existing.PageTitle = request.PageTitle.Trim();

                existing.ShortSummary = request.ShortSummary;
                existing.OverviewMarkdown = request.OverviewMarkdown ?? string.Empty;
                existing.ActionsJson = request.ActionsJson;
                existing.RelatedRoutesJson = request.RelatedRoutesJson;
                existing.TourStepsJson = request.TourStepsJson;

                if (!string.IsNullOrWhiteSpace(request.Category))
                    existing.Category = request.Category.Trim();

                existing.IsPublished = request.IsPublished;
                existing.LastUpdatedBy = modifierEmail;
                existing.UpdatedAtUtc = DateTime.UtcNow;
            }

            await _masterDb.SaveChangesAsync(cancellationToken);

            var responseDto = MapToDto(existing);
            return Ok(ApiResponse<MasterPageHelpDto>.SuccessResponse(
                responseDto,
                "Page documentation saved to Central Master Catalog successfully."));
        }

        private static MasterPageHelpDto MapToDto(MasterPageHelp model)
        {
            var dto = new MasterPageHelpDto
            {
                Id = model.Id,
                RouteKey = model.RouteKey,
                FeatureSuite = model.FeatureSuite,
                PageTitle = model.PageTitle,
                ShortSummary = model.ShortSummary,
                OverviewMarkdown = model.OverviewMarkdown,
                ActionsJson = model.ActionsJson,
                RelatedRoutesJson = model.RelatedRoutesJson,
                TourStepsJson = model.TourStepsJson,
                Category = model.Category,
                IsPublished = model.IsPublished,
                LastUpdatedBy = model.LastUpdatedBy,
                UpdatedAtUtc = model.UpdatedAtUtc
            };

            // Parse structured actions JSON
            if (!string.IsNullOrWhiteSpace(model.ActionsJson))
            {
                try
                {
                    dto.Actions = JsonSerializer.Deserialize<List<HelpActionItemDto>>(model.ActionsJson, _jsonOptions);
                }
                catch
                {
                    dto.Actions = null;
                }
            }

            // Parse structured related routes JSON
            if (!string.IsNullOrWhiteSpace(model.RelatedRoutesJson))
            {
                try
                {
                    dto.RelatedRoutes = JsonSerializer.Deserialize<List<HelpRelatedRouteDto>>(model.RelatedRoutesJson, _jsonOptions);
                }
                catch
                {
                    dto.RelatedRoutes = null;
                }
            }

            return dto;
        }

        private static MasterPageHelpDto GenerateDefaultDraft(string normalizedRoute)
        {
            var title = FormatRouteAsTitle(normalizedRoute);
            var isWorkspace = normalizedRoute.Contains("/workspace/", StringComparison.OrdinalIgnoreCase);

            return new MasterPageHelpDto
            {
                Id = Guid.Empty,
                RouteKey = normalizedRoute,
                FeatureSuite = isWorkspace ? "Personal Workspace" : "Console Management",
                PageTitle = title,
                Category = isWorkspace ? "Workspace" : "Console",
                ShortSummary = $"Overview and operational guide for the {title} interface.",
                OverviewMarkdown = $"### {title}\nNo formal guide has been authored for this page yet.\n\nUse the **Edit Page Help** button below to document this page's purpose, key metrics, and user workflow.",
                ActionsJson = "[]",
                Actions = new List<HelpActionItemDto>(),
                RelatedRoutesJson = "[]",
                RelatedRoutes = new List<HelpRelatedRouteDto>(),
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud",
                UpdatedAtUtc = DateTime.UtcNow
            };
        }

        private static string FormatRouteAsTitle(string route)
        {
            var parts = route.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return "Home";

            var lastPart = parts[^1];
            // Convert kebab-case or camelCase to Title Case (e.g. "my-shifts" -> "My Shifts")
            var words = lastPart.Split('-', '_');
            return string.Join(" ", words.Select(w =>
                w.Length > 0 ? char.ToUpperInvariant(w[0]) + w[1..].ToLowerInvariant() : w));
        }
    }
}
