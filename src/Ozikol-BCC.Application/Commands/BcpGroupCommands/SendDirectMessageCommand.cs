using MediatR;
using Ozikol_BCC.Application.Repository.Bcp.Groups;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Application.Commands.BcpGroupCommands
{
    public class SendDirectMessageCommand : IRequest<BcpDirectMessage?>
    {
        public string SenderId { get; set; } = string.Empty;
        public string RecipientId { get; set; } = string.Empty;
        public Guid GroupId { get; set; }
        public string Content { get; set; } = string.Empty;
        public Guid? ReplyToMessageId { get; set; }
    }

    public class SendDirectMessageCommandHandler : IRequestHandler<SendDirectMessageCommand, BcpDirectMessage?>
    {
        private readonly IBcpGroupRepository _repository;

        public SendDirectMessageCommandHandler(IBcpGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<BcpDirectMessage?> Handle(SendDirectMessageCommand request, CancellationToken cancellationToken)
        {
            var dm = new BcpDirectMessage
            {
                SenderUserId = request.SenderId,
                ReceiverUserId = request.RecipientId,
                GroupId = request.GroupId,
                Content = request.Content,
                ReplyToMessageId = request.ReplyToMessageId,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddDirectMessageAsync(dm);
            return dm;
        }
    }
}
