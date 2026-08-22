using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Workspace
{
    [Authorize]
    public class FilesModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public FilesModel(DashboardDbContext db)
        {
            _db = db;
        }

        public BcpGroup Group { get; set; } = null!;
        public List<BcpGroupFile> Files { get; set; } = new();

        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var group = await _db.BcpGroups.FindAsync(id);
            if (group == null) return NotFound();
            Group = group;

            Files = await _db.BcpGroupFiles
                .Where(f => f.BcpGroupId == id)
                .Include(f => f.UploadedByUser)
                .OrderByDescending(f => f.UploadedAt)
                .ToListAsync();

            return Page();
        }
    }
}
