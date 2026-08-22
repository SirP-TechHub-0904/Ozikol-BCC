using MediatR;
using Ozikol_BCC.Application.Repository.Bcp.Groups;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Application.Queries.BcpGroupQueries
{
    public class GetDirectMessagesQuery : IRequest<List<BcpDirectMessage>>
    {
        public string SenderId { get; set; }
        public string RecipientId { get; set; }

        public GetDirectMessagesQuery(string senderId, string recipientId)
        {
            SenderId = senderId;
            RecipientId = recipientId;
        }
    }

    public class GetDirectMessagesQueryHandler : IRequestHandler<GetDirectMessagesQuery, List<BcpDirectMessage>>
    {
        private readonly IBcpGroupRepository _repository;

        public GetDirectMessagesQueryHandler(IBcpGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<BcpDirectMessage>> Handle(GetDirectMessagesQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetDirectMessagesAsync(request.SenderId, request.RecipientId);
        }
    }
}
