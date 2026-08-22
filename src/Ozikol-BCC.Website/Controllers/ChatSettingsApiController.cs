using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Security.Claims;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Controllers
{
    /// <summary>
    /// REST API for user chat preferences and per-group chat settings.
    /// </summary>
    [ApiController]
    [Route("api/groups/settings")]
    [Authorize]
    public class ChatSettingsApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;

        public ChatSettingsApiController(DashboardDbContext db)
        {
            _db = db;
        }

        private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

        /// <summary>
        /// Get global chat settings for current user.
        /// </summary>
        [HttpGet("user")]
        public async Task<IActionResult> GetUserSettings()
        {
            if (UserId == null) return Unauthorized();

            var settings = await _db.BcpUserChatSettings
                .FirstOrDefaultAsync(s => s.UserId == UserId);

            if (settings == null)
            {
                settings = new BcpUserChatSetting
                {
                    UserId = UserId,
                    DefaultPresence = BcpPresenceStatus.Online,
                    AutoAwayMinutes = 5,
                    DefaultTone = "default",
                    DefaultVolume = 80,
                    GlobalMute = false,
                    GlobalReadReceipts = true,
                    GlobalTypingIndicator = true,
                    GlobalLastSeen = true,
                    AutoDownloadImages = true,
                    AutoDownloadFiles = false
                };
                _db.BcpUserChatSettings.Add(settings);
                await _db.SaveChangesAsync();
            }

            return Ok(new
            {
                settings.Id,
                DefaultPresence = settings.DefaultPresence.ToString(),
                settings.AutoAwayMinutes,
                settings.DefaultTone,
                settings.DefaultVolume,
                settings.GlobalMute,
                settings.GlobalReadReceipts,
                settings.GlobalTypingIndicator,
                settings.GlobalLastSeen,
                settings.AutoDownloadImages,
                settings.AutoDownloadFiles
            });
        }

        /// <summary>
        /// Update global user chat settings.
        /// </summary>
        [HttpPut("user")]
        public async Task<IActionResult> UpdateUserSettings([FromBody] UpdateUserChatSettingsRequest request)
        {
            if (UserId == null) return Unauthorized();

            var settings = await _db.BcpUserChatSettings
                .FirstOrDefaultAsync(s => s.UserId == UserId);

            if (settings == null)
            {
                settings = new BcpUserChatSetting { UserId = UserId };
                _db.BcpUserChatSettings.Add(settings);
            }

            if (!string.IsNullOrWhiteSpace(request.DefaultPresence) && System.Enum.TryParse<BcpPresenceStatus>(request.DefaultPresence, out var presence))
                settings.DefaultPresence = presence;

            if (request.AutoAwayMinutes.HasValue) settings.AutoAwayMinutes = request.AutoAwayMinutes.Value;
            if (!string.IsNullOrWhiteSpace(request.DefaultTone)) settings.DefaultTone = request.DefaultTone;
            if (request.DefaultVolume.HasValue) settings.DefaultVolume = request.DefaultVolume.Value;
            if (request.GlobalMute.HasValue) settings.GlobalMute = request.GlobalMute.Value;
            if (request.GlobalReadReceipts.HasValue) settings.GlobalReadReceipts = request.GlobalReadReceipts.Value;
            if (request.GlobalTypingIndicator.HasValue) settings.GlobalTypingIndicator = request.GlobalTypingIndicator.Value;
            if (request.GlobalLastSeen.HasValue) settings.GlobalLastSeen = request.GlobalLastSeen.Value;
            if (request.AutoDownloadImages.HasValue) settings.AutoDownloadImages = request.AutoDownloadImages.Value;
            if (request.AutoDownloadFiles.HasValue) settings.AutoDownloadFiles = request.AutoDownloadFiles.Value;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Settings updated." });
        }

        /// <summary>
        /// Update member specific settings for a group (tone, volume, privacy).
        /// </summary>
        [HttpPut("group/{groupId:guid}/member")]
        public async Task<IActionResult> UpdateGroupMemberSettings(Guid groupId, [FromBody] UpdateMemberSettingsRequest request)
        {
            if (UserId == null) return Unauthorized();

            var member = await _db.BcpGroupMembers
                .FirstOrDefaultAsync(m => m.BcpGroupId == groupId && m.UserProfileId == UserId && m.MembershipStatus == "Active");

            if (member == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(request.NotificationTone)) member.NotificationTone = request.NotificationTone;
            if (request.NotificationVolume.HasValue) member.NotificationVolume = request.NotificationVolume.Value;
            if (request.IsNotificationMuted.HasValue) member.IsNotificationMuted = request.IsNotificationMuted.Value;
            if (request.ShowMyReadReceipts.HasValue) member.ShowMyReadReceipts = request.ShowMyReadReceipts.Value;
            if (request.ShowMyTyping.HasValue) member.ShowMyTyping = request.ShowMyTyping.Value;
            if (request.ShowMyLastSeen.HasValue) member.ShowMyLastSeen = request.ShowMyLastSeen.Value;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Group member settings updated." });
        }

        /// <summary>
        /// Update group-wide settings (admin only).
        /// </summary>
        [HttpPut("group/{groupId:guid}")]
        public async Task<IActionResult> UpdateGroupSettings(Guid groupId, [FromBody] UpdateGroupSettingsRequest request)
        {
            if (UserId == null) return Unauthorized();

            var member = await _db.BcpGroupMembers
                .FirstOrDefaultAsync(m => m.BcpGroupId == groupId && m.UserProfileId == UserId && m.MembershipStatus == "Active");

            if (member == null || member.GroupRole != BcpGroupRole.Admin)
                return Forbid();

            var group = await _db.BcpGroups.FindAsync(groupId);
            if (group == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(request.Title)) group.Title = request.Title;
            if (request.Description != null) group.Description = request.Description;
            if (!string.IsNullOrWhiteSpace(request.ChatMode) && System.Enum.TryParse<BcpGroupChatMode>(request.ChatMode, out var mode))
                group.ChatMode = mode;

            if (request.EditWindowMinutes.HasValue) group.EditWindowMinutes = request.EditWindowMinutes.Value;
            if (request.DeleteWindowMinutes.HasValue) group.DeleteWindowMinutes = request.DeleteWindowMinutes.Value;
            if (request.MessageRetentionDays.HasValue) group.MessageRetentionDays = request.MessageRetentionDays.Value;
            if (request.AutoConvertThreshold.HasValue) group.AutoConvertThreshold = request.AutoConvertThreshold.Value;
            if (request.RateLimitPerMinute.HasValue) group.RateLimitPerMinute = request.RateLimitPerMinute.Value;

            if (request.IsAlwaysOpen.HasValue) group.IsAlwaysOpen = request.IsAlwaysOpen.Value;
            if (request.OperationalDays != null) group.OperationalDays = request.OperationalDays;
            if (request.OpenTime.HasValue) group.OpenTime = request.OpenTime.Value;
            if (request.CloseTime.HasValue) group.CloseTime = request.CloseTime.Value;
            if (request.ClosedMessage != null) group.ClosedMessage = request.ClosedMessage;

            if (request.ReadReceiptsEnabled.HasValue) group.ReadReceiptsEnabled = request.ReadReceiptsEnabled.Value;
            if (request.TypingIndicatorsEnabled.HasValue) group.TypingIndicatorsEnabled = request.TypingIndicatorsEnabled.Value;
            if (request.LastSeenEnabled.HasValue) group.LastSeenEnabled = request.LastSeenEnabled.Value;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Group settings updated." });
        }
    }

    public class UpdateUserChatSettingsRequest
    {
        public string? DefaultPresence { get; set; }
        public int? AutoAwayMinutes { get; set; }
        public string? DefaultTone { get; set; }
        public int? DefaultVolume { get; set; }
        public bool? GlobalMute { get; set; }
        public bool? GlobalReadReceipts { get; set; }
        public bool? GlobalTypingIndicator { get; set; }
        public bool? GlobalLastSeen { get; set; }
        public bool? AutoDownloadImages { get; set; }
        public bool? AutoDownloadFiles { get; set; }
    }

    public class UpdateMemberSettingsRequest
    {
        public string? NotificationTone { get; set; }
        public int? NotificationVolume { get; set; }
        public bool? IsNotificationMuted { get; set; }
        public bool? ShowMyReadReceipts { get; set; }
        public bool? ShowMyTyping { get; set; }
        public bool? ShowMyLastSeen { get; set; }
    }

    public class UpdateGroupSettingsRequest
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? ChatMode { get; set; }
        public int? EditWindowMinutes { get; set; }
        public int? DeleteWindowMinutes { get; set; }
        public int? MessageRetentionDays { get; set; }
        public int? AutoConvertThreshold { get; set; }
        public int? RateLimitPerMinute { get; set; }
        public bool? IsAlwaysOpen { get; set; }
        public string? OperationalDays { get; set; }
        public System.TimeSpan? OpenTime { get; set; }
        public System.TimeSpan? CloseTime { get; set; }
        public string? ClosedMessage { get; set; }
        public bool? ReadReceiptsEnabled { get; set; }
        public bool? TypingIndicatorsEnabled { get; set; }
        public bool? LastSeenEnabled { get; set; }
    }
}
