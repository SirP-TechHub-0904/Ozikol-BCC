using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Creators
{
    /// <summary>
    /// PageModel displaying approved UI template creators, studio profiles, design specializations,
    /// and creator partner program metrics.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public IndexModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Search keyword filter for creator code, name, studio, or specialization.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Specialization filter (e.g. "SaaS Dashboards", "Landing Pages", "E-Commerce").
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Specialization { get; set; }

        /// <summary>
        /// 1-based page number.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageNumber { get; set; } = 1;

        /// <summary>
        /// List of approved creators.
        /// </summary>
        public List<MasterCreatorApplication> Creators { get; set; } = new();

        /// <summary>
        /// Count of approved creators.
        /// </summary>
        public int ApprovedCount { get; set; }

        /// <summary>
        /// Count of applications awaiting review.
        /// </summary>
        public int PendingApplicationsCount { get; set; }

        /// <summary>
        /// Total applications ever received.
        /// </summary>
        public int TotalApplicationsCount { get; set; }

        /// <summary>
        /// Distinct specializations list for filter dropdown.
        /// </summary>
        public List<string> SpecializationsList { get; set; } = new();

        /// <summary>
        /// Total pagination pages.
        /// </summary>
        public int TotalPages { get; set; }

        /// <summary>
        /// Page size for pagination.
        /// </summary>
        public const int PageSize = 15;

        /// <summary>
        /// Operation status message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to query approved creators and metrics.
        /// </summary>
        public async Task OnGetAsync()
        {
            var baseQuery = _dbContext.MasterCreatorApplications.AsNoTracking();

            TotalApplicationsCount = await baseQuery.CountAsync();
            ApprovedCount = await baseQuery.CountAsync(c => c.Status == "Approved");
            PendingApplicationsCount = await baseQuery.CountAsync(c => c.Status == "UnderReview");

            SpecializationsList = await baseQuery
                .Select(c => c.Specialization)
                .Distinct()
                .OrderBy(s => s)
                .ToListAsync();

            var query = _dbContext.MasterCreatorApplications
                .AsNoTracking()
                .Where(c => c.Status == "Approved");

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(c =>
                    c.CreatorCode.ToLower().Contains(term) ||
                    c.FullName.ToLower().Contains(term) ||
                    (c.StudioOrBrandName != null && c.StudioOrBrandName.ToLower().Contains(term)) ||
                    c.Email.ToLower().Contains(term) ||
                    c.Specialization.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(Specialization))
            {
                query = query.Where(c => c.Specialization == Specialization);
            }

            TotalPages = (int)Math.Ceiling(await query.CountAsync() / (double)PageSize);
            if (PageNumber < 1) PageNumber = 1;

            Creators = await query
                .OrderBy(c => c.FullName)
                .Skip((PageNumber - 1) * PageSize)
                .Take(PageSize)
                .ToListAsync();
        }
    }
}
