using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Workspace
{
    [Authorize]
    public class DirectMessageModel : PageModel
    {
        private readonly DashboardDbContext _db;
        private readonly UserManager<Profile> _userManager;

        public DirectMessageModel(DashboardDbContext db, UserManager<Profile> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        public BcpGroup Group { get; set; } = null!;
        public Profile TargetUser { get; set; } = null!;
        public List<BcpDirectMessage> Messages { get; set; } = new();
        public string CurrentUserId { get; set; } = string.Empty;

        public IActionResult OnGet(Guid groupId, string userId)
        {
            return RedirectToPage("/Workspace/Chat", new { id = groupId, dmUserId = userId });
        }
    }
}
