using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Pages.KnowledgeBase
{
    [AllowAnonymous]
    public class ModuleModel : PageModel
    {
        private readonly DashboardDbContext _context;

        public ModuleModel(DashboardDbContext context)
        {
            _context = context;
        }

        public BcpManual Manual { get; set; }
        public List<BcpManualPage> AccessiblePages { get; set; } = new List<BcpManualPage>();

        public async Task<IActionResult> OnGetAsync(string module)
        {
            if (string.IsNullOrEmpty(module)) return RedirectToPage("Index");

            Manual = await _context.BcpManuals
                .Include(m => m.BcpManualPages)
                    .ThenInclude(p => p.BcpManualElements)
                .FirstOrDefaultAsync(m => m.ModuleFolder.ToLower() == module.ToLower());

            if (Manual == null) return NotFound();

            var isSuperAdmin = User.IsInRole("PlatformOwner");
            var userRoles = User.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();

            foreach (var page in Manual.BcpManualPages.OrderBy(p => p.PageTitle))
            {
                if (page.BcpManualElements == null || !page.BcpManualElements.Any())
                {
                    AccessiblePages.Add(page);
                    continue;
                }

                bool hasAccess = false;
                foreach (var el in page.BcpManualElements)
                {
                    if (isSuperAdmin || string.IsNullOrEmpty(el.RequiredRole) || userRoles.Contains(el.RequiredRole))
                    {
                        hasAccess = true;
                        break;
                    }
                }

                if (hasAccess)
                {
                    AccessiblePages.Add(page);
                }
            }

            // If user has no access to any pages here, they shouldn't see the module
            if (!AccessiblePages.Any())
                return RedirectToPage("Index");

            return Page();
        }
    }
}

