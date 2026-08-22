using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Controllers
{
    /// <summary>
    /// REST API for exporting group chat history, backups, and audit logs.
    /// </summary>
    [ApiController]
    [Route("api/groups/{groupId}/export")]
    [Authorize]
    public class ChatExportApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;

        public ChatExportApiController(DashboardDbContext db)
        {
            _db = db;
        }

        private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

        /// <summary>
        /// Export full group chat history as formatted JSON backup file (Admin only).
        /// </summary>
        [HttpGet("json")]
        public async Task<IActionResult> ExportJson(Guid groupId)
        {
            if (UserId == null) return Unauthorized();

            var member = await _db.BcpGroupMembers
                .FirstOrDefaultAsync(m => m.BcpGroupId == groupId && m.UserProfileId == UserId && m.MembershipStatus == "Active");

            if (member == null || member.GroupRole != BcpGroupRole.Admin)
                return Forbid("Only group admins can export complete chat backups.");

            var group = await _db.BcpGroups.FindAsync(groupId);
            if (group == null) return NotFound();

            var messages = await _db.BcpGroupPosts
                .Where(m => m.BcpGroupId == groupId)
                .Include(m => m.UserProfile)
                .Include(m => m.File)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new
                {
                    m.Id,
                    SenderId = m.UserProfileId,
                    SenderName = m.UserProfile!.FullName,
                    m.Content,
                    MessageType = m.MessageType.ToString(),
                    m.IsEdited,
                    m.IsDeleted,
                    m.IsPinned,
                    m.CreatedAt,
                    FileUrl = m.File != null ? m.File.FileUrl : null,
                    FileName = m.File != null ? m.File.FileName : null
                })
                .ToListAsync();

            var backupData = new
            {
                Group = new
                {
                    group.Id,
                    group.Title,
                    group.Description,
                    group.CreatedAt
                },
                ExportedAt = DateTime.UtcNow,
                ExportedByUserId = UserId,
                TotalMessages = messages.Count,
                Messages = messages
            };

            var jsonBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(backupData, new JsonSerializerOptions { WriteIndented = true }));
            var filename = $"{group.Title.Replace(" ", "_")}_ChatBackup_{DateTime.UtcNow:yyyyMMdd_HHmmss}.json";

            return File(jsonBytes, "application/json", filename);
        }

        /// <summary>
        /// Export chat transcript as formatted text document (.txt).
        /// </summary>
        [HttpGet("txt")]
        public async Task<IActionResult> ExportTxt(Guid groupId)
        {
            if (UserId == null) return Unauthorized();

            var member = await _db.BcpGroupMembers
                .FirstOrDefaultAsync(m => m.BcpGroupId == groupId && m.UserProfileId == UserId && m.MembershipStatus == "Active");

            if (member == null) return Forbid();

            var group = await _db.BcpGroups.FindAsync(groupId);
            if (group == null) return NotFound();

            var messages = await _db.BcpGroupPosts
                .Where(m => m.BcpGroupId == groupId && !m.IsDeleted)
                .Include(m => m.UserProfile)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine($"==================================================");
            sb.AppendLine($"CHAT TRANSCRIPT: {group.Title}");
            sb.AppendLine($"Exported On: {DateTime.UtcNow:f} UTC");
            sb.AppendLine($"Total Messages: {messages.Count}");
            sb.AppendLine($"==================================================");
            sb.AppendLine();

            foreach (var msg in messages)
            {
                var sender = msg.UserProfile?.FullName ?? "Unknown";
                var time = msg.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss");
                var status = msg.IsEdited ? " (edited)" : "";
                sb.AppendLine($"[{time}] {sender}{status}:");
                sb.AppendLine($"  {msg.Content}");
                sb.AppendLine();
            }

            var txtBytes = Encoding.UTF8.GetBytes(sb.ToString());
            var filename = $"{group.Title.Replace(" ", "_")}_Transcript_{DateTime.UtcNow:yyyyMMdd}.txt";

            return File(txtBytes, "text/plain", filename);
        }

        /// <summary>
        /// Get audit log for this group (Platform Admin or Group Admin).
        /// </summary>
        [HttpGet("audit-log")]
        public async Task<IActionResult> GetAuditLog(Guid groupId, [FromQuery] int take = 100)
        {
            if (UserId == null) return Unauthorized();

            var member = await _db.BcpGroupMembers
                .FirstOrDefaultAsync(m => m.BcpGroupId == groupId && m.UserProfileId == UserId && m.MembershipStatus == "Active");

            if (member == null || member.GroupRole != BcpGroupRole.Admin)
                return Forbid();

            var logs = await _db.BcpChatAuditLogs
                .Where(a => a.GroupId == groupId)
                .Include(a => a.User)
                .OrderByDescending(a => a.Timestamp)
                .Take(take)
                .Select(a => new
                {
                    a.Id,
                    a.Action,
                    a.OriginalContent,
                    a.Details,
                    a.Timestamp,
                    User = a.User != null ? a.User.FullName : "System"
                })
                .ToListAsync();

            return Ok(logs);
        }
    }
}
