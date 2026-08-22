using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.PageSectionCommands
{
    /// <summary>
    /// Command to create a new PageSection.
    /// </summary>
    public sealed class CreatePageSectionCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreatePageSectionCommand.
        /// </summary>
        public CreatePageSectionCommand(PageSection data)
        {
            Data = data;
        }

        /// <summary>
        /// The PageSection data to be created.
        /// </summary>
        public PageSection Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreatePageSectionCommand.
    /// </summary>
    public class CreatePageSectionCommandHandler : IRequestHandler<CreatePageSectionCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<PageSection> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreatePageSectionCommandHandler(IGenericRepositoryAsync<PageSection> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the PageSection to the database.
        /// </summary>
        public async Task<Guid> Handle(CreatePageSectionCommand request, CancellationToken cancellationToken)
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
