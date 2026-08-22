using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Controllers
{
    [Authorize(Roles = "PlatformOwner,mAdmin,BcpAdmin,Admin,Administrator,Editor")]
    [Route("api/bcp-toggle")]
    [IgnoreAntiforgeryToken] // Allow simple form POST from any layout without strict antiforgery if needed
    public class BcpDashboardToggleController : Controller
    {
        private readonly DashboardDbContext _context;

        public BcpDashboardToggleController(DashboardDbContext context)
        {
            _context = context;
        }

        [HttpPost("toggle")]
        public async Task<IActionResult> ToggleDashboard(string returnUrl)
        {
            var ConfigSetting = await _context.ConfigSettings.FirstOrDefaultAsync();
            if (ConfigSetting != null)
            {
                
                await _context.SaveChangesAsync();
            }

            // Redirect back to login so it correctly evaluates where to send them (BCP vs Admin area) based on the new ManagementSetting,
            // OR if returnUrl is provided and safe, we can redirect there. But wait, if they are currently on /Admin/Dashboard and they toggle to New BCP,
            // /Admin/Dashboard will STILL work, but RequiresNewBCPDashboardAttribute might block /BCP/Dashboard if it's false.
            // Actually, if we just redirect to the root Dashboard index, it will route them correctly.
            
            return RedirectToPage("/Console/Dashboard", new { area = "BcpConsole" });
        }
    }
}


