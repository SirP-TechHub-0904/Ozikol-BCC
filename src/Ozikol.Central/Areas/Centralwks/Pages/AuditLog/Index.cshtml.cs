using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.AuditLog
{
    /// <summary>
    /// Page model for reviewing immutable security audit trail events, operator actions,
    /// and compliance history in Centralwks.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public IndexModel(MasterCatalogDbContext context, ILogger<IndexModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the list of audit log records.
        /// </summary>
        public IList<MasterAuditLog> AuditLogs { get; set; } = new List<MasterAuditLog>();

        /// <summary>
        /// Gets or sets available action types for filtering.
        /// </summary>
        public IList<string> AvailableActions { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets available entity types for filtering.
        /// </summary>
        public IList<string> AvailableEntities { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets total audit events count.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Gets or sets events logged today.
        /// </summary>
        public int EventsTodayCount { get; set; }

        /// <summary>
        /// Gets or sets distinct operators count.
        /// </summary>
        public int OperatorsCount { get; set; }

        /// <summary>
        /// Gets or sets search query.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Gets or sets action verb filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? ActionFilter { get; set; }

        /// <summary>
        /// Gets or sets entity type filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? EntityFilter { get; set; }

        /// <summary>
        /// Handles HTTP GET request to query security audit logs.
        /// </summary>
        public async Task OnGetAsync()
        {
            TotalCount = await _context.MasterAuditLogs.CountAsync();
            
            var todayUtc = DateTime.UtcNow.Date;
            EventsTodayCount = await _context.MasterAuditLogs.CountAsync(l => l.CreatedUtc >= todayUtc);

            OperatorsCount = await _context.MasterAuditLogs
                .Where(l => l.UserName != null)
                .Select(l => l.UserName)
                .Distinct()
                .CountAsync();

            AvailableActions = await _context.MasterAuditLogs
                .Select(l => l.Action)
                .Distinct()
                .OrderBy(a => a)
                .ToListAsync();

            AvailableEntities = await _context.MasterAuditLogs
                .Select(l => l.EntityType)
                .Distinct()
                .OrderBy(e => e)
                .ToListAsync();

            var query = _context.MasterAuditLogs
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                query = query.Where(l => (l.UserName != null && l.UserName.ToLower().Contains(term))
                                      || (l.Summary != null && l.Summary.ToLower().Contains(term))
                                      || (l.IpAddress != null && l.IpAddress.ToLower().Contains(term))
                                      || (l.EntityId != null && l.EntityId.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(ActionFilter) && ActionFilter != "All")
            {
                query = query.Where(l => l.Action == ActionFilter);
            }

            if (!string.IsNullOrWhiteSpace(EntityFilter) && EntityFilter != "All")
            {
                query = query.Where(l => l.EntityType == EntityFilter);
            }

            AuditLogs = await query
                .OrderByDescending(l => l.CreatedUtc)
                .Take(100)
                .ToListAsync();
        }
    }
}
