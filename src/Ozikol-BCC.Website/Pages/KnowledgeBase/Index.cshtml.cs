using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Pages.KnowledgeBase
{
    [AllowAnonymous]
    public class IndexModel : PageModel
    {
        private readonly DashboardDbContext _context;

        public IndexModel(DashboardDbContext context)
        {
            _context = context;
        }

        public List<BcpManual> Manuals { get; set; } = new List<BcpManual>();

        public async Task OnGetAsync()
        {
            var isSuperAdmin = User.IsInRole("PlatformOwner");
            var userRoles = User.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();

            var allManuals = await _context.BcpManuals
                .Include(m => m.BcpManualPages)
                    .ThenInclude(p => p.BcpManualElements)
                .OrderBy(m => m.Title)
                .ToListAsync();

            // Filter manuals based on whether the user has access to at least one element
            foreach (var manual in allManuals)
            {
                bool hasAccess = false;

                if (!manual.BcpManualPages.Any()) 
                    continue; // Skip empty manuals

                foreach (var page in manual.BcpManualPages)
                {
                    if (page.BcpManualElements == null || !page.BcpManualElements.Any())
                    {
                        hasAccess = true; // Page with no elements is considered public
                        break;
                    }

                    foreach (var el in page.BcpManualElements)
                    {
                        if (isSuperAdmin || string.IsNullOrEmpty(el.RequiredRole) || userRoles.Contains(el.RequiredRole))
                        {
                            hasAccess = true;
                            break;
                        }
                    }
                    if (hasAccess) break;
                }

                if (hasAccess)
                {
                    Manuals.Add(manual);
                }
            }
        }
    }
}

