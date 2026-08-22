using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.PageSectionListCommands
{
    /// <summary>
    /// Command to create a new PageSectionList.
    /// </summary>
    public sealed class CreatePageSectionListCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreatePageSectionListCommand.
        /// </summary>
        public CreatePageSectionListCommand(PageSectionList data)
        {
            Data = data;
        }

        /// <summary>
        /// The PageSectionList data to be created.
        /// </summary>
        public PageSectionList Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreatePageSectionListCommand.
    /// </summary>
    public class CreatePageSectionListCommandHandler : IRequestHandler<CreatePageSectionListCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<PageSectionList> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreatePageSectionListCommandHandler(IGenericRepositoryAsync<PageSectionList> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the PageSectionList to the database.
        /// </summary>
        public async Task<Guid> Handle(CreatePageSectionListCommand request, CancellationToken cancellationToken)
        {
            // If the ID is empty, generate a new Guid
            if (request.Data.Id == Guid.Empty)
            {
                request.Data.Id = Guid.NewGuid();
            }

            await _repository.AddAsync(request.Data);
            return request.Data.Id;
        }
    }
}
