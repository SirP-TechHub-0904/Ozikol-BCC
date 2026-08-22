using MediatR;
using Ozikol_BCC.Application.Repository.Bcp.Groups;
using Ozikol_BCC.Domain.Models;
using System;
using System.Threading;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Commands.BcpGroupCommands
{
    /// <summary>
    /// MediatR Command to create a new BCP Group or Committee.
    /// </summary>
    public sealed class CreateGroupCommand : IRequest<Guid>
    {
        public CreateGroupCommand(BcpGroup group, string creatorUserId)
        {
            Group = group;
            CreatorUserId = creatorUserId;
        }

        public BcpGroup Group { get; set; }
        public string CreatorUserId { get; set; }
    }

    public class CreateGroupCommandHandler : IRequestHandler<CreateGroupCommand, Guid>
    {
        private readonly IBcpGroupRepository _repository;

        public CreateGroupCommandHandler(IBcpGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<Guid> Handle(CreateGroupCommand request, CancellationToken cancellationToken)
        {
            if (request.Group.Id == Guid.Empty)
            {
                request.Group.Id = Guid.CreateVersion7();
            }

            request.Group.CreatedByUserId = request.CreatorUserId;
            request.Group.CreatedAt = DateTime.UtcNow;

            await _repository.CreateGroupAsync(request.Group);

            // Automatically add creator as Admin
            await _repository.AddGroupMemberAsync(new BcpGroupMember
            {
                BcpGroupId = request.Group.Id,
                UserProfileId = request.CreatorUserId,
                GroupRole = BcpGroupRole.Admin,
                MembershipStatus = "Active",
                DateJoined = DateTime.UtcNow
            });

            return request.Group.Id;
        }
    }
}
