using System;
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
    /// Page model for deep inspection of an immutable security audit event,
    /// comparing JSON state diffs and analyzing caller security headers.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<DetailsModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public DetailsModel(MasterCatalogDbContext context, ILogger<DetailsModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the target audit log entry.
        /// </summary>
        public MasterAuditLog AuditEntry { get; set; } = null!;

        /// <summary>
        /// Handles HTTP GET request to load audit entry and diff snapshots.
        /// </summary>
        /// <param name="id">The unique identifier of the audit log record.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid? id)
        {
            if (!id.HasValue || id.Value == Guid.Empty)
            {
                return RedirectToPage("/AuditLog/Index");
            }

            var entry = await _context.MasterAuditLogs
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == id.Value);

            if (entry == null)
            {
                return NotFound();
            }

            AuditEntry = entry;
            return Page();
        }
    }
}
