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
    public class ArticleModel : PageModel
    {
        private readonly DashboardDbContext _context;

        public ArticleModel(DashboardDbContext context)
        {
            _context = context;
        }

        public BcpManualPage Article { get; set; }
        public List<BcpManualElement> AccessibleElements { get; set; } = new List<BcpManualElement>();

        public async Task<IActionResult> OnGetAsync(string module, Guid id)
        {
            Article = await _context.BcpManualPages
                .Include(p => p.BcpManual)
                .Include(p => p.BcpManualElements)
                .FirstOrDefaultAsync(p => p.Id == id && p.BcpManual.ModuleFolder.ToLower() == module.ToLower());

            if (Article == null) return NotFound();

            var isSuperAdmin = User.IsInRole("PlatformOwner");
            var userRoles = User.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();

            foreach (var el in Article.BcpManualElements)
            {
                if (isSuperAdmin || string.IsNullOrEmpty(el.RequiredRole) || userRoles.Contains(el.RequiredRole))
                {
                    AccessibleElements.Add(el);
                }
            }

            // If the article has elements but user can't see ANY, deny access
            if (Article.BcpManualElements.Any() && !AccessibleElements.Any())
            {
                return RedirectToPage("Module", new { module = module });
            }

            return Page();
        }
    }
}

