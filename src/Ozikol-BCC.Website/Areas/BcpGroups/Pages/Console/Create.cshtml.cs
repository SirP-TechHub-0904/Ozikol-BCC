using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Console
{
    [Authorize]
    public class CreateModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public CreateModel(DashboardDbContext db)
        {
            _db = db;
        }

        [BindProperty]
        public BcpGroup Group { get; set; } = new();

        public void OnGet()
        {
            Group.IsActive = true;
            Group.IsAlwaysOpen = true;
            Group.EditWindowMinutes = 15;
            Group.DeleteWindowMinutes = 5;
            Group.AutoConvertThreshold = 1000;
            Group.RateLimitPerMinute = 30;
            Group.ReadReceiptsEnabled = true;
            Group.TypingIndicatorsEnabled = true;
            Group.LastSeenEnabled = true;
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
                return Page();

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            Group.CreatedByUserId = userId;
            Group.CreatedAt = DateTime.UtcNow;

            // Fetch tenant Cloudinary root folder name from ManagementSetting
            var mgmt = await _db.ManagementSettings.FirstOrDefaultAsync();
            var tenantFolder = string.IsNullOrWhiteSpace(mgmt?.FileFolderName) ? "bcp" : mgmt.FileFolderName;
            var groupSlug = Group.Title.ToLower().Replace(" ", "-").Replace("/", "-");
            Group.CloudinaryFolder = $"{tenantFolder}/groups/{groupSlug}";

            _db.BcpGroups.Add(Group);
            await _db.SaveChangesAsync();

            // Add creator as Group Admin
            if (userId != null)
            {
                _db.BcpGroupMembers.Add(new BcpGroupMember
                {
                    BcpGroupId = Group.Id,
                    UserProfileId = userId,
                    GroupRole = BcpGroupRole.Admin,
                    RolePosition = "Group Admin",
                    MembershipStatus = "Active"
                });
                await _db.SaveChangesAsync();
            }

            return RedirectToPage("/Console/Details", new { id = Group.Id });
        }
    }
}
