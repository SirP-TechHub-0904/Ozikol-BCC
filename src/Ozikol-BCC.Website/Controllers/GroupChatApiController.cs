using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

using Microsoft.AspNetCore.SignalR;
using Ozikol_BCC.Website.Hubs;

namespace Ozikol_BCC.Website.Controllers
{
    /// <summary>
    /// REST API for group chat messages, pins, search, files, and polls.
    /// </summary>
    [ApiController]
    [Route("api/groups/{groupId}/chat")]
    [Authorize]
    public class GroupChatApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly UserManager<Profile> _userManager;
        private readonly IHubContext<GroupChatHub> _hubContext;

        public GroupChatApiController(DashboardDbContext db, UserManager<Profile> userManager, IHubContext<GroupChatHub> hubContext)
        {
            _db = db;
            _userManager = userManager;
            _hubContext = hubContext;
        }

        private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

        /// <summary>
        /// Get paginated chat messages for a group.
        /// </summary>
        [HttpGet("messages")]
        public async Task<IActionResult> GetMessages(Guid groupId, [FromQuery] Guid? before = null, [FromQuery] int take = 50)
        {
            if (UserId == null) return Unauthorized();

            var query = _db.BcpGroupPosts
                .Where(m => m.BcpGroupId == groupId && !m.IsDeleted)
                .AsQueryable();

            if (before.HasValue)
                query = query.Where(m => m.Id < before.Value);

            var messages = await query
                .OrderByDescending(m => m.CreatedAt)
                .Take(take)
                .Include(m => m.UserProfile)
                .Include(m => m.File)
                .Include(m => m.ReplyToMessage)
                    .ThenInclude(r => r!.UserProfile)
                .Select(m => new
                {
                    m.Id,
                    m.BcpGroupId,
                    m.UserProfileId,
                    UserName = m.UserProfile!.FullName,
                    m.Content,
                    MessageType = m.MessageType.ToString(),
                    m.IsPinned,
                    m.IsEdited,
                    m.EditedAt,
                    m.MentionedUserIds,
                    DeliveryStatus = m.DeliveryStatus.ToString(),
                    m.CreatedAt,
                    ReplyTo = m.ReplyToMessage != null ? new
                    {
                        m.ReplyToMessage.Id,
                        Content = m.ReplyToMessage.Content.Length > 100 ? m.ReplyToMessage.Content.Substring(0, 100) + "…" : m.ReplyToMessage.Content,
                        Author = m.ReplyToMessage.UserProfile!.FullName
                    } : null,
                    File = m.File != null ? new
                    {
                        m.File.Id,
                        m.File.FileName,
                        m.File.FileUrl,
                        m.File.FileSize,
                        m.File.ContentType,
                        m.File.ThumbnailUrl
                    } : null
                })
                .ToListAsync();

            return Ok(messages.OrderBy(m => m.CreatedAt));
        }

        /// <summary>
        /// Get pinned messages for a group.
        /// </summary>
        [HttpGet("pinned")]
        public async Task<IActionResult> GetPinnedMessages(Guid groupId)
        {
            if (UserId == null) return Unauthorized();

            var pinned = await _db.BcpGroupPosts
                .Where(m => m.BcpGroupId == groupId && m.IsPinned && !m.IsDeleted)
                .Include(m => m.UserProfile)
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new
                {
                    m.Id,
                    m.Content,
                    UserName = m.UserProfile!.FullName,
                    MessageType = m.MessageType.ToString(),
                    m.CreatedAt
                })
                .ToListAsync();

            return Ok(pinned);
        }

        /// <summary>
        /// Search messages in a group.
        /// </summary>
        [HttpGet("search")]
        public async Task<IActionResult> SearchMessages(Guid groupId, [FromQuery] string q, [FromQuery] int take = 30)
        {
            if (UserId == null) return Unauthorized();
            if (string.IsNullOrWhiteSpace(q)) return BadRequest("Search query required.");

            var results = await _db.BcpGroupPosts
                .Where(m => m.BcpGroupId == groupId && !m.IsDeleted && m.Content.Contains(q))
                .Include(m => m.UserProfile)
                .OrderByDescending(m => m.CreatedAt)
                .Take(take)
                .Select(m => new
                {
                    m.Id,
                    m.Content,
                    UserName = m.UserProfile!.FullName,
                    m.CreatedAt,
                    MessageType = m.MessageType.ToString()
                })
                .ToListAsync();

            return Ok(results);
        }

        /// <summary>
        /// Get message info (read receipts) for a specific message.
        /// </summary>
        [HttpGet("messages/{messageId}/info")]
        public async Task<IActionResult> GetMessageInfo(Guid groupId, Guid messageId)
        {
            if (UserId == null) return Unauthorized();

            var message = await _db.BcpGroupPosts
                .Include(m => m.UserProfile)
                .FirstOrDefaultAsync(m => m.Id == messageId && m.BcpGroupId == groupId);

            if (message == null) return NotFound();

            // Get all read receipts
            var receipts = await _db.BcpMessageReadReceipts
                .Where(r => r.MessageId == messageId)
                .Include(r => r.User)
                .Select(r => new
                {
                    r.UserId,
                    UserName = r.User!.FullName,
                    Status = r.Status.ToString(),
                    r.DeliveredAt,
                    r.ReadAt
                })
                .ToListAsync();

            // Get all group members to find who hasn't received it
            var allMembers = await _db.BcpGroupMembers
                .Where(m => m.BcpGroupId == groupId && m.MembershipStatus == "Active" && m.UserProfileId != message.UserProfileId)
                .Include(m => m.UserProfile)
                .Select(m => new
                {
                    m.UserProfileId,
                    UserName = m.UserProfile!.FullName,
                    PresenceStatus = m.PresenceStatus.ToString(),
                    m.LastSeenAt
                })
                .ToListAsync();

            var readBy = receipts.Where(r => r.Status == "Read").ToList();
            var deliveredTo = receipts.Where(r => r.Status == "Delivered").ToList();
            var receiptUserIds = receipts.Select(r => r.UserId).ToHashSet();
            var notDelivered = allMembers.Where(m => !receiptUserIds.Contains(m.UserProfileId)).ToList();

            return Ok(new
            {
                Message = new { message.Id, message.Content, SentBy = message.UserProfile?.FullName, message.CreatedAt },
                ReadBy = readBy,
                DeliveredTo = deliveredTo,
                NotDelivered = notDelivered,
                TotalMembers = allMembers.Count,
                ReadCount = readBy.Count,
                DeliveredCount = deliveredTo.Count,
                NotDeliveredCount = notDelivered.Count
            });
        }

        /// <summary>
        /// Get group files.
        /// </summary>
        [HttpGet("files")]
        public async Task<IActionResult> GetFiles(Guid groupId, [FromQuery] int take = 50)
        {
            if (UserId == null) return Unauthorized();

            var files = await _db.BcpGroupFiles
                .Where(f => f.BcpGroupId == groupId)
                .Include(f => f.UploadedByUser)
                .OrderByDescending(f => f.UploadedAt)
                .Take(take)
                .Select(f => new
                {
                    f.Id,
                    f.FileName,
                    f.FileUrl,
                    f.FileSize,
                    f.ContentType,
                    UploadedBy = f.UploadedByUser!.FullName,
                    f.UploadedAt
                })
                .ToListAsync();

            return Ok(files);
        }

        /// <summary>
        /// Get group polls.
        /// </summary>
        [HttpGet("polls")]
        public async Task<IActionResult> GetPolls(Guid groupId)
        {
            if (UserId == null) return Unauthorized();

            var polls = await _db.BcpGroupPolls
                .Where(p => p.BcpGroupId == groupId)
                .Include(p => p.Options)
                    .ThenInclude(o => o.Votes)
                .Include(p => p.CreatedByUser)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.Question,
                    p.IsMultipleChoice,
                    p.IsAnonymous,
                    p.ExpiresAt,
                    IsExpired = p.ExpiresAt.HasValue && p.ExpiresAt.Value < DateTime.UtcNow,
                    CreatedBy = p.CreatedByUser!.FullName,
                    p.CreatedAt,
                    Options = p.Options.Select(o => new
                    {
                        o.Id,
                        o.OptionText,
                        VoteCount = o.Votes.Count
                    }),
                    TotalVotes = p.Options.Sum(o => o.Votes.Count)
                })
                .ToListAsync();

            return Ok(polls);
        }

        /// <summary>
        /// Create a poll in a group chat.
        /// </summary>
        [HttpPost("polls")]
        public async Task<IActionResult> CreatePoll(Guid groupId, [FromBody] CreatePollRequest request)
        {
            if (UserId == null) return Unauthorized();

            var poll = new BcpGroupPoll
            {
                BcpGroupId = groupId,
                Question = request.Question,
                IsMultipleChoice = request.IsMultipleChoice,
                IsAnonymous = request.IsAnonymous,
                ExpiresAt = request.ExpiresAt,
                CreatedByUserId = UserId
            };

            foreach (var optionText in request.Options)
            {
                poll.Options.Add(new BcpGroupPollOption { OptionText = optionText });
            }

            _db.BcpGroupPolls.Add(poll);
            await _db.SaveChangesAsync();

            // Create a poll message
            var message = new BcpGroupPost
            {
                BcpGroupId = groupId,
                UserProfileId = UserId,
                Content = $"📊 Poll: {request.Question}",
                MessageType = BcpChatMessageType.Poll,
                PollId = poll.Id,
                DeliveryStatus = BcpMessageDeliveryStatus.Sent,
                CreatedAt = DateTime.UtcNow
            };

            _db.BcpGroupPosts.Add(message);
            await _db.SaveChangesAsync();

            return Ok(new { PollId = poll.Id, MessageId = message.Id });
        }

        /// <summary>
        /// Get bookmarked messages for the current user.
        /// </summary>
        [HttpGet("/api/groups/bookmarks")]
        public async Task<IActionResult> GetBookmarks()
        {
            if (UserId == null) return Unauthorized();

            var bookmarks = await _db.BcpBookmarkedMessages
                .Where(b => b.UserId == UserId)
                .Include(b => b.Message)
                    .ThenInclude(m => m!.UserProfile)
                .Include(b => b.Group)
                .OrderByDescending(b => b.BookmarkedAt)
                .Select(b => new
                {
                    b.Id,
                    b.MessageId,
                    GroupId = b.GroupId,
                    GroupName = b.Group!.Title,
                    Content = b.Message!.Content,
                    Author = b.Message.UserProfile!.FullName,
                    MessageDate = b.Message.CreatedAt,
                    b.BookmarkedAt
                })
                .ToListAsync();

            return Ok(bookmarks);
        }

        /// <summary>
        /// Remove a bookmark.
        /// </summary>
        [HttpDelete("/api/groups/bookmarks/{id:guid}")]
        public async Task<IActionResult> RemoveBookmark(Guid id)
        {
            if (UserId == null) return Unauthorized();

            var bookmark = await _db.BcpBookmarkedMessages
                .FirstOrDefaultAsync(b => b.Id == id && b.UserId == UserId);

            if (bookmark == null) return NotFound();

            _db.BcpBookmarkedMessages.Remove(bookmark);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Bookmark removed." });
        }

        /// <summary>
        /// Multi-File Upload & Non-Blocking Chat Messaging Endpoint
        /// </summary>
        [HttpPost("upload")]
        [RequestSizeLimit(100 * 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = 100 * 1024 * 1024)]
        public async Task<IActionResult> UploadFiles(
            Guid groupId,
            [FromForm] List<IFormFile> files,
            [FromForm] string? content,
            [FromForm] Guid? replyToId,
            [FromForm] string? clientTempId)
        {
            if (UserId == null) return Unauthorized();

            var member = await _db.BcpGroupMembers.FirstOrDefaultAsync(m => m.BcpGroupId == groupId && m.UserProfileId == UserId && m.MembershipStatus == "Active" && !m.IsSuspended);
            if (member == null) return Forbid();

            var group = await _db.BcpGroups.FindAsync(groupId);
            if (group == null) return NotFound();

            var user = await _userManager.FindByIdAsync(UserId);

            if (files == null || files.Count == 0)
            {
                return BadRequest(new { error = "No files attached." });
            }

            var uploadedPosts = new List<object>();

            var groupName = (group.Title ?? "group").ToLower().Replace(" ", "_");

            for (int i = 0; i < files.Count; i++)
            {
                var file = files[i];
                if (file.Length == 0) continue;

                var ext = System.IO.Path.GetExtension(file.FileName);
                var now = DateTime.UtcNow;
                var formattedFileName = $"{groupName} {now:yyyy-MM-dd} at {now:HH.mm.ss}{ext}";

                string fileUrl;
                using (var ms = new System.IO.MemoryStream())
                {
                    await file.CopyToAsync(ms);
                    byte[] bytes = ms.ToArray();
                    fileUrl = $"data:{file.ContentType};base64,{Convert.ToBase64String(bytes)}";
                }

                var groupFile = new BcpGroupFile
                {
                    BcpGroupId = groupId,
                    UploadedByUserId = UserId,
                    FileName = formattedFileName,
                    FileUrl = fileUrl,
                    FileSize = file.Length,
                    ContentType = file.ContentType,
                    UploadedAt = DateTime.UtcNow
                };
                _db.BcpGroupFiles.Add(groupFile);
                await _db.SaveChangesAsync();

                string postContent = (i == 0 && !string.IsNullOrWhiteSpace(content)) 
                    ? content 
                    : string.Empty;

                var post = new BcpGroupPost
                {
                    BcpGroupId = groupId,
                    UserProfileId = UserId,
                    Content = postContent,
                    MessageType = BcpChatMessageType.File,
                    ReplyToMessageId = replyToId,
                    FileId = groupFile.Id,
                    DeliveryStatus = BcpMessageDeliveryStatus.Sent,
                    CreatedAt = DateTime.UtcNow
                };
                _db.BcpGroupPosts.Add(post);
                await _db.SaveChangesAsync();

                _db.BcpMessageReadReceipts.Add(new BcpMessageReadReceipt
                {
                    MessageId = post.Id,
                    UserId = UserId,
                    Status = BcpMessageDeliveryStatus.Read,
                    ReadAt = DateTime.UtcNow
                });
                await _db.SaveChangesAsync();

                string? replyToUserName = null;
                string? replyToContent = null;
                if (replyToId.HasValue)
                {
                    var replyMsg = await _db.BcpGroupPosts.Include(p => p.UserProfile).FirstOrDefaultAsync(p => p.Id == replyToId.Value);
                    if (replyMsg != null)
                    {
                        replyToUserName = replyMsg.UserProfile?.FullName;
                        replyToContent = replyMsg.Content;
                    }
                }

                var payload = new
                {
                    Id = post.Id,
                    GroupId = groupId,
                    GroupTitle = group.Title,
                    UserId = UserId,
                    UserName = user?.FullName ?? "Unknown",
                    Content = post.Content,
                    MessageType = post.MessageType.ToString(),
                    FileId = groupFile.Id,
                    FileUrl = fileUrl,
                    FileName = file.FileName,
                    FileSize = file.Length,
                    FileContentType = file.ContentType,
                    ReplyToId = post.ReplyToMessageId,
                    ReplyToUserName = replyToUserName,
                    ReplyToContent = replyToContent,
                    DeliveryStatus = post.DeliveryStatus.ToString(),
                    CreatedAt = post.CreatedAt,
                    ClientTempId = clientTempId
                };

                await _hubContext.Clients.Group($"group-{groupId}").SendAsync("ReceiveMessage", payload);
                uploadedPosts.Add(payload);
            }

            return Ok(new { success = true, posts = uploadedPosts });
        }
    }

    public class CreatePollRequest
    {
        public string Question { get; set; } = string.Empty;
        public bool IsMultipleChoice { get; set; }
        public bool IsAnonymous { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string[] Options { get; set; } = Array.Empty<string>();
    }
}
