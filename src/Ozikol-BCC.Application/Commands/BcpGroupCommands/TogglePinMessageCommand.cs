using MediatR;
using Ozikol_BCC.Application.Repository.Bcp.Groups;

namespace Ozikol_BCC.Application.Commands.BcpGroupCommands
{
    public class TogglePinMessageCommand : IRequest<bool>
    {
        public Guid MessageId { get; set; }

        public TogglePinMessageCommand(Guid messageId)
        {
            MessageId = messageId;
        }
    }

    public class TogglePinMessageCommandHandler : IRequestHandler<TogglePinMessageCommand, bool>
    {
        private readonly IBcpGroupRepository _repository;

        public TogglePinMessageCommandHandler(IBcpGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<bool> Handle(TogglePinMessageCommand request, CancellationToken cancellationToken)
        {
            var msg = await _repository.GetMessageByIdAsync(request.MessageId);
            if (msg == null) return false;

            msg.IsPinned = !msg.IsPinned;
            await _repository.UpdateMessageAsync(msg);
            return true;
        }
    }
}
