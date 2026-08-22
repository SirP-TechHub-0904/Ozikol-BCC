using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Security.Claims;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Workspace
{
    [Authorize]
    public class SettingsModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public SettingsModel(DashboardDbContext db)
        {
            _db = db;
        }

        [BindProperty]
        public BcpUserChatSetting Setting { get; set; } = null!;

        public async Task<IActionResult> OnGetAsync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var s = await _db.BcpUserChatSettings.FirstOrDefaultAsync(x => x.UserId == userId);
            if (s == null)
            {
                s = new BcpUserChatSetting
                {
                    UserId = userId,
                    DefaultPresence = BcpPresenceStatus.Online,
                    AutoAwayMinutes = 5,
                    DefaultTone = "default",
                    DefaultVolume = 80,
                    GlobalMute = false,
                    GlobalReadReceipts = true,
                    GlobalTypingIndicator = true,
                    GlobalLastSeen = true
                };
                _db.BcpUserChatSettings.Add(s);
                await _db.SaveChangesAsync();
            }

            Setting = s;
            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var dbSetting = await _db.BcpUserChatSettings.FirstOrDefaultAsync(x => x.UserId == userId);

            if (dbSetting != null)
            {
                dbSetting.DefaultPresence = Setting.DefaultPresence;
                dbSetting.AutoAwayMinutes = Setting.AutoAwayMinutes;
                dbSetting.DefaultTone = Setting.DefaultTone;
                dbSetting.DefaultVolume = Setting.DefaultVolume;
                dbSetting.GlobalMute = Setting.GlobalMute;
                dbSetting.GlobalReadReceipts = Setting.GlobalReadReceipts;
                dbSetting.GlobalTypingIndicator = Setting.GlobalTypingIndicator;
                dbSetting.GlobalLastSeen = Setting.GlobalLastSeen;
                dbSetting.AutoDownloadImages = Setting.AutoDownloadImages;
                dbSetting.AutoDownloadFiles = Setting.AutoDownloadFiles;

                await _db.SaveChangesAsync();
            }

            return RedirectToPage("/Workspace/Dashboard");
        }
    }
}
