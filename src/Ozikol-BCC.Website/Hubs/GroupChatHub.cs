using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Hubs
{
    /// <summary>
    /// Real-time SignalR hub for BCP group chat. Handles messaging, typing indicators,
    /// read receipts, presence tracking, polls, pins, and admin moderation actions.
    /// </summary>
    [Authorize]
    public class GroupChatHub : Hub
    {
        private readonly DashboardDbContext _db;
        private readonly UserManager<Profile> _userManager;

        // In-memory presence tracking (connection-based)
        private static readonly ConcurrentDictionary<string, UserPresence> _onlineUsers = new();
        private static readonly ConcurrentDictionary<string, HashSet<string>> _groupConnections = new();

        public GroupChatHub(DashboardDbContext db, UserManager<Profile> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        // ──────────────────────────────────────────────
        //  CONNECTION LIFECYCLE
        // ──────────────────────────────────────────────

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            if (userId == null) return;

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return;

            _onlineUsers[Context.ConnectionId] = new UserPresence
            {
                UserId = userId,
                FullName = user.FullName,
                Status = BcpPresenceStatus.Online,
                ConnectedAt = DateTime.UtcNow
            };

            // Auto-join all groups the user is a member of
            var groupIds = await _db.BcpGroupMembers
                .Where(m => m.UserProfileId == userId && m.MembershipStatus == "Active" && !m.IsSuspended)
                .Select(m => m.BcpGroupId)
                .ToListAsync();

            foreach (var gid in groupIds)
            {
                var groupKey = $"group-{gid}";
                await Groups.AddToGroupAsync(Context.ConnectionId, groupKey);

                if (!_groupConnections.ContainsKey(groupKey))
                    _groupConnections[groupKey] = new HashSet<string>();
                _groupConnections[groupKey].Add(Context.ConnectionId);
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserId();

            // Update last seen
            if (userId != null)
            {
                var memberships = await _db.BcpGroupMembers
                    .Where(m => m.UserProfileId == userId)
                    .ToListAsync();

                foreach (var m in memberships)
                {
                    m.PresenceStatus = BcpPresenceStatus.Offline;
                    m.LastSeenAt = DateTime.UtcNow;
                }
                await _db.SaveChangesAsync();
            }

            _onlineUsers.TryRemove(Context.ConnectionId, out _);

            // Clean up group connections
            foreach (var kvp in _groupConnections)
            {
                kvp.Value.Remove(Context.ConnectionId);
            }

            if (userId != null)
            {
                // Notify all groups this user was in
                var groupIds = await _db.BcpGroupMembers
                    .Where(m => m.UserProfileId == userId && m.MembershipStatus == "Active")
                    .Select(m => m.BcpGroupId)
                    .ToListAsync();

                foreach (var gid in groupIds)
                {
                    await Clients.Group($"group-{gid}").SendAsync("PresenceUpdate", userId, "Offline", DateTime.UtcNow);
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        // ──────────────────────────────────────────────
        //  GROUP JOIN / LEAVE (Active in Chat tracking)
        // ──────────────────────────────────────────────

        public async Task JoinGroup(Guid groupId)
        {
            var userId = GetUserId();
            if (userId == null) return;

            var member = await GetActiveMember(groupId, userId);
            if (member == null) return;

            member.PresenceStatus = BcpPresenceStatus.ActiveInChat;
            member.LastSeenAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await Clients.Group($"group-{groupId}").SendAsync("PresenceUpdate", userId, "ActiveInChat", DateTime.UtcNow);
        }

        public async Task LeaveGroup(Guid groupId)
        {
            var userId = GetUserId();
            if (userId == null) return;

            var member = await GetActiveMember(groupId, userId);
            if (member == null) return;

            member.PresenceStatus = BcpPresenceStatus.Online;
            member.LastSeenAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await Clients.Group($"group-{groupId}").SendAsync("PresenceUpdate", userId, "Online", DateTime.UtcNow);
        }

        public async Task UpdatePresence(string status)
        {
            var userId = GetUserId();
            if (userId == null) return;

            if (!System.Enum.TryParse<BcpPresenceStatus>(status, out var presenceStatus)) return;

            var memberships = await _db.BcpGroupMembers
                .Where(m => m.UserProfileId == userId && m.MembershipStatus == "Active")
                .ToListAsync();

            foreach (var m in memberships)
            {
                m.PresenceStatus = presenceStatus;
                m.LastSeenAt = DateTime.UtcNow;
            }
            await _db.SaveChangesAsync();

            foreach (var m in memberships)
            {
                await Clients.Group($"group-{m.BcpGroupId}").SendAsync("PresenceUpdate", userId, status, DateTime.UtcNow);
            }
        }

        // ──────────────────────────────────────────────
        //  MESSAGING
        // ──────────────────────────────────────────────

        public async Task SendMessage(Guid groupId, string content, Guid? replyToId = null, string? mentionedUserIds = null, string? recipientUserId = null)
        {
            var userId = GetUserId();
            if (userId == null) return;

            var member = await GetActiveMember(groupId, userId);
            if (member == null) return;

            var group = await _db.BcpGroups.FindAsync(groupId);
            if (group == null) return;

            var user = await _userManager.FindByIdAsync(userId);

            if (!string.IsNullOrWhiteSpace(recipientUserId))
            {
                // ──────────────────────────────────────────────
                // 2-USER PRIVATE DIRECT MESSAGE STREAM
                // ──────────────────────────────────────────────
                var dm = new BcpDirectMessage
                {
                    SenderUserId = userId,
                    ReceiverUserId = recipientUserId,
                    GroupId = groupId,
                    Content = content,
                    MessageType = BcpChatMessageType.Text,
                    IsRead = false,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow
                };

                _db.BcpDirectMessages.Add(dm);
                await _db.SaveChangesAsync();

                var payload = new
                {
                    Id = dm.Id,
                    GroupId = groupId,
                    GroupTitle = group.Title,
                    UserId = userId,
                    SenderUserId = userId,
                    ReceiverUserId = recipientUserId,
                    RecipientUserId = recipientUserId,
                    UserName = user?.FullName ?? "Unknown",
                    UserAvatar = (string?)null,
                    Content = dm.Content,
                    MessageType = dm.MessageType.ToString(),
                    FileId = dm.FileId,
                    FileUrl = (string?)null,
                    FileName = (string?)null,
                    FileSize = (long?)null,
                    ReplyToId = (Guid?)null,
                    ReplyToUserName = (string?)null,
                    ReplyToContent = (string?)null,
                    MentionedUserIds = (string?)null,
                    DeliveryStatus = "Sent",
                    CreatedAt = dm.CreatedAt,
                    IsDirectMessage = true
                };

                await Clients.Group($"group-{groupId}").SendAsync("ReceiveMessage", payload);
                return;
            }

            // ──────────────────────────────────────────────
            // MULTI-USER GROUP CHAT STREAM
            // ──────────────────────────────────────────────
            if (!CanUserPost(group, member))
            {
                await Clients.Caller.SendAsync("Error", "You are not allowed to post in this group (SuperAdmins & Observers are read-only).");
                return;
            }

            if (!IsGroupOpen(group))
            {
                await Clients.Caller.SendAsync("GroupClosedAlert", group.ClosedMessage ?? "This group is currently closed.");
                return;
            }

            // Text Auto-Convert Threshold Check (Convert > threshold to .txt upload)
            Guid? textFileId = null;
            string? textFileUrl = null;
            string? textFileName = null;
            long? textFileSize = null;

            var msgType = BcpChatMessageType.Text;
            if (group.AutoConvertThreshold > 0 && content.Length > group.AutoConvertThreshold)
            {
                msgType = BcpChatMessageType.File;
                textFileName = $"Message_{DateTime.UtcNow:yyyyMMdd_HHmmss}.txt";
                textFileUrl = $"data:text/plain;base64,{Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(content))}";
                textFileSize = content.Length;

                var textFile = new BcpGroupFile
                {
                    BcpGroupId = groupId,
                    UploadedByUserId = userId,
                    FileName = textFileName,
                    FileUrl = textFileUrl,
                    FileSize = textFileSize.Value,
                    ContentType = "text/plain",
                    UploadedAt = DateTime.UtcNow
                };
                _db.BcpGroupFiles.Add(textFile);
                await _db.SaveChangesAsync();
                textFileId = textFile.Id;
            }

            var post = new BcpGroupPost
            {
                BcpGroupId = groupId,
                UserProfileId = userId,
                Content = content,
                MessageType = msgType,
                ReplyToMessageId = replyToId,
                FileId = textFileId,
                DeliveryStatus = BcpMessageDeliveryStatus.Sent,
                CreatedAt = DateTime.UtcNow
            };

            _db.BcpGroupPosts.Add(post);
            await _db.SaveChangesAsync();

            // Create Read Receipt for sender (auto-read)
            var senderReceipt = new BcpMessageReadReceipt
            {
                MessageId = post.Id,
                UserId = userId,
                Status = BcpMessageDeliveryStatus.Read,
                ReadAt = DateTime.UtcNow
            };
            _db.BcpMessageReadReceipts.Add(senderReceipt);

            // Auto-deliver & read for users currently "ActiveInChat"
            var activeInChatMembers = await _db.BcpGroupMembers
                .Where(m => m.BcpGroupId == groupId && m.UserProfileId != userId && m.PresenceStatus == BcpPresenceStatus.ActiveInChat)
                .ToListAsync();

            foreach (var activeMem in activeInChatMembers)
            {
                _db.BcpMessageReadReceipts.Add(new BcpMessageReadReceipt
                {
                    MessageId = post.Id,
                    UserId = activeMem.UserProfileId,
                    Status = BcpMessageDeliveryStatus.Read,
                    DeliveredAt = DateTime.UtcNow,
                    ReadAt = DateTime.UtcNow
                });
            }
            await _db.SaveChangesAsync();

            // Fetch reply info if present
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

            // Broadcast message payload to group
            await Clients.Group($"group-{groupId}").SendAsync("ReceiveMessage", new
            {
                Id = post.Id,
                GroupId = groupId,
                GroupTitle = group.Title,
                UserId = userId,
                UserName = user?.FullName ?? "Unknown",
                UserAvatar = (string?)null,
                Content = post.Content,
                MessageType = post.MessageType.ToString(),
                FileId = post.FileId,
                FileUrl = textFileUrl,
                FileName = textFileName,
                FileSize = textFileSize,
                ReplyToId = post.ReplyToMessageId,
                ReplyToUserName = replyToUserName,
                ReplyToContent = replyToContent,
                MentionedUserIds = mentionedUserIds,
                DeliveryStatus = post.DeliveryStatus.ToString(),
                CreatedAt = post.CreatedAt,
                IsDirectMessage = false
            });
        }

        public async Task SendTypingIndicator(Guid groupId, bool isTyping, string? recipientUserId = null)
        {
            var userId = GetUserId();
            if (userId == null) return;

            var user = await _userManager.FindByIdAsync(userId);
            await Clients.Group($"group-{groupId}").SendAsync("UserTyping", groupId.ToString().ToLower(), userId, user?.FullName ?? "Someone", isTyping, recipientUserId);
        }

        public async Task MarkAsRead(Guid groupId, Guid messageId)
        {
            var userId = GetUserId();
            if (userId == null) return;

            var receipt = await _db.BcpMessageReadReceipts
                .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId);

            if (receipt == null)
            {
                receipt = new BcpMessageReadReceipt
                {
                    MessageId = messageId,
                    UserId = userId,
                    Status = BcpMessageDeliveryStatus.Read,
                    DeliveredAt = DateTime.UtcNow,
                    ReadAt = DateTime.UtcNow
                };
                _db.BcpMessageReadReceipts.Add(receipt);
            }
            else
            {
                receipt.Status = BcpMessageDeliveryStatus.Read;
                receipt.ReadAt ??= DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            await Clients.Group($"group-{groupId}").SendAsync("MessageReadReceipt", messageId, userId, DateTime.UtcNow);
        }

        public async Task PinMessage(Guid groupId, Guid messageId)
        {
            var userId = GetUserId();
            if (userId == null) return;

            var member = await GetActiveMember(groupId, userId);
            if (member == null) return;

            var post = await _db.BcpGroupPosts.FindAsync(messageId);
            if (post != null && post.BcpGroupId == groupId)
            {
                post.IsPinned = !post.IsPinned;
                await _db.SaveChangesAsync();

                var user = await _userManager.FindByIdAsync(userId);
                var preview = post.Content ?? "Attachment";
                var words = preview.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                if (words.Length > 5) preview = string.Join(" ", words.Take(5)) + "...";

                await Clients.Group($"group-{groupId}").SendAsync("MessagePinned", messageId, post.IsPinned, user?.FullName ?? "Someone", preview);
            }
        }

        public async Task DeleteMessage(Guid groupId, Guid messageId)
        {
            var userId = GetUserId();
            if (userId == null) return;

            var member = await GetActiveMember(groupId, userId);
            if (member == null) return;

            var post = await _db.BcpGroupPosts.FindAsync(messageId);
            if (post == null || post.BcpGroupId != groupId) return;

            var group = await _db.BcpGroups.FindAsync(groupId);
            var isAuthor = post.UserProfileId == userId;
            var isAdmin = member.GroupRole == BcpGroupRole.Admin || member.GroupRole == BcpGroupRole.Executive;

            if (!isAuthor && !isAdmin) return;

            // Delete window check for non-admins
            if (!isAdmin && group != null && group.DeleteWindowMinutes > 0)
            {
                if ((DateTime.UtcNow - post.CreatedAt).TotalMinutes > group.DeleteWindowMinutes)
                {
                    await Clients.Caller.SendAsync("Error", $"Delete window ({group.DeleteWindowMinutes} mins) has expired.");
                    return;
                }
            }

            // Compliance Audit Log preservation
            _db.BcpChatAuditLogs.Add(new BcpChatAuditLog
            {
                GroupId = groupId,
                UserId = userId,
                MessageId = messageId,
                Action = "MessageDeleted",
                OriginalContent = post.Content,
                Details = $"Deleted by {(isAdmin ? "Admin" : "Author")}",
                Timestamp = DateTime.UtcNow
            });

            post.IsDeleted = true;
            post.Content = "🚫 This message was deleted.";
            await _db.SaveChangesAsync();

            await Clients.Group($"group-{groupId}").SendAsync("MessageDeleted", messageId, post.Content);
        }

        public async Task UploadAndSendMessage(Guid groupId, string? content, string fileName, string base64Data, string contentType, Guid? replyToId)
        {
            var userId = GetUserId();
            if (userId == null) return;

            var member = await GetActiveMember(groupId, userId);
            if (member == null) return;

            var group = await _db.BcpGroups.FindAsync(groupId);
            if (group == null) return;

            if (!CanUserPost(group, member))
            {
                await Clients.Caller.SendAsync("Error", "You are not allowed to post in this group.");
                return;
            }

            if (!IsGroupOpen(group))
            {
                await Clients.Caller.SendAsync("GroupClosedAlert", group.ClosedMessage ?? "This group is currently closed.");
                return;
            }

            byte[] bytes = Convert.FromBase64String(base64Data);
            string fileUrl = $"data:{contentType};base64,{base64Data}";

            var file = new BcpGroupFile
            {
                BcpGroupId = groupId,
                UploadedByUserId = userId,
                FileName = fileName,
                FileUrl = fileUrl,
                FileSize = bytes.Length,
                ContentType = contentType,
                UploadedAt = DateTime.UtcNow
            };
            _db.BcpGroupFiles.Add(file);
            await _db.SaveChangesAsync();

            var post = new BcpGroupPost
            {
                BcpGroupId = groupId,
                UserProfileId = userId,
                Content = string.IsNullOrWhiteSpace(content) ? $"📎 Attached file: {fileName}" : content,
                MessageType = BcpChatMessageType.File,
                ReplyToMessageId = replyToId,
                FileId = file.Id,
                DeliveryStatus = BcpMessageDeliveryStatus.Sent,
                CreatedAt = DateTime.UtcNow
            };
            _db.BcpGroupPosts.Add(post);
            await _db.SaveChangesAsync();

            var user = await _userManager.FindByIdAsync(userId);

            _db.BcpMessageReadReceipts.Add(new BcpMessageReadReceipt
            {
                MessageId = post.Id,
                UserId = userId,
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

            await Clients.Group($"group-{groupId}").SendAsync("ReceiveMessage", new
            {
                Id = post.Id,
                GroupId = groupId,
                GroupTitle = group.Title,
                UserId = userId,
                UserName = user?.FullName ?? "Unknown",
                Content = post.Content,
                MessageType = post.MessageType.ToString(),
                FileId = file.Id,
                FileUrl = fileUrl,
                FileName = fileName,
                FileSize = bytes.Length,
                ReplyToId = post.ReplyToMessageId,
                ReplyToUserName = replyToUserName,
                ReplyToContent = replyToContent,
                DeliveryStatus = post.DeliveryStatus.ToString(),
                CreatedAt = post.CreatedAt
            });
        }

        public async Task EditMessage(Guid groupId, Guid messageId, string newContent)
        {
            var userId = GetUserId();
            if (userId == null) return;

            var post = await _db.BcpGroupPosts.FindAsync(messageId);
            if (post == null || post.BcpGroupId != groupId || post.UserProfileId != userId) return;

            var group = await _db.BcpGroups.FindAsync(groupId);
            if (group != null && group.EditWindowMinutes > 0)
            {
                if ((DateTime.UtcNow - post.CreatedAt).TotalMinutes > group.EditWindowMinutes)
                {
                    await Clients.Caller.SendAsync("Error", $"Edit window ({group.EditWindowMinutes} mins) has expired.");
                    return;
                }
            }

            // Compliance Audit Log
            _db.BcpChatAuditLogs.Add(new BcpChatAuditLog
            {
                GroupId = groupId,
                UserId = userId,
                MessageId = messageId,
                Action = "MessageEdited",
                OriginalContent = post.Content,
                Details = $"Edited to: {newContent}",
                Timestamp = DateTime.UtcNow
            });

            post.Content = newContent;
            post.IsEdited = true;
            post.EditedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await Clients.Group($"group-{groupId}").SendAsync("MessageEdited", messageId, newContent, post.EditedAt);
        }

        public async Task BookmarkMessage(Guid groupId, Guid messageId)
        {
            var userId = GetUserId();
            if (userId == null) return;

            var existing = await _db.BcpBookmarkedMessages
                .FirstOrDefaultAsync(b => b.UserId == userId && b.MessageId == messageId);

            if (existing == null)
            {
                _db.BcpBookmarkedMessages.Add(new BcpBookmarkedMessage
                {
                    UserId = userId,
                    MessageId = messageId,
                    GroupId = groupId,
                    BookmarkedAt = DateTime.UtcNow
                });
                await _db.SaveChangesAsync();
                await Clients.Caller.SendAsync("MessageBookmarked", messageId, true);
            }
            else
            {
                _db.BcpBookmarkedMessages.Remove(existing);
                await _db.SaveChangesAsync();
                await Clients.Caller.SendAsync("MessageBookmarked", messageId, false);
            }
        }

        public async Task ForwardMessage(Guid originalMessageId, Guid targetGroupId)
        {
            var userId = GetUserId();
            if (userId == null) return;

            var original = await _db.BcpGroupPosts.Include(p => p.UserProfile).FirstOrDefaultAsync(p => p.Id == originalMessageId);
            if (original == null) return;

            var member = await GetActiveMember(targetGroupId, userId);
            if (member == null) return;

            var user = await _userManager.FindByIdAsync(userId);

            var forwarded = new BcpGroupPost
            {
                BcpGroupId = targetGroupId,
                UserProfileId = userId,
                Content = $"↩️ Forwarded from {original.UserProfile?.FullName}:\n{original.Content}",
                MessageType = original.MessageType,
                FileId = original.FileId,
                DeliveryStatus = BcpMessageDeliveryStatus.Sent,
                CreatedAt = DateTime.UtcNow
            };

            _db.BcpGroupPosts.Add(forwarded);
            await _db.SaveChangesAsync();

            await Clients.Group($"group-{targetGroupId}").SendAsync("ReceiveMessage", new
            {
                Id = forwarded.Id,
                GroupId = targetGroupId,
                UserId = userId,
                UserName = user?.FullName ?? "Unknown",
                Content = forwarded.Content,
                MessageType = forwarded.MessageType.ToString(),
                IsForwarded = true,
                CreatedAt = forwarded.CreatedAt
            });
        }

        // ──────────────────────────────────────────────
        //  HELPERS
        // ──────────────────────────────────────────────

        private string? GetUserId()
        {
            return Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }

        private async Task<BcpGroupMember?> GetActiveMember(Guid groupId, string userId)
        {
            return await _db.BcpGroupMembers
                .FirstOrDefaultAsync(m => m.BcpGroupId == groupId
                    && m.UserProfileId == userId
                    && m.MembershipStatus == "Active"
                    && !m.IsSuspended);
        }

        private bool CanUserPost(BcpGroup group, BcpGroupMember member)
        {
            if (member.IsMuted) return false;
            if (member.GroupRole == BcpGroupRole.Observer) return false;

            // SuperAdmins & Platform Owners are Observers (Read-Only)
            if (Context.User != null && (Context.User.IsInRole("PlatformOwner") || Context.User.IsInRole("SuperAdmin") || Context.User.IsInRole("Administrator")))
            {
                return false;
            }

            return group.ChatMode switch
            {
                BcpGroupChatMode.Open => true,
                BcpGroupChatMode.AdminOnly => member.GroupRole == BcpGroupRole.Admin || member.GroupRole == BcpGroupRole.Executive,
                BcpGroupChatMode.Announcement => member.GroupRole == BcpGroupRole.Admin,
                BcpGroupChatMode.ReadOnly => false,
                _ => false
            };
        }

        private bool IsGroupOpen(BcpGroup group)
        {
            if (group.IsAlwaysOpen) return true;

            var now = DateTime.UtcNow;
            var dayName = now.DayOfWeek.ToString()[..3];

            if (!string.IsNullOrWhiteSpace(group.OperationalDays))
            {
                var days = group.OperationalDays.Split(',', StringSplitOptions.RemoveEmptyEntries);
                if (!days.Any(d => d.Trim().Equals(dayName, StringComparison.OrdinalIgnoreCase)))
                    return false;
            }

            if (group.OpenTime.HasValue && group.CloseTime.HasValue)
            {
                var currentTime = now.TimeOfDay;
                if (currentTime < group.OpenTime.Value || currentTime > group.CloseTime.Value)
                    return false;
            }

            return true;
        }

        private class UserPresence
        {
            public string UserId { get; set; } = string.Empty;
            public string FullName { get; set; } = string.Empty;
            public BcpPresenceStatus Status { get; set; }
            public DateTime ConnectedAt { get; set; }
        }
    }
}
