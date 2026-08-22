using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.Bcp.Groups
{
    /// <summary>
    /// EF Core repository implementation for BCP Groups, Committees, Members, Chat Posts, Polls, and Audit Logs.
    /// </summary>
    public class BcpGroupRepository : IBcpGroupRepository
    {
        private readonly DashboardDbContext _context;

        public BcpGroupRepository(DashboardDbContext context)
        {
            _context = context;
        }

        // ── Group CRUD ──

        public async Task<BcpGroup?> GetGroupByIdAsync(Guid id)
        {
            return await _context.BcpGroups
                .Include(g => g.CreatedByUser)
                .FirstOrDefaultAsync(g => g.Id == id);
        }

        public async Task<List<BcpGroup>> GetAllGroupsAsync(bool includeArchived = false)
        {
            var query = _context.BcpGroups.AsQueryable();
            if (!includeArchived)
            {
                query = query.Where(g => !g.IsArchived);
            }
            return await query.OrderByDescending(g => g.CreatedAt).ToListAsync();
        }

        public async Task<List<BcpGroup>> GetUserGroupsAsync(string userId)
        {
            return await _context.BcpGroupMembers
                .Where(m => m.UserProfileId == userId && m.MembershipStatus == "Active")
                .Include(m => m.BcpGroup)
                .Select(m => m.BcpGroup!)
                .Where(g => g.IsActive && !g.IsArchived)
                .OrderByDescending(g => g.CreatedAt)
                .ToListAsync();
        }

        public async Task CreateGroupAsync(BcpGroup group)
        {
            _context.BcpGroups.Add(group);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateGroupAsync(BcpGroup group)
        {
            _context.BcpGroups.Update(group);
            await _context.SaveChangesAsync();
        }

        public async Task ArchiveGroupAsync(Guid id)
        {
            var group = await _context.BcpGroups.FindAsync(id);
            if (group != null)
            {
                group.IsArchived = !group.IsArchived;
                await _context.SaveChangesAsync();
            }
        }

        // ── Member Management ──

        public async Task<List<BcpGroupMember>> GetGroupMembersAsync(Guid groupId)
        {
            return await _context.BcpGroupMembers
                .Where(m => m.BcpGroupId == groupId && m.MembershipStatus == "Active")
                .Include(m => m.UserProfile)
                .OrderBy(m => m.GroupRole)
                .ThenBy(m => m.UserProfile!.FirstName)
                .ToListAsync();
        }

        public async Task<BcpGroupMember?> GetGroupMemberAsync(Guid groupId, string userId)
        {
            return await _context.BcpGroupMembers
                .Include(m => m.UserProfile)
                .FirstOrDefaultAsync(m => m.BcpGroupId == groupId && m.UserProfileId == userId);
        }

        public async Task AddGroupMemberAsync(BcpGroupMember member)
        {
            _context.BcpGroupMembers.Add(member);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateGroupMemberAsync(BcpGroupMember member)
        {
            _context.BcpGroupMembers.Update(member);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveGroupMemberAsync(Guid groupId, string userId)
        {
            var member = await GetGroupMemberAsync(groupId, userId);
            if (member != null)
            {
                _context.BcpGroupMembers.Remove(member);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<int> GetActiveMemberCountAsync(Guid groupId)
        {
            return await _context.BcpGroupMembers
                .CountAsync(m => m.BcpGroupId == groupId && m.MembershipStatus == "Active");
        }

        // ── Chat & Messages ──

        public async Task<List<BcpGroupPost>> GetGroupMessagesAsync(Guid groupId, int skip = 0, int take = 50)
        {
            return await _context.BcpGroupPosts
                .Where(p => p.BcpGroupId == groupId && !p.IsDeleted)
                .Include(p => p.UserProfile)
                .Include(p => p.File)
                .Include(p => p.Poll)
                    .ThenInclude(poll => poll!.Options)
                .OrderByDescending(p => p.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync();
        }

        public async Task<BcpGroupPost?> GetMessageByIdAsync(Guid messageId)
        {
            return await _context.BcpGroupPosts
                .Include(p => p.UserProfile)
                .FirstOrDefaultAsync(p => p.Id == messageId);
        }

        public async Task AddMessageAsync(BcpGroupPost post)
        {
            _context.BcpGroupPosts.Add(post);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateMessageAsync(BcpGroupPost post)
        {
            _context.BcpGroupPosts.Update(post);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteMessageAsync(Guid messageId, string deletedByUserId, bool isAdmin)
        {
            var post = await GetMessageByIdAsync(messageId);
            if (post == null) return;

            // Compliance Audit Log preservation
            _context.BcpChatAuditLogs.Add(new BcpChatAuditLog
            {
                GroupId = post.BcpGroupId,
                UserId = deletedByUserId,
                MessageId = messageId,
                Action = "MessageDeleted",
                OriginalContent = post.Content,
                Details = $"Deleted by {(isAdmin ? "Admin" : "Author")}",
                Timestamp = DateTime.UtcNow
            });

            post.IsDeleted = true;
            post.Content = "🚫 This message was deleted.";
            await _context.SaveChangesAsync();
        }

        // ── Polls ──

        public async Task<BcpGroupPoll?> GetPollByIdAsync(Guid pollId)
        {
            return await _context.BcpGroupPolls
                .Include(p => p.Options)
                    .ThenInclude(o => o.Votes)
                .FirstOrDefaultAsync(p => p.Id == pollId);
        }

        public async Task CreatePollAsync(BcpGroupPoll poll)
        {
            _context.BcpGroupPolls.Add(poll);
            await _context.SaveChangesAsync();
        }

        public async Task CastPollVoteAsync(BcpGroupPollVote vote)
        {
            var existingVote = await _context.BcpGroupPollVotes
                .FirstOrDefaultAsync(v => v.PollId == vote.PollId && v.UserId == vote.UserId && v.OptionId == vote.OptionId);

            if (existingVote == null)
            {
                _context.BcpGroupPollVotes.Add(vote);
                await _context.SaveChangesAsync();
            }
        }

        // ── Audit Trail ──

        public async Task AddAuditLogAsync(BcpChatAuditLog log)
        {
            _context.BcpChatAuditLogs.Add(log);
            await _context.SaveChangesAsync();
        }

        public async Task<List<BcpChatAuditLog>> GetGroupAuditLogsAsync(Guid groupId, int take = 100)
        {
            return await _context.BcpChatAuditLogs
                .Where(a => a.GroupId == groupId)
                .Include(a => a.User)
                .OrderByDescending(a => a.Timestamp)
                .Take(take)
                .ToListAsync();
        }

        // ── Direct Messages ──

        public async Task<List<BcpDirectMessage>> GetDirectMessagesAsync(string userId1, string userId2)
        {
            return await _context.BcpDirectMessages
                .Where(m => (m.SenderUserId == userId1 && m.ReceiverUserId == userId2) ||
                            (m.SenderUserId == userId2 && m.ReceiverUserId == userId1))
                .Include(m => m.SenderUser)
                .Include(m => m.ReceiverUser)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();
        }

        public async Task AddDirectMessageAsync(BcpDirectMessage dm)
        {
            _context.BcpDirectMessages.Add(dm);
            await _context.SaveChangesAsync();
        }
    }
}
