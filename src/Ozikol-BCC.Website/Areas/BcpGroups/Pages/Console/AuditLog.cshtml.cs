using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Console
{
    [Authorize]
    public class AuditLogModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public AuditLogModel(DashboardDbContext db)
        {
            _db = db;
        }

        public Guid GroupId { get; set; }
        public string GroupTitle { get; set; } = string.Empty;
        public List<BcpChatAuditLog> AuditLogs { get; set; } = new();

        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            GroupId = id;
            var group = await _db.BcpGroups.FindAsync(id);
            if (group == null) return NotFound();

            GroupTitle = group.Title;

            AuditLogs = await _db.BcpChatAuditLogs
                .Where(a => a.GroupId == id)
                .Include(a => a.User)
                .OrderByDescending(a => a.Timestamp)
                .Take(100)
                .ToListAsync();

            return Page();
        }
    }
}
