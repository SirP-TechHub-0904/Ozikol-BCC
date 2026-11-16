using MediatR;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Application.Repository.Bcp.Groups;
using Ozikol_BCC.Domain.Models;
using static Ozikol_BCC.Domain.Enum.Enum;

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
        private readonly ICentralNotificationDispatcher? _notificationDispatcher;

        /// <summary>
        /// Initializes a new instance of the <see cref="SendDirectMessageCommandHandler"/> class.
        /// </summary>
        public SendDirectMessageCommandHandler(
            IBcpGroupRepository repository,
            ICentralNotificationDispatcher? notificationDispatcher = null)
        {
            _repository = repository;
            _notificationDispatcher = notificationDispatcher;
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

            if (_notificationDispatcher != null && !string.IsNullOrWhiteSpace(request.RecipientId))
            {
                var preview = request.Content.Length > 100 ? request.Content.Substring(0, 97) + "..." : request.Content;
                await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                {
                    TargetType = NotificationDispatchTarget.SingleUser,
                    TargetUserId = request.RecipientId,
                    Title = "New Direct Message",
                    Message = preview,
                    ActionUrl = "/dashboard/messages",
                    Module = "DirectMessages",
                    Icon = "chat",
                    Category = BcpMessageCategory.Communication,
                    Priority = BcpMessagePriority.Normal,
                    Severity = NotificationSeverity.Update,
                    Channels = NotificationChannels.InApp
                }, cancellationToken);
            }

            return dm;
        }
    }
}
