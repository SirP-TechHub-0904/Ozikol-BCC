using MediatR;
using Ozikol_BCC.Application.Repository.Bcp.Groups;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Application.Commands.BcpGroupCommands
{
    public class PostGroupMessageCommand : IRequest<BcpGroupPost?>
    {
        public Guid GroupId { get; set; }
        public string SenderId { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public Guid? ReplyToMessageId { get; set; }
    }

    public class PostGroupMessageCommandHandler : IRequestHandler<PostGroupMessageCommand, BcpGroupPost?>
    {
        private readonly IBcpGroupRepository _repository;

        public PostGroupMessageCommandHandler(IBcpGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<BcpGroupPost?> Handle(PostGroupMessageCommand request, CancellationToken cancellationToken)
        {
            var post = new BcpGroupPost
            {
                BcpGroupId = request.GroupId,
                UserProfileId = request.SenderId,
                Content = request.Content,
                ReplyToMessageId = request.ReplyToMessageId,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddMessageAsync(post);
            return post;
        }
    }
}
