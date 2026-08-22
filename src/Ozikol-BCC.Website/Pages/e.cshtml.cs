using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Pages
{
    public class eModel : PageModel
    {
        private readonly DashboardDbContext _context;

        public eModel(DashboardDbContext context)
        {
            _context = context;
        }

        public async Task<IActionResult> OnGetAsync(string shortcode)
        {
            if (string.IsNullOrEmpty(shortcode))
            {
                return NotFound();
            }

            // Look up the election by ShortCode
            var election = await _context.BcpElections.FirstOrDefaultAsync(e => e.ShortCode == shortcode);
            
            if (election != null)
            {
                return RedirectToPage("/Platform/Vote", new { area = "BcpVoting", shortcode = election.ShortCode });
            }

            // Fallback: If it's a number, it might be an ID
            if (long.TryParse(shortcode, out long id))
            {
                var el = await _context.BcpElections.FindAsync(id);
                if (el != null)
                {
                    return RedirectToPage("/Platform/Vote", new { area = "BcpVoting", shortcode = !string.IsNullOrEmpty(el.ShortCode) ? el.ShortCode : el.Id.ToString() });
                }
            }

            return NotFound();
        }
    }
}

