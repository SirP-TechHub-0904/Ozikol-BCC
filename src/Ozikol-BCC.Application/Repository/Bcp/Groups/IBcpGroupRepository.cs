using Ozikol_BCC.Domain.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.Bcp.Groups
{
    /// <summary>
    /// Repository contract for BCP Groups, Committees, Members, Chat Posts, Polls, and Audit Logs.
    /// </summary>
    public interface IBcpGroupRepository
    {
        // ── Group CRUD ──
        Task<BcpGroup?> GetGroupByIdAsync(Guid id);
        Task<List<BcpGroup>> GetAllGroupsAsync(bool includeArchived = false);
        Task<List<BcpGroup>> GetUserGroupsAsync(string userId);
        Task CreateGroupAsync(BcpGroup group);
        Task UpdateGroupAsync(BcpGroup group);
        Task ArchiveGroupAsync(Guid id);

        // ── Member Management ──
        Task<List<BcpGroupMember>> GetGroupMembersAsync(Guid groupId);
        Task<BcpGroupMember?> GetGroupMemberAsync(Guid groupId, string userId);
        Task AddGroupMemberAsync(BcpGroupMember member);
        Task UpdateGroupMemberAsync(BcpGroupMember member);
        Task RemoveGroupMemberAsync(Guid groupId, string userId);
        Task<int> GetActiveMemberCountAsync(Guid groupId);

        // ── Chat & Messages ──
        Task<List<BcpGroupPost>> GetGroupMessagesAsync(Guid groupId, int skip = 0, int take = 50);
        Task<BcpGroupPost?> GetMessageByIdAsync(Guid messageId);
        Task AddMessageAsync(BcpGroupPost post);
        Task UpdateMessageAsync(BcpGroupPost post);
        Task DeleteMessageAsync(Guid messageId, string deletedByUserId, bool isAdmin);

        // ── Direct Messages ──
        Task<List<BcpDirectMessage>> GetDirectMessagesAsync(string userId1, string userId2);
        Task AddDirectMessageAsync(BcpDirectMessage dm);

        // ── Polls ──
        Task<BcpGroupPoll?> GetPollByIdAsync(Guid pollId);
        Task CreatePollAsync(BcpGroupPoll poll);
        Task CastPollVoteAsync(BcpGroupPollVote vote);

        // ── Audit Trail ──
        Task AddAuditLogAsync(BcpChatAuditLog log);
        Task<List<BcpChatAuditLog>> GetGroupAuditLogsAsync(Guid groupId, int take = 100);
    }
}
