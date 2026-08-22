using MediatR;
using Ozikol_BCC.Application.Repository.Bcp.Groups;
using Ozikol_BCC.Domain.Models;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Queries.BcpGroupQueries
{
    /// <summary>
    /// MediatR Query to fetch a BCP Group by ID.
    /// </summary>
    public sealed class GetGroupByIdQuery : IRequest<BcpGroup?>
    {
        public GetGroupByIdQuery(Guid id)
        {
            Id = id;
        }

        public Guid Id { get; set; }
    }

    public class GetGroupByIdQueryHandler : IRequestHandler<GetGroupByIdQuery, BcpGroup?>
    {
        private readonly IBcpGroupRepository _repository;

        public GetGroupByIdQueryHandler(IBcpGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<BcpGroup?> Handle(GetGroupByIdQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetGroupByIdAsync(request.Id);
        }
    }
}
