using MediatR;
using Ozikol_BCC.Application.Repository.Bcp.Groups;

namespace Ozikol_BCC.Application.Commands.BcpGroupCommands
{
    public class DeleteGroupMessageCommand : IRequest<bool>
    {
        public Guid MessageId { get; set; }
        public string DeletedByUserId { get; set; } = string.Empty;
        public bool IsAdmin { get; set; }

        public DeleteGroupMessageCommand(Guid messageId, string deletedByUserId, bool isAdmin = false)
        {
            MessageId = messageId;
            DeletedByUserId = deletedByUserId;
            IsAdmin = isAdmin;
        }
    }

    public class DeleteGroupMessageCommandHandler : IRequestHandler<DeleteGroupMessageCommand, bool>
    {
        private readonly IBcpGroupRepository _repository;

        public DeleteGroupMessageCommandHandler(IBcpGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<bool> Handle(DeleteGroupMessageCommand request, CancellationToken cancellationToken)
        {
            var msg = await _repository.GetMessageByIdAsync(request.MessageId);
            if (msg == null) return false;

            await _repository.DeleteMessageAsync(request.MessageId, request.DeletedByUserId, request.IsAdmin);
            return true;
        }
    }
}
