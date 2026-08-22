using MediatR;
using Ozikol_BCC.Application.Repository.Bcp.Groups;
using Ozikol_BCC.Domain.Models;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Queries.BcpGroupQueries
{
    /// <summary>
    /// MediatR Query to fetch all active BCP Groups.
    /// </summary>
    public sealed class GetGroupListQuery : IRequest<List<BcpGroup>>
    {
        public GetGroupListQuery(bool includeArchived = false)
        {
            IncludeArchived = includeArchived;
        }

        public bool IncludeArchived { get; set; }
    }

    public class GetGroupListQueryHandler : IRequestHandler<GetGroupListQuery, List<BcpGroup>>
    {
        private readonly IBcpGroupRepository _repository;

        public GetGroupListQueryHandler(IBcpGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<BcpGroup>> Handle(GetGroupListQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetAllGroupsAsync(request.IncludeArchived);
        }
    }
}
