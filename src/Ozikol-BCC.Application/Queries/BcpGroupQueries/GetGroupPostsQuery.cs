using MediatR;
using Ozikol_BCC.Application.Repository.Bcp.Groups;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Application.Queries.BcpGroupQueries
{
    public class GetGroupPostsQuery : IRequest<List<BcpGroupPost>>
    {
        public Guid GroupId { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 50;

        public GetGroupPostsQuery(Guid groupId, int pageNumber = 1, int pageSize = 50)
        {
            GroupId = groupId;
            PageNumber = pageNumber;
            PageSize = pageSize;
        }
    }

    public class GetGroupPostsQueryHandler : IRequestHandler<GetGroupPostsQuery, List<BcpGroupPost>>
    {
        private readonly IBcpGroupRepository _repository;

        public GetGroupPostsQueryHandler(IBcpGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<BcpGroupPost>> Handle(GetGroupPostsQuery request, CancellationToken cancellationToken)
        {
            int skip = (request.PageNumber - 1) * request.PageSize;
            return await _repository.GetGroupMessagesAsync(request.GroupId, skip, request.PageSize);
        }
    }
}
